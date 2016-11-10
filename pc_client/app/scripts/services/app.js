'use strict';
angular.module('mx.services', [
    'mx.services.security',
    'mx.services.storage',
    'mx.services.cache',
    'mx.services.notifications',
    'mx.services.setting',
    'mx.services.eggs'
])

//整个App的服务绑定，需要控制App全局作用域的逻辑可以通过这里中转
.factory('AppRootBinder', ['$location', '$rootScope', 'RootscopeApply','Utils',
    function($location, $rootScope, RootscopeApply,Utils) {
        var o = {};
        var that, scope;

        o.bind = function($scope) {
            that = this;
            scope = $scope;
        };

        /**
         * 是否显示重新连接按钮
         * @param type[String]: 操作类型 {'show': 显示, 'hide': 隐藏}
         */
        o.reConnectBtn = function(type) {
            if (type === 'show' && $location.path() !== '/login') {
                scope.showReconnectBtn = true;
            } else if (type === 'hide') {
                scope.showReconnectBtn = false;
            }
        };

        /**
         * 设置或获取当前网络连接状态
         * [@param] stateCode[Number]: 网络状态码{false: 未连接, true: 已连接}
         */
        o.connected = function(stateCode) {
            if (typeof stateCode !== 'boolean') return scope.netState;
            scope.netState = stateCode;
        };
        /**
         * set/get客户端的focus状态
         */
        o.winFocused = function(focused,forceFocus) {
            if (typeof focused !== 'boolean'){
                //窗口在敏信界面，并且处于激活状态
               return Utils.isChatShown()&scope.windowFocused; 
            } 
            if(!Utils.isChatShown()&&!forceFocus){
                //IM如果不是处于显示状态，就需要忽略下面的处理
                //如果是主动点击切换到聊天界面，就需要继续下面的逻辑处理，通过forceFocus进行判断
                return;
            }
            RootscopeApply(scope, function() {
                scope.windowFocused = focused;
                $rootScope.$broadcast('app.focused', focused);
            });
        }

        /**
         * 获取全局未读消息，并订阅全局实时推送
         */
        o.checkGlobalUnread = function(){
            scope.checkGlobalUnread();
        }

        return o;
    }
])

//错误处理
.factory('PopMessage', ['loginServ', '$route', 'RootscopeApply',
        function(loginServ, $route, RootscopeApply) {
            var o = {};
            var that, scope;

            //注释时间: 2015-06-30
            /*var refreshToken = function() {
                loginServ.refreshToken()
                    .then(function(data) {
                        $route.reload();
                    }, function(err) {
                        //TODO 删除用户信息本地存储，跳转到登陆页
                        console.error(err);
                    });
            };*/

            var noPermission = function(data) {
                var msg = data.errors.message;

                that.showMessage(msg);
            };

            o.bind = function($scope) {
                that = this;
                scope = $scope;
            };

            o.err = function(err) {
                var status = err.status || 0;
                var msg = '请求失败，请稍后重试.';
                var opt = {
                    msg: msg,
                    type: 0
                };

                switch (status) {
                    case 401:
                        $rootScope.$broadcast('logout.success');
                        break;
                    case 403:
                        opt.msg = err.message;
                        o.tip(opt);
                        break;
                    case 502:
                        o.tip(opt);
                        break;
                    case 500:
                        o.tip(opt);
                        break;
                    default:
                        opt.msg = err.message || msg;
                        o.tip(opt);
                }
            };

            /**
             * 显示滑动提示
             * @param options[Object]: 初始化的参数
             *          options.msg[String]: 提示信息
             *          options.type[String]: 提示类型{0: '错误提示'; 1: '消息提示'}
             *          options.time[Number]: 持续时间
             */
            o.tip = function(options) {
                RootscopeApply(scope, function() {
                    that.showMessage(options);
                });
            };

            return o;
        }
    ])
//初始获取未读消息和全局未读消息实时推送接口
.factory('UnreadGlobal', ['$http', 'GLOBAL_SETTING', '$q',
    function($http, GLOBAL_SETTING, $q) {
        return function() {
            var url = GLOBAL_SETTING.URL + '/api/v1/networks/current?include_group_counts=true&exclude_own_messages_from_unseen=true';
            var delay = $q.defer();

            $http({
                url: url,
                method: 'GET',
            }).success(function(data) {
                delay.resolve(data);
            }).error(function(data, status, headers, config) {
                delay.reject(data);
            });

            return delay.promise;
        };
    }
])

