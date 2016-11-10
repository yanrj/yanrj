'use strict';
angular.module('mx.contacts.company', [])
/*
 * 公司通讯录按钮
 */
.directive('companyContactsBtn', ['DepartmentsLoader', '$rootScope', 'CompanyCrumbs', 'ContactsStatus', 'ContactBinder','GLOBAL_SETTING',
	function(DepartmentsLoader, $rootScope, CompanyCrumbs, ContactsStatus, ContactBinder, GLOBAL_SETTING) {
		return {
			restrict: 'EA',
			link: function postLink(scope, ele, attrs) {
				function showCompanyContacts(){
					//标记正在加载
    				ContactBinder.loading(true);

					DepartmentsLoader()
						.then(function(data) {
							$rootScope.$broadcast('company_contacts.loaded', data);
							//将通讯录界面状态置为"公司通讯录"
							ContactsStatus('company');
							//设置面包屑跟踪组件
							CompanyCrumbs(data);
						}, function(err) {
							console.error(err);
							scope.contactLoading = false;
						});

					//标记为点击样式
                    ele.parent().find('.act').removeClass('act');
                    ele.addClass('act');
				}

				ele.bind('click', function(e) {
					console.log(114)
					showCompanyContacts()
				});

				//默认显示群聊列表页面
				if(GLOBAL_SETTING.default_show_contact_list && GLOBAL_SETTING.default_show_contact_list == 'company')
				{
					showCompanyContacts();
				}
			}
		}
	}
])
/*
 * 公司通讯录容器
 */
.directive('companyContacts', ['RootscopeApply', 'ContactBinder', 'ContactsDeptServ', 'PopMessage', '$route', 'FriendsListServ', '$rootScope', 'CompanyListBinder', 'GLOBAL_SETTING', '$injector',
	function(RootscopeApply, ContactBinder, ContactsDeptServ, PopMessage, $route, FriendsListServ, $rootScope, CompanyListBinder, GLOBAL_SETTING, $injector) {
		return {
			restrict: 'EA',
			template: '<company-contact-item ng-repeat="item in items"></company-contact-item>\
						<p class="no-data" ng-show="!items.length">暂无数据</p>',
			scope:true,
			controller: ['$scope', function($scope) {
				$scope.$on('company_contacts.loaded', function(e, data) {
					RootscopeApply($scope, function() {
						//标记正在加载
	    				ContactBinder.loading(false);
						$scope.items = data.items;
						ContactBinder.getAllCompanyCounts().then(function(data){
						$scope.company_count = data.users_count;
						$rootScope.$broadcast('company_count', $scope.company_count);
						},function(err){
						console.log(err);
						})
					});
				});
			}],
			link: function(scope, ele, attrs) {
				var gui = require('nw.gui');
				var menu = new gui.Menu();

				//创建右键菜单
				menu.append(new gui.MenuItem({
					label: '添加该部门同事到联系人'
				}));

				//部门右击加通讯录
				ele.delegate('.department', 'mouseup', function(e) {
					if (e.button !== 2) return;

					//获取部门id
					var id = $(e.target).data('id');

					//重新定义右键菜单点击事件
					menu.items[0].click = function() {
						ContactsDeptServ.save({id: id},
							function(data) {
								PopMessage.tip({
									msg: '添加联系人成功.',
									type: 1
								});
								FriendsListServ.init();
							}, function(err) {
								PopMessage.tip({
									msg: '添加联系人失败.',
									type: 2
								});
							});
					};

					menu.popup(e.clientX, e.clientY);
				});
			}
		}
	}
])

/*
 * 公司通讯录列表(群聊成员选择器中使用)
 */
