'use strict';

angular.module('mxWebClientApp')

/**
 * 
 * 收藏数据接口
 * method:get ==> 获取
 * method:post ==> 收藏
 * method:delete ==> 删除
 * 
 */
.factory('CollectonServ', ['$q', 'GLOBAL_SETTING', '$http', function($q, GLOBAL_SETTING, $http) {
    return function(method,data) {
        if(!method) return;
        if(!data) data = {};
        var delay = $q.defer();
        var url = GLOBAL_SETTING.URL + '/api/v1/messages/favorite/current';
        if(method == 'get'){
            url = GLOBAL_SETTING.URL + '/api/v1/messages/favorite/current?limit='+data.limit;
        }else if(method == 'delete'){
            url = GLOBAL_SETTING.URL + '/api/v1/messages/favorite/current?id='+data.id;
            data = {};
        }
        $http({
            method: method,
            url: url,
            data: data,
            dataType: "json",
        }).success(function(data) {
            delay.resolve(data);
        }).error(function(err) {
            delay.reject(err);
        });

        return delay.promise;
    };
}])