'use strict';

/*
 * 索引控制器
 * 逻辑: 判断用户登录状态，并根据状态进行跳转
 */
angular.module('mxWebClientApp')
  .controller('IndexCtrl', ['IndexBinder', '$scope', '$injector','CheckAppVersion',
  	function (IndexBinder, $scope, $injector,CheckAppVersion) {
      $scope.showReconnectBtn = false;    //是否显示重新连接按钮
		  //绑定index索引页服务
      $injector.invoke(IndexBinder.bind, this, {
          $scope: $scope
      });

	    IndexBinder.checkAll();

      //检查版本更新
      CheckAppVersion(0);
  }]);
