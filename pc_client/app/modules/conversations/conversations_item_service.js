'use strict';

angular.module('mx.conversations.item')
    /*
     * 对话服务
     */
    .factory('ConversationBinder', ['ConversationLoaderServ', 'CheckListCache', '$location', 'RootscopeApply',
        'ConversationAboutOcu', '$q', 'PopMessage', '$rootScope', 'GroupMembersServ',
        'ConversationServ', '$route', 'ConversationListBinder', 'CoversationSingleUser',
        'NewConversationItem', 'CurUserDB', 'Cache', 'Storage', 'SearchResultBoxBinder', 'SearchInputBinder', 'PublisherBinder','SidebarNavBinder','GLOBAL_SETTING','$http',
        function(ConversationLoaderServ, CheckListCache, $location, RootscopeApply, ConversationAboutOcu, $q, PopMessage,
            $rootScope, GroupMembersServ, ConversationServ, $route, ConversationListBinder, CoversationSingleUser,
            NewConversationItem, CurUserDB, Cache, Storage, SearchResultBoxBinder, SearchInputBinder, PublisherBinder,SidebarNavBinder,GLOBAL_SETTING,$http) {
            var o = {};
            var scope, triggerData;



            //检查并跳转到对话界面
            var checkLocation = function() {
                //跳转至对话界面
                if ($location.path() === '/main') {
                    return true;
                } else {
                    RootscopeApply($rootScope, function() {
                        $location.path('/main');
                    });
                    return false;
                }
            };

            //请求单聊对话数据
            var reqSingleConvData = function(userId) {
                var delay = $q.defer();

                //请求单聊item数据
                CoversationSingleUser(userId)
                    .then(function(data) {
                        reqSingleConv(data.id);
                    }, function(err) {
                        PopMessage.err(err);
                    });

                return delay.promise;
            };

            //请求单聊对象完整数据(包含references)
            var reqSingleConv = function(convId) {
                CurUserDB.getConvList(convId)
                    .then(function(convData) {
                        o.trigger(convData);
                    }, function() {
                        ConversationServ.get({
                                id: convId
                            },
                            function(data, status, headers, config) {
                                CurUserDB.saveConvList(data.items).then(
                                    function() {
                                        CurUserDB.saveReferences(data.references)
                                            .then(function() {
                                                //在对话列表创建新对话项
                                                NewConversationItem(data);
                                                //触发此对话
                                                o.trigger(data.items[0]);
                                            })

                                    }
                                )

                            },
                            function(data, status, headers, config) {
                                PopMessage.err(err);
                            }
                        );
                    });
            }

            /**
             * 打开一个ocu对话
             */
            var openOcuConv = function(ocuId) {
                var data, hasCache;
                ConversationAboutOcu(ocuId)
                    .then(function(d) {
                        data = d;
                        hasCache = Cache.get('conversation_' + d.items[0].id);
                        return CurUserDB.saveReferences(data.references);
                    })
                    .then(function() {
                        var isOpenOcu = true;
                        //存储对话列表
                        CurUserDB.saveConvList(data.items,isOpenOcu)
                        .then(function(){
                            //渲染更新界面中的对话
                            var ele = $(".box:eq(1)");
                            var boxIsShow = ele.attr("isshow");
                            var convData = data.items[0];
                            //如果分类存在并且没有打开，发送分类壳的conv
                            if(convData.category_id && boxIsShow == 'false'){
                                var catlogData = Cache.get('conversation_catlogId_' + convData.category_id);
                                ConversationListBinder.realtimeManage(catlogData);
                                trigger(catlogData);
                            }
                            else if(convData.category_id && boxIsShow == 'true'){
                                var catlogData = Cache.get('conversation_catlogId_' + convData.category_id);
                                var cutconv = ele.find(".item").data('id');
                                var cutCatlogData = Cache.get('conversation_' + cutconv);
                                //判断是否在当前分类下
                                if(convData.category_id != cutCatlogData.category_id){
                                    ConversationListBinder.realtimeManage(catlogData);
                                }else{
                                    ConversationListBinder.realtimeManage(convData);
                                    $rootScope.$broadcast('conversations.newMessage_catlogId_' + convData.category_id, catlogData);
                                }
                                trigger(catlogData);
                            }
                        });
                    })
                    .then(function() {
                        //在对话列表创建新对话项
                        if (!hasCache) {
                            NewConversationItem(data);
                        }
                        //触发此对话
                            o.trigger(data.items[0]);
                        
                    });
            };

            //发送选中公众号分类信息
            var checkCategory = function(trgData){
                $rootScope.$broadcast('category', trgData);
            }

            //查找并打开对话
            var checkOpenConv = function() {
                if(triggerData.user_id){
                    var idStr = String(triggerData.user_id).split(',')
                }else{
                    var idStr = String(triggerData.id).split(',');
                }
                //var convData = CheckListCache(idStr);
                var convData;

                //如果是新建群聊(发起聊天添加成员形成的群聊，2人以上)，则不查找列表，直接创建
                if (triggerData.type === 'new_conv' && triggerData.is_multi_user) {
                    setTimeout(function() {
                        scope.createNewConv();
                    }, 4);
                    return;
                };

                //如果对话已存在于对话列表中，则打开
                if (convData) {
                    //如果是新发起的聊天，没有完整triggerData
                    //则把获取到的对话项数据存入triggerData，以便后续渲染聊天信息
                    if (/user|new_conv/.test(triggerData.type)) {
                        triggerData = scope.triggerData = convData;
                    }

                    //打开对话
                    openConv(convData);
                    return;
                }

                //如果是ocu
                if (triggerData.type === 'ocu') {
                    openOcuConv(triggerData.id);
                    return;
                }

                if (triggerData.type === 'user') {
                    //如果是创建单用户聊天(单聊)，则需要请求单聊数据
                    reqSingleConvData(idStr[0]);
                    return;
                }

                //否则新建对话
                setTimeout(function() {
                    scope.createNewConv();
                }, 4);
            };

            //是否锁定当前对话(比如正在上传附件，不允许切换对话)
            o.locked = false;

            function bind($scope) {
                scope = $scope;

                //绑定服务时，有可能已经预存了对话触发数据，如果有数据，则触发对话
                //已把改逻辑挪到conversations_list_directive.js的scopeWorker()内
                /*if (triggerData) {
                    trigger(triggerData);
                    scope.convId = triggerData.id;
                }*/
            }

            //触发对话
            function trigger(trgData, forceLoad) {
                // o.scrolledToBottom(true);
                triggerData = trgData;
                //检查并跳转到对话界面
                //如果当前不是main界面，则预存triggerData
                //等待界面加载之后在list_directive中的scopeWorker执行
                // if (!checkLocation()) {
                //     return;
                // }
                
                //跳转至对话界面
                if ($location.path() === '/main') {
                    //return true;
                } else {
                    RootscopeApply($rootScope, function() {
                        $location.path('/main');
                    });
                    //return false;
                }

                //如果当前对话处于锁定状态，取消后续逻辑(目前上传附件的时候会锁定)
                if (o.locked) {
                    return;
                }

                try {
                    //关闭群成员面板
                    GroupMembersServ.closePanel();
                    //关闭搜索列表
                    SearchResultBoxBinder.close();
                    SearchInputBinder.empty();
                } catch (e) {}

                var type = trgData.type;
                scope.triggerData = trgData;
                switch (type) {
                    case 'conversation':
                        openConv(trgData, forceLoad);
                        break;
                    case 'user':
                        checkOpenConv(trgData);
                        break;
                    case 'ocu':
                        checkOpenConv(trgData);
                        break;
                    case 'new_conv':
                        //自动发空消息创建对话
                        createEmptyConv().then(function(){
                             checkOpenConv(trgData);
                        });
                        break;
                    case 'category':
                        checkCategory(trgData);
                        break;
                }
            }

            /**
             * 创建空群聊对话，发送空body内容即可
             */
            function createEmptyConv() {
                 var delay = $q.defer();
                if (scope.triggerData.type !== 'new_conv') {
                    delay.reject();
                    return;
                }
                var user_id = scope.triggerData.user_id;
                var dept_id = scope.triggerData.dept_id;
                //通过发送空消息到群聊接口即可创建新对话
                ConversationServ.save({
                    direct_to_user_ids: user_id,
                    direct_to_dept_ids: dept_id
                }, function(data, status, headers, config) {
                    var convId = data.items[0].conversation_id;
                    //将新数据存入数据库
                    CurUserDB.saveReferences(data.references)
                        .then(function() {
                             delay.resolve();
                            //将新对话数据存入数据库
                            var conv = _.findWhere(data.references, {
                                type: "conversation"
                            });
                            return CurUserDB.saveConvList([conv]);
                        })
                        .then(function() {
                            //保存消息到数据库
                            return CurUserDB.saveMessages(data.items);
                        })
                        .then(function() {
                            //广播发布新消息事件(此创建其实就是发送了一个空消息)
                            $rootScope.$broadcast('conversation.publish', data);
                        });
                }, function(data, status, headers, config) {
                    delay.reject();
                    PopMessage.err({
                        message: data.data.errors.message
                    });
                });
                return delay.promise;
            }

            /*
             * 打开对话
             * param data[Object]: 对话的完整数据对象
             */
            function openConv(data, forceLoad) {
                var currentConvId = o.getCurrentConvId();
                if ((!data || data.id == currentConvId) && !forceLoad) return;
                scope.loading = true;
                var params = {
                    id: data.id,
                    network_id: data.network_id
                };

                var trgData = data;

                //标记未读数("通知"对话需要标记"以下是未读通知",所以需要知道未读数)
                scope.unreadNum = triggerData.unread_count || 0;

                //获取对话内容
                ConversationLoaderServ.request(params)
                .then(function(data) {
                    //打开新会话之前，需要处理一下草稿
                    var currentPubisherContent = PublisherBinder.content().trim();
                    if (currentConvId) {
                        //初次打开应用的时候，currentConvId为空
                        CurUserDB.updateConv(currentConvId, {
                            draft: currentPubisherContent
                        }).then(function() {
                            refreshConvItem(currentConvId);
                        });
                    }

                    //从缓存中查找打开的会话，是否具有草稿，有草稿，需要把内容填充到输入框
                    var targetConversation = Cache.get("conversation_" + triggerData.id);
                    PublisherBinder.content(targetConversation && targetConversation.draft ? targetConversation.draft : "");

                    scope.loaded(data);
                    scope.data = data;
                    //广播触发对话的事件
                    setTimeout(function() {
                        if(ConversationListBinder.checkConvItem(triggerData.id)){
                            $rootScope.$broadcast('conversations.trigger_' + triggerData.id);
                        }else{
                            ConversationListBinder.realtimeManage(trgData);
                            $rootScope.$broadcast('conversations.trigger_' + triggerData.id);
                        }
                        
                    }, 4);
                    
                    // return CurUserDB.saveConvList([triggerData]);
                }, function(err) {
                    PopMessage.err(err);
                    scope.loading = false;

                    if (err.status === 403 && !ConversationListBinder.checkConvItem(triggerData.id)) {
                        //如果要打开的对话无权限，打开第一个对话
                        ConversationListBinder.openFirstConv();
                    }
                });
            }

            function moreConv() {
                var delay = $q.defer();
                var params = {
                    id: scope.convId,
                    older_than: scope.lastId,
                    network_id: scope.networkId
                }

                //标记为正在加载
                scope.loading = true;

                var loaded = function(data) {
                    scope.moreConv(data);
                    delay.resolve();
                };

                //开始请求更多对话内容
                ConversationLoaderServ.request(params)
                    .then(function(data) {
                        // console.info(params, data);
                        loaded(data);
                    }, function(data) {
                        delay.resolve(data);
                        scope.loading = false;
                    });

                return delay.promise;
            }

            //修改群聊名称
            function changeName(newName) {
                var id = triggerData.id;
                var delay = $q.defer();

                ConversationServ.save({
                        id: id,
                        _method: 'put',
                        name: newName
                    },
                    function(data, status, headers, config) {
                        //console.info('修改成功', data);
                        delay.resolve(data);
                    },
                    function(data, status, headers, config) {
                        PopMessage.err(data);
                        delay.reject(data);
                        //console.info('修改失败', data);
                    });

                return delay.promise;
            }

            //退出群聊
            function quit(id) {
                //如果传递了id，使用传递进来的，否则直接使用triggerData,打开的conversation
                var id = id || triggerData.id;

                ConversationServ.remove({
                        id: id
                    },
                    function(data, status, headers, config) {
                        //服务器删除成功后，删除本地数据
                        removeConv(id);

                    },
                    function(data, status, headers, config) {
                        PopMessage.err(data);
                        //console.info('退出失败', data);
                    });
            }

            /**
             * 处理推送消息
             * @param msgData[Object]: 推送的消息对象数据
             */
            function realtimeMessage(msgData) {
                scope.realtimeMessage(msgData);
            }

            function clear() {
                triggerData = null;
                scope.convId = null;
                scope.triggerData = null;
                scope.data = null;
            }

            //获取对话数据
            function getConvData() {
                return scope.data;
            }

            //获取触发对话的对象数据
            function getTriggerData() {
                return scope.triggerData || triggerData;
            }

            function getCurrentConvId() {
                if(!scope) return null;

                return scope.convId || null;
            }

            /**
             * 获取单聊对话中对方的用户ID(用于点对点传输)
             */
            function getOppositeUserId() {
                var t = getTriggerData();
                var selfId = Storage.getUser('id');
                var id;

                if (t.is_multi_user) return null;

                t.user_ids.ids.some(function(ele) {
                    if (ele !== selfId) {
                        id = ele;
                        return true;
                    }
                });
                return id;
            }



            //锁定对话
            function lock() {
                o.locked = true;
            }

            //解锁对话
            function unlock() {
                o.locked = false;
            }

            //返回当前对话是否是基础公众号(不可以发消息)
            function isBasicOcu() {
                return scope.isBasicOcu;
            }

            //用来存储p2p文件传输状态
            var p2pfileState = {};
            /**
             * 更新p2p文件传输状态
             * @param msgId[Number]: 消息id
             * @param state[Object]: 传输状态
             */
            function updateP2PFileState(msgId, state) {
                if (!msgId) return;

                //保存状态，方便消息对象获取当前状态
                p2pfileState[msgId] = state;
                //广播传输状态
                scope.$broadcast('p2pfile_state_' + msgId, state);
            }

            /**
             * 获取p2p文件传输状态
             */
            function getP2PFileState(msgId) {
                return p2pfileState[msgId];
            }

            /**
             * 获取当前作用域信息
             */
            function getConvItem(){
                return scope.conversation.items;
            }

            /**
             * 更新当前作用域信息
             */
            function updataConvItem(msgId, data){
                var msgs = scope.contents = scope.conversation.items;
                msgs.some(function(ele, i) {
                    if (ele.id === msgId) {
                        RootscopeApply(scope, function() {
                            scope.conversation.items[i] = data;
                        });
                        return true;
                    }
                });
            }

            /**
             * 移除某条消息
             */
            function removeMsg(msgId) {
                var msgs = scope.contents = scope.conversation.items;
                var msgId = parseInt(msgId);
                var convId = getCurrentConvId();
                var index = '';

                msgs.some(function(ele, i) {
                    if (ele.id === msgId) {
                        index = i;
                        RootscopeApply(scope, function() {
                            msgs.splice(i, 1);
                        });
                        CurUserDB.removeMsg(msgId);
                    }
                });

                CurUserDB.getConvList(convId)
                .then(function(conv){
                    var lastMessageId = conv.last_message.id;
                    var tmpConv = conv;
                    //判断最后一条消息
                    if(msgId === lastMessageId){
                        if(index-1>-1) {
                            tmpConv.last_message = scope.conversation.items[index-1];
                        }else{
                            tmpConv.last_message.body = '';
                        }
                        
                        //发送广播
                        $rootScope.$broadcast('conversations.newMessage_' + convId, tmpConv);
                        //更新数据库
                        return CurUserDB.saveConvList([tmpConv]);
                    };
                });
            }
            /**
             * 移除会话
             */
            function removeConv(convId) {
                var currentConvId=getCurrentConvId();
                //从对话列表删除当前对话
                var toRemoveConv = Cache.get("conversation_" + convId);
                ConversationListBinder.removeConvItem(convId).then(function() {
                    //判断是否需要重新计算未读数字
                    if (toRemoveConv.remind&&toRemoveConv.unread_count&&!toRemoveConv.category_id) {
                        //删除的会话如果还有未读数字，需要减去被删除会话的未读，并存入数据库
                        var freshUnreadCount = Math.max(0, SidebarNavBinder.getMessageUnreadNum() - toRemoveConv.unread_count);
                        //存入数据库
                        CurUserDB.convsUnreadNum(freshUnreadCount);
                        //设置界面中的消息全局未读数
                        SidebarNavBinder.setMessageUnreadNum(freshUnreadCount);
                    }
                    //clear();
                    //删除了正在打开的会话
                    if (currentConvId == convId) ConversationListBinder.openFirstConv();
                })
            }

            function toggleToppedAt(convId) {
                var delay = $q.defer();
                var conv = ConversationListBinder.getConvItem(convId);
                if (conv.topped_at == -1 || !conv.topped_at) {
                    //置顶
                    conv.topped_at = new Date().getTime();
                } else {
                    //取消置顶
                    conv.topped_at = -1;
                }
                CurUserDB.updateConv(convId, {
                    topped_at: conv.topped_at
                }).then(function() {
                    refreshConvItem(convId);
                    delay.resolve();
                });
                return delay.promise;
            }

            //开启/取消消息提醒
            function messageReminder(convId) {
                var delay = $q.defer();
                var conv = ConversationListBinder.getConvItem(convId);
                var allUnread = SidebarNavBinder.getMessageUnreadNum();

                //var convData =  Cache.get("conversation_"+convId);
                var catelogData,catelogId,catelogUnread;
                if(conv.category_id){
                    catelogId = 'catlogId_'+conv.category_id;
                    catelogData = Cache.get('conversation_'+catelogId);
                }

                var currentUnread = conv.unread_count;

                var _remind = true;
                if(conv.category_id && conv.remind == true){
                    catelogUnread = catelogData.unread_count - currentUnread;
                    ConversationListBinder.updateConvUnreadNum(catelogId, catelogUnread);
                    _remind = false;
                }else if(conv.category_id && conv.remind == false){
                    catelogUnread = catelogData.unread_count + currentUnread;
                    ConversationListBinder.updateConvUnreadNum(catelogId, catelogUnread);
                }else if (conv.remind == true) {
                    SidebarNavBinder.setMessageUnreadNum(allUnread-currentUnread);
                    _remind = false;
                }else{
                    SidebarNavBinder.setMessageUnreadNum(allUnread+currentUnread);
                };


                var url = GLOBAL_SETTING.URL + '/api/v1/conversations/'+ convId +'/setting';
                $http({
                    method: 'put',
                    url: url
                }).success(function(data) {
                    delay.resolve(data);
                }).error(function(err) {
                    delay.reject(err);
                });
                
                // ConversationServ.save({
                //     id: convId,
                //     _method: 'put',
                //     remind: _remind,
                //     type: 'setting',
                // },
                // function(data, status, headers, config) {
                //     //console.info('修改成功', data);
                //     delay.resolve(data);
                // },
                // function(data, status, headers, config) {
                //     PopMessage.err(data);
                //     delay.reject(data);
                //     //console.info('修改失败', data);
                // });

                CurUserDB.updateConv(convId, {
                    remind: _remind
                }).then(function() {
                    refreshConvItem(convId);
                    delay.resolve();
                });

                return delay.promise;

            }


            
            function refreshConvItem(convId) {
                //刷新会话列表上对应会话元素的草稿状态
                $rootScope.$broadcast('conversations.newMessage_' + convId, Cache.get("conversation_" + convId));
            }


            //返回对外方法集合
            o = {
                bind: bind,
                trigger: trigger,
                createEmptyConv: createEmptyConv,
                openConv: openConv,
                moreConv: moreConv,
                changeName: changeName,
                quit: quit,
                realtimeMessage: realtimeMessage,
                clear: clear,
                getConvData: getConvData,
                getTriggerData: getTriggerData,
                getCurrentConvId: getCurrentConvId,
                getOppositeUserId: getOppositeUserId,
                checkCategory:checkCategory,
                lock: lock,
                unlock: unlock,
                isBasicOcu: isBasicOcu,
                updateP2PFileState: updateP2PFileState,
                getP2PFileState: getP2PFileState,
                removeMsg: removeMsg,
                removeConv: removeConv,
                toggleToppedAt: toggleToppedAt,
                getConvItem: getConvItem,
                updataConvItem: updataConvItem,
                messageReminder:messageReminder
            };

            return o;
        }
    ])
    /*
     * conversation的请求
     */
    .factory('ConversationServ', ['$resource', 'GLOBAL_SETTING', function($resource, GLOBAL_SETTING) {
        var URL = GLOBAL_SETTING.URL;
        var URI = '/api/v1/conversations/:id/:type';
        return $resource(URL + URI, {
            id: '@id',
            type: '@type',
            limit: 10
        });
    }])

