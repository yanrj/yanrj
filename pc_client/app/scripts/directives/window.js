'use strict';
angular.module('mx.window')
    .directive('windowBar', ['TipsPopBinder', '$location', 'GLOBAL_SETTING', 'ConversationListBinder',
        '$injector', 'NewMsgFlashBinder', 'AppRootBinder', 'Utils', 'CurUserDB', 'RealtimeServ','ConversationBinder','$http', 'Cache','$rootScope','PopMessage','selectConversationsItemBinder','CollectonServ','PublisherBinder',
        function(TipsPopBinder, $location, GLOBAL_SETTING, ConversationListBinder, $injector,NewMsgFlashBinder, AppRootBinder, Utils, CurUserDB, RealtimeServ,ConversationBinder,$http,Cache,$rootScope,PopMessage, selectConversationsItemBinder, CollectonServ,PublisherBinder) {
            /*https://github.com/b1rdex/nw-contextmenu*/
            var clickedElement, msgId;
            var URL = GLOBAL_SETTING.URL;
            // function Menu(cutLabel, copyLabel, pasteLabel) {
                var gui = require('nw.gui'),
                    rightClickMenu = new gui.Menu(),
                    /*用于缓存右键点击的元素，用于在拷贝的时候判断*/
                    clickedElement,
                    cut = new gui.MenuItem({
                        label: "剪切",
                        enabled:false,
                        click: function() {
                            document.execCommand("cut");
                        }
                    }),
                    copy = new gui.MenuItem({
                        label: "复制",
                        enabled:false,           
                        click: function(e) {
                            document.execCommand("copy");
                            if (clickedElement&&clickedElement.is("a")) {
                                var clipboard = gui.Clipboard.get();
                                var title = clickedElement.attr("title");
                                if (title)  clipboard.set(title, 'text');
                            }
                        }
                    }),
                    paste = new gui.MenuItem({
                        label: "粘贴",
                        enabled:false,
                        click: function() {
                            document.execCommand("paste");
                        }
                    }),
                    deleteMsg = new gui.MenuItem({
                        label: "删除",
                        enabled:false,
                        click: function() {
                            var messageId=parseInt(clickedElement.closest('.item').data("id"));
                            ConversationBinder.removeMsg(messageId);
                        }
                    }),
                    withdraw = new gui.MenuItem({
                        label: "撤回",
                        enabled:false,
                        click: function() {
                            var convId = ConversationBinder.getCurrentConvId();
                            var messageId=parseInt(clickedElement.closest('.item.self').data("id"));
                            var URI = '/api/v1/conversations/'+convId+'/messages/'+messageId;
                            var url = URL + URI;
                            var messageData = '你撤回了一条消息';
                            var convData = Cache.get('conversation_' + convId);
                            CurUserDB.getMessage(messageId).then(function(msg){
                                $http({
                                    url: url,
                                    method: 'DELETE'
                                }).success(function (data, status, headers, config) {
                                    if(data.code === 200){
                                        msg.body=messageData;
                                        msg.system=true;
                                        msg.message_type='text_message';
                                        CurUserDB.saveMessages([msg]).then(function(){
                                            //获取当前对话框中的最后一条消息ID
                                            var lastMessageId = convData.last_message.id;

                                            clickedElement.closest('.item.self').addClass('system');
                                            clickedElement.closest('.content').html("<p>"+messageData+"</p>");

                                            //判断最后一条消息
                                            if(messageId === lastMessageId){
                                                convData.last_message.body = messageData;
                                                convData.last_message.system = true;
                                                convData.last_message.message_type='text_message';
                                                //发送广播
                                                $rootScope.$broadcast('conversations.newMessage_' + convId, convData);
                                                //更新数据库
                                                return CurUserDB.saveConvList([convData]);
                                            };
                                        });
                                    }
                                }).error(function (data, status, headers, config) {
                                    PopMessage.err({
                                        message: data.errors.message
                                    });
                                });
                            })
                        }
                    }),
                    retransmission = new gui.MenuItem({
                        label: "转发",
                        enabled:false,
                        click: function() {
                            //发送刷新弹出框convs的广播
                            $rootScope.$broadcast('conversations.refdata');

                            selectConversationsItemBinder.forwardMsg(msgId);

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
                        }
                    }),
                    collection = new gui.MenuItem({
                        label: "收藏",
                        enabled:false,
                        click: function() {
                            var httpModule = 'post';
                            CurUserDB.getMessage(msgId).then(function(msg){
                                var messageId = msgId;
                                var title = msg.title ? msg.title : '';
                                var url = msg.url ? msg.url : '';
                                var appUrl = msg.app_url ? msg.app_url : '';
                                var postArr = {};
                                if(messageId && messageId != ''){
                                    postArr.message_id= messageId;
                                }
                                if(title && title != ''){
                                    postArr.title = title;
                                }
                                if(url && url != ''){
                                    postArr.url = url;
                                }
                                if(appUrl && appUrl != ''){
                                    postArr.app_url = appUrl;
                                }
                                var postData = postArr;

                                CollectonServ(httpModule, postData)
                                .then(function(data){
                                    PopMessage.tip({
                                        msg: '收藏成功！',
                                        type: 1
                                    });
                                },function(data){
                                    PopMessage.err({
                                      message: data.errors.message
                                    });
                                });
                            });
                            
                        }
                    }),
                    more = new gui.MenuItem({
                        label: "更多",
                        enabled:false,
                        click: function() {
                            $(".con-wrap").addClass('menuItemMore').css('height', "calc(100% - 1px - 50px)");
                            $(".menu-item-more").show();
                            var batchForwarding = true;
                            $rootScope.$broadcast('showMessageForwordingBtn', batchForwarding);
                            PublisherBinder.hide();
                        }
                    });
                rightClickMenu.append(cut);
                rightClickMenu.append(copy);
                rightClickMenu.append(paste);
                rightClickMenu.append(deleteMsg);
                rightClickMenu.append(withdraw);
                rightClickMenu.append(retransmission);
                rightClickMenu.append(collection);
                rightClickMenu.append(more);
                // return menu;
            // }
            // var menu = new Menu("剪切", "复制", "粘贴");
            return {
                restrict: 'EA',
                controller: ['$scope',
                    function($scope) {
                        $injector.invoke(NewMsgFlashBinder.bind, this, {
                            $scope: $scope
                        });
                    }
                ],
                link: function postLink(scope, ele, attrs) {
                    var btnClose = ele.find('.close');
                    var btnMin = ele.find('.min');
                    var btnMax = ele.find('.max');
                    var gui = require('nw.gui');
                    var win = gui.Window.get();
                    var eggKey = ''; //用来触发调试面板
                    var iconPath = Utils.isMac() ? 'images/origin/icon.tiff' : 'images/origin/icon.png';
                    var tray = win.cusTray;

                    //在conversation会话页面，增加右键菜单功能
                    $(document).on("contextmenu", "div.conversation-wrap", function(e) {
                        e.preventDefault();
                        clickedElement = $(e.target);
                        msgId = clickedElement.closest('.item').data('id');
                        var message = clickedElement.closest('.content');
                        var systemMessage = clickedElement.closest('.item.system');
                        var selfMessage = clickedElement.closest('.item.self .content');
                        var selfSystemMessage = clickedElement.closest('.item.self.system');
                        var currentSelection=window.getSelection();
                        var curConvId = $('.box .item.act').data('id');
                        var curConversation=Cache.get("conversation_" + curConvId);
                        var isOcuTextMsg = clickedElement.closest('.item.text_message').length;
                        var isPluginMessage = clickedElement.closest('.item.plugin_message').length;
                        var ismutu = clickedElement.closest('.item.rich_content_message').length;
                        //只有在输入框中才能有粘贴
                        paste.enabled=clickedElement.is("textarea");
                        copy.enabled=currentSelection.type=="Range";
                        cut.enabled= copy.enabled&&clickedElement.is("textarea");
                        var sendStatus = clickedElement.parent().parent().find('.send-status').hasClass('send-failed'); //判断消息发送状态
                        withdraw.enabled = selfMessage.length > 0 && selfSystemMessage.length < 1 && !sendStatus;
                        retransmission.enabled = message.length > 0 && systemMessage.length < 1 && !sendStatus && isPluginMessage==0 && ismutu == 0;
                        deleteMsg.enabled = message.length > 0 && systemMessage.length < 1 && !sendStatus && isPluginMessage==0 && ismutu == 0;
                        more.enabled = message.length > 0 && systemMessage.length < 1 && !sendStatus && isPluginMessage==0 && ismutu == 0;
                        collection.enabled = message.length > 0 && systemMessage.length < 1 && !sendStatus && isPluginMessage==0 && ismutu == 0;
                        rightClickMenu.popup(e.originalEvent.x, e.originalEvent.y);
                    });

                    //标记客户端是否是最大化
                    win.isMax = false;

                    //弹窗提示，确认是否退出应用
                    var checkLogout = function() {
                        TipsPopBinder.show({
                            body: '退出' + GLOBAL_SETTING.name_cn + '将无法收到新消息，确定退出？',
                            showCancel: true,
                            showConfirm: true,
                            confirmed: function() {
                                //清除消息提醒弹窗
                                // window.DEA.notifications.clear();
                                //关闭程序
                                win.close();
                            }
                        });
                    };
                    /*释放菜单对象*/
                    var clearTrayMenu = function() {
                        if (tray) {
                            tray.remove();
                            win.cusTray.remove();
                            win.cusTray = tray = null;
                        }

                    }



                    //自定义托盘图标及右键菜单
                    var createCustomTray = function() {
                        //设置托盘
                        tray = win.cusTray = new gui.Tray({
                            //title: '',
                            icon: iconPath,
                            //alticon: 'images/origin/icon_click.tiff',
                            tooltip: GLOBAL_SETTING.name_cn
                        });

                        /*
                         * 设置右键菜单项
                         * @param type[Number]: { 0：打开主面板；1：退出 }
                         */

                        //win 右键菜单
                        if (!Utils.isMac()) {
                            var menu = tray.menu = new gui.Menu();

                            menu.append(new gui.MenuItem({
                                type: 'normal',
                                label: '打开主面板',
                                icon: 'images/origin/btn-open.png'
                            }));
                            menu.append(new gui.MenuItem({
                                type: 'normal',
                                label: '退出',
                                icon: 'images/origin/btn-close.png'
                            }));
                            //tray.title = '';
                            //tray.menu = menu;

                            //右键菜单，0：打开主面板
                            tray.menu.items[0].on('click', function() {
                                win.show();
                            });

                            //右键菜单，1：退出
                            tray.menu.items[1].on('click', function() {
                                //登陆页则不提示，直接关闭
                                if ($location.path() === '/login') {
                                    win.close();
                                } else {
                                    //显示主面板，弹窗提示之后才关闭
                                    win.show();
                                    checkLogout();
                                }
                            });
                        }

                        //MAC托盘显示未读数
                        /*scope.unreadShow = function(unreadNum) {
                            if (/darwin/.test(process.platform)) {
                                tray.title = unreadNum;
                            }
                        };*/

                        //左键单击托盘图标，显示应用主面板
                        tray.on('click', function() {
                            //停止图标闪动
                            NewMsgFlashBinder.clearTimer(showIconTimer);

                            if (!/darwin/.test(process.platform)) {
                                tray.icon = 'images/origin/icon.png';
                            }
                            win.show();
                        });
                    };



                    createCustomTray();

                    //为mac增加菜单，实现复制粘贴功能
                    if (Utils.isMac()) {
                        var nativeMenuBar = new gui.Menu({
                            type: 'menubar'
                        });
                        nativeMenuBar.createMacBuiltin(GLOBAL_SETTING.name_cn);
                        win.menu = nativeMenuBar;
                    }

                    //接收新消息，图标闪动，tray.icon只能为本地相对/绝对路径，不能是url
                    var showIconTimer;

                    scope.clearTimer = function() {
                        if (showIconTimer) {
                            clearInterval(showIconTimer);
                        }

                        showIconTimer = null;

                        if (!Utils.isMac() && tray) {
                            tray.icon = 'images/origin/icon.png';
                        }
                    };

                    scope.scopeWorker = function(item) {
                        if (Utils.isMac()) {
                            return;
                        }

                        NewMsgFlashBinder.clearTimer(showIconTimer);

                        if (!AppRootBinder.winFocused() && tray) {
                            showIconTimer = setInterval(function() {
                                tray.icon = (tray.icon == 'images/origin/icon2.png') ? 'images/origin/icon.png' : 'images/origin/icon2.png';
                            }, 300);
                        } else {
                            return;
                        }

                    };

                    //点击最小化，应用退回托盘中
                    btnMin.on('click', function() {
                        win.hide();

                        //强制设置客户端focus状态为false(false才能弹消息提醒)
                        AppRootBinder.winFocused(false);

                        //在登录页面最小化后，再点击图标展示窗口会显示白页
                        //所以需要强刷一下页面才能恢复到登录页面
                        //排查了一个小时无果，遂暂时采用这个方案
                        // if ($location.path() === '/login') {
                        //     setTimeout(function() {
                        //         win.reload();
                        //     }, 50);
                        // }
                    });

                    btnClose.bind('click', function(e) {
                        e.preventDefault();

                        //登陆页不提示，直接关闭
                        if ($location.path() === '/login') {
                            win.close();
                            return;
                        }
                        //弹窗提示之后才关闭
                        win.hide();
                        //强制设置客户端focus状态为false(false才能弹消息提醒)
                        AppRootBinder.winFocused(false);
                    });

                    //点击'最大化'按钮，进行窗口最大化切换
                    btnMax.bind('click', function(e) {
                        e.preventDefault();

                        if (!win.isMax) {
                            win.maximize();
                        } else {
                            win.unmaximize();
                        }
                    });

                    btnMin.bind('mousedown', function(e) {
                        if (e.button !== 2) return;

                        if (eggKey === 'min') {
                            //开启调试面板
                            win.showDevTools();
                            eggKey = '';
                            return;
                        }

                        eggKey = 'min';
                        setTimeout(function() {
                            eggKey = '';
                        }, 2000);
                    });
                    /*窗口最大化回调*/
                    var maximizeCallback = function(e) {
                            //最大化后对话列表可能下面是空白，这里检查判断是否需要加载更多对话，补全列表
                            if ($location.path() === '/main') {
                                setTimeout(function() {
                                    ConversationListBinder.checkListHeight();
                                }, 300);
                            }

                            win.isMax = true;
                        }
                        /*窗口最小化回调*/
                    var unmaximizeCallback = function(e) {
                        win.isMax = false;
                    }

                    var newWinPolicy = function(frame, url, policy) {
                        //打开系统默认浏览器加载URL
                        gui.Shell.openExternal(url);
                        //frame.src = url;
                        policy.ignore();
                    }

                    //监听窗口最大化
                    win.addListener('maximize', maximizeCallback);
                    //监听窗口从最大化恢复到默认大小
                    win.addListener('unmaximize', unmaximizeCallback);
                    win.addListener('new-win-policy', newWinPolicy);

                    //窗口调用reload以后，window对象会发生变化，需要在窗口unload的时候，做一些对象的释放
                    window.addEventListener('beforeunload', function() {
                        clearTrayMenu();

                        win.removeAllListeners("maximize");
                        win.removeAllListeners("unmaximize");
                        win.removeAllListeners("new-win-policy");
                        win.removeAllListeners("blur");
                        win.removeAllListeners("focus");
                        gui.App.removeAllListeners("reopen");
                        CurUserDB.closeDB();
                        RealtimeServ.disconnect();
                    }, false);
                }
            }
        }
    ])