.directive('companyList', ['RootscopeApply', 'CompanyListBinder', '$injector','Cache', 'CompanySelectedAllBinder',
	function(RootscopeApply, CompanyListBinder, $injector, Cache, CompanySelectedAllBinder) {
		return {
			restrict: 'EA',
			template: '<div class="selected-all" selected-all-company ng-show="allSelect">\
					    <input type="checkbox" id="selected-all-checkbox1" name="selected-all-checkbox" ng-model="choose" class="selectAll"/><label class="selected-all-text" for="selected-all-checkbox1">全选</label>\
			            </div>\
						<company-contact-item ng-repeat="item in companys"></company-contact-item>\
						<p class="no-data" ng-show="!companys.length">暂无数据</p>',
			scope:true,
			controller: ['$scope', function($scope) {
				$scope.render = function(data) {
					if(!data) return;
					$scope.allSelect = false;
					//将人员信息加入Cache
					$.each(data.items, function(index, val) {
						if(val.type == "user"){
							Cache.put('user_' + val.id, data.items[index]);
						}else if(val.type == "department"){
							Cache.put('department_' + val.id, data.items[index]);
						}
					});

					RootscopeApply($scope, function() {
						//标记正在加载
	    				CompanyListBinder.loading(false);
	    				$scope.companys = data.items;
					});
				};

				$injector.invoke(CompanyListBinder.bind, this, {
					$scope: $scope
				});
			}],
			link: function postLink(scope, ele, attrs) {
        		//如果手动选择全部成员，“全选按钮”自动勾选；如果点击“全选按钮”后，又手动取消部分成员，则取消“全选”
				scope.checkBtn = function(){
				};
			}
		}
	}
])
/*
 * 公司通讯录item元素
 */
