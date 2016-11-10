'use strict';

angular.module('mxWebClientApp')
  .directive('btnLogout', ['TipsPopBinder', 'ConversationBinder', 'GLOBAL_SETTING', 'RealtimeServ', 
    function(TipsPopBinder, ConversationBinder, GLOBAL_SETTING, RealtimeServ) {
      return {
        restrict: 'A',
        controller: ['$scope', '$location', 'loginServ', 'logoutServ', '$rootScope', 'Storage',
          function($scope, $location, loginServ, logoutServ, $rootScope, Storage) {
            $scope.logout = function() {
              //解除对话锁定
              if (ConversationBinder.locked) {
                ConversationBinder.unlock();
              }

              //先执行退出本地逻辑(如删除token，调整窗口尺寸)
              $rootScope.$broadcast('logout.success');

              //再发送退出登录请求
              logoutServ.logout()
                .then(function(data, status) {
                  // var type = '2';
                  // RealtimeServ.disconnect();
                  // RealtimeServ.clear(type);
                  //本地保存是否下次自动登录
                  //Storage.autoLogin(false);
                  //$rootScope.$broadcast('logout.success');
                }, function(results) {
                  var status = results.status;
                  console.log('logout failed\n' + 'status:' + status);

                  //如果401，刷token
                  //注释时间： 2015-06-30
                  /*if (status === 401) {
                    $rootScope.$broadcast('logout.success');
                    loginServ.refreshToken()
                      .then(function(data) {
                        //刷新token成功，再次请求退出
                        $scope.logout();
                      }, function() {
                        console.error('刷新token失败！');
                      });
                  }*/
                });
            }
          }
        ],
        link: function postLink(scope, element, attrs) {
          element.on('click', function(e) {
            e.preventDefault();
            //弹窗提示之后才关闭
            TipsPopBinder.show({
              body: '退出' + GLOBAL_SETTING.name_cn + '将无法收到新消息，确定退出？',
              showCancel: true,
              showConfirm: true,
              confirmed: function() {
                scope.logout();
              }
            });
          });
        }
      };
    }
  ]);
