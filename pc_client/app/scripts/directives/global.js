'use strict';

angular.module('mxWebClientApp')

//剪贴板图片粘贴
.directive('uploadImagePreview', ['FileUploaderBinder', '$location', '$injector', 'UploadImagePreviewBinder',
	function(FileUploaderBinder, $location, $injector, UploadImagePreviewBinder) {
		return {
			restrict: 'A',
			template: 	'<div class="wrap">\
							<p>\
								<img ng-src="{{imgUrl}}" />\
							</p>\
							<div class="btns">\
								<button class="cancel">取消</button>\
								<button class="submit">发送</button>\
							</div>\
						</div>',
			controller: ['$scope',
				function($scope) {
					$injector.invoke(UploadImagePreviewBinder.bind, this, {
						$scope: $scope
					});

					this.show = function(file) {
						$scope.file = file;
		                $scope.imgUrl = file.base64;

						$.magnificPopup.open({
							items: {
								src: '#uploadImagePreview',
								type: 'inline'
							},
							verticalFit: true,
							modal: true,
							callbacks: {
								close: function() {
								}
							}
						});

						//监听回车键发送
						$('body').bind('keyup.enterSend', function(e) {
							switch(e.keyCode){
								case  13:
									UploadImagePreviewBinder.submit();
									$scope.close();
									break;
								case  27:
									$scope.close();
									break;
								default:
									break;
							}
						});
					};

					$scope.clear = function() {
						$scope.imgUrl = '';
					};

					$scope.close = function() {
						$('body').unbind('keyup.enterSend');
						$.magnificPopup.close();
					};
				}
			],
			link: function(scope, ele, attrs) {
				var btnCancel = ele.find('button.cancel');
				var btnSubmit = ele.find('button.submit');

				//取消
				btnCancel.bind('click', function(e) {
					scope.close();
				});

				//发送
				btnSubmit.bind('click', function(e) {
					UploadImagePreviewBinder.submit();
					scope.close();
				});
			}
		}
	}
])

//拖拽文件控制容器
.directive('dropWrap', ['FileUploaderBinder', '$location', 'ConversationBinder', '$timeout',
	function(FileUploaderBinder, $location, ConversationBinder, $timeout) {
		return {
			restrict:'A',
			controller: ['$scope',
				function($scope) {
					$scope.dropTipTxt = '请将文件拖放到这里';
				}
			],
			link: function(scope, ele, attrs) {
				var eDropWrap = ele[0];
				var eDropPanel = $('.file-drop-penel')[0];
				var dragover = false;
				var closeTimer;

				//取消默认拖拽事件
				window.ondragover = function(e) { e.preventDefault(); return false };
				window.ondrop = function(e) { e.preventDefault(); return false };

				eDropWrap.addEventListener('dragover', function(e) {
					if ($location.path() !== '/main') return;

					//如果拖拽的不是文件，不触发拖拽界面
					if (e.dataTransfer.types[0] !== 'Files') return false;

					//如果是基础公众号(不可以发消息),不触发
					if (ConversationBinder.isBasicOcu()) return false;

					//如果没有打开对话，不触发
					if (!ConversationBinder.getCurrentConvId()) return false;

					$.magnificPopup.close();
					ele.addClass('drag-over');

					//标记为正在拖拽行为
					dragover = true;
				}, false);

				eDropPanel.addEventListener('dragleave', function(e) {
					//var containsCode = this.compareDocumentPosition(e.target);
					//如果拖拽离开容器，将拖拽行为标记为false
					dragover = false;

					if (closeTimer) {
						$timeout.cancel(closeTimer);
						closeTimer = null;
					}

					closeTimer = $timeout(function() {
						//500毫秒后检测拖拽状态，如果依然是false，就隐藏蒙层
						if (!dragover) ele.removeClass('drag-over');
					}, 500);

					/*if (containsCode === 0) {
						ele.removeClass('drag-over');
					}*/
				}, false);

				eDropWrap.addEventListener('drop', function(e) {
					e.preventDefault();
					var eAvaliableArea = $(this).find('.available-area')[0];
					var containsCode = eAvaliableArea.compareDocumentPosition(e.target);

					if (containsCode === 0) {
						dropFiles(e.dataTransfer.files);
					}

					ele.removeClass('drag-over');
				}, false);

				eDropWrap.addEventListener('click', function(e) {
					//如果点击蒙层，就隐藏掉蒙层
					ele.removeClass('drag-over');

					//广播跟元素点击事件，方便那些需要关闭的面板自动关闭
					scope.$broadcast('wrap_clicked', e.target);
				});

				function dropFiles(files) {
					var file = files[0];
					// file.upload_type = 'normal';
					FileUploaderBinder.upload(file);
				}
			}
		}
	}
])

