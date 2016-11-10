'use strict';
angular.module('mx.services.setting', [])

//设置程序开机自启动,暂时只能支持windows
.factory('SettingBinder', ['Storage', 'Startup', 'Utils','RootscopeApply',
	function(Storage, Startup,Utils, RootscopeApply) {
		var o = {};
		var that, scope;
		var url = '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
		var HKEY = 'HKCU';	 //默认为HKCU HKEY_CURRENT_USER

		o.bind = function($scope) {
			that = this;
			scope = $scope;

			//先清除残留的注册表数据
	        //未来版本(两个版本之后)可以删除下面逻辑
			// Startup.clearHKCU('Minxing', function() {
				//console.info('尝试删除残留注册表启动项', arguments);
			// });
		};

		o.init = function() {
			//获取注册表中的自启动信息，并标记到作用域
			if(Utils.isWindows()){
				Startup.getAutoStartValue('Minxing', url,HKEY, function(data) {
          console.info('****** autostart value is ******:', data);
          RootscopeApply(scope, function() {
         		scope.lastStartup = scope.startup = !!data;
          });
        });
			}
			var itemArr = [
	                    {
	                        "type":"setActiveWin",
	                        "hotKey_name":"window",
	                        "rm_type":"showActiveWinRemove"
	                    },
	                    {
	                        "type":"setScreenShot",
	                        "hotKey_name":"screenShot",
	                        "rm_type":"showScreenShotRemove"
	                    }
	                  ];
	    $.each(itemArr, function(i, item){
        scope[item.type] = Storage.hotKey(item.hotKey_name) || '';
        scope[item.type] == '' ? scope[item.rm_type] = false : scope[item.rm_type] = true;
      });
		};

		o.saveSetting = function() {
			scope.setting.notification = scope.notification;
			scope.setting.disableEnterSend = scope.disableEnterSend;
			scope.setting.setActiveWin = scope.setActiveWin;
			Storage.saveSetting('notification', scope.notification);
			Storage.saveSetting('disableEnterSend', scope.disableEnterSend);
			Storage.saveSetting('setActiveWin', scope.setActiveWin);
			//Storage.saveSetting('startup', scope.startup);

			//如果自启动选项有变化
			if (scope.lastStartup !== scope.startup) {
				scope.lastStartup = scope.startup;

				//如果不是windows系统，则取消设置
				if (!scope.isWindows) return;

				if (scope.startup) {
					//设置开机启动
					Startup.enableAutoStart('Minxing', process.execPath, url,HKEY, function() {
						console.info('尝试增加注册表启动项', arguments);
					});
				} else {
					//取消开机启动
					Startup.disableAutoStart('Minxing', url,HKEY, function() {
						console.info('尝试删除注册表启动项', arguments);
					});
				}
			}
		};

		o.getSetting = function() {
			return scope.setting;
		};

		return o;
	}
])

/**
 * 设置pc端硬启动
 */
.factory('StartPcBinder', ['Storage', 'Startup', 'Utils','RootscopeApply',
	function(Storage, Startup,Utils, RootscopeApply) {
		var o = {};
		o.saveSetting = function(keyName ,valName, url) {
			Startup.enableAutoStart(keyName, valName, url, function() {
				console.info('尝试增加注册表启动项', arguments);
			});
		};

		return o;
	}
])

.factory('Startup', ['Utils',
	function(Utils) {
		var o = {};
		if(!Utils.isWindows()){
			return o;
		}
		var WinReg = require('node-webkit-winreg');
		
		/**
		 * HKLM HKEY_LOCAL_MACHINE
		 * HKCU HKEY_CURRENT_USER
		 * HKCR HKEY_CLASSES_ROOT
		 * HKCC HKEY_CURRENT_CONFIG
		 * HKU HKEY_USERS
		 */
		

		o.enableAutoStart = function(name, filePath, url,HKEY, callback){
	        var key = getKey(url,HKEY);
	        key.set(name, WinReg.REG_SZ, filePath, callback || noop);
	    };

	    o.disableAutoStart = function(name, url,HKEY, callback){
	        var key = getKey(url,HKEY);
	        key.remove(name, callback || noop);
	    };

	    o.getAutoStartValue = function(name, url,HKEY, callback){
	        var key = getKey(url,HKEY);
	        key.get(name, function(error, result){
	            if(result){
	                callback(result.value);
	            }
	            else{
	                callback(null, error);
	            }
	        });
	    };

	    o.clearHKCU = function(name, url, HKEY, callback) {
	        var key = getKey(url,HKEY);	 //CurrentUser

	        key.get(name, function(error, result){
	        	//console.info('清除HKCU中多余的注册表信息，先获取', result ? result.value : result);
            if (result){
                key.remove(name, callback || noop);
            } else {
                callback('不存在要清除的注册表');
            }
	        });
	    };

	    function getKey(url, HK){
		    return new WinReg({
		        hive: WinReg[HK],
		        key: url
		    });
		}

		function noop(){}

		return o;
	}
])