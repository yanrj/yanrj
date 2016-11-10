'use strict';
angular.module('mxWebClientApp')
/*
 * 收藏
 */
.directive('collectionItem', ['CollectonServ', 'GLOBAL_SETTING', 'Storage', 'PopMessage', '$rootScope','$timeout','FileDownload', 'FileSaverBinder', 'CurUserDB','RootscopeApply','Cache',function(CollectonServ, GLOBAL_SETTING, Storage, PopMessage, $rootScope,$timeout, FileDownload, FileSaverBinder, CurUserDB,RootscopeApply, Cache) {
    return {
      restrict: 'EA',
      template: '<li data-senderid="{{item.sender_id}}" data-id="{{item.message_id}}"  ng-repeat="item in items" class="item">\
            <span class="avatar">\
                <img ng-src="{{item.avatar_img}}">\
            </span>\
            <span class="conversation-body">\
                <span class="header">\
                    <span ng-if="item.message_type!=\'thread\'" class="name">{{item.name}}</span>\
                    <span ng-if="item.message_type==\'thread\'" class="name">{{item.name}}->{{item.group_name}}</span>\
                    <span class="time">{{item.created_at | momentFilter}}</span>\
                </span>\
                <span ng-if="item.message_type==text_message" class="content" ng-bind-html="item.title | linkFilter  | emotionsFilter">\
                </span>\
                <span ng-class="{true: \'thread\'}[item.message_type==\'thread\']" ng-if="item.message_type==\'thread\'" class="content">\
                  <p class="message-share-link" title="点击跳转到该网页">\
                    <a href="{{item.url | urlFilter}}" target="_blank">\
                        <img ng-if="item.thumbnail_url" ng-src="{{item.thumbnail_url | urlFilter}}" alt="{{item.name}}" />\
                        <i ng-bind-html="item.title | emotionsFilter"></i>\
                        <span>{{item.description}}</span>\
                    </a>\
                  </p>\
                </span>\
                <span ng-class="{true: \'link\'}[item.message_type==\'link\']" ng-if="item.message_type==\'link\'" class="content">\
                  <p class="message-share-link" title="点击跳转到该网页">\
                    <a href="{{item.url | urlFilter}}" target="_blank">\
                        <img ng-src="{{item.thumbnail_url | urlFilter}}" alt="{{item.name}}" />\
                        <i>{{item.title}}</i>\
                        <span>{{item.description}}</span>\
                    </a>\
                  </p>\
                </span>\
                <span ng-class="{true: \'voice_file\'}[item.message_type==voice_file]" ng-if="item.message_type==\'voice_file\'" class="content">\
                    <p collection-voice data-id="{{item.id}}" class="message-voice" ng-style="{\'width\': item.voiceWidth}">\
                        <i>语音</i>\
                        <audio>{{item.download_url | urlFilter}}</audio>\
                        <time>{{item.time}}</time>\
                    </p>\
                </span>\
                <span ng-class="{true: \'file\'}[item.message_type==file]" ng-if="item.message_type==\'file\'" class="content">\
                    <p ng-if="item.content_type && item.content_type!=\'application/zip\'" class="message-doc" title="{{item.file_name}}">\
                        <span class="info" >\
                            <a href="{{item.owa_url}}" target="_blank">\
                                <img ng-src="{{item.thumbnail_url | urlFilter}}" alt="{{item.file_name}}" />\
                                <b class="title">{{item.file_name}}</b>\
                                <b class="size">({{item.file_size | fileSizeFilter}})</b>\
                            </a>\
                        </span>\
                        <span class="actions">\
                            <b style="" class="progress"><i></i></b>\
                            <a class="download btn-download" data-name="{{item.file_name}}" data-url="{{item.download_url}}" data-file-id="{{item.file_id}}" ng-hide={{item.isFilePath}}>下载</a>\
                            <a class="open-dir-coll" target="_blank" data-href="{{item.filePath}}"  ng-show={{item.isFilePath}} title="打开文件所在目录">打开文件夹</a>\
                            <a class="open-file-coll" target="_blank" data-href="{{item.filePath}}"  ng-show={{item.isFilePath}} title="直接打开文件">打开</a>\
                        </span>\
                    </p>\
                    <p ng-if="item.content_type && item.content_type==\'application/zip\'" class="message-doc" title="{{item.file_name}}">\
                        <span class="info" >\
                            <a>\
                                <img ng-src="{{item.thumbnail_url | urlFilter}}" alt="{{item.file_name}}" />\
                                <b class="title">{{item.file_name}}</b>\
                                <b class="size">({{item.file_size | fileSizeFilter}})</b>\
                            </a>\
                        </span>\
                        <span class="actions">\
                            <b style="" class="progress"><i></i></b>\
                            <a class="download btn-download" data-name="{{item.file_name}}" data-url="{{item.download_url}}" data-file-id="{{item.file_id}}" ng-hide={{item.isFilePath}}>下载</a>\
                            <a class="open-dir-coll" target="_blank" data-href="{{item.filePath}}"  ng-show={{item.isFilePath}} title="打开文件所在目录">打开文件夹</a>\
                            <a class="open-file-coll" target="_blank" data-href="{{item.filePath}}"  ng-show={{item.isFilePath}} title="直接打开文件">打开</a>\
                        </span>\
                    </p>\
                </span>\
                <span ng-class="{true: \'video\'}[item.message_type==video]" ng-if="item.message_type==\'video\'" class="content">\
                    <p class="message-video" title="视频: {{item.file_name}}">\
                        <img class="checkVideo" ng-src="{{item.thumbnail_url | urlFilter}}" alt="{{item.file_name}}" />\
                        <i class="hidden checkVideo" data-stream-url="{{item.download_url | urlFilter }}">视频</i>\
                        <span>\
                            <a class="download btn-download" data-name="{{item.file_name}}" data-url="{{item.download_url}}" data-file-id="{{item.file_id}}" ng-hide="{{item.isFilePath}}">下载</a>\
                            <a class="open-file-coll" target="_blank" data-href="{{item.filePath}}"  ng-show={{item.isFilePath}} title="直接打开文件">打开　|</a>\
                            <a class="open-dir-coll" target="_blank" data-href="{{item.filePath}}"  ng-show={{item.isFilePath}} title="打开文件所在目录">　打开文件夹</a>\
                            <b style="color:#fff;font-weight:normal;" class="progress"><i></i></b>\
                        </span>\
                    </p>\
                </span>\
                <span ng-class="{true: \'image\'}[item.message_type==image]" ng-if="item.message_type==\'image\'" class="content">\
                        <p collection-image class="message-img">\
                            <a class="check-img" href="{{item.download_url | urlFilter}}"><img class="image" ng-src="{{item.thumbnail_url | urlFilter}}" title="图片" /></a>\
                            <span>\
                                <a class="check" href="#">查看</a>\
                                <a class="download btn-download" data-name="{{item.file_name}}" data-url="{{item.download_url}}" data-file-id="{{item.file_id}}" ng-hide="{{item.isFilePath}}">下载</a>\
                                <a class="open-dir-coll" target="_blank" data-href="{{item.filePath}}"  ng-show={{item.isFilePath}} title="打开文件所在目录">文件夹</a>\
                                <b style="color:#fff;font-weight:normal;" class="progress"><i></i></b>\
                            </span>\
                        </p>\
                </span>\
                <a href="javascript:void(0)" class="btn-delect" data-message-id="{{item.id}}">删 除</a>\
            </span>\
        </li>\
        <li class="no-data">暂无收藏</li>',
      scope: true,
      controller: ['$scope','$element', function($scope, $element) {
        var tokenData = Storage.getToken();
        $scope.url = GLOBAL_SETTING.URL;
        $scope.text_message = "text_message";
        $scope.link = "link";
        var httpModule = 'get';
        var _data = {};
        var limit = "20";
        _data.limit = limit;

        $scope.httpModule = httpModule;
        $scope.limit = _data;
        var URL = GLOBAL_SETTING.URL;
        $("ul.collection-list li.no-data").hide();
        //获取收藏列表
        $scope.collectionList = function(httpModule,_data){

            CollectonServ(httpModule,_data)
            .then(function(data){
              $scope.data = angular.copy(data);
              $.each($scope.data.items, function(index, val) {
                if(val.download_url){
                    var dlUrl = URL + val.download_url;
                    $scope.data.items[index].download_url = dlUrl;
                }
                if(val.url){
                    var url = $scope.data.items[index].url.split('#');
                    var c = url[0].indexOf('?') > -1 ? '&' : '?';
                    var linkUrl = url[0] + c + 'mx_sso_token=' + tokenData.mx_sso_token;
                    if (url[1]) {
                        linkUrl += '#' + url[1];
                    }
                    $scope.data.items[index].url = linkUrl;
                }
                if(val.message_type == 'voice_file'){
                    var maxWidth = 250;
                    var midWidth = 150;

                    $scope.data.items[index].time = Math.ceil(val.duration) + '\"';
                    var time = parseInt($scope.data.items[index].time);
                    $scope.data.items[index].voiceWidth = time < 30 ? midWidth * time / 30 : maxWidth * time / 60;

                }
                if(val.message_type == 'link'){
                    $scope.data.items[index].name = '网页链接';
                    $scope.data.items[index].avatar_img = $scope.url+val.thumbnail_url;

                }
                if(val.owa_url){
                    $scope.data.items[index].owa_url =  URL + val.owa_url + '&mx_sso_token=' + tokenData.mx_sso_token;
                }else{
                    $scope.data.items[index].owa_url =  'javascript:void(0);';
                }
                $.each($scope.data.references, function(avatarIndex, avatarVal) {
                  if(avatarVal.id == val.sender_id ){
                    $scope.data.items[index].avatar_img = $scope.url+avatarVal.avatar_url;
                    $scope.data.items[index].name = avatarVal.name;
                  }
                  
                });

                var fileData = Cache.get('file_'+val.file_id);
                if(fileData){
                    $scope.data.items[index].isFilePath = fileData.path && fileData.path != '' ? true : false;
                    $scope.data.items[index].filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                }else{
                    CurUserDB.getDownloadFile(val.file_id).then(function(fileData){
                        RootscopeApply($scope, function() {
                            if(fileData){
                                $scope.data.items[index].isFilePath = fileData.path && fileData.path != '' ? true : false;
                                $scope.data.items[index].filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                                if(fileData.path && fileData.path != ''){
                                    $element.find('.item[data-id='+ val.message_id +'] .open-dir-coll').removeClass('ng-hide');
                                    $element.find('.item[data-id='+ val.message_id +'] .open-file-coll').removeClass('ng-hide');
                                    $element.find('.item[data-id='+ val.message_id +'] .download').addClass('ng-hide');
                                    $scope.items = $scope.data.items;
                                }
                                
                            }
                        });
                    });
                }
              });
              $scope.items = $scope.data.items;
              $scope.itemLength = $scope.items.length;
              if($scope.items.length == 0){
                $("ul.collection-list li.no-data").show();
              }

            })
        }
        $scope.collectionList(httpModule,_data);



        //作用域变量处理器
        // $scope.scopeWorker = function(data) {
        //   $scope.items = data;
        //   $scope.installed = data.installed;
        // };
      }],
      link: function postLink(scope, element, attrs) {

        //删除收藏
        var httpModule = 'delete';
        $(document).on('click','.btn-delect',function(){
          var msgId = $(this).data('message-id').toString();
          var data = {"id":msgId};
          var removeItem = $(this).parent().parent();
          CollectonServ(httpModule, data)
          .then(function(data){
            if(data.message == 'unfavorite'){
                PopMessage.tip({
                    msg: '删除成功！',
                    type: 1
                });
                removeItem.remove();


                if(($("ul.collection-list li").length - 1) == 0){
                    $("ul.collection-list li.no-data").show();
                }

                if(($("ul.collection-list li").length - 1) == 4){
                    scope.collectionList(scope.httpModule,scope.limit);
                }
            }
          },function(data){
            if(data.errors.message == '该收藏已被删除.'){
              removeItem.remove();
            }
            PopMessage.err({
              message: data.errors.message
            });
          });
        });

        //初始化弹窗
        element.magnificPopup({
            delegate: '.message-img .check-img',
            type: 'image',
            closeBtnInside: false,
            verticalFit: false,
            gallery: {
                enabled: true
            },
            zoom: {
                enabled: true,
                duration: 300
            },
            image: {
                tError: '图片加载失败'
            },
            closeMarkup: '<button title="缩小" class="mfp-zoom-out button "><button title="放大" class="mfp-zoom-in button"><button title="旋转" class="mfp-rotate button"></button><button title="%title%" type="button" class="mfp-close">&#215;</button>',
            prependTo: "<button>测试</button>",
            callbacks: {
                close: function() {
                   $("header").css("-webkit-app-region","drag");
                },
                open:function(){
                   //打开的时候，把Header的drag属性去掉，要不然会导致button无法点击，暂时先这么临时解决
                   $("header").css("-webkit-app-region","no-drag");
                }
            }
        });

        //初始化视频播放绑定事件
        var videoHtml = '<div class="message-video-player">\
                            <video controls style="padding:0;height:360px"></video>\
                        </div>';
        var jqVideo = $(videoHtml);

        //点击旋转图片，每次旋转90°
        $(document).on("click.rotate_img", "button.mfp-rotate", function(e) {
            e.stopPropagation();
            var imgEl = $("figure img.mfp-img");
            var lastRotateNum = imgEl.data("rotate") || 0;
            lastRotateNum -= 90;
            imgEl.css('-webkit-transform', 'rotate(' + lastRotateNum + 'deg)').data("rotate", lastRotateNum);
        }).on("click.zoom", "button.mfp-zoom-in", function(e) {
            //放大
            e.stopPropagation();
            var imgEl = $("figure img.mfp-img");
            imgEl.css('width',imgEl.width() * 1.1+'px'); 
        }).on("click.zoom", "button.mfp-zoom-out", function(e) {
            e.stopPropagation();
            var imgEl = $("figure img.mfp-img");
            if(imgEl.width() > 200){
                imgEl.css('width',imgEl.width() / 1.1+'px');
            }
        }).on("click.play_video", "i.checkVideo", function(e) {
            var streamUrl = $(e.currentTarget).data("stream-url");
            jqVideo.find('video').attr('src', streamUrl);

            $.magnificPopup.open({
                items: {
                    src: jqVideo,
                    type: 'inline'
                }
            });
        }).on('click.download', '.download' ,function(){
            var ele = $(this);
            var fileUrl = ele.data('url');
            var fileName = ele.data('name');

            FileSaverBinder.getFileDirectory()
            .then(function(path) {
                var os = require('os');
                if(os.platform().indexOf("win") == 0){
                    var filePath = path + '\\';
                }else{
                    var filePath = path + '/';
                }
                console.info('要保存到这个目录', filePath);
                FileDownload.download(fileUrl, filePath, fileName, ele);
            });
        }).on('click.openFileCollection', '.open-file-coll', function(e) {
            e.preventDefault();
            var gui = require('nw.gui');
            var path = $(e.currentTarget).attr('data-href');
            
            var fs = require('fs');
            var str = $(this).parent();
            fs.exists(path, function(exists) {
              if (exists) {
                gui.Shell.openItem(path);
              } else {
                PopMessage.err({
                    message: '您所访问文件不存在，请重新下载'
                });
                str.find('.download').removeClass('ng-hide').show();
                str.find('.open-file-coll').addClass('ng-hide');
                str.find('.open-dir-coll').addClass('ng-hide');
                var fileId = str.find('.download').attr('data-file-id');
                CurUserDB.getDownloadFile(fileId)
                .then(function(fileData){
                    if(!fileData) return;
                    fileData.path = '';
                    return CurUserDB.updateDownloadFile(fileId, fileData);
                });
              }
            });
        }).on('click.openDirFileCollection', '.open-dir-coll', function(e) {
            e.preventDefault();
            var gui = require('nw.gui');
            var path = $(e.currentTarget).attr('data-href');
            var fs = require('fs');
            var str = $(this).parent();
            fs.exists(path, function(exists) {
              if (exists) {
                gui.Shell.showItemInFolder(path);
              } else {
                PopMessage.err({
                    message: '您所访问文件不存在，请重新下载'
                });
                str.find('.download').removeClass('ng-hide').show();
                str.find('.open-file-coll').addClass('ng-hide');
                str.find('.open-dir-coll').addClass('ng-hide');
                var fileId = str.find('.download').attr('data-file-id');

                CurUserDB.getDownloadFile(fileId)
                .then(function(fileData){
                    if (!fileData) return;
                    fileData.path = '';
                    return CurUserDB.updateDownloadFile(fileId, fileData);
                });
              }
            });
        });

        $('.collection-list').scroll(function(){
            var httpModule = scope.httpModule;
            var _data = {};
            var limit = parseInt(scope.limit.limit);

            if($('.collection-list li').length < limit) return

            var domId = document.getElementById('collection-list');
        　　var scrollTop = domId.scrollTop;
        　　var scrollHeight = domId.scrollHeight;
            var clientHeight = domId.clientHeight;

        　　if(scrollTop + clientHeight + 10 > scrollHeight){
                limit += 20;
                _data.limit = limit.toString();
                scope.limit = _data;
                scope.collectionList(httpModule,_data);
        　　}
        });
        
        

        //当作用于销毁时，清除引用
        scope.$on('$destroy', function() {
            jqVideo = null;
            $(document).off("click.rotate_img").off("click.play_video").off('click.rotate_img').off('click.zoom').off('click.download').off('click.openFileCollection').off('click.openDirFileCollection');
            $(document).off('click','.btn-delect');
        });
      }
    }
  }
])
/*
 *
 * 查看图片
 * 
 */
