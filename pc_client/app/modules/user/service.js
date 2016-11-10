'use strict';

angular.module('mx.user')
	.service('UserInfoServ', ['$rootScope', function($rootScope){
		var that = this;
		var setting = {};

		//初始化方法
		this.init = function(opts) {
			if (!opts) return;

			setting = {
				onchange: opts.onchange,
				onshow: opts.onshow,
				onhide: opts.onhide,
				onclear: opts.onclear
			}
		};

		//清除用户信息(便会隐藏元素)
		this.clear = function() {
			$rootScope.$broadcast('userinfo.clear');
			this.onclear();
		};

		//清除信息之后触发事件
		this.onclear = function() {
			console.log('UserInfo cleared!');
			if (setting.onclear) setting.onclear();
		};
	}])
	/*
	 * 个人信息绑定器
	 */
	.factory('SelfInfoBinder', ['Storage', 'UserLoaderServ', 'Cache',
		function(Storage, UserLoaderServ, Cache) {
			var o = {};
			var that, scope;

			o.bind = function($scope) {
				that = this;
				scope = $scope;
			};

			o.open = function() {
				var selfId = Storage.getUser('id');
				//判断是否已存在该用户信息
				// if (selfId !== scope.id) {
					UserLoaderServ.getUser(selfId)
						.then(function(data) {
							that.loaded(data);
							//更新缓存
							Cache.get('user_' + selfId,data);
						}, function(err) {
							console.error(err);
						});
				// }

				//用户信息弹窗
				$.magnificPopup.open({
					items: {
						src: '#selfInfo',
						type: 'inline'
					},
					verticalFit: true,
					callbacks: {
						close: function() {
							scope.close();
						}
					}
				});
			};

			return o;
		}
	])
	/*
	 * 用户服务
	 */
	.factory('UsersServ', ['$resource', 'GLOBAL_SETTING','Storage',
		function($resource, GLOBAL_SETTING,Storage) {
			var url = GLOBAL_SETTING.URL + '/api/v1/users/:id/:current/:home_user';
			var o = {};

			o.user = function() {
				return $resource(url, {
					id: '@id',
					current: '@current',
					home_user: '@home_user'
				}, {
					update: {
						method: 'PUT',
						params: {
							id: '@id'
						},
						headers: {'Content-Type': 'application/x-www-form-urlencoded'}
					}
				});
			};

			return o;
		}
	])

	/*
	 * 用户搜索服务
	 */
	.factory('UserSearchServ', ['$http', 'GLOBAL_SETTING', '$q',
		function($http, GLOBAL_SETTING, $q) {
			return function(value) {
				var url = GLOBAL_SETTING.URL + '/api/v1/departments/search';
				var delay = $q.defer();

				$http({
					url: url + '?limit=50&q=' + encodeURIComponent(value),
					method: 'GET',
				}).success(function(data) {
					delay.resolve(data);
				}).error(function(err) {
					delay.reject(err);
				});

				return delay.promise;
			}
		}
	])
	/*
	 * 获取用户信息
	 */
	.factory('UserLoaderServ', ['$q', 'UsersServ', 'Storage', 'Cache',
		function($q, UsersServ, Storage, Cache) {
			var o = {};
			var user = UsersServ.user();

			var get = function(params) {
				var delay = $q.defer();
				var id = params.id;
				var cacheUser;

				//如果是获取指定id的用户，先尝试从缓存获取
				// if (id) {
				// 	cacheUser = Cache.get('user_' + id);
				// }

				// if (cacheUser && cacheUser.user_info) {
				// 	//如果缓存的数据存在而且数据中有user_info字段，直接返回数据
				// 	delay.resolve(cacheUser);
				// } else {
					//否则从服务器获取数据
					user.get(
						params,
						function (data, status, headers, config) {
							Cache.put('user_' + params.id, data);
							delay.resolve(data);
						},
						function (data, status, headers, config) {
							delay.reject(data);
						}
					);
				// }

				return delay.promise;
			}

			//获取指定用户信息
			o.getUser = function(id) {
				var params = {
					id: id,
					include_user_info: true,
					is_followed_by: Storage.getUser('id')
				}
				
				return get(params);
			};

			//获取当前用户信息
			o.currentUser = function() {
				var params = {
					current: 'current'
				}

				return get(params);
			};

			//目前用来查看默认network
			o.homeUser = function() {
				var params = {
					current: 'current',
					home_user: 'home_user'
				}
				return get(params);
			};

			o.editUser = function(params) {
				var delay = $q.defer();

				user.update(
					params,
					function (data, status, headers, config) {
						delay.resolve(data);
					},
					function (data, status, headers, config) {
						delay.reject(data);
					}
				);

				return delay.promise;
			}

			return o;
		}
	])
	//检查是否已保存当前用户信息，如果未保存则加载并保存
	.factory('CheckUser', ['Storage', 'LoadCurrentUser', 'LoadHomeUser', 'CommunitySwitcherBinder', '$q',
		function(Storage, LoadCurrentUser, LoadHomeUser, CommunitySwitcherBinder, $q) {
			return function() {
				var session = Storage;
				var delay = $q.defer();

				var check = function() {
					var userSession = session.getUser();

					if (!userSession) return false;
					if (!userSession.currentUser) return false;
					if (!userSession.homeUser) return false;

		            CommunitySwitcherBinder.init();
					delay.resolve();
				};

				var loadCurrentUser = function() {
					LoadCurrentUser()
						.then(function() {
							check();
						}, function(err) {
							delay.reject(err);
						});

					LoadHomeUser()
						.then(function() {
							check();
						}, function(err) {
							delay.reject(err);
						});
				};

				if (!check()) {
					loadCurrentUser();
				}

				return delay.promise;
			}
		}
	])

	//加载当前用户信息currentUser并保存到缓存
	.factory('LoadCurrentUser', ['$q', 'UserLoaderServ', 'Storage',
		function($q, UserLoaderServ, Storage) {
			return function() {
				var session = Storage;
				var delay = $q.defer();

				UserLoaderServ.currentUser()
					.then(function(data) {
						session.setUser('currentUser', data);
						session.setUser('id', data.id);
						session.setUser('name', data.name);

						delay.resolve(data);
					}, function(err) {
						delay.reject(err);
					});

				return delay.promise;
			}
		}
	])

	//加载当前用户信息homeUser并保存到缓存
	.factory('LoadHomeUser', ['$q', 'UserLoaderServ', 'Storage', 'DefaultHttpHeader',
		function($q, UserLoaderServ, Storage, DefaultHttpHeader) {
			return function() {
				var session = Storage;
				var delay = $q.defer();

				UserLoaderServ.homeUser()
					.then(function(data) {
						session.setUser('homeUser', data);
						session.setUser('networkId', data.network_id);

						//为http请求添加默认header
						DefaultHttpHeader.setNetworkId(data.network_id);

						delay.resolve(data);
					}, function(err) {
						delay.reject(err);
					});

				return delay.promise;
			}
		}
	])


