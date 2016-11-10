'use strict';
angular.module('mx.contacts', [
	'mx.contacts.friends',
	'mx.contacts.company',
	'mx.contacts.ocus',
	'mx.contacts.groups'
])
//通讯录界面控制器
.controller('ContactsDetailsCtrl', ['$scope', 'ContactsStatus', 'RootscopeApply', '$injector', 'ContactBinder',
	function($scope, ContactsStatus, RootscopeApply, $injector, ContactBinder) {
		$scope.contactStatus = null;
		$scope.showCrumbs = false;

		//标记正在加载
	  	$scope.contactLoading = false;

	  	//绑定服务
	  	$injector.invoke(ContactBinder.bind, this, {
	  		$scope: $scope
	  	});
	  	$scope.$on('company_count', function(e, company_count) {
	  		$scope.company_count = company_count;
	  	});
		var statusWorker = function(status) {
			$scope.contactStatus = status;
			$scope.showCrumbs = /company|userInfo|apps|services|ocuInfo/.test(status);
			$scope.showCrumbsPath = /company|apps|services|ocuInfo/.test(status);
			//$scope.showUserInfo = /userInfo|friendInfo/.test(status);
			$scope.showOcuInfo = /ocuInfo/.test(status);
		};

		$scope.$on('contactsStatus.changed', function(e, status) {
			RootscopeApply($scope, function() {
				statusWorker(status);
			});
		});
	}
])
/*
 * 用来设置通讯录界面当前的显示状态，并触发状态改变事件
 * @param newStatus[String]: 状态字符串
 */
.factory('ContactsStatus', ['$rootScope', function($rootScope) {
	var status = null;

	return function(newStatus) {
		if (!newStatus) return status;
		status = newStatus;
		$rootScope.$broadcast('contactsStatus.changed', status);
	};
}])

.factory('ContactBinder', ['$http', 'GLOBAL_SETTING', '$q', function($http, GLOBAL_SETTING, $q) {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		o.loading = function(bool) {
			if (scope) {
				scope.contactLoading = bool;
			}
		};

		o.getAllCompanyCounts = function(){
			var url = GLOBAL_SETTING.URL + '/api/v1/departments/root';
			var delay = $q.defer();

			$http({
				url: url,
				method: 'GET',
			}).success(function(data) {
				delay.resolve(data);
			}).error(function(err) {
				delay.reject(err);
			});

			return delay.promise;
		};

		o.destroy = function(){
			scope&&scope.$destroy();
		}

		return o;
}])