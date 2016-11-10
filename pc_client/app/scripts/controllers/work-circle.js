'use strict';

angular.module('mxWebClientApp')
	.controller('WorkCircleCtrl', ['$scope', 'CheckToken', '$location', 'Storage', 'LoadCurrentUser', 'WorkCircleListServ',
		'ConversationServ', 'ConversationBinder', 'ConversationListBinder', 'ConvTitleFilter', '$rootScope', 'CurUserDB',
		'NewConversationItem', 'GLOBAL_SETTING','SidebarNavBinder','RTC',
		function($scope, CheckToken, $location, Storage, LoadCurrentUser, WorkCircleListServ,
			ConversationServ, ConversationBinder, ConversationListBinder, ConvTitleFilter, $rootScope, CurUserDB,
			 NewConversationItem, GLOBAL_SETTING,SidebarNavBinder,RTC) {
			if (!CheckToken()) $scope.$emit('logout.success');
			//$location.path('/login');

			var currentUser = Storage.getUser('currentUser');


		    // if (!CurUserDB.checkOpened(user.id)) {
		    //初始化数据库
		    CurUserDB.init()
		    .then(function() {
		        //初始化完成后更新当前用户信息到数据库
		        CurUserDB.saveCurUser(Storage.getUser('currentUser'));
		    });
		    // }

		    //检查全局未读
		    $scope.checkGlobalUnread();

		    //初始化RTC连接服务，以备用户之间点对点连接
		    RTC.init({
		        username: String(currentUser.id)
		    });

		    var count = Storage.convsUnreadNum();
		    if (!_.isNumber(count)) {
		        count = 0
		    }
		    SidebarNavBinder.setMessageUnreadNum(count);

			//将已加入过工作圈数组存入作用域
			//$scope.joinedGroups = currentUser.joined_groups;

			//刷新工作圈列表
			var refeshGroupsList = function() {
				LoadCurrentUser()
					.then(function(data) {
						currentUser = data;
						$scope.joinedGroups = currentUser.joined_groups;
						//console.log($scope.joinedGroups);
						//刷新工作圈列表
						WorkCircleListServ.refreshList();

						//存入数据库
						CurUserDB.saveCurUser(data);
						//存入本地缓存
						Storage.setUser('currentUser', data);
					}, function(err) {});
			};
			//每次打开工作全面版，必须刷新一下数据
			refeshGroupsList();

			//加载对话
			var loadConv = function(convId) {
				var networkId = Storage.getUser('networkId');
				var params = {
					id: convId,
					network_id: networkId
				};

				//打开对话
				var openConv = function(data) {
					var selfId = currentUser.id;
					var refs = data.references;
					var targetUser;

					for (var i = 0, len = refs.length; i < len; i++) {
						if (refs[i].type === 'user' && refs[i].id !== selfId) {
							targetUser = refs[i];
						}
					}

					var allRefs = data.references.concat(data.items);
					//TODO 待优化，可以直接用对话数据触发，目前有问题
					ConversationBinder.trigger(targetUser);
				};

				CurUserDB.getConvList(Number(convId))
					.then(function(convData) {
						ConversationBinder.trigger(convData);
					}, function() {
						//请求对话数据
						ConversationServ.get(params,
							function(data, status, headers, config) {
								openConv(data);
							},
							function(data, status, headers, config) {}
						);
					});
			};

			window.onmessage = function(event) {
				var regExpType = /#([^\/]+)\/?([^\/]*)/;
				var data = event.data;
				var args, type, value;

				console.info('============== receive message from ' + event.origin + ' ===========', event);

				if (GLOBAL_SETTING.URL !== event.origin || !data.args) return;

				//获取处理类型
				args = data.args[0].match(regExpType);
				type = args[1];
				value = args[2];

				switch (type) {
					case 'groups':
						//如果有传递group id，则单独更新某个id的数据
						if (value) {
							WorkCircleListServ.updateItem(value);
						} else {
							refeshGroupsList();
						}
						break;
					case 'conversations':
						loadConv(value);
						break;
					default:
						;
				}
			};
		}
	]);