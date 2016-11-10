'use strict';
angular.module('mx.services.eggs', [])

.constant('SecretKeywords', {
	showDevTools: '=== i\'m developer ===',
	hideDevTools: '=== i\'m not developer ===',
	reconnectRealtime: '=== reconnect realtime ==='
})

.factory('PublisherEggs', ['SecretKeywords', 'RealtimeServ',function(SecretKeywords,RealtimeServ){
	return function(publishBody){
		var gui = require('nw.gui');
		var win = gui.Window.get();

		switch(publishBody) {
			case SecretKeywords.showDevTools:
				//显示开发人员调试面板
				win.showDevTools();
				break;
			case SecretKeywords.hideDevTools:
				//隐藏开发人员调试面板
				win.closeDevTools();
				break;
			case SecretKeywords.reconnectRealtime:
				RealtimeServ.reconnect();
				break;
		}
	};
}])