//实时推送
.factory('RealtimeServ', ['GLOBAL_SETTING', 'Storage', '$q', '$http', '$rootScope', 'AppRootBinder', "TipsPopBinder", "ConversationListLoaderServ","CheckToken", function(GLOBAL_SETTING, Storage, $q, $http, $rootScope, AppRootBinder, TipsPopBinder, ConversationListLoaderServ,CheckToken) {
    var service = {};
    var client = {};
    var subscriptions = [];
    var lastSuccessTime = new Date().getTime(); //最后一次握手成功的时间
    var heartbeatInterval = 30 * 1000; //服务器设置的心跳时间是25秒，如果超过30秒，说明中间网络异常过。
    var onlineEventTimes = 0; //标记是否成功连接过，第一次成功连接不需要
    var disconnecting = false; //标记是否正在主动断开连接
    var fayeConnecting = false; //标记faye链接状态
    /*
    *新的断网重练检测机制

    */
     window.onLineHandler = function(){
        console.info('YOU ARE ONLINE');
        onlineEventTimes++;
        AppRootBinder.connected(true);
        //页面首次加载的时候也会触发，这时候就不需要重新初始化了
        if(!CheckToken()||onlineEventTimes==1) return;
        
        var fayeInterval = window.setInterval(function(){
            if(!fayeConnecting) return;
            console.log("before reconnect");
            reconnect();
            clearInterval(fayeInterval)
        },500);
    };
    window.offLineHandler = function(){
        console.info('YOU ARE OFFLINE');

        console.info('掉线时的msgId:', Storage.getLatestMessageId());

        var offLineMsgId = Storage.getLatestMessageId();
        var status = 'offline';
        var offline = Storage.getLatestMessageId(status);
        if(!offline || offline == 0){
            Storage.setLatestMessageId(offLineMsgId, status);
        }

        AppRootBinder.connected(false);


         for (var uri in client) {
             if(client[uri]){
                client[uri].disconnect();
                client[uri]._dispatcher&&client[uri]._dispatcher.close();
                client[uri] = null;
             }
        }


        if (!disconnecting) {
            //如果不是主动断开，或者页面刷新导致的
            TipsPopBinder.show({
                body: '网络连接异常，请检查您的网络.',
                showConfirm: true
            });
        }

    };
    var getPingUrl = function() {
        var networkId = Storage.getUser('networkId');
        return GLOBAL_SETTING.URL + '/api/v1/ping?network_id=' + networkId;
    };
                     // Faye.logger = function(msg) { if (window.console) console.log(msg) }

    /*
     * 创建faye client，每个client只创建一次
     */
    var newClient = function(uri) {
        if (!Faye) {
            console.error('Faye 还没有加载出来！');
            return false;
        }

        console.log('=================== 【注意】:创建新的socket client了哦！ =======================');
        client[uri] = new Faye.Client(GLOBAL_SETTING.URL + uri, {
            timeout: 60,
            retry: 5
        });
        client[uri].addExtension({
            incoming: function(message, callback) {
            lastSuccessTime = new Date().getTime();
            // console.log(client[uri].created_at);
                AppRootBinder.connected(true);
                callback(message);
            },
            outgoing: function(message, callback) {
                if (!message["data"]) {
                    return callback(message)
                }
                message.ext = {
                    token: 'ba571fdda8194f18eddd4ded6c2fe1d4'
                };
                callback(message);
            }
        });

        client[uri].on('transport:down', function() {
            console.info('faye transport down!',client[uri]);
            window.onlinejs.logic.checkConnectionWithRequest();
            fayeConnecting = false;
            // $http({
            //     url: getPingUrl(),
            //     method: 'GET'
            // }).error(function(e) {
            // }).success(function() {
            //     //马上主动发送消息让它尝试重练,依靠faye自己的检测速度比较慢
            //     window.setTimeout(function(){
            //    client[uri].publish('/ping', "ping");
            //     },3000)
            // })


        });

        client[uri].on('transport:up', function() {
            fayeConnecting = true;
            console.info('faye transport up!',client[uri]._dispatcher);
        });
        console.log("Created faye client time",client[uri]._dispatcher);
        //Faye.logger = function(msg) { console.log(msg) };

        return client[uri];
    };

    /*
     * 获取指定uri的faye client
     */
    var getClient = function(uri) {
        return client[uri] || newClient(uri);
    };

    /*
     * 检查推送监控状态，返回布尔值
     */
    var check = function(params) {
        var type = params.type;
        var chId = params.channel_id;

        //如果没有此类推送，返回true
        if (!subscriptions[type]) return true;

        //如果此类推送的频道已存在，返回false
        if (subscriptions[type].channelId === chId) {
            //console.log('subscriptions[type].channelId === chId');
            //console.log(params);
            return false;
        }
    };
    /*强制杀掉现在的推送服务，重新连接,该方法5秒内不会被重复调用*/
    var reconnect = _.throttle(function() {
        var offLineMsgId = Storage.getLatestMessageId('offline');
        Storage.setLatestMessageId(offLineMsgId);
        console.info('offLineMsgId', offLineMsgId);
          //取消订阅
        subscriptions.forEach(function(ele, i) {
            if(!ele) return;
            ele.cancel();
        });
        //清除以前的对象
        for (var uri in client) {
            if(client[uri]){
                client[uri].disconnect();
                client[uri]._dispatcher&&client[uri]._dispatcher.close();
                client[uri] = null;   
            }
        }

        // 先从服务器获取新消息
        TipsPopBinder.hide();
        ConversationListLoaderServ.load().then(function(data) {
            console.info('offLineMsgId data', data);
            if (data.newConvs.length) {
                $rootScope.$broadcast('conversations.refresh', data.newConvs);
            }
                //重新初始化对象
                for (var uri in client) {
                    client[uri] = newClient(uri);
                }
                //重新订阅
                subscriptions.forEach(function(ele, i) {
                    if(!ele) return;
                    var params = ele.originParams;
                    ele = null;
                    delete subscriptions[i];
                    service.subscribe(params);
                });

          
        });

       
    }, 5000);
    /*根据心跳记录时间判断是否需要自动重新连接服务器*/
    service.autoReconnect = function() {
            if (new Date().getTime() - lastSuccessTime > heartbeatInterval) {
                //心跳时间不正常说明需要自动重新连接
                console.log("before reconnect from auto reconnect");
                reconnect();
            }
        }
        /*
         * 清除监听实时推送
         * @param type[Number]: 订阅类型码(0:对话列表实时推送; 1:对话详情内容推送; 2:全局实时推送)
         */
    service.clear = function(type) {
        if (!type) {
            subscriptions.forEach(function(ele, i) {
                ele.cancel();
                ele = null;
                delete subscriptions[i];
            });
            return;
        }

        if (subscriptions[type]) {
            subscriptions[type].cancel();
            subscriptions[type] = null;
            delete subscriptions[type];
        }
    };

    /*
     * 订阅实时推送
     * @params .channel_id[String]: 订阅频道uri
     * @params .uri[String]: socket uri
     * @params .type[Number]: 订阅类型码(0:对话列表实时推送;
                                         
                                         2:全局实时推送;
                                         msgId: doc类型消息的id(doc数据需要订阅);
                                         )
     * @params .success[Function]: 成功回调
     * @params .error[Function]: 失败回调
     */
    service.subscribe = function(params) {
        var type = params.type;
        var channelId = params.channel_id;
        var url = GLOBAL_SETTING.URL + params.channel_id;
        var client = getClient(params.uri);
        var eventType = 'conversation.newMessage_' + type;
        var successCallback = params.success;
        var errorCallback = params.error;

        //先检查推送是否已存在
        if (!check(params)) return;

        // console.info('===== subscribing ' + channelId + ' =====');

        //订阅推送，并保存
        subscriptions[type] = client.subscribe(channelId, function(msg) {
            //console.log('===========  1111  conversation.newMessage_' + type + '.success', msg);
            successCallback(msg);
        }, function(err) {
            errorCallback(err);
        });
        subscriptions[type].channelId = channelId;
        subscriptions[type].originParams = params;
        //subscriptions[type].successCallback = successCallback;
    };

    service.publish = function(params) {
        getClient('/comet').publish('/u/test2bingo123', {
            test: 'test111111111'
        });
    };

    service.disconnect = function() {
            disconnecting = true;
        }
        /*
         * 重新初始化
         */
    service.reconnect = reconnect;
    return service;
}])