.directive('companyContactItem', ['$compile', 'DepartmentDeepIn', 'RootscopeApply', 'ContactBinder', 'GroupMemberSelect', 'Storage', 'PopMessage', 'DepartmentsLoader', '$location', '$rootScope', 'CompanyListBinder', 'CompanySelectedAllBinder',
	function($compile, DepartmentDeepIn, RootscopeApply, ContactBinder, GroupMemberSelect, Storage, PopMessage, DepartmentsLoader, $location, $rootScope, CompanyListBinder, CompanySelectedAllBinder) {
		return {
			restrict: 'EA',
			template: '<div btn-user data-type="{{popupType}}" class="item {{type}} " ng-class="{\'no-head\':uHead == null,\'selected\':selected == true,\'disable-chat\': disableChat == true}" title="{{name}}" data-id="{{id}}">\
							<span class="item-wrap" data-id="{{id}}"></span>\
							<img ng-src="{{uHead}}" alt="头像" />\
							<span class="name">{{name}}</span>\
							<span ng-show="type == \'user\'&& online" class="online-status">\
								<span class="online-status-offline" ng-show="online==\'offline\'"></span>\
								<span class="online-status-web" ng-show="online==\'web\'"></span>\
								<span class="online-status-mobile" ng-show="online==\'mobile\'"></span>\
							</span>\
							<span class="member_count" ng-show="type == \'department\'">{{dept_count}}人</span>\
							<span ng-show="selectorStatus === \'search\'" class="dept-name">{{deptName}}</span>\
							<i class="btn-select"></i>\
						</div>',
			replace: true,
			controller: ['$scope', '$element', 'GLOBAL_SETTING', function($scope, $element, GLOBAL_SETTING) {
				var item = $scope.item;
				var URL = GLOBAL_SETTING.URL;
				//类型，分为'department'和'user'
				var type = $scope.type = item.type;
				if($scope.$parent.$parent.selectorType == 1 && type == 'department'){
					$('.btn-select').hide();
				}

				$scope.id = item.id;
				switch (type) {
                    case 'user':
                        $scope.user_id = item.id;
                        break;
                    case 'department':
                        $scope.dept_id = item.id;
                        $scope.dept_count = item.users_count
                        break;
                }

                var pathType = $location.path();
				switch(pathType) {
					case '/main':
						$scope.popupType = 'normal';
						break;
					case '/contacts':
						if(type == 'user'){
							$scope.popupType = 'popup';
						}else{
							$scope.popupType = 'normal';
						}
						break;
				}

				//判断该项是部门还是用户
				$scope.name = type === 'department' ? item.short_name : item.name;
				$scope.uHead = type === 'department' ? null : URL + item.avatar_url;
				$scope.deptName = item.dept_name;
				//获取在线状态
				$scope.online = item.online;

				item.disableChat=$scope.disableChat = ((type == 'user')&&((item.permission & 2) ===0));
				//好友选择器中的选择标记
				$scope.selected = false;

				//监听取消选择事件
				$scope.$on('memberSelect_' + $scope.id + '.unselect', function(e) {
					RootscopeApply($scope, function() {
						$scope.selected = false;
					});
				});

				//下面是处理用户选中状态的逻辑，部门元素或没有已选成员时直接跳过
				//如果是在通讯录而不是在选择器，也跳过
				if ($scope.count === 0
					|| !$scope.selector) return;

				//如果已选择成员中有当前
				$scope.selected = $scope.selectedArr.some(function(item) {
					if(item.type == 'user'){
						if ($scope.user_id === item.id) {
							return true;
						}
					}else{
						if ($scope.dept_id === item.id) {
							return true;
						}
					}
				});
			}],
			link: function postLink(scope, ele, attrs) {
				$('.nav-crumbs a:first-child').bind('click', function(e){
					e.preventDefault();
					$('.companylist-box').hide();
					$('.friendlist-box').removeClass('ng-hide');
				});
				var selfId = Storage.getUser('id');
				var btn_enterDept = ele.find('.item-wrap');
				var btn_selected = ele.find('.btn-select');
				//用户列表获取到服务器返回的数据后，检验是否勾选“全选按钮”
				// if (scope.$index === scope.$parent.companys.length - 1) {
				// 	setTimeout(function() {
				// 		RootscopeApply(scope, function() {
				// 			console.log(111111)
				// 			CompanyListBinder.checkBtn();
				// 		});
				// 	}, 100);
				// }
				btn_selected.bind('click', function(e){
					e.preventDefault();
					var selectedUsersByDept = [];

					if (scope.selected == false) {
						if (scope.type === 'user' && scope.selector) {
							//如果选择的是自己，则提示不可选择自己
							if (selfId === scope.item.id) {
								RootscopeApply(scope, function() {
									PopMessage.err({message: '不可选择自己'});
								});
								return;
							}

							if (scope.disableChat) {
								RootscopeApply(scope, function() {
									PopMessage.err({message: '你没有权限选择该用户。'});
								});
								return;
							}

						}
						//以下是好友选择器相关逻辑
						RootscopeApply(scope, function() {
							scope.selected = true;
							ele.addClass('selected');

							scope.selectedLength = ele.parent().find('.selected').length;
							//成员列表中，所有的成员个数
							scope.length = scope.companys.length;
							if (scope.selectedLength < scope.length) {
								CompanySelectedAllBinder.selectNotAllBtn();
							} else {
								CompanySelectedAllBinder.selectAllBtn();
							}
							GroupMemberSelect.memberCtrl(scope.selected, scope.item);
						});
					}else{
						ele.removeClass('selected');
						scope.selected = false;
						scope.selectedLength = ele.parent().find('.selected').length;
						//成员列表中，所有的成员个数
						scope.length = scope.companys.length;
						if (scope.selectedLength < scope.length) {
							CompanySelectedAllBinder.selectNotAllBtn();
						} else {
							CompanySelectedAllBinder.selectAllBtn();
						}
						GroupMemberSelect.memberCtrl(scope.selected,scope.item);
					}
				});
				btn_enterDept.bind('click', function(e) {
					e.preventDefault();
					CompanySelectedAllBinder.selectNotAllBtn();
					if($location.path() == '/main' || $location.path() == '/app-centre'){
						$('.friendlist-box').addClass('ng-hide');
						$('.companylist-box').show();
					}
					$('.nav-crumbs a').addClass('act');
					$('.nav-crumbs a').bind('click', function(e){
						e.preventDefault();
						$('.companylist-box, .company-contacts').scrollTop(0);
						if($('.nav-crumbs a:last-child').css('cursor') == 'text'){
							$('.nav-crumbs a:last-child').removeClass('act');
						}
						if($location.path() == '/app-centre'){
							$('.companylist-box').removeClass('ng-hide')
						}
						// if($location.path() == '/contacts'){
						// 	return;
						// }
						//成员列表中，被选择的个数
						scope.selectedLength = $('.selected').length;
						//成员列表中，所有的成员个数
						if(!scope.companys) return;
						scope.length = scope.companys.length;
						if (scope.selectedLength < scope.length) {
							CompanySelectedAllBinder.selectNotAllBtn();
						} else {
							CompanySelectedAllBinder.selectAllBtn();
						}
					});
					$('.nav-crumbs a:first-child').bind('click', function(e){
						e.preventDefault();
					});
					// console.log('act',ele[0])
					// if($('.nav-crumbs a:last-child').css('cursor') == 'text'){
					// 	$('.nav-crumbs a:last-child').removeClass('act');
					// }

					RootscopeApply(scope, function() {
						scope.contactLoading = true;
					});

					ContactBinder.loading(true);

					//点击进入下一层级，会判断item类型
					DepartmentDeepIn(scope.item);

					if (scope.type === 'user' && scope.selector) {
						//如果选择的是自己，则提示不可选择自己
						if (selfId === scope.item.id) {
							RootscopeApply(scope, function() {
								PopMessage.err({message: '不可选择自己'});
							});
							return;
						}
						//很奇怪，为什么上面有一样的代码。。。。
						if (scope.disableChat) {
							RootscopeApply(scope, function() {
								PopMessage.err({message: '你没有权限选择该用户。'});
							});
							return;
						}


						//以下是好友选择器相关逻辑
						RootscopeApply(scope, function() {
							scope.selected = !scope.selected;
							if(scope.selected){
								ele.addClass('selected');
							}else{
								ele.removeClass('selected');
							}

							scope.selectedLength = ele.parent().find('.selected').length;
							//成员列表中，所有的成员个数
							scope.length = scope.companys.length;
							if (scope.selectedLength < scope.length) {
								CompanySelectedAllBinder.selectNotAllBtn();
							} else {
								CompanySelectedAllBinder.selectAllBtn();
							}

							GroupMemberSelect.memberCtrl(scope.selected, scope.item);

						});
					}
					//标记为点击样式
					ele.parent().find('.act').removeClass('act');
					$(this).addClass('act');

				});
				//接收‘全选按钮’的广播
				scope.$on('selected_all_company.loaded', function(e, checked) {
					RootscopeApply(scope, function() {
						console.info('scope.companys', scope.companys);

						//根据选择结果决定添加或删除成员
						if (checked&&!scope.disableChat) {
							if (scope.selected == false) {
								ele.addClass('selected');
								$('.selected-wrap .list').css('overflow-y', 'auto');
								scope.selected = true;
								GroupMemberSelect.memberCtrl(scope.selected, scope.item);
								console.info('scope.item', scope.item);
							}
						} else {
							ele.removeClass('selected');
							//if(scope.item.type == 'user'){
								//监听取消选择事件
								scope.selected = false;
								GroupMemberSelect.memberCtrl(scope.selected, scope.item);
								// scope.$on('memberSelect_' + scope.id + '.unselect', function(e) {
								// 	console.log(1314)
								// 	RootscopeApply(scope, function() {
								// 		scope.selected = false;
								// 	});
								// });
							//}
						}

						ele.attr('data-selected', scope.selected);

						scope.selectedLength = ele.parent().find('.selected').length;
						//成员列表中，所有的成员个数(去除不能选择的用户)
						scope.length = scope.companys.length - ele.parent().find('.disable-chat').length;
						if (scope.selectedLength < scope.length) {
							CompanySelectedAllBinder.selectNotAllBtn();
						} else {
							CompanySelectedAllBinder.selectAllBtn();
						}
					});
				});
			}
		}
	}
])

