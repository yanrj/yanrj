/*
 * 对话框中的对话渲染
 */

'use strict';

angular.module('mx.conversations.item')
    /*
     * 消息类型模板
     * <i class="status {{sendStatus}}" data-id={{conId}} ng-click="reSend"/><p conversation-msg-txtmsg ng-bind-html="::con.body | linkFilter | emotionsFilter"></p>
     */
    .constant('MESSAGE_TEMPLATE', {
        'text_message': '<i class="status {{sendStatus}}" data-id={{conId}} ng-click="reSend"/>\
                        <p conversation-msg-txtmsg ng-bind-html="::con.body | linkFilter  | emotionsFilter"></p>\
                        <div class="send-status"></div>',
        'notice_message': '<i class="status {{sendStatus}}" data-id={{conId}} ng-click="reSend"/>\
                        <p conversation-msg-txtmsg ng-bind-html="::con.body | linkFilter  | emotionsFilter"></p>\
                        <div class="send-status"></div>',
        'image': '<div class="img-sending sending" ng-show="!imgLoaded"></div>\
        <p conversation-msg-image class="message-img" ng-class="{\'loading\':!imgLoaded}">\
                    <a class="check-img" href="{{::originalUrl}}"><img class="image" ng-src="{{::thumbUrl}}" title="图片: {{::con.name}}" /></a>\
                    <span>\
                        <a class="check" href="#">查看</a>\
                        <a class="convDownload" data-name="{{::con.name}}" data-url="{{::downloadUrl}}" data-file-id="{{::con.file_id}}" ng-hide="filePath">下载</a>\
                        <a class="open-dir" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="打开文件所在目录">文件夹</a>\
                        <b style="color:#fff;font-weight:normal;" class="progress"><i></i></b>\
                    </span>\
                </p>',
        'voice_file': '<p class="message-voice" ng-style="{\'width\': voiceWidth}" conversation-msg-voice>\
                            <i>语音</i>\
                            <audio></audio>\
                            <time>{{::time}}</time>\
                        </p>',
        'video': '<p class="message-video" conversation-msg-video title="视频: {{::con.name}}">\
                    <img class="checkVideo" ng-src="{{::thumbUrl}}" alt="{{::con.name}}" />\
                    <i class="hidden checkVideo" data-stream-url="{{::videoUrl}}">视频</i>\
                    <span>\
                        <a class="convDownload btn-download" data-name="{{::con.name}}" data-url="{{::downloadUrl}}" data-file-id="{{::con.file_id}}" ng-hide="filePath || dirPath">下载</a>\
                        <a class="open-file" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="直接打开文件">打开　|</a>\
                        <a class="open-dir" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="打开文件所在目录">　打开文件夹</a>\
                        <b style="color:#fff;font-weight:normal;" class="progress"><i></i></b>\
                    </span>\
                </p>',
        'audio': '<p class="message-audio" conversation-msg-audio>\
                    <span class="info" >\
                        <img class="checkAudio" ng-src="{{::thumbUrl}}" alt="{{::con.name}}" />\
                        <b class="title">{{::con.name}}</b>\
                        <b class="size">({{::size}})</b>\
                    </span>\
                    <span class="actions">\
                        <b style="" class="progress"><i></i></b>\
                        <a class="convDownload btn-download" data-name="{{::con.name}}" data-url="{{::downloadUrl}}" data-file-id="{{::con.file_id}}" ng-hide="filePath || dirPath">下载</a>\
                        <a class="open-dir" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="打开文件所在目录">打开文件夹</a>\
                        <a class="open-file" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="直接打开文件">打开</a>\
                    </span>\
                </p>',
        'doc': '<p class="message-doc" conversation-msg-doc title="文档: {{::con.name}}">\
                    <span class="info" >\
                        <a ng-href="{{con.owa_url ? jumpUrl : \'javascript:void(0);\'}}" target="_blank">\
                            <img ng-src="{{thumbUrl}}" alt="{{::con.name}}" />\
                            <b class="title">{{::con.name}}</b>\
                            <b class="size">({{::size}})</b>\
                        </a>\
                    </span>\
                    <span class="actions">\
                        <b style="" class="progress"><i></i></b>\
                        <a class="convDownload btn-download" data-name="{{::con.name}}" data-url="{{::downloadUrl}}" data-file-id="{{::con.file_id}}" ng-hide="filePath || dirPath">下载</a>\
                        <a class="open-dir" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="打开文件所在目录">打开文件夹</a>\
                        <a class="open-file" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="直接打开文件">打开</a>\
                    </span>\
                </p>',
        'txt': '<p class="message-txt" conversation-msg-txt title="文本: {{::con.name}}">\
                    <span class="info" >\
                        <a ng-href="{{con.owa_url ? jumpUrl : \'javascript:void(0);\'}}" target="_blank">\
                            <img ng-src="{{::thumbUrl}}" alt="{{::con.name}}" />\
                            <b class="title">{{::con.name}}</b>\
                            <b class="size">({{::size}})</b>\
                        </a>\
                    </span>\
                    <span class="actions">\
                        <b style="" class="progress"><i></i></b>\
                        <a class="convDownload btn-download" data-name="{{::con.name}}" data-url="{{::downloadUrl}}" data-file-id="{{::con.file_id}}" ng-hide="filePath">下载</a>\
                        <a class="open-dir" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="打开文件所在目录">打开文件夹</a>\
                        <a class="open-file" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="直接打开文件">打开</a>\
                    </span>\
                </p>',
        'zip': '<p class="message-zip" conversation-msg-zip title="压缩文件: {{::con.name}}">\
                    <span class="info" >\
                        <a><img ng-src="{{::thumbUrl}}" alt="{{::con.name}}" /></a>\
                        <b class="title">{{::con.name}}</b>\
                        <b class="size">({{::size}})</b>\
                    </span>\
                    <span class="actions">\
                        <b style="" class="progress"><i></i></b>\
                        <a class="convDownload btn-download" data-name="{{::con.name}}" data-url="{{::downloadUrl}}" data-file-id="{{::con.file_id}}" ng-hide="filePath || dirPath">下载</a>\
                        <a class="open-dir" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="打开文件所在目录">打开文件夹</a>\
                        <a class="open-file" target="_blank" data-href="{{filePath}}"  ng-show={{isFilePath}} title="直接打开文件">打开</a>\
                    </span>\
                </p>',
        'unknown': '<p class="message-unknown" conversation-msg-unknown title="文件: {{::con.name}}">\
                        <span class="info">\
                            <a><img ng-src="{{::thumbUrl}}" alt="{{::con.name}}" /></a>\
                            <b class="title">{{::con.name}}</b>\
                            <b class="size">({{::size}})</b>\
                        </span>\
                        <span class="actions">\
                            <b style="" class="progress"><i></i></b>\
                        <a class="convDownload btn-download" data-name="{{::con.name}}" data-url="{{::downloadUrl}}" data-file-id="{{::con.file_id}}" ng-hide="filePath || dirPath">下载</a>\
                        <a class="open-dir" target="_blank" href="{{filePath}}"  ng-show={{isFilePath}} title="打开文件所在目录">打开文件夹</a>\
                        <a class="open-file" target="_blank" href="{{filePath}}"  ng-show={{isFilePath}} title="直接打开文件">打开</a>\
                        </span>\
                    </p>',
        'p2p_file': '<p class="message-p2p-file" conversation-msg-p2p-file title="文件: {{con.name}}">\
                            <span class="info">\
                                <img ng-src="images/origin/ico_file.png" alt="{{con.name}}" />\
                                <b class="title">{{con.name}}</b>\
                                <b class="size">({{size}})</b>\
                                <b ng-show="statusTxt" class="status">{{statusTxt}}</b>\
                            </span>\
                            <span class="actions">\
                                <b ng-show="progress && status === \'progress\'" style="width:{{progress}}%;" class="progress"><i>{{progress}}%</i></b>\
                                <a href="#" ng-show="status === \'progress\'" class="btn-cancel">取消</a>\
                                <a href="#" class="btn-offline">离线发送</a>\
                                <a href="#" class="btn-reject">拒绝</a>\
                                <a href="#" class="btn-accept">接收</a>\
                                <a target="_blank" href="{{path}}+"/"+con.name" ng-show="path" class="btn-download">打开所在目录</a>\
                            </span>\
                        </p>',
        'share_link': '<p class="message-share-link" conversation-msg-share-link title="点击跳转到该网页">\
                            <a href="{{::linkUrl | urlFilter}}" target="_blank">\
                                <img ng-src="{{::thumbUrl | urlFilter}}" alt="{{::con.name}}" />\
                                <i>{{::title}}</i>\
                                <span>{{::description}}</span>\
                            </a>\
                        </p>',
        'rich_content_message': '<div class="message-rich-content" ng-class="{secret: secret}" conversation-msg-rich-content>\
                                    <div ng-show="{{type==\'simple\'}}" class="simple-article">\
                                        <div class="header">\
                                            <h4>{{::articles[0].title}}</h4>\
                                            <time>{{::con.created_at | momentFilter}}</time>\
                                        </div>\
                                        <div class="body">\
                                            <img ng-show="articles[0].pic_url" ng-src="{{::articles[0].pic_url | urlFilter}}" />\
                                            <div class="rich-content" ng-bind-html="simpleContent"></div>\
                                        </div>\
                                        <a class="read-all" ng-show="articles[0].url || articles[0].app_url" href="{{::jumpUrl}}"  target="_blank">{{::label}}</a>\
                                    </div>\
                                    <div ng-show="{{::type==\'multi\'}}" ng-repeat="article in articles" class="multi-articles">\
                                        <a class="read-all" title="查看全文" href="{{::article.url | urlFilter}}" class="body" target="_blank">\
                                            <h4>{{::article.title}}</h4>\
                                            <img ng-show="article.pic_url" ng-src="{{::article.pic_url | urlFilter}}">\
                                        </a>\
                                    </div>\
                                </div>',
        'notification': '<div class="message-notification" conversation-msg-notification>\
                            <img class="user-photo" ng-src="{{::uHead}}"/>\
                            <div class="sub-notify">\
                                <a title="点击查看详情" class="goto" href="#"><b  ng-bind-html="::content | emotionsFilter"></b></a>\
                                <a title="点击查看详情" class="goto" href="#" ng-bind-html="::description | emotionsFilter"></a>\
                            </div>\
                            <i>{{::time}}</i>\
                        </div>',
        'system_message': '<p conversation-msg-sysmsg ng-bind-html="::con.body | encodeHTMLTag"></p>',
        'custom': '<p>当前版本暂不支持查看此消息，请在手机上查看。</p>',
        'plugin_message': '<p>当前版本暂不支持查看此消息，请在手机上查看。</p>',
    })
    /*
     * 会触发新对话的按钮
     * 点击的时候会把相关信息存到对话状态服务
     */
    .directive('newConvBtn', ['ConversationBinder',
        function(ConversationBinder) {
            return {
                restrict: 'AC',
                controller: ['$scope', function($scope) {}],
                link: function postLink(scope, ele, attrs) {
                    ele.bind('click', function() {
                        var dn = ele.data('name');
                        if (scope[dn]) {
                            ConversationBinder.trigger(scope[dn]);
                        } else {
                            ConversationBinder.trigger(scope.data);
                        }
                    });

                    //当作用于销毁时，清除引用
                    scope.$on('$destroy', function() {
                        ele.unbind('click');
                    });
                }
            }
        }
    ])
    /*
     * 对话区
     */
    .directive('conversationContentWrap', ['UserInfoServ', 'ConversationBinder', 'PopMessage','Publish','FileDownload', 'FileSaverBinder', 'CurUserDB', 'SlideWindow','Utils',
        function(UserInfoServ, ConversationBinder, PopMessage, Publish, FileDownload, FileSaverBinder, CurUserDB, SlideWindow,Utils) {
            return {
                restrict: 'A',
                link: function(scope, element, attrs) {
                    var box = element.find('.con-box');
                    var list = box.find('.conv-list');
                    var selectMsgBtn = element.find('.btn-select');
                    //防止频繁调用,最多1秒钟调用一次
                    var throttled = _.throttle(function() {
                            var lastItem = box.find('.item').eq(0);
                            //如果会话中没有数据，就不需要再进行更多的查询，因为DB.getMessages里面已经做了这样的处理，如果数据不到一页，会再次进行加载
                            if (!lastItem.size()) return;
                            ConversationBinder.moreConv()
                                .then(function() {
                                    // if (!lastItem.size()) return;
 
                                    //滚动到上次的最后一个元素
                                    setTimeout(function() {
                                        box.scrollTop(lastItem.offset().top);
                                    }, 4);
                                }, function(err) {
                                    PopMessage.err(err);
                                    //console.error('======== load more error ========');
                                    //console.error(data);
                                });
                        },
                        1000);
                    //监听滚动事件，滚动至顶部时加载更多内容
                    box.bind('scroll', function(e) {
                        if (!scope.conversation) return;
                        var conversationList = box.find(".conv-list");
                        // //滚动到底部,需要隐藏新消息提醒的提示
                        if ((box.scrollTop() + box.height()) == conversationList.height()) {
                            scope.showFreshTips(false);
                        }

                        //如果判断无更多内容，则不再请求
                        if (scope.conversation.noMore) return;

                        //滚动到顶部加载更多内容
                        if (box.scrollTop() === 0) {
                            throttled.call();
                        }

                    });

                    //消息重新发送
                    box.on('click','.send-failed',function(){
                        var tempMsgClass = $(this).parents('.text_message');

                        var tempMsg = tempMsgClass.find('pre').html();
                        var tempId = tempMsgClass.data('id');
                        var _msgData = scope.data.items;
                        
                        $.each(_msgData, function(index, val) {
                             if(val.id == tempId){
                                var arr = {
                                    body: val.body, 
                                    id: val.conversation_id, 
                                    type: val.type,
                                    status: 'resend',
                                    temp_id: tempId
                                }
                                tempMsgClass.find('.send-status').removeClass('send-failed').addClass('sending');

                                Publish(arr);   //重新发送离线消息
                             }
                        });
                    }).on('click', '.btn-select', function(){
                        $(this).toggleClass('select');
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

                    //初始化用户信息弹窗
                    box.magnificPopup({
                        delegate: 'a.uhead[data-ocu="false"]',
                        type: 'inline',
                        verticalFit: true,
                        callbacks: {
                            close: function() {
                                //关闭名片弹层时清掉用户信息数据
                                UserInfoServ.clear();
                            }
                        }
                    });

                    function UrlRegEx(url){      
                        var re = /(\w+):\/\/([^\:|\$$]+)(\$\$.*)?/i;   
                        var arr = url.match(re);   
                        return arr;   
                    } 

                    //初始化视频播放绑定事件
                    var videoHtml = '<div class="message-video-player">\
                                        <video controls style="padding:0;height:360px"  ></video>\
                                    </div>';
                    var jqVideo = $(videoHtml);

                    var fs = require( 'fs' );
                    var path = require("path");

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
                    }).on('click.convDownload', '.convDownload' ,function(){
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
                            FileDownload.download(fileUrl, filePath, fileName, ele);
                        });
                    }).on('click.openFile', '.open-file', function(e) {
                        e.preventDefault();
                        var gui = require('nw.gui');
                        var path = $(e.currentTarget).attr('data-href');
                        var fs = require('fs');
                        var str = $(this).parent();
                        fs.exists(path, function(exists) {
                          if (exists) {
                            gui.Shell.openItem(path);
                          } else {
                            console.info('exists error', exists);
                            PopMessage.err({
                                message: '您所访问文件不存在，请重新下载'
                            });
                            str.find('.convDownload ').removeClass('ng-hide').show();
                            str.find('.open-file').addClass('ng-hide');
                            str.find('.open-dir').addClass('ng-hide');
                            var fileId = str.find('.convDownload ').data('file-id');
                            CurUserDB.getDownloadFile(fileId)
                            .then(function(fileData){
                                if(!fileData) return;
                                fileData.path = '';
                                return CurUserDB.updateDownloadFile(fileId, fileData);
                            });
                            var messageId=parseInt($(e.target).closest('.item').data("id"));
                            CurUserDB.getMessage(messageId)
                            .then(function(msgData){
                                msgData.local_path = '';
                                CurUserDB.updateMsg(messageId, msgData);
                            });
                          }
                        });
                    }).on('click.openDirFile', '.open-dir', function(e) {
                        e.preventDefault();
                        var gui = require('nw.gui');
                        var path = $(e.currentTarget).attr('data-href');
                        var fs = require('fs');

                        var str = $(this).parent();
                        fs.exists(path, function(exists) {
                          if (exists) {
                            gui.Shell.showItemInFolder(path);
                          } else {
                            console.info('exists error', exists);
                            PopMessage.err({
                                message: '您所访问文件不存在，请重新下载'
                            });
                            str.find('.convDownload ').removeClass('ng-hide').show();
                            str.find('.open-file').addClass('ng-hide');
                            str.find('.open-dir').addClass('ng-hide');
                            var fileId = str.find('.convDownload ').data('file-id');
                            CurUserDB.getDownloadFile(fileId)
                            .then(function(fileData){
                                if(!fileData) return;
                                fileData.path = '';
                                return CurUserDB.updateDownloadFile(fileId, fileData);
                            });
                            var messageId=parseInt($(e.target).closest('.item').data("id"));
                            CurUserDB.getMessage(messageId)
                            .then(function(msgData){
                                msgData.local_path = '';
                                CurUserDB.updateMsg(messageId, msgData);
                            });
                          }
                        });
                    }).on('click.readAll', '.read-all', function(e) {
                        e.preventDefault();
                        var params = {};
                        var urlRegEx = UrlRegEx($(this).attr('href'));
                        if(urlRegEx[1] == 'launchApp'){
                            var nw = require('nw.gui'); 
                            var tempPath = nw.App.dataPath+'/';
                            var param = urlRegEx[3];
                            param = param.replace("$$",""); 
                            if(fs.existsSync(tempPath+'app_center/' + urlRegEx[2]) == false){
                                PopMessage.err({
                                    message: '该应用没有安装，请从"应用中心"安装后再重试'
                                });
                                return;
                            }
                            params.url = "file://"+tempPath + 'app_center/' + urlRegEx[2] + '/www/index.html'+param;
                        }else{
                            params.url = $(this).attr('href');
                            //判断是否是白名单应用
                            if(!Utils.isWhitelistHost(params.url)){
                                window.open(params.url,'_blank');
                                return;
                            }
                        }
                        params.id = 'readAll';
                        params.isShowTitle = true;
                        $('#slideWindow .title').show();
                        $('#slideWindow .title').css('border-bottom', 'none');
                        $('#slideWindow span').hide();
                        $('.close').show();
                        $('.slide-iframe').css('margin-top','-52px');
                        SlideWindow.show(params);
                    });

                    //当作用于销毁时，清除引用
                    scope.$on('$destroy', function() {
                        box.unbind('scroll');
                        jqVideo = null;
                        box = null;
                        list = null;
                        $(document).off("click.rotate_img").off("click.play_video").off('click.rotate_img').off('click.zoom').off('click.convDownload').off('click.openFile').off('click.openDirFile').off('click.readAll');
                    });
                }
            }
        }
    ])
    /*
     * conversation对话框中每条内容块
     * @description: 处理元素左右布局样式
     */
    .directive('conversationContent', ['$route', 'RootscopeApply', 'ConversationBinder',
        function($route, RootscopeApply, ConversationBinder) {
            return {
                replace: false,
                restrict: 'A',
                templateUrl: 'views/templates/conversation_contents.tpl.html',
                controller: ['$scope', '$filter', 'Storage', 'ConversationMoment',
                    function($scope, $filter, Storage, ConversationMoment) {
                        var serderId = $scope.con.sender_id;
                        var date = $scope.con.created_at;
                        //计算本条内容与之前内容时间间隔，返回是否需要时间标记
                        if (typeof $scope.con.id == 'number') {
                            var needTimeTag = ConversationMoment.moment(date);
                            $scope.showMenuSelectBtn = false;
                            if (needTimeTag || $scope.$index === 0) {
                                $scope.interval = $filter('momentFilter')(date);
                            }
                        }
                        
                        //对话内容ID
                        $scope.conId = $scope.con.id;
                        //判断用户ID，输出不同的样式class
                        $scope.person = serderId === Storage.getUser('id') ? 'self' : 'other';
                        //是否是系统信息
                        $scope.system = $scope.con.system ? 'system' : '';
                        //用户ID
                        $scope.uid = serderId;
                        //消息类型
                        $scope.msgType = $scope.con.message_type;
                        //是否是群聊
                        $scope.isMulti = $scope.triggerData && $scope.triggerData.is_multi_user;
                        if($('.menuItemMore').length > 0){
                            $scope.showMenuSelectBtn = true;
                        };
                        //当作用于销毁时，清除引用
                        $scope.$on('$destroy', function() {
                            needTimeTag = null;
                            serderId = null;
                            date = null;
                        });
                    }
                ],
                link: function postLink(scope, element, attrs) {
                    var msgType = scope.msgType;
                    var conBox = element.parents('.con-box');
                    var t, eleTime, eleUnreadTip, scopeWatcher;
                    if (scope.interval) {
                        //TODO: 把ele代码移到app.js或放到tpl.html    ng-show="scope.msgType!= str"
                        //当消息类型不是通知时，在对话框居中位置显示消息的时间
                        if (msgType != 'notification') {
                            eleTime = angular.element('<time class="item">' + scope.interval + '</time>');
                            eleTime.prependTo(element)
                        }
                    }

                    scope.$on('showMessageForwordingBtn',function(e,data){
                        RootscopeApply(scope, function() {
                            scope.showMenuSelectBtn = data;
                        });
                    });

                    //如果被标记为最新通知对象，则添加标记元素
                    if (scope.con.unreadItem) {
                        t = msgType === 'notification' ? '通知' : '消息';
                        eleUnreadTip = angular.element('<div class="unread-tag"><span>' + '以下是最新' + t + '</span></div>');
                        eleUnreadTip.prependTo(element)
                    }

                    /**
                     * 如果是最后一个，则将滚动条滚动至底部。如果用户正在滚动浏览对话内容，不再强制滚动至底部
                     * 这个功能比较蛋疼！！！！
                     * 目前每次对话加载都要滚动到底部，会触发scroll事件，用户滚动浏览对话也会触发scroll事件
                     * 所以无法判断哪些是用户的滚动操作，只能通过每次打开新对话时的标记，来判断是否需要滚动至底部
                     */
                    var watchExcuter = _.debounce(function() {
                        if (conBox == null) return; //在两个会话之间快速切换的时候，conBox可能还为空，暂不知为什么，先做容错
                        //如果上次滚动至底部的对话不是当前对话或者可见区域内可看到最后元素，则滚动到底部
                        if (!conBox.find(".fresh-tips").is(':visible')) {
                            conBox.scrollTop(99999);
                        }
                        // //将当前对话id设置为最后一次滚动至底部的对话id
                        // ConversationBinder.lastScrolledConvId(scope.convId);
                    }, 100);
                    if (scope.$last) {
                        scopeWatcher = scope.$watch(
                            function() {
                                return element.height();
                            },
                            watchExcuter, true);
                    }

                    //当作用于销毁时，清除引用
                    scope.$on('$destroy', function() {
                       conBox&&conBox.find(".fresh-tips").hide();
                        conBox = null;
                        eleTime = null;
                        eleUnreadTip = null;
                        if (scopeWatcher) scopeWatcher();
                    });
                }
            }
        }
    ])
    /*
     * 消息父级模块
     */
    .directive('conversationMessage', ['$compile', 'MESSAGE_TEMPLATE', '$rootScope',
        function($compile, MESSAGE_TEMPLATE, $rootScope) {
            return {
                restrict: 'A',
                link: function postLink(scope, element, attrs) {
                    var con = scope.con;
                    var msgTpl = MESSAGE_TEMPLATE[con.message_type];
                    var msgEle = angular.element(msgTpl);
                    element.append(msgEle);
                    $compile(msgEle)(scope);
                    if(con.send_status == false){
                        element.find('.send-status').addClass('send-failed')
                    }
                    
                }
            }
        }
    ])
    /*
     * 图片消息
     */
    .directive('conversationMsgImage', ['Storage', '$rootScope', 'RootscopeApply', 'CurUserDB', 'Cache', function(Storage, $rootScope, RootscopeApply, CurUserDB, Cache) {
            return {
                restrict: 'A',
                controller: ['$scope', 'GLOBAL_SETTING','$element', function($scope, GLOBAL_SETTING, $element) {
                    var URL = GLOBAL_SETTING.URL;
                    var con = $scope.con;
                    //var t = Storage.getToken().access_token;

                    $scope.downloadUrl = URL + con.preview_url;
                    $scope.thumbUrl = URL + con.thumbnail_url;
                    $scope.originalUrl = URL + con.preview_url;
                    //$scope.thumbUrl = URL + con.thumbnail_url + '?access_token=' + t;
                    //$scope.originalUrl = URL + con.preview_url + '?access_token=' + t;
                    $scope.imgLoaded = false;

                    $scope.isFilePath = con.local_path && con.local_path != '' ? true : false;
                    $scope.filePath = con.local_path && con.local_path != '' ? con.local_path : '';

                    if(con.local_path && con.local_path != ''){
                        $element.find('.open-dir').removeClass('ng-hide');
                        $element.find('.open-file').removeClass('ng-hide');
                    }
                    
                    // var fileData = Cache.get('file_'+con.file_id);
                    // if(fileData){
                    //     $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                    //     $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                    //     // $element.find('.open-dir').removeClass('ng-hide');
                    //     // $element.find('.open-file').removeClass('ng-hide');
                    // }else{
                    //     CurUserDB.getDownloadFile(con.file_id).then(function(fileData){
                    //         RootscopeApply($scope, function() {
                    //             if(fileData){
                    //                 $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                    //                 $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                    //                 if(fileData.path && fileData.path != ''){
                    //                     $element.find('.open-dir').removeClass('ng-hide');
                    //                     $element.find('.open-file').removeClass('ng-hide');
                    //                 }
                    //             }
                    //         });
                    //     }); 
                    // }

                    
                }],
                link: function postLink(scope, element, attrs) {
                    var imgLink = element.find('a.check-img');
                    var checkLink = element.find('a.check');
                    var img = element.find('img');

                    checkLink.bind('click', function(e) {
                        e.preventDefault();
                        imgLink.click();
                    });

                    img.on('load', function(e) {
                        RootscopeApply(scope, function() {
                            scope.imgLoaded = true;
                        });
                    });

                    //当作用于销毁时，清除引用
                    scope.$on('$destroy', function() {
                        img.off('load');
                        img = null;
                    });
                }
            }
        }
    ])
    /*
     * 文档消息
     */
    .directive('conversationMsgDoc', ['RealtimeServ', '$filter', 'CurUserDB','Storage','RootscopeApply','Cache',
        function(RealtimeServ, $filter, CurUserDB, Storage, RootscopeApply, Cache) {
            return {
                restrict: 'A',
                controller: ['$scope', 'GLOBAL_SETTING','$element', function($scope, GLOBAL_SETTING, $element) {
                    var URL = GLOBAL_SETTING.URL;
                    var con = $scope.con;
                    var size = con.size;
                    var sizeFilter = $filter('fileSizeFilter');
                    var ssoToken = Storage.getToken().mx_sso_token;
                    //内存大小换算
                    $scope.size = sizeFilter(size);
                    $scope.downloadUrl = URL + con.download_url;
                    $scope.thumbUrl = URL + con.thumbnail_url;
                    $scope.docUrl = URL + con.stream_url;
                    $scope.processed = con.processed;
                    $scope.jumpUrl = URL + con.owa_url + '&mx_sso_token=' + ssoToken;

                    $scope.isFilePath = con.local_path && con.local_path != '' ? true : false;
                    $scope.filePath = con.local_path && con.local_path != '' ? con.local_path : '';

                    if(con.local_path && con.local_path != ''){
                        $element.find('.open-dir').removeClass('ng-hide');
                        $element.find('.open-file').removeClass('ng-hide');
                    }

                    // var fileData = Cache.get('file_'+con.file_id);
                    // if(fileData){
                    //     $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                    //     $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                    //     // $element.find('.open-dir').removeClass('ng-hide');
                    //     // $element.find('.open-file').removeClass('ng-hide');
                    // }else{
                    //    CurUserDB.getDownloadFile(con.file_id).then(function(fileData){
                    //         RootscopeApply($scope, function() {
                    //             if(fileData){
                    //                 $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                    //                 $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                    //                 if(fileData.path && fileData.path != ''){
                    //                     $element.find('.open-dir').removeClass('ng-hide');
                    //                     $element.find('.open-file').removeClass('ng-hide');
                    //                 }
                    //             }
                    //         });
                    //     }); 
                    // }
                    

                    /**
                     * 更新doc消息的数据库&Cache
                     */
                    function updateDocData(data) {
                        console.info('doc 订阅成功', data);
                        con.processed = true;
                        con.stream_url = data.stream_url;

                        CurUserDB.saveMessages([con]);

                        //重置doc url
                        $scope.docUrl = URL + con.stream_url;
                        //绑定弹窗
                        $scope.bindPopDoc();
                        //console.info('doc con 数据', con);
                        //清除本次订阅
                        RealtimeServ.clear(con.id);
                    }

                    //订阅doc流处理完成的推送
                    $scope.docRealtime = function() {
                        var realtime = con.realtime;
                        if (!realtime) return;
                        RealtimeServ.subscribe({
                            uri: realtime.uri,
                            channel_id: realtime.channel_id,
                            type: con.id,
                            success: updateDocData,
                            error: function(err) {
                                console.error('============ conversation.newMessage_item(1).error');
                                console.log(err);
                            }
                        });
                    };
                }],
                link: function postLink(scope, element, attrs) {
                    // var docHtml = '<div class="message-doc-player">\
                    //                     <div id="documentViewer" class="flexpaper_viewer"></div>\
                    //                 </div>';
                    // var jqDoc = $(docHtml);
                    // var docImg = element.find('img');
                    // var playerWrap = $('#documentViewer');

                    // //绑定弹窗显示doc
                    // scope.bindPopDoc = function() {
                    //     docImg.magnificPopup({
                    //         items: {
                    //             src: jqDoc,
                    //             type: 'inline'
                    //         },
                    //         mainClass: 'popup-wrap-doc-player',
                    //         callbacks: {
                    //             open: function() {
                    //                 var url = scope.docUrl;
                    //                 if(scope.con.owa_url){
                    //                     url = scope.con.owa_url;
                    //                     $('#documentViewer').load(scope.$parent.URL + url);
                    //                 }else{
                    //                     $('#documentViewer').FlexPaperViewer({
                    //                         config: {
                    //                             SwfFile: escape(url),
                    //                             jsDirectory: '/vendor/flexpaper/js/',
                    //                             Scale: 1.2
                    //                         }
                    //                     });
                    //                 }
                    //             }
                    //         }
                    //     });
                    // };

                    // if (scope.processed) {
                    //     //如果文档流已处理完毕，绑定弹窗
                    //     scope.bindPopDoc();
                    // } else {
                    //     //如果文档流还没准备好，订阅推送
                    //     scope.docRealtime();
                    // }

                    //当作用于销毁时，清除引用
                    // scope.$on('$destroy', function() {
                    //     jqDoc = null;
                    //     playerWrap = null;
                    //     docImg = null;
                    // });
                }
            }
        }
    ])
    /*
     * 文本消息
     */
    .directive('conversationMsgTxt', ['$filter','CurUserDB','RootscopeApply','Cache', function($filter, CurUserDB, RootscopeApply, Cache) {
        return {
            restrict: 'A',
            controller: ['$scope', 'GLOBAL_SETTING', 'Storage', 'RootscopeApply', '$element', function($scope, GLOBAL_SETTING, Storage, RootscopeApply, $element) {
                var URL = GLOBAL_SETTING.URL;
                var con = $scope.con;
                var size = con.size;
                var sizeFilter = $filter('fileSizeFilter');
                var ssoToken = Storage.getToken().mx_sso_token;

                $scope.isFilePath = con.local_path && con.local_path != '' ? true : false;
                $scope.filePath = con.local_path && con.local_path != '' ? con.local_path : '';

                if(con.local_path && con.local_path != ''){
                    $element.find('.open-dir').removeClass('ng-hide');
                    $element.find('.open-file').removeClass('ng-hide');
                }

                // var fileData = Cache.get('file_'+con.file_id);
                // if(fileData){
                //     $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                //     $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                //     // $element.find('.open-dir').removeClass('ng-hide');
                //     // $element.find('.open-file').removeClass('ng-hide');
                // }else{
                //    CurUserDB.getDownloadFile(con.file_id).then(function(fileData){
                //         RootscopeApply($scope, function() {
                //             if(fileData){
                //                 $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                //                 $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                //                 if(fileData.path && fileData.path != ''){
                //                     $element.find('.open-dir').removeClass('ng-hide');
                //                     $element.find('.open-file').removeClass('ng-hide');
                //                 }
                //             }
                //         });
                //     }); 
                // }
                
                //内存大小换算
                $scope.size = sizeFilter(size);
                $scope.thumbUrl = URL + con.thumbnail_url;
                $scope.downloadUrl = URL + con.download_url;
                $scope.jumpUrl = URL + con.owa_url + '&mx_sso_token=' + ssoToken;
            }],
            link: function postLink(scope, element, attrs) {
                // var docHtml = '<div class="message-txt-player">\
                //                     <div id="documentViewer" class="flexpaper_viewer"></div>\
                //                 </div>';
                // var jqDoc = $(docHtml);
                // var docImg = element.find('img');
                // var playerWrap = $('#documentViewer');

                //var url = scope.con.owa_url;
                //console.info('href',scope.$parent.URL + url);
                //window.location.href(scope.$parent.URL + url);

                // //绑定弹窗显示doc
                // docImg.magnificPopup({
                //     items: {
                //         src: jqDoc,
                //         type: 'inline'
                //     },
                //     mainClass: 'popup-wrap-txt-player',
                //     callbacks: {
                //         open: function() {
                //             var url = scope.docUrl;
                //             if(scope.con.owa_url){
                //                 url = scope.con.owa_url;
                //                 $('#documentViewer').load(scope.$parent.URL + url);
                //             }
                //         }
                //     }
                // });

                //当作用于销毁时，清除引用
                // scope.$on('$destroy', function() {
                //     jqDoc = null;
                //     playerWrap = null;
                //     docImg = null;
                // });
            }
        }
    }])
    /*
     * 语音消息
     */
    .directive('conversationMsgVoice', ['$compile', '$rootScope', function($compile, $rootScope) {
        return {
            restrict: 'A',
            controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
                var URL = GLOBAL_SETTING.URL;
                var con = $scope.con;
                var maxWidth = 250;
                var midWidth = 150;

                $scope.time = Math.ceil(con.duration) + '"';
                $scope.voice = URL + con.stream_url;
                $scope.playing = false;

                var time = parseInt($scope.time);
                $scope.voiceWidth = time < 30 ? midWidth * time / 30 : maxWidth * time / 60;



            }],
            link: function postLink(scope, element, attrs) {
                var eleAudio = element.find('audio')[0];

                eleAudio.src = scope.voice;
                eleAudio.volume = 1;

                //停止播放
                var pause = function() {
                    //暂停
                    eleAudio.pause();
                    //重新加载音频
                    eleAudio.load();
                    //去掉播放动画
                    element.removeClass('playing');
                };

                element.bind('click', function(e) {
                    //先停止其它语音的播放
                    $rootScope.$broadcast('stop_audio_play', scope.con.id);

                    if (eleAudio.paused) {
                        eleAudio.play();
                    } else {
                        pause();
                    }
                });

                var audioPlayListener = function() {
                    element.addClass('playing');
                };

                var audioEndedListener = function() {
                    element.removeClass('playing');
                };

                eleAudio.addEventListener('play', audioPlayListener, false);
                eleAudio.addEventListener('ended', audioEndedListener, false);

                //监听停止播放事件，当点击其他音频时停止播放当前音频
                var scopeListener = scope.$on('stop_audio_play', function(e, id) {
                    if (!eleAudio.paused && scope.con.id !== id) {
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
    /*
     * 视频消息
     */
    .directive('conversationMsgVideo', ['Storage','RootscopeApply','CurUserDB','Cache',
        function(Storage, RootscopeApply, CurUserDB, Cache) {
            return {
                restrict: 'A',
                controller: ['$scope', 'GLOBAL_SETTING', '$element', function($scope, GLOBAL_SETTING, $element) {
                    var URL = GLOBAL_SETTING.URL;
                    var con = $scope.con;
                    //var t = Storage.getToken().access_token;

                    $scope.downloadUrl = URL + con.download_url;
                    $scope.thumbUrl = URL + con.thumbnail_url;
                    //$scope.thumbUrl = URL + con.thumbnail_url + '?access_token=' + t;
                    $scope.videoUrl = URL + con.stream_url;
                    //$scope.videoUrl = URL + con.stream_url + '?access_token=' + t;
                   
                    $scope.isFilePath = con.local_path && con.local_path != '' ? true : false;
                    $scope.filePath = con.local_path && con.local_path != '' ? con.local_path : '';

                    if(con.local_path && con.local_path != ''){
                        $element.find('.open-dir').removeClass('ng-hide');
                        $element.find('.open-file').removeClass('ng-hide');
                    }

                    // var fileData = Cache.get('file_'+con.file_id);
                    // if(fileData){
                    //     $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                    //     $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                    //     // $element.find('.open-dir').removeClass('ng-hide');
                    //     // $element.find('.open-file').removeClass('ng-hide');
                    // }else{
                    //    CurUserDB.getDownloadFile(con.file_id).then(function(fileData){
                    //         RootscopeApply($scope, function() {
                    //             if(fileData){
                    //                 $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                    //                 $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                    //                 if(fileData.path && fileData.path != ''){
                    //                     $element.find('.open-dir').removeClass('ng-hide');
                    //                     $element.find('.open-file').removeClass('ng-hide');
                    //                 }
                    //             }
                    //         });
                    //     }); 
                    // }
                }],
                link: function postLink(scope, element, attrs) {
                    // var videoHtml = '<div class="message-video-player">\
                    //                     <video controls src="' + scope.videoUrl + '" ></video>\
                    //                 </div>';
                    // var jqVideo = $(videoHtml);
                    // var checkVideo = element.find('.checkVideo');

                    // //防止竖着的视频过大
                    // jqVideo.find('video').css('height', 360);

                    // checkVideo.magnificPopup({
                    //     items: {
                    //         src: jqVideo,
                    //         type: 'inline'
                    //     }
                    // });
                    //当作用于销毁时，清除引用
                    // scope.$on('$destroy', function() {
                    //     videoHtml = null;
                    //     jqVideo = null;
                    //     checkVideo = null;
                    // });
                }
            }
        }
    ])
    /*
     * 音频消息
     */
    .directive('conversationMsgAudio', ['$filter', 'RootscopeApply','CurUserDB','Cache', function($filter, RootscopeApply, CurUserDB,Cache) {
        return {
            restrict: 'A',
            controller: ['$scope', 'GLOBAL_SETTING','$element', function($scope, GLOBAL_SETTING, $element) {
                var URL = GLOBAL_SETTING.URL;
                var con = $scope.con;
                var size = con.size;
                var sizeFilter = $filter('fileSizeFilter');

                //内存大小换算
                $scope.size = sizeFilter(size);

                $scope.downloadUrl = URL + con.download_url;
                $scope.thumbUrl = URL + con.thumbnail_url;
                $scope.audioUrl = URL + con.stream_url;

                $scope.isFilePath = con.local_path && con.local_path != '' ? true : false;
                $scope.filePath = con.local_path && con.local_path != '' ? con.local_path : '';

                if(con.local_path && con.local_path != ''){
                    $element.find('.open-dir').removeClass('ng-hide');
                    $element.find('.open-file').removeClass('ng-hide');
                }

                // var fileData = Cache.get('file_'+con.file_id);
                // if(fileData){
                //     $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                //     $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                //     // $element.find('.open-dir').removeClass('ng-hide');
                //     // $element.find('.open-file').removeClass('ng-hide');
                // }else{
                //    CurUserDB.getDownloadFile(con.file_id).then(function(fileData){
                //         RootscopeApply($scope, function() {
                //             if(fileData){
                //                 $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                //                 $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                //                 if(fileData.path && fileData.path != ''){
                //                     $element.find('.open-dir').removeClass('ng-hide');
                //                     $element.find('.open-file').removeClass('ng-hide');
                //                 }
                //             }
                //         });
                //     }); 
                // }
            }],
            link: function postLink(scope, element, attrs) {
                var audioHtml = '<div class="message-audio-player">\
                                    <audio controls src="' + scope.audioUrl + '" ></audio>\
                                </div>';
                var jqAudio = $(audioHtml);
                var checkAudio = element.find('.checkAudio');

                checkAudio.magnificPopup({
                    items: {
                        src: jqAudio,
                        type: 'inline'
                    }
                });

                //当作用于销毁时，清除引用
                scope.$on('$destroy', function() {
                    audioHtml = null;
                    jqAudio = null;
                    checkAudio = null;
                });
            }
        }
    }])
    /*
     * 压缩文件消息
     */
    .directive('conversationMsgZip', ['$filter','RootscopeApply','CurUserDB','Cache', function($filter, RootscopeApply, CurUserDB, Cache) {
        return {
            restrict: 'A',
            controller: ['$scope', 'GLOBAL_SETTING','$element', function($scope, GLOBAL_SETTING, $element) {
                var URL = GLOBAL_SETTING.URL;
                var con = $scope.con;
                var size = con.size;
                var sizeFilter = $filter('fileSizeFilter');

                //内存大小换算
                $scope.size = sizeFilter(size);

                $scope.thumbUrl = URL + con.thumbnail_url;
                $scope.downloadUrl = URL + con.download_url;

                $scope.isFilePath = con.local_path && con.local_path != '' ? true : false;
                $scope.filePath = con.local_path && con.local_path != '' ? con.local_path : '';

                if(con.local_path && con.local_path != ''){
                    $element.find('.open-dir').removeClass('ng-hide');
                    $element.find('.open-file').removeClass('ng-hide');
                }

                // var fileData = Cache.get('file_'+con.file_id);
                // if(fileData){
                //     $scope.isFilePath = fileData.path && fileData.path ? true : false;
                //     $scope.filePath = fileData.path && fileData.path ? fileData.path + fileData.name : '';
                //     // $element.find('.open-dir').removeClass('ng-hide');
                //     // $element.find('.open-file').removeClass('ng-hide');
                // }else{
                //    CurUserDB.getDownloadFile(con.file_id).then(function(fileData){
                //         RootscopeApply($scope, function() {
                //             if(fileData){
                //                 $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                //                 $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                //                 if(fileData.path && fileData.path != ''){
                //                     $element.find('.open-dir').removeClass('ng-hide');
                //                     $element.find('.open-file').removeClass('ng-hide');
                //                 }
                                
                //             }
                //         });
                //     }); 
                // }
            }],
            link: function postLink(scope, element, attrs) {}
        }
    }])
    /*
     * 未知类型文件消息
     */
    .directive('conversationMsgUnknown', ['Storage', '$filter','RootscopeApply','CurUserDB','Cache', function(Storage, $filter, RootscopeApply, CurUserDB, Cache) {
        return {
            restrict: 'A',
            controller: ['$scope', 'GLOBAL_SETTING','$element', function($scope, GLOBAL_SETTING, $element) {
                var URL = GLOBAL_SETTING.URL;
                var con = $scope.con;
                //var t = Storage.getToken().access_token;
                var size = con.size;
                var sizeFilter = $filter('fileSizeFilter');

                //内存大小换算
                $scope.size = sizeFilter(size);

                $scope.thumbUrl = URL + con.thumbnail_url;
                //$scope.thumbUrl = URL + con.thumbnail_url + '?access_token=' + t;
                $scope.downloadUrl = URL + con.download_url;
                //$scope.downloadUrl = URL + con.download_url + '?access_token=' + t;
                
                $scope.isFilePath = con.local_path && con.local_path != '' ? true : false;
                $scope.filePath = con.local_path && con.local_path != '' ? con.local_path : '';

                if(con.local_path && con.local_path != ''){
                    $element.find('.open-dir').removeClass('ng-hide');
                    $element.find('.open-file').removeClass('ng-hide');
                }

                // var fileData = Cache.get('file_'+con.file_id);
                // if(fileData){
                //     $scope.isFilePath = fileData.path && fileData.path ? true : false;
                //     $scope.filePath = fileData.path && fileData.path ? fileData.path + fileData.name : '';
                //     // $element.find('.open-dir').removeClass('ng-hide');
                //     // $element.find('.open-file').removeClass('ng-hide');
                // }else{
                //    CurUserDB.getDownloadFile(con.file_id).then(function(fileData){
                //         RootscopeApply($scope, function() {
                //             if(fileData){
                //                 $scope.isFilePath = fileData.path && fileData.path != '' ? true : false;
                //                 $scope.filePath = fileData.path && fileData.path != '' ? fileData.path + fileData.name : '';
                //                 if(fileData.path && fileData.path != ''){
                //                     $element.find('.open-dir').removeClass('ng-hide');
                //                     $element.find('.open-file').removeClass('ng-hide');
                //                 }
                //             }
                //         });
                //     }); 
                // }
            }],
            link: function postLink(scope, element, attrs) {}
        }
    }])
    /*
     * 分享链接消息
     */
    .directive('conversationMsgShareLink', ['Storage', 'GLOBAL_SETTING',
        function(Storage, GLOBAL_SETTING) {
            return {
                restrict: 'A',
                controller: ['$scope', function($scope) {
                    var URL = GLOBAL_SETTING.URL;
                    var con = $scope.con;
                    var tokenData = Storage.getToken();

                    //由于url需要增加mx_sso_token参数，但url中可能存在#XXX的hash，必须截断拼接
                    var url = con.url.split('#');
                    var c = url[0].indexOf('?') > -1 ? '&' : '?';
                    var linkUrl = url[0] + c + 'mx_sso_token=' + tokenData.mx_sso_token;
                    if (url[1]) {
                        linkUrl += '#' + url[1];
                    }

                    $scope.thumbUrl = con.thumbnail_url;
                    $scope.linkUrl = linkUrl;
                    $scope.title = con.title;
                    $scope.description = con.description;
                }],
                link: function postLink(scope, element, attrs) {}
            }
        }
    ])
    /*
     * 图文混排消息
     */
    .directive('conversationMsgRichContent', function() {
        return {
            restrict: 'A',
            controller: ['$scope', 'GLOBAL_SETTING','Storage', function($scope, GLOBAL_SETTING, Storage) {
                var URL = GLOBAL_SETTING.URL;
                var con = $scope.con;
                var articles = con.body.articles;
                var ssoToken = Storage.getToken().mx_sso_token;
                if(articles.length > 1){
                    for(var i = 0; i < articles.length; i++){
                        articles[i].url = URL + articles[i].url + '&mx_sso_token=' +  ssoToken;
                    }
                }else{
                    $scope.jumpUrl = articles[0].url ? URL + articles[0].url + '&mx_sso_token=' + ssoToken : articles[0].app_url;
                }
                if(articles[0].url){
                    $scope.label = '>>查看全文';
                }else if(articles[0].app_url){
                    $scope.label = articles[0].action_label;
                }
                $scope.URL = URL;
                $scope.articles = articles;
                $scope.type = articles.length > 1 ? 'multi' : 'simple';
                $scope.title = articles[0].title;
                $scope.simpleContent = articles[0].description;
                $scope.secret = con.body.secret;
            }],
            link: function postLink(scope, element, attrs) {
                //初始化图文混排消息链接弹窗
                // element.magnificPopup({
                //     delegate: 'a',
                //     type: 'iframe',
                //     verticalFit: true
                // });
            }
        }
    })
    /*
     * 通知
     */
    .directive('conversationMsgNotification', ['WorkCircleListServ',
        function(WorkCircleListServ) {
            return {
                restrict: 'A',
                controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
                    var URL = GLOBAL_SETTING.URL;
                    var con = $scope.con;
                    var article = con.body.articles[0];
                    var create_time = con.created_at;
                    $scope.uHead = URL + article.pic_url;
                    //通知标题
                    $scope.content = article.title;
                    //回复内容的链接
                    $scope.url = article.url;
                    //回复的内容
                    $scope.description = article.description;
                    //回复的时间
                    $scope.time = global.moment(create_time).calendar();
                }],
                link: function postLink(scope, element, attrs) {
                    var btnGo = element.find('a.goto');

                    //点击通知的链接，跳转到相应内容
                    //目前支持工作圈通知
                    btnGo.bind('click', function(e) {
                        e.preventDefault();
                        WorkCircleListServ.openFromNoti(scope.url);
                    });

                    //当作用于销毁时，清除引用
                    scope.$on('$destroy', function() {
                        btnGo.unbind('click');
                        btnGo = null;
                    });
                }
            }
        }
    ])
    /*
     * p2p文件消息
     */
    .directive('conversationMsgP2pFile', ['$filter', 'P2PFileSender', 'Storage', 'P2PFileReceiver', 'RootscopeApply',
        'RTC', 'ConversationBinder',
        function($filter, P2PFileSender, Storage, P2PFileReceiver, RootscopeApply, RTC, ConversationBinder) {
            return {
                restrict: 'A',
                controller: ['$scope', function($scope) {
                    var con = $scope.con;
                    var size = con.size;
                    var selfId = Storage.getUser('id');
                    var sizeFilter = $filter('fileSizeFilter');
                    var recieverRTCId = con.reciever_rtcid;
                    var myRTCId = RTC.getMyRTCId();
                    var state;
                    //获取文件传输实时状态状态
                    if (con.sender_id === selfId) {
                        state = P2PFileSender.getFileState(con.id);
                    } else {
                        state = P2PFileReceiver.getFileState(con.direct_to_user_id, con.name);
                    }

                    if (!state) {
                        state = con.state || {
                            status: "done"
                        };
                    }

                    if (recieverRTCId !== myRTCId && state.status === 'progress') {
                        state.status = 'failed';
                    }

                    //传输进度百分比
                    $scope.progress = 0;

                    // console.info('渲染了一条p2p文件消息', $scope.con);
                    // console.info('文件状态', state);

                    //内存大小换算
                    $scope.size = sizeFilter(size);

                    function stateWorker(state) {
                        if (!state) return;

                        $scope.progress = state.progress || $scope.progress;

                        if (state.status === 'done' || state.status === 'eof') {
                            $scope.progress = 100;
                        }
                        $scope.status = state.status;

                        //根据传输状态输出状态文本
                        switch (state.status) {
                            case 'waiting':
                                $scope.statusTxt = '等待中...';
                                break;
                            case 'rejected':
                                $scope.statusTxt = '已取消';
                                break;
                            case 'cancelled':
                                $scope.statusTxt = '已取消';
                                break;
                            case 'started':
                                $scope.statusTxt = '开始传输';
                                break;
                            case 'progress':
                                $scope.statusTxt = '正在传输';
                                break;
                            case 'eof':
                                $scope.statusTxt = '已接收，未保存.';
                                break;
                            case 'done':
                                $scope.statusTxt = '完成';
                                break;
                            case 'failed':
                                $scope.statusTxt = '传输失败';
                                break;
                            case 'saved':
                                if (!state.path) {
                                    $scope.statusTxt = '已保存, 获取保存目录失败';
                                } else {
                                    $scope.statusTxt = '已保存至 "' + state.path + '"';
                                }

                                $scope.path = state.path;
                                break;
                            default:
                                ;
                        }
                    }

                    //处理状态
                    stateWorker(state);

                    //监听此p2p文件传输的状态变化事件
                    $scope.$on('p2pfile_state_' + con.id, function(e, state) {
                        console.info('p2p文件状态变化啦', state);
                        RootscopeApply($scope, function() {
                            stateWorker(state);
                        });
                    });
                }],
                link: function postLink(scope, element, attrs) {
                    element.on("click", ".btn-download", function(e) {
                        e.preventDefault();
                        var gui = require('nw.gui');
                        var path = $(e.currentTarget).attr('href');
                        gui.Shell.openItem(path);
                    })
                }
            }
        }
    ])