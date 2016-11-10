'use strict';
angular.module('mx.search')

//搜索框
.directive('searchInput', ['$injector', 'RootscopeApply', 'CompanyListBinder', 'UserSearchServ', 'SearchResultBoxBinder', 'PopMessage', 'SearchInputBinder', 'ConversationListBinder', 'Cache', 'Storage',
    function($injector, RootscopeApply, CompanyListBinder, UserSearchServ, SearchResultBoxBinder, PopMessage, SearchInputBinder, ConversationListBinder, Cache, Storage) {
        return {
            restrict: 'EA',
            replace: false,
            scope: true,
            templateUrl: '',
            controller: ['$scope', '$element', function($scope, $element) {
                //搜索框
                $scope.searchResultValue = '';
                //搜索框中的删除按钮（X）
                $scope.showRemove = false;

                $scope.focusInput = function() {
                        $element.find('input.search').focus();
                    }
                    //绑定服务
                $injector.invoke(SearchInputBinder.bind, this, {
                    $scope: $scope
                });
            }],
            link: function postLink(scope, ele) {
                var keyCode = {
                    up: 38,
                    down: 40,
                    enter: 13
                };
                var searchInputTimer = null; //用来计时输入搜索字符
                var searchRemoveBtn = ele.find('.search-remove');
                var search = ele.find('.search');
                //监测搜索框值的变化，实时搜索数据
                var searchWatcher = scope.$watch('searchResultValue', function() {
                    //如果计时器存在，则清除重置
                    if (searchInputTimer) {
                        clearTimeout(searchInputTimer);
                        searchInputTimer = null;
                    }
                    var searchConversations = function(searchText, userIds) {
                            //搜索群聊   //得到对话列表中所有的对话信息
                            var convList = ConversationListBinder.getConvList();
                            //定义我们搜索得到的群聊数组
                            var groupItems = [];
                            for (var i = 0, conv, l = convList.length; i < l; i++) {
                                conv = convList[i];
                                if (conv.ocu_id) {
                                    conv.default_name = Cache.get("ocu_" + conv.ocu_id).name;
                                }
                                //如果对话是群聊，并且群聊名称包含搜索框输入的字符(可以搜索群聊和公众号)
                                if (conv.is_multi_user === true || conv.ocu_id) {
                                    //对话列表中每一项的会话的名字中是否包含搜索框输入的内容
                                    //公众号只需要查找名字，不需要查找参与人

                                    if (conv.default_name && conv.default_name.toLowerCase().indexOf(searchText.toLowerCase()) > -1 || (!conv.ocu_id && _.intersection(conv.user_ids.ids, userIds).length > 0)) {
                                        groupItems.push(conv);
                                    }
                                }
                            }
                            //scope.groupItems = groupItems;
                            if (groupItems.length == 0) {
                                //搜索结果为空，下拉列表显示“暂无数据”
                                scope.showBox = true;
                                SearchResultBoxBinder.noGroupData();
                            } else {
                                //渲染列表
                                // console.info('groupItems', groupItems);
                                SearchResultBoxBinder.openGroup(groupItems);
                                scope.showRemove = true;
                            }
                        }
                        //设置计时器，到时间开始搜出
                    searchInputTimer = setTimeout(function() {
                        RootscopeApply(scope, function() {
                            //input框改变，触发搜索
                            var v = $.trim(scope.searchResultValue);
                            if (v == '') {
                                //当搜索框为空时，搜索列表收起,删除（X）按钮隐藏
                                SearchResultBoxBinder.close();
                                scope.showRemove = false;
                            } else {
                                //搜索联系人
                                UserSearchServ(v)
                                    .then(function(data) {
                                        //当搜索框不为空时，判断用户要搜索的联系人是否存在
                                        if (data.items.length == 0) {
                                            //搜索结果为空，下拉列表显示“暂无数据”
                                            scope.showBox = true;
                                            SearchResultBoxBinder.noContactData();
                                            scope.showRemove = true;
                                        } else {
                                            //渲染列表
                                            var contacts = _.reject(data.items, function(item) {
                                                return item.id == Storage.getCurrentUser().id
                                            });
                                            // console.log(contacts);
                                            SearchResultBoxBinder.openContact(contacts);
                                            scope.showRemove = true;
                                        }
                                        //基于搜索的参与人查找会话列表
                                        searchConversations(v, _.map(contacts, function(item) {
                                            return item.id
                                        }))
                                    }, function(err) {
                                        PopMessage.tip({
                                            msg: '获取用户数据失败，请稍后重试',
                                            type: 0
                                        });
                                    });


                            }
                        });
                    }, 500);
                });

                //点击搜索框取消按钮，清空搜索框
                searchRemoveBtn.bind('click', function(e) {
                    RootscopeApply(scope, function() {
                        search.val('');
                        scope.searchResultValue = '';
                        SearchResultBoxBinder.close();
                        scope.showRemove = false;
                    });
                });

                //监听键盘上下键事件
                search.bind('keydown', function(e) {
                    switch (e.keyCode) {

                        case keyCode.up:
                            e.originalEvent.preventDefault();
                            SearchResultBoxBinder.select.prev();
                            break;

                        case keyCode.down:
                            e.originalEvent.preventDefault();
                            SearchResultBoxBinder.select.next();
                            break;

                        case keyCode.enter:
                            e.originalEvent.preventDefault();
                            SearchResultBoxBinder.select.select();
                            break;
                        default:
                            break;
                    }
                })

            }
        }
    }
])

//搜索结果列表菜单
.directive('searchResultBox', ['$injector', 'RootscopeApply', 'CompanyListBinder', 'SearchResultBoxBinder', 'SearchInputBinder', '$timeout',

    function($injector, RootscopeApply, CompanyListBinder, SearchResultBoxBinder, SearchInputBinder, $timeout) {
        return {
            restrict: 'EA',
            replace: false,
            scope: true,
            template: '<div class="search-list" ng-class="{\'contact-expanded\': expandContact, \'group-expanded\': expandGroup}">\
                  <div class="search-contact">\
                    <h5 class="type">联系人\
                      <a href="javascript:;" ng-click="toggleAllContact()" ng-hide="contactNum">{{ expandContact ? "收起":"显示全部" }}</a>\
                    </h5>\
                    <ul ng-show="contactLength" >\
                      <contact-item ng-repeat="contact in contacts"></contact-item>\
                    </ul>\
                    <p ng-show="!contactLength">暂无数据</p>\
                  </div>\
                  <div class="search-group" >\
                    <h5 class="type">群聊\
                      <a href="javascript:;" ng-click="toggleAllGroup()" ng-hide="groupNum">{{ expandGroup ? "收起":"显示全部" }}</a>\
                    </h5>\
                    <ul ng-show="groupLength">\
                      <group-item ng-repeat="group in groups"></group-item>\
                    </ul>\
                    <p ng-show="!groupLength">暂无数据</p>\
                  </div>\
                </div>',
            controller: ['$scope', '$element', function($scope, $element) {
                //绑定服务
                $injector.invoke(SearchResultBoxBinder.bind, this, {
                    $scope: $scope
                });
                //是否显示搜索列表，默认不显示
                $scope.showBox = false;
                //是否“显示全部”字样，当搜索到的联系人不多于5人，不显示。
                $scope.contactNum = false;
                //是否“显示全部”字样，当搜索到的群聊不多于5个，不显示。
                $scope.groupNum = false;
                //是否搜索到联系人，搜索到则直接显示，未搜索到则显示“暂无数据”。
                $scope.contactLength = true;
                //是否搜索到群聊，搜索到则直接显示，未搜索到则显示“暂无数据”。
                $scope.groupLength = true;

                $scope.messageContact = '显示全部';
                $scope.messageGroup = '显示全部';


                $scope.init = function() {
                    $element.find("li.cur").removeClass('cur').end().find("li:first").addClass('cur');
                }

                $scope.prev = function() {
                    var curLi = $element.find("li.cur"),
                        prevLi = curLi.prev("li"),
                        ulContainer = curLi.closest('ul');
                        //如果当前选中的条目是群组中的第一条，需要跳跃到人员列表中
                    if (!prevLi.length && curLi.closest('div.search-group').length) prevLi = $element.find("div.search-contact>ul>li:last");
                    //查找到上一条条目后，需要切换选中的样式，并且还需要根据移动的位置自动调整滚动条
                    if (prevLi.length) {
                        curLi.removeClass('cur');
                        prevLi.addClass('cur');
                        if (prevLi.offset().top - ulContainer.offset().top < 0) {
                            ulContainer.scrollTop(ulContainer.scrollTop() - prevLi.height())
                        }
                    } else {
                        //移动到顶端了 ,矫正滚动条位置
                        ulContainer.scrollTop(0);
                    }

                }

                $scope.next = function() {
                        var curLi = $element.find("li.cur");
                        var nextLi = curLi.next("li");
                        //if (!nextLi.length && curLi.closest('div.search-contact').length) nextLi = $element.find("div.search-group>ul>li:first");
                        var ulContainer = curLi.closest('ul');
                        //解决键盘移动自动同步滚动条的问题 fix #6439
                        if (nextLi.length) {
                            curLi.removeClass('cur');
                            nextLi.addClass('cur');
                            console.log('nextLi.offset()',nextLi.offset().top);
                            console.log('ulContainer.offset()', ulContainer.offset().top);
                            console.log('ulContainer.height()', ulContainer.height());
                            if (nextLi.offset().top - ulContainer.offset().top > ulContainer.height()) {
                                ulContainer.scrollTop(ulContainer.scrollTop() + nextLi.height())
                            }
                        } else {
                            //已经滚动到底部，滚动条需要定位到底
                            ulContainer.scrollTop(9999);
                        }

                    }
                    //激活当前选中的元素，主要用于搜索输入框的键盘上下键事件
                $scope.select = function() {
                        $element.find("li.cur").trigger("click");
                    }
                    //重置选中的游标位置到顶端
                var resetCurClass = function() {
                        $timeout(function() {
                            $element.find("li.cur").removeClass('cur').end().find("li:first").addClass('cur');
                            SearchInputBinder.focusInput();
                        }, 200)
                    }
                    //联系人大于5时，是否全部展开
                $scope.toggleAllContact = function() {
                    $scope.expandContact = !$scope.expandContact;

                    if ($scope.expandContact) {
                        //展开联系人，需要把群组的清空，否则影响上下键控制
                        $scope.contacts = $scope.originalContacts;
                        $scope.groups = [];
                    } else {
                        //恢复初始状态
                        $scope.contacts = _.first($scope.originalContacts, 5);
                        $scope.groups = _.first($scope.originalGroups, 5);
                    }
                    resetCurClass();
                }
                $scope.toggleAllGroup = function() {
                    $scope.expandGroup = !$scope.expandGroup;
                    if ($scope.expandGroup) {
                        //展开群组，需要把联系人的清空，否则影响上下键控制
                        $scope.groups = $scope.originalGroups;
                        $scope.contacts = [];
                    } else {
                        //恢复初始状态
                        $scope.contacts = _.first($scope.originalContacts, 5);
                        $scope.groups = _.first($scope.originalGroups, 5);
                    }

                    resetCurClass();
                }

            }],
            link: function postLink(scope, ele) {}
        }
    }
])

/*
 * 渲染搜索出的联系人
 */
.directive('contactItem', [
    function() {
        return {
            restrict: 'E',
            replace: true,
            template: '<li new-conv-btn data-name="contact">\
                  <img ng-src="{{uHead}}" alt="头像" />\
                  <span class="name">{{contact.name}}</span>\
                </li>',
            controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
                //头像
                $scope.uHead = GLOBAL_SETTING.URL + $scope.contact.avatar_url;
            }],
            link: function postLink(scope, ele) {

            }
        }
    }
])

/*
 * 渲染搜索出的群聊
 */
.directive('groupItem', [
    function() {
        return {
            restrict: 'E',
            replace: true,
            template: '<li new-conv-btn data-name="group">\
                  <img ng-src="{{uHead}}" alt="头像" />\
                  <span class="name">{{group.default_name}}</span>\
                </li>',
            controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
                //头像
                $scope.uHead = GLOBAL_SETTING.URL + $scope.group.avatar_url;
            }],
            link: function postLink(scope, ele) {

            }
        }
    }
])