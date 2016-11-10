'use strict';
/*
 * 搜索列表服务
 */
angular.module('mx.search')
    .factory('SearchResultBoxBinder', [
        function() {
            var o = {};
            var scope;

            o.bind = function($scope) {
                scope = $scope;
            };

            //搜索框非空，搜索到联系人，并且找到数据
            o.openContact = function(items) {
                //把搜索框得到的数据传给搜索列表显示出来
                scope.originalContacts = items;
                scope.contacts = _.first(items, 5);
                scope.showBox = false;
                scope.contactLength = true;
                scope.expandContact = false;
                if (items.length > 5) {
                    //搜索的的联系人个数大于5
                    scope.contactNum = false;
                    scope.showBox = true;
                } else if (items.length <= 5) {
                    //搜索的的联系人个数小于5
                    scope.showBox = true;
                    scope.contactNum = true;
                }
                setTimeout(o.select.init, 200);
            };
            //搜索框非空，搜索到群聊，并且找到数据
            o.openGroup = function(items) {
                //把搜索框得到的数据传给搜索列表显示出来
                scope.originalGroups = items;
                scope.groups = _.first(scope.originalGroups, 5);
                scope.showBox = false;
                scope.groupLength = true;
                scope.expandGroup = false;
                if (items.length > 5) {
                    //搜索的的群聊个数大于5
                    scope.groupNum = false;
                    scope.showBox = true;
                } else {
                    //搜索的的群聊个数小于5
                    scope.showBox = true;
                    scope.groupNum = true;
                }
                setTimeout(o.select.init, 200);
            };
            //搜索框为空
            o.close = function() {
                if (scope == null) {
                    return;
                }
                scope.contactLength = false;
                scope.groupLength = false;
                scope.showBox = false;
                scope.expandContact = false;
                scope.expandGroup = false;
            }

            //搜索框非空，但未找到联系人数据
            o.noContactData = function() {
                    scope.showBox = true;
                    scope.contactLength = false;
                    scope.contactNum = true;
                }
                //搜索框非空，但未找到群聊数据
            o.noGroupData = function() {
                scope.showBox = true;
                scope.groupLength = false;
                scope.groupNum = true;
            }
            o.select = {
                prev: function() {
                    scope.prev();
                },
                next: function() {
                    scope.next();
                },
                select: function() {
                    scope.select();
                },
                init:function(){
                    scope.init();
                }
            }

            return o;
        }
    ])
    /*
     * 搜索框服务
     */
    .factory('SearchInputBinder', [
        function() {
            var o = {};
            var scope;

            o.bind = function($scope) {
                scope = $scope;
            };
            o.focusInput = function() {
                scope.focusInput();
            };
            //当用户搜索到联系人并点击进入对话面板时，清空搜索框
            o.empty = function() {
                scope.searchResultValue = '';
                scope.showRemove = false;
            }

            return o;
        }
    ])