.factory('Departments', ['$resource', 'GLOBAL_SETTING', function($resource, GLOBAL_SETTING) {
	var url = GLOBAL_SETTING.URL + '/api/v1/departments';

	return $resource(url, {
		limit: 1000
	});
}])
/*
 * 公司通讯录加载器
 */
.factory('DepartmentsLoader', ['$q', 'Departments', function($q, Departments) {
	return function(params) {
		var delay = $q.defer();

		Departments.get(params,
			function (data, status, headers, config) {
				delay.resolve(data);
			},
			function (data, status, headers, config) {
				delay.reject(data);
			}
		);

		return delay.promise;
	};
}])
/*
 * 公司通讯录内根据不同的item类型进行不同的请求
 */
.factory('DepartmentDeepIn', ['DepartmentsLoader', 'UserLoaderServ', '$rootScope', 'Crumbs', 'ContactsStatus', '$location', 'CompanyListBinder',
	function(DepartmentsLoader, UserLoaderServ, $rootScope, Crumbs, ContactsStatus, $location, CompanyListBinder) {
		return function(item) {
			var type = item.type;
			var id = item.id;
			var pathType = $location.path();
			if (!type || !id) return false;

			//对话主界面用户逻辑(目前是对话成员选择器中公司通讯录中的用户)
			var mainUser = function() {
				//暂时没有要处理的逻辑，逻辑都在companyContactItem中
				//console.log('点击了用户项');
			};
			//对话主界面部门逻辑(目前是对话成员选择器中公司通讯录中的部门)
			var mainDepart = function() {
				DepartmentsLoader({parent_id: id})
					.then(function(data) {
						CompanyListBinder.render(data);
						$('.companylist-box').scrollTop(0);
						Crumbs.add({
							name: item.short_name,
							data: data
						});
					}, function(err) {
						console.log(err);
					});
			};
			//通讯录中的用户处理逻辑
			var contactUser = function() {
				UserLoaderServ.getUser(id)
					.then(function(data) {
						$('.nav-crumbs a').bind('click', function(e){
							$('.return').hide();
							if($('.nav-crumbs a').css('cursor') != 'text'){
								$('.nav-crumbs a').addClass('act');
							}
							if($('.nav-crumbs a:last-child').css('cursor') == 'text'){
								$('.nav-crumbs a:last-child').removeClass('act');
							}
						});
						$rootScope.$broadcast('userinfo.show', data);

						//将用户信息添加到Crumbs中
						// Crumbs.add({
						// 	name: '',
						// 	data: data
						// });

						//将通讯录状态置为"用户信息"
						//ContactsStatus('userInfo');
					}, function(err) {
						console.log(err);
					});
			};
			//通讯录中的部门处理逻辑
			var contectDepart = function() {
				DepartmentsLoader({parent_id: id})
					.then(function(data) {
						$rootScope.$broadcast('company_contacts.loaded', data);
						$('.company-contacts').scrollTop(0);
						Crumbs.add({
							name: item.short_name,
							data: data
						});
					}, function(err) {
						console.log(err);
					});
			};

			//如果是用户
			if (type === 'user') {
				switch(pathType) {
					case '/main':
						mainUser();
						break;
					case '/contacts':
						$('.return').show();
						$('.crambs-box').show();
						if($('.nav-crumbs a:last-child').css('cursor') == 'text'){
							$('.nav-crumbs a:last-child').removeClass('act');
						}
						contactUser();
						break;
				}
			}
			//如果是部门
			if (type === 'department') {
				switch(pathType) {
					case '/main':
						mainDepart();
						break;
					case '/contacts':
						$('.return').hide();
						contectDepart();
						break;
					case '/app-centre':
						mainDepart();
						break;
				}
			}
		};
	}
])
//公司通讯录的面包屑记录服务
.factory('CompanyCrumbs', ['Crumbs', '$rootScope', 'ContactsStatus', '$filter', function(Crumbs, $rootScope, ContactsStatus, $filter) {
	return function(data) {
		var that, scope;

		Crumbs.init({
			triggerHandler: function(data) {
				$rootScope.$broadcast('company_contacts.loaded', data);
				//将通讯录状态置为"公司通讯录"
				ContactsStatus('company');
			}
		});
		//公司通讯录的国际化
		var contacts = $filter('translate')('others.contacts_application');
		//添加记录
		Crumbs.add({
			name: contacts,
			data: data
		});
	}
}])

