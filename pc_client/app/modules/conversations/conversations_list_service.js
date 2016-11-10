'use strict';

angular.module('mx.conversations.list')
    /*
     * 绑定对话列表
     */
    .factory('ConversationListBinder', ['CurUserDB','$q','ConversationListServ','$rootScope','Cache','UserLoaderServ','$location',
        function(CurUserDB,$q,ConversationListServ,$rootScope,Cache,UserLoaderServ,$location) {
            var o = {};
            var that, scope;

            o.bind = function($scope) {
                that = this;
                scope = $scope;
            };

            o.realtimeManage = function(convData) {
                scope.realtimeManage(convData);
            };

            /**
             * 从对话列表中给删除指定对话
             */
            o.removeConvItem = function(convId) {
                var index = -1;
                var conv =  Cache.get('conversation_' + convId);
                //查找对应id的对话项
                if(conv.category_id){
                    scope.catlogItems.some(function(ele, idx) {
                        if (ele.id === convId) {
                            index = idx;
                            return true;
                        }
                    });
                    var catelogId = 'catlogId_'+conv.category_id;
                    var catelogData = Cache.get('conversation_'+catelogId);
                    var unread = catelogData.unread_count - conv.unread_count;
                    o.updateConvUnreadNum(catelogId, unread);

                    //如果找到了对应的对话项，将之删除
                    if (index > -1) {
                        scope.catlogItems.splice(index, 1);
                    }

                    if(scope.catlogItems.length == 0){
                        $(".box:eq(1)").hide().attr("isShow","false");
                        $(".box:eq(0)").show();
                        scope.isshowList = false;
                        //scope.triggerFirstConv();

                        //如果分类内没有子项，则在主列表把该分类删除
                        var catlogId = 'catlogId_'+conv.category_id;
                        o.removeConvItem(catlogId);
                    }else{
                        //删除后 同步上次的消息
                        // CurUserDB.getConvList()
                        // .then(function(data){
                        //     for(var i = 0; i < data.length; i++){
                        //         if(data[i].category_id == catlog.category_id && data[i].id != convId){

                        //         }
                        //     }
                        // });
                    }
                }else{
                    scope.items.some(function(ele, idx) {
                        if (ele.id === convId) {
                            //console.info('对应的对话:', ele);
                            index = idx;
                            return true;
                        }
                    });

                    //如果找到了对应的对话项，将之删除
                    if (index > -1) {
                        scope.items.splice(index, 1);
                    }
                }

                //从数据库中删除
                return CurUserDB.removeConv(convId);
            };

            /*
             * 检查某对话是否已存在于对话列表中
             * @param convId[Number]: 需要检验的对话ID
             * @return Boolean: true(存在) | false(不存在)
             */
            o.checkConvItem = function(convId) {
                var check=false;

                var categoryData = Cache.get('conversation_'+convId);
                //var categoryId = categoryData.category_id;

                if(scope.isshowList == true && scope.catlogItems && categoryData.category_id){
                    check = scope.catlogItems.some(function(ele) {
                        return ele.id === convId;
                    });
                }else if(scope.items){
                    check = scope.items.some(function(ele) {
                        return ele.id === convId;
                    });
                }
                return check;
            };

            /*
             * 从会话列表中返回会话model
             * @param convId[Number]: 需要查询的对话ID
             * @return Object conversation对象
             */
            o.getConvItem = function(convId) {
                if (!scope.items) return null;
                var convData = Cache.get('conversation_'+convId);
                if(convData.category_id){
                    var items = scope.catlogItems.filter(function(ele) {
                        if (ele.id === convId) {
                            return ele
                        }
                    });
                }else{
                    var items = scope.items.filter(function(ele) {
                        if (ele.id === convId) {
                            return ele
                        }
                    });

                }
                return items[0];
            };
            //随时调用来将对话列表缓存
            o.cacheList = function() {
                scope.cacheIn();
            };

            //打开列表中第一个对话
            o.openFirstConv = function() {
                scope.triggerFirstConv();
            };

            //检查列表高度，判断是否加载更多内容
            o.checkListHeight = function() {
                scope.checkListHeight();
            };

            /**
             * 切换到某个对话，如果该对话不存在，会标记一个等待的变量，等到推送该对话时触发该对话
             * @param convId[Number]: 对话id
             */
            o.triggerConv = function(convId) {
                if (o.checkConvItem(convId)) {
                    //如果对话已存在，直接触发
                    scope.$broadcast('conversations.trigger_' + convId);
                } else {
                    //如果不存在，先做标记，"日后"打开
                    scope.waitForConvId = convId;
                }
            };

            /**
             * 更新对话列表未读数
             */
            o.updateConvUnreadNum = function(convId, num) {
                scope.updateConvUnreadNum(convId, num);
            };

            /**
             * 更新公众号置顶
             */
            o.updateDisplayOrder = function() {
                var conversationIds = CurUserDB.getDisplayOrder();
                CurUserDB.getDisplayOrder()
                .then(function(onFulfilled, onRejected) {
                    ConversationListServ.get({
                            by_list: onFulfilled.join(',')
                        },
                        function(e){
                            var convId;
                            for(var i = 0; i < e.items.length; i++){
                                convId = e.items[i].id;
                                var disOrder = e.items[i].display_order;
                                if (!angular.isNumber(disOrder)) {
                                    //服务器返回默认值是  null
                                    disOrder = -1;
                                }
                                //将新的排序存入服务器
                                CurUserDB.updateConv(convId, {
                                    display_order: disOrder
                                });
                            };
                        },
                        function() {}
                    );
                });
            };

            //更新撤回消息
            o.updateRevokeMessage = function(data,currentConvId) {
                var msgId = data.data[0].message_id;
                var convId = data.data[0].conversation_id;
                var str = $(".conversation-wrap .con-box div.item[data-id='"+ msgId +"']");
                var uid = data.data[0].revoker_id;
                var uname = Cache.get('user_'+uid).name;
                var msgBody = uname+'撤回了一条消息';
                UserLoaderServ.currentUser().then(function(act){
                    var currentUId = act.id;
                    if(uid === currentUId){
                        msgBody = '你撤回了一条消息';
                    }

                    CurUserDB.getMessage(msgId).then(function(msg){
                        msg.body=msgBody;
                        msg.system=true;
                        msg.message_type='text_message';
                        return CurUserDB.saveMessages([msg]);
                    }).then(function(){
                        //获取当前对话框中的最后一条消息ID
                        
                        CurUserDB.getConvList(convId)
                        .then(function(conv){
                            var lastMessageId = conv.last_message.id;

                            //判断最后一条消息
                            if(msgId === lastMessageId){
                                var tmpConv = conv;
                                tmpConv.last_message.body = msgBody;
                                tmpConv.last_message.system = true;
                                tmpConv.last_message.message_type='text_message';

                                //发送广播
                                $rootScope.$broadcast('conversations.newMessage_' + convId, tmpConv);
                                //更新数据库
                                return CurUserDB.saveConvList([tmpConv]);
                            };
                        });
                        var actConvId = currentConvId;
                        if(actConvId === convId){
                            str.find(".content").html("<p>"+ msgBody +"</p>");
                            str.addClass('system');
                        }
                    });
                });
            };

            //获取对话列表的所有对话（包括单聊、群聊、公共号等）
            o.getConvList = function() {
                return scope.items;
            };
            o.destroy=function(){
                scope&&scope.$destroy();
            }

            return o;
        }
    ])

