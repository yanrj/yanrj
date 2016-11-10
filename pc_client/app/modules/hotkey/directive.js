'use strict';

angular.module('mx.hotkey')
.directive('hotkey', ['Utils','RootscopeApply','Storage','HotkeyBinder','$injector',
  function(Utils,RootscopeApply,Storage,HotkeyBinder,$injector) {
    return {
      restrict: 'E',
      template: '<div class="setting-item">\
                    <span class="item-tips">激活窗口:</span>\
                    <input placeholder="请定义快捷键" data-type="activateWindow" ng-model="setActiveWin" />\
                    <a href="javascript:;" class="inputRemove" ng-show="showActiveWinRemove"><b>×</b></a>\
                    </div>\
                    <div class="setting-item">\
                      <span class="item-tips">截屏:</span>\
                      <input placeholder="请定义快捷键" data-type="screenShot" ng-model="setScreenShot" />\
                      <a href="javascript:;" class="inputRemove" ng-show="showScreenShotRemove"><b>×</b></a>\
                    </div>',
      controller: ['$scope', function($scope) {
        $injector.invoke(HotkeyBinder.bind, this, {
            $scope: $scope
        });
        //HotkeyBinder.bind($scope);
      }],
      link: function(scope, ele, atrrs) {
        var setInput = ele.find('input');
        var v = scope.setActiveWin,isHotKey = '';

        //初始化绑定快捷键
        //设置快捷键输入框,初始化的时候storage.getUser("currentUser").id没有加载故延时2s
        setTimeout(function(){
          scope.setActiveWin='';
          scope.setScreenShot='';
          var itemArr = [
                          {
                              "type":"setActiveWin",
                              "hotKey_name":"window",
                              "hotKey":Storage.hotKey('window'),
                              "rm_type":"showActiveWinRemove",
                              "bind_type":'activateWindow'
                          },
                          {
                              "type":"setScreenShot",
                              "hotKey_name":"screenShot",
                              "hotKey":Storage.hotKey('screenShot'),
                              "rm_type":"showScreenShotRemove",
                              "bind_type":'screenShot'
                          }
                        ];
          $.each(itemArr, function(i, item){
            scope[item.rm_type] = false;
            v = item.hotKey;
            if(v && Utils.isMac()){
                v = v.replace('CTRL','COMMAND');
            }

            if(!item.hotKey){
              scope[item.type] = '';
            }else{
              scope[item.type] = v || '';
            }
            if(scope[item.type] !== '') scope[item.rm_type] = true;
            //v = $.trim(scope[item.type]).toUpperCase();
            HotkeyBinder.bindHotkey(item.hotKey,item.bind_type);
          });
          HotkeyBinder.keylogging(setInput);
        }, 2000);

        scope.setVal = function(value,bool,type){
          if(type == 'activateWindow'){
            scope.setActiveWin = value.toUpperCase();
            scope.showActiveWinRemove = bool;
          }else if(type == 'screenShot'){
            scope.setScreenShot = value.toUpperCase();
            scope.showScreenShotRemove = bool;
          }
        }
      }
    }
  }
])