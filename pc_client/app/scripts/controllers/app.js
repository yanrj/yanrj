'use strict';
angular.module('mxWebClientApp')

/*
 * 监控一些全局事件
 */
.controller('AppCtrl', ['$scope', '$location', 'Storage', 'Cache', 'UnreadGlobal', 'RealtimeServ',
    'SidebarNavBinder', '$injector', 'RootscopeApply', 'AppRootBinder', 'GLOBAL_SETTING', '$route',
    '$rootScope', 'Ping', 'CommunitySwitcherBinder', 'DefaultHttpHeader', 'SetWinSize', 'Startup',
    'NewMsgFlashBinder', 'CurUserDB', 'ConversationListBinder', 'RealtimeMsgHandler', 'RTC','ConversationBinder','TipsPopBinder','StartPcBinder','UsersServ','Utils',
    function($scope, $location, Storage, Cache, UnreadGlobal, RealtimeServ, SidebarNavBinder, $injector,
        RootscopeApply, AppRootBinder, GLOBAL_SETTING, $route, $rootScope, Ping, CommunitySwitcherBinder,
        DefaultHttpHeader, SetWinSize, Startup, NewMsgFlashBinder, CurUserDB, ConversationListBinder,
        RealtimeMsgHandler, RTC,ConversationBinder, TipsPopBinder, StartPcBinder, UsersServ,Utils) {
        //绑定侧边栏服务
        $injector.invoke(SidebarNavBinder.bind, this, {
            $scope: $scope
        });

        //绑定App全局服务
        $injector.invoke(AppRootBinder.bind, this, {
            $scope: $scope
        });

        var ls = Storage;
        var gui = require('nw.gui');
        var win = gui.Window.get();
        /**
         * 用来记录忽略几次全局消息推送
         * 如果当前激活的对话有新消息，会触发全局未读消息数减1
         * 但如果之后有收到全局未读消息数，则会遮盖数量，导致未读数与实际不符
         * 所以用它来标记忽略次数，如果不为0，则在收到全局消息推送时不更新数量，直到其值为0
         */
        // var ignoreMsgNum = 0;


        //注册硬启动
        // var arrRegUrl = ['\\Minxing','\\Minxing\\DefaultIcon','\\Minxing\\shell','\\Minxing\\shell\\open','\\Minxing\\shell\\open\\command'];
        // $.each(arrRegUrl, function(index, val) {
        //     switch (index){
        //         case 0:
        //             StartPcBinder.saveSetting('URL Protocol',process.execPath,val,'HKCR');
        //             StartPcBinder.saveSetting('','WebshellProtocol',val);
        //             break;
        //         case 1:
        //             StartPcBinder.saveSetting('','C:\\Git\\pc_client\\exe_builds\\Minxing\\win32\\Minxing.exe,1',val,'HKCR');
        //             break;
        //         case 2:
        //             StartPcBinder.saveSetting('','',val,'HKCR');
        //             break;
        //         case 3:
        //             StartPcBinder.saveSetting('','',val,'HKCR');
        //             break;
        //         case 4:
        //             StartPcBinder.saveSetting('',"\"C:\\Git\\pc_client\\exe_builds\\Minxing\\win32\\Minxing.exe\" \"%1\"",val,'HKCR');
        //             break;
        //     }

        // });


        //window.routeReload = $route.reload;
        AppRootBinder.connected(true)
        // $scope.netState = 1; //当前网络连接状态 {0: 未连接, 1: 已连接}
        AppRootBinder.winFocused(true, true); 
        // $scope.windowFocused = false;
        $scope.setting = Storage.getSetting() || {};
        $scope.appName = GLOBAL_SETTING.name;
        $scope.appNameCn = GLOBAL_SETTING.name_cn;
        //$scope.untreatedMessage = 0;    //已读对话消息数
        $scope.untreatedCircle = 0; //已读工作圈消息数
        $scope.showReconnectBtn = false; //是否显示重新连接按钮

        if (typeof $scope.setting.notification === 'undefined') {
            $scope.setting.notification = true;
        }

        //根据不同页面设置不同pageClass
        $rootScope.$on('$routeChangeSuccess', function() {
            var path = $location.path();
            var pageClass = path.replace('/', '');
            if(pageClass=="") pageClass="init";
            $scope.pageClass = pageClass;
        });

        //设置任务栏图标未读数
        var taskIconNum = function(num) {
            var n = '';

            if (num > 0 && num <= 99) {
                n = num;
            } else if (num > 99) {
                n = '...'
            }

            win.setBadgeLabel(n);

            //mac托盘未读数
            //NewMsgFlashBinder.unRead(n);
        };

        /**
         * 标记作用域内未读消息数量
         * @param type[String]: 类型{1: "消息", 2: "工作圈"}
         * @param count[Number]: 未读数
         */
        $scope.unreadHandler = function(type, count) {
            //先把未处理的消息已读数减掉
            /*if ($scope.untreatedMessage) {
                msgCount = msgCount - $scope.untreatedMessage;
            }*/
            //console.info('要忽略的全局未读次数', ignoreMsgNum);

            //如果window没有聚焦，闪烁图标提醒用户
            //console.info('设置未读数_' + type, count);
            if (type === 2 && count === $scope.unreadCircle) return;

            if (!AppRootBinder.winFocused()&&!Utils.isMac()) {
                win.requestAttention(true);
            }

            //如果参数不存在，返回，方便仅想点亮图标的操作
            if (!type && !count) return;

            RootscopeApply($scope, function() {
                if (type === 1) {
                    $scope.unreadMessage = count < 0 ? 0 : count;
                    //设置任务栏图标未读数
                    taskIconNum(count);
                } else if (type === 2) {
                    $scope.unreadCircle = count;
                }
                //$scope.untreatedMessage = 0;

                //如果有标记忽略全局推送的次数，则跳过本次未读数更新
                // if (ignoreMsgNum) {
                //     ignoreMsgNum--;
                //     return;
                // }
            });
        };

        //从多个社区对象过滤出当前社区对象
        var networkfilter = function(items) {
            if (items.length <= 1) return items[0];

            var networkId = ls.getUser('networkId');
            var item = items[0];

            if (!networkId) return false;

            items.some(function(ele) {
                if (ele.id === networkId) {
                    item = ele;
                    return true;
                }
            });

            return item;
        };

        //全局未读数处理
        var globalRTHandler = function(data) {
            console.info('=========== conversation.newMessage_global(2)_' + data.type + '.success', data);
            if (!AppRootBinder.connected()) return;

            var networkId = Storage.getUser('networkId');
            if (data.type === 'notification') {
                var notiNetworkId = data.data[0].id;
                if (notiNetworkId === networkId) {
                    //如果类型是全局未读数，处理工作圈未读数
                    $scope.unreadHandler(2, data.data[0].following_feed_unseen_count);
                }
            }

            //如果有推送同步对话未读数的消息
            if (data.type === 'sync' && data.data.object === 'conversation') {
                var convId = data.data.object_id;
                var unreadNum = data.data.attrs[0].value[0];
                var conversation=Cache.get("conversation_" + convId);
                //console.info('服务器推送对话未读数', unreadNum);
                if (typeof unreadNum !== 'number') return;
                if (conversation&&unreadNum >= 0&&unreadNum<conversation.unread_count) {
                    //有一种情况，就是从后台切换到前台，当前会话有未读数字，会发起回执到server，这时候server又会推送一个同步信息到前台，需要避免重复减去未读数字，所以多增加一个判断，只是未读数字减少，才需要更新，因为同步的数字
                    ConversationListBinder.updateConvUnreadNum(convId, unreadNum);
                }
            }

            if(data.type === 'sync' && data.data.object === 'ocu_sync_signal'){
                ConversationListBinder.updateDisplayOrder();
            }

            if(data.type === 'push'){
                var token = Storage.getToken().access_token;
                var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                var base64DecodeChars = new Array(-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1);

                function base64decode(str){
                    var c1, c2, c3, c4;
                    var i, len, out;
                    len = str.length;
                    i = 0;
                    out = "";
                    while (i < len) {
                        /* c1 */
                        do {
                            c1 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
                        }
                        while (i < len && c1 == -1);
                        if (c1 == -1) 
                            break;
                        /* c2 */
                        do {
                            c2 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
                        }
                        while (i < len && c2 == -1);
                        if (c2 == -1) 
                            break;
                        out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));
                        /* c3 */
                        do {
                            c3 = str.charCodeAt(i++) & 0xff;
                            if (c3 == 61) 
                                return out;
                            c3 = base64DecodeChars[c3];
                        }
                        while (i < len && c3 == -1);
                        if (c3 == -1) 
                            break;
                        out += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));
                        /* c4 */
                        do {
                            c4 = str.charCodeAt(i++) & 0xff;
                            if (c4 == 61) 
                                return out;
                            c4 = base64DecodeChars[c4];
                        }
                        while (i < len && c4 == -1);
                        if (c4 == -1) 
                            break;
                        out += String.fromCharCode(((c3 & 0x03) << 6) | c4);
                    }
                    return out;
                }

                function utf8to16(str){
                    var out, i, len, c;
                    var char2, char3;
                    out = "";
                    len = str.length;
                    i = 0;
                    while (i < len) {
                        c = str.charCodeAt(i++);
                        switch (c >> 4) {
                            case 0:
                            case 1:
                            case 2:
                            case 3:
                            case 4:
                            case 5:
                            case 6:
                            case 7:
                                // 0xxxxxxx
                                out += str.charAt(i - 1);
                                break;
                            case 12:
                            case 13:
                                // 110x xxxx 10xx xxxx
                                char2 = str.charCodeAt(i++);
                                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                                break;
                            case 14:
                                // 1110 xxxx10xx xxxx10xx xxxx
                                char2 = str.charCodeAt(i++);
                                char3 = str.charCodeAt(i++);
                                out += String.fromCharCode(((c & 0x0F) << 12) | ((char2 & 0x3F) << 6) | ((char3 & 0x3F) << 0));
                                break;
                        }
                    }
                    return out;
                }


                var videoData = utf8to16(base64decode(data.data));

                // json string 转 json object

                //当正在视频时 不在提示
                //if($('.appsIframe').length > 0) return;

                var gui = require('nw.gui'); 
                var win = gui.Window.get();

                var obj = eval('(' + videoData + ')');

                var videoType = obj.type == 0 ? '语音聊天' : '视频聊天';

                var videoAudio = $("#voice-plugin").append('<audio src="mx_video_ring.mp3" loop="loop"  controls="auto" id="mx-video-ring" class="mx-video-ring" style="display:none;"></audio>');
                $('.mx-video-ring')[0].play();

                var localTimer = Date.parse(new Date()) / 1000;


                var i = localTimer - obj.roomID;
                var audioInterval = setInterval(function(){
                    i++
                    if(i == 60){
                        $('.mx-video-ring')[0].pause();
                        clearInterval(audioInterval);
                        $('.mx-video-ring').remove();
                        TipsPopBinder.hide();
                    }
                }, 1000);

                var URL = GLOBAL_SETTING.URL;
                var URI = '/api/v1/push/notifications';
                var url = URL+URI;

                var videoModel = function(obj){
                    $("#voice-plugin").removeClass('voice-plugin').addClass('video-plugin');
                    //打开视频后 PC端最大化
                    win.maximize();
                    //配置视频地址
                    var src = 'vendor/MXVideo/voice.html';
                    $("#voice-plugin").show();
                    //创建视频展现区域
                    $("#voice-plugin").append('<iframe id="appsIframe" class="appsIframe" src="'+ src +'"></iframe>');
                    var avatar_url = GLOBAL_SETTING.URL + obj.creater.avatar_url;
                    $("#voice-plugin .photo img").attr('src',avatar_url);
                    $(window.frames["appsIframe"]).load(function(){
                        var current_user = Cache.get('current_user');
                        var conv = Cache.get('conversation_'+obj.roomID);
                        var idocument = $('#appsIframe').prop('contentDocument');
                        var el = idocument.createElement('script');
                        el.setAttribute("type","text/javascript");
                        el.text = 'var token = "'+token+'";var message = '+JSON.stringify(obj)+';var url = "'+url+'";var ids = '+ obj.creater.id +';var currentUser = ' + JSON.stringify(current_user) +';var roomID = '+ obj.roomID +';var messageType = '+ obj.type +';var messageMode = '+ obj.mode +';var current_conv = '+ obj.conversationID +';window.onload = LogicInit();';
                        idocument.body.appendChild(el);
                    });
                }

                var voiceModel = function(obj){
                    $("#voice-plugin").removeClass('video-plugin').addClass('voice-plugin');
                    //配置语音地址
                    var src = 'vendor/MXVideo/voice.html';
                    $("#voice-plugin").show();
                    $("#voice-plugin").append('<iframe id="appsIframe" class="appsIframe" src="'+ src +'"></iframe>');
                    var avatar_url = GLOBAL_SETTING.URL + obj.creater.avatar_url;
                    $("#voice-plugin .photo img").attr('src',avatar_url);
                    $(window.frames["appsIframe"]).load(function(){
                        var current_user = Cache.get('current_user');
                        var conv = Cache.get('conversation_'+obj.roomID);
                        var idocument = $('#appsIframe').prop('contentDocument');
                        var el = idocument.createElement('script');
                        el.setAttribute("type","text/javascript");
                        el.text = 'var token = "'+token+'";var message = '+JSON.stringify(obj)+';var url = "'+url+'";var ids = '+ obj.creater.id +';var currentUser = ' + JSON.stringify(current_user) +';var roomID = '+ obj.roomID +';var messageType = '+ obj.type +';var messageMode = '+ obj.mode +';var current_conv = '+ obj.conversationID +';window.onload = LogicInit();';
                        idocument.body.appendChild(el);
                    });
                }
                //音视频互转
                if(obj.pushType == 1 && obj.type == 0){
                    //切换语音
                    if($('.mx-video-ring')[0]){
                        $('.mx-video-ring')[0].pause();
                        clearInterval(audioInterval);
                        $('.mx-video-ring').remove();
                    }
                    var idocument = $('#appsIframe').prop('contentDocument');
                    var el = idocument.createElement('script');
                    el.setAttribute("type","text/javascript");
                    el.text = 'var isPush = true;';
                    idocument.body.appendChild(el);
                    $('#appsIframe').prop('contentDocument').getElementById('change').click();
                    return;
                };

                //提示窗口
                TipsPopBinder.show({
                    body: '是否接听 '+ obj.creater.name + ' 的' + videoType +'邀请？',
                    showCancel: true,
                    showConfirm: true,
                    confirmTxt: '接听',
                    confirmed: function() {
                        // Cache.get('user_' + )
                        // $("#voice-plugin .video-title span").html(users);

                        //打开视频后 关闭来电声音 和 计时器
                        if($('.mx-video-ring')[0]){
                            $('.mx-video-ring')[0].pause();
                            clearInterval(audioInterval);
                            $('.mx-video-ring').remove();
                        }
                                                //音视频互转
                        if(obj.pushType == 1 && obj.type == 1){
                            //切换视频
                            // $('#appsIframe').remove();
                            // videoModel(obj);
                            var idocument = $('#appsIframe').prop('contentDocument');
                            var el = idocument.createElement('script');
                            el.setAttribute("type","text/javascript");
                            el.text = 'var isPush = true;';
                            idocument.body.appendChild(el);
                            $('#appsIframe').prop('contentDocument').getElementById('change').click();
                            return;
                        };
                        if(obj.type == 0){
                            voiceModel(obj);
                        }else if(obj.type == 1){
                            videoModel(obj);
                        }

                        $("#voice-plugin .video-title span").html(obj.creater.name);
                        var avatar_url = GLOBAL_SETTING.URL + obj.creater.avatar_url;
                        $("#voice-plugin .photo img").attr('src',avatar_url);
                    },
                    canceled:function(){
                        if($('.mx-video-ring')[0]){
                            $('.mx-video-ring')[0].pause();
                            clearInterval(audioInterval);
                            $('.mx-video-ring').remove();
                        }
                    }
                });
            }

            var currentConvId = ConversationBinder.getCurrentConvId();

            //消息撤回
            if(data.type === 'revoke_message'){
                ConversationListBinder.updateRevokeMessage(data,currentConvId);
            }
        };

        //订阅推送频道
        var subscribChannels = function(data) {
            if (!data.meta) return;
            var rt = data.meta.realtime;
            var globalChannel = rt.channel_id;
            var convChannel = globalChannel + '/messages';
            //var circleUnreadCount = data.items[0].following_feed_unseen_count;

            //更新工作圈未读数
            //$scope.unreadHandler(2, circleUnreadCount);

            //订阅全局未读数&未读数同步
            RealtimeServ.subscribe({
                channel_id: globalChannel,
                uri: rt.uri,
                type: 2,
                success: globalRTHandler,
                error: function(err) {
                    console.error('Subscribing error from global realtime.');
                }
            });

            //订阅新消息推送频道
            RealtimeServ.subscribe({
                channel_id: convChannel,
                uri: rt.uri,
                type: 0,
                success: function(data) {
                    console.info('=========== conversation.newMessage_messages(0).success', data,new Date());
                    if (!AppRootBinder.connected()) return;
                    var d = angular.copy(data);

                    var msg = d.items[0];
                    var networkId = Storage.getUser('networkId');
                    // var selfId = Storage.getUser('id');
                    console.info('d', d);
                    //如果推送的消息所在network不是当前network，不处理
                    if (msg.network_id != networkId) return;
                    // console.info('data.references[1].user_ids.ids', data.references[1].user_ids.ids);
                    // var userArr = [];
                    // $.each(data.references[1].user_ids.ids, function(index, val) {
                    //     var cacheUser =  Cache.get('user_' + val);
                    //     if(cacheUser){
                    //         userArr.push(val);
                    //     }else{
                    //         UsersServ(val)
                    //         .then(function(data){
                    //             Cache.put('user_' + val, data)
                    //             userArr.push(val);
                    //             console.info('data', data);
                    //         })
                    //     }
                    // });
                    // var userTimer = setInterval(function(){
                    //     console.info('userArr', userArr);
                    //     if(userArr.length == data.references[1].user_ids.ids.length){
                    //         //处理新消息
                    //         RealtimeMsgHandler(d);
                    //         clearInterval(userTimer)
                    //     }
                    // }, 500)
                    
                    
                    //处理新消息
                    RealtimeMsgHandler(d);
                    

                },
                error: function(err) {
                    console.error('Subscribing error from global realtime.');
                }
            });
        };

        /**
         * 处理全局未读数
         * @param type[String]: 类型，{'message': 对话; 'circle': 工作圈}
         * @param readedNum[Number]: 要处理的已读数量
         * @param ignore[Boolean]: 是否忽略本次处理(如果是当前激活的对话，收到新消息需要标记为忽略)
         */
        this.readed = function(type, readedNum, ignore) {
            if (typeof readedNum !== 'number') readedNum = 0;
            switch (type) {
                case 'message':
                    RootscopeApply($scope, message);
                    break;
                case 'circle':
                    RootscopeApply($scope, circle);
                    break;
            }
            //console.info('已读消息' + type, readedNum);
            function message() {
                /**
                 * 如果当前激活的对话有新消息，会触发全局未读消息数减1
                 * 但如果之后有收到全局未读消息数，则会遮盖数量，导致未读数与实际不符
                 * 所以标记忽略次数，在收到全局消息推送时判断是否有忽略数量，如果有就不更新数量，直到其值为0
                 */
                // if (ignore) {
                //     ignoreMsgNum += readedNum;
                //     return;
                // }
                
                var unreadMessage = $scope.unreadMessage - readedNum;

                //防止未读数为负数
                if (unreadMessage < 0) unreadMessage = 0;

                //设置任务栏图标未读数
                taskIconNum(unreadMessage);
                //更新数据库中的全局消息未读数
                CurUserDB.convsUnreadNum(unreadMessage);
                $scope.unreadMessage=unreadMessage;
            }

            function circle() {
                if ($scope.unreadCircle) {
                    $scope.unreadCircle = $scope.unreadCircle - readedNum;
                    //防止未读数为负数
                    if ($scope.unreadCircle < 0) $scope.unreadCircle = 0;
                } else {
                    //如果当前未读数已经是0，那就记录下来，等待下次推送时清除
                    $scope.untreatedCircle = readedNum;
                }
            }
        };

        //获取全局未读消息，并订阅全局实时推送
        $scope.checkGlobalUnread = function() {
            UnreadGlobal().then(function(data) {
                Cache.put('networks', data);
                subscribChannels(data);
            }, function(err) {
                console.error(err);
            });
        };

        //监听退出成功跳转
        $scope.$on('logout.success', function() {
            //清除用户Session数据
            ls.removeToken();
            ls.removeUser();

            //退出成功，调整窗口大小
            SetWinSize(0);
            $location.path('/login');
            //点击sidebar中跳转到通讯录，工作圈等页面，再点击退出，登录页尺寸变为300*400,；
            //若不设置此处，跳转的登陆页为835*570
            SetWinSize(0);

            //关闭当前数据库
            CurUserDB.closeDB();

            //清除对话列表缓存
            //Cache.put('list', null);

            //清空全部实时推送
            RealtimeServ.clear();
            //因为会话列表页面是单例，需要手动清除
            ConversationListBinder.destroy();
            //退出RTC连接
            RTC.quit();
        });

        //监听登陆成功跳转
        $scope.$on('login.success', function() {
            console.log(4787878788)
            //登录成功，调整窗口大小
            SidebarNavBinder.setMessageUnreadNum(0);
            SetWinSize(1);

            $location.path('/');
            $scope.checkGlobalUnread();

            //每隔一段时间检查服务器状态
            Ping();

            setTimeout(function() {
                SetWinSize(1);
            }, 50);
        });

        if (ls.getUser('networkId')) {
            //防止页面刷新时无法订阅全局实时消息
            $scope.checkGlobalUnread();
        }

        //每隔一段时间检查服务器状态
        Ping();

        //检查headers里是不是带token，如果没带自动补上
        DefaultHttpHeader.checkToken();

        var gui = require('nw.gui');
        // var nwWin;

        // if (global && global.window && global.window.nwDispatcher) {
        //     nwWin = global.window.nwDispatcher.requireNwGui().Window.get();
        // }


        //这是app标题
        var win = gui.Window.get();
        win.title = GLOBAL_SETTING.name_cn;
        win.on('blur', function() {
            AppRootBinder.winFocused(false);
            // RootscopeApply($scope, function() {
            //     $scope.windowFocused = false;
            // });
        });
        win.on('focus', function() {
             AppRootBinder.winFocused(true);
            // RootscopeApply($scope, function() {
            //     $scope.windowFocused = true;
            // });
            NewMsgFlashBinder.clearTimer();
        });
        //当窗口失焦时，标记，以便推动新消息Notification
        //当窗获得焦时，标记，以便取消新消息Notification
        // window.addEventListener('blur', function() {
        //   RootscopeApply($scope, function() {
        //     $scope.windowFocused = false;
        //   });
        // });
        // window.addEventListener('focus', function() {
        //   RootscopeApply($scope, function() {
        //     $scope.windowFocused = true;

        //   });
        //   NewMsgFlashBinder.clearTimer();
        // });
        //由于nwWin的blur和focus不稳定，会导致登陆页面乱闪，暂时注释掉
        /*if (nwWin) {
          // Desktop app
          nwWin.on("blur", function() {
            RootscopeApply($scope, function() {
              $scope.windowFocused = false;
            });
          });
          nwWin.on("focus", function() {
            RootscopeApply($scope, function() {
              $scope.windowFocused = true;
            });
            NewMsgFlashBinder.clearTimer();
          });
        } else {
          // Web app
          window.addEventListener("blur", function() {
            RootscopeApply($scope, function() {
              $scope.windowFocused = false;
            });
          });
          window.addEventListener("focus", function() {
            RootscopeApply($scope, function() {
              $scope.windowFocused = true;
            });
            NewMsgFlashBinder.clearTimer();
          });
        }*/
    }
])

