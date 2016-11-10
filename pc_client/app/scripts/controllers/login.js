'use strict';

angular.module('mxWebClientApp')
	.controller('LoginCtrl', ['$scope', '$location', 'loginServ', 'CheckToken', 'GLOBAL_SETTING', 'Storage', 'CommunitySwitcherBinder', 'SetWinSize', 'SSOLoginServ', '$q', '$rootScope','Cache',
		function ($scope, $location, loginServ, CheckToken, GLOBAL_SETTING, Storage, CommunitySwitcherBinder, SetWinSize, SSOLoginServ, $q, $rootScope, Cache) {
			var service = loginServ;	//登陆服务
			var usernameList = Storage.userNameList();
			var lastUsername = '';		//最后一次登录名

			$scope.error = '';
			$scope.autoLogin = false;
			$scope.loginType = 'form';
			//登陆页强制设置窗口大小为登陆框大小
			SetWinSize(0);

			//先检查用户登录状态，如果已登陆则跳转
			//debugger;
			if (CheckToken()) {
				$scope.$emit('login.success');
				return;
			}

			//清空社区切换模块
			CommunitySwitcherBinder.clear();

			//获取最后一次登录的用户名
			if (usernameList && usernameList.length > 0) {
				lastUsername = usernameList.pop();
			}
			//初始化登陆POST数据
			$scope.user = {
				grant_type: GLOBAL_SETTING.grant_type,
				client_id: GLOBAL_SETTING.client_id,
				//app_secret: GLOBAL_SETTING.app_secret,
				login_name: lastUsername,
				password: '',
				nonce: ''
			};
		    //获取hash后面的所有参数
		    function UrlSearch(str) {
		        var name,value;
		        var num=str.indexOf("?")
		        str=str.substr(num+1); //取得所有参数   stringvar.substr(start [, length ]

		        var arr=str.split("&"); //各个参数放到数组里
		        for(var i=0;i < arr.length;i++){
		        	num=arr[i].indexOf("=");
		         	if(num>0){
			           	name=arr[i].substring(0,num);
			           	value=arr[i].substr(num+1);
			           	this[name]=value;
		            }
			  	}
			}
			var gui = require('nw.gui');
			var win = gui.Window.get();
			//显示窗口进行sso登录
			gui.App.on("open", function(a){
				win.show();
				var startArgs = a;
				var request=new UrlSearch(startArgs);
				if(request.SSOToken && request.name){
					$scope.start_mx_sso_token = request.SSOToken;
					$scope.name = request.name;
					var srartName = $scope.name;
					//初始化登陆POST数据
					$scope.user = {
						grant_type: "sso_token",
						client_id: GLOBAL_SETTING.client_id,
						//app_secret: GLOBAL_SETTING.app_secret,
						//login_name: lastUsername,
						sso_token: $scope.start_mx_sso_token
						//password: '',
						//nonce: ''
					};
					$scope.login();
		    		return;
				}
			});
			//热启动进行sso登录
			window.addEventListener("load", function (event) {
				var gui = require('nw.gui');
				var win = gui.Window.get();
				var startArgs = gui.App.argv.toString();
				// var startArgs = 'aaaa:chatWithSSOToken?name=t18&SSOToken=AAAAAAAAAAAAvzsY1f6XEjs6uYQxlV1QMw==';
				//var startArgs = 'aaaa:chat?name=t42';
				var request=new UrlSearch(startArgs)
				if(request.SSOToken && request.name){
					$scope.start_mx_sso_token = request.SSOToken;
					$scope.name = request.name;
					var srartName = $scope.name;
					//初始化登陆POST数据
					$scope.user = {
						grant_type: "sso_token",
						client_id: GLOBAL_SETTING.client_id,
						//app_secret: GLOBAL_SETTING.app_secret,
						//login_name: lastUsername,
						sso_token: $scope.start_mx_sso_token
						//password: '',
						//nonce: ''
					};
					$scope.login();
		    		return;
				}
	        });

			//验证登录表单
			var check = function() {
				var uName = $.trim($scope.user.login_name);
				var uPwd = $scope.user.password;

				if (!uName) {
					$scope.error = '请输入登录帐号';
					return false;
				}

				if (!uPwd) {
					$scope.error = '请输入密码';
					return false;
				}

				return true;
			};

			//初始化二维码扫描登陆
			var initQRLogin = function() {
				$scope.qrLogin = MX.initQRLogin({containerId:"mc-widget-qrlogin"});

				MX.on("qr.events",function (event) {
					var status = event.status;

					if (status === 'accepted') {
						//如果扫描二维码成功，将用户名存入作用域，以备认证通过时使用
						$scope.login_name = event.login_name;
					} else if (status === 'success') {
						//如果认证通过, 把之前保存的用户名存入数据
						event.login_name = $scope.login_name;
						//调用请求token的API
						service.QRLogin(event)
							.then(function(data) {
									//调用数据成功，进入登录成功页面
									$scope.$emit('login.success');
								}, function(err) {
								});
					}
				})
			};

			var serviceLogin = function(){
				service.login($scope.user)
					.then(function(data) {
						//登陆成功，调整窗口大小
						SetWinSize(1);
						//触发登陆成功事件
						$scope.$emit('login.success');
						// setTimeout(function(){
						// 	console.log('$scope.name::', $scope.name)
						// 	var srartName = $scope.name;
						// 	if(srartName){
						// 		$rootScope.$broadcast('login.start',srartName);
						// 	}
						// }, 3000)
					}, function(err) {
						var txt = '登录失败，请检查网络，稍后再试';

						//获取配置信息
						if($scope.user.login_name === 'getconfig'){
							alert("配置信息: \n\n URL ==>  " + GLOBAL_SETTING.URL);
							return
						}

						if (!err) {
							$scope.error = txt;
							return;
						}

						//登录失败
						if (!err.errors) {
							$scope.error = txt;
						} else {
							//如果密码或账号错误，将密码清空
							document.getElementsByName('password')[0].value = '';
							$scope.error = err.errors.message;
						}

						//如果token过期(401)，则请求更新token
						//改为退出登录
						if (err.status === 401) {
							$scope.$emit('logout.success');
							//service.refreshToken();
						}
					});
			}

			//登陆，调用Service的登陆
			$scope.login = function(e) {
				if($scope.start_mx_sso_token){
					serviceLogin();
				}else{
					if (!check()) return;

					//获取随机数
					var nonce = generateKey(16);

					//密码加密
			  	document.getElementsByName('password')[0].value = encrypt( document.getElementsByName('password')[0].value,nonce)
			  	//把加密后的密码赋值
			  	$scope.user.password = document.getElementsByName('password')[0].value;
			  	//随机数字段
			  	$scope.user.nonce = nonce;
				serviceLogin();
				}
			}
			$scope.sweepQR = function(){
				$scope.loginType = 'QR';

				if (!$scope.qrLogin) initQRLogin();
			}

			$scope.backLogin = function(){
				$scope.loginType = 'form';
			}

			$scope.backScann = function(){
				$scope.qrLogin.showUnscannedView();
			}
		}
	]);