'use strict';

angular.module('mx.sidebar')
	/**
	 *	自定义 sidebar ， 配置sidebar文件：config.json
	 */
	.directive('btnItems', ['$http','$compile','$location', 'Storage', 'HotkeyBinder','GLOBAL_SETTING','SlideWindow','Cache',
	 function($http,$compile,$location, Storage, HotkeyBinder,GLOBAL_SETTING, SlideWindow, Cache) {
		return {
			restrict:'A',
			controller: ['$scope',
				function($scope) {
					$scope.im = true;
					$scope.contacts = true;
					$scope.files = true;
					$scope.collection = true;
					
					//获取sidebar配置
					var licens = Storage.validNewModules();
					if(licens){
						if(licens.work_circle){
							$scope.work_circle = true;
						}
						if(licens.appstore){
							$scope.appstore = true;
						}
					}

		            var sidebarItems = $scope.data = GLOBAL_SETTING.modulesLayout.sidebar;
		            var _htmlArr = [];
		            var _htmlStrs = '';
		            $.each(sidebarItems, function(index, val) {
		            	var _htmlStr = '';
		            	_htmlStr += '<a ' + val.directive + ' ng-if="'+ (val.module || val.type == "self") +'"  href="#" data-type="'+ val.type +'" data-url="'+ val.jumpUrl +'" class="'+val.class+'" title="'+val.title+'">'+val.title;
		            		_htmlStr += '<img class="show" src="'+ val.icoDefaultUrl +'">';
		            		_htmlStr += '<img class="hide" src="'+ val.icoSelectUrl +'">';
		            	if(val.items){
		            		_htmlStr += '<i class="'+ val.items.class +'" ng-show="' + val.items.isShow + '" title="'+ val.items.title +'">';
		            			if(val.class == 'btn-chat'){
		            				_htmlStr += '{{unreadMessage > 99 ? "..." : unreadMessage}}';
		            			}
		            		_htmlStr += '</i>';
		            	}
		            	_htmlStr += '</a>';

		            	_htmlArr[val.sequence] = _htmlStr;
		            });

		            //排序
		           	$.each(_htmlArr, function(index, val) {
		           		_htmlStrs += val;
		           	});

		            //通过$compile动态编译html
					var template = angular.element(_htmlStrs);
					var sidebarElement = $compile(template)($scope);
					angular.element(".convbtns").append(sidebarElement);

					setTimeout(function(){
						var tempHash = $location.url();
						angular.element(".convbtns a[data-url='"+ tempHash +"']").addClass('current');
					}, 50);

					$("body").removeClass('is-self');

					$('.sidebar').click(function(){
						SlideWindow.hide();
					});

					$('.sidebar').dblclick(function(e){
						if(e.target.localName == 'a' || e.target.localName == 'img') return;
						var gui = require('nw.gui');
                    	var win = gui.Window.get();
                    	win.minimize();
					});

					if(Storage.hotKey('window')){
						HotkeyBinder.bindHotkey(Storage.hotKey('window'),'activateWindow');
					}

					if(Storage.hotKey('screenShot')){
						HotkeyBinder.bindHotkey(Storage.hotKey('screenShot'),'screenShot');
					}
			    }
			]
		}
	}])
	/*
	 * 聊天按钮
	 */
	.directive('btnChat', ['$rootScope', '$location', '$route', 'GLOBAL_SETTING','AppRootBinder','ContactBinder',
		function($rootScope, $location, $route, GLOBAL_SETTING,AppRootBinder, ContactBinder) {
			return {
				restrict:'A',
				controller: ['$scope',
					function($scope) {
						$scope.convs_title = GLOBAL_SETTING.conversations_title; 
					}
				],
				link: function postLink(scope, element, attrs) {
					element.bind('click', function(e) {
						e.preventDefault();
						//重新激活窗口，可以触发数字的自动消除
						AppRootBinder.winFocused(true,true); 
						ContactBinder.destroy();
						$rootScope.$apply(function() {
							$location.path('/main');
							if($('.self-iframe')){
								$('.self-iframe').remove();
								// $('.btn-chat .hide').show();
								// $('.search-input').show();
								// $('.btn-new-conv').show();
								// $('.conv-info-box').show();
								// $('.ng-pristine >nav').show();
								$('.sidebar nav a').removeClass('current');
								$("body").removeClass('is-self');
								$('.btn-chat').addClass('current');
							}
						});
					});
				}
			}
		}
	])
	/*
	 * 通讯录按钮
	 */
	.directive('btnContacts', ['$rootScope', '$location', 'ConversationBinder', function($rootScope, $location, ConversationBinder) {
		return {
			restrict:'A',
			link: function postLink(scope, element, attrs) {
				element.bind('click', function(e) {
					e.preventDefault();

					//如果对话锁定，不跳转(比如正在上传附件)
					if (ConversationBinder.locked) return;

					$rootScope.$apply(function() {
						$location.path('/contacts');
						if($('.self-iframe')){
								$('.self-iframe').remove();
								// $('.btn-contact .hide').show();
								// $('.search-input').hide();
								// $('.btn-new-conv').hide();
								$('.btn-self').removeClass('current');
								$("body").removeClass('is-self');
								element.addClass('current');
							}
					});
				});
			}
		}
	}])
	/*
	 * 树形通讯录按钮
	 */
	.directive('btnTreeContacts', ['$rootScope', '$location', 'ConversationBinder', function($rootScope, $location, ConversationBinder) {
		return {
			restrict:'A',
			link: function postLink(scope, element, attrs) {
				element.bind('click', function(e) {
					e.preventDefault();

					//如果对话锁定，不跳转(比如正在上传附件)
					if (ConversationBinder.locked) return;

					$rootScope.$apply(function() {
						$location.path('/tree-contacts');
						if($('.self-iframe')){
								$('.self-iframe').remove();
								$('.btn-self').removeClass('current');
								$("body").removeClass('is-self');
								element.addClass('current');
							}
					});
				});
			}
		}
	}])
	/*
	 * 应用中心按钮
	 */
	.directive('btnAppCentre', ['$rootScope', '$location', 'ConversationBinder', function($rootScope, $location, ConversationBinder) {
		return {
			restrict:'A',
			link: function postLink(scope, element, attrs) {
				element.bind('click', function(e) {
					e.preventDefault();

					//如果对话锁定，不跳转(比如正在上传附件)
					if (ConversationBinder.locked) return;

					$rootScope.$apply(function() {
						$location.path('/app-centre');
						if($('.self-iframe')){
								$('.self-iframe').remove();
								// $('.btn-app-center .hide').show();
								// $('.search-input').hide();
								// $('.btn-new-conv').hide();
								$('.btn-self').removeClass('current');
								$("body").removeClass('is-self');
								element.addClass('current');
						}
					});
				});
			}
		}
	}])
	/*
	 * 工作圈按钮
	 */
	.directive('btnCircle', ['$rootScope', '$location', 'ConversationBinder', function($rootScope, $location, ConversationBinder) {
		return {
			restrict:'A',
			link: function postLink(scope, element, attrs) {
				element.bind('click', function(e) {
					e.preventDefault();

					//如果对话锁定，不跳转(比如正在上传附件)
					if (ConversationBinder.locked) return;

					$rootScope.$apply(function() {
						$location.path('/work-circle');
						if($('.self-iframe')){
								$('.self-iframe').remove();
								// $('.btn-circle .hide').show();
								// $('.search-input').hide();
								// $('.btn-new-conv').hide();
								$('.btn-self').removeClass('current');
								$("body").removeClass('is-self');
								element.addClass('current');
							}
					});
				});
			}
		}
	}])
	/*
	 * 文件按钮
	 */
	.directive('btnFiles', ['$rootScope', '$location', 'ConversationBinder', function($rootScope, $location, ConversationBinder) {
		return {
			restrict:'A',
			link: function postLink(scope, element, attrs) {
				element.bind('click', function(e) {
					e.preventDefault();

					//如果对话锁定，不跳转(比如正在上传附件)
					if (ConversationBinder.locked) return;

					$rootScope.$apply(function() {
						$location.path('/files');
						if($('.self-iframe')){
								$('.self-iframe').remove();
								// $('.btn-files .hide').show();
								// $('.search-input').hide();
								// $('.btn-new-conv').hide();
								$('.btn-self').removeClass('current');
								$("body").removeClass('is-self');
								element.addClass('current');
							}
					});
				});
			}
		}
	}])
	/*
	 * 收藏按钮
	 */
	.directive('btnCollection', ['$rootScope', '$location', 'ConversationBinder', function($rootScope, $location, ConversationBinder) {
		return {
			restrict:'A',
			link: function postLink(scope, element, attrs) {
				element.bind('click', function(e) {
					e.preventDefault();

					//如果对话锁定，不跳转(比如正在上传附件)
					if (ConversationBinder.locked) return;

					$rootScope.$apply(function() {
						$location.path('/collection');
						if($('.self-iframe')){
								$('.self-iframe').remove();
								$('.btn-self').removeClass('current');
								$("body").removeClass('is-self');
								element.addClass('current');
						}
					});
				});
			}
		}
	}])
	/*
	 *	自定义按钮
	 */
	.directive('btnSelf', ['$rootScope', '$location', 'ConversationBinder', function($rootScope, $location, ConversationBinder) {
		return {
			restrict:'A',
			link: function postLink(scope, element, attrs) {
				element.bind('click', function(e) {
					e.preventDefault();

					var jumpUrl = element.data('url');
					element.parent().find('.current').removeClass('current');
					element.addClass('current');
					var iframe = '<iframe class="self-iframe" width=100% height=100% src='+jumpUrl+' style="position:absolute;left:70px"></iframe>'
					$(".main-wrap").append(iframe);
					$("body").addClass('is-self');
				});
			}
		}
	}])