/**
 * 获取对话列表中指定对话的数据
 */
.factory('RealtimeMsgHandler', ['$rootScope','CurUserDB', 'Cache', 'ConversationBinder',
    'ConversationListBinder', 'SidebarNavBinder', 'Storage','AppRootBinder','OcusLoader','GLOBAL_SETTING','$http','NotificationsServ','$location','NewMsgFlashBinder',
    function($rootScope,CurUserDB, Cache, ConversationBinder, ConversationListBinder,
        SidebarNavBinder, Storage,AppRootBinder,OcusLoader,GLOBAL_SETTING,$http,NotificationsServ,$location,NewMsgFlashBinder) {
        return function(DATA,remind) {
            var selfId = Storage.getUser('id'); //获取自己的id
            var data = angular.copy(DATA);
            var msg = data.items[0];
            var isSystemMsg = msg.system; //是否是系统消息
            var isSelfMsg = msg.sender_id === selfId; //消息发送人是不是自己
            var refs = data.references;
            var convId = msg.conversation_id;
            var currentConvId = ConversationBinder.getCurrentConvId();
            var convData, convCache;
            var msgNetworkId = msg.network_id;
            var curNetworkId = Storage.getUser('networkId');

            //将references中的数据存入Cache，并处理其中对话数据的未读数
            convData = _.findWhere(refs, {
                type: "conversation"
            });
            //收到新消息 给弹出新消息小窗Notification提醒
            $rootScope.$broadcast('notification_show', convData);

            //convData.last_message = msg;
            //如果是对话数据，而且消息不是系统消息，尝试从缓存获取此对话
            convCache = Cache.get('conversation_' + convData.id);
            //先初始化未读数
            convData.unread_count = convCache ? (convCache.unread_count || 0) : 0;
            //如果当前消息是系统消息或自己发的消息，未读数不变，否则+1
            convData.unread_count = (isSystemMsg || isSelfMsg) ? convData.unread_count : ++convData.unread_count;

            // convCache = Cache.put('conversation_' + convData.id, convData); 这个地方不能更新缓存，否则数据库操作的时候用于判断的cache已经被污染
            if(isSystemMsg){
                var url = GLOBAL_SETTING.URL + '/api/v1/conversations/'+convData.id
                $http({
                    url: url,
                    method: 'get'
                }).success(function (data, status, headers, config) {
                    var refs = data.references;
                    if(!refs.length) return;
                    $.each(refs, function(index, val) {
                        Cache.put('user_' + val.id,val);
                    });
                    CurUserDB.saveReferences(refs);
                })
            }
            

            //如果消息推送的对话就是当前打开的对话，未读数直接清0
            if (convId === currentConvId&&AppRootBinder.winFocused()) {
                convData.unread_count = 0;
            }

            //由于对话的last_message的消息可能不是当前推送的消息
            //所以将当前推送消息id赋值到对话的last_message的id属性
            //方便用来比较两次last_message的id，来决定是否增加未读数
            convData.last_message.id = msg.id;

            // var increaseTotalUnreadNum=function(){
            //     console.info('increaseTotalUnreadNum');
            //     //先获取当前未读数
            //     var unreadMsgCount = SidebarNavBinder.getMessageUnreadNum();
            //     unreadMsgCount = unreadMsgCount ? unreadMsgCount + 1 : 1;
            //     //存入数据库
            //     CurUserDB.convsUnreadNum(unreadMsgCount);
            //     //设置界面中的消息全局未读数
            //     //SidebarNavBinder.setMessageUnreadNum(unreadMsgCount);
            //     var convIds = [];
            //     var convsUnreadNum = {};
            //     var _unread = 0;
            //     //防止频繁调用,最多0.5秒钟调用一次
            //     //var throttled = _.throttle(function() {
                    
            //         CurUserDB.getConvList()
            //         .then(function(convs) {
            //             //初始化全局未读数
            //             for (var i = 0, len = convs.length; i < len; i++) {
            //                 if(!convs[i].category_id && convs[i].remind == true){
            //                     _unread += convs[i].unread_count;
            //                 }
            //             }
            //             SidebarNavBinder.setMessageUnreadNum(_unread);
            //         });
            //     //},
            //     //500);
            // }
            //如果改分类更换并且分类下无公众号，则删除分类
            var carlogChange = function(){
                CurUserDB.getConvList()
                .then(function(data){
                    var convs = new Array();
                    for(var i = 0; i < data.length; i++){
                        if(data[i].category_id == convCache.category_id){
                            convs.push(data[i]);
                        }
                    }
                    if(convs == ''){
                        ConversationBinder.removeConv('catlogId_'+ convCache.category_id);
                    }
                });
            }
            
            if (convCache) {//判断分类否是更换
                var catlogChangeBool = convData.category_id === convCache.category_id ? true : false;
            }

            var _category =  Cache.get('category_' + convData.category_id);
            if(convData.category_id && !_category){
                var url = GLOBAL_SETTING.URL + '/api/v1/conversations/'+convData.id
                $http({
                    url: url,
                    method: 'get'
                }).success(function (data, status, headers, config) {
                    var refs = data.references;
                    if(!refs.length) return;
                    for(var i = 0;i < refs.length; i++){
                        if(refs[i].id === convData.category_id){
                            _category = refs[i];
                        }
                    }
                    Cache.put('category_' + convData.category_id,_category);
                    saveMsg(refs);
                })
            }else{
                saveMsg(refs);
            }
            //保存message
            function saveMsg(refs){
                CurUserDB.saveMessages([msg])
                .then(function() {
                    //保存references到数据库
                    return CurUserDB.saveReferences(refs);
                })
                .then(function() {
                    //更新数据库中的conversation数据
                    CurUserDB.saveConvList([convData]).then(function(){
                              //如果推送的消息network_id不是当前社区，不在界面上处理
                                if (msgNetworkId !== curNetworkId) return;
                                //渲染更新界面中的对话
                                var ele = $(".box:eq(1)");
                                var boxIsShow = ele.attr("isshow");
                                //如果分类存在并且没有打开，发送分类壳的conv
                                if(convData.category_id && boxIsShow == 'false'){
                                    var catlogData = Cache.get('conversation_catlogId_' + convData.category_id);
                                    var allUnread = SidebarNavBinder.getMessageUnreadNum();
                                    if(catlogData && convData.remind == false){
                                        catlogData.unread_count = catlogData.unread_count-1;
                                    }
                                    catlogData.conv_remind = convData.remind;
                                    ConversationListBinder.realtimeManage(catlogData);
                                }
                                else if(convData.category_id && boxIsShow == 'true'){
                                    var catlogData = Cache.get('conversation_catlogId_' + convData.category_id);
                                    var cutconv = ele.find(".item").data('id');
                                    var cutCatlogData = Cache.get('conversation_' + cutconv);
                                    catlogData.conv_remind = convData.remind;
                                    //判断是否在当前分类下
                                    if(convData.category_id != cutCatlogData.category_id){
                                        ConversationListBinder.realtimeManage(catlogData);
                                    }else{
                                        ConversationListBinder.realtimeManage(convData);
                                        if(convData.remind == false){
                                            catlogData.unread_count = catlogData.unread_count-1;
                                        }
                                        $rootScope.$broadcast('conversations.newMessage_catlogId_' + convData.category_id, catlogData);
                                    }
                                }
                                else{
                                    ConversationListBinder.realtimeManage(convData);
                                }

                                if (msg.conversation_id === currentConvId) {
                                    //如果消息推送的对话就是当前打开的对话，处理对话消息
                                    ConversationBinder.realtimeMessage(msg);
                                }
                                //需要增加数字的条件
                                //非系统消息，非自己发送的消息，会话需要提醒，不是当前打开的会话，或者是当前打开的会话，但是没有聚焦到前台
                                //
                                //
                                // if (!isSystemMsg && !isSelfMsg&&convData.remind&&(convId!=currentConvId||(convId===currentConvId&&!AppRootBinder.winFocused()))) {
                                //     increaseTotalUnreadNum()
                                // }



                                if(catlogChangeBool === false && convCache.category_id && convData.category_id){
                                    

                                    //分别 获取 新老 category_id
                                    var newCatelogId = 'catlogId_' + convData.category_id;
                                    var oldCatelogId = 'catlogId_' + convCache.category_id;
                                    //分别 获取 新老 未读数
                                    var newUnreadData = Cache.get('conversation_'+newCatelogId);
                                    var oldUnreadData = Cache.get('conversation_'+oldCatelogId);
                                    
                                    var newUnread = newUnreadData.unread_count + convData.unread_count - 1;
                                    var oldUnread = oldUnreadData.unread_count - convCache.unread_count;

                                    newUnread = newUnread < 0 ? 0 : newUnread;
                                    oldUnread = oldUnread < 0 ? 0 : oldUnread;

                                    //设置新老分类未读数
                                    
                                    CurUserDB.updateConvUnread(newCatelogId, newUnread);
                                    CurUserDB.updateConvUnread(oldCatelogId, oldUnread);
                                    setTimeout(function(){
                                        ConversationListBinder.updateConvUnreadNum(newCatelogId, newUnread);
                                        ConversationListBinder.updateConvUnreadNum(oldCatelogId, oldUnread);
                                    }, 10);

                                    carlogChange();
                                }
                                else if(convCache && !convCache.category_id && convData.category_id){
                                    //判断conv是从未分类到分类
                                    var convId = convData.id;
                                    var catelogId = 'catlogId_' + convData.category_id;
                                    var unreadData = Cache.get('conversation_'+catelogId);
                                    var unreadCound = unreadData.unread_count;
                                    if(!unreadData){
                                        unreadCound = 0;
                                    }
                                    var unread = unreadCound + convData.unread_count - 1;

                                    setTimeout(function(){
                                        ConversationListBinder.updateConvUnreadNum(catelogId, unread);
                                    }, 10);

                                    //清除列表中重复的conv
                                    $rootScope.$broadcast('removeConvsItem', convId);

                                    carlogChange();
                                }else if(convCache && convCache.category_id && !convData.category_id){
                                //判断conv是从分类到未分类
                                    var catelogId = 'catlogId_' + convCache.category_id;
                                    var catelogData = Cache.get("conversation_"+catelogId);
                                    var unread = catelogData.unread_count - convCache.unread_count;
                                    setTimeout(function(){
                                        ConversationListBinder.updateConvUnreadNum(catelogId, unread);
                                    }, 10);
                                    carlogChange();
                                }


                    });

                   
                })
            }
        }
    }
])