//弹层提示(错误提示)
.controller('AppHead', ['$scope', 'GLOBAL_SETTING',
    function($scope, GLOBAL_SETTING) {
        $scope.appNameCn = GLOBAL_SETTING.name_cn;
    }
])

//弹层提示(错误提示)
.controller('PopMessageCtrl', ['$scope', '$injector', 'PopMessage', 'RootscopeApply',
    function($scope, $injector, PopMessage, RootscopeApply) {
        $scope.showPopMessage = false;
        $scope.ngPopInitClass = 'init';
        $scope.popType = 0; //类型{0: 错误提示; 1: 消息提示};

        //绑定错误处理服务
        $injector.invoke(PopMessage.bind, this, {
            $scope: $scope
        });

        /**
         * 显示滑动提示
         * @param options[Object]: 初始化的参数
         *          options.msg[String]: 提示信息
         *          options.type[String]: 提示类型{0: '错误提示'; 1: '消息提示'}
         *          options.time[Number]: 持续时间
         */
        this.showMessage = function(options) {
            var t = options.time || 2000;

            $scope.showPopMessage = true;
            $scope.popMessageContent = options.msg;
            $scope.popType = options.type;

            //三秒后
            setTimeout(function() {
                RootscopeApply($scope, function() {
                    $scope.showPopMessage = false;
                });
            }, t);
        };
    }
])