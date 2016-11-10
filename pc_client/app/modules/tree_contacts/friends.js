'use strict';
angular.module('mx.treecontacts.friends', [])

.directive('friendsTreeList', ['RootscopeApply',
	function(RootscopeApply) {
		return {
			restrict: 'A',
			transclude:true,
			template: 	'<div ng-transclude></div>\
						<div contact-tree-item ng-repeat="item in friendsList | orderBy:\'pinyin\'" ></div>\
						<span ng-show="frdListLoading" class="friendlist-loading">正在加载好友列表</span>',
			controller: ['$scope', 'GLOBAL_SETTING', '$injector', 'FriendsListServ',
				function($scope, GLOBAL_SETTING, $injector, FriendsListServ) {

					$scope.URL = GLOBAL_SETTING.URL;
					$scope.frdListLoading = false;

					//依赖好友列表服务
					$injector.invoke(FriendsListServ.bind, this, {
						$scope: $scope
					});

					this.scopeWorker = function(data) {
						var friendsData = angular.copy(data);
						//删除之前生成的首字母标记
						$scope.clearInitialTags();

						//初始化好友列表数据
						RootscopeApply($scope, function() {
							$scope.friendsList = friendsData;
						});

						//取消"正在加载"提示
						$scope.frdListLoading = false;
					};

					//设置为好友选择器
					this.initSelector = function() {
						//删除之前生成的首字母标记
						$scope.clearInitialTags();
						//标记为好友选择器
						$scope.selector = true;
					};
				}
			],
			link: function postLink(scope, ele) {
				//清除首字母标记
				scope.clearInitialTags = function() {
					var initialTags = ele.find('h5.initial');
					initialTags.remove();
				}
			}
		}
	}
])

.directive('contactTreeItem', ['GroupMemberSelect', 'RootscopeApply', '$location', '$rootScope',
	function(GroupMemberSelect, RootscopeApply, $location) {
		return {
			restrict: 'A',
			template: '<div btn-user data-type="{{type}}" class="item" ng-class="selected == true ? \'selected\' : \'\'" title="" data-id="{{uid}}">\
							<img ng-src="{{uHead}}" alt="头像" />\
							<span class="name">{{username}}</span>\
							<span class="online-status">\
								<span class="online-status-offline" ng-show="online==\'offline\'"></span>\
								<span class="online-status-web" ng-show="online==\'web\'"></span>\
								<span class="online-status-mobile" ng-show="online==\'mobile\'"></span>\
							</span>\
							<i class="btn-select"></i>\
						</div>',
			controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
				RootscopeApply($scope, function() {
					var item = $scope.item;
					var name = item.pinyin;
					var initial = name.substring(0,1);
					var preItem = $scope.$$prevSibling;
					var index = $scope.$index;
					//用户名首字母
					$scope.initial = initial;
					//是否需要添加字母排序标记
					$scope.iniNav = false;
					//用户名
					$scope.username = item.name;
					//用户Id
					$scope.uid = item.id;
					//头像
					$scope.uHead = GLOBAL_SETTING.URL + item.avatar_url;
					//好友选择器中的选择标记
					$scope.selected = false;

					//如果当前用户首字母与前一个用户首字母不同，则标记为需要添加字母标记
					if (preItem.initial !== initial) {
						$scope.iniNav = true;
					}
					//获取在线状态
					$scope.online = item.online;

					//监听取消选择事件
					$scope.$on('memberSelect_' + $scope.uid + '.unselect', function(e) {
						RootscopeApply($scope, function() {
							$scope.selected = false;
						});
					});

					var pathType = $location.path();
					switch(pathType) {
						case '/main':
							$scope.type = 'normal';
							break;
						case '/contacts':
							$scope.type = 'popup';
							break;
					}
				});

			}],
			link: function postLink(scope, element, attrs) {
				var initial = scope.initial.toUpperCase();
				var initialHtml = '<h5 class="initial">' + initial + '</h5>';
				//接收‘全选按钮’的广播
				scope.$on('selected_all.loaded', function(e, checked) {
					RootscopeApply(scope, function() {
						//根据选择结果决定添加或删除成员
						if (checked) {
							if (!element.find('.item').hasClass('selected')) {
								element.find('.item').addClass('selected');
								$('.selected-wrap .list').css('overflow-y', 'auto');
								scope.selected = !scope.selected;
								GroupMemberSelect.memberCtrl(scope.selected, scope.item);
							}
						} else {
							element.find('.item').removeClass('selected');
							scope.selected = !scope.selected;
							scope.$parent.selectedArr = [];
							scope.$parent.count = 0;
						}
					});
				});

				//插入字母排序元素
				if (scope.iniNav) {
					$(initialHtml).insertBefore(element);
				}

				element.bind('click', function(e) {
					$('.selected-wrap .list').css('overflow-y', 'auto')
					//如果不是好友选择器
					if (!scope.selector) {
						//标记为点击样式
						element.parents('.list').find('.act').removeClass('act');
						$(this).find('.item').addClass('act');
						if($('.nav-crumbs a:last-child').css('cursor') == 'text'){
							$('.nav-crumbs a:last-child').removeClass('act');
						}
						return;
					}

					//以下是好友选择器相关逻辑
					scope.selected = !scope.selected;
					GroupMemberSelect.memberCtrl(scope.selected, scope.item);
				});
			}
		}
	}
])
/*
 * 好友列表
 */