.directive('collectionImage', [
    function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                //点击图片
                var imgLink = element.find('a.check-img');
                var checkLink = element.find('a.check');
                checkLink.bind('click', function(e) {
                    e.preventDefault();
                    imgLink.click();
                });

                //当作用于销毁时，清除引用
                scope.$on('$destroy', function() {
                    checkLink.unbind('click');
                });
            }
        }
    }
])
/*
 * 语音消息
 */
.directive('collectionVoice', ['$compile', '$rootScope', '$timeout', function($compile, $rootScope, $timeout) {
    return {
        restrict: 'A',
        link: function postLink(scope, element, attrs) {
            var eleAudio = element.find('audio')[0];
            var audioUrl = element.find('audio');
            $timeout(
                function() {
                    eleAudio.src = audioUrl.html();
                    eleAudio.volume = 1;
                    scope.id = element.data('id');

                    element.bind('click', function(e) {
                        //先停止其它语音的播放
                        $rootScope.$broadcast('stop_audio_play', scope.id);
                        
                        if (eleAudio.paused) {
                            eleAudio.play();
                        } else {
                            pause();
                        }
                    });

                    eleAudio.addEventListener('play', audioPlayListener, false);
                    eleAudio.addEventListener('ended', audioEndedListener, false);
                },
                1000
            );

            var audioPlayListener = function() {
                element.addClass('playing');
            };

            var audioEndedListener = function() {
                element.removeClass('playing');
            };

            //停止播放
            var pause = function() {
                //暂停
                eleAudio.pause();
                //重新加载音频
                eleAudio.load();
                //去掉播放动画
                element.removeClass('playing');
            };

            //监听停止播放事件，当点击其他音频时停止播放当前音频
            var scopeListener = scope.$on('stop_audio_play', function(e, id) {
                if (!eleAudio.paused && scope.id !== id) {
                    pause();
                }
            });

            //当作用于销毁时，清除引用
            scope.$on('$destroy', function() {
                eleAudio.removeEventListener('play', audioPlayListener);
                eleAudio.removeEventListener('ended', audioEndedListener);
                eleAudio = null;
                element.unbind('click');
                if (scopeListener) scopeListener();
            });
        }
    }
}])