'use strict';
angular.module('mx.services.cache', [])
/*
 * 缓存
 */
.factory('Cache', ['$cacheFactory',
  function($cacheFactory) {
    return $cacheFactory('mxClient');
  }
])