.factory('CompanyListBinder', [
	function() {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		o.loading = function(bool) {
			if (scope) {
				scope.companyListLoading = bool;
			}
		};

		o.render = function(data){
			scope.render(data);
		};

		//初始化全选按钮是否勾选
		o.checkBtn = function() {
			scope.checkBtn();
		};

		return o;
	}
])

//全选按钮
.directive('selectedAllCompany', ['RootscopeApply', '$injector', '$rootScope', 'CompanySelectedAllBinder',
	function(RootscopeApply, $injector, $rootScope, CompanySelectedAllBinder) {
		return {
			restrict: 'A',
			replace: false,
			scope: true,
			template: '',
			controller: ['$scope',
				function($scope) {
					//全选按钮是否打钩
					$scope.choose = false;
					//绑定
					$injector.invoke(CompanySelectedAllBinder.bind, this, {
						$scope: $scope
					});
				}
			],
			link: function postLink(scope, ele, attrs) {
				//全选按钮
				var selectAll = ele.find('.selectAll');

				//点击全选按钮，广播。下面的每一个li接收广播
				selectAll.bind('click',function(){
					console.info('scope.choose',scope.choose);
					$rootScope.$broadcast('selected_all_company.loaded', scope.choose);
				});
			}
		}
	}
])
//全选按钮
.factory('CompanySelectedAllBinder', ['RootscopeApply','$location',
	function(RootscopeApply, $location) {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			scope = $scope;
			that = this;
		};
		//全选按钮checked取消(取消全选)
		o.selectNotAllBtn = function(){
			if($location.path() == '/contacts') return;
			scope.choose = false;
		}
		//全选按钮checked勾选（显示全选）
		o.selectAllBtn = function(){
			if($location.path() == '/contacts') return;
			scope.choose = true;
		}
		return o;
	}
])