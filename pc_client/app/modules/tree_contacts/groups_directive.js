'use strict';
angular.module('mx.treecontacts.groups')
/*
 * 群聊按钮
 */
.directive('groupsBtn', ['$rootScope', 'ContactsStatus', 'GroupConversationsLoader', 'GroupsCrumbs', 'ContactBinder','GLOBAL_SETTING',
	function($rootScope, ContactsStatus, GroupConversationsLoader, GroupsCrumbs, ContactBinder, GLOBAL_SETTING) {
		return {
			restrict: 'EA',
			link: function postLink(scope, ele, attrs) {
				//显示群聊列表页面
				function showGroupList(){
					ContactBinder.loading(true);

					GroupConversationsLoader.query()
						.then(function(data) {
							$rootScope.$broadcast('groupConv_contacts.loaded', data);
							//将通讯录界面状态置为"公司通讯录"
							ContactsStatus('groups');
							//设置面包屑跟踪组件
							GroupsCrumbs(data);
						}, function(err) {
							console.error(err);
							ContactBinder.loading(false);
						});

					//标记为点击样式
					ele.parent().find('.act').removeClass('act');
					ele.addClass('act');
				}

				ele.bind('click', function(e) {
					e.preventDefault();
					showGroupList();	//点击显示群聊列表页面
				});
				//默认显示群聊列表页面
				if(GLOBAL_SETTING.default_show_contact_list && GLOBAL_SETTING.default_show_contact_list == 'groups')
				{
					showGroupList();
				}else if(!GLOBAL_SETTING.default_show_contact_list){
					showGroupList();
				}

				//当作用于销毁时，清除引用
				scope.$on('$destroy', function() {
			    	ele.unbind('click');
			    });
			}
		}
	}
])
/*
 * 群聊容器
 */
.directive('groupsTreeContacts', ['RootscopeApply', 'ContactBinder', function(RootscopeApply, ContactBinder) {
	return {
		restrict: 'EA',
		template: '<group-contact-item ng-repeat="item in items"></group-contact-item>\
					<p class="no-data" ng-show="!items.length">暂无群聊数据</p>',
		scope:true,
		controller: ['$scope', function($scope) {
			$scope.$on('groupConv_contacts.loaded', function(e, data) {
				RootscopeApply($scope, function() {
					ContactBinder.loading(false);
					$scope.items = data.items;
					$scope.references = data.references;
				});
			});
		}]
	}
}])
/*
 * 群聊item元素
 */
.directive('groupTreeContactItem', ['ConvTitleFilter', function(ConvTitleFilter) {
	return {
		restrict: 'EA',
		template: '<div new-conv-btn class="item" ng-class="uHead == null ? \'no-head\' : \'\'" title="{{name}}" data-id="{{id}}">\
						<img ng-src="{{uHead}}" alt="头像" />\
						<span class="name">{{name}}</span>\
					</div>',
		replace: true,
		controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
			var item = $scope.item;
			var URL = GLOBAL_SETTING.URL;

			$scope.id = item.id;
			$scope.name = ConvTitleFilter(item.name, item);
			$scope.uHead = URL + item.avatar_url;
			$scope.uids = item.user_ids.ids;

			$scope.item.name = $scope.name;
			$scope.data = item;
		}],
		link: function postLink(scope, ele, attrs) {
		}
	}
}])
/*
 * 群聊成员容器
 */
