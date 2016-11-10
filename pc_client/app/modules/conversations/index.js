'use strict';

angular.module('mx.conversations', [
	'mx.conversations.list',
	'mx.conversations.item',
	'mx.conversation.info'
])

/*
 * 发起聊天按钮
 */
.directive('btnNewConv', ['NewConvMemberSelector','$compile','$location',
	function(NewConvMemberSelector, $compile, $location) {
		return {
			restrict: 'A',
			scope: true,
			controller: ['$scope', function($scope) {
				$scope.btnName = '发起聊天';
				
			}],
			link: function(scope, ele, attrs) {
				ele.bind('click', function(e) {
					e.preventDefault();
					//通过$compile动态编译html
				var _htmlStrs = '<div group-member-selector id="groupMemberSelector" class="group-member-selector"></div>';
				var template = angular.element(_htmlStrs);
				var sidebarElement = $compile(template)(scope);
				angular.element(".group-member-selector-wrap").html(sidebarElement);
					if($location.path() !== '/main'){
						var type = parseInt($('.main-wrap').attr('type')) ;
					}else{
						var type = 0;
					}
					NewConvMemberSelector.init(type);
				});
			}
		}
	}
])

.factory('NewConvMemberSelector', ['GroupMemberSelect', 'Storage', 'ConversationBinder','Cache', 'GLOBAL_SETTING','$location',
	function(GroupMemberSelect, Storage, ConversationBinder, Cache, GLOBAL_SETTING, $location) {
		var o = {};
		var that, scope;

		var newConv = function(userIds, deptIds) {
			var selfId = Storage.getUser('id');
			var networkId = Storage.getUser('homeUser').network_id;
			var isMultiUser = userIds.length > 1 || deptIds.length >= 1;

			var data = {
				creator_id: selfId,
				type: isMultiUser ? 'new_conv' : 'user',
				network_id: networkId,
				is_multi_user: isMultiUser ? true : false,
				user_id: userIds.join(','),
				dept_id: deptIds.join(','),
				user_ids: {
					count: userIds.length,
					ids: userIds
				},
				dept_ids: {
					count: deptIds.length,
					ids: deptIds
				}
			}
			ConversationBinder.trigger(data);

			$.magnificPopup.close();
		};

		var initSelector = function(type) {
			var num = type ? type : 0;
			//初始化群聊成员管理模块
			//并在选择完成员之后进行请求等后续操作
			GroupMemberSelect.init(type)
				.then(function(data) {
					//如果type ： 3  说明是H5插件调用
					if(type === 3 && $location.path() === '/app-centre'){
						var datas = data
						var dataJson = {};
						var data = [];
						if(datas.userIds.length > 0){
							$.each(datas.userIds, function(index, val){
								var ChcheData = Cache.get('user_'+val);
								ChcheData.avatar_url = GLOBAL_SETTING.URL + ChcheData.avatar_url;
								data.push(ChcheData);
							});
						}
						if(datas.deptIds.length > 0){
							$.each(datas.deptIds, function(index, val) {
								var ChcheData = Cache.get('department_'+val);
								ChcheData.dept_id = val;
								data.push(ChcheData);
							});
						}
						dataJson.data = data;
						window.iframeData = JSON.stringify(dataJson);
						$.magnificPopup.close();
						return;
					}
					newConv(data.userIds, data.deptIds);
				});
		};

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		}

		o.init = function(type) {
			//成员选择器弹窗
			$.magnificPopup.open({
				items: {
					src: '#groupMemberSelector',
					type: 'inline'
				},
				verticalFit: true,
				callbacks: {
					open: function() {
						initSelector(type);
					},
					close: function() {
						//关闭名片弹层时清掉用户信息数据
						GroupMemberSelect.clear();
						//如果在应用中心的插件应用并且iframeData不存在
						if(type === 3 && $location.path() === '/app-centre' && !window.iframeData){
							window.iframeData = 'channel';
						};
					}
				}
			});
		};

		return o;
	}
])