//ping,随时了解服务器状况
.factory('Ping', ['GLOBAL_SETTING', 'Storage', '$http', '$q', '$interval', 'RealtimeServ', function(GLOBAL_SETTING, Storage, $http, $q, $interval, RealtimeServ) {
    var intervalTime = 1000 * 60 * 4; //每次ping的时间间隔为4分钟，服务器在线状态检测是5分钟
    var pingInterval; //ping计时器
    //重置ping状态
    var resetPing = function() {
        $interval.cancel(pingInterval);
        pingInterval = null;
    };

    return function() {
        var delay = $q.defer();
        var getUrl = function() {
            var networkId = Storage.getUser('networkId');

            if (typeof networkId === 'number') {
                return GLOBAL_SETTING.URL + '/api/v1/ping?network_id=' + networkId;
            } else {
                return false;
            }
        };



        var ping = function() {
            var url = getUrl();

            //如果url没获取到，可能是因为刚刚打开客户端就没有网络导致获取不到network_id
            if (!url) {
                delay.reject();
                return;
            }

            $http({
                url: url,
                method: 'GET',
            }).success(function() {
                //每次服务器连接成功，都在此检测一下推送服务器是否正常
                RealtimeServ.autoReconnect();
            })
        };

        //如果计时器已存在，清除计时器
        if (pingInterval) resetPing();
        ping();
        pingInterval = $interval(ping, intervalTime);
        return delay.promise;
    };
}])