.directive('groupTreeMembers', ['RootscopeApply', '$injector', 'GroupMembersServ', 'Storage',
	function(RootscopeApply, $injector, GroupMembersServ, Storage) {
		return {
			restrict: 'EA',
			replace: false,
			scope: true,
			template: 	'<group-member-add-btn></group-member-add-btn>\
						<group-member-del-btn ng-show="showDelBtn"></group-member-del-btn>\
						<group-member-item ng-repeat="item in members"></group-member-item>',
			controller: ['$scope', function($scope) {
				//绑定服务
				$injector.invoke(GroupMembersServ.bind, this, {
					$scope: $scope
				});

				//是否是删除成员状态
				$scope.delItem = false;
				$scope.selfId = Storage.getUser('id');

				//触发删除成员状态
				$scope.toggleDel = function() {
					RootscopeApply($scope, function() {
						$scope.delItem = !$scope.delItem;
					});
				};

				//从作用域中删除成员
				$scope.delUserItem = function(index) {
					RootscopeApply($scope, function() {
						$scope.members.splice(index, 1);

						checkDelBtn();
					});
				};

				//取消删除成员操作(隐藏删除按钮)
				this.cancelDel = function() {
					RootscopeApply($scope, function() {
						$scope.delItem = false;
					});
				};

				var checkDelBtn = function() {
					var members = $scope.members;
					var infoData = $scope.infoData;

					//不是管理员不显示删除按钮
					if (!$scope.imAdmin) {
						$scope.showDelBtn = false;
						return;
					}

					//不是群聊不显示删除按钮
					if (!infoData.is_multi_user) {
						$scope.showDelBtn = false;
						return;
					}

					//群聊成员只剩自己不显示删除按钮
					if (members.length === 1 && members[0].id === $scope.selfId) {
						$scope.showDelBtn = false;
						return;
					}

					$scope.showDelBtn = true;
				};

				//处理作用域
				var scopeWorker = function(members) {
					var infoData = $scope.infoData;
					var createrId = infoData.creator_id;

					//对话创建者就是自己的时候，就是管理员
					$scope.imAdmin = createrId === $scope.selfId;
					//群成员数据对象
					$scope.members = members;

					//用来标记删除成员操作(头像会显示删除图标)
					//$scope.delItem = false;

					//对话ID
					$scope.convInfoId = $scope.convId;

					checkDelBtn();
				};

				//渲染成员
				this.renderMembers = function(members) {
					RootscopeApply($scope, function() {
						scopeWorker(members);
					});
				};
			}],
			link: function postLink(scope, ele, attrs) {
			}
		}
	}
])
/*
 * 群聊成员
 */
.directive('groupTreeMemberItem', ['GLOBAL_SETTING', 'UserInfoServ', 'GroupMemberReq', 'conversationInfoBinder',
	function(GLOBAL_SETTING, UserInfoServ, GroupMemberReq, conversationInfoBinder) {
		return {
			restrict: 'E',
			replace: true,
			scope: true,
			template: 	'<div class="item" title="{{name}}" data-id="{{uid}}">\
							<img btn-user data-type="popup" ng-src="{{uHead}}" alt="头像" />\
							<span class="name">{{name}}</span>\
							<i class="del" title="删除该成员" ng-show="delItem">删除</i>\
						</div>',
			controller: ['$scope', function($scope) {
				var URL = GLOBAL_SETTING.URL;
				var item = $scope.item;
				$scope.uHead = URL + item.avatar_url;
				$scope.uid = item.id;
				$scope.name = item.name ? item.name : item.default_name;

				if (item.id === $scope.selfId) {
					$scope.delItem = false;
				}

				//删除成员发送请求
				$scope.delUser = function() {
					GroupMemberReq.delMember($scope.uid)
						.then(function(data) {
							//更新对话信息
							conversationInfoBinder.updateInfo({
								type: 'delete'
								//uNames: $scope.item.name
							});
						}, function(err) {
							console.error('删除成员失败');
						});
				};
			}],
			link: function postLink(scope, ele, attrs) {
				//var btnUser = ele.find('img');
				var btnDelUser = ele.find('i.del');

				/*btnUser.bind('click', function(e) {
					//用户信息弹窗
					$.magnificPopup.open({
						items: {
							src: '#userinfoCard',
							type: 'inline'
						},
						verticalFit: true,
						callbacks: {
							close: function() {
								//关闭名片弹层时清掉用户信息数据
								UserInfoServ.clear();
							}
						}
					});
				});*/

				//删除用户
				btnDelUser.bind('click', function(e) {
					//组织冒泡时间，info层自动隐藏 fixed #6318
					e.stopPropagation();
					//先删除界面中的元素
					scope.delUserItem(scope.$index);
					//发送删除请求
					scope.delUser();
				});

				//当作用于销毁时，清除引用
				scope.$on('$destroy', function() {
			    	btnDelUser.unbind('click');
			    });
			}
		}
	}
])
/*
 * 添加群聊成员按钮
 */
