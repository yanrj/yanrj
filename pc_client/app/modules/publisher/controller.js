angular.module('mx.publisher', ['mx.emotions','At'])

/*
 * 上传附件控制器
 * 目前使用angular-file-upload第三方组件，为什么？方便啊！未来有时间需要单独开发一个组件。
 * https://github.com/nervgh/angular-file-upload
 */
.controller('FileUploadCtrl', ['$scope', 'FileUploader', 'GLOBAL_SETTING', 'Publish', 'ConversationBinder',
  '$element', 'FileUploaderBinder', '$injector', '$http', 'PopMessage', 'PublisherBinder', 'RTC',
  'TipsPopBinder', 'RootscopeApply', 'RealtimeMsgHandler', 'P2PFileSender',
    function($scope, FileUploader, GLOBAL_SETTING, Publish, ConversationBinder, $element, FileUploaderBinder,
      $injector, $http, PopMessage, PublisherBinder, RTC, TipsPopBinder, RootscopeApply, RealtimeMsgHandler,
      P2PFileSender) {
      var uri = '/api/v1/uploaded_files';
      var url = GLOBAL_SETTING.URL + uri;
      var btnUpload = $element.find('input[type="file"]');
      var uploader = $scope.uploader = new FileUploader({
        scope: $scope,
        url: url,
        autoUpload: false,
        headers: {
          'AUTHORIZATION': $http.defaults.headers.common['AUTHORIZATION'],
          'NETWORK_ID': $http.defaults.headers.common['NETWORK_ID']
        },
        alias: '[uploading][]data',
        formData: [{
          conversation_id: 0
        }]
      });

      var init = function() {
        $scope.fileUploading = false;
        $scope.progress = 0;
        $scope.fileItem = null;
        uploader.clearQueue();
      };

      init();

      //执行普通上传
      var normalUpload = function() {
        ConversationBinder.lock();
        uploader.uploadAll();
        $scope.fileUploading = true;
      };

      $injector.invoke(FileUploaderBinder.bind, this, {
        $scope: $scope
      });

      //将文件添加到上传队列
      //这里是用来方便其他地方调用上传控件提供的方法，目前拖拽上传正在使用
      $scope.uploadFile = function(file) {
        // file.upload_type = "drag"; //增加这个是为了绕开下面的判断，让拖拽的文件也可以走点对点传输文件
        uploader.addToQueue(file);
        // uploader.onAfterAddingAll([new FileUploader.FileItem(uploader, file)]);
      };

      $scope.cancelAll = function() {
        var targetUserId = ConversationBinder.getOppositeUserId();
        RTC.cancelFile(targetUserId);

        $scope.cancelNormal();
      };

      //取消普通离线传输(不包含断开p2p连接)
      $scope.cancelNormal = function() {
        uploader.cancelAll();

        RootscopeApply($scope, function() {
          init();
        });

        //清空file input的value值，上传失败时可能无法自动清除，所以这里强制清除
        PublisherBinder.clearFileInputValue();
        //解锁当前对话
        ConversationBinder.unlock();
      };

      //文件上传成功
      uploader.onSuccessItem = function(item, response, status, headers) {
        var res = response;
        var fileId = res[0] && res[0].id;
        var postData = {
          attached: 'uploaded_file:' + fileId
        };


        //console.info(ConversationBinder.locked);
        if (!ConversationBinder.locked) {
          console.log('上传附件的对话已取消');
          return;
        }

        //清除上传控件的value，不然无法再次上传同一张图片
        btnUpload.val('');

        RootscopeApply($scope, function() {
          init();
        });

        //解锁当前对话
        ConversationBinder.unlock();

        if (!fileId) return;
        //发布内容
        Publish(postData);
      };

      //文件上传失败
      uploader.onErrorItem = function(item, response, status, headers) {
        console.log('========= 文件上传失败 ==========');
        console.info('Error', status, item, response);

        var msg = response.errors && response.errors.message;

        switch (status) {
          case 413:
            msg = '文件尺寸过大';
            break;
        }

        PopMessage.tip({
          type: 0,
          msg: '上传失败,' + (msg || '请稍后重试')
        });

        $scope.cancelAll();
      };

      //选择完所有文件
      uploader.onAfterAddingAll = function(items) {
        if (!ConversationBinder.getCurrentConvId()) {
          TipsPopBinder.show({
            body: '请先在左侧会话列表选择一个会话。',
            showCancel: false,
            showConfirm: true
          });
          return;
        }

        //如果正在上传，提示并取消本次
        if ($scope.fileUploading) {
          PopMessage.tip({
            type: 0,
            msg: '正在上传文件，请稍后再试'
          });
          return;
        }

        //获取文件
        $scope.fileItem = items[0];
        var _file = items[0]._file;

        //获取到目标用户的id
        var targetUserId = ConversationBinder.getOppositeUserId();

        //如果没取到对方ID(如群聊)或标记为剪切板的图片文件，直接离线传输
        if (!targetUserId || !window.easyrtc || (_file && _file.upload_type === 'clipboard')) {
          normalUpload();
          return;
        }

        var oppositeRTCId = easyrtc.usernameToIds(String(targetUserId));

        //由于点对点传输功能不稳定暂时屏蔽，待后续优化
        //如果没有获取到对方的rtc id，代表对方不在线，使用普通上传
        //if (!oppositeRTCId.length) {
          normalUpload();
          return;
        //}

        //先尝试在线发送(点对点发送给用户)
        // var p2pFile = btnUpload[0].files[0];
        var p2pFile = _file;
       
        //开始传输
        P2PFileSender.newFile({
          file: p2pFile,
          targetId: targetUserId,
          offlineCB: normalUpload
        });
      };

      //正在上传
      uploader.onProgressItem = function(item, progress) {
        //console.info('progress', progress);
        //console.info('progress locked: ', ConversationBinder.locked);

        //如果对话没有锁定，则取消上传(如退出登录)
        if (!ConversationBinder.locked) {
          uploader.cancelAll();
        }

        $scope.progress = progress;
      };

      /*uploader.bind('cancel', function (event, xhr, item) {
          console.info('Cancel', xhr, item);
      });


      uploader.bind('complete', function (event, xhr, item, response) {
          console.info('Complete', xhr, item, response);
      });*/
    }
  ])