'use strict';
angular.module('mx.treecontacts.ocus', [])

.factory('OcuBtnsBinder', [
	function() {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		o.init = function(ocuData) {
			that.init(ocuData);
		};

		return o;
	}
])

.factory('SubscribOcus', ['$resource', 'GLOBAL_SETTING', function($resource, GLOBAL_SETTING) {
	var url = GLOBAL_SETTING.URL + '/api/v1/subscriptions/ocus/:id';

	return $resource(url, {
		limit: 50,
		id: '@id'
	},{
		'save': {
			method: 'POST',
			isArray: true
		},
		'remove': {
			method: 'DELETE',
			isArray: true
		}
	});
}])
.factory('Ocus', ['$resource', 'GLOBAL_SETTING', function($resource, GLOBAL_SETTING) {
	var url = GLOBAL_SETTING.URL + '/api/v1/ocus/:id/:unsubscribed';

	return $resource(url, {
		id: '@id',
		unsubscribed: '@unsubscribed'
	});
}])
/*
 * 发送公众号菜单请求
 */
.factory('OcuMenuServ', ['$http', 'GLOBAL_SETTING', '$q', 'ConversationBinder',
	function($http, GLOBAL_SETTING, $q, ConversationBinder) {
		return function(menuId) {
			if (!menuId) return;
			var convId = ConversationBinder.getCurrentConvId();
			var url = GLOBAL_SETTING.URL + '/api/v1/conversations/' + convId + '/ocu_menus/' + menuId;
			var delay = $q.defer();

			$http({
				url: url,
				method: 'GET'
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
 * 公众号加载器
 */
.factory('OcusLoader', ['$q', 'SubscribOcus', 'Ocus', 'PopMessage', function($q, SubscribOcus, Ocus, PopMessage) {
	var o = {};

	/*
	 * 获取已订阅公众号
	 */
	o.query = function(params) {
		var delay = $q.defer();

		SubscribOcus.get(params,
			function (data, status, headers, config) {
				delay.resolve(data.items);
			},
			function (data, status, headers, config) {
				delay.reject(data);
			}
		);

		return delay.promise;
	};

	//获取公众号信息
	o.getOcu = function(params) {
		var delay = $q.defer();

		Ocus.get(params,
			function (data, status, headers, config) {
				delay.resolve(data);
			},
			function (data, status, headers, config) {
				delay.reject(data);
			}
		);

		return delay.promise;
	};

	//获取未订阅公众号
	o.unsubscribed = function(ocuType) {
		var delay = $q.defer();

		Ocus.query({
				unsubscribed:'unsubscribed',
				ocu_type: ocuType
			},
			function (data, status, headers, config) {
				data.unsubscribed = true;
				delay.resolve(data);
			},
			function (data, status, headers, config) {
				delay.reject(data);
			}
		);

		return delay.promise;
	};

	//订阅公众号
	o.sub = function(ocuId) {
		var delay = $q.defer();

		SubscribOcus.save({
				id: ocuId
			},
			function (data, status, headers, config) {
				delay.resolve(data);
			},
			function (data, status, headers, config) {
				PopMessage.err({
                    message: data.data.errors.message
                });
				delay.reject(data);
			}
		);

		return delay.promise;
	};

	//取消订阅公众号
	o.unsub = function(ocuId) {
		var delay = $q.defer();

		SubscribOcus.remove({
				id: ocuId
			},
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
}])
/**
 * 公众号&应用中心界面中的面包屑服务
 */
.factory('ServicesAppsCrumbs', ['Crumbs', '$rootScope', 'ContactsStatus',
	function(Crumbs, $rootScope, ContactsStatus) {
		var o = {};

		//初始化面包屑组建
		o.init = function(options) {
			var data = options.data;
			var type = options.type;		//初始化类型{"apps": 应用中心, "services": 公众号}
			var name = options.name;

			Crumbs.init({
				triggerHandler: function(data) {
					$rootScope.$broadcast(type + '_contacts.loaded', data);
					//将通讯录状态置为"公司通讯录"
					ContactsStatus(type);
				}
			});

			//添加记录
			Crumbs.add({
				name: name,
				data: data
			});
		};

		/**
		 * 处理面包屑组件数据变动
		 * @param type[String]: 操作类型{'subed': 订阅, 'unsubed': '取消订阅'}
		 * @param data[Object]: 应用/公众号数据
		 */
		o.update = function(type, data) {
			var delIndex = type === 'subed' ? 1 : 0;
			var addIndex = type === 'subed' ? 0 : 1;
			var crumbToDel = Crumbs.arr(delIndex);
			var crumbToAdd = Crumbs.arr(addIndex);

			//临时暂存未订阅状态
			crumbToDel.unsubscribed = crumbToDel.data.unsubscribed;
			crumbToAdd.unsubscribed = crumbToAdd.data.unsubscribed;

			//删除已订阅项
			crumbToDel.data = crumbToDel.data.filter(function(ele) {
				return ele.id !== data[0].id;
			});

			//增加未订阅项
			crumbToAdd.data.push(data[0]);

			//存储未订阅状态
			crumbToDel.data.unsubscribed = crumbToDel.unsubscribed;
			crumbToAdd.data.unsubscribed = crumbToAdd.unsubscribed;

			//修改面包屑数据
			Crumbs.put(delIndex, crumbToDel);
			Crumbs.put(addIndex, crumbToAdd);
		};

		return o;
	}
])

