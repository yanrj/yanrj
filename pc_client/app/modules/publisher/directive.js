angular.module('mx.publisher')

.directive('publisher', ['emotionsServ', 'checkPubConServ', 'Publish', 'GroupMembersServ', 'PublisherBinder', '$injector', 'UploadImagePreviewBinder', 'TipsPopBinder', 'FileUploaderBinder', 'PopMessage', 'Utils', 'Storage','Cache','CurUserDB','GLOBAL_SETTING','$http',
    function(emotionsServ, checkPubConServ, Publish, GroupMembersServ, PublisherBinder, $injector, UploadImagePreviewBinder, TipsPopBinder, FileUploaderBinder, PopMessage, Utils, Storage,Cache, CurUserDB, GLOBAL_SETTING, $http) {
        return {
            replace: true,
            restrict: 'A',
            template: '<div ng-show="showPublisher" class="input-box">\
      <form>\
      <nav>\
      <a emo-btn href="#" class="btn-emotion" title="选择表情">表情</a>\
      <div class="upload-file" ng-controller="FileUploadCtrl">\
      <span class="btn-sendfile">\
        <input nv-file-select uploader="uploader" title="发送文件" type="file" single>\
      </span>\
      <div class="tip-uploading" ng-show="fileUploading">\
      <i>正在上传 {{fileItem.file.name}} {{progress}}%</i>\
      <a href="#" class="upload-cancel" title="取消上传">取消</a>\
      <span class="progress" style="width:{{progress}}%"></span>\
      </div>\
      </div>\
      <a href="#" class="screenshot" ng-show="screenshotEnable" title="截屏(按住shift键可显示当前窗口)">截屏</a>\
      <a href="javascript:void(0)" class="voicecalls" ng-show="showVideo" title="语音">语音</a>\
      <a href="javascript:void(0)" class="videocall" ng-show="showVideo" title="视频">视频</a>\
      </nav>\
      <textarea ng-disabled="publishing" ng-model="content" name="conv-input" autofocus ng-model="message.content" ng-trim="false" flag="@" at-user auto-complete></textarea>\
      <div class="at-box" ng-show="!isAtListHidden" auto-follow="true">\
      <ul class="list-at-user">\
      <user-item ng-repeat="user in users | limitTo: 10"></user-item>\
      </ul>\
      </div>\
      </form>\
      </div>',
            controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
                //用来标记是否正在提交内容
                $scope.publishing = false;
                $scope.showPublisher = true;
                $scope.isAtListHidden = true;
                $scope.screenshotEnable=Utils.isWindows()||Utils.isMac();
                //$scope.showVideo = Utils.isWindows();
                var validNewModules = Storage.validNewModules();
                if(validNewModules.apps && validNewModules.apps.app_video_chat && Utils.isWindows()){
                    $scope.showVideo = true;
                }else if(!validNewModules.apps){
                    $scope.showVideo = true;
                }else{
                    $scope.showVideo = false;
                }
                //头像
                /*$scope.uHead = GLOBAL_SETTING.URL + $scope.user.avatar_url;*/
                $injector.invoke(PublisherBinder.bind, this, {
                    $scope: $scope
                });
            }],
            link: function postLink(scope, element, attrs) {
                var jqForm = element.find('form');
                var jqTextarea = jqForm.find('textarea');
                var btnUploadCancel = element.find('a.upload-cancel');
                var fileInput = jqForm.find('.btn-sendfile input');
                var btnScreenshot = element.find("a.screenshot");
                var btnVideo = element.find("a.videocall");
                var btnVoice = element.find("a.voicecalls");
                var token = Storage.getToken().access_token;
                var gui = require('nw.gui');
                var win = gui.Window.get();


                if (Utils.isWindows()) {
                    var screenCapturePlugin = $("#screenshotPlugin")[0];
                    //截屏失败,截屏成功
                    screenCapturePlugin.onCaptureFail = function() {
                        console.log("截屏取消")
                    };
                    screenCapturePlugin.onCaptureSuccess = function(base64Data) {
                        //调用显示剪贴板获取的图片方法
                        UploadImagePreviewBinder.showBase64Img(base64Data);
                        win.show();
                    };
                } else if (Utils.isMac()) {
                    try {
                        var screenCapturePlugin = require("mac-screen-capture");
                    } catch (e) {
                        console.error("mac screen capture plugin load error");
                    }
                }
                //点击截屏按钮
                btnScreenshot.on("click", function(e) {
                    e.preventDefault();
                    if(!screenCapturePlugin){
                        console.log("请先安装截屏插件");
                        return;
                    }
                    //如果是windows
                    if (Utils.isWindows()) {
                        //开始截屏方法(这里可以进行配置,例如"按住Ctrl键显示敏行窗口",这里暂时默认窗口不关闭)
                        //screenCapturePlugin.startCapture(false, undefined, false);
                        screenCapturePlugin.startCapture(false, undefined, !e.shiftKey);
                    } else if (Utils.isMac()) {
                       var gui = require('nw.gui');
                       var win=gui.Window.get();
                        if(!e.shiftKey){
                            win.hide();
                        }
                         screenCapturePlugin.captureScreen().then(function() {
                           win.show(); jqTextarea.focus(), document.execCommand("paste")
                        }, function() {
                            console.log("截屏失败")
                        })
                    }
                });

                //点击语音按钮
                btnVoice.on("click", function(e){
                    e.preventDefault();
                    var current_user = Cache.get('current_user');
                    var current_conv = $(".main-wrap .list .item.act").attr('data-id');
                    var conv = Cache.get('conversation_'+current_conv);

                    var roomId = Date.parse(new Date()) / 1000;
                    var ids = angular.copy(conv.user_ids.ids);
                    ids.splice(jQuery.inArray(current_user.id,ids),1);
                    var users = [];
                    var idsLength = ids.length;
                    var messageType = 0; //0代表语音聊天，1代表视频聊天

                    var messageMode = 0; // 0代表单聊，1代表多人

                    for (var i in ids) {
                        users[i] = Cache.get('user_' + ids[i]).name;
                    }

                    if(users.length > 1){
                        messageMode = 1;
                    }else if(users.length = 1){
                        messageMode = 0;
                    }
                    if(idsLength==1){
                        var avatar_url = GLOBAL_SETTING.URL + Cache.get('user_' + ids).avatar_url;
                        $("#voice-plugin .photo img").attr('src',avatar_url);
                    }
                    ids = ids.join(","); 
                    users = users.join("、"); 

                    var message = {"pushType":0,"roomID":roomId,"type":0,"mode":messageMode,"conversationID":current_conv,"creater":{"avatar_url":current_user.avatar_url,"id":current_user.id,"login_name":current_user.login_name,"name":current_user.name}};
                    message = JSON.stringify(message);

                    var URL = GLOBAL_SETTING.URL;
                    var URI = '/api/v1/push/notifications';
                    var params = '?to_user_ids='+ids+'&message='+message;
                    var url = URL+URI;

                    var startVoice = function(){
                        $("#voice-plugin").removeClass('video-plugin').addClass('voice-plugin');
                        var src = 'vendor/MXVideo/voice.html';
                        $("#voice-plugin").show();
                        $("#voice-plugin").append('<iframe id="appsIframe" class="appsIframe" src="'+ src +'"></iframe>');

                        var videoAudio = $("#voice-plugin").append('<audio src="mx_video_ring.mp3" loop="loop"  controls="auto" id="mx-video-ring" class="mx-video-ring" style="display:none;"></audio>');
                        $('.mx-video-ring')[0].play();

                        var i = 0;
                        var audioInterval = setInterval(function(){
                            i++
                            
                            var videoPoepleLength = $('#appsIframe').prop('contentDocument').getElementById('room_div_userlist').childNodes.length;
                            videoPoepleLength = videoPoepleLength ? videoPoepleLength : 1;
                            if(videoPoepleLength > 1){
                                $('.mx-video-ring')[0].pause();
                                $('.mx-video-ring').remove();
                                clearInterval(audioInterval);
                            }
                            if(i == 60){
                                $('.mx-video-ring')[0].pause();
                                $('.mx-video-ring').remove();
                                $("#voice-plugin").hide();
                                $('#appsIframe').remove();
                                clearInterval(audioInterval);
                            }
                        }, 1000);

                        $(window.frames["appsIframe"]).load(function(){
                            $("#voice-plugin .video-title span").html(users);
                            var idocument = $('#appsIframe').prop('contentDocument');
                            var el = idocument.createElement('script');
                            el.setAttribute("type","text/javascript");
                            el.text = 'var token = "'+token+'";var url = "'+url+'";var roomID =' + roomId +';var message = '+message+';var messageType = 0;var ids = "'+ ids +'";var messageMode = '+ messageMode + ';var current_conv = '+ current_conv +';window.onload = LogicInit();';
                            idocument.body.appendChild(el);
                        });
                    }
                    $http({
                        url: URL+URI+params,
                        method: 'POST'
                    }).success(function(data) {
                        startVoice();
                    }).error(function(err) {
                        PopMessage.tip({
                            msg: err.errors.message,
                            type: 0
                        });
                    });
                });

                //点击视频按钮
                btnVideo.on("click", function(e){
                    e.preventDefault();

                    var startVideo = function(){
                        win.maximize();
                        $("#voice-plugin").removeClass('voice-plugin').addClass('video-plugin');
                        var src = 'vendor/MXVideo/voice.html';
                        $("#voice-plugin").show();
                        $("#voice-plugin").append('<iframe id="appsIframe" class="appsIframe" src="'+ src +'"></iframe>');

                        var videoAudio = $("#voice-plugin").append('<audio src="mx_video_ring.mp3" loop="loop"  controls="auto" id="mx-video-ring" class="mx-video-ring"  style="display:none;"></audio>');
                        $('.mx-video-ring')[0].play();

                        var i = 0;
                        var audioInterval = setInterval(function(){
                            i++
                            if($('#appsIframe').prop('contentDocument')){
                                var videoPoepleLength = $('#appsIframe').prop('contentDocument').getElementById('room_div_userlist').childNodes.length;
                                videoPoepleLength = videoPoepleLength ? videoPoepleLength : 1;
                            }else{
                                $('.mx-video-ring')[0].pause();
                                $('.mx-video-ring').remove();
                                $("#voice-plugin").hide();
                                $('#appsIframe').remove();
                                clearInterval(audioInterval);
                            }
                            
                            if(videoPoepleLength > 1 ){
                                clearInterval(audioInterval);
                                $('.mx-video-ring')[0].pause();
                                $('.mx-video-ring').remove();
                                
                            }

                            if(i == 60){
                                $('.mx-video-ring')[0].pause();
                                $('.mx-video-ring').remove();
                                $("#voice-plugin").hide();
                                $('#appsIframe').remove();
                                clearInterval(audioInterval);
                            }
                        }, 1000);

                        $(window.frames["appsIframe"]).load(function(){
                            $("#voice-plugin .video-title span").html(users);
                            if(idsLength==1){
                                var avatar_url = GLOBAL_SETTING.URL + Cache.get('user_' + ids).avatar_url;
                                $("#voice-plugin .photo img").attr('src',avatar_url);
                            }
                            $("#voice-plugin .photo img").attr('src',avatar_url);
                            var idocument = $('#appsIframe').prop('contentDocument');
                            var el = idocument.createElement('script');
                            el.setAttribute("type","text/javascript");
                            el.text = 'var token = "'+token+'";var roomID =' + roomId +';var ids = "'+ ids +'";var message = '+message+';var messageType = 1;var url = "'+ url +'";var messageMode = '+ messageMode + ';var current_conv = '+ current_conv +';window.onload = LogicInit();';
                            idocument.body.appendChild(el);
                        });
                    }
                    
                    var current_user = Cache.get('current_user');
                    var current_conv = $(".main-wrap .list .item.act").attr('data-id');
                    var conv = Cache.get('conversation_'+current_conv);

                    var roomId = Date.parse(new Date()) / 1000;
                    
                    var ids = angular.copy(conv.user_ids.ids);
                    ids.splice(jQuery.inArray(current_user.id,ids),1);
                    var users = [];
                    var idsLength = ids.length;
                    var messageType = 1; //0代表语音聊天，1代表视频聊天

                    var messageMode = 0; // 0代表单聊，1代表多人

                    for (var i in ids) {
                        users[i] = Cache.get('user_' + ids[i]).name;
                    }

                    if(users.length > 1){
                        messageMode = 1;
                    }else if(users.length = 1){
                        messageMode = 0;
                    }


                    ids = ids.join(","); 
                    users = users.join("、"); 

                    

                    var message = {"pushType":0,"roomID":roomId,"type":1,"mode":messageMode,"conversationID":current_conv,"creater":{"avatar_url":current_user.avatar_url,"id":current_user.id,"login_name":current_user.login_name,"name":current_user.name}};
                    message = JSON.stringify(message);

                    var URL = GLOBAL_SETTING.URL;
                    var URI = '/api/v1/push/notifications';
                    var params = '?to_user_ids='+ids+'&message='+message;
                    var url = URL+URI;
                    $http({
                        url: URL+URI+params,
                        method: 'POST'
                    }).success(function(data) {
                        startVideo();
                    }).error(function(err) {
                        PopMessage.tip({
                            msg: err.errors.message,
                            type: 0
                        });
                    });
                });



            

                /*
                 * 设置或获取输入框内容
                 */
                scope.resetContent = function(con) {
                    //如果没传con参数，返回当前值
                    if (_.isUndefined(con)) return jqTextarea.val();
                    //设置输入框的值
                    jqTextarea.val(con);
                };

                //追加内容到输入框
                scope.addContent = function(con) {
                    var v = jqTextarea.val();
                    var newCon = v + ' ' + con;

                    jqTextarea.val(newCon);
                };

                //聚焦输入框
                scope.focusPublisher = function() {
                    setTimeout(function() {
                        jqTextarea.focus();
                    }, 4);
                };

                //清空上传控件的value
                scope.clearFileInputValue = function() {
                    fileInput.val('');
                };

                btnUploadCancel.bind('click', function(e) {
                    e.preventDefault();
                    FileUploaderBinder.cancelNormal();

                    PopMessage.tip({
                        msg: '文件传输已取消',
                        type: 1
                    });
                });

                jqTextarea[0].addEventListener('paste', function(e) {
                    var items = e.clipboardData.items;
                    var firstItem = items[0]
                    if (firstItem && firstItem.kind == 'file' && firstItem.type.indexOf('image/') !== -1) {
                        console.log(firstItem)
                            //只获取第一个内容，避免把word内容转换成图片发送
                        console.log("firstItem>>>", firstItem)
                        UploadImagePreviewBinder.show(firstItem);
                    }
                    // for (var i = 0; i < items.length; ++i) {
                    //     if (items[i].kind == 'file' &&
                    //         items[i].type.indexOf('image/') !== -1) {

                    //         UploadImagePreviewBinder.show(items[i]);
                    //     }

                    // }
                }, false);
                //获取发送消息设置，是否允许回车直接发送消息

                var canSendMessage = function(e) {
                    if (Storage.getSetting("disableEnterSend")) {
                        //必须要组合键盘发送消息
                        return Utils.isMac() ? (e.keyCode === 13 && e.metaKey) : (e.keyCode === 13 && e.ctrlKey);
                    } else {
                        //直接回车发送
                        return Utils.isMac() ? (e.keyCode === 13 && !e.metaKey) : (e.keyCode === 13 && !e.ctrlKey);
                    }
                }

                var canWrapContent = function(e) {
                    if (Storage.getSetting("disableEnterSend")) {
                        //必须回车才能换行
                        //默认回车就是起到换行的作用了。
                        return false;
                        // return Utils.isMac() ? (e.keyCode === 13 && !e.metaKey) : (e.keyCode === 13 && !e.ctrlKey);
                    } else {
                        //必须回车+组合键才能换行
                        return Utils.isMac() ? (e.keyCode === 13 && e.metaKey) : (e.keyCode === 13 && e.ctrlKey);
                    }
                }

                jqForm.bind('keydown', function(e) {
                    //判断当前按键组合是否可以发送消息
                    if (canSendMessage(e)) {
                        e.preventDefault();

                        if (scope.publishing) {
                            TipsPopBinder.show({
                                body: '正在提交消息，请稍后.',
                                showConfirm: true
                            });
                            return;
                        }
                        //当选择@联系人列表展开时，用回车键是选择某个联系人，而不是提交信息
                        if (scope.isAtListHidden == false) {
                            return;
                        }
                        $(this).submit();
                        return;
                    }

                    //判断当前按键组合是否可以换行
                    if (canWrapContent(e)) {
                        jqTextarea.val(jqTextarea.val() + '\r');
                    }
                });

                jqForm.bind('submit', function(e) {
                    e.preventDefault();

                    //如果内容为空
                    if (!jqTextarea.val()) return;

                    var con = emotionsServ.emotionNameToCode(jqTextarea.val());
                    jqTextarea.val('');
                    
                    var postData = {
                        body: con
                    }

                    //点击表情之后提交内容，会丢失最后输入的表情复，所以需要强制再次赋值
                    scope.content = jqTextarea.val();
                    //发布内容
                    var pub = Publish(postData);
                    if (!pub) {
                        scope.publishing = false;
                        return;
                    }

                    pub.then(function(data) {
                        scope.content = '';
                        scope.publishing = false;
                        scope.focusPublisher();
                    }, function(err) {
                        PopMessage.tip({
                            msg: err.data.errors.message,
                            type: 0
                        });
                        scope.publishing = false;
                        scope.focusPublisher();
                    });
                });

                scope.$on('$destroy', function() {
                    btnUploadCancel.unbind('click');
                    jqForm.unbind('click');
                    jqForm.unbind('submit');
                    jqForm.unbind('keydown');
                    btnUploadCancel = null;
                    fileInput = null;
                    jqTextarea = null;
                    jqForm = null;
                });
            }
        }
    }
])

