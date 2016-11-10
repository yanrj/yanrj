angular.module('mx.publisher')

  .factory('checkPubConServ', [
    function() {
      var service = {};

      //编码，防注入
      service.encodeCon = function(content) {
        return content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      };

      return service;
    }
  ])
  /*
   * 提交内容服务
   */
  .factory('PublishServ', ['GLOBAL_SETTING', 'ConversationServ', '$q',
    function(GLOBAL_SETTING, ConversationServ, $q) {
      var service = {};
      var URL = GLOBAL_SETTING.URL;

      service.pub = function(pubData) {
        var delay = $q.defer();
        ConversationServ.save(pubData,
          function(data, status, headers, config) {
            delay.resolve(data);
          },
          function(data, status, headers, config) {
            delay.reject(data);
          }
        )
        return delay.promise;
      }

      return service;
    }
  ])
  /*
   * 提交内容操作
   */
  .factory('Publish', ['$rootScope', 'PublishServ','Cache', '$q', 'ConversationBinder', 'PublisherEggs', 'TipsPopBinder', 'PopMessage','CurUserDB','Storage', '$compile', 'PublisherBinder',
    function($rootScope, PublishServ,Cache, $q, ConversationBinder, PublisherEggs, TipsPopBinder, PopMessage,CurUserDB,Storage, $compile, PublisherBinder) {
      var publishing = false;

      return function(postData) {
        var delay = $q.defer();
        var convData = ConversationBinder.getConvData();
        var trgData = ConversationBinder.getTriggerData();
        var convId = ConversationBinder.getCurrentConvId();
        //判断是否已打开对话，没有则拒绝提交
        if (!trgData) {
          TipsPopBinder.show({
            body: '请先在左侧会话列表选择一个会话。',
            showCancel: false,
            showConfirm: true
          });
          return false;
        }
        //如果正在发送
        if (publishing === convId) return;
        if(postData.body && $.trim(postData.body)=='') {
            TipsPopBinder.show({
                body: '不能发送空白消息',
                showCancel: false,
                showConfirm: true
            });
            return false;
        }
        //通过有没有convId判断是不是新对话
        if(postData.collect){
        } else if (convId) {
          postData.id = convId;
          postData.type = 'messages';
        } else {
          postData.direct_to_user_ids = trgData.id;
        }

        //成功提交之后的处理
        var pub = function(data, tempId, postData) {
          //清除当前会话草稿状态
          var cachedConversation=Cache.get("conversation_"+convId);
          if(cachedConversation){
            Cache.get("conversation_"+convId).draft="";
          }
          
          //消息发送成功需要插入到本地数据库中
          var newMessage=data.items[0];

          CurUserDB.saveMessages([newMessage]).then(function(){
            if(tempId){
              var tempDataId = tempData ? tempData.items[0].id : tempId;
              var str = $(".conversation-wrap .con-box div.item[data-id='"+ tempDataId +"']");
              str.find('.send-status').removeClass('sending');
              //str.attr('data-temp-id', str.attr('data-id'));
              //str.attr('data-id',newMessage.id);

              //更新新消息
              ConversationBinder.updataConvItem(tempDataId, newMessage);

              if(str.find('pre img').length == 0){
                str.find("pre").html(newMessage.body);
              }

              CurUserDB.getConvList(postData.id)
              .then(function(conv){
                var tmpConv = conv;
                  conv.last_message = newMessage;
                  conv.draft="";
                //发送广播
                $rootScope.$broadcast('conversations.newMessage_' + postData.id, conv);
                //更新数据库
                return CurUserDB.saveConvList([conv]);
              });
              CurUserDB.removeMsg(tempId);
            }
          });
          delay.resolve(data);
        };
        //提交内容
        var submitMsg = function(postData,tempId){
          PublishServ.pub(postData)
          .then(function(data) {
            publishing = false;
            pub(data,tempId, postData);

            if(postData.collect){
              $(".con-wrap").removeClass('menuItemMore').css('height', "calc(100% - 1px - 150px)");
              $(".menu-item-more").hide();
              var batchForwarding = false;
              $rootScope.$broadcast('showMessageForwordingBtn', batchForwarding);
              PublisherBinder.show();
              $(".con-wrap .btn-select").removeClass('select');
              $(".con-box").scrollTop($('.conv-list').height());
              $.magnificPopup.close();
              //弹出提示
              PopMessage.tip({
                msg: '转发成功',
                type: 1
              });
            }
          }, function(err) {
            var d = err.data;
            var msg = d&&d.errors && d.errors.message;
            publishing = false;
            if(!tempId){
              PopMessage.err({
                message: msg || '提交失败，请稍后重试',
                status: err.status
              });
            }else{
              var tempDataId = tempData ? tempData.items[0].id : tempId;
              var str = $(".conversation-wrap .con-box div.item[data-id='"+ tempDataId +"']");
              str.find('.send-status').removeClass('sending').addClass('send-failed');
              if(!tempData) return;
              tempData.items[0].send_status = false;
              var newMessage=tempData.items[0];
              CurUserDB.removeMsg(tempId)
              .then(function(){
                 CurUserDB.saveMessages([newMessage])
                 .then(function(){
                  CurUserDB.getConvList(postData.id)
                  .then(function(conv){
                    var tmpConv = conv;
                    if(!tmpConv.last_message){
                      tmpConv.last_message = tempData.items[0];
                    }else{
                      tmpConv.last_message.body = tempData.items[0].body;
                      tmpConv.last_message.send_status = false;
                      tmpConv.last_message.message_type = tempData.items[0].message_type;
                    }
                    
                    //发送广播
                    $rootScope.$broadcast('conversations.newMessage_' + postData.id, tmpConv);
                    //更新数据库
                    return CurUserDB.saveConvList([tmpConv]);
                  });
                 });
              });
            }
            delay.reject(err);
          });
        }
        
        if(postData.status && postData.status == 'resend'){ //重新发送消息
          submitMsg(postData,postData.temp_id);
        }else if(postData.body && !postData.status && !postData.collect){  //判断是文字消息

          var selfId = Storage.getUser('id'); //当前发送者ID
          var timer = new Date().getTime();
          var tempId = 'tempMsg_' + timer;
          var tempData =  {
                            items : [
                                  {
                                    id:tempId,
                                    body: postData.body,
                                    conversation_id:postData.id,
                                    message_type: "text_message",
                                    sender_id: selfId,
                                    system: false,
                                    type: "message",
                                    created_at: global.moment(new Date()).format(),
                                    send_status: true
                                  }
                                ]
                          };
          //广播发布新消息事件
          $rootScope.$broadcast('conversation.temp_publish', tempData);
          //如果页面存在新消息提示，需要隐藏掉，然后会自动滚到到最新的消息处
          $("div.con-box .fresh-tips").hide();

          var newMessage=tempData.items[0];
          CurUserDB.saveMessages([newMessage]);
          submitMsg(postData,tempId);
        }else{
          submitMsg(postData);
        }
        

        PublisherEggs(postData.body);

        return delay.promise;
      }
    }
  ])