/*
 * 获取conversation
 */
.factory('ConversationLoaderServ', ['$rootScope', 'ConversationServ', '$q', 'Storage', 'CurUserDB',
    'Cache',
    function($rootScope, ConversationServ, $q, Storage, CurUserDB, Cache) {
        var service = {};
        var delay;

        service.conversation = {};
        service.moreConv = {};

        //从服务器获取
        function _getFromServer(params) {
            ConversationServ.get(params,
                function(data, status, headers, config) {
                    //将新数据存入数据库
                    CurUserDB.saveReferences(data.references)
                        .then(function() {
                            //把数据存入数据库
                            CurUserDB.saveMessages(data.items);
                        }).then(function() {
                            delay.resolve(data);
                        })
                },
                function(data, status, headers, config) {
                    delay.reject(data);
                }
            );
        }

        //从数据库获取
        function _getFromDB(params) {
            var delay = $q.defer();

            CurUserDB.getMessages(params)
                .then(function(data) {
                    delay.resolve(data);
                }, function(err) {
                    //delay.resolve([]);
                    delay.reject();
                });

            return delay.promise;
        }

        service.request = function(params) {
            delay = $q.defer();
            var convData = {};
            var networkId = Storage.getUser('networkId');
            var convId = params.id;
            //设置对话类型
            params.type = 'messages';

            //补充network_id参数
            if (!params.network_id) params.network_id = networkId;

            /*if (params.older_than) {
                _getFromServer(params);
            } else {
                _getFromDB(params);
            }*/

            //从数据库获取对应消息数组
            _getFromDB(params)
                .then(function(msgs) {
                    convData.items = msgs;
                    // console.info('获取到的消息数组', msgs);
                    delay.resolve(convData);
                }, function() {
                    var convCache = Cache.get('conversation_' + convId);
                    if (convCache && !convCache.last_message) {
                        //如果缓存中有此对话，而且没有last_message字段
                        //说明是新建的单聊对话，返回空消息集合即可
                        convData.items = [];
                        delay.resolve(convData);
                    } else {
                        _getFromServer(params);
                    }
                });

            return delay.promise;
        }

        /**
         * 获取指定对话列表(带有未读数)
         * @param convsStr[String]: 用逗号","分隔的对话id字符串
         */
        /*service.getConvsByCount = function(convsStr) {
            if (typeof convsStr !== 'string') return;
            var delay = $q.defer();

            ConversationServ.get({by_list:convsStr},
                function(data) {
                    delay.resolve(date);
                }, function(err) {
                    delay.reject(err);
                })

            return delay.promise;
        };*/

        return service;
    }
])