/**
 * 检查客户端版本
 * @param type[Number]: 升级提示类型{0: 弹层提示; 1: 设置按钮红点提示}
 */
.factory('CheckAppVersion', ['GLOBAL_SETTING', '$q', '$http', 'TipsPopBinder', '$rootScope', 'Storage',
    function(GLOBAL_SETTING, $q, $http, TipsPopBinder, $rootScope, Storage) {
        //用来检查版本的定时器
        var checkTimer;

        return function(type) {
            var delay = $q.defer();
            var config = GLOBAL_SETTING;
            var version = config.version_code;
            var appId = config.client_id;
            var ssoToken = Storage.getToken('mx_sso_token');
            var uri = '/api/v1/users/current/networks?include_upgrade=true&client_id=' + appId + '&client_version_code=' + version;
            var url = config.URL + uri;

            if (type === 0 && typeof ssoToken === 'string') {
                url = url + '&mx_sso_token=' + ssoToken;
            }

            //需要更新操作：登录后弹出对话框，首页面设置红点，广播更新
            var updateNoti = function(info) {
                console.info('登录后弹出对话框，首页面设置红点，广播更新');
                if (type === 0) {
                    //弹出升级提示
                    TipsPopBinder.show({
                        title: '新版本升级提示',
                        body: info.description,
                        showCancel: !info.mandatory_upgrade,
                        confirmTxt: '前往下载',
                        cancelTxt: '下次再说',
                        confirmed: function() {
                            var gui = require('nw.gui');
                            var win = gui.Window.get();

                            //用系统默认浏览器打开下载地址
                            gui.Shell.openExternal(info.upgrade_url);
                            win.close();
                        },
                        canceled: function() {
                            delay.resolve();
                        }
                    });
                } else {
                    //增加设置按钮红点提示
                    $rootScope.newVersion = true;
                }
            };
            //检查是否更新，是则执行updateNoti(),否则继续执行其他操作
            var check = function(info) {
                // console.info('upgrade:', info);
                if (!info) delay.resolve();
                var remoteVersion = info.version_code;
                if (info.version_code > version) {
                    updateNoti(info);
                    //广播更新版本信息，scripts/directives/setting.js接收广播
                    $rootScope.$broadcast('updateVersion', info);
                } else {
                    delay.resolve();
                }
            };

            //获得服务器端数据
            var getData = function() {
                $http({
                    url: url,
                    method: 'GET'
                }).success(function(data) {
                    //将sidebar配置存入Storage
                    Storage.validModules(data.valid_modules);
                    Storage.validNewModules(data.licensed_modules);
                    check(data.upgrade_info);
                }).error(function(err) {
                    console.error(err);
                    delay.resolve();
                });
            };
            getData();


            //每隔1小时更新一次数据
            function versionTimer() {
                checkTimer = setTimeout(function() {
                    type = 1;
                    getData();
                    versionTimer();
                }, 1000 * 60 * 60);
            }
            //如果定时器已存在，先清掉定时器
            if (checkTimer) {
                clearTimeout(checkTimer);
                checkTimer = null;
            }
            versionTimer();

            return delay.promise;
        }
    }
])

