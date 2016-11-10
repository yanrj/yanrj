'use strict';
angular.module('mxWebClientApp', [
	'ngCookies',
	'ngResource',
	'ngSanitize',
	'ngRoute',
	'ngStorage',
	'ngAnimate',
	'mx.services.DB',
	'mx.window',
	'mx.services',
	'mx.conversations',
	'mx.publisher',
	'mx.sidebar',
	'mx.filters',
	'mx.contacts',
	'mx.treecontacts',
	'mx.crumbs',
	'mx.user',
	'mx.workCircle',
	'mx.files',
	'mx.rtc',
	'angularFileUpload',
	'mx.search',
	'mx.utils',
	'mx.hotkey',
	'ngDragDrop',
	'pascalprecht.translate'
])

.config(['$routeProvider', '$httpProvider', 'GLOBAL_SETTING', 'RTCProvider','$compileProvider','$translateProvider',
	function($routeProvider, $httpProvider, GLOBAL_SETTING, RTCProvider,$compileProvider,$translateProvider) {
		$routeProvider
			.when('/', {
				templateUrl: 'views/index.html',
				controller: 'IndexCtrl'
			})
			.when('/main', {})
			.when('/contacts', {
				templateUrl: 'views/contacts-list.html',
				controller: 'ContactsCtrl'
			})
			.when('/tree-contacts', {
				templateUrl: 'views/tree-contacts-list.html',
				controller: 'TreeContactsCtrl'
			})
			.when('/app-centre', {
				templateUrl: 'views/app-centre.html',
				controller: 'AppCentreCtrl'
			})
			.when('/login', {
				templateUrl: 'views/login.html',
				controller: 'LoginCtrl'
			})
			.when('/work-circle', {
				templateUrl: 'views/work-circle.html',
				controller: 'WorkCircleCtrl'
			})
			.when('/files', {
				templateUrl: 'views/files.html',
				controller: 'FilesCtrl'
			})
			.when('/collection', {
				templateUrl: 'views/collection.html',
				controller: 'CollectionCtrl'
			})
			.otherwise({
				redirectTo: '/'
			});

		//全局命名空间
		window.MXPC = {};

		//将配置中的中文名解码，有一些中文文字会导致乱码
		GLOBAL_SETTING.name_cn = unescape(GLOBAL_SETTING.name_cn);
		GLOBAL_SETTING.conversations_title = unescape(GLOBAL_SETTING.conversations_title);

		//配置请求参数为字符串形式
		$httpProvider.defaults.transformRequest = function(data) {
			if (data === undefined || typeof data === 'string') {
				return data;
			}
			return $.param(data);
		};
		//协议白名单，app://这是自定义协议，需要添加进去，要不然会出现unsafe的请求
		$compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|app|data|javascript|launchapp):/);
		$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|app|data|javascript|launchapp):/);	
		//RTC配置
		RTCProvider.config({
			socketUrl: GLOBAL_SETTING.URL
			//socketUrl: 'https://www.minxing365.com'
		});

		//配置默认请求Headers
		$httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

		//拦截http请求
		$httpProvider.interceptors.push(function($q, $rootScope) {
		  return {
		  	//拦截请求返回错误的处理，统一处理错误返回
				'responseError': function(rejection) {
					console.info('interceptor http拦截器', rejection);
					if (rejection.status == 401) {
						//如果401，直接退出登录
						$rootScope.$broadcast('logout.success');
					}
					return $q.reject(rejection);
				}
		  };
		});

		var gui = require('nw.gui');
		var win = gui.Window.get();

		//刷新客户端
		window.MXPC.reload = function(type) {
			var gui = require('nw.gui');
			var win = gui.Window.get();

			if (type === 'dev') {
				win.reloadDev();
			} else {
				win.reload();
			}
		};

		//MacOS 下点击Dock上的图标会触发reopen事件，此时将window显示出来
		gui.App.on('reopen', function(a,e) {
			console.info('reopen',a, e);
		    win.show();
		});

		//双击exe，激活窗口。
		gui.App.on("open", function(a){
		    win.show();
		});

		//设置crash dump保存目录，记录程序崩溃信息
		gui.App.setCrashDumpDir('./');

		// var bool = true;

		// win.on('move', function(x,y) {
		// 	var screenWidth = window.screen.width
		// 	var winWidth = win.width;
		// 	var newWinWidth;
		// 	//console.log('win11win.window111', x, y);

		// 	//win.setMinimumSize(100,win.height);
		// 	//win.resizeTo(100,win.height);
		// 	//console.info('123',screenWidth-x, winWidth / 2 );
		// 	if(screenWidth-x <= winWidth / 2 && bool){
		// 		bool = false;
		// 		//newWinWidth = screenWidth-x;
		// 		win.setMinimumSize(0,win.height);
		// 		win.window.resizeTo(10,win.height);
		// 		win.setAlwaysOnTop(true);
		// 		win.setTransparent(true);
		// 		//win.moveBy(screenWidth-10, y)
		// 		console.info('可以隐藏了！', win.width);

		// 	}else{
		// 		bool = true;
		// 	}
		// 	console.info('12312312312', win.width);
		// });
		
		//当主窗口关闭时，通知窗口随之关闭
		/*win.on("close", function() {
		    //gui.App.quit();
		    //关闭通知相关窗口
		    window.DEA.notifications.closeAll();
		    win.close(true);
		  });*/

		
		//国际化
		
		// var translations = {
		//   	setting_select_language : 'select language'
		// };
		
		var lang = window.localStorage.lang||'ch';
		$translateProvider.useStaticFilesLoader({
			prefix: 'scripts/i18n/',
			suffix: '.json'
		});
		
		// add translation table
		// $translateProvider.translations('en', translations);
		$translateProvider.preferredLanguage(lang);

		// var pr = require('child_process');

		// var cp = pr.exec("REG QUERY HKEY_CURRENT_USER\Software\QQ /v Name",function(error,stdout,stderr){
		// 	console.log('stdout:'+stdout);
		// 	console.log('stderr:'+stderr);
		// 	if(error != null){
		// 		console.log('exec error:'+error);
		// 	}
		// });
	}
])
.run(function() {
	/*window.onerror = function(event) {
		console.error(event);
		return true;
	};*/
	//初始化弹窗组件的中文提示
	$.extend(true, $.magnificPopup.defaults, {
	  tClose: '关闭 (Esc)', // Alt text on close button
	  tLoading: '正在加载...', // Text that is displayed during loading. Can contain %curr% and %total% keys
	  gallery: {
	    tPrev: '上一张 (或键盘左键)', // Alt text on left arrow
	    tNext: '下一张 (或键盘右键)', // Alt text on right arrow
	    tCounter: '%curr% / %total%' // Markup for "1 of 7" counter
	  },
	  image: {
	    tError: '<a href="%url%">图片</a> 加载失败.' // Error message when image could not be loaded
	  },
	  ajax: {
	    tError: '<a href="%url%">内容</a> 加载失败.' // Error message when ajax request failed
	  }
	});
});