/**
 * 基于某条最后接收到的消息获取最新消息，references里有对话数据
 */
.factory('ConversationListServ', ['$resource', 'Storage', 'GLOBAL_SETTING',
    function($resource, Storage, GLOBAL_SETTING) {

        var o = {};
        var request = require('request');

        
        // 用angular方式去请求到出现from_last_seen请求失败，所以使用request请求
        o.get =  function(params,success,err){
            params.network = Storage.getUser('networkId');
            params.limit = '200';
            var token = Storage.getToken().access_token;
            var uriType =  '/from_last_seen';
            if(params.by_list){
                uriType =  '';
            }
            var url = GLOBAL_SETTING.URL + GLOBAL_SETTING.api_context + 'conversations'+ uriType +'?network='+Storage.getUser('networkId')+'&limit=400';
            
            if(params.last_seen_message_id){
                url += '&last_seen_message_id='+params.last_seen_message_id;
            }else if(params.by_list){
                url += url + '&by_list='+params.by_list;
            }else{
                url += url + '&last_seen_message_id=';
            }

            var requestOptions = {
                headers:{'AUTHORIZATION':'bearer ' + token,'USER_AGENT':'MinxingMessenger pc_client'},
                method: 'get',
                url: url
            }

            request(requestOptions, function(error, response, body) {
                var data = eval('(' + body + ')');
                console.info('data ============== ', data);
                if (!error && response.statusCode == 200) {
                    return success(data);
                } else {
                    return err();
                }
            }) 
        }
        return o;

        //由于现在使用node请求，angular请求暂时废除。
        // return $resource(url, {
        //     limit: 200,
        //     network: Storage.getUser('networkId'),
        //     uriType: '@uriType'
        // });
    }
])

