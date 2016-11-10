'use strict';

angular.module('mx.conversations.list')
    /*
     * 对话列表指令
     */
    .directive('conversationsList', ['ConversationListLoaderServ', '$injector',
        'ConversationListBinder', 'PopMessage', 'NotificationsServ', 'RootscopeApply',
        'conversationInfoBinder', 'ConversationBinder', 'GroupMembersServ', 'Storage',
        'NewMsgFlashBinder', 'CurUserDB', 'Cache', 'GLOBAL_SETTING', 'SidebarNavBinder','RealtimeMsgHandler','SlideWindow','Utils','$http',
        function(ConversationListLoaderServ, $injector, ConversationListBinder, PopMessage,
            NotificationsServ, RootscopeApply, conversationInfoBinder, ConversationBinder,
            GroupMembersServ, Storage, NewMsgFlashBinder, CurUserDB, Cache, GLOBAL_SETTING, SidebarNavBinder,RealtimeMsgHandler, SlideWindow,Utils, $http) {
            return {
                restrict: 'A',
                replace: false,
                controller: ['$scope', '$rootScope', '$filter', 'updateConvListCache', '$location', '$element',
                    function($scope, $rootScope, $filter, updateConvListCache, $location, $element) {
                        var refsFilter = $filter('referencesFilter');
                        //var t = Storage.getToken().access_token;

                        //绑定对话列表服务
                        $injector.invoke(ConversationListBinder.bind, this, {
                            $scope: $scope
                        });

                        $scope.URL = GLOBAL_SETTING.URL;
                        $scope.items = [];
                        $scope.catlogItems = [];
                        $scope.references = [];
                        $scope.isshowList = false;
                        //等待打开的对话，当需要打开某个对话，但是还没有推送过来时，可以赋值给此变量
                        //推送收到后会判断是不是这个对话，然后直接打开
                        $scope.waitForConvId;

                        //监听最小化后的，消息提醒
                        //新消息小窗Notification提醒
                        $scope.$on('notification_show', function (e, convData) {
                            if (!(Utils.isChatShown()&&$scope.windowFocused) && $scope.setting.notification) {
                                //防止频繁调用,最多1秒钟调用一次
                                var throttled = _.throttle(function() {
                                    NotificationsServ(convData);
                                },1000)
                                throttled.call();
                            }
                            //接收新消息时，图标闪动
                            NewMsgFlashBinder.init(convData);
                        });
                        

                        //处理实时推送的新消息
                        $scope.realtimeManage = function(convData) {
                            var item = angular.copy(convData);
                            if (!item) {
                                return;
                            }
                            //收到推送的对话ID
                            var id = item.id;
                            //当前对话的ID
                            var currentConvId = ConversationBinder.getCurrentConvId();
                            //消息类型
                            var msgType = item.last_message && item.last_message.message_type;
                            //收到推送的群聊成员数量
                            var memCount = item.user_ids && item.user_ids.count;
                            //当前对话成员数量
                            var userCount = conversationInfoBinder.userCount();
                            var user_ids = item.user_ids.ids;
                            var reg = new RegExp('^(' + user_ids.join('|') + ')$');
                            var members = [];

                            //如果推送对话就是当前打开的对话，而且用户数量不等
                            //则更新用户数量和成员信息
                            if (id === currentConvId && userCount && userCount !== memCount && msgType === 'system_message') {
                                for (var i in user_ids) {
                                    members.push(Cache.get('user_' + user_ids[i]));
                                }
                                conversationInfoBinder.updateInfo({
                                    count: memCount
                                });
                                GroupMembersServ.init(members);
                                //RealtimeMsgHandler(convData);
                            }
                            // //新消息小窗Notification提醒
                            // if (!(Utils.isChatShown()&&$scope.windowFocused) && $scope.setting.notification) {
                            //     //防止频繁调用,最多1秒钟调用一次
                            //     var throttled = _.throttle(function() {
                            //         NotificationsServ(item);
                            //     },1000)
                            //     throttled.call();
                            // }
                            // //接收新消息时，图标闪动
                            // NewMsgFlashBinder.init(item);

                            var id = item.id;
                            //判断消息是否已存在对话列表中
                            var exists = ConversationListBinder.checkConvItem(id);
                            //如果对话项已存在，直接处理，否则追加到顶部
                            if (exists) {
                                $rootScope.$broadcast('conversations.newMessage_' + id, item);
                            } else {
                                $rootScope.$broadcast('conversations.prependItem', item);
                            }

                            if ($scope.waitForConvId === id) {
                                //如果正在等待打开这个对话，直接切换到这个对话
                                setTimeout(function() {
                                    $scope.$broadcast('conversations.trigger_' + id);
                                    ConversationBinder.trigger(item);
                                }, 4);
                            }

                            // //如果不在敏信中，给全局未读数+1
                            // if($location.url() != '/main'){
                            //     var unAllRead = SidebarNavBinder.getMessageUnreadNum() + 1;
                            //     SidebarNavBinder.setMessageUnreadNum(unAllRead);
                            // }

                            //清楚等待标记
                            $scope.waitForConvId = null;
                        };

                        //检查列表高度是否超出容器高度,如果没有超出而且还有未加载对话，加载！
                        var checkHeight = function() {
                            var listHeight = $element.height();
                            var boxHeight = $element.find('.box').height();

                            if (boxHeight <= listHeight && !$scope.noMore && !$scope.listLoading) {
                                //$scope.loadConvList();
                            }
                        };

                        //合并两组不同的对话列表，将其中两个相同的对话合并成一个
                        // var mergeConvItems = function(items, newItems) {
                        //     //暂时没有做处理，只要使用新的对话列表就行
                        //     return newItems;
                        // };
                        //列表元素发生变化后，需要进行重新排序 todo 性能问题待检验
                        var orderItems = function(items) {
                                return $filter('orderBy')(items, ['display_order', 'topped_at', 'updated_at'], true);
                            }
                        //将获取到的数据解析到作用域中
                        var scopeWorker = function(allConvs) {
                            // var newItems = angular.copy(convItems);
                            var items = $scope.items || [];
     
                            var toOpenConv;
                            //获取当前正在打开的对话数据
                            var triggerData = ConversationBinder.getTriggerData();

                            //取消标记正在加载状态
                            $scope.listLoading = false;

                            //如果获取到的对话列表长度为0，则标记为无更多对话
                            /*if (convItems.length === 0 && !triggerData) {
                                $scope.noMore = true;
                                return;
                            }*/

                            //如果对话列表是首次加载而且请求到了对话列表数据
                            if (items.length === 0 && allConvs.length) {
                                //将之前打开过的对话或第一个对话标记为待打开的对话
                                $scope.triggerFirstConv();
                            }
                            items=orderItems(allConvs);
                            //如果有要打开的对话，标记它
                            if (triggerData) toOpenConv = triggerData;

                            //追加对话列表到当前列表
                            //items = items.concat(newItems);
                            // items = mergeConvItems(items, newItems);

                            if (items.length) {
                                //标记最后一个对话ID，用于下次获取更多对话列表使用
                                var lastMsg = items[items.length - 1].last_message;
                                var lastId = lastMsg ? lastMsg.id : null;
                            }
                            //保存列表
                            $scope.items = items;
                            //$scope.references = refsFilter(refs, data.references);
                            $scope.lastId = lastId;
                            //缓存对话列表
                            //$scope.cacheIn();
                            if (toOpenConv && toOpenConv.type === 'conversation' && !toOpenConv.last_message) {
                                //如果要打开的对话类型是conversation而且没有last_message字段
                                //说明是空的单聊对话，不再打开
                                toOpenConv = null;
                                ConversationBinder.clear();
                            }

                            //默认打开某条对话
                            setTimeout(function() {
                                var currentConvId = ConversationBinder.getCurrentConvId();

                                //初始化全局未读数
                                
                                // CurUserDB.getConvList()
                                // .then(function(convs) {
                                //     var _unread = 0, initUnread = SidebarNavBinder.getMessageUnreadNum();
                                //     //更新全局未读数
                                //     for (var i = 0, len = convs.length; i < len; i++) {
                                //         if(!convs[i].category_id && convs[i].remind == true){
                                //             _unread += convs[i].unread_count;
                                //         }
                                //     }
                                //     if(_unread > initUnread){
                                //         SidebarNavBinder.setMessageUnreadNum(_unread);
                                //     }
                                    
                                // });
                                if (currentConvId) {
                                    //如果存在当前对话，则再次触发对应的对话项
                                    //此判断逻辑初衷用于从其他面板切换回对话面板时能再次激活当前对话
                                    $rootScope.$broadcast('conversations.trigger_' + currentConvId);
                                }
                                else if (toOpenConv) {
                                    //如果有标记要打开的对话，则直接打开
                                    ConversationBinder.trigger(toOpenConv);
                                } 
                                else {
                                    $scope.triggerFirstConv();
                                }
                                //检查列表高度是否超过容器，如果还有未加载对话
                                //必须保证列表超出容器，不然无法保证滚动加载
                                //***** 暂时废弃，不存在滚动加载逻辑 *****
                                //checkHeight();
                            }, 4);
                        };

                        /**
                         * 获取对话列表
                         * @param params[Object]: 加载对话列表的参数，用于加载更多对话，首次加载不传参
                         */
                        var load = this.load = function() {
                            // var cache = Cache.get('list');
                            $scope.listLoading = true;
                            ConversationListLoaderServ.load()
                            .then(function(data) {
                                var allConvs=data.convs;
                                var convs = new Array();

                                for(var i = 0,conv; i < allConvs.length; i++){
                                    conv=allConvs[i];
                                    //todo 这个地方需要优化，不应该每次加载的时候做，应该存储的时候做，没时间看逻辑 
                                    if(!conv.category_id){
                                        if(conv.type == 'category'){
                                            var curCategoryId = conv.catlog_id;
                                            var unread = 0;
                                            for(var j = 0,conv_j; j < allConvs.length; j++){
                                                conv_j=allConvs[j];
                                                if(conv_j.category_id == curCategoryId && conv_j.remind){
                                                    unread = unread + conv_j.unread_count;
                                                }
                                            }
                                            CurUserDB.updateConvUnread(conv.id, unread);
                                            conv.unread_count = unread;
                                        }
                                        convs.push(conv);
                                    }
                                }
                                scopeWorker(convs); //处理作用域变量
                            }, function(err) {
                                PopMessage.err(err);
                            });
                        };

                        //初始化加载对话列表
                        load();

                        //接收分类id，过滤出来该分类下的convs
                        $scope.$on('category', function (e, trgData) {
                            CurUserDB.getConvList()
                            .then(function(data){
                                var convs = new Array();
                                var curCategoryId = trgData.catlog_id;
                                for(var i = 0; i < data.length; i++){
                                    if(data[i].category_id == curCategoryId){
                                        convs.push(data[i]);
                                    }
                                }
                                $scope.catlogTitle = trgData.name;
                                $scope.catlogItems = convs;
                                $(".box:eq(0)").hide();
                                $(".box:eq(1)").show().attr("isShow","true");
                                $scope.isshowList = true;

                                if (!$scope.catlogItems) return false;
                                ConversationBinder.trigger(convs[0]);
                            });
                            
                        });

                        $scope.$on('removeConvsItem', function (e, convId) {
                            CurUserDB.getConvList()
                            .then(function(data){
                                var convs = new Array();
                                for(var i = 0; i < data.length; i++){
                                    if(!data[i].category_id && data[i].id != convId){
                                        
                                        convs.push(data[i]);
                                    }
                                }
                                $scope.items = convs;
                            });
                            
                        });

                        //监听追加对话项事件，将新对话数据加入作用域
                        $scope.$on('conversations.refresh', function(e, convs) {
                            var oldConvs=$scope.items;
                            var convIds=_.pluck(convs,"id");
                            oldConvs=_.reject(oldConvs,function(conv){return convIds.indexOf(conv.id)!=-1})
                            RootscopeApply($scope, function() {
                                $scope.items = oldConvs
                            });
                            //需要先把数据清除，然后重新更新，必须要增加延时，否则刷新不生效,页面可能会闪动一下
                            setTimeout(function(argument) {
                                RootscopeApply($scope, function() {
                                    var newConvs=oldConvs.concat(convs)
                                    $scope.items = orderItems(newConvs);
                                });
                            }, 1)
                        });
                        //监听追加对话项事件，将新对话数据加入作用域
                        $scope.$on('conversations.prependItem', function(e, item) {
                            RootscopeApply($scope, function() {
                                //$scope.references = refsFilter($scope.references, itemData.references);
                                if (!angular.isNumber(item.display_order)) {
                                    //服务器返回默认值是  null
                                    item.display_order = -1;
                                }
                                // 来了带新的分类的公众号将他插入该分类下
                                if(!item.category_id){
                                    $scope.items.push(item);
                                    $scope.items = orderItems($scope.items);
                                }else if(item.category_id){
                                    $scope.catlogItems.push(item);
                                    $scope.catlogItems = orderItems($scope.catlogItems);
                                }
                                // $scope.items.splice(0, 0, itemData);
                            });

                            //缓存
                            //$scope.cacheIn();
                        });

                        //加载更多对话列表
                        //***** 暂时废弃，由于使用本地离线存储，不存在滚动加载逻辑 *****
                        /*$scope.loadConvList = function() {
                            var params = {};
                            if ($scope.lastId) {
                                params.older_than = $scope.lastId;
                            }

                            load(params);
                        }*/

                        //置顶指定索引的对话 暂不使用
                        $scope.stickyTop = function(index) {
                            // console.log("stickyTop:>>",$scope.items);    
                            // console.log("stickyTop length:>>",$scope.items.length);    
                            // var item = $scope.items.splice(index, 1)[0];

                            // $scope.items.push(item);
                        };

                        //更新列表某项，不能直接替换item，不然会报错
                        $scope.updateItem = function(index, item) {
                            RootscopeApply($scope, function() {
                                if (!angular.isNumber(item.display_order)) {
                                    //服务器返回默认值是  null
                                    item.display_order = -1;
                                }
                                if(item.category_id){
                                    $scope.catlogItems[index] = item;
                                    $scope.catlogItems = orderItems($scope.catlogItems);
                                }else{
                                    $scope.items[index] = item;
                                    $scope.items = orderItems($scope.items);
                                }
                                
                            });
                        };

                        //打开列表中不是公众号分类的第一个对话
                        $scope.triggerFirstConv = function() {
                            //如果对话列表没有数据，返回false
                            // if (!$scope.items) return false;
                            // for(var i = 0; i < $scope.items.length; i++){
                            //     if($scope.items[i].type != 'category'){
                            //         var firstItem = $scope.items[i];

                            //         ConversationBinder.trigger(firstItem);
                            //         return;
                            //     }
                            // }
                            //如果不存在，对话区域清空
                            var emptyDialogBoxBool = true;
                            $rootScope.$broadcast('emptyDialogBox', emptyDialogBoxBool);
                        };

                        //计算全局未读数，并更新。。
                        $scope.$on('setting_unread_num', function (e) {
                            var num = 0;
                            var conItems = $scope.items;
                            $.each(conItems, function(index, val) {
                                if(val.remind && !val.category_id && val.unread_count){
                                    num += val.unread_count;
                                }

                            });
                            // var _unread = 0;
                            // CurUserDB.getConvList()
                            // .then(function(convs) {
                            //     //更新全局未读数
                            //     for (var i = 0, len = convs.length; i < len; i++) {
                            //         if(!convs[i].category_id && convs[i].remind == true){
                            //             _unread += convs[i].unread_count;
                            //         }
                            //     }
                            //     console.info('_unread',_unread);
                            //     //SidebarNavBinder.setMessageUnreadNum(_unread);
                            // });
                            // console.info('conItems', angular.copy(conItems));
                            SidebarNavBinder.setMessageUnreadNum(num);
                        });
                    }
                ],
                link: function postLink(scope, element, attrs) {


                    var box = element.find('.box');
                    var scrollHandler = function(e) {
                        var listHeight = box.height();
                        var scrollHeight = element.scrollTop() + element.height();

                        if (scrollHeight >= listHeight && !scope.noMore && !scope.listLoading) {
                            //scope.loadConvList();
                        }
                    };

                    element.on('click',function(){
                        SlideWindow.hide();
                    })

                    scope.checkListHeight = function() {
                        if (element.height() > box.height() && !scope.noMore && !scope.listLoading) {
                            //scope.loadConvList();
                        }
                    };

                    /**
                     * 更新某对话未读数
                     */
                    scope.updateConvUnreadNum = function(convId, num) {
                        var currentConvId = ConversationBinder.getCurrentConvId();
                        var eItem = element.find('.item[data-id=' + convId + ']');
                        var catelogData = Cache.get('conversation_'+convId);
                        //如果没找到对应对话元素，取消处理
                        if (!eItem) return;
                        //如果推送的未读数大于等于本地未读数(取最小值)，则返回不再处理
                        if(catelogData.type != "category"){
                            if (eItem.scope()&&eItem.scope().unreadNum <= num) return;
                        }
                        console.info('updateConvUnreadNum', num);
                        var unreadNum = num < 0 ? 0 : num;
                        var convs = scope.items;
                        convs.some(function(ele, i) {
                            if (ele.id === convId) {
                                RootscopeApply(scope, function() {
                                    eItem.scope().unreadNum = unreadNum;
                                    scope.items[i].unread_count = unreadNum;
                                    scope.$broadcast('setting_unread_num');
                                });
                            }
                        });
                        
                        //存入数据库references表
                        CurUserDB.updateConvUnread(convId, unreadNum);
                        
                    };

                    var returnList = element.find('.return_list');
                    returnList.click(function(){

                        scope.catlogItems = [];
                        $(".box:eq(1)").hide().attr("isShow","false");
                        $(".box:eq(0)").show();
                        scope.isshowList = false;
                        //load();
                        scope.triggerFirstConv();
                    });

                    /**
                     * 更新公众号置顶
                     */
                    scope.updateDisplayOrder = function() {
                        var ocuIds = CurUserDB.getDisplayOrder();
                    };

                    //滚动到底部加载更多对话
                    //***** 暂时废弃，不存在滚动加载逻辑 *****
                    //element.bind('scroll', scrollHandler);

                    //当作用于销毁时，清除引用
                    scope.$on('$destroy', function() {
                        var triggerData = ConversationBinder.getTriggerData();
                        if (triggerData && triggerData.last_message) {
                            ConversationBinder.clear();
                        }

                        element.off('click')
                        element.unbind('scroll', scrollHandler);
                        scrollHandler = null;
                        box = null;
                    });
                }
            }
        }
    ])
    /*
     * 对话选项指令
     */
    .directive('conversationsItem', ['ConvTitleFilter', 'SidebarNavBinder', 'ConversationBinder', 'RootscopeApply', 'Storage', 'CurUserDB', 'Cache', 'PopMessage', 'TipsPopBinder', 'UserLoaderServ', '$rootScope', 'ContactsStatus','OcusLoader','ConversationListBinder','SlideWindow',
        function(ConvTitleFilter, SidebarNavBinder, ConversationBinder, RootscopeApply, Storage, CurUserDB, Cache, PopMessage, TipsPopBinder, UserLoaderServ, $rootScope, ContactsStatus,OcusLoader,ConversationListBinder, SlideWindow) {
            return {
                templateUrl: 'views/templates/conversations_item.tpl.html',
                replace: true,
                restrict: 'A',
                controller: ['$scope', '$element',
                    function($scope, $element) {
                        //处理最后一条消息，如果是特殊类型，输出特定字符串
                        var lastMsg = function(lastMsgObj) {
                            var msg = '';
                            //优先返回草稿内容
                            if ($scope.draft && !$scope.callMe) return $scope.draft;
                            if (!lastMsgObj) return msg;
                            switch (lastMsgObj.message_type) {
                                case 'image':
                                    msg = '[图片]';
                                    break;
                                case 'voice_file':
                                    msg = '[语音]';
                                    break;
                                case 'doc':
                                    msg = '[文档]';
                                    break;
                                case 'video':
                                    msg = '[视频]';
                                    break;
                                case 'audio':
                                    msg = '[音频]';
                                    break;
                                case 'txt':
                                    msg = '[文本]';
                                    break;
                                case 'unknown':
                                    msg = '[文件]';
                                    break;
                                case 'p2p_file':
                                    msg = '[文件]';
                                    break;
                                case 'share_link':
                                    msg = '[分享]'+lastMsgObj.body
                                    break;
                                case 'zip':
                                    msg = '[压缩文件]';
                                    break;
                                case 'custom':
                                    msg = '当前版本暂不支持查看此消息，请在手机上查看。';
                                    break;
                                case 'plugin_message':
                                    msg = '当前版本暂不支持查看此消息，请在手机上查看。';
                                    break;
                                default:
                                    msg = lastMsgObj.body || '';
                            }

                            //系统通知回事一些object类型的消息
                            if (typeof msg === 'object' && msg.articles) {
                                msg = msg.articles[0].title;
                            }

                            return msg;
                        };

                        var user = Storage.getUser('currentUser');
                        var callMeName = '@'+user.name;
                        

                        $scope.callMeName = callMeName;

                        //往scope对象上渲染公共的变量
                        var wrapScopeContext = function(item) {
                            var item = angular.copy(item);
                            $scope.id = item.id;
                            $scope.unreadNum = item.unread_count || 0;
                            $scope.name = item.name != null ? item.name : item.default_name;
                            $scope.head = $scope.URL + item.avatar_url;
                            $scope.top = (_.isNumber(item.display_order)&& item.display_order >= 0) || item.topped_at>=0;
                            $scope.muted=!item.remind;
                            $scope.draft = item.draft;
                            $scope.lastMessageId = item.last_message && item.last_message.id;
                            if(item.last_message){
                                $scope.sendStatus = item.last_message.send_status==false ? false:true;
                            }else{
                                $scope.sendStatus = true;
                            }
                            //判断last_message中有人@我
                            var reg = new RegExp('^.*'+ callMeName +'.*$');
                            var eleId = $element.parent().find('.act').data('id');
                            if(eleId != item.id && item.last_message && (item.last_message.message_type == "text_message" || item.last_message.message_type == "notice_message")){
                                //todo 可以优化，都放到存数据库的时候处理
                                if((reg.test(item.last_message.body)||item.last_message.message_type == "notice_message") && item.unread_count>0){
                                    $scope.callMe = true;
                                    item.call_me = true;
                                    CurUserDB.saveConvList([item]);
                                }
                            }
                            $scope.lastMessage = lastMsg(item.last_message);
                            //群聊下取到最后发消息的成员ID
                            $scope.lastUserId = item.is_multi_user&&item.last_message ? item.last_message.sender_id : '';
                            //获取本地登录用户信息
                            var localUser = Storage.getUser();
                            $scope.localId = localUser.id;
                            //排除本地登录用户id
                            if ($scope.lastUserId === $scope.localId) {
                                $scope.lastUserId = '';
                            }

                            if (!item.draft || item.call_me) {
                                var lastUser = Cache.get('user_' + $scope.lastUserId);
                                $scope.lastName = lastUser ? lastUser.name + '：' : '';
                            }else{
                                $scope.lastName = '';
                            }
                        }

                        var item = $scope.item;
                       
                         wrapScopeContext(item);
                      

                        //更新新消息内容

                        var newMessage =  _.debounce(function(e, conv) {

                            var item = angular.copy(conv);
                            //获取当前对话ID
                            var currentConvId = ConversationBinder.getCurrentConvId();
                            //存储当前最后一条消息
                            var originalMsgId = $scope.lastMessageId;
                            //获取新消息中最后一条消息
                            var lastMessage = item.last_message;
                            //如果当前用户与要聊天的人从来没有发起过聊天，不存在最后一条消息需要容错
                            if(!lastMessage) return;
                            var msgType = lastMessage.message_type;
                            

                            wrapScopeContext(item);

                            $scope.$parent.updateItem($scope.$index, item);

                            //将当前对话置顶 该方法已经废弃，新的方案是直接更新item对象
                            // $scope.$parent.stickyTop($scope.$index);

                            //存储data数据，以便其他地方调用
                            $scope.data = item;
                            $scope.data.default_name = $scope.name;
                            
                            $scope.item = item;

                            //如果是系统消息，不处理未读数
                            if (msgType === 'system_message') return;

                            //如果当前对话不是新消息所在对话，则显示未读数
                            if ($scope.id !== currentConvId && originalMsgId !== $scope.lastMessageId) {
                                $scope.unreadNum = item.unread_count; //同步未读数
                            }

                            //发广播计算未读数
                            $rootScope.$broadcast('setting_unread_num');
                        }, 300) ;
                       

                        //清空数据库、缓存中当前对话的未读数
                        var clearConvUnreadNum = function() {
                            var convId = $scope.id;
                            var conv = Cache.get('conversation_' + convId);
                            //如果对话是新建的单聊对话(没有消息，短暂缓存而已)，或未读数已为0，不作未读数处理
                            if (!conv || !conv.last_message) return;
                            //处理全局未读数
                            SidebarNavBinder.readedMessage($scope.unreadNum);
                            //将未读数字段变为0
                            conv.unread_count = 0;

                            //存入数据库references表
                            CurUserDB.updateConvUnread(convId, 0)
                                .then(function() {
                                    console.info('清空数据库对话' + convId + '未读数成功', 0);
                                    //存入缓存，CurUserDB中已存cache
                                    //Cache.put('conversation_' + convId, conv);
                                });
                        };

                        //触发对话时执行的逻辑
                        var convTrigger = function() {

                            $scope.callMe = false;
                            
                            //清除默认背景
                            $('.conversation-bg').hide();
                            //标记为点击样式
                            $element.parent().find('.act').removeClass('act');
                            $element.addClass('act');
                            Cache.put('curent_convsation',$element.parent().find('.act').data('id'));
                            RootscopeApply($scope, function() {
                                $scope.unreadNum = 0; //未读数清零
                                $scope.data.unread_count = 0;
                            });

                            var catlogitem = angular.copy($scope.item);
                            if(catlogitem.category_id){
                                var catelogId = "catlogId_"+catlogitem.category_id;
                                var catelogConversation=Cache.get("conversation_" + catelogId);
                                var catelogUnread = catelogConversation.unread_count - catlogitem.unread_count;
                                ConversationListBinder.updateConvUnreadNum(catelogId,catelogUnread);
                                if(catelogConversation.remind){
                                    clearConvUnreadNum();
                                }
                            }else{
                                //清除数据库、缓存中对话的未读数
                                clearConvUnreadNum();
                            }
                            
                        };

                        //监听新消息事件，并把推送的新消息显示出来
                        $scope.newMessageListener = $scope.$on('conversations.newMessage_' + $scope.id, function(e, data) {
                            RootscopeApply($scope.$parent, function() {
                                newMessage(e, data);
                            });
                        });

                        //监听触发当前对话事件
                        $scope.$on('conversations.trigger_' + $scope.id, convTrigger);

                        //存储data数据，以便其他地方调用
                        $scope.data = item;
                        $scope.data.default_name = $scope.name;

                    }
                ],
                link: function postLink(scope, element, attrs) {
                    /**
                     *增加右键菜单
                     */
                    var gui = require('nw.gui');
                    element.bind('click', function(){
                        $(".con-wrap").removeClass('menuItemMore').css('height', "calc(100% - 1px - 150px)");
                        $(".menu-item-more").hide();
                        SlideWindow.hide();
                    });

                    element.bind('mouseup', function(e) {
                        if (e.button != 2) {
                            return;
                        }
                        var conversation = scope.item;
                        var menu = new gui.Menu();
                        //强制指定和取消置顶
                        if (conversation.display_order == -1) {
                            menu.append(new gui.MenuItem({
                                label: (conversation.topped_at == -1||!conversation.topped_at) ? '置顶' : '取消置顶',
                                click: function() {
                                    RootscopeApply(scope, function() {
                                        ConversationBinder.toggleToppedAt(conversation.id);
                                    });

                                }
                            }));
                        }
                        //创建右键菜单
                        menu.append(new gui.MenuItem({
                            label: '删除会话',
                            click: function() {
                                var _ocuId = conversation.ocu_id;
                                if(_ocuId){
                                    OcusLoader.getOcu({id: _ocuId})
                                    .then(function(data){
                                        if (data.ocu_info.conv_can_rm == false) {
                                            //强制置顶会话，不能删除
                                            PopMessage.err({
                                                message: '管理员设置该项不可删除'
                                            });
                                        } else {
                                            RootscopeApply(scope, function() {
                                                ConversationBinder.removeConv(conversation.id);
                                            });
                                        }
                                    },function(data){
                                        if(data.status == 404){
                                            RootscopeApply(scope, function() {
                                                ConversationBinder.removeConv(conversation.id);
                                            });
                                        }
                                    })
                                }else if(conversation.type == 'category'){
                                    CurUserDB.getConvList()
                                    .then(function(data){
                                        var convArr = new Array();
                                        var ocuRm = true;
                                        var curCategoryId = conversation.catlog_id;
                                        for(var i = 0; i < data.length; i++){
                                            if(data[i].category_id == curCategoryId){
                                                var __ocu = Cache.get('ocu_' + data[i].ocu_id);
                                                if(__ocu.ocu_info.conv_can_rm === false){
                                                    ocuRm = false;
                                                }
                                                convArr.push(data[i].id);
                                            }
                                        }
                                        if(ocuRm == false){
                                            PopMessage.err({
                                                message: '该分类不可删除'
                                            });
                                        }else{
                                            RootscopeApply(scope, function() {
                                                ConversationBinder.removeConv(conversation.id);
                                            });

                                        }
                                    });
                                }else {
                                    RootscopeApply(scope, function() {
                                        ConversationBinder.removeConv(conversation.id);
                                    });
                                }
                            }
                        }));
                        //判断是否属于公共号分类
                        if(conversation.type != "category"){
                            //创建右键菜单 -- 静音
                            menu.append(new gui.MenuItem({
                                label: (conversation.remind == true) ? '静音' : '取消静音',
                                click: function() {
                                    RootscopeApply(scope, function() {
                                        ConversationBinder.messageReminder(conversation.id);
                                    });
                                }
                            }));
                            //群聊可以拥有退出群聊的菜单
                            if (conversation.is_multi_user) {
                                menu.append(new gui.MenuItem({
                                    label: '退出群聊',
                                    click: function(me) {
                                        TipsPopBinder.show({
                                            body: '确定要删除并退出该群聊？',
                                            showCancel: true,
                                            showConfirm: true,
                                            confirmed: function() {
                                                ConversationBinder.quit(conversation.id);
                                            }
                                        });
                                    }
                                }));
                            } else if (!conversation.ocu_id) {
                                //非公众号会话
                                menu.append(new gui.MenuItem({
                                    label: '查看资料',
                                    click: function(me) {
                                        var toViewUserId = conversation.user_ids.ids.filter(function(id) {
                                            if (id != Storage.getUser().id) {
                                                return id;
                                            }
                                        })[0];
                                        $rootScope.$broadcast('userinfo.show_by_id', toViewUserId);

                                    }

                                }));
                            }
                        }

                        menu.popup(e.clientX, e.clientY);
                    });
                }
            }
        }
    ])
    /*
     *  转发选择器
     */
    .directive('selectConversationsItem', ['CurUserDB', 'RootscopeApply', 'GLOBAL_SETTING', '$injector','selectConversationsItemBinder', 'Publish', '$rootScope',
                function(CurUserDB, RootscopeApply, GLOBAL_SETTING, $injector, selectConversationsItemBinder, Publish, $rootScope) {
            return {
                restrict: 'EA',
                replace: false,
                scope: true,
                template:   '<div class="select-conversation-list-warp">\
                                <h5>转发</h5>\
                                <input class="search" ng-model="searchName" type="text" placeholder="搜索" />\
                                <h5 class="contacts">最近聊天</h5>\
                                <div class="list" ng-show="items.length>0">\
                                    <div class="item" ng-repeat="item in items track by item.id" title="{{item.name}}" data-id="{{item.id}}">\
                                        <img ng-src="{{URL}}{{item.avatar_url}}" alt="头像" />\
                                        <span class="name">{{item.name}}</span>\
                                    </div>\
                                </div>\
                                <p ng-hide="items.length>0" style="margin-top: 0px;height: 366px;line-height: 366px;background:#efefef">暂无数据</p>\
                            </div>',
                controller: ['$scope', '$element',
                    function($scope, $element) {
                        //绑定对话列表服务
                        $injector.invoke(selectConversationsItemBinder.bind, this, {
                            $scope: $scope
                        });

                        $scope.URL = GLOBAL_SETTING.URL;
                        var refdata = function(){
                            CurUserDB.getConvList()
                            .then(function(data){
                                var convsArr = new Array;
                                $.each(data, function(index, val) {
                                    //把公众号过滤出去
                                    if(val && !val.ocu_id && !val.catlog_id){
                                        if(!val.name){
                                            data[index].name = val.default_name;
                                        }
                                        convsArr.push(data[index])
                                    }
                                });

                                $scope.items = convsArr;
                                $scope.refsItems = $scope.items;
                                //接收广播
                                $scope.$on('items', function(event,items){
                                    $scope.items = items;
                                });
                                $scope.searchName = '';
                            });
                        }
                        //$scope.refsItems = $scope.items;

                        //接收刷新弹出框convs的广播
                        $scope.$on('conversations.refdata', function() {
                            refdata();
                        });

                        $scope.forwardMsg = function(msgId){
                            $scope.msgId = msgId;
                        }
                    }
                ],
                link: function postLink(scope, element, attrs) {
                    var searchInputTimer = null;
                    //实时查看搜索输入框内容
                    var searchWatcher = scope.$watch('searchName', function() {
                        //如果计时器存在，则清除重置
                        if (searchInputTimer) {
                            clearTimeout(searchInputTimer);
                            searchInputTimer = null;
                        }
                        var searchRefs = function(searchText) {
                            var items = [];
                            //判断转发选择器的内容是否存在
                            if(scope.refsItems){
                                for (var i = 0, item, l = scope.refsItems.length; i < l; i++){
                                    item = scope.refsItems[i];
                                    //如果搜索结果和搜索的内容匹配，放入结果数组 
                                    if(item.name.indexOf(searchText) > -1){
                                        items.push(item);
                                    }
                                }
                                //将搜索出来的items广播出去
                                $rootScope.$broadcast('items', items);
                                };
                            }
                            //设置计时器，到时间开始搜出
                            searchInputTimer = setTimeout(function() {
                                RootscopeApply(scope, function() {
                                    //input框改变，触发搜索
                                    var v = $.trim(scope.searchName);
                                    searchRefs(v);
                                    if(v == ''){
                                        if(scope == null){
                                            return
                                        }
                                        scope.items = scope.refsItems;
                                    }
                                });
                            }, 300);
                        })

                    $("body").on("click",".select-conversation-list-warp .item",function(){
                        //这里用 data 取id 第二次转发，不准确。暂时用attr 获取。
                        var convsId = $(this).attr('data-id');
                        
                        var postMsg = function(msgId){
                            var postData = {};
                            // 获取 msg 信息
                            CurUserDB.getMessage(msgId)
                            .then(function(data){
                                if(data.message_type === "share_link"){ //转发分享链接
                                    postData.share_link = '{"title":"'+ data.title +'","source_id":null,"description":"'+ data.description +'","url":"' + data.url +'","app_url":"'+ data.app_url +'","image_url":"'+ data.thumbnail_url +'","type":"link"}';
                                }else if(data.file_id){ //转发文件、图片
                                    postData.attached = "uploaded_file:" + data.file_id;
                                }else{
                                    $('body').append('<div class="postDataBody" style="position:absolute;top:-1000000px;left:-10000000000px;"></div>');
                                    $(".postDataBody").html(data.body);
                                    for(var i = 0; i < $('.postDataBody a').length; i++){

                                        var ele = $('.postDataBody a:eq('+i+')');
                                        var val = ele.attr('href');
                                        
                                        ele.html(val);
                                    };
                                    var postDataBody = $('.postDataBody').text();
                                    postData.body = postDataBody;

                                    $(".postDataBody").remove();
                                }
                                postData.id = convsId;
                                postData.type = 'messages';
                                postData.collect = true;
                                Publish(postData);
                            });
                        }
                        
                        if(typeof(scope.msgId) == 'number'){
                           postMsg(scope.msgId);
                        }else{
                            $.each(scope.msgId, function(index, val) {
                                setTimeout(function(){
                                    postMsg(parseInt(val));
                                }, 1000)
                            });
                        }
                    });

                    scope.$on('$destroy', function() {
                        $("body").off("click",".select-conversation-list-warp .item");
                    });
                }
            }
        }
    ])