.directive('groupTreeMemberAddBtn', ['GroupMemberSelect', 'conversationInfoBinder', 'ConversationBinder', '$rootScope',
	'GroupMembersServ', 'GroupMemberReq', 'ConversationListBinder', 'PopMessage',
	function(GroupMemberSelect, conversationInfoBinder, ConversationBinder, $rootScope, GroupMembersServ,
		GroupMemberReq, ConversationListBinder, PopMessage) {
		return {
			restrict: 'EA',
			replace: true,
			template: '<div class="item add-member-btn" title="添加群聊成员">\
							<span class="name">添加成员</span>\
						</div>',
			controller: ['$scope', function($scope) {
				/*
				 * 更新对话信息(标题名、人数)
				 */
				var updateConvInfo = function(data) {
					var item = data.items[0];
					//var refs = data.references;
					var count = item && item.user_ids && item.user_ids.count;
					//var names = ConvTitleFilter(item.name, item);

					conversationInfoBinder.updateInfo({
						//fullName: names,
						count: count
					});
				};

				//从单聊变为群聊，需要新建群聊对话
				var newGroupConv = function(data) {
					$rootScope.$broadcast('conversations.prependItem', data.items[0]);
					
					ConversationBinder.trigger(data.items[0]);
				};

				var invite = function(data) {
					var trgData = ConversationBinder.getTriggerData();

					//** 注意:左侧对话列表项的成员名和头像更新不在这里，请到消息实时推送那里找找看:) **
					//发送添加成员请求
					GroupMemberReq.invite(data)
						.then(function(data) {
							$.magnificPopup.close();
							if (trgData.is_multi_user) {
								//如果当前已经是群聊，直接更新当前对话
								//conversationInfoBinder.init(data.items[0]);
								updateConvInfo(data);
								GroupMembersServ.init(data.references);
							} else {
								//如果当前不是群聊，创建新群聊
								//不需要单独创建了，会有新的消息推送
								//newGroupConv(data);
								//触发此对话
								ConversationListBinder.triggerConv(data.items[0].id);
							}
						}, function(err) {
							$.magnificPopup.close();
							PopMessage.tip({
					    		msg: err.data.errors.message,
					    		type: 0
					    	});
					});
				};

				$scope.initSelector = function() {
					//初始化群聊成员管理模块
					//并在选择完成员之后进行请求等后续操作
					GroupMemberSelect.init(1)
						.then(function(data) {
							invite(data.formData);
						});
				}
			}],
			link: function postLink(scope, ele, attrs) {
				ele.bind('click', function() {
					//成员选择器弹窗
					$.magnificPopup.open({
						items: {
							src: '#groupTreeMemberSelector',
							type: 'inline'
						},
						verticalFit: true,
						callbacks: {
							open: function() {
								scope.initSelector();
								//去掉删除成员状态
								scope.delItem = false;
							},
							close: function() {
								//关闭名片弹层时清掉用户信息数据
								GroupMemberSelect.clear();
							}
						}
					});
				});

				//当作用于销毁时，清除引用
				scope.$on('$destroy', function() {
			    	ele.unbind('click');
			    });
			}
		}
	}
])
/*
 * 删除群聊成员按钮
 */
.directive('groupTreeMemberDelBtn', [
	function() {
		return {
			restrict: 'EA',
			replace: true,
			template: '<div class="item del-member-btn" title="删除群聊成员">\
							<span class="name">删除成员</span>\
						</div>',
			controller: ['$scope', function($scope) {
			}],
			link: function postLink(scope, ele, attrs) {
				ele.bind('click', function(e) {
					e.preventDefault();
					//触发删除状态，显示删除按钮
					scope.toggleDel();
				});

				//当作用于销毁时，清除引用
				scope.$on('$destroy', function() {
			    	ele.unbind('click');
			    });
			}
		}
	}
])
/*
 * 群聊成员选择器
 */
