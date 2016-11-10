'use strict';
angular.module('mx.workCircle', [])

//工作圈选项列表
.directive('workCircleList', ['$filter', 'WorkCircleListServ', '$injector', 'RootscopeApply', 'WorkCircleServ',
	function($filter, WorkCircleListServ, $injector, RootscopeApply, WorkCircleServ) {
		return {
			restrict: 'EA',
			replace: false,
			controller: ['$scope', '$element', function($scope, $element) {
				$injector.invoke(WorkCircleListServ.bind, this, {
					$scope: $scope
				});


				var scopeWorker = function() {
					$scope.items = $filter('groupsFilter')($scope.joinedGroups);

					//等待iframe渲染完再做处理
					setTimeout(function() {
						if (WorkCircleListServ.notiJumpUrl) {
							//点击通知跳转要显示指定会话消息
							WorkCircleServ.load(WorkCircleListServ.notiJumpUrl);
							WorkCircleListServ.notiJumpUrl = null;
						} else {
							//模拟点击"所有工作圈"，初始化加载工作圈内容
							$element.find('.item:first').click();
						}
					}, 4);
				};

				this.refresh = function() {
					RootscopeApply($scope, function() {
	    				scopeWorker();
					});
				};
			}],
			link: function(scope, ele, attrs) {

			}
		}
	}
])

/*
 * 所有工作圈选项
 */
.controller('AllWorkCircleCtrl', ['$scope',
	function($scope) {
		$scope.item = {
			name: '所有工作圈',
			avatar_url: '/photos/none_group',
			type: 'following',
			web_url: '#threads?type=following',
			unreadCircleNum: $scope.unreadCircle
		};
	}
])

/*
 * 工作圈选项
 */
.directive('workCircleItem', ['GLOBAL_SETTING', 'WorkCircleServ', 'GroupURL', 'RootscopeApply', 'SidebarNavBinder',
	function(GLOBAL_SETTING, WorkCircleServ, GroupURL, RootscopeApply, SidebarNavBinder) {
		return {
			restrict: 'EA',
			replace: true,
			template: '<div class="item" title="">\
							<img ng-src="{{head}}" alt="头像" />\
							<span class="name"><b class="name-text" title="{{name}}">{{name}}</b><b class="icon-lock" ng-show="isShowLock"></b></span>\
							<i class="unread-num" ng-show="item.unreadCircleNum">{{item.unreadCircleNum}}</i>\
						</div>',
			controller: ['$scope', function($scope) {
				//不显示私有图标——小锁状
				$scope.isShowLock = false;
				function scopeWorker() {
					$scope.name = $scope.item.name;
					$scope.head = GLOBAL_SETTING.URL + $scope.item.avatar_url;
					$scope.isPublic = $scope.item.public;
					//如果是私有工作圈，显示私有图标——小锁状
					if($scope.isPublic === false) $scope.isShowLock = true;
					//获取工作圈URL
					$scope.url = GroupURL({
						api: $scope.item.web_url
					});
				}
				scopeWorker();

				//监听更新事件
				$scope.$on('update_group_' + $scope.item.id, function(e, data) {
					$scope.item = data;
					scopeWorker();
				});
			}],
			link: function(scope, ele, attrs) {
				ele.bind('click', function(e) {
					e.preventDefault();
					WorkCircleServ.load(scope.url);

					//清空未读数量
					RootscopeApply(scope, function() {
						SidebarNavBinder.readedCircle(scope.item.unreadCircleNum);
						scope.item.unreadCircleNum = 0;
					});

					//标记为点击样式
					ele.parent().find('.act').removeClass('act');
					$(this).addClass('act');
				});
			}
		}
	}
])

//工作圈选项列表
.directive('workCircleFrame', ['WorkCircleServ', '$injector', 'RootscopeApply', '$sce',
	function(WorkCircleServ, $injector, RootscopeApply, $sce) {
		return {
			restrict: 'EA',
			replace: false,
			controller: ['$scope', function($scope) {
				$injector.invoke(WorkCircleServ.bind, this, {
					$scope: $scope
				});

				//解决src问题
				$scope.trustSrc = function(src) {
					return $sce.trustAsResourceUrl(src);
				};

				//iframe加载url
				$scope.load = function(url) {
					RootscopeApply($scope, function() {
						$scope.url = $scope.trustSrc(url);
					});
				};

				var oFrm = document.getElementById('work-circle');
				oFrm.onload = oFrm.onreadystatechange = function() {
				     if (this.readyState && this.readyState != 'complete') return;
				     else {
				     	$('.work-circle-wrap .frame-loading').hide();
				     }
				}
			}],
			link: function(scope, ele, attrs) {

			}
		}
	}
])

.factory('WorkCircleListServ', ['$location', '$rootScope', 'GroupURL', 'WorkCircleServ', '$http',
	'GLOBAL_SETTING',
	function($location, $rootScope, GroupURL, WorkCircleServ, $http, GLOBAL_SETTING) {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		//刷新工作圈列表
		o.refreshList = function() {
			that.refresh();
		};

		/**
		 * 打开工作圈指定内容(来自通知的消息链接点击跳转)
		 * @param hash[String]: 内容定位所需url hash字符串
		 */
		o.openFromNoti = function(hash) {
			$rootScope.$apply(function() {
				$location.path('/work-circle');
				o.notiJumpUrl = GroupURL({api:hash});
			});

			/*setTimeout(function() {
				WorkCircleServ.load(url);
			}, 3000);*/
		};

		/**
		 * 更新某个给你工作圈项
		 */
		o.updateItem = function(groupId) {
			$http({
        url: GLOBAL_SETTING.URL + '/api/v1/groups/' + groupId,
        method: 'GET'
      }).success(function(data) {
        scope.$broadcast('update_group_' + groupId, data);
      }).error(function(err) {});
		};

		return o;
	}
])

.factory('WorkCircleServ', [
	function() {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		o.load = function(url) {
			scope.load(url);
		};

		return o;
	}
])

.factory('GroupURL', ['GLOBAL_SETTING', 'Storage', function(GLOBAL_SETTING, Storage) {
	return function(params) {
		var user = Storage.getUser('currentUser');
		var networkId = user.network_id;
		var networks = user.joined_networks;
		var tokenData = Storage.getToken();
		var networkApi = '';

		networks.some(function(ele) {
			if (ele.id === networkId) {
				networkApi = ele.web_url;
				return true;
			}
			return false;
		});

		var url = networkApi + '/connect/feed?from_app=pc&mx_sso_token=' + tokenData.mx_sso_token
							+ '&access_token=' + tokenData.access_token
							+ params.api;
		return GLOBAL_SETTING.URL + url;
	}
}])

//工作圈过滤器
.filter('groupsFilter', [function() {
	return function(items) {
		var arr = [];

		items.forEach(function(ele) {
			if (ele.type === 'category' && ele.groups) {
				arr = arr.concat(ele.groups);
			} else {
				arr.push(ele);
			}
		});

		return arr;
	}
}])