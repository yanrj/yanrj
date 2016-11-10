'use strict';

angular.module('mxWebClientApp')

/**
 * 应用中心REST请求Resource
 */
.factory('AppsServ', ['$resource', 'GLOBAL_SETTING', function($resource, GLOBAL_SETTING) {
  var url = GLOBAL_SETTING.URL + '/api/v1/apps/:uri_type/:id';

  return $resource(url, {
    id: '@id',
    uri_type: '@uri_type'
  });
}])

//应用中心容器绑定服务
.factory('AppCenterWrapBinder', ['RootscopeApply',
  function(RootscopeApply) {
    var o = {};
    var that, scope;

    o.bind = function($scope) {
      that = this;
      scope = $scope;
    };

    /**
     * 初始化应用中心应用列表列表
     * @param data[Object]: 应用列表数据
     */
    o.init = function(data) {
      RootscopeApply(scope, function() {
        scope.scopeWorker(data);
      });

      o.show();
    };

    o.show = function() {
      RootscopeApply(scope, function() {
        scope.showWrap = true;
      });
    };

    o.hide = function() {
      RootscopeApply(scope, function() {
        scope.showWrap = false;
      });
    };

    return o;
  }
])

//应用信息绑定服务
.factory('AppInfoBinder', ['RootscopeApply',
  function(RootscopeApply) {
    var o = {};
    var that, scope;

    o.bind = function($scope) {
      that = this;
      scope = $scope;
    };

    o.show = function(data) {
      RootscopeApply(scope, function() {
        scope.showAppInfo = true;
        scope.scopeWorker(data);
      });
    };

    o.hide = function() {
      RootscopeApply(scope, function() {
        scope.showAppInfo = false;
      });
    };

    return o;
  }
])

/**
 * 应用中心界面中的面包屑服务
 */
.factory('AppsCrumbs', ['Crumbs', 'AppCenterWrapBinder', 'AppInfoBinder',
  function(Crumbs, AppCenterWrapBinder, AppInfoBinder) {
    var o = {};

    //初始化面包屑组建
    o.init = function(options) {
      var data = options.data;
      var name = options.name;

      Crumbs.init({
        triggerHandler: function(data) {
          AppCenterWrapBinder.init(data);
          AppInfoBinder.hide();
        }
      });

      //添加记录
      Crumbs.add({
        name: name,
        data: data
      });
    };

    /**
     * 处理面包屑组件数据变动
     * @param type[String]: 操作类型{'added': 添加, 'not_added': 未添加应用}
     * @param data[Object]: 应用/公众号数据
     */
    o.update = function(type, data) {
      var delIndex = type === 'not_added' ? 1 : 0;
      var addIndex = type === 'not_added' ? 0 : 1;
      var crumbToDel = Crumbs.arr(delIndex);
      var crumbToAdd = Crumbs.arr(addIndex);

      if (crumbToDel) {
        //临时暂存安装状态
        crumbToDel.installed = crumbToDel.data.installed;

        //删除已订阅项
        crumbToDel.data = crumbToDel.data.filter(function(ele) {
          return ele.app_id !== data.app_id;
        });

        //存储未订阅状态
        crumbToDel.data.installed = crumbToDel.installed;

        //修改面包屑数据
        Crumbs.put(delIndex, crumbToDel);
      }

      if (crumbToAdd) {
        crumbToAdd.installed = crumbToAdd.data.installed;
        //增加未订阅项
        crumbToAdd.data.push(data);

        //存储未订阅状态
        crumbToAdd.data.installed = crumbToAdd.installed;

        //修改面包屑数据
        Crumbs.put(addIndex, crumbToAdd);
      }
    };

    return o;
  }
])