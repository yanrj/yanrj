/*
 * 对话框中的对话渲染
 */

'use strict';
angular.module('mx.conversations.item', [])

.filter('urlFilter', ['GLOBAL_SETTING', function(GLOBAL_SETTING) {
	return function(url) {
		var URL = GLOBAL_SETTING.URL;
		var reg = new RegExp('^https?:\/\/', 'i');
		var oUrl = url;

		if (!reg.test(url)) {
			oUrl = URL + oUrl;
		}

		return oUrl;
	};
}]);