//剪贴板图片粘贴
.factory('UploadImagePreviewBinder', ['RootscopeApply', '$q', 'FileUploaderBinder', 'PopMessage',
    function(RootscopeApply, $q, FileUploaderBinder, PopMessage) {
        var o = {};
        var that, scope;
        //获取图片base64数据格式
        var getImgBase64 = function(item) {
            var blob = item.getAsFile();
            var reader = new FileReader();
            var delay = $q.defer();
            var regExp = new RegExp('^data:(.+)');

            reader.onload = function(event) {
                var r = event.target.result;

                //验证数据是否有效
                if (regExp.test(r)) {
                    delay.resolve(r);
                } else {
                    delay.reject(r);
                }
            };
            reader.readAsDataURL(blob);

            return delay.promise;
        };

        //获取图片的blob url
        var getBlobURL = function(item) {
            console.log('item', item)
            var blob = item.getAsFile();
            window.URL = window.URL || window.webkitURL;
            var blobUrl = window.URL.createObjectURL(blob);

            return blobUrl;
        };

        //获取文件名
        var getName = function(item) {
            var name = item.name || '';

            //如果没有文件名，生成随机文件名
            if (!name) {
                name = 'clipboard_' + new Date().getTime() + '.' + item.type.split('/')[1];
            }

            return name;
        };

        //生成Blob格式的文件
        var genBinaryFile = function() {
            var f = scope.file;
            var data_64 = f.base64.split(',')[1];
            var data_binary = atob(data_64);
            var arr = [];
            var file;

            for (var i = 0; i < data_binary.length; i++) {
                arr.push(data_binary.charCodeAt(i));
            }

            file = new Blob([new Uint8Array(arr)], {
                type: f.type
            });

            file.name = f.name;

            return file;
        };

        o.bind = function($scope) {
            that = this;
            scope = $scope;
        };

        //显示剪贴板获取的图片
        o.show = function(item) {
            var file = {};

            file.type = item.type;
            file.name = getName(item);
            getImgBase64(item)
                .then(function(imgBase64) {
                    file.base64 = imgBase64;
                    console.log('file.base64',file.base64);
                    RootscopeApply(scope, function() {
                        that.show(file);
                    });
                });
        };
        //显示剪贴板获取的图片(只显示图片为base64格式的)
        o.showBase64Img = function(base64Data) {
            if(!base64Data) return;
            
            if($('.input-box').hasClass('ng-hide') === true) 
            {
                PopMessage.tip({
                    msg: '该会话无法使用截屏功能',
                    type: 0
                });
                return;
            }
            var file = {};

            file.type = "images/png";
            file.name = getName(file);

            file.base64 = "data:image/png;base64," + base64Data;

            RootscopeApply(scope, function() {
                that.show(file);
            });
        }
        //发送图片
        o.submit = function() {
            var file = genBinaryFile();

            file.upload_type = 'clipboard';
            //上传文件
            FileUploaderBinder.upload(file);
        };

        return o;
    }
])

//绑定提示组件
.factory('TipsPopBinder', ['RootscopeApply', function(RootscopeApply) {
    var o = {};
    var that, scope;

    o.bind = function($scope) {
        that = this;
        scope = $scope;
    };

    /**
     * 显示提示弹窗
     * @param msg[Object]: 初始化弹窗的参数
     *          msg.body[String]: 提示信息
     *          msg.title[String]: 提示标题
     *          msg.showCancel[Boolean]: 是否显示"取消"按钮
     *          msg.showConfirm[Boolean]: 是否显示"确定"按钮
     *          msg.confirmTxt[String]: "确定"按钮显示的文字
     *          msg.cancelTxt[String]: "取消"按钮显示的文字
     *          msg.confirmed[Function]: 点击"确定"回调函数
     *          msg.canceled[Function]: 点击"取消"回调函数
     */
    o.show = function(options) {
        RootscopeApply(scope, function() {
            that.show(options);
        });

        $.magnificPopup.open({
            items: {
                src: '#tipsPop',
                type: 'inline'
            },
            verticalFit: true,
            modal: true,
            callbacks: {
                close: function() {}
            }
        });

        return $.magnificPopup;
    };

    o.hide = function() {
        $.magnificPopup.close();
    };

    return o;
}])

/**
 * 设置默认http请求的header
 */
.factory('DefaultHttpHeader', ['$http', 'Storage',
    function($http, Storage) {
        var o = {};

        o.setNetworkId = function(nId) {
            //console.info('设置了默认http请求的Headers(networkId)', nId);
            $http.defaults.headers.common['NETWORK_ID'] = nId;
        };

        o.setToken = function(token) {
            //console.info('设置了默认http请求的Headers(token)', token);
            $http.defaults.headers.common['AUTHORIZATION'] = 'bearer ' + token;
        };

        o.setContentType = function(type) {
            //console.info('设置了默认http请求的Headers(type)', type);
            $http.defaults.headers.post['Content-Type'] = type;
        };

        o.clearAll = function() {
            $http.defaults.headers.common['NETWORK_ID'] = '';
            $http.defaults.headers.common['AUTHORIZATION'] = '';
        };

        //检查http headers中是否已设置token和network_id
        //如果不存在则补上
        o.checkToken = function() {
            var token = Storage.getToken();
            var netId = Storage.getUser('networkId');

            if ($http.defaults.headers.common['AUTHORIZATION'] || !token) return;

            o.setToken(token.access_token);
            o.setNetworkId(netId);
        };

        return o;
    }
])