.factory('FriendsListServ', ['FriendsServ', function(FriendsServ) {
	var o = {};
	var that, scope;

	//绑定调用此服务的上下文环境
	o.bind = function($scope) {
		that = this;
		scope = $scope;
	}

	//初始化，加载好友列表
	o.init = function(setting) {
		if (setting && setting.selector) {
			//如果是好友选择器，显示相关选择器组件
			that.initSelector();
		}

		FriendsServ.load()
			.then(function(data) {
				that.scopeWorker(data.items);
			}, function(err) {
				console.log('Request to friends list error!');
			});
	};

	return o;
}])
/*
 * 通讯录列表源
 */
.factory('ContactsServ', ['$resource', 'GLOBAL_SETTING',
	function($resource, GLOBAL_SETTING) {
		var url = GLOBAL_SETTING.URL + '/api/v1/subscriptions/users/:id';

		return $resource(url, {
			id: '@id'
		},{
			//由于返回的结果是数组，则需要配置一下下
			'save': {method: 'POST', isArray: true},
			'remove': {method: 'DELETE', isArray: true}
		});
	}
])
/*
 * 通讯录将部门内所有人加为联系人服务
 */
.factory('ContactsDeptServ', ['$resource', 'GLOBAL_SETTING',
	function($resource, GLOBAL_SETTING) {
		var url = GLOBAL_SETTING.URL + '/api/v1/subscriptions/departments/:id';

		return $resource(url, {
			id: '@id'
		},{
			'save': {method: 'POST', isArray: true}
		});
	}
])
.factory('FriendsServ', ['ContactsServ', '$q',
	function(ContactsServ, $q) {
		var o = {};

		//加载好友列表
		o.load = function() {
			var delay = $q.defer();

			ContactsServ.get(
				function (data, status, headers, config) {
					delay.resolve(data);
				},
				function (data, status, headers, config) {
					delay.reject(data);
				}
			);

			return delay.promise;
		};

		//加为联系人
		o.add = function(uId) {
			var delay = $q.defer();
			var params = {
				id: uId,
				isArray:true
			}

			ContactsServ.save(
				params,
				function (data, status, headers, config) {
					delay.resolve(data);
				},
				function (data, status, headers, config) {
					delay.reject(data);
				}
			);

			return delay.promise;
		};

		//解除好友
		o.breakFrd = function(uId) {
			var delay = $q.defer();
			var params = {
				id: uId,
				isArray:true
			}

			ContactsServ.remove(
				params,
				function (data, status, headers, config) {
					delay.resolve(data);
				},
				function (data, status, headers, config) {
					delay.reject(data);
				}
			);

			return delay.promise;
		};

		return o;
	}
])