.directive('groupTreeMemberSelector', ['GroupMemberSelect', '$injector', 'RootscopeApply', 'ConversationBinder', 'DepartmentsLoader', 'CompanyListBinder', 'Crumbs', 'UserSearchServ', 'PopMessage','CompanySelectedAllBinder',
	function(GroupMemberSelect, $injector, RootscopeApply, ConversationBinder, DepartmentsLoader, CompanyListBinder, Crumbs, UserSearchServ, PopMessag, CompanySelectedAllBinder) {
		return {
			restrict: 'EA',
			replace: false,
			scope: true,
			template: 	'<div class="gm-selector-box {{selectorStatus}}">\
							<h1>添加成员</h1>\
							<div class="friendlist-wrap details-wrap">\
								<div class="search-bar">\
									<span class="search-bar-title">选择联系人: </span>\
									<input type="text" ng-model="searchValue" placeholder="搜索" />\
									<button title="搜索">搜索</button>\
								</div>\
								<nav-crumbs class="search-cancel"></nav-crumbs>\
								<div ng-show="selectorStatus===\'company\' || selectorStatus===\'search\'" company-list class="companylist-box list"></div>\
								<div ng-show="selectorStatus===\'friends\'" friends-list class="friendlist-box list">\
									<div class="selected-all" selected-all>\
									<input type="checkbox" id="selected-all-checkbox" name="selected-all-checkbox" ng-model="choose" class="selectAll"/><label class="selected-all-text" for="selected-all-checkbox">全选</label>\
						            </div>\
									<div class="item company-btn">\
			  							<span class="name">公司通讯录</span>\
									</div>\
								</div>\
							</div>\
							<div class="selected-wrap">\
								<h5>已选择的联系人</h5><h5 class="choose-num" ng-show="count > 0">已选 {{count}} 人</h5>\
								<form class="selected-box list">\
									<p class="err-no-person" ng-show="errNoPerson">请选择联系人或部门</p>\
									<div group-member-selected-item ng-repeat="item in selectedArr" ></div>\
								</form>\
							</div>\
							<div class="result-bar">\
								<div class="btns">\
									<button class="cancel">取消</button>\
									<button class="submit">确定</button>\
								</div>\
							</div>\
						</div>',
			controller: ['$scope', function($scope) {
				//已选择成员数组
				$scope.selectedArr = [];
				$scope.count = $scope.selectedArr.length;
				$scope.selectorStatus = 'friends';
				//默认不显示返回按钮
				//$scope.showCrumbs = false;
				//成员选择器类型，默认为0; {0: 新建对话; 1: 添加群聊成员};
				$scope.selectorType = 0;
				//未选择成员标记
				$scope.errNoPerson = false;
				$scope.searchValue = '';
				$scope.showCrumbs = true;

				$scope.addMember = function(memberItem) {
					$scope.selectedArr.push(memberItem);
					$scope.count = $scope.selectedArr.length;

					$scope.errNoPerson = false;
					CompanyListBinder.checkBtn();
				};

				$scope.delMember = function(memberItem) {
					$scope.id = memberItem.id;
					var type = memberItem.type;
					switch (type) {
	                    case 'user':
	                        $scope.user_id = memberItem.id;
	                        break;
	                    case 'department':
	                        $scope.dept_id = memberItem.id;
	                        break;
	                }
					var del = function() {
						$scope.selectedArr = $scope.selectedArr.filter(function(ele) {
							if(ele.type == 'user'){
								return ele.id !== $scope.user_id;
							}else{
								return ele.id !== $scope.dept_id;
							}
						});
						$scope.count = $scope.selectedArr.length;
					}

					RootscopeApply($scope, function() {
						del();
						CompanyListBinder.checkBtn();
					});
				}

				$scope.clear = function() {
					$scope.initList();
					$scope.selectedArr = [];
					$scope.count = 0;
				};

				//初始化左侧列表
				$scope.initList = function() {
					$scope.selectorStatus = 'friends';
					//$scope.showCrumbs = false;
					$scope.searchValue = '';
					$('.nav-crumbs, .selected-all').show();
				};

				//调用选择器对应服务，并将context环境设置为this
				//GroupMemberSelect中便可以调用this的属性和方法
				$injector.invoke(GroupMemberSelect.bind, this, {
					$scope: $scope
				});
			}],
			link: function postLink(scope, ele) {
				var closeBtn = ele.find('.cancel');
				var submitBtn = ele.find('.submit');
				var companyBtn = ele.find('.company-btn');
				var form = ele.find('form');
				var searchInput = ele.find('.search-bar input');
				var searchBtn = ele.find('.search-bar button');
				var searchCancelBtn = ele.find('.search-cancel');
				var searchInputTimer = null;	//用来计时输入搜索字符
				
				//获取已选择用户ID数组
				var getUserIds = function() {
					var inputs = form.find('input[name="user_id[]"]');
					var user_ids = [];

					inputs.each(function(i) {
						if(this.title == "user"){
							user_ids.push(this.value);
						}
					});

					return user_ids;
				};

				//获取已选择用户ID数组
				var getDeptIds = function() {
					var inputs = form.find('input[name="user_id[]"]');
					var dept_ids = [];


					inputs.each(function(i) {
						if(this.title == "department"){
							dept_ids.push(this.value);
						}
					});

					return dept_ids;
				};

				//检查添加的用户是否全都存在，如果全都存在则返回false
				var check = function(selectedIds) {
					var trgData = ConversationBinder.getTriggerData();

					//如果当前没有会话，则跳过check
					if (!trgData) return true;

					var currentIds = trgData.user_ids.ids;

					selectedIds.forEach(function(val, i) {
						if (currentIds.indexOf(Number(val)) !== -1) {
							selectedIds.splice(i,1);
						}
					});

					//如果过滤后的ids数组长度为0，说明没有需要新加的用户
					return selectedIds.length;
				};

				//监测搜索框值的变化，实时搜索数据
				var searchWatcher = scope.$watch('searchValue', function() {
					// if(scope.searchValue != ''){
					// 	$('.nav-crumbs, .selected-all').hide();
					// }
					$('.companylist-box').addClass('search-result');
					//如果计时器存在，则清除重置
					if (searchInputTimer) {
						clearTimeout(searchInputTimer);
						searchInputTimer = null;
					}

					//设置计时器，到时间开始搜出
					searchInputTimer = setTimeout(function() {
						//如果搜索内容为空，自动恢复初始状态
						if (!scope.searchValue) {
							RootscopeApply(scope, function() {
								scope.initList();
								$('.nav-crumbs, .selected-all').show();
								$('.friendlist-box').show();
								if(scope.crumbsArr){
									scope.crumbsArr.length = 0;
									if(scope.crumbsArr.length == 0){
										Crumbs.add({
											name: '联系人',
											data: null
										});
									}
								}
							});
						}else{
							$('.friendlist-box').hide();
							$('.nav-crumbs, .select-all').hide();
							CompanySelectedAllBinder.selectNotAllBtn();
						}
						//触发点击搜索按钮
						searchBtn.click();
					}, 500);

				});

				//搜索框中按下回车键执行搜索
				searchInput.bind('keyup', function(e) {
					if (e.keyCode === 13) {
						searchBtn.click();
					}
				});

				//点击搜索按钮
				searchBtn.bind('click', function(e) {
					e.preventDefault();

					var v = $.trim(scope.searchValue);
					if (!v) return;

					//如果已经是搜索
					if (scope.selectorStatus === 'search') {
						//Crumbs.del();
					}

					//设置状态为搜索
					scope.selectorStatus = 'search';

					//显示返回按钮
					scope.showCrumbs = true;
					//标记loading状态
					CompanyListBinder.loading(true);

					UserSearchServ(v)
						.then(function(data) {
							
							
							$('.companylist-box').show();
							//渲染列表
							CompanyListBinder.render(data);

							//把数据加入面包屑对象
							// Crumbs.add({
							// 	name: '搜索',
							// 	data: data
							// });
						}, function(err) {
							PopMessage.tip({
								msg: '获取用户数据失败，请稍后重试',
								type: 0
							});
						});
				});

				//点击搜索框取消按钮，清空搜索框
				searchCancelBtn.bind('click', function(e) {
					searchInput.val('');
					scope.searchValue = '';
				});

				//公司通讯录按钮,点击加载并显示公司通讯录列表
				companyBtn.bind('click', function(e) {
					$('.friendlist-box').addClass('ng-hide');
					$('.companylist-box').show();
					//设置状态为公司通讯录
					scope.selectorStatus = 'company';
					if($('.companylist-box').hasClass('search-result')){
						$('.companylist-box').removeClass('search-result');
					}

					$('.nav-crumbs a').addClass('act');
					$('.nav-crumbs a').bind('click', function(e){
						e.preventDefault();
						if($('.nav-crumbs a:last-child').css('cursor') == 'text'){
							$('.nav-crumbs a:last-child').removeClass('act');
						}
					});
					//显示返回按钮
					scope.showCrumbs = true;
					scope.showCrumbsPath = true;
					$('.return').hide()
					//标记loading状态
					CompanyListBinder.loading(true);

					DepartmentsLoader()
						.then(function(data) {
							//渲染列表
							CompanyListBinder.render(data);
							if(scope.selectorType === 1){
								ele.find('.item i').addClass('ng-hide')
							}
							//把数据加入面包屑对象
							Crumbs.add({
								name: '公司通讯录',
								data: data
							});
						}, function(err) {
							console.error(err);
						});
				});

				//取消
				closeBtn.bind('click', function(e) {
					e.preventDefault();
					scope.errNoPerson = false;
					$('.btn-new-conv').removeAttr('type');
					$.magnificPopup.close();
					$(".group-member-selector .item").removeClass('selected')
					$('#selected-all-checkbox').prop('checked', false);
					$('#selected-all-checkbox1').prop('checked', false);
				});

				//提交
				submitBtn.bind('click', function(e) {
					e.preventDefault();
					$(".group-member-selector .item").removeClass('selected')
					$('#selected-all-checkbox').prop('checked', false);
					$('#selected-all-checkbox1').prop('checked', false);

					var user_ids = getUserIds();
					var dept_ids = getDeptIds();
					console.log('user_ids::',user_ids);
					console.log('dept_ids::',dept_ids);

					//如果没有选择成员，提示丫
					if (!user_ids.length && !dept_ids.length) {
						RootscopeApply(scope, function() {
							scope.errNoPerson = true;
						});
						return;
					};

					$('.btn-new-conv').removeAttr('type');

					scope.errNoPerson = false;

					//如果是添加群聊成员类型，验证是否没有要新添加的用户，则直接关闭
					if (scope.selectorType === 1 && !check(user_ids)) {
						$.magnificPopup.close();
						return false;
					}

					//完成，返回数据
					GroupMemberSelect.finish({
						formData: form.serialize(),
						userIds: getUserIds(),
						deptIds: getDeptIds()
					});
				});

				//当作用于销毁时，清除引用
				scope.$on('$destroy', function() {
			    	submitBtn.unbind('click');
			    	closeBtn.unbind('click');
			    	companyBtn.unbind('click');
					searchCancelBtn.unbind('click');
					searchBtn.unbind('click');
					searchInput.unbind('keyup');
					searchWatcher();

					if (searchInputTimer) {
						clearTimeout(searchInputTimer);
						searchInputTimer = null;
					}
			    	check = null;
			    	// getIds = null;
			    });
			}
		}
	}
])

