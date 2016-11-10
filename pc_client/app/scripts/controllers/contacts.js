'use strict';

angular.module('mxWebClientApp')
  .controller('ContactsCtrl', ['$scope', 'CheckToken', 'FriendsListServ', '$route', 'CurUserDB', 'Storage', 'RTC','AppRootBinder', '$compile','SidebarNavBinder', 'GLOBAL_SETTING',
    function ($scope, CheckToken, FriendsListServ, $route, CurUserDB, Storage, RTC, AppRootBinder, $compile, SidebarNavBinder, GLOBAL_SETTING) {
    if (!CheckToken()) return;
    //if (!CheckToken()) $scope.$emit('logout.success');
    	//return $location.path('/login');

    //初始化好友列表
    FriendsListServ.init();

    var user = Storage.getUser('currentUser');

    // if (!CurUserDB.checkOpened(user.id)) {
    //初始化数据库
    CurUserDB.init()
    .then(function() {
        //初始化完成后更新当前用户信息到数据库
        CurUserDB.saveCurUser(Storage.getUser('currentUser'));
    });
    // }
    
    if(GLOBAL_SETTING.default_show_contact_list){
        $(".contact-list").hide();
        $('.contactdet-warp').css('width',"100%");
    }

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
  }]);