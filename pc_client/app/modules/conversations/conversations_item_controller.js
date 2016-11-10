'use strict';

angular.module('mx.conversations.item')
	/*
	 * 整个对话面板控制器
	 */
	.controller('ConversationCtrl',
		['$scope', '$rootScope','GLOBAL_SETTING', '$injector', 'NewConversationItem', 'PublisherBinder',
		'ConversationBinder', 'OcuBtnsBinder', 'RootscopeApply', 'conversationInfoBinder', 'ConversationLastSeen',
		'$q', 'SidebarNavBinder', '$location','SetWinSize',  'Cache', 'OcusLoader','AppRootBinder','CurUserDB','ConversationListBinder','Storage',
		function($scope,$rootScope, GLOBAL_SETTING, $injector, NewConversationItem, PublisherBinder,
			ConversationBinder, OcuBtnsBinder, RootscopeApply, conversationInfoBinder, ConversationLastSeen,
			$q, SidebarNavBinder, $location, SetWinSize,  Cache, OcusLoader,AppRootBinder,CurUserDB,ConversationListBinder,Storage) {

			$scope.URL = GLOBAL_SETTING.URL;
			$scope.conIdArr = [];
			var appId = GLOBAL_SETTING.client_id;

			//绑定服务
			$injector.invoke(ConversationBinder.bind, this, {
				$scope: $scope
			});

			//收到实时推送消息
			$scope.realtimeMessage = function(item) {
				var convId = item.conversation_id;
				var data = {items: [item]};
				//如果当前对话ID就是收到的消息对话ID，则触发新消息事件
				if ($scope.convId === convId)  {
					//设置一个setTimeout，让新消息插入DOM的操作按队列的方式进行
					setTimeout(function() {
						//触发新消息事件，追加新消息到当前对话窗口
						var selfId = Storage.getUser('id'); //当前发送者ID
						if(data.items[0] && appId == data.items[0].app_id && selfId == data.items[0].sender_id  && data.items[0].message_type == "text_message") return;
						$scope.$emit('conversation.publish', data);
					}, 50);
					if(AppRootBinder.winFocused()){
						//如果当前应用在前端打开，就要自动发送回执，并且消除数字	
						//发送已读消息请求
						lastSeen(data.items);
						//处理未读数
						// SidebarNavBinder.readedMessage(1, true);
					}
					
				}
			};
			//处理一种情况，就是来信消息的时候，窗口在后台，这时候需要保留未读数字，要不用户不知道哟了新消息
			$rootScope.$on('app.focused', function (e, data) {
				if(data===true){
					//300毫秒以后再自动消除数字，让用户能够看到数字消除的变化，跟qq一样
					setTimeout(function(){
						var curConvId= $scope.convId;
						var curConversation=Cache.get("conversation_" + curConvId);
						if(!curConversation) return;
						var unreadCount=curConversation.unread_count;
						var unreadCount=curConversation&&curConversation.unread_count;
						
						if(unreadCount>0){
							//写回执
							lastSeen();
							//更新会话的
							
							if(curConversation && curConversation.category_id){
								var catelogId = "catlogId_"+curConversation.category_id;
								var catelogConversation=Cache.get("conversation_" + catelogId);
								var catelogUnred = catelogConversation.unread_count - unreadCount;
								ConversationListBinder.updateConvUnreadNum(catelogId,catelogUnred);
							}else{
								ConversationListBinder.updateConvUnreadNum(curConvId,0);
							}

							// //更新数据库,清零当前会话未读数字
							// CurUserDB.updateConvUnread(curConvId,0).then(function(){
							// 	//处理未读数
							// SidebarNavBinder.readedMessage(unreadCount, true);
							// });
							
							
						}
					},300)


				}
			})
			$scope.showFreshTips= function(isShow){
				var box=$("div.con-box");
				if(!_.isBoolean(isShow)){
					var conversationList = box.find(".conv-list");
                        //滚动到底部,需要隐藏新消息提醒的提示
                        if ((box.scrollTop() + box.height()) == conversationList.height()) {
                           box.find(".fresh-tips").hide();
                        }
                        var bottomMessageHeight = conversationList.children().last().height();
                        if ((box.scrollTop() + box.height() + bottomMessageHeight) < conversationList.height()) {
                            //最后一条消息不在可是区域内，算是没有滚动到底部，再次来新消息的时候，需要增加新消息提示 .fresh-tips
                            box.find(".fresh-tips").show();
                        }


					//自动判断是否需要显示
					return;	
				}
				//手动显示或隐藏
				if(isShow){
					box.find(".fresh-tips").show();
				}else{
					box.find(".fresh-tips").hide();
				}
			}
			//检查是否是OCU对话
			var checkOcu = function() {
				var trgData = $scope.triggerData;

				if (trgData.ocu_id || trgData.type === 'ocu') {
					OcuBtnsBinder.init(trgData);
					return true;
				}

				return false;
			};

			//检查account_level是否是basic的OCU，此类OCU不显示publisher
			var checkBasicOcu = function() {
				var trgData = $scope.triggerData;
				var ocu_info = trgData.ocu_info;
				var delay = $q.defer();
				var ocuId, ocu;
				
				if(!ocu_info && trgData.ocu_id){
					var ocuData = Cache.get('ocu_' + trgData.ocu_id);
					if (ocuData) ocu_info = ocuData.ocu_info;
				}
				if (ocu_info && ocu_info.account_level === 'basic') {
					delay.resolve();
				}else {
					delay.reject();
				}
				return delay.promise;
			};

			//处理作用域变量
			var scopeWorker = function(showTips) {
				var conv = $scope.conversation;
				//是否是新建对话
				$scope.isNewConv = conv ? false : true;
				//是公众号
				$scope.isOcu = checkOcu();
				//是否显示publisher
				if ($scope.isOcu) {
					checkBasicOcu()
					.then(function() {
						$scope.isBasicOcu = true;
						PublisherBinder.hide();
					}, function() {
						$scope.isBasicOcu = false;
						PublisherBinder.show();
					})
				} else {
					PublisherBinder.show();
					$scope.isBasicOcu = false;
				}

				//聚焦publisher
				PublisherBinder.focus();
				//标记window为聚焦
				$scope.windowFocused = true;

				//是否显示对话信息
				$scope.showConvInfo = $scope.triggerData.type !== 'new_conv' ? true : false;
				//初始化对话信息
				conversationInfoBinder.init($scope.triggerData);
				$scope.loading = false;

				//如果没取到对话数据，就到此为止，后面是处理对话内容的逻辑
				if (!conv) return;
				var item = conv.items && conv.items[0];

				//如果获取到的对话为空，则单独插入新对话内容
				//用于新创建对话发送的消息，服务期没有及时推送回来的情况
				//todo 其实这个地方是否需要创建模拟数据？？
				if (!item && $scope.triggerData.last_message&& $scope.triggerData.last_message.type=="text_message") {
					item = $scope.triggerData.last_message;
					item.conversation_id = $scope.triggerData.id;
					item.created_at = $scope.triggerData.updated_at;
					conv.items[0] = item;
				}

				//如果有未读数，就将第一个未读的对象标记为未读
				if ($scope.unreadNum && conv.items[$scope.unreadNum - 1]) {
					conv.items[$scope.unreadNum - 1].unreadItem = true;
				}

				$scope.contents = conv.items.reverse();
				//$scope.references = conv.references;
				$scope.convId = item ? item.conversation_id : $scope.triggerData.id;
				$scope.networkId = item && item.network_id ? item.network_id : $scope.triggerData.network_id;
				$scope.lastId = $scope.contents[0] ? $scope.contents[0].id : null;
				$scope.showFreshTips(showTips);
				//清空对话框
                $scope.$on('emptyDialogBox', function (e, emptyDialogBoxBool) {
                    $scope.contents = '';
                    $scope.showConvInfo = false;
                    $scope.isBasicOcu = true;
                });
			};

			//检查新信息是否已在scope内，返回布尔值(true: 已存在此信息; false: 不存在此信息)
			var checkMsg = function(msg) {
				var item = msg.items ? msg.items[0] : msg;
				var hasMsg = function(element, index, array) {
					return (element.id === item.id);
				};

				return $scope.contents && $scope.contents.some(hasMsg);
			};

			//清除当前对话作用域相关数据
			var clear = function() {
				delete $scope.conversation;
				delete $scope.contents;
				delete $scope.references;
				delete $scope.convId;
				delete $scope.networkId;
				delete $scope.lastId;

				//RealtimeServ.clear(1);
			};

			//提交last_seen
			var lastSeen = function(cons) {
				var items = cons || $scope.conversation.items;
				if (items.length === 0) return;
				var message=items[items.length - 1];
				if (message.message_type=="p2p_file") return;
				var feedId = $scope.triggerData ? $scope.triggerData.feed_id : false;
				if(feedId){
					ConversationLastSeen({
						feed_id: feedId,
						message_id: message.id
					}).then(function(data) {
					},function(err){
					});
				}else{
					console.error("丢失feed_id,不发回执,triggerData>>",$scope.triggerData);	
				}
			};

			$scope.$on('outLineLastSeen', function(e, cons, curConv) {
                RootscopeApply($scope, function() {
                    lastSeen(cons);
                });
            });


			$scope.loaded = function(data) {
				var items = data.items;
				$scope.conversation = data;
				//清除之前监听的实时推送
				//RealtimeServ.clear(1);
				//渲染对话消息数据到界面
				scopeWorker();
				//获取最新的未读消息,完成后向服务器标记最后阅读的那条消息
				//pullNewMsgs().finally(lastSeen);
				//如果未读数不为0，发送last_seen请求
				if ($scope.unreadNum) {
					lastSeen();
				}
				
				//实时推送
				//realtime(data.meta);
			}

			$scope.createNewConv = function() {
				RootscopeApply($scope, function() {
					clear();
					scopeWorker();
				});
			};

			/**
			 * 将更多消息渲染到界面中
			 * @param data[Object]: 要渲染进来的消息集合
			 * [@param] type[Number]: 渲染类型,默认值为0{0: 顶端追加(旧消息), 1: 低端追加(新消息)}
			 */
			$scope.moreConv = function(data, type) {
				var moreConv = data;
				var conv = $scope.conversation;

				//如果没有更多内容，进行标记，并返回
				if (!moreConv.items.length && !type) {
					$scope.loading = false;
					$scope.conversation.noMore = true;
					return;
				}

				//把新数据追加到原对话对象中
				if (!type) {
					//如果未传type参数或为0，则为顶端追加
					$scope.conversation.items = conv.items.reverse().concat(moreConv.items);
				} else {
					//追加到底部
					$scope.conversation.items = conv.items.concat(moreConv.items.reverse()).reverse();
				}

				//$scope.conversation.references = conv.references.concat(moreConv.references);
				scopeWorker(false);
			};

			//提交了新消息
			$scope.$on('conversation.publish', function (e, data) {
				//如果已存在此信息，则不再添加
				if (checkMsg(data)) return;

				//检查并插入新对话项(如果列表中没有)到对话列表,会返回对话项数据
				var item = NewConversationItem(data);
				//如果是新对话(无conversation_id)则需渲染对话内容
				if (!$scope.convId) {
					ConversationBinder.trigger(item);
					return;
				}
				// if(data.items[0].body){
				// 	data.items[0].body = data.items[0].body.replace(/</g,'&lt;').replace(/>/g,'&gt;');
				// }
				var conv = $scope.conversation;
				//把新数据追加到原对话对象中
				conv.items = data.items.concat(conv.items.reverse());
				//conv.references = conv.references.concat(data.references);

				if ($scope.$$phase) {
					scopeWorker();
				} else {
					$scope.$apply(scopeWorker);
				}
			});

			//提交了新消息
			$scope.$on('conversation.temp_publish', function (e, data) {
				//如果已存在此信息，则不再添加
				if (checkMsg(data)) return;

				//检查并插入新对话项(如果列表中没有)到对话列表,会返回对话项数据
				var item = NewConversationItem(data);

				//如果是新对话(无conversation_id)则需渲染对话内容
				if (!$scope.convId) {
					//$scope.loaded(data);
					ConversationBinder.trigger(item);
					return;
				}
				data.items[0].body = data.items[0].body.replace(/</g,'&lt;').replace(/>/g,'&gt;');
				var conv = $scope.conversation;
				//把新数据追加到原对话对象中
				conv.items = data.items.concat(conv.items.reverse());
				//conv.references = conv.references.concat(data.references);

				if ($scope.$$phase) {
					scopeWorker();
				} else {
					$scope.$apply(scopeWorker);
				}
				var str = $(".conversation-wrap .con-box div.item[data-id='"+ data.items[0].id +"']");
				str.find('.send-status').addClass('sending');

			});

			//监听退出成功,清除对话数据
		    $scope.$on('logout.success', function() {
		    	SetWinSize(0);
		    	ConversationBinder.clear();
		    	clear();
		    });

		    $scope.$on('$destroy', function() {
		    	// console.info('对话作用域被销毁', $scope);
		    	// setTimeout(function() {
		    	// 	console.log($scope);
		    	// }, 1000);
		    });
		}
	])