/*
 * 渲染@出的联系人
 */
.directive('userItem', [
    function() {
        return {
            restrict: 'E',
            replace: true,
            template: '<li ng-click="autoComplete(user)">\
      <img ng-src="{{uHead}}" alt="头像" class="avatar pull-left" width="20" height="20">\
      <span>{{ user.name }}</span>\
      </li>',
            controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
                //头像
                $scope.uHead = GLOBAL_SETTING.URL + $scope.user.avatar_url;
            }],
            link: function postLink(scope, ele) {

            }
        }
    }
])
/*
 * 更多功能键
 */
.directive('menuItemMore', ['selectConversationsItemBinder','PopMessage','PublisherBinder','CurUserDB','ConversationBinder',
    function(selectConversationsItemBinder, PopMessage, PublisherBinder, CurUserDB, ConversationBinder) {
        return {
            restrict: 'A',
            replace: true,
            template: '<div class="menu-item-more">\
                        <nav>\
                            <a href="#" class="batch_forwarding" title="批量转发">批量转发</a>\
                            <a href="#" class="batch_delete" title="批量删除">批量删除</a>\
                            <button href="#" class="channel" title="取消">取消</button>\
                        </nav>\
                    </div>',
            controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
            }],
            link: function postLink(scope, ele) {
                var batchForwardingBtn = ele.find('.batch_forwarding');
                var batchDeleteBtn = ele.find('.batch_delete');
                var channelBtn = ele.find('.channel');

                //点击批量转发按钮
                batchForwardingBtn.click(function(e){
                    e.preventDefault();
                    var eleSelectDom = $(".menuItemMore i.btn-select.select");
                    var arrMsgIds = [];
                    for (var i = 0; i < eleSelectDom.length; i++){
                        var id = $(".menuItemMore i.btn-select.select:eq("+ i +")").parent().attr('data-id');
                        arrMsgIds.push(id);
                    }
                    if(arrMsgIds.length == 0){
                        PopMessage.tip({
                            msg: '请选择转发内容！',
                            type: 0
                        });
                        return false;
                    };
                    //发送刷新弹出框convs的广播
                    scope.$broadcast('conversations.refdata');

                    selectConversationsItemBinder.forwardMsg(arrMsgIds);

                    //打开转发弹出框
                    $.magnificPopup.open({
                        items: {
                            src: '#selectConversationsItem',
                            type: 'inline'
                        },
                        verticalFit: true,
                        callbacks: {
                            open: function() {
                                //scope.initSelector();
                                //去掉删除成员状态
                                //scope.delItem = false;
                                // $('.select-conversation-list-warp .search').val('')
                            },
                            close: function() {
                                //关闭名片弹层时清掉用户信息数据
                                //GroupMemberSelect.clear();
                            }
                        }
                    });
                });
                //点击批量删除按钮
                batchDeleteBtn.click(function(e){
                    e.preventDefault();
                    var eleSelectDom = $(".menuItemMore i.btn-select.select");
                    var arrMsgIds = [];
                    if(eleSelectDom.length == 0){
                        PopMessage.tip({
                            msg: '请选择需要删除的消息！',
                            type: 0
                        });
                        return false;
                    };
                    //将需要删除的消息ID 插入待删除的序列
                    for (var i = 0; i < eleSelectDom.length; i++){
                        var id = $(".menuItemMore i.btn-select.select:eq("+ i +")").parent().attr('data-id');
                        arrMsgIds.push(id);
                    }

                    //循环待删除的序列，将其删除
                    $.each(arrMsgIds, function(index, val) {
                        ConversationBinder.removeMsg(val);
                    });

                    channelBtn.click();
                });
                channelBtn.click(function(e){
                    e.preventDefault();
                    $(".con-wrap").removeClass('menuItemMore').css('height', "calc(100% - 1px - 150px)");
                    $(".menu-item-more").hide();
                    var batchForwarding = false;
                    scope.$broadcast('showMessageForwordingBtn', batchForwarding);
                    PublisherBinder.show();
                    $(".con-wrap .btn-select").removeClass('select');
                    $(".con-box").scrollTop($('.conv-list').height());
                });

                scope.$on('$destroy', function() {
                   
                });
            }
        }
    }
])