//用于scope需要apply的逻辑
.factory('RootscopeApply', ['$rootScope', function($rootScope) {
    return function($scope, fn) {
        if (!$rootScope.$$phase) {
            $scope.$apply(fn);
        } else {
            fn();
        }
    };
}])

/**
 * 设置窗口大小
 * @param type[Number]: 窗口类型(0:登录页面; 1:登录后主页面)
 */
.factory('SetWinSize', [function() {
    return function(type) {
        var gui = require('nw.gui');
        var win = gui.Window.get();
        var screen = win.window.screen;
        var screenWidth = screen.availWidth;
        var screenHeight = screen.availHeight;
        var width, height;
        var checkWinType = function(type) {
            if (type === 0) {
                width = 300;
                height = 400;
            } else {
                width = 960;
                height = 600;
            }

            win.width = width;
            win.height = height;
            win.setMinimumSize(width, height);
            //这里设置为true可设置窗口大小
            if (type === 0) {
                win.setResizable(false);
            } else {
                win.setResizable(true);
            }
            win.x = (screenWidth - width) / 2;
            win.y = (screenHeight - height) / 2;
        };
        checkWinType(type);
    };
}])

/**
 * 保存文件input绑定器
 */
.factory('FileSaverBinder', [function() {
    var o = {};
    var that, scope;

    o.bind = function($scope) {
        that = this;
        scope = $scope;
    };

    o.getFileDirectory = function(fileName) {
        return scope.saveFile(fileName);
    };

    return o;
}])

/**
 * 获取当前时间
 */
.factory('NowFormatDate', [function() {
    var o = {};
    o.getNowFormatDate = function(){
        return  global.moment(new Date()).format();
    }
    return o;
}])

/**
 * 处理下载的逻辑
 */