.factory('ConversationListLoaderServ', ['$http', '$q', 'ConversationListServ', 'CurUserDB', 'SidebarNavBinder', 'Storage', 'ConversationLoaderServ', 'ConversationListBinder', 'AppRootBinder','ConversationBinder', 'Cache', '$rootScope',
    function($http, $q, ConversationListServ, CurUserDB, SidebarNavBinder, Storage,
        ConversationLoaderServ, ConversationListBinder, AppRootBinder,ConversationBinder, Cache, $rootScope) {
        var service = {};
        var delay;
        var convsData = {};
        var time1 = new Date().getTime();
        var selfId = Storage.getUser('id');
        var needRefreshConversation;


        /**
         * 根据当前数据库对话列表初始化全局未读数
         * @param convs[Array]: 对话数组列表
         */
        function _initGolbalUnread(newConvs) {
            //new_convs都是新增的消息
            var newConvIds=_.pluck(newConvs,"id");
             CurUserDB.getConvList().then(function(dbConvs){
                //获取到服务器会话后，需要跟新的会话比较，选取本地未读会话，并且不在本次请求服务器返回的新会话列表中
                  var localUnreadConvs = _.filter(dbConvs, function(conv) {
                        return conv.unread_count > 0 && _.indexOf(newConvIds,conv.id)==-1;
                    });
                  console.info('localUnreadConvs', localUnreadConvs);
                  //根据所有会话计算未读数
                  var updateConversUnreadNum=function(allConvs){
                     var count = _.reduce(allConvs, function(memo, conv) {
                        return memo + (conv.remind&&!conv.category_id ? conv.unread_count : 0);
                    }, 0);
                     //设置界面中的消息全局未读数
                    SidebarNavBinder.setMessageUnreadNum(count);
                    //存入数据库
                    CurUserDB.convsUnreadNum(count);
                  }
                _unreadMsgsHandler(localUnreadConvs).then(function(changedUnreadConvs) {
                    //先要把第一次服务器返回的和第二次服务器返回的数据进行合并和排序，这些都是有变化的新会话
                    newConvs=newConvs.concat(changedUnreadConvs);
                   
                   
                    if(newConvs.length){
                      CurUserDB.saveConvList(newConvs).then(function(newConvs){
                       var newConvIds=_.pluck(newConvs,"id");
                        //把本地数据库中旧的会话移除掉
                        dbConvs=_.reject(dbConvs,function(conv){return _.indexOf(newConvIds,conv.id)!=-1});
                        var allConvs=dbConvs.concat(newConvs); //计算后的会话是所有的会话，包括了数据库中和服务器返回的

                        updateConversUnreadNum(allConvs);
                             delay.resolve({convs:allConvs,newConvs:newConvs});

                                  if (needRefreshConversation){
                                         ConversationBinder.trigger(needRefreshConversation,true);
                                  }
                        });
                    }else{
                        updateConversUnreadNum(dbConvs);
                        delay.resolve({convs:dbConvs,newConvs:newConvs});
                    }
                  
                    
                })
             });


        }

        /**
         * 根据当前对话列表中的未读数，获取服务器同步未读数
         */
        function _unreadMsgsHandler(convs) {
            var convIds = [];
            var new_convs=[];
            var convsUnreadNum = {};
            var mdelay = $q.defer();
            if (!convs.length) mdelay.resolve(convs);

            var getted = function(data) {
                var currentConvId=ConversationBinder.getCurrentConvId();
                var items = data.items;
                //与服务器的比较是否影响本地数字的变化
                var unreadCountChanged = false;
                //遍历获取到的对话数据，取相对小的未读数
                for (var i = 0,item, len = items.length; i < len; i++) {
                    item=items[i];
                    if (convsUnreadNum[item.id] > item.stats.unread_messages_count) {
                        item.unread_count = item.stats.unread_messages_count;
                        new_convs.push(item);
                    }

                    if (item.stats.unread_messages_count < 0||item.id==currentConvId) {
                        item.unread_count = 0;
                        new_convs.push(item);
                    }
                }
       

                mdelay.resolve(new_convs);
            }

            //遍历获取那些有未读数的对话
            for (var i = 0, len = convs.length; i < len; i++) {
                convIds.push(convs[i].id);
                //保存本地的历史未读数，用于跟服务器返回的数字进行比较
                convsUnreadNum[convs[i].id] = convs[i].unread_count;
            }

            if (convIds.length) {
                //本地存在未读会话，需要到服务器获取这些未读会话是否有未读变化
                ConversationListServ.get({
                        by_list: convIds.join(',')
                    },
                    getted,
                    function() {}
                );
            } else {
                mdelay.resolve(convs);
            }
            return mdelay.promise;
        }

        function _convsWorker(data) {
            //传递的是新增的消息
            var msgs = data.items;
            var refs = data.references;
            var conversations = [];
            var convsHaveCount;
            var curConv = Cache.get('curent_convsation');
            //如果没有获取到新的消息，直接从数据库找到数据处理
            if (!msgs.length && !refs.length) {
                        _initGolbalUnread([]);
                return;
            }

            //先将消息存入数据库
            CurUserDB.saveMessages(msgs).then(function() {
                //存conversation
                var convs = _.where(refs, {
                    type: "conversation"
                });
                console.info('先将消息存入数据库', convs);
                if(curConv){
                    $.each(msgs, function(index, val) {
                        if(curConv == val.conversation_id){
                            //广播发送last
                            $rootScope.$broadcast('outLineLastSeen', msgs, curConv);
                            convs[0].unread_count = 0;
                            return false;
                        }
                    });
                }
                //检测当前打开的会话是否有更新，如果有更新，需要重新刷新一下,记录到一个临时变量中，等页面未读数字更新完成以后，再进行会话详情页面的刷新
                var currentConvId=ConversationBinder.getCurrentConvId();
                var existConversation=_.findWhere(convs,{id:currentConvId});
                if(existConversation){
                    needRefreshConversation=existConversation;
                }else{
                    needRefreshConversation=null;
                }
                _initGolbalUnread(convs);
                return CurUserDB.saveReferences(refs);
            });

        }

        /**
         * 从服务器获取最新未读消息
         * @param lastMsgId[Number]: 数据库中最后一条消息id
         */
        function _getConvsFromServer(lastMsgId) {
            var params = lastMsgId ? {
                last_seen_message_id: lastMsgId
            } : {};
            //增加uri参数
            

            //获取新消息列表，references里有对话数据
            ConversationListServ.get(params,
                function(data, status, headers, config) {
                    //处理对话列表数据
                    _convsWorker(data);
                },
                function() {
                    //服务器请求异常，比如网络有问题，直接加载本地的
                    AppRootBinder.connected(false)
                    _convsWorker({
                        items: [],
                        references: []
                    });
                });
        }

        /*
         * 获取对话列表
         */
        service.load = function() {
            delay = $q.defer();
            if (AppRootBinder.connected()) {
                
                var status = 'offline';
                var offLineMsgId = Storage.getLatestMessageId(status);
                console.info('service.load', offLineMsgId);
                if(offLineMsgId && offLineMsgId != 0){
                    _getConvsFromServer(offLineMsgId);
                    offLineMsgId = 0;
                    Storage.setLatestMessageId(offLineMsgId, status);
                }else{
                    //联网状态，需要从服务器loading一下最新消息
                    _getConvsFromServer(Storage.getLatestMessageId())
                };
            } else {
                //直接从本地加载
                _convsWorker({
                    items: [],
                    references: []
                });
            }
            return delay.promise;
        };

        return service;
    }
])

