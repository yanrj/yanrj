'use strict';

angular.module('mxWebClientApp')
  .controller('MainCtrl', ['$scope', 'CheckToken', '$location', '$rootScope', '$route', 'CurUserDB', 'Storage', 'RTC','$compile','GLOBAL_SETTING','ConversationBinder','$http','Cache','AppRootBinder',
    function($scope, CheckToken, $location, $rootScope, $route, CurUserDB, Storage, RTC, $compile, GLOBAL_SETTING, ConversationBinder, $http, Cache,AppRootBinder) {
      //获取hash后面的所有参数
      function UrlSearch(str) {
            var name,value;
            var num=str.indexOf("?")
            str=str.substr(num+1); //取得所有参数   stringvar.substr(start [, length ]

            var arr=str.split("&"); //各个参数放到数组里
            for(var i=0;i < arr.length;i++){
              num=arr[i].indexOf("=");
              if(num>0){
                  name=arr[i].substring(0,num);
                  value=arr[i].substr(num+1);
                  this[name]=value;
                }
          }
      }
      //启动进入聊天会话方法
      var startEnterChat = function(srartName){
        setTimeout(function(){
          $scope.currentUser = Storage.getCurrentUser();
          $scope.network = Storage.getUser('homeUser');
          if(!$scope.network || !srartName) return;
          var URL = GLOBAL_SETTING.URL;
          var uri = '/api/v1/users/by_login_name?network_name='+$scope.network.network_name+'&login_name='+srartName;
          var url = URL + uri;
          var type = "get";
          var srartNameArrs = [];
          srartNameArrs.push(srartName);
          var params = '';
          $http({
              method: type,
              url: url,
              data: params
          }).success(function(data) {
             var isMultiUser = srartNameArrs.length > 1;
              var data = {
                  creator_id: $scope.currentUser.id,
                  type: isMultiUser ? 'new_conv' : 'user',
                  network_id: $scope.network.network_id,
                  is_multi_user: isMultiUser ? true : false,
                  id: [data.id],
                  user_ids: {
                      count: srartNameArrs.length,
                      ids: srartNameArrs
                  }
              }
              ConversationBinder.trigger(data);
          }).error(function(err) {
            console.log(err)
          });
        }, 3000);
      }
      //热启动进行跳转对话
      window.addEventListener("load", function (event) {
        var gui = require('nw.gui');
        var startArgs = gui.App.argv.toString();
        // var startArgs = 'aaaa:chatWithSSOToken?name=t18&SSOToken=AAAAAAAAAAAAvzsY1f6XEjs6uYQxlV1QMw==';
        //var startArgs = 'aaaa:chat?name=t42';
        var request=new UrlSearch(startArgs);
        var srartName = request.name;
        startEnterChat(srartName);
      });
      var gui = require('nw.gui');
      var win = gui.Window.get();
      //显示窗口进行跳转对话
      gui.App.on("open", function(a){
        win.show();
        var startArgs = a;
        var request=new UrlSearch(startArgs);
        var srartName = request.name;
        startEnterChat(srartName);
      });
      var initFn = function(){
        var timeer = setInterval(function(){
          var user = Storage.getUser('currentUser');
          if(user){
            // if (!CurUserDB.checkOpened(user.id)) {
              //初始化数据库
              CurUserDB.init()
                .then(function() {
                  //初始化完成后更新当前用户信息到数据库
                  CurUserDB.saveCurUser(Storage.getUser('currentUser'));
                }); 
            // }
            
            //通过$compile动态编译html
            var _html = '<div class="main-html-c" ng-include="\'views/main.html\'"></div>';
            var template = angular.element(_html);
            var sidebarElement = $compile(template)($scope);
            angular.element(".main-html").html(sidebarElement);

            //检查全局未读
            $scope.checkGlobalUnread();

            var clearLoading = setInterval(function(){
              if($(".main-html .main-wrap .list .item").length > 0){
                $(".main-html .container-loading-bg").hide();
                clearInterval(clearLoading);
              }
            }, 200)

            //初始化RTC连接服务，以备用户之间点对点连接
            RTC.init({
              username: String(user.id)
            });
            clearInterval(timeer)
          }else{
            return;
          }
        }, 100);
  
        //为h5 聊天暴露选人聊天接口
        $scope.h5ApiTrigger = function(data){
          ConversationBinder.trigger(data);
        }

        //给H5插件注入数据
        setTimeout(function(){
          $scope.getToken = Storage.getToken();
          $scope.globalSetting = GLOBAL_SETTING;
          $scope.MXPluginsConfig = MXPluginsConfig;
          $scope.currentUser = Storage.getCurrentUser();
          $scope.network = Storage.getUser('homeUser');
        }, 3000);
      }

      //接收刷新main.html 广播
      $scope.$on('SSOLoginServ', function(data){
        initFn();
      });

      if (!CheckToken())  return;
      initFn();
      
    }
  ]);