.factory('FileDownload',['Storage', 'CurUserDB', 'NowFormatDate', 'PopMessage','Cache', function(Storage, CurUserDB, NowFormatDate, PopMessage, Cache){
    var o = {};
    
    o.download = function(fileUrl, filePath, fileName, ele, callback){
        var os   = require('os');
        var path = require('path');
        var Downloader = require('mt-files-downloader');
        var t = Storage.getToken().access_token;
        var fs = require( 'fs' );



        var timestamp = (new Date()).valueOf(); 
        var tempPath = os.tmpdir()+'/';

        var folder_exists = fs.existsSync(tempPath+'Minxing');
        if(folder_exists == false){
            fs.mkdirSync(tempPath+'Minxing');
        }
        folder_exists = fs.existsSync(tempPath+'Minxing/tmp');
        if(folder_exists == false){
            fs.mkdirSync(tempPath+'Minxing/tmp');
        }
        folder_exists = fs.existsSync(tempPath+'Minxing/app_center');
        if(folder_exists == false){
            fs.mkdirSync(tempPath+'Minxing/app_center');
        }
        tempPath = tempPath + 'Minxing/tmp/';
        var tempFileName = 'temp_'+timestamp+'_'+fileName;
        var messageId= ele ? parseInt(ele.closest('.item').data("id")) : '';
        //防止一些很奇怪的图片文件名影响下载，所以图片均重命名
        var rag = (/\.JPEG|\.jpeg|\.JPG|\.jpg|\.GIF|\.gif|\.BMP|\.bmp|\.PNG|\.png/i);
        if(rag.test(fileName)){
            var fileName = "." + fileName.replace(/.+\./, "");
            fileName = timestamp+fileName;
            tempFileName = 'temp_'+fileName;
        }

        //为了防止切换聊天窗口

        // Create new downloader
        var downloader = new Downloader();

        var fileSavePath = path.join(tempPath, tempFileName);
        console.log('File will be downloaded from '+ fileUrl +' to '+ fileSavePath);

        // Start download
        var dl = downloader.download(fileUrl, fileSavePath).start();


        dl.setOptions=function(options){ 
            if(!options || options == {}) {
                return this.options = {};
            }
            // The "options" object will be directly passed to mt-downloader, so we need to conform to his format

            //To set the total number of download threads
            this.options.count = options.threadsCount || options.count || 2;


            //HTTP method
            this.options.method = options.method || 'GET';

            //If no data is received the download times out. It is measured in seconds.
            this.options.timeout = options.timeout/1000 || 5;

            //Control the part of file that needs to be downloaded.
            this.options.range = options.range || '0-100';
            this.options.headers = options.headers;
            this.options.msgId = options.msgId;
            this.options.filePath = options.filePath;
            this.options.fileName = options.fileName;
            this.options.tempFileName = options.tempFileName;
            this.options.tempPath = options.tempPath;
            return this;
        } 


        dl.setOptions({
            threadsCount: 5, // Default: 2, Set the total number of download threads
            method: 'GET',   // Default: GET, HTTP method
            timeout: 5000,   // Default: 5000, If no data is received, the download times out (milliseconds)
            range: '0-100',  // Default: 0-100, Control the part of file that needs to be downloaded.
            headers:{'AUTHORIZATION':'bearer ' + t,'USER_AGENT':'MinxingMessenger pc_client'},
            msgId:messageId,
            filePath:filePath,
            fileName:fileName,
            tempFileName:tempFileName,
            tempPath:tempPath
        });
        o.printStats(dl, NaN, messageId, callback);
        o.handleEvents(dl, NaN, callback);
        
    }

    o.printStats = function(dl, num, messageId, callback){
        num = num || 1;
        

        var timer = setInterval(function() {
            var str = $(".main-wrap .item[data-id='"+ messageId +"']");
            if(dl.status == 0) {
                console.log('Download '+ num +' not started.');
            } else if(dl.status == 1) {
                str.find('.actions .download').hide();
                str.find('.progress').show();
                var stats = dl.getStats();
                //console.log('Download '+ num +' is downloading:');
                //console.log('Download progress: '+ stats.total.completed +' %');
                str.find('.download').hide();
                str.find('.actions .progress').width(stats.total.completed+'%');
                str.find('.actions .progress i').html(parseInt(stats.total.completed)+'%');
                str.find('.message-img .progress i').html('已下载'+parseInt(stats.total.completed)+'%');
                str.find('.message-video .progress i').html('已下载'+parseInt(stats.total.completed)+'%');
                if(callback){
                    callback(parseInt(stats.total.completed));
                }
                
            } else if(dl.status == 2) {
                console.log('Download '+ num +' error... retrying');
            } else if(dl.status == 3) {

                console.log('Download '+ num +' completed !');
                if(callback){
                    callback('completed');
                }
            } else if(dl.status == -1) {
                console.log('Download '+ num +' error : '+ dl.error);
            } else if(dl.status == -2) { 
                console.log('Download '+ num +' stopped.');
            } else if(dl.status == -3) {
                console.log('Download '+ num +' destroyed.');
            }

            if(dl.status === -1 || dl.status === 3 || dl.status === -3) {
                clearInterval(timer);
                timer = null;
            }
        }, 500);
    }

    o.handleEvents = function(dl, num, callback){
        num = num || 1;
        dl.on('start', function(e, msgId) {
            console.log('EVENT - Download '+ num +' started !');
            var str = $(".main-wrap .item[data-id='"+ e.options.msgId +"']");
            str.find('.download').hide();
        });

        dl.on('error', function(e, msgId) {
            var str = $(".main-wrap .item[data-id='"+ e.options.msgId +"']");
            str.find('.download').show();
            str.find('.actions .progress').width('0%');
            str.find('.actions .progress i').html('');
            str.find('.message-img .progress i').html('');
            str.find('.message-video .progress i').html('');
            PopMessage.err({
                message: '下载失败，请稍后重试！'
            });

            console.log('EVENT - Download '+ num +' error !');
            console.log(dl.error);
        });

        dl.on('end', function(e, msgId) {
            console.log('EVENT - Download '+ num +' finished !');

            var fs = require('fs');
            var fsExtra = require('fs-extra');
            var unzip = require('unzip');

            var msgId = e.options.msgId;
            var filePath = e.options.filePath;  
            var fileName = e.options.fileName; 
            var tempFileName = e.options.tempFileName;
            var tempPath = e.options.tempPath;

            var ragPath = (/app_center/i);
            var ragRar = (/\.zip|\.ZIP/i);
            if(ragPath.test(filePath) && ragRar.test(fileName)){
                //满足判断条件则说明，这个离下载的是应用中心的文件。需要解压缩
                
                var str = fileName.replace('.zip', '');
                fs.createReadStream(tempPath+tempFileName).pipe(unzip.Extract({ path: filePath+str }));

            }else{
                var readStream = fs.createReadStream(tempPath+tempFileName);
                var writeStream = fs.createWriteStream(filePath+fileName);
                readStream.pipe(writeStream);
            }

            if(callback){
                callback(100);
            }
              
            var str = $(".main-wrap .item[data-id='"+ msgId +"']");
            str.find('.progress').width('100%');
            str.find('.actions .progress i').html('已经下载完成！');
            setTimeout(function(){
                str.find('.progress').hide();
                str.find('.download').hide();
                str.find('.convDownload').hide(); 
                str.find('.open-file').attr('data-href',filePath+fileName).removeClass('ng-hide');
                str.find('.open-dir').attr('data-href',filePath+fileName).removeClass('ng-hide');
                str.find('.open-file-coll').attr('data-href',filePath+fileName).removeClass('ng-hide');
                str.find('.open-dir-coll').attr('data-href',filePath+fileName).removeClass('ng-hide');
            }, 1000);
            
            if (!msgId) return;
            //CurUserDB.saveDownloadFile
            
            CurUserDB.getMessage(msgId)
            .then(function(msgData){
                var sender_name = Cache.get('user_'+msgData.sender_id).name;
                var mtype = msgData.message_type;
                var catelog = mtype;
                var msgData = msgData;
                if(mtype == 'image'){
                    catelog = 'images';
                }else if(mtype == 'video'){
                    catelog = 'videos';
                }else if(mtype == 'doc' || mtype == 'pdf' || mtype=='txt'){
                    catelog = 'documents';
                }

                var fileData = {
                    id: msgData.file_id,
                    name: fileName,
                    url: msgData.download_url,
                    path: filePath,
                    file_type: msgData.message_type,
                    size: msgData.size,
                    created_at: NowFormatDate.getNowFormatDate(),
                    sender_id : msgData.sender_id,
                    sender_name : sender_name,
                    catalog : catelog,
                    message_id: msgData.id,
                    download_url : msgData.download_url,
                    updated_at : NowFormatDate.getNowFormatDate(),
                    thumbnail_url: msgData.thumbnail_url,
                    order_by: (new Date()).valueOf(),
                    version: 1
                };
                msgData.local_path = filePath+fileName;
                CurUserDB.updateMsg(msgId, msgData);
                return CurUserDB.saveDownloadFile(fileData);
            });

        });

        dl.on('retry', function() {
            console.log('EVENT - Download '+ num +' error, retrying...');
        });

        dl.on('stopped', function() {
            console.log('EVENT - Download '+ num +' stopped...');
        });

        dl.on('destroyed', function() {
            console.log('EVENT - Download '+ num +' destroyed...');
        });
    }
    return o;
}])