.factory('FileUploaderBinder', ['RootscopeApply',
  function(RootscopeApply) {
    var o = {};
    var that, scope;

    o.bind = function($scope) {
      scope = $scope;
      that = this;
    };

    o.upload = function(file) {
      scope.uploadFile(file);
    };

    o.cancelAll = function() {
      scope.cancelAll();
    };

    o.cancelNormal = function() {
      scope.cancelNormal();
    };

    /**
     * 获取或设置传输状态
     */
    o.uploadStatus = function(status) {
      if (typeof status === 'boolean') {
        RootscopeApply(scope, function() {
          scope.fileUploading = status;
        });
      }
      return scope.fileUploading;
    };

    /**
     * 更新上传进度
     * @param progress[Number]: 0~100整数进度值
     */
    o.progress = function(progress) {
      RootscopeApply(scope, function() {
        scope.progress = progress;
      });
    };

    return o;
  }
])

.factory('PublisherBinder', [
  function() {
    var o = {};
    var that, scope;

    o.bind = function($scope) {
      scope = $scope;
      that = this;
    };

    //显示publisher
    o.show = function() {
      if($('.menuItemMore').length > 0) return ;
      scope.showPublisher = true;
    };

    //隐藏publisher
    o.hide = function() {
      scope.showPublisher = false;
    };

    //给publisher增加内容
    o.addContent = function(content) {
      scope.addContent(content);
    };

    //聚焦输入框
    o.focus = function() {
      if($('.menuItemMore').length > 0) return ;
      scope.focusPublisher();
    };

    o.clearFileInputValue = function() {
      scope.clearFileInputValue();
    };

    o.content = function(con) {
      return scope.resetContent(con);
    };

    return o;
  }
])