'use strict';
angular.module('mx.services.DB', [])

/**
 * 当前登录用户对应的数据库
 * ====== 注意 ======
 * 如果要更新数据库表结构，请修改db_config.js文件中的"version"字段
 * 并把修改的表结构更新到"structure"字段内
 * 如果不更新此文件，将无法顺利在用户机器更新数据库表
 * ==================
 * 其中会保存以下数据表:
 *          @store current_user: 当前用户数据表，其中会包含三个以dbstore_name为索引的数据项:
 *                @item current_user: 当前用户的用户信息
 *                @item realtime: 对话列表推送频道，包含meta
 *                @item global_unread: 全局未读数统计数据
 *          @store conversations: 对话列表数据，保存所有对话项，不包含每个对话里的消息
 *          @store messages: 对话消息数据，保存
 *          @store references: 索引数据集合(用户、对话、ocu等)
 */
.factory('CurUserDB', ['$q', '$resource', 'GLOBAL_SETTING', 'Storage', '$filter', 'Cache', 'TipsPopBinder','$http',
    function($q, $resource, GLOBAL_SETTING, Storage, $filter, Cache, TipsPopBinder,$http) {
        var o = {};
        var conversaionsFilter = $filter('ConvItemsFilter');
        var refsFilter = $filter('referencesFilter');
        //当前用户的数据库
        var db = null,
            currentUser = null,
            initedCache = false;
        //创建会话查看历史消息的resource对象
        var ConversationMessages = $resource(GLOBAL_SETTING.URL + GLOBAL_SETTING.api_context + "conversations/:conv_id/messages");
        //保留本地conversation对象上面的一些属性，避免被服务器上覆盖
        var _keepConvLocalAttrs = function(conv) {
                var cachedConv = Cache.get("conversation_" + conv.id);
                if (!cachedConv) return;
                var keepedAttrs = ['draft', 'topped_at','call_me'];
                for (var i = 0, l = keepedAttrs.length; i < l; i++) {
                    var attr = keepedAttrs[i];
                    if (cachedConv[attr]) {
                        //保存conversation的时候能够保留草稿属性
                        conv[attr] = cachedConv[attr];
                    }
                }

            }

        var _fillConvDefaultValue=function(conv){
            if (!_.isNumber(conv.display_order)) {
                    conv.display_order = -1;
                }
                if (!_.isNumber(conv.topped_at)) {
                    conv.topped_at = -1;
                }

                if (!_.isNumber(conv.unread_count)) {
                    conv.unread_count = conv.stats.unread_messages_count;
               } 
        }
            /**
             * 初始化数据库，一般用于客户端刚打开(用户登录后)时打开数据库
             * @param upgradeTask[Object]: 一些更新数据表的配置项
             *            .type[Number]: 数据表处理类型 {0: 默认普通初始化; 1: 更新数据表; 2: 新建对话消息表}
             *            .v[Number]: 数据库初始化版本号，大于当前version的话，会触发"onupgradeneeded"事件
             *            .upgradeCB[Function]: 更新数据表回调函数
             *            .successCB[Function]: 数据库初始化成功回调函数
             */
        o.init = function(upgradeTask) {
            var initDelay = $q.defer();
            if (db) {
                initDelay.resolve();
            } else {
                try {

                    currentUser = Storage.getUser('currentUser');
                    db = new Dexie("account_" + currentUser.account_id);

                    db.version(1).stores({
                        references: "[id+type],type",
                        conversations: "id,network_id",
                        messages: "[created_at+id],id,conversation_id,created_at",
                        current_user: "dbstore_name"
                    });
                    db.version(2).stores({
                        references: "[id+type],type",
                        conversations: "id,network_id,ocu_id",
                        messages: "[created_at+id],id,conversation_id,created_at",
                        current_user: "dbstore_name"
                    });
                    db.version(3).stores({
                        references: "[id+type],type",
                        conversations: "id,network_id,ocu_id,category_id",
                        messages: "[created_at+id],id,conversation_id,created_at",
                        current_user: "dbstore_name"
                    });
                    db.version(4).stores({
                        references: "[id+type],type",
                        conversations: "id,network_id,ocu_id,category_id",
                        messages: "[created_at+id],id,conversation_id,created_at",
                        current_user: "dbstore_name",
                        file:"&id"
                    });
                    db.open().then(function() {
                        console.log("db opended");
                        initDelay.resolve();
                    }, function(e) {
                        console.error("db opended error", e);
                        initDelay.reject();
                    });
                } catch (e) {
                    console.error("db init error", e.stack || e);
                    initDelay.reject();
                }
            }
            return initDelay.promise;
        };

        //关闭当前数据库
        o.closeDB = function() {
            if (!db) return;
            db.close();
            db = null;
        };


        /**
         * 保存当前用户数据
         */
        o.saveCurUser = function(userData) {
            var delay = $q.defer();
            db.transaction('rw', db.current_user, function() {
                userData.dbstore_name = 'current_user';
                Cache.put('current_user', userData);
                db.current_user.put(userData);
                delay.resolve();
            }).catch(function(err) {
                // Catch any error event or exception and log it:
                console.error(err.stack || err);
                delay.reject();
            });
            return delay.promise;
        };

        /**
         * 保存references数据到数据库
         * @param refs[Array]: references数组
         */
        o.saveReferences = function(refs) {
            var delay = $q.defer();

            if (!refs) {
                delay.resolve();
                return;
            }
            db.transaction('rw', db.references, function() {
                for (var i = 0, len = refs.length; i < len; i++) {
                    if (refs[i].type == "conversation") {
                        continue;
                    }
                    db.references.put(refs[i]);
                    //保存到cache中
                    Cache.put(refs[i].type + '_' + refs[i].id, refs[i]);
                }
                delay.resolve();
            }).catch(function(err) {
                console.error(err.stack || err);
                delay.reject();
            });


            return delay.promise;
        };

        /**
         * 获取指定references
         * @param params[Object]: 获取参数
         *              .id[Number]: id值
         *              .type[String]: 类型
         * @return[Array] 返回指定匹配的references对象数组
         */
        o.getReferences = function(params) {
            var delay = $q.defer();
            var id = params && params.id;
            var type = params && params.type;



            if (!id && type) {
                db.references.where("type", type).then(function(refs) {
                    delay.resolve(refs);
                    return;
                })
            } else if (type && id) {
                //先尝试从缓存中获取
                var cacheResult = Cache.get(type + '_' + id);
                if (cacheResult) {
                    delay.resolve([cacheResult]);
                    return;
                }

                db.references.where("[id+type]").equals([id, type]).toArray(function(refs) {
                    delay.resolve(refs);
                    return;
                })
            } else {
                //如果什么都没传
                db.references.toArray(function(refs) {
                    delay.resolve(refs);
                    return;
                });
            }



            return delay.promise;
        };

        /**
         * 保存对话列表数据
         * type 为 来源
         */
        o.saveConvList = function(convsArr,type) {
            console.log("db save convs",convsArr,type);
            var delay = $q.defer();
            db.transaction('rw', db.conversations, function() {
                for (var i = 0, conv, cachedConv,l = convsArr.length; i < l; i++) {
                    conv = convsArr[i];
                    cachedConv = Cache.get('conversation_' + conv.id);
                    // if(!cachedConv){
                    // }else{
                      _keepConvLocalAttrs(conv);
                    // }
                       _fillConvDefaultValue(conv)
                    db.conversations.put(conv);
                    //更新缓存
                    Cache.put("conversation_" + conv.id, conv);

                    var _category =  Cache.get('category_' + conv.category_id);
                    //创建虚拟公众号分类 conv
                    if(_category && _.isNumber(conv.category_id)){

                        var catlog =  Cache.get('conversation_catlogId_' + conv.category_id);
                        var _remind = true;
                        if(_category.display_type === 0){
                            _remind = false;
                        }
                        
                        //设置未读数
                        var catlogUnread;
                        var unreadNum = 0;
                        if(catlog){
                            unreadNum= catlog.unread_count;
                            var catlogTopped = catlog.topped_at > conv.topped_at ? catlog.topped_at : conv.topped_at;
                            if(!_.isNumber(catlogUnread)){
                                catlogUnread = 0;
                            }
                        }else{
                            catlogUnread = 0;
                        }
                        if(!type){
                            if(cachedConv){ 
                                unreadNum = unreadNum + (conv.unread_count-cachedConv.unread_count);
                            }else{
                                unreadNum = unreadNum + conv.unread_count;
                            }
                        }
                        var _conv = {
                            id : 'catlogId_' + conv.category_id,
                            name : _category.name,
                            avatar_url : _category.avatar_url,
                            type: "category",
                            network_id: conv.network_id,
                            display_order: conv.display_order,
                            topped_at: catlogTopped,
                            updated_at: conv.updated_at,
                            message_order:conv.message_order,
                            last_message:conv.last_message,
                            user_ids:conv.user_ids,
                            remind:_remind,
                            unread_count:unreadNum,
                            catlog_id:conv.category_id,
                            conv_remind:true
                        };
                        db.conversations.put(_conv);

                        //更新缓存
                        Cache.put("conversation_" + _conv.id, _conv);
                    }
                }
                return delay.resolve(convsArr);
            }).catch(function(err) {
                console.error(err.stack || err);
                return delay.reject();
            });


            return delay.promise;
        };

        /**
         * 获取对话列表数据
         * [@param] convId[Number]: 对话ID
         */
        o.getConvList = function(convId) {
             console.log("db get convs",convId);

            var delay = $q.defer();
            if (convId) {
                db.conversations.get(convId, function(conversation) {
                    if (conversation) {
                        delay.resolve(conversation);
                    } else {
                        delay.reject();
                    }
                    return;
                })
            } else {
                if(currentUser.network_id) 
                db.conversations.where("network_id").equals(currentUser.network_id).toArray(function(conversations) {
                    /** 过滤app_message START **/
                    var noAppMessage = [];
                    $.each(conversations, function(index, val) {
                        _fillConvDefaultValue(val);//理论上存到数据库应该都是正确数据
                        if(val.last_message && val.last_message.message_type != 'app_message'){
                            noAppMessage.push(val);
                        }
                    });
                    conversations = noAppMessage;
                    conversations = $filter('orderBy')(conversations, ['display_order', 'topped_at', 'updated_at'], true);
                    /** 过滤app_message END **/

                    if (!initedCache) {
                        //需要初始化缓存
                        o.getReferences().then(function(refs) {
                            //初始化reference
                            for (var i = 0, ref, l = refs.length; i < l; i++) {
                                ref = refs[i];
                                Cache.put(ref.type + "_" + ref.id, ref)
                            }
                            //初始化conversation
                            for (var i = 0, conv, l = conversations.length; i < l; i++) {
                                conv = conversations[i];
                                Cache.put("conversation_" + conv.id, conv)
                            }
                            initedCache = true;
                            delay.resolve(conversations);
                        });

                    } else {
                        delay.resolve(conversations);
                    }


                })

            }

            return delay.promise;  
        };

        //获取 conversations id
        o.getDisplayOrder = function(){
            var delay = $q.defer();
            var ocuIdArr = new Array();
            db.conversations.where("ocu_id").above(0).toArray(function(e) {
                for(var g = 0; g < e.length;g++){
                    ocuIdArr.push(e[g].id);
                };
                delay.resolve(ocuIdArr);
            });
            return delay.promise;
        }

        //删除对话(conversations表 & references表)
        o.removeConv = function(convId) {
            var delay = $q.defer();

            var catelogData = Cache.get('conversation_'+convId);

            if(catelogData.catlog_id){
                var catelogId = catelogData.catlog_id;
                o.removeCatelog(catelogId);
            }

            db.transaction('rw', db.conversations, db.messages, db.references, function() {
                //删除会话
                db.conversations.where("id").equals(convId).delete().then(function() {
                    //清楚会话缓存,避免再次来新消息的时候，未读数字有问题
                    Cache.remove("conversation_"+convId);
                    //删除消息
                    return db.messages.where("conversation_id").equals(convId).delete();
                }).then(function() {
                    //删除refs表
                    return db.references.where("[id+type]").equals([convId, "conversation"]).delete();

                }).then(function() {
                    delay.resolve();
                })

            }).catch(function(err) {
                console.error(err.stack || err);
                return delay.reject();
            });

            return delay.promise;
        };

        //删除分类(conversations表 & references表)
        o.removeCatelog = function(catelogId) {
            var delay = $q.defer();

            db.transaction('rw', db.conversations, db.messages, db.references, function() {
                //删除会话
                db.conversations.where("category_id").equals(catelogId).delete().then(function() {
                    o.getConvList()
                    .then(function(data){
                        var convId;
                        for(var i = 0; i < data.length; i++){
                            if(data[i].category_id == catelogId){
                                convId = data[i].id;
                                Cache.remove("conversation_"+convId);
                                db.messages.where("conversation_id").equals(convId).delete();
                                db.references.where("[id+type]").equals([convId, "conversation"]).delete();
                            }
                        }
                    });
                }).then(function() {
                    delay.resolve();
                })

            }).catch(function(err) {
                console.error(err.stack || err);
                return delay.reject();
            });

            return delay.promise;
        };

        /**
         * 已读某对话所有消息处理，会将对应对话的未读数清零
         * @param convId[Number]: 对话id
         */
        o.updateConvUnread = function(convId, num) {
            var delay = $q.defer();
            var unreadNum = num || 0;
            return o.updateConv(convId, {
                unread_count: num
            });
        };
        o.updateConv = function(convId, data) {
            var delay = $q.defer();
            db.transaction('rw', db.conversations, function() {
                db.conversations.update(convId, data).then(function() {
                    db.conversations.get(convId, function(newConv) {
                        Cache.put("conversation_" + convId, newConv);
                        delay.resolve(newConv);
                    })
                })
            }).catch(function(err) {
                console.error(err.stack || err);
                delay.reject(err);
            });


            return delay.promise;
        };
        /**
         * 保存消息数据
         * @param convId[Number]: 对话id
         * @param msgs[Array]: 消息数组
         */
        o.saveMessages = function(msgs) {
            var delay = $q.defer();
            db.transaction('rw', db.messages, function() {
                for (var i = 0, l = msgs.length; i < l; i++) {
                    var msg=msgs[i];
                    if(msg.message_type=="notice_message"){
                        msg.body="@所有人\r\n"+msg.body;
                    }
                    db.messages.put(msg);
                }
                delay.resolve(msgs);
                //更新缓存
                msgs = _.sortBy(msgs, "id");
                var latestMessage = _.last(msgs);
                if (latestMessage && latestMessage.message_type != "p2p_file") {
                    Storage.setLatestMessageId(_.last(msgs).id);
                }
            }).catch(function(err) {
                console.error(err.stack || err);
                return delay.reject();
            });

            return delay.promise;
        };

        //根据id获取消息
        o.getMessage = function(id){
            var delay = $q.defer();
            var dateArr;
            db.messages.where("id").equals(id).first(function(msg) {
                delay.resolve(msg);
            });
            return delay.promise;
        }

        /**
         * 获取消息数据集合
         * @param params[Object]: 获取配置
         *              .id[Number]: 对话id
         *              .limit[Number]: 获取数量
         *              .older_than[Number]: msg标记，从此id的msg之后开始获取
         */
        o.getMessages = function(params) {
             console.log("db get messages",params);

            var delay = $q.defer();
            var convId = params.id;
            var count = params.limit || 20;
            var olderThan = params.older_than;
            var successResolve = function(messages) {
                if (messages.length==0) {
                    //需要从服务器获取历史数据
                    var reqParams = {
                        conv_id: params.id
                    };
                    if (params.older_than) reqParams.older_than = params.older_than;
                    ConversationMessages.get(reqParams, function(response) {
                        //更新导数据中 
                        var messages = response.items,
                            references = response.references;
                        o.saveMessages(messages).then(function() {
                            o.saveReferences(references).then(function() {
                                delay.resolve(messages);
                            })
                        })


                    },function(){
                        //获取异常,返回空数据;
                        delay.resolve(messages);
                    })

                } else {
                    delay.resolve(messages);
                }


            }
            if (!olderThan) {
                db.messages.where("conversation_id").equals(convId).limit(count).reverse().toArray(function(messages) {
                    successResolve(messages)
                });
            } else {
                db.messages.where("conversation_id").equals(convId).and(function(message) {
                    return message.id < olderThan;
                }).limit(count).reverse().toArray(function(messages) {
                    successResolve(messages)
                });
            }


            return delay.promise;
        };

        //删除消息(messages表)
        o.removeMsg = function(msgId) {
            var delay = $q.defer();

            db.transaction('rw', db.messages, function() {
                db.messages.where("id").equals(msgId).delete().then(function() {
                    //todo 是否需要删除缓存
                    return delay.resolve();
                })

            }).catch(function(err) {
                console.error(err.stack || err);
                return delay.reject(err);
            });

            return delay.promise;
        };

        /**
         * 更新对话中的消息数据
         * @param msgData[Object]: 消息数据
         */
        o.updateMsg = function(id, msgData) {
            var delay = $q.defer()
            db.transaction('rw', db.messages, function() {
                // db.messages.update(id, msgData).then(function(e) {
                //     console.info('db  e:', e, msgData);
                //     delay.resolve(msgData);
                // })

                db.messages.update([msgData.created_at, id], msgData).then(function(e) {
                    delay.resolve(msgData);
                })

                
            }).catch(function(err) {
                console.error(err.stack || err);
                delay.reject(err);
            });

            return delay.promise;

        };

        /**
         * 对话未读数数据库处理
         * [@param] num[Number]: 未读数
         */
        o.convsUnreadNum = function(num) {
            return Storage.convsUnreadNum(num);
        };

        /**
         * 保存文件下载数据
         */
        o.saveDownloadFile = function(fileData){
            var delay = $q.defer();
            db.transaction('rw', db.file, function() {
                db.file.put(fileData);
                Cache.put('file_'+fileData.id,fileData);
                delay.resolve();
            }).catch(function(err) {
                // Catch any error event or exception and log it:
                console.error(err.stack || err);
                delay.reject();
            });
            return delay.promise;
        }

        /**
         * 获取文件下载数据
         */
        o.getDownloadFile = function(fileId){
            var delay = $q.defer();
            if (fileId) {
                //先尝试从缓存中获取
                var cacheResult = Cache.get('file_'+fileId);
                if (cacheResult) {
                    delay.resolve(cacheResult);
                    return delay.promise;
                }

                db.file.where("id").equals(fileId).first(function(fileData) {
                    delay.resolve(fileData);
                });
            } else {
                //如果什么都没传
                db.file.toArray(function(files) {
                    delay.resolve(files);
                    return delay.promise;
                });
            }
            return delay.promise;
        }

        /**
         * 更新文件下载数据
         */
        o.updateDownloadFile = function(fileId, fileData){
            console.info('fileId', fileId, fileData);
            var delay = $q.defer()
            db.transaction('rw', db.file, function() {
                db.file.update([fileId], fileData).then(function() {
                    Cache.put('file_'+fileId,fileData);
                    delay.resolve(fileData);
                })
            }).catch(function(err) {
                console.error(err.stack || err);
                delay.reject(err);
            });
            return delay.promise;
        }

        /**
         * 删除文件下载数据
         */
        o.removeDownloadFile = function(fileId){
            var delay = $q.defer();
            db.transaction('rw', db.file, function() {
                db.file.where("id").equals(fileId).delete().then(function() {
                    //todo 是否需要删除缓存
                    Cache.remove("file_"+fileId);
                    return delay.resolve();
                })
            }).catch(function(err) {
                console.error(err.stack || err);
                return delay.reject(err);
            });
            return delay.promise;
        }
        /**
        *根据内容搜索消息
        */
        o.searchMessages=function(){
           db.messages.orderBy("id").filter(function(message){return /11/.test(message.body)}).toArray().then(function (message) {
                    console.log(message);
           })
        }
        return o;
    }
])