/*
 * conversation的请求
 */
.factory('ConversationAboutOcu', ['$http', 'GLOBAL_SETTING', '$q', function($http, GLOBAL_SETTING, $q) {
        return function(ocuId) {
            var url = GLOBAL_SETTING.URL + '/api/v1/conversations/about_ocu/' + ocuId;
            var delay = $q.defer();

            $http({
                method: 'GET',
                url: url
            }).success(function(data) {
                delay.resolve(data);
            }).error(function(err) {
                delay.reject(err);
            });

            return delay.promise;
        }
    }])
    /*
     * 提交最后浏览的消息
     */
    .factory('ConversationLastSeen', ['$http', 'GLOBAL_SETTING', '$q', function($http, GLOBAL_SETTING, $q) {
        return function(postData) {
            var url = GLOBAL_SETTING.URL + '/api/v1/messages/last_seen';
            var delay = $q.defer();

            $http({
                method: 'POST',
                url: url,
                data: postData
            }).success(function(data) {
                delay.resolve(data);
            }).error(function(err) {
                delay.reject(err);
            });

            return delay.promise;
        }
    }])
    /*
     * 处理对话内容时间间隔
     */
    .service('ConversationMoment', function() {
        var moment = global.moment;
        var preDate = null;

        this.moment = function(date) {
            var date = moment(date).valueOf();
            var intervalMin = 0;

            if (typeof date !== 'number') {
                return false;
            }

            if (!preDate) {
                preDate = date;
                return;
            }

            intervalMin = moment(date - preDate).minute();

            preDate = date;

            if (intervalMin >= 3) {
                //console.log('超过三分钟！');
                return true;
            }

            return false;
        };
    })
    /*
     * 请求单聊数据信息(如果对话列表不存在此单聊，就发送请求)
     */
    .factory('CoversationSingleUser', ['$q', 'GLOBAL_SETTING', '$http',
        function($q, GLOBAL_SETTING, $http) {
            return function(userId) {
                var delay = $q.defer();
                var url = GLOBAL_SETTING.URL + '/api/v1/conversations/to_user/' + userId;

                $http({
                    method: 'GET',
                    url: url
                }).success(function(data) {
                    delay.resolve(data);
                }).error(function(err) {
                    delay.reject(err);
                });

                return delay.promise;
            };
        }
    ])
    /*
     * 创建模拟文件数据消息的消息数据对象
     */
    .factory('NewFileMessage', ['GLOBAL_SETTING', 'Storage', 'ConversationBinder', 'Cache',
        function(GLOBAL_SETTING, Storage, ConversationBinder, Cache) {
            var defaultMsg = {
                content_type: null,
                conversation_id: 0,
                created_at: '',
                direct_to_user_id: 0,
                download_url: '',
                //file_id: 1395,
                icon: 'unknown',
                id: 0,
                message_type: 'p2p_file',
                name: 'index.html.erb',
                network_id: 0,
                open_preview_url: '',
                preview: false,
                processed: true,
                sender_id: 0,
                size: 0,
                system: false,
                p2p: true,
                //thumbnail_url: "/uploaded_file_versions/1449/thumbnail",
                type: 'message',
                reciever_rtcid: null,
                sender_rtcid: null
            };

            return function(fileParams) {
                var fileMsgData = angular.copy(defaultMsg);
                var convId = ConversationBinder.getCurrentConvId();
                var convData = Cache.get('conversation_' + convId);
                var selfId = Storage.getUser('id');
                var selfData = Cache.get('user_' + selfId);
                var otherData = Cache.get('user_' + fileParams.direct_to_user_id);
                var otherId = otherData.id;
                var otherRtcId = easyrtc.usernameToIds(String(otherId));
                var netId = Storage.getUser('networkId');
                var msgId = new Date().getTime();
                var data = {
                    items: [],
                    references: []
                };

                //实时初始化文件消息数据字段
                fileMsgData.conversation_id = convId;
                fileMsgData.sender_id = selfId;
                fileMsgData.network_id = netId;
                fileMsgData.id = msgId;
                fileMsgData.created_at = global.moment(new Date()).format();
                fileMsgData.reciever_rtcid = otherRtcId[0].easyrtcid;
                fileMsgData.sender_rtcid = easyrtc.myEasyrtcid;

                //设置对话的最后消息数据
                convData.last_message = fileMsgData;
                convData.updated_at = fileMsgData.created_at;

                //将自己id也放入对话数据，方便对方用户也能加载对话数据的用户
                if (convData.user_ids.ids.indexOf(selfId) === -1) {
                    convData.user_ids.ids.push(selfId);
                }

                //将传递的消息字段赋值到数据对象中
                for (var i in fileParams) {
                    if (fileParams.hasOwnProperty(i)) {
                        fileMsgData[i] = fileParams[i];
                    }
                }

                //模拟正经的消息推送数据格式
                data.items[0] = fileMsgData;
                data.references.push(convData);
                data.references.push(selfData);
                data.references.push(otherData);
                return data;
            };
        }
    ])