'use strict';
angular.module('mxWebClientApp')

//索引页面检查一些必要数据
.factory('IndexBinder', ['$rootScope', 'CheckToken', '$location', 'CheckUser',
	'PopMessage', 'AppRootBinder', 'SetWinSize', 'SSOLoginServ','$http','Storage','GLOBAL_SETTING',
	function($rootScope, CheckToken, $location, CheckUser,PopMessage, AppRootBinder,
		SetWinSize, SSOLoginServ, $http, Storage,GLOBAL_SETTING) {
		var o = {};
		var scope, that;

		o.bind = function($scope) {
			scope = $scope;
			that = this;
		};

		o.checkAll = function() {
			//debugger;
			if (!CheckToken()) return;
			//if (!CheckToken()) $rootScope.$broadcast('logout.success');
		    var checkUser = function() {
		    	//检查是否已保存用户信息,确认后转向主页面
			    CheckUser()
		    	.then(function() {
		    		
			        	 var sidebarItems =  GLOBAL_SETTING.modulesLayout.sidebar;
			        	var validModules = Storage.validModules();
		    			var url = '/main';
		    			var itemNum = sidebarItems.length;
			            // $.each(sidebarItems, function(index, val) {
			            // 	var isInArr = $.inArray(val.module, validModules);
			            // 	if((val.module == 'contacts') || (val.module == 'files') || (isInArr >= 0)){
			            // 		if(itemNum > val.sequence){
			            // 			itemNum = val.sequence;
			            // 			url = val.jumpUrl;
			            // 		}
			            // 	}
			            // });

			            SetWinSize(1);
	            		$location.path(url);
						AppRootBinder.reConnectBtn('hide');

			            // $.inArray(value, array)
		    		
			    }, function(err) {
			    	var status = err.status;

			    	//在登陆页面不作处理
			    	if ($location.path() === '/login') return;

	    			if (status === 0) {
	    				err.message = '网络异常，请稍后重试.';
	    				AppRootBinder.reConnectBtn('show');
	    			}

	    			PopMessage.err(err);
	    		});
	    	};

	    	SSOLoginServ()
		    .finally(function() {
	    		//不管是否成功，都进入页面，后面再记录状态
    			checkUser();
    		});

		    //检查客户端版本
		    /*CheckAppVersion(0)
		    	.then(function() {
		    		//先请求SSO_token
		    		return SSOLoginServ();
		    	})
	    		.then(function() {
	    			checkUser();
	    		});*/
		};

		return o;
	}
])