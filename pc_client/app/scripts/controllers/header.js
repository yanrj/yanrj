'use strict';

/*
 * Header Element
 */
angular.module('mxWebClientApp')
  .controller('HeaderCtrl', ['$scope', '$location', 'CheckToken','Storage','Cache', 'GLOBAL_SETTING','ConversationBinder',
  	function ($scope, $location, CheckToken, Storage, Cache, GLOBAL_SETTING, ConversationBinder) {

  		$scope.showConvInfo = false;

      
      
      
      
  		//判断跳转，并隐藏对话信息
  		$scope.$on('$routeChangeStart', function(next, current) {
	  		$scope.showConvInfo = false;
  		});
  }]);