/**
 * 从右滑框
 * @param params[Object]
 *              .id: iframe id
 *              .url: 插入的地址
 *              .isShowTitle[bool]: 是否显示title 
 *              .titleName[string] : 标题名称
 */
.factory('SlideWindow', [function() {
    var o = {};
    var ele = $("#slideWindow");

    o.show = function(params){        //显示
        if(ele.find('iframe').length > 0){
            ele.find('iframe').remove();
            ele.css('right',"-380px");
        }
        ele.show();
        if(params.isShowTitle == false){
            $("#slideWindow .title").hide();
        }else{
            $("#slideWindow .title span").html(params.titleName);
        }
        //插入iframe
        ele.find('.slide-iframe').append('<iframe id="'+ params.id +'" src="'+ params.url+ '" width="100%" height="100%" frameborder=no></iframe>');
            
        function UrlRegEx(url){      
            var re = /(\w+):\/\/([^\:|\/]+)(\:\d*)?(.*\/)([^#|\?|\n]+)?(#.*)?(\?.*)?/i;   
            var arr = url.match(re);   
            return arr;   
        }
        $(window.frames[params.id]).load(function(){
          var idocument = $('#'+params.id).prop('contentDocument');

          var head = UrlRegEx(window.location.href)[1];
          var el = idocument.createElement('script');
          el.setAttribute("type","text/javascript");
          el.setAttribute("src",head+'://'+ window.location.host+"/plugins/mx_plugins/mx_plugins_engine.js");
          idocument.body.appendChild(el);
        });

        //写延时是因为执行动画的过程中 插入iframe 滑动会有卡顿现象，后续使用css3座滑动效果优化
        setTimeout(function(){
            ele.animate({right: 0}, 300);
        }, 300);
        
        //绑定关闭按钮
        ele.find('.close').on('click',function(){
            o.hide();
        });
    }
    o.hide = function(){        //隐藏
        ele.animate({right: '-380px'}, 300,function(){
            ele.find('iframe').remove();
            ele.hide();
        });
        
        ele.find('.close').off('click');
    }

    return o;
}])