/*
 * 检查缓存的对话列表中是否有匹配的对话
 * @params user_ids[Array]: 需要匹配的用户id集合数组
 * @return 如果存在，返回item对象，不存在返回false或undefined
 */
.factory('CheckListCache', ['Cache', 'Storage', 'CurUserDB',
        function(Cache, Storage, CurUserDB) {
            return function(user_ids) {
                //必须将数组中的id转换为数值类型
                if (typeof user_ids[0] === 'string') {
                    user_ids.forEach(function(ele, i) {
                        user_ids[i] = Number(ele);
                    });
                }

                CurUserDB.getReferences({
                    type: 'conversation'
                })

                var items = Cache.get('list').items;
                var selfId = Storage.getUser('id');
                var uIds = removeSelfId(user_ids);
                var item;

                //过滤掉当前用户ID，并返回数组副本
                function removeSelfId(ids) {
                    var ids = ids.slice(0); //确保复制出新数组，而不是引用
                    var selfIdIdx = ids.indexOf(selfId);

                    //如果存在当前用户ID，需要把其删掉
                    if (selfIdIdx !== -1) {
                        ids.splice(selfIdIdx, 1);
                    }

                    return ids;
                };

                //将用户ID排序，以便后面比较
                uIds = uIds.sort(function(a, b) {
                    return a - b
                });

                items.some(function(ele) {
                    var ids = removeSelfId(ele.user_ids.ids);
                    var sortIds = ids.sort(function(a, b) {
                        return a - b
                    });

                    if (sortIds.join(',') === uIds.join(',')) {
                        item = ele;
                        return true;
                    }

                    return false;
                });

                return item;
            };
        }
    ])
    /*
     * 创建要追加到对话列表的新对话项
     */
    .factory('NewConversationItem', ['$rootScope', 'ConversationListBinder', 'Cache',
        function($rootScope, ConversationListBinder, Cache) {
            return function(data) {
                var convId = data.items[0].conversation_id;
                var item, itemData;
                //如果已存在对话项，则退出
                if (ConversationListBinder.checkConvItem(convId)) return Cache.get('conversation_' + convId);

                if (convId) {
                    //寻找对话数据项
                    item = Cache.get('conversation_' + convId);
                    item.unread_count = 0;
                } else {
                    item = data.items[0];
                }
                //模拟新对话列表项的数据，以便追加到对话列表中
                /*itemData = {
                    items: [item],
                    meta: {},
                    references: refs
                }*/
                //广播"追加新对话项"事件
                $rootScope.$broadcast('conversations.prependItem', item);

                return item;
            }
        }
    ])
    /*
     * 更新缓存中的对话列表
     */
    .factory('updateConvListCache', ['Cache', '$filter', function(Cache, $filter) {
        return function(msg) {
            var refsFilter = $filter('referencesFilter');
            var cacheList = Cache.get('list');
            var items = cacheList.items;
            var meta = cacheList.meta;
            var references = cacheList.references;

            //过滤掉重复的对话项
            items = items.filter(function(ele) {
                return ele.id !== msg.items[0].id;
            });

            //将新对话项插入
            items.unshift(msg.items[0]);

            //更新references数据
            references = refsFilter(references, msg.references);

            //存入缓存
            Cache.put('list', {
                items: items,
                meta: meta,
                references: references
            })
        }
    }])
    /*
     *  转发选择器
     */
    .factory('selectConversationsItemBinder', ['Cache', '$filter', function(Cache, $filter) {
            var o = {};
            var that, scope;

            o.bind = function($scope) {
                that = this;
                scope = $scope;
            };

            o.forwardMsg = function(msgId) {
                scope.forwardMsg(msgId);
            };
            return o;
        }
    ])