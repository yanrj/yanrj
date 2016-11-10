'use strict';

angular.module('mxWebClientApp')
  .controller('CollectionCtrl', ['$scope', 'CheckToken', '$route', 'CurUserDB', 'Storage', 'RTC','AppRootBinder', '$compile','SidebarNavBinder',
    function ($scope, CheckToken, $route, CurUserDB, Storage, RTC, AppRootBinder, $compile, SidebarNavBinder) {
        if (!CheckToken()) return;

        //显示面包屑组件
        $scope.showCrumbs = true;
        $scope.showCrumbsPath = true;
        
        var user = Storage.getUser('currentUser');

        // if (!CurUserDB.checkOpened(user.id)) {
        //初始化数据库
        CurUserDB.init()
        .then(function() {
            //初始化完成后更新当前用户信息到数据库
            CurUserDB.saveCurUser(Storage.getUser('currentUser'));
        });
        // }

        //检查全局未读
        $scope.checkGlobalUnread();

        //初始化RTC连接服务，以备用户之间点对点连接
        RTC.init({
            username: String(user.id)
        });

        var count = Storage.convsUnreadNum();
        if (!_.isNumber(count)) {
            count = 0
        }
        SidebarNavBinder.setMessageUnreadNum(count);
}
  ]);