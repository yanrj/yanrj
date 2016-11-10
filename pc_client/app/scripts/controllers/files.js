'use strict';

angular.module('mxWebClientApp')
	.controller('FilesCtrl', ['$scope', 'CheckToken', '$location', 'Storage','SidebarNavBinder','RTC','CurUserDB',
		function ($scope, CheckToken, $location, Storage, SidebarNavBinder, RTC, CurUserDB) {
			if (!CheckToken()) return;
			//if (!CheckToken()) $scope.$emit('logout.success');
				// $location.path('/login');

			var currentUser = Storage.getUser('currentUser');


		    //初始化数据库
		    CurUserDB.init()
		    .then(function() {
		        //初始化完成后更新当前用户信息到数据库
		        CurUserDB.saveCurUser(currentUser);
		    });

		    //检查全局未读
		    $scope.checkGlobalUnread();

		    //初始化RTC连接服务，以备用户之间点对点连接
		    RTC.init({
		        username: String(currentUser.id)
		    });

		    var count = Storage.convsUnreadNum();
		    if (!_.isNumber(count)) {
		        count = 0
		    }
		    SidebarNavBinder.setMessageUnreadNum(count);

			//将已加入过工作圈数组存入作用域
			$scope.joinedGroups = currentUser.joined_groups;
			$scope.currentUser = currentUser;
			$scope.homeUser = Storage.getUser('homeUser');
			$scope.networkId = $scope.homeUser.network_id;
			$scope.selfId = $scope.homeUser.id;


		}
	]);
