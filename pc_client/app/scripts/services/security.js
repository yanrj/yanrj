/*
 * 登陆登出服务
 */
var security = angular.module('mx.services.security', []);
/*
 * 登陆(获取token)服务
 */
security.factory('loginServ', ['$http', '$q', 'Storage', 'GLOBAL_SETTING', 'DefaultHttpHeader',
	'$location', 'SetWinSize', '$rootScope','Cache',
	function($http, $q, Storage, GLOBAL_SETTING, DefaultHttpHeader, $location, SetWinSize, $rootScope, Cache){
		var URL = GLOBAL_SETTING.URL;
		var URI = '/oauth2/token';
		var ls = Storage;
		var service = {};

		service.token = {};

		function deleteHeaders() {
			//删除之前设置的请求默认headers，登陆时带它们会请求失败
			delete $http.defaults.headers.common['NETWORK_ID'];
			delete $http.defaults.headers.common['AUTHORIZATION'];
		}

		//请求token成功
		function requestTokenSuccess(data, username) {
			service.token = data;
			service.saveToken(data);
			Storage.validNewModules(data.licensed_modules);
			//设置请求中的默认header带token
			DefaultHttpHeader.setToken(data.access_token);

			//将本次登录名存入storage
			ls.userNameList(username);

			//发送刷新main.html 广播
			$rootScope.$broadcast('SSOLoginServ', 'success');

			
		}

		//将token数据存入localStorage
		service.saveToken = function(data) {
			ls.setToken(data);
		};

		//保存二维码扫描后获取到的token数据
		service.QRLogin = function(data) {
			var delay = $q.defer();

			service.saveToken(data);
			requestTokenSuccess(data, data.login_name);

			setTimeout(function() {
				delay.resolve();
			}, 500);

			return delay.promise;
		};

		/*
		 * 请求token
		 * @param postData[JSON]: POST请求参数对象
		 */
		service.requestToken = function(postData) {
			var url = URL + URI;
			var username = postData.login_name;
			var delay = $q.defer();
			var that = this;

			deleteHeaders();

			$http({
				url: url,
				method: 'POST',
				data: postData
			}).success(function (data, status, headers, config) {
				requestTokenSuccess(data, username);
				// //发送刷新main.html 广播
				// $rootScope.$broadcast('SSOLoginServ', 'success');
				delay.resolve(data);
			}).error(function (data, status, headers, config) {
				delay.reject(data);
			});

			return delay.promise;
		};

		/*
		 * 登陆
		 */
		service.login = function(postData) {
			return this.requestToken(postData);
		};

		/*
		 * 刷新token
		 */
		service.refreshToken = function() {
			$rootScope.$broadcast('logout.success');
			//现在不refresh token了，直接退出登录
			/*var tokenObj = ls.getToken();
			var delay = $q.defer();
			var postData = {
				'grant_type': 'refresh_token',
				'client_id': GLOBAL_SETTING.client_id,
				//'app_secret': GLOBAL_SETTING.app_secret,
				'refresh_token': tokenObj.refresh_token
			};

			this.requestToken(postData)
				.then(function(data) {
					delay.resolve(data);
				}, function(err) {
					//如果refreshToken失败，直接删除token数据，然后跳转到登陆页
					ls.removeToken();
					//跳转至登陆页，调整窗口大小
					SetWinSize(0);
					$location.path('/login');
					delay.reject(err);
				});

			return delay.promise;*/
		};

		return service;
	}
]);

/*
 * 退出登录服务
 */
 security.factory('logoutServ', ['$http', '$q', 'Storage', 'GLOBAL_SETTING',
 	function($http, $q, Storage, GLOBAL_SETTING){
		var URL = GLOBAL_SETTING.URL;
		var service = {};
		var token = Storage.getToken('access_token');

		/*
		 * 退出登陆
		 */
		service.logout = function() {
			var URI = '/api/v1/oauth/tokens/';
			var url = URL + URI + encodeURIComponent(token);
			var delay = $q.defer();
			var that = this;

			$http({
				url: url,
				method: 'DELETE'
			}).success(function (data, status, headers, config) {
				delay.resolve(data, status);
			}).error(function (data, status, headers, config) {
				delay.reject({
					data: data,
					status: status,
					headers: headers,
					config: config
				});
			});

			return delay.promise;
		};

		return service;
	}
]);

/*
 * sso 登陆
 */
security.factory('SSOLoginServ', ['GLOBAL_SETTING', '$http', 'Storage', '$q','$rootScope',
	function(GLOBAL_SETTING, $http, Storage, $q, $rootScope){
	 	return function() {
	 		var delay = $q.defer();

	 		$http({
				url: GLOBAL_SETTING.URL + '/connect/sso_login',
				method: 'GET'
			}).success(function (data, status, headers, config) {
				var tokenObj = Storage.getToken();
				console.info('获取sso token完毕', data);

				//修改token为当前获取到的token
				tokenObj.mx_sso_token = data.mx_sso_token;
				//保存token
				Storage.setToken(tokenObj);

				delay.resolve();
			}).error(function (data, status, headers, config) {
				delay.reject();
			});

			return delay.promise;
	 	}
	}
])

/*
 * 检查登录状态服务
 */
 security.factory('CheckToken', ['Storage', '$location', '$rootScope',
 	function(Storage, $location, $rootScope){
	 	return function() {
	 		var tokenObj = Storage.getToken();
			var accessToken = tokenObj['access_token'];
			if (!accessToken) {
				console.error('Check token failed!');
				$rootScope.$broadcast('logout.success');
				return false;
			}
			return true;
	 	}
	}
])