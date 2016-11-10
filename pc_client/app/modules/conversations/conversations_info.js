'use strict';
angular.module('mx.conversation.info', [])

.directive('conversationInfoBox', ['GroupMembersServ', 'Storage', '$injector', 'conversationInfoBinder',
	'ConversationBinder', 'TipsPopBinder', 'ConvTitleFilter', 'PopMessage',
	function(GroupMembersServ, Storage, $injector, conversationInfoBinder, ConversationBinder, TipsPopBinder,
		ConvTitleFilter, PopMessage){
		return {
			restrict: 'A',
			replace: false,
			scope: true,
			template:  '<div class="btn-trigger">\
			<a href="#" class="btn-conv-info" title="{{fullName}}" ><span class="group_title" ng-bind-html="name | encodeHTMLTag"></span><span class="user_count" ng-show="userCount">({{userCount}}人)</span></a>\
						</div>\
						<div class="conv-info">\
							<div ng-show="infoData.is_multi_user" class="group-management">\
								<div class="group-name">\
									<i>群聊名称:</i>\
									<span contenteditable="true" ng-bind-html="name | encodeHTMLTag"></span>\
								</div>\
								<button class="quit">删除并退出</button>\
							</div>\
							<group-members ng-show="type != \'ocu\'" class="group-members"></group-members>\
							<ocu-info ng-show="type == \'ocu\'" class="ocu-info">ocu</ocu-info>\
						</div>',
			controller: ['$scope', '$element', function($scope, $element) {
				var convStatus = {};
				var selfId = Storage.getUser('id');

				$scope.infoData = {};

				//绑定服务
				$injector.invoke(conversationInfoBinder.bind, this, {
					$scope: $scope
				});

				var scopeWorker = function(data) {
					//console.info('群聊数据:', data);
					//$scope.name = data.name;
					$scope.fullName = '';
					$scope.type = $scope.isOcu ? 'ocu' : data.type;
					$scope.infoData = data;

					//如果是群聊且没有名字，则统一为群聊
					if (data.is_multi_user && !data.name) {
						$scope.name = '群聊';
						$scope.fullName = data.default_name;
					} else {
						//是群聊有名字或不是群聊
						$scope.name = data.name || data.default_name || ConvTitleFilter('', data);
					}
					// if (data.is_multi_user && !data.name) {
					// 	$scope.name = '群聊';
					// 	$scope.fullName = data.default_name;
					// } else {
					// 	//是群聊有名字或不是群聊
					// 	$scope.name = data.name || data.default_name || ConvTitleFilter('', data);
					// }

					//如果是群聊，则显示人数
					$scope.userCount = data.is_multi_user ? data.user_ids.count : 0;

					if(!$scope.userCount){
						$element.find('.group_title').addClass('none_count');
					}else{
						$element.find('.group_title').removeClass('none_count');
					}

					if ($scope.isNewConv && data.type === 'user') {
						$scope.infoDisabled = true;
					} else {
						$scope.infoDisabled = false;
					}
				};

				this.init = function(data) {
					//先取消禁用
					$scope.infoDisabled = false;

					if ($scope.infoData.id !== data.id) {
						//关闭群成员管理模块
						$scope.close();
						scopeWorker(data);
					}
				};

				/*
				 * 更新对话信息(添加/删除成员后)
				 */
				this.update = function(updateData) {
					//var names = $scope.name.split('、');
					var type = updateData.type;
					var count = updateData.count;
					//var fullName = updateData.fullName;
					//var idx = 0;

					if (count) {
						//$scope.name = fullName;
						$scope.userCount = count;
						return;
					}

					if (type === 'delete') {
						/*var delName = updateData.uNames;
						idx = names.indexOf(delName);

						if (idx > 0) {
							names.splice(idx, 1);
							$scope.name = names.join('、');
						}
						*/
						$scope.userCount -= 1;
						return;
					}
				};

				//显示群成员
				$scope.showMembers = function() {
					var userIdsData = angular.copy($scope.infoData.user_ids);
					var membersConvId = GroupMembersServ.getConvId();
					var type = $scope.infoData.type;
					var uids;
					if (type === 'user') {
						uids = [$scope.infoData.id];
					} else {
						uids = userIdsData.ids;
					}

					//如果不存在自己的id，就把自己放在最前面
					if (uids.indexOf(selfId) === -1) {
						//将自己的ID加入ID数组
						uids.unshift(selfId);
					}

					//获取成员数据数组
					var members = GroupMembersServ.getMembersData(uids);

					if (membersConvId !== $scope.convId || !$scope.convId) {
						GroupMembersServ.init(members);
					}
				};
			}],
			link: function(scope, ele, attrs, controller) {
				var btnInfo = ele.find('.btn-trigger a');
				var btnQuit = ele.find('.quit');
				var eName = ele.find('.group-name span');

				var textWarp = $(".conv-info-box").width();
				//btnInfo.css('padding-right','60px');

				//关闭群聊成员管理面板
				scope.close = function() {
					ele.removeClass('act');
				};

				var blurHandler = function(e) {
					var newName = $.trim($(this).text());

					if (!newName) {
						PopMessage.tip({
				    		msg: '群聊名称不能为空',
				    		type: 0
				    	});
						$('.group_title').text(scope.name);
						return;
					}

					//如果群聊名称有变化，则发请求
					if (scope.name !== newName) {
						ConversationBinder.changeName(newName)
							.then(function(data) {
								scope.name = newName;
							}, function(err) {
								$('.group_title').text(scope.name);
							});
					}
					

				};

				var keydownHandler = function(e) {
					if (e.keyCode === 13) {
						eName.blur();
					}
				};

				var btnQuitClick = function(e) {
					TipsPopBinder.show({
						body: '确定要删除并退出该会话？',
						showCancel: true,
						showConfirm: true,
						confirmed: function() {
              ConversationBinder.quit();
            }
					});
				};

				var btnInfoClick = function(e) {
					e.preventDefault();
					//如果禁用，不处理
					if (scope.infoDisabled) return;

					//切换样式
					ele.toggleClass('act');
					//如果不是公众号，显示对话成员
					if (ele.hasClass('act') && !scope.isOcu) {
						scope.showMembers();
					}

					//关闭面板
					if (!ele.hasClass('act')) {
						GroupMembersServ.closePanel();
					}
				};

				//群聊名称编辑
				eName.bind('blur', blurHandler);
				//按下回车键就算提交修改
				eName.bind('keydown', keydownHandler);
				//点击"退出群聊"按钮
				btnQuit.bind('click', btnQuitClick);
				btnInfo.bind('click', btnInfoClick);

				//监听跟元素点击事件，判断元素关系，隐藏子菜单
				var wrapListener = scope.$on('wrap_clicked', function(e, eTarget) {
					//点击confirm的时候不需要触发，解决#6315
					if (!$.contains(ele[0], eTarget) && ele[0] !== eTarget &&!$(eTarget).is(".confirm")) {
						// ele.removeClass('act');
							GroupMembersServ.closePanel();
					}
				});

				//当作用于销毁时，清除引用
				scope.$on('$destroy', function() {
					btnInfo.unbind('click', btnInfoClick);
					btnQuit.unbind('click', btnQuitClick);
					eName.unbind('blur', blurHandler);
					eName.unbind('keydown', keydownHandler);
					btnInfo = null;
					btnQuit = null;
					eName = null;
					btnInfoClick = null;
					btnQuitClick = null;
					blurHandler = null;
					keydownHandler = null;
					if (wrapListener) wrapListener();
			   });
			}
		};
	}
])

.factory('conversationInfoBinder', ['RootscopeApply',
	function(RootscopeApply) {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		o.init = function(data) {
			that.init(data);
		};

		o.updateInfo = function(updateData) {
			RootscopeApply(scope, function() {
				that.update(updateData);
			});
		};

		o.userCount = function() {
			return scope.userCount;
		};

		return o;
	}
])
