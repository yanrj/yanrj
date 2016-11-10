'use strict';

angular.module('mx.user')
	/*
	 * 用户信息元素
	 */
	.directive('userInfo', ['$route', '$location', 'ContactBinder', 'PopMessage', 'FriendsListServ',
		'CurUserDB', 'Cache','UserLoaderServ','UserInfoServ','Storage','GLOBAL_SETTING',
		function($route, $location, ContactBinder, PopMessage, FriendsListServ, CurUserDB, Cache,UserLoaderServ,UserInfoServ,Storage,GLOBAL_SETTING) {
			return {
				restrict: 'EA',
				template: '<div class="namecard-box">\
								<img ng-src="{{userinfo.uhead}}" alt="头像" class="head-bg"/>\
								<span class="head-border"><img ng-src="{{userinfo.uhead}}" alt="头像" class="head"/></span>\
								<figure>\
									<ul>\
										<li>\
											<span class="name">姓名 : {{userinfo.name}}</span>\
											<span class="online-status">\
												<span class="online-status-offline" ng-show="online==\'offline\'"></span>\
												<span class="online-status-web" ng-show="online==\'web\'"></span>\
												<span class="online-status-mobile" ng-show="online==\'mobile\'"></span>\
											</span>\
										</li>\
										<li>\
											职务 : {{userinfo.title}}\
										</li>\
										<li>\
											部门 : {{userinfo.department}}\
										</li>\
										<li>\
											手机号 : {{userinfo.cellphone}}\
										</li>\
										<li>\
											工作电话 : {{userinfo.workphone}}\
										</li>\
										<li>\
											邮箱 : {{userinfo.email}}\
										</li>\
									</ul>\
								</figure>\
								<div class="interact" ng-show="showBtn">\
									<a new-conv-btn ng-show="validModule && userinfo.showBtnMessage" class="btn-message" href="javascript:void(0)">发消息</a>\
									<a ng-show="userinfo.showBtnMkfrd && showFrBtn" class="btn-mkfrd" href="javascript:void(0)">加为联系人</a>\
									<a ng-show="userinfo.showBtnBkfrd && showFrBtn" class="btn-bkfrd" href="javascript:void(0)">删除联系人</a>\
								</div>\
							</div>',
				controller: ['$scope', 'GLOBAL_SETTING', '$q', 'Storage', 'FriendsServ',
					function($scope, GLOBAL_SETTING, $q, Storage, FriendsServ) {
						var scopeWorker = function(data) {
							var userinfo = data.user_info;
							//优先查看flavors配置是否隐藏加\删好友按钮
							$scope.showFrBtn = true;
							if(GLOBAL_SETTING.is_hide_btn_mkfrd){
								$scope.showFrBtn = false;
								$(".user-card .btn-message").css("margin","0 auto").css("display", "block");
							}
							$scope.showBtn = data.enable_actions ? data.enable_actions : true;
							$scope.jumpUrl = GLOBAL_SETTING.card_url;
							//将通讯录界面的加载状态标记为false
							ContactBinder.loading(false);
							if(!userinfo) return;
							$scope.userinfo = {
								uid: data.id,				//用户ID
								uhead: GLOBAL_SETTING.URL + data.avatar_url + '/large',		//头像
								name: data.name,					//用户名
								email: data.email,					//邮箱
								cellphone: userinfo.cellvoice1,		//手机
								workphone: userinfo.workvoice,		//固话
								emp_code: userinfo.emp_code,		//工号
								title: userinfo.title,				//职位
								department: userinfo.department,	//部门
								showBtnMessage: false,				//是否显示"发消息"按钮
								showBtnMkfrd: false, 				//是否显示"加为联系人"按钮
								showBtnBkfrd: false, 				//是否显示"解除好友"按钮
								actived: data.actived				//用户是否已删除
							};
							//过滤出需要显示的用户信息列表
							// $scope.userDetails = data.user_show.filter(function(ele) {
							// 	if(ele.column == 'avatar' || ele.column == 'qrcode') return;
							// 	//只要name不为空，就是要显示的属性
							// 	return ele.name;
							// });
							//获取在线状态
							$scope.online = data.online;
							//判断并处理是否显示"发消息"和"加为联系人"按钮
							if ($scope.userinfo.uid !== Storage.getUser('id')) {
								$scope.userinfo.showBtnMessage = true;

								if (!data.is_followed_by) {
									$scope.userinfo.showBtnMkfrd = true;
									$scope.userinfo.showBtnBkfrd = false;
								} else {
									$scope.userinfo.showBtnMkfrd = false;
									$scope.userinfo.showBtnBkfrd = true;
								}
							}

							//高管模式
							var isPhone = 1;
							var isInfo = 2;
							var isEmail = 4;
							if((data.permission & isPhone) == isPhone){
								$scope.isShowPhone = true;
							}else{
								$scope.isShowPhone = false;
							}
							if((data.permission & isInfo) == isInfo){
								$scope.userinfo.showBtnMessage = true;
							}else{
								$scope.userinfo.showBtnMessage = false;
							}
							if((data.permission & isEmail) == isEmail){
								$scope.isShowEmail = true;
							}else{
								$scope.isShowEmail = false;
							}

							//如果用户已被删除，则不显示按钮
							if (!$scope.userinfo.actived) {
								$scope.userinfo.showBtnMkfrd = false;
								$scope.userinfo.showBtnBkfrd = false;
								$scope.userinfo.showBtnMessage = false;
							}

							var validModules = Storage.validModules();
		                    var isInArr = $.inArray('im', validModules);
		                    $scope.validModule = true;
		                    if(isInArr < 0){
		                        $scope.validModule = false;
		                    }

							//存储data数据，以便其他地方调用
							$scope.name = data.name;
							$scope.data = data;
						};

						//将OCU数据存入数据库和缓存
						var saveUser = function(data) {
							CurUserDB.saveReferences(data)
								.then(function() {
									Cache.put('user_' + $scope.userinfo.uid, data[0]);
								});
						}

						//添加好友
						$scope.mkFriend = function() {
							var uid = $scope.userinfo.uid;

							FriendsServ.add(uid)
								.then(function(data) {
									//如果在对话界面，改变按钮状态
									$scope.userinfo.showBtnMkfrd = false;
									$scope.userinfo.showBtnBkfrd = true;

									//弹出提示
									PopMessage.tip({
										msg: '添加联系人成功.',
										type: 1
									});

									//保存用户数据
									saveUser(data);

									//如果是通讯录页
									if ($location.path() === '/contacts') {
										//重新初始化好友列表
										FriendsListServ.init();
									}
									setTimeout(function(){
										$.magnificPopup.close();
									}, 100);
									

								}, function(err) {
									console.error(err);
								});
						};

						//解除好友
						$scope.bkFriend = function() {
							var uid = $scope.userinfo.uid;

							FriendsServ.breakFrd(uid)
								.then(function(data) {
									//如果在对话界面，改变按钮状态
									$scope.userinfo.showBtnMkfrd = true;
									$scope.userinfo.showBtnBkfrd = false;

									//弹出提示
									PopMessage.tip({
										msg: '删除联系人成功.',
										type: 1
									});

									//保存用户数据
									saveUser(data);

									//如果是通讯录页
									if ($location.path() === '/contacts') {
										//重新初始化好友列表
										FriendsListServ.init();
									}
									setTimeout(function(){
										$.magnificPopup.close();
									}, 100);

								}, function(err) {
									console.error(err);
								});
						};

						//显示用户信息事件
						$scope.$on('userinfo.show', function(e, data) {
							scopeWorker(data);
						});

						//清楚当前$scope，即删除用户信息
						$scope.$on('userinfo.clear', function(e) {
							//删除作用域内的用户信息
							$scope.$apply(function() {
								delete $scope.userinfo;
							});
						});

						//根据用户ID，显示用户详情
						$scope.$on('userinfo.show_by_id', function(e, userID) {
							      UserLoaderServ.getUser(userID)
                                    .then(function(data) {
                                      scopeWorker(data);
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

                                    }, function(err) {
                                        console.error(err);

                                        PopMessage.err(err.data.errors);
                                    });
						});

					
					}
				],
				link: function postLink(scope, element, attrs) {
					var btnMessage = element.find('.btn-message');
					var btnMkfrd = element.find('.btn-mkfrd');
					var btnBkfrd = element.find('.btn-bkfrd');
					var jumpH = element.find('h4');

					jumpH.on('click', function(e){
						e.preventDefault();
						if(!scope.jumpUrl) return;
						
						var ssoToken = Storage.getToken().mx_sso_token;
						var loginName = scope.data.login_name;
						var c = scope.jumpUrl.indexOf('?') > -1 ? '&' : '?';
	                    var linkUrl = scope.jumpUrl + c + 'login_name=' + loginName +'&mx_sso_token='+ssoToken;
						window.open(linkUrl);
					});

					btnMkfrd.bind('click', function(e) {
						e.preventDefault();
						scope.mkFriend();
					});

					btnBkfrd.bind('click', function(e) {
						e.preventDefault();
						scope.bkFriend();
					});

					btnMessage.bind('click', function(e) {
						e.preventDefault();

						//关闭弹窗
						$.magnificPopup.close();
					});
				}
			}
		}
	])
	//个人信息面板
	.directive('selfInfo', ['SelfInfoBinder', '$injector', '$rootScope', 'GLOBAL_SETTING', 'UserLoaderServ',
		'RootscopeApply', 'Cache', 'CurUserDB','Storage',
		function(SelfInfoBinder, $injector, $rootScope, GLOBAL_SETTING, UserLoaderServ, RootscopeApply, Cache,
			CurUserDB, Storage) {
			return {
				restrict: 'EA',
				scope: true,
				template: '<form name="from" ng-hide="selfInfoLoading" class="selfinfo-box">\
								<img ng-src="{{selfinfo.uhead}}" alt="头像" class="head-bg"/>\
								<span class="head-border"><img ng-src="{{selfinfo.uhead}}" alt="头像" /></span>\
								<figure ng-class="editMode ? \'edit-mode\' : \'\'">\
									<ul class="repeat-item">\
										<li>\
											我的二维码 : {{selfinfo.name}}\
										</li>\
										<li>\
											姓名 : {{selfinfo.name}}\
										</li>\
										<li>\
											职务 : {{selfinfo.title}}\
										</li>\
										<li>\
											部门 : {{selfinfo.department}}\
										</li>\
										<li>\
											手机号 : {{selfinfo.cellphone}}\
										</li>\
										<li>\
											工作电话 : {{selfinfo.workphone}}\
										</li>\
										<li>\
											邮箱 : {{selfinfo.email}}\
										</li>\
									</ul>\
								</figure>\
								<input type="hidden" name="login_name" value={{loginName}}>\
								<div class="interact">\
									<a ng-show="!editMode && !revisableArr" class="btn-edit" href="#">编辑个人资料</a>\
									<a ng-show="editMode && !saving" class="btn-save" href="#">保存</a>\
									<a ng-show="saving" class="saving" href="#">保存中...</a>\
									<a ng-show="editMode" class="btn-cancel" href="#">取消</a>\
								</div>\
							</form>\
							<span ng-show="selfInfoLoading" class="loading">正在加载</span>\
							<strong ng-show="selfInfoError" class="error-message">{{selfInfoError}}</strong>',
				controller: ['$scope',
					function($scope) {
						$scope.selfInfoLoading = true;
						//绑定服务
						$injector.invoke(SelfInfoBinder.bind, this, {
							$scope: $scope
						});

						// <li>昵　　称： <input name="name" ng-disabled="!editMode" ng-model="selfinfo.name" /></</li>\
						// <li ng-show="selfinfo.emp_code">工　　号： {{selfinfo.emp_code}}</li>\
						// <li>部　　门： {{selfinfo.department}}</li>\
						// <li>职　　位： {{selfinfo.title}}</li>\
						// <li>移动电话： <input name="cellphone1" ng-disabled="!editMode" ng-model="selfinfo.cellphone" /></li>\
						// <li>固定电话： <input name="workvoice" ng-disabled="!editMode" ng-model="selfinfo.workphone" /></li>\
						// <li>邮箱地址： {{selfinfo.email}}</li>\
						var eleEdit = $('.selfinfo-box ul');
						var revisableArr = [];
						var scopeWorker = function(data) {
							$scope.loginName = data.login_name;
							var _htmlStr = '';
							var _data = data.user_show;
							console.info('_data', _data);
							if(!_data){
								var _tempData = Cache.get('user_' + data.id);
								_data = _tempData.user_show
							}
							$.each(_data, function(index, val) {
								/* iterate through array or object */
								if(val.column == 'avatar') return;
								if(val.value == null){
									val.value = '未填写';
								}
								if((val.name == '姓名' || val.name == '手机号' || val.name == '工作电话' || val.name == '手机短号')&&val.revisable){
									_htmlStr += '<li>'+val.name+'：<input name='+val.column+' disabled value="'+val.value+'" /></li>';
								}else if(val.name == '我的二维码'){
									_htmlStr += '<li>'+val.name+'：<img class="thumImg" src="'+ GLOBAL_SETTING.URL + val.value +'"></li>';
								}else{
									_htmlStr += '<li>'+val.name+'：'+val.value+'</li>';
								}
								if(val.revisable){
									revisableArr.push(val.name);
								}
							}); 
							console.info('revisableArr.length', revisableArr.length);
							if(revisableArr.length<1){
								$scope.revisableArr = true;
							}
							eleEdit.html(_htmlStr);
							//修改列表顺序
							$('.selfinfo-box ul li:nth-child(2)').hide();
							//将部门和职务顺序进行调换
							var dept_clone = $(".selfinfo-box ul li:nth-child(4)").clone();
				            $(".selfinfo-box ul li:nth-child(4)").remove();
				            $(".selfinfo-box ul li:nth-child(4)").after(dept_clone);

							$scope.selfInfoLoading = false;
							$scope.editMode = false;
							$scope.selfInfoError = null;

							$scope.selfinfo = {
								uid: data.id,						//用户ID
								uhead: GLOBAL_SETTING.URL + data.avatar_url + '/large',		//头像
								name: data.name,					//用户名
								email: data.email,					//邮箱
								cellphone: data.cellvoice1,		//手机
								workphone: data.workvoice,		//固话
								title: data.title,				//职位
								department: data.department		//部门
							}

							$(".sidebar .uhead img").attr('src', $scope.selfinfo.uhead);

							var getUserCurrent = Storage.getUser('currentUser');
							getUserCurrent.avatar_url = data.avatar_url + '/large';

							Storage.setUser('currentUser',getUserCurrent)
							//存储data数据，以便其他地方调用
							$scope.id = data.id;
							$scope.name = data.name;
							$scope.data = data;
						};



						//更新缓存中关于自己信息的数据
						var updateCacheRefs = function(data) {
							var uId = data.id;
							var userCache = Cache.get('user_' + uId);

							if (!userCache) return;

							userCache.name = data.name;
							userCache.short_pinyin = data.short_pinyin;
							userCache.pinyin = data.pinyin;
							userCache.cellvoice1 = data.cellvoice1;
							userCache.workvoice = data.workvoice;

							//存入缓存
							Cache.put('user_' + uId, userCache);

							CurUserDB.saveReferences([userCache]);
						};

						//完成
						var done = function(data) {
							RootscopeApply($scope, function() {
								$scope.saving = false;
								$scope.editMode = false;
								eleEdit.find('input').removeAttr('disabled');
								$scope.selfInfoError = null;
								if(!data.user_info){
									//fix #5973
									data.user_info=$scope.data.user_info;
								}
								$scope.data = data;
								updateCacheRefs(data);
							});

						};

						var error = function(errData) {
							var data = errData.data;

							RootscopeApply($scope, function() {
								if (data) {
									$scope.selfInfoError = data.errors.message;
								} else if(errData.status === 502) {
									$scope.selfInfoError = '服务器未响应，请稍后再试.';
								} else {
									$scope.selfInfoError = '请求失败，请稍后再试.';
								}

								$scope.saving = false;
							});
						};

						//生成并返回修改资料的参数
						var getParams = function() {
							var params = { id: $scope.id };
							if (document.getElementsByName('name')[0]) {
								params.name = document.getElementsByName('name')[0].value;
							}

							if (document.getElementsByName('cellvoice1')[0]) {
								params.cellvoice1 = document.getElementsByName('cellvoice1')[0].value;
							}

							if (document.getElementsByName('workvoice')[0]) {
								params.workvoice = document.getElementsByName('workvoice')[0].value;
							}

							if (document.getElementsByName('preferred_mobile')[0]) {
								params.preferred_mobile = document.getElementsByName('preferred_mobile')[0].value;
							}

							if (document.getElementsByName('login_name')[0]) {
								params.login_name = document.getElementsByName('login_name')[0].value;
							}

							return params;
						};

						//加载完成
						this.loaded = function(data) {
							RootscopeApply($scope, function() {
								scopeWorker(data);
							});
						};

						//标记个人资料
						$scope.edit = function() {
							RootscopeApply($scope, function() {
								$scope.editMode = true;
								eleEdit.find('input').removeAttr('disabled');
							});
						};

						//取消编辑
						$scope.cancel = function() {
							RootscopeApply($scope, function() {
								scopeWorker($scope.data);
							});
						};

						//关闭个人信息，如果正在编辑，取消编辑
						$scope.close = function() {
							$scope.editMode = false;
							eleEdit.find('input').attr('disabled');
						};

						//保存编辑的资料
						$scope.save = function() {
							var params = getParams();
							$scope.saving = true;
							$scope.selfInfoError = null;

							UserLoaderServ.editUser(params)
							.then(function(data) {
								done(data);
								UserLoaderServ.getUser(data.id)
								.then(function(e){
									//更新缓存
									return Cache.get('user_' + data.id,e);
								})
								
							}, function(err) {
								error(err);
							});
						};
					}
				],
				link: function(scope, ele, attrs) {
					var btnEdit = ele.find('.btn-edit');
					var btnSave = ele.find('.btn-save');
					var btnCancel = ele.find('.btn-cancel');
					var btnSaving = ele.find('.saving');
					var form = ele.find('.selfinfo-box');
					var img = form.find('ul li img.thumImg');

					//点击编辑
					btnEdit.bind('click', function(e) {
						e.preventDefault();
						scope.edit();
					});

					//点击保存
					btnSave.bind('click', function(e) {
						e.preventDefault();
						scope.save();
					});

					//点击取消
					btnCancel.bind('click', function(e) {
						e.preventDefault();
						scope.cancel();
					});

					//正在保存按钮
					btnSaving.bind('click', function(e) {
						e.preventDefault();
					});

					$('.selfinfo-box').on("mouseenter", '.thumImg', function(e) {
						var imgUrl = $(this).attr('src');
						$(this).parent().append('<img class="bigImg" src='+ imgUrl +' />')
					});

					$('.selfinfo-box').on("mouseleave", '.thumImg', function(e) {
						$('.bigImg').remove();
					});
				}
			}
		}
	])

	//当前用户个人头像
	.directive('userhead', ['SelfInfoBinder', 'Storage',
		function(SelfInfoBinder, Storage) {
			return {
				restrict: 'EA',
				replace: true,
				template: '<a href="#" class="uhead" title="查看个人信息">\
	    					<img ng-src="{{uHead}}" alt="头像" />\
	    					<span class="user-name" title="{{name}}">{{name}}</span>\
	  						</a>',
	  			controller: ['$scope', 'Storage', 'GLOBAL_SETTING', 'Cache',
		  			function($scope, Storage, GLOBAL_SETTING, Cache) {
		  				//var token = Storage.getToken().access_token;
		  				$scope.uHead = GLOBAL_SETTING.URL + Storage.getUser('currentUser').avatar_url;
		  				$scope.name = Storage.getUser('currentUser').name;
		  				//$scope.uHead = GLOBAL_SETTING.URL + Storage.getUser('currentUser').avatar_url + '?access_token=' + token;
		  			}
		  		],
				link: function postLink(scope, element, attrs) {
					element.bind('click', function(e) {
						e.preventDefault();
						SelfInfoBinder.open();
					});
				}
			}
		}
	])

	/*
	 * 需要点击显示用户信息的按钮、链接等元素
	 */
	.directive('btnUser', ['UserLoaderServ', '$rootScope', 'ContactsStatus', 'ContactBinder', 'UserInfoServ', '$location', 'PopMessage','ConversationBinder',
		function(UserLoaderServ, $rootScope, ContactsStatus, ContactBinder, UserInfoServ, $location, PopMessage,ConversationBinder) {
			return {
				restrict: 'EAC',
				controller: function($scope) {
					// console.info('trgData', ConversationBinder.getTriggerData());
					// var checkUser = function(){
					// 	var trgData = ConversationBinder.getTriggerData();
					// 	var conv=Cache.get('conversation_'+trgData.id);
					// 	if(conv){
					// 		trgData = conv;
					// 	}
					// 	//如果当前没有会话，则跳过check
					// 	if (!trgData) return true;

					// 	var currentIds = trgData.user_ids.ids;
					// 	selectedIds.forEach(function(val, i) {
					// 		if (currentIds.indexOf(Number(val)) !== -1) {
					// 			selectedIds.splice(i,1);
					// 		}
					// 	});
					// }
				},
				link: function postLink(scope, element, attrs) {
					/**
					 * 自定义元素上有一个自定义属性"data-type"，用来定义该用户按钮类型
					 * {'normal': 默认类型, 'popup': 弹窗类型}
					 */
					var type;
					var clickHandler = function(e) {
						e.preventDefault();
						// if($('.nav-crumbs a').css('cursor') != 'text'){
						// 	$('.nav-crumbs a').addClass('act');
						// }
						// if($('.nav-crumbs a').css('cursor') == 'text'){
						// 	$('.nav-crumbs a').reomveClass('act');
						// }
						type = element.data('type');
						ContactBinder.loading(true);

						//如果是公众号类型，不显示用户信息
						if (scope.isOcu) return;

						var popupUser = function() {
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
						};

						//下面是加载用户信息的逻辑
						UserLoaderServ.getUser(scope.uid)
							.then(function(data) {
								$rootScope.$broadcast('userinfo.show', data);
								//将通讯录状态置为"好友信息"
								//ContactsStatus('friendInfo');

								//如果是对话主界面，会有用户弹窗
								if (type === 'popup') {
									popupUser();
								}
							}, function(err) {
								console.error(err);
								ContactBinder.loading(false);

								PopMessage.err(err.data.errors);
							});
					}

					element.bind('click', clickHandler);

					//当作用于销毁时，清除引用
					scope.$on('$destroy', function() {
				    	element.unbind('click', clickHandler);
				    	clickHandler = null;
				    	type = null;
				    });
				}
			}
		}
	])
	/*
	 * tree通讯录用户信息元素
	 */
	.directive('userTreeInfo', ['$route', '$location', 'ContactBinder', 'PopMessage', 'FriendsListServ',
		'CurUserDB', 'Cache','UserLoaderServ','UserInfoServ','Storage','GLOBAL_SETTING',
		function($route, $location, ContactBinder, PopMessage, FriendsListServ, CurUserDB, Cache,UserLoaderServ,UserInfoServ,Storage,GLOBAL_SETTING) {
			return {
				restrict: 'EA',
				template: '<div class="namecard-box">\
								<div class="photo-info">\
									<span class="head-border"><img ng-src="{{userinfo.uhead}}" alt="头像" class="head"/></span>\
									<div class="infos">\
										<div class="name">{{userinfo.name}}<span class="online-status">\
											<span class="online-status-offline" ng-show="online==\'offline\'"></span>\
											<span class="online-status-web" ng-show="online==\'web\'"></span>\
											<span class="online-status-mobile" ng-show="online==\'mobile\'"></span>\
										</span>\
										</div>\
										<div class="title">{{userinfo.title}}</div>\
									</div>\
								</div>\
								<figure>\
									<ul>\
										<li>\
											部门 : {{userinfo.department}}\
										</li>\
										<li ng-show="isShowPhone">\
											手机号 : {{userinfo.cellphone}}\
										</li>\
										<li ng-show="isShowPhone">\
											工作电话 : {{userinfo.workphone}}\
										</li>\
										<li ng-show="isShowEmail">\
											邮箱 : {{userinfo.email}}\
										</li>\
									</ul>\
								</figure>\
								<div class="interact" ng-show="showBtn">\
									<a new-conv-btn ng-show="validModule && userinfo.showBtnMessage" class="btn-message" href="javascript:void(0)">发消息</a>\
									<a ng-show="userinfo.showBtnMkfrd && showFrBtn" class="btn-mkfrd" href="javascript:void(0)">加为联系人</a>\
									<a ng-show="userinfo.showBtnBkfrd && showFrBtn" class="btn-bkfrd" href="javascript:void(0)">删除联系人</a>\
								</div>\
							</div>',
				controller: ['$scope', 'GLOBAL_SETTING', '$q', 'Storage', 'FriendsServ',
					function($scope, GLOBAL_SETTING, $q, Storage, FriendsServ) {
						var scopeWorker = function(data) {
							var userinfo = data.user_info;
							
							$scope.online = data.online;
							
							//优先查看flavors配置是否隐藏加\删好友按钮
							$scope.showFrBtn = true;
							if(GLOBAL_SETTING.is_hide_btn_mkfrd){
								$scope.showFrBtn = false;
								$(".user-card .btn-message").css("margin","0 auto").css("display", "block");
							}
							$scope.showBtn = data.enable_actions ? data.enable_actions : true;
							$scope.jumpUrl = GLOBAL_SETTING.card_url;
							//将通讯录界面的加载状态标记为false
							ContactBinder.loading(false);
							if(!userinfo) return;

							$scope.userinfo = {
								uid: data.id,				//用户ID
								uhead: GLOBAL_SETTING.URL + data.avatar_url + '/large',		//头像
								name: data.name,					//用户名
								email: data.email!='' ? data.email : '无',					//邮箱
								cellphone: userinfo.cellvoice1 ? userinfo.cellvoice1 : '无',		//手机
								workphone: userinfo.workvoice ? userinfo.workvoice : '无',		//固话
								emp_code: userinfo.emp_code ? userinfo.emp_code : '无',		//工号
								title: userinfo.title,				//职位
								department: userinfo.department ? userinfo.department : '无',	//部门
								showBtnMessage: false,				//是否显示"发消息"按钮
								showBtnMkfrd: false, 				//是否显示"加为联系人"按钮
								showBtnBkfrd: false, 				//是否显示"解除好友"按钮
								actived: data.actived				//用户是否已删除
							}
							//过滤出需要显示的用户信息列表
							// $scope.userDetails = data.user_show.filter(function(ele) {
							// 	if(ele.column == 'avatar' || ele.column == 'qrcode') return;
							// 	//只要name不为空，就是要显示的属性
							// 	return ele.name;
							// });
							//获取在线状态
							

							//判断并处理是否显示"发消息"和"加为联系人"按钮
							if ($scope.userinfo.uid !== Storage.getUser('id')) {
								$scope.userinfo.showBtnMessage = true;

								if (!data.is_followed_by) {
									$scope.userinfo.showBtnMkfrd = true;
									$scope.userinfo.showBtnBkfrd = false;
								} else {
									$scope.userinfo.showBtnMkfrd = false;
									$scope.userinfo.showBtnBkfrd = true;
								}
							}

							//高管模式
							var isPhone = 1;
							var isInfo = 2;
							var isEmail = 4;
							if((data.permission & isPhone) == isPhone){
								$scope.isShowPhone = true;
							}else{
								$scope.isShowPhone = false;
							}
							if((data.permission & isInfo) == isInfo){
								$scope.userinfo.showBtnMessage = true;
							}else{
								$scope.userinfo.showBtnMessage = false;
							}
							if((data.permission & isEmail) == isEmail){
								$scope.isShowEmail = true;
							}else{
								$scope.isShowEmail = false;
							}

							//如果用户已被删除，则不显示按钮
							if (!$scope.userinfo.actived) {
								$scope.userinfo.showBtnMkfrd = false;
								$scope.userinfo.showBtnBkfrd = false;
								$scope.userinfo.showBtnMessage = false;
							}

							var validModules = Storage.validModules();
		                    var isInArr = $.inArray('im', validModules);
		                    $scope.validModule = true;
		                    if(isInArr < 0){
		                        $scope.validModule = false;
		                    }

							//存储data数据，以便其他地方调用
							$scope.name = data.name;
							$scope.data = data;
						};

						//将OCU数据存入数据库和缓存
						var saveUser = function(data) {
							CurUserDB.saveReferences(data)
								.then(function() {
									Cache.put('user_' + $scope.userinfo.uid, data[0]);
								});
						}

						//添加好友
						$scope.mkFriend = function() {
							var uid = $scope.userinfo.uid;

							FriendsServ.add(uid)
								.then(function(data) {
									//如果在对话界面，改变按钮状态
									$scope.userinfo.showBtnMkfrd = false;
									$scope.userinfo.showBtnBkfrd = true;

									//弹出提示
									PopMessage.tip({
										msg: '添加联系人成功.',
										type: 1
									});

									//保存用户数据
									saveUser(data);

									//如果是通讯录页
									if ($location.path() === '/contacts') {
										//重新初始化好友列表
										FriendsListServ.init();
									}
									setTimeout(function(){
										$.magnificPopup.close();
									}, 100);
									

								}, function(err) {
									console.error(err);
								});
						};

						//解除好友
						$scope.bkFriend = function() {
							var uid = $scope.userinfo.uid;

							FriendsServ.breakFrd(uid)
								.then(function(data) {
									//如果在对话界面，改变按钮状态
									$scope.userinfo.showBtnMkfrd = true;
									$scope.userinfo.showBtnBkfrd = false;

									//弹出提示
									PopMessage.tip({
										msg: '删除联系人成功.',
										type: 1
									});

									//保存用户数据
									saveUser(data);

									//如果是通讯录页
									if ($location.path() === '/contacts') {
										//重新初始化好友列表
										FriendsListServ.init();
									}
									setTimeout(function(){
										$.magnificPopup.close();
									}, 100);

								}, function(err) {
									console.error(err);
								});
						};

						//显示用户信息事件
						$scope.$on('usertreeinfo.show', function(e, data) {
							scopeWorker(data);
						});

						//清楚当前$scope，即删除用户信息
						$scope.$on('userinfo.clear', function(e) {
							//删除作用域内的用户信息
							$scope.$apply(function() {
								delete $scope.userinfo;
							});
						});

						//根据用户ID，显示用户详情
						$scope.$on('userinfo.show_by_id', function(e, userID) {
							      UserLoaderServ.getUser(userID)
                                    .then(function(data) {
                                      scopeWorker(data);
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

                                    }, function(err) {
                                        console.error(err);

                                        PopMessage.err(err.data.errors);
                                    });
						});

					
					}
				],
				link: function postLink(scope, element, attrs) {
					var btnMessage = element.find('.btn-message');
					var btnMkfrd = element.find('.btn-mkfrd');
					var btnBkfrd = element.find('.btn-bkfrd');
					var jumpH = element.find('h4');

					jumpH.on('click', function(e){
						e.preventDefault();
						if(!scope.jumpUrl) return;
						
						var ssoToken = Storage.getToken().mx_sso_token;
						var loginName = scope.data.login_name;
						var c = scope.jumpUrl.indexOf('?') > -1 ? '&' : '?';
	                    var linkUrl = scope.jumpUrl + c + 'login_name=' + loginName +'&mx_sso_token='+ssoToken;
						window.open(linkUrl);
					});

					btnMkfrd.bind('click', function(e) {
						e.preventDefault();
						scope.mkFriend();
					});

					btnBkfrd.bind('click', function(e) {
						e.preventDefault();
						scope.bkFriend();
					});

					btnMessage.bind('click', function(e) {
						e.preventDefault();

						//关闭弹窗
						$.magnificPopup.close();
					});
				}
			}
		}
	])
	/*
	 * tree通讯录部门信息元素
	 */
	.directive('deptTreeInfo', ['$route', '$location', 'ContactBinder', 'PopMessage', 'FriendsListServ',
		'CurUserDB', 'Cache','UserLoaderServ','UserInfoServ','Storage','GLOBAL_SETTING','GroupMemberSelect','ConversationBinder',
		function($route, $location, ContactBinder, PopMessage, FriendsListServ, CurUserDB, Cache,UserLoaderServ,UserInfoServ,Storage,GLOBAL_SETTING, GroupMemberSelect, ConversationBinder) {
			return {
				restrict: 'EA',
				template: '<div class="namecard-box">\
								<div class="photo-info">\
									<span class="head-border"></span>\
								</div>\
								<figure>\
									<div class="name">{{name}}</div>\
									<div class="full-path">{{fullPath}}</div>\
									<div class="number">共{{usersCount}}人</div>\
								</figure>\
								<div class="interact">\
									<a class="btn-message" href="javascript:void(0)">发起群聊</a>\
								</div>\
							</div>',
				controller: ['$scope', 'GLOBAL_SETTING', '$q', 'Storage', 'FriendsServ',
					function($scope, GLOBAL_SETTING, $q, Storage, FriendsServ) {
						var scopeWorker = function(data) {
							$scope.data = angular.copy(data);
							//var fullName = data.full_name;
							var datas = data.full_name;
							var reCat = /\//;
							var arrdata = datas.split(reCat);
							var fullPath = '';
							for (var i = 0; i < arrdata.length-1; i++)
							{
								if(arrdata.length-1 == 1 || i == 0){
									fullPath=arrdata[0];
								}else if(i == 0){
									fullPath+=arrdata[0];
								}else{
									fullPath+= '-'+arrdata[i];
								}
								
							}
							$scope.name = data.short_name;
							$scope.fullPath = fullPath;
							$scope.usersCount = data.users_count;
							//将通讯录界面的加载状态标记为false
							ContactBinder.loading(false);
						};

						//显示用户信息事件
						$scope.$on('deptinfo.show', function(e, data) {
							scopeWorker(data);
						});
					}
				],
				link: function postLink(scope, element, attrs) {
					var btnMessage = element.find('.btn-message');
					btnMessage.bind('click', function(e) {
						e.preventDefault();


						var newConv = function(userIds, deptIds) {
							var selfId = Storage.getUser('id');
							var networkId = Storage.getUser('homeUser').network_id;
							var isMultiUser = userIds.length > 1 || deptIds.length >= 1;

							var data = {
								creator_id: selfId,
								type: isMultiUser ? 'new_conv' : 'user',
								network_id: networkId,
								is_multi_user: isMultiUser ? true : false,
								user_id: userIds.join(','),
								dept_id: deptIds.join(','),
								user_ids: {
									count: userIds.length,
									ids: userIds
								},
								dept_ids: {
									count: deptIds.length,
									ids: deptIds
								}
							}
							ConversationBinder.trigger(data);
						};

						newConv([], [scope.data.id]);

						// GroupMemberSelect.init()
						// .then(function(data) {
							
						// });

						// var dept = [scope.data.id];
						// GroupMemberSelect.finish({
						// 	deptIds: dept,
						// 	userIds: []
						// });
					});
				}
			}
		}
	])