//提示弹窗
.directive('tipsPop', ['$injector', 'TipsPopBinder',
	function($injector, TipsPopBinder) {
		return {
			restrict: 'A',
			template: 	'<div class="wrap">\
							<h3>{{tipMsg.title}}</h3>\
							<p>{{tipMsg.body}}</p>\
							<div class="btns">\
								<button ng-show="tipMsg.showCancel" class="cancel">{{tipMsg.cancelTxt}}</button>\
								<button ng-show="tipMsg.showConfirm" class="confirm">{{tipMsg.confirmTxt}}</button>\
								<button ng-show="tipMsg.showConfirm1" class="confirm1">{{tipMsg.confirm1Txt}}</button>\
								<button ng-show="tipMsg.showEnter" class="enter">{{tipMsg.enterTxt}}</button>\
								<button ng-show="tipMsg.showUpdate" class="update">{{tipMsg.updateTxt}}</button>\
							</div>\
						</div>',
			controller: ['$scope',
				function($scope) {

					//默认不显示"取消"按钮
					$scope.showCancel = false;
					//默认显示"确定"按钮
					$scope.showConfirm = true;
					//默认不显示安装应用"确定"按钮
					$scope.showConfirm1 = false;
					//默认不显示"直接进入"按钮
					$scope.showEnter = false;
					//默认不显示"升级"按钮
					$scope.showUpdate = false;

					//默认参数
					var defaultOpt = {
						body: '',
						title: '退出登录',
						showCancel: false,
						showConfirm: true,
						showEnter: false,
						showUpdate: false,
						cancelTxt: '取 消',
						confirmTxt: '确 定',
						confirm1Txt: '确 定',
						enterTxt: '直接进入',
						updateTxt: '升 级',
						confirmed: function() {},
						canceled: function() {}
					};

					/**
					 * 显示提示弹窗
					 * @param msg[Object]: 初始化弹窗的参数
					 *			msg.body[String]: 提示信息
					 *			msg.title[String]: 提示标题
					 * 			msg.showCancel[Boolean]: 是否显示"取消"按钮
					 *			msg.showConfirm[Boolean]: 是否显示"确定"按钮
					 *			msg.confirmTxt[String]: "确定"按钮显示的文字
					 *			msg.cancelTxt[String]: "取消"按钮显示的文字
					 *			msg.enterTxt[String]: "直接进入"按钮显示的文字
					 *			msg.updateTxt[String]: "升级"按钮显示的文字
					 *			msg.confirmed[Function]: 点击"确定"回调函数
					 *			msg.canceled[Function]: 点击"取消"回调函数
					 */
					this.show = function(options) {
						if (!options) return;

						//复制默认配置，避免遮盖
						var opt = Object.create(defaultOpt);

						$scope.tipMsg = $.extend(opt, options);
					};

					//绑定服务
					$injector.invoke(TipsPopBinder.bind, this, {
						$scope: $scope
					});
				}
			],
			link: function postLink(scope, ele, attrs) {
				var btnConfirm = ele.find('.confirm');
				var btnConfirm1 = ele.find('.confirm1');
				var btnCancel = ele.find('.cancel');
				var btnEnter = ele.find('.enter');
				var btnUpdate = ele.find('.update');

				//点击确认
				btnConfirm.bind('click', function(e) {
					e.preventDefault();
					//console.log(scope.tipMsg);
					scope.tipMsg.confirmed();
					$.magnificPopup.close();
				});

				//点击确认
				btnConfirm1.bind('click', function(e) {
					e.preventDefault();
					//console.log(scope.tipMsg);
					scope.tipMsg.confirmed();
					//$.magnificPopup.close();
				});

				//点击取消
				btnCancel.bind('click', function(e) {
					e.preventDefault();

					scope.tipMsg.canceled();
					$.magnificPopup.close();
				});

				//点击直接进入
				btnEnter.bind('click', function(e) {
					e.preventDefault();
					//console.log(scope.tipMsg);
					scope.tipMsg.confirmed();
					$.magnificPopup.close();
				});

				//点击升级
				btnUpdate.bind('click', function(e) {
					e.preventDefault();

					scope.tipMsg.canceled();
					$.magnificPopup.close();
				});
			}
		}
	}
])

//重新连接按钮
.directive('btnReconnect', [
	function() {
		return {
			restrict: 'A',
			replace: true,
			template: 	'<div class="reconnect-box"><button>重新连接</button></div>',
			controller: ['$scope',
				function($scope) {
				}
			],
			link: function postLink(scope, ele, attrs) {
				//点击重连
				ele.find('button').bind('click', function(e) {
					require('nw.gui').Window.get().reload();
				});
			}
		}
	}
])

//新消息声音提醒
.directive('audioMsgNotification', [
	function() {
		return {
			restrict: 'E',
			replace: true,
			template: '<audio class="msgNotiVoice" style="display:none;" preload="auto" src="n1.mp3"></audio>',
			controller: ['$scope',
				function($scope) {
				}
			],
			link: function postLink(scope, ele, attrs) {
				scope.$root.$on('playNotificationVoice', function(e) {
					ele[0].play();
				});
			}
		}
	}
])

//保存文件input
.directive('fileSaver', ['$q', '$injector', 'FileSaverBinder',
	function($q, $injector, FileSaverBinder) {
		return {
			restrict: 'E',
			replace: true,
			template: '<input type="file" style="display:none" nwdirectory />',
			controller: ['$scope',
				function($scope) {
					$injector.invoke(FileSaverBinder.bind, this, {
						$scope: $scope
					});
				}
			],
			link: function postLink(scope, ele, attrs) {
				scope.saveFile = function() {
					var delay = $q.defer();

					//监听选择文件目录变化
					ele.bind('change', function(e) {
						//返回用户选择的目录
						delay.resolve(ele.val());

						//将input的value值设置为空
						ele.val('');
						//取消监听change事件
						ele.unbind('change');
					});

					ele.click();

					return delay.promise;
				}
			}
		}
	}
])