.directive('groupTreeMemberSelectedItem', ['$rootScope',
	function($rootScope) {
		return {
			restrict: 'A',
			replace: false,
			template: '<div class="item" data-id="{{uid}}">\
							<img ng-src="{{uHead}}" alt="头像" />\
							<span class="name">{{username || short_name}}</span>\
							<i class="btn-del" title="删除用户"></i>\
							<input type="hidden" name="user_id[]" value="{{uid}}" title="{{type}}">\
						</div>',
			controller: ['$scope', 'GLOBAL_SETTING', function($scope, GLOBAL_SETTING) {
				var item = $scope.item;

				$scope.uid = item.id;
				if(item.avatar_url){
					$scope.uHead = GLOBAL_SETTING.URL + item.avatar_url;
				}else{
					$scope.uHead = $("header img.companyIco").attr('src');
				}
				$scope.username = item.name;
				$scope.short_name = item.short_name;
				$scope.type = item.type;
			}],
			link: function postLink(scope, ele) {
				var delBtn = ele.find('.btn-del');

				delBtn.bind('click', function(e) {
					e.preventDefault();
					scope.delMember(scope.item);
					//处理好友列表中选项
					$rootScope.$broadcast('memberSelect_' + scope.item.id + '.unselect');
				});

				//当作用于销毁时，清除引用
				scope.$on('$destroy', function() {
			    	delBtn.unbind('click');
			    });
			}
		}
	}
])

//全选按钮
.directive('selectedTreeAll', ['RootscopeApply', '$injector', '$rootScope',
	function(RootscopeApply, $injector, $rootScope) {
		return {
			restrict: 'A',
			replace: false,
			scope: true,
			template: '',
			controller: ['$scope',
				function($scope) {
					//全选按钮是否打钩
					$scope.choose = false;
				}
			],
			link: function postLink(scope, ele, attrs) {
				//全选按钮
				var selectAll = ele.find('.selectAll');

				//点击全选按钮，广播。下面的每一个li接收广播
				selectAll.bind('click',function(){
					$rootScope.$broadcast('selected_all.loaded', scope.choose);
				});
			}
		}
	}
])