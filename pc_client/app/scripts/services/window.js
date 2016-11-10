'use strict';
angular.module('mx.window', [])

.factory('NewMsgFlashBinder', [
	function() {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		//接收新消息
		o.init = function(msgData) {
			scope.scopeWorker(msgData);
		};

		o.clearTimer = function() {
			scope.clearTimer();
		}

		//接收未读数
		/*o.unRead = function(UnreadNum) {
			scope.unreadShow(UnreadNum);
		};*/

		return o;
	}
])