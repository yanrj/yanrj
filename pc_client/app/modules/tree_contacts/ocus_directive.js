'use strict';
angular.module('mx.treecontacts.ocus')
    /*
     * 公众号按钮
     */
    .directive('servicesBtn', ['OcusLoader', '$rootScope', 'ContactsStatus', 'ServicesAppsCrumbs', 'ContactBinder','GLOBAL_SETTING',
        function(OcusLoader, $rootScope, ContactsStatus, ServicesAppsCrumbs, ContactBinder, GLOBAL_SETTING) {
            return {
                restrict: 'EA',
                link: function postLink(scope, ele, attrs) {
                	//显示公众号列表页面
                    var showOcuList = function(e) {
                        ContactBinder.loading(true);

                        OcusLoader.query({
                                ocu_type: 1
                            })
                            .then(function(data) {
                                $rootScope.$broadcast('services_contacts.loaded', data);
                                //将通讯录界面状态置为"公司通讯录"
                                ContactsStatus('services');
                                //设置面包屑跟踪组件
                                ServicesAppsCrumbs.init({
                                    data: data,
                                    name: '公众号',
                                    type: 'services'
                                });
                            }, function(err) {
                                console.error(err);
                                ContactBinder.loading(false);
                            });

                        //标记为点击样式
                        ele.parent().find('.act').removeClass('act');
                        ele.addClass('act');
                    }
                    ele.bind('click', function(e) {
                        showOcuList();
                    });
                    //默认打开公众号列表页面
                    if(GLOBAL_SETTING.default_show_contact_list && GLOBAL_SETTING.default_show_contact_list == 'services')
                    {
                        showOcuList();
                    }
                }
            }
        }
    ])
    /*
     * 公众号容器
     */
    .directive('servicesTreeContacts', ['RootscopeApply', 'Crumbs', 'ContactBinder', function(RootscopeApply, Crumbs, ContactBinder) {
        return {
            restrict: 'EA',
            template: '<ocu-contact-item ng-repeat="item in items"></ocu-contact-item>\
					<ocu-add-btn ng-show="!unsubscribed"></ocu-add-btn>',
            scope: true,
            controller: ['$scope', function($scope) {
                $scope.type = 'services';
                $scope.unsubscribed = true;

                $scope.$on('services_contacts.loaded', function(e, data) {
                    RootscopeApply($scope, function() {
                        ContactBinder.loading(false);

                        $scope.items = data;
                        $scope.unsubscribed = data.unsubscribed;
                    });
                });
            }]
        }
    }])

/*
 * 添加公众号按钮
 */
.directive('ocuTreeAddBtn', ['$rootScope', 'OcusLoader', 'Crumbs', 'ContactBinder',
        function($rootScope, OcusLoader, Crumbs, ContactBinder) {
            return {
                restrict: 'E',
                replace: true,
                template: '<div class="item add-ocu-btn" title="{{name}}" data-id="{{id}}">\
							<span class="name">{{name}}</span>\
						</div>',
                controller: ['$scope', function($scope) {
                    $scope.name = $scope.type === 'apps' ? '添加应用' : '添加公众号';

                    if ($scope.type === 'apps') {
                        $scope.name = '添加应用';
                        $scope.ocuType = 0;
                    } else {
                        $scope.name = '添加公众号';
                        $scope.ocuType = 1;
                    }
                }],
                link: function postLink(scope, ele, attrs) {
                    //点击加载未订阅公众号
                    ele.bind('click', function(e) {
                        ContactBinder.loading(true);

                        $('.nav-crumbs a').addClass('act');
                        $('.nav-crumbs a').bind('click', function(e){
                            e.preventDefault();
                            if($('.nav-crumbs a:last-child').css('cursor') == 'text'){
                                $('.nav-crumbs a:last-child').removeClass('act');
                            }
                        });

                        OcusLoader.unsubscribed(scope.ocuType)
                            .then(function(data) {
                                $rootScope.$broadcast(scope.type + '_contacts.loaded', data);

                                Crumbs.add({
                                    name: scope.name,
                                    data: data
                                });
                                $('.return').hide();
                            }, function(err) {
                                console.error(err);
                                ContactBinder.loading(false);
                            });
                    });
                }
            }
        }
    ])
    /*
     * 应用中心item元素
     */
    .directive('ocuTreeBtns', ['$rootScope', 'OcuBtnsBinder', '$injector', 'RootscopeApply', 'Cache',
        function($rootScope, OcuBtnsBinder, $injector, RootscopeApply, Cache) {
            return {
                restrict: 'EA',
                template: '<div class="ocu-btns">\
							<div ocu-menu class="menu" ng-repeat="menu in ocuInfo.menus"></div>\
						</div>',
                replace: true,
                scope: true,
                controller: ['$scope', 'GLOBAL_SETTING', 'OcusLoader',
                    function($scope, GLOBAL_SETTING, OcusLoader) {
                        var URL = GLOBAL_SETTING.URL;

                        //绑定服务
                        $injector.invoke(OcuBtnsBinder.bind, this, {
                            $scope: $scope
                        });

                        var scopeWorker = function(data) {
                            $scope.id = data.ocu_id || data.id;
                            $scope.data = data;
                            $scope.ocuInfo = data.ocu_info;

                            //如果还没有OCU公众号的菜单数据，则请求
                            if (!$scope.ocuInfo) {
                                OcusLoader.getOcu({
                                        id: $scope.id
                                    })
                                    .then(function(data) {
                                        if (!$scope.isOcu || $scope.id !== data.id) return;
                                        $scope.data = data;
                                        $scope.ocuInfo = data.ocu_info;
                                        //将公众号数据更新到缓存里
                                        Cache.put('ocu_' + data.id, data);
                                        $rootScope.$broadcast('ocuInfo.show', data);
                                    }, function(err) {

                                    });
                            } else {
                                //$scope.showMenu = !!$scope.ocuInfo.menus.length;
                                $rootScope.$broadcast('ocuInfo.show', data);
                            }
                        };

                        //初始化公众号对话菜单
                        this.init = function(data) {
                            RootscopeApply($scope, function() {
                                scopeWorker(data);
                            });
                        };
                    }
                ],
                link: function postLink(scope, ele, attrs) {}
            }
        }
    ])

.directive('ocuTreeMenu', ['RootscopeApply',
        function(RootscopeApply) {
            return {
                restrict: 'A',
                template: '<ocu-btn></ocu-btn>\
						<ul ng-show="showSub" data-show="{{showSub}}" class="sub-menu">\
							<li ng-repeat="subMenu in menu.sub_menus">\
								<ocu-btn></ocu-btn>\
							</li>\
						</ul>',
                controller: ['$scope', function($scope) {
                    $scope.showSub = false;

                    $scope.toggleSubMenu = function() {
                        RootscopeApply($scope, function() {
                            $scope.showSub = !$scope.showSub;
                        });

                        return $scope.showSub;
                    }
                }],
                link: function postLink(scope, ele, attrs) {
                    //监听跟元素点击事件，判断元素关系，隐藏子菜单
                    var wrapListener = scope.$on('wrap_clicked', function(e, eTarget) {
                        if (!$.contains(ele[0], eTarget) && ele[0] !== eTarget) {
                            RootscopeApply(scope, function() {
                                scope.showSub = false;
                            });
                        }
                    });

                    //当作用于销毁时，清除引用
                    scope.$on('$destroy', function() {
                        if (wrapListener) wrapListener();
                    });
                }
            }
        }
    ])
    /*
     * 公众号菜单按钮
     */
    .directive('ocuTreeBtn', ['OcuMenuServ', 'GLOBAL_SETTING', 'PublisherBinder', 'Storage',
        function(OcuMenuServ, GLOBAL_SETTING, PublisherBinder, Storage) {
            return {
                template: '<a target="_blank" href="{{href}}">{{menuName}}</a>',
                scope: true,
                restrict: 'EA',
                replace: true,
                controller: ['$scope',
                    function($scope) {
                        var token = Storage.getToken().mx_sso_token;
                        $scope.menu = $scope.subMenu || $scope.menu;
                        $scope.menuName = $scope.menu.name;

                        if ($scope.menu.menu_type === 1) {
                            $scope.href = GLOBAL_SETTING.URL + $scope.menu.content + '&mx_sso_token=' + token;
                        }
                    }
                ],
                link: function postLink(scope, ele, attrs) {
                    var menu = scope.subMenu || scope.menu;
                    var URL = GLOBAL_SETTING.URL;

                    var toggleSub = function() {
                        var subMenu = ele.siblings('.sub-menu');
                        var toggle = scope.toggleSubMenu();

                        if (toggle) {
                            /*$('body').bind('click', function() {
                            	scope.toggleSubMenu();
                            });*/
                        }
                    };

                    ele.bind('click', function(e) {
                        //根据不同的菜单类型处理
                        switch (menu.menu_type) {
                            //父级菜单类型
                            case 0:
                                e.preventDefault();
                                scope.toggleSubMenu();
                                break;
                                //加载web page类型
                            case 1:
                                break;
                                //发请求类型类型
                            case 2:
                                e.preventDefault();
                                OcuMenuServ(menu.id)
                                    .then(function(data) {
                                        scope.toggleSubMenu();
                                    }, function(err) {
                                        console.error(err);
                                    });
                                break;
                            case 3:
                                e.preventDefault();
                                PublisherBinder.content(scope.menu.content);
                                break;
                        }
                    });
                }
            }
        }
    ])
    /*
     * 公众号item元素
     */
    .directive('ocuTreeContactItem', ['OcusLoader', '$rootScope', 'Crumbs', 'ContactsStatus', 'ConversationBinder','ConversationAboutOcu','Cache',
        function(OcusLoader, $rootScope, Crumbs, ContactsStatus, ConversationBinder,ConversationAboutOcu,Cache) {
            return {
                restrict: 'EA',
                template: '<div class="item" title="{{name}}" data-id="{{id}}">\
							<img ng-src="{{uHead}}" alt="头像" />\
							<span class="name">{{name}}</span>\
						</div>',
                replace: true,
                controller: ['$scope', '$element', 'GLOBAL_SETTING', function($scope, $element, GLOBAL_SETTING) {
                    var item = $scope.data = $scope.item;
                    var URL = GLOBAL_SETTING.URL;
                    //类型，分为'department'和'user'
                    var type = item.type;

                    $scope.id = item.id;
                    $scope.name = item.name;
                    $scope.uHead = URL + item.avatar_url;
                    $scope.subscibed = item.followed_by_current || item.ocu_info.auto_subscribed;
                }],
                link: function postLink(scope, ele, attrs) {
                    ele.bind('click', function(e) {
                        e.preventDefault();

                        OcusLoader.getOcu({
                                id: scope.id
                            })
                            .then(function(data) {
                                //判断是不是未订阅公众号
                                if (scope.subscibed) {
                                    //将分类存入缓存
                                    if(data.category){
                                        Cache.put('category_' + data.category.id,data.category);
                                    }
                                    //触发新对话
                                    ConversationBinder.trigger(scope.data);
                                } else {
                                    $rootScope.$broadcast('ocuInfo.show', data);
                                    //将公众号信息添加到Crumbs中
                                    Crumbs.add({
                                        name: scope.name,
                                        data: data
                                    });

                                    //将通讯录状态置为"公众号信息"
                                    ContactsStatus('ocuInfo');
                                }
                            }, function(err) {
                                console.error(err);
                            });
                    });
                }
            }
        }
    ])
    /*
     * 公众号信息
     */
    .directive('ocuTreeInfo', ['GLOBAL_SETTING', 'OcusLoader', '$rootScope', 'ConversationListBinder',
        '$location', 'TipsPopBinder', 'ServicesAppsCrumbs', 'ConversationBinder', 'CurUserDB', 'Cache',
        function(GLOBAL_SETTING, OcusLoader, $rootScope, ConversationListBinder, $location, TipsPopBinder,
            ServicesAppsCrumbs, ConversationBinder, CurUserDB, Cache) {
            return {
                restrict: 'EA',
                template: '<div class="head">\
							<img ng-src="{{head}}" />\
							<span>{{name}}</span>\
						</div>\
						<div class="feature">\
							<h4>功能介绍</h4>\
							<p>{{feature}}</p>\
						</div>\
						<div class="btns" ng-show="allowSub">\
							<a href="#" ng-show="!subscribed" class="btn-subscrib">订阅</a>\
							<a href="#" ng-show="subscribed" class="btn-unsubscrib">取消订阅</a>\
						</div>',
                controller: ['$scope', function($scope) {
                    var URL = GLOBAL_SETTING.URL;
                    $scope.subscribed = false;

                    var scopeWorker = function(data) {
                        $scope.head = URL + data.avatar_url;
                        $scope.name = data.name;
                        $scope.id = data.id;
                        $scope.data = data;
                        $scope.feature = data.signature || '暂无介绍';
                        $scope.subscribed = data.followed_by_current;
                        //如果是强制订阅，则不允许进行取消订阅操作
                        $scope.allowSub = !data.ocu_info.auto_subscribed;
                    };

                    $scope.$on('ocuInfo.show', function(e, data) {
                        scopeWorker(data);
                    });
                }],
                link: function postLink(scope, ele, attrs) {
                    var btnSub = ele.find('a.btn-subscrib');
                    var btnUnsub = ele.find('a.btn-unsubscrib');

                    //将OCU数据存入数据库和缓存
                    function saveOcu(data) {
                        CurUserDB.saveReferences(data)
                            .then(function() {
                                Cache.put('ocu_' + scope.id, data[0]);
                            });
                    }

                    var unsub = function() {
                        var convId = scope.convId;

                        OcusLoader.unsub(scope.id)
                            .then(function(data) {
                                scope.subscribed = false;

                                //将数据保存
                                saveOcu(data);

                                //如果是在对话界面，删除当前公众号对应的对话，并跳转到第一个对话
                                if ($location.path() === '/main') {
                                    ConversationBinder.quit();
                                } else {
                                    //更新面包屑数据
                                    ServicesAppsCrumbs.update('unsubed', data);
                                }
                            });
                    };

                    //订阅
                    btnSub.bind('click', function(e) {
                        e.preventDefault();
                        OcusLoader.sub(scope.id)
                            .then(function(data) {
                                scope.subscribed = true;

                                //将数据保存
                                saveOcu(data);

                                //更新面包屑数据
                                if ($location.path() !== '/main') {
                                    ServicesAppsCrumbs.update('subed', data);
                                }
                            });
                    });

                    //取消订阅
                    btnUnsub.bind('click', function(e) {
                        e.preventDefault();

                        TipsPopBinder.show({
                            body: '是否确定不再订阅该公众号?',
                            showCancel: true,
                            showConfirm: true,
                            confirmed: function() {
                                unsub();
                            }
                        });
                    });
                }
            }
        }
    ])