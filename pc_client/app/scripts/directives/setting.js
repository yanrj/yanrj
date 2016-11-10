'use strict';

angular.module('mxWebClientApp')

.directive('btnSetting', ['SettingBinder', 'CheckAppVersion',
    function(SettingBinder, CheckAppVersion) {
        return {
            restrict: 'A',
            controller: [
                function() {}
            ],
            link: function(scope, ele, attrs) {

                ele.bind('click', function(e) {
                    e.preventDefault();

                    //检查版本更新
                    CheckAppVersion(1);

                    //用户信息弹窗
                    $.magnificPopup.open({
                        items: {
                            src: '#setting',
                            type: 'inline'
                        },
                        verticalFit: true,
                        callbacks: {
                            open: function() {
                                SettingBinder.init();
                            },
                            close: function() {
                                SettingBinder.saveSetting();
                                //点击关闭按钮后按下enter不弹出设置弹窗
                                setTimeout(function() {
                                    //如果是群聊或者单聊的时候，聚焦在textarea上,否则失去焦点
                                    if(scope.$parent.showPublisher){
                                        $('.conversation-wrap .input-box textarea').focus();
                                    }else{
                                        $('.btn-setting').blur();
                                    }
                                }, 4);
                            }
                        }
                    });
                });
            }
        }
    }
])

.directive('setting', ['Storage', '$injector', 'SettingBinder', 'GLOBAL_SETTING', 'Startup', 'Utils','$translate',
    function(Storage, $injector, SettingBinder, GLOBAL_SETTING, Startup, Utils, $translate) {
        return {
            restrict: 'A',
            template: '<form class="setting-box">\
                            <p class="setting-title">设置</p>\
                            <ul>\
                                <li><b>消息提醒: </b><label for="notiSetting"><input type="checkbox" ng-model="notification" id="notiSetting" />接收新消息提醒</label></li>\
                                <li ng-show="isMac || isWindows"><b>开机启动: </b><label for="startupSetting"><input type="checkbox" ng-model="startup" id="startupSetting" />开机时自动启动</label></li>\
                                <li><b>发送消息: </b><label for="disableEnterSendSetting"><input type="checkbox" ng-model="disableEnterSend" id="disableEnterSendSetting" />使用{{sendMsgKeyLabel}}</label></li>\
                                <li class="hotkey"><hotkey></hotkey></li>\
                                <li><b>版本信息: </b><span>{{version}}</span><i ng-show = "newVersion">new</i><a href="#" ng-show = "newVersion">软件升级</a></li>\
                            </ul>\
                            <div class="setting-footer">\
                                <div id="setting-close" class="setting-close-btn">确定</div>\
                            </div>\
                        </form>',
            controller: ['$scope',
                function($scope) {
                    $injector.invoke(SettingBinder.bind, this, {
                        $scope: $scope
                    });

                    //国际化切换组件元素
                    // <li><b>{{"view.sidebar.setting.setting_select_language" | translate}}: </b><select ng-init="language = languages[0]" ng-options="option.name for option in languages" ng-model="language"  ng-change="switching(language)">\
                    //                 </select></li>\

                    //开机启动设置
                    $scope.lastStartup = $scope.startup = false;

                    //判断运行环境，如果是windows，会显示"开机启动"选项
                    $scope.isWindows = Utils.isWindows();
                    $scope.isMac = Utils.isMac();

                    //新消息提醒设置
                    $scope.notification = $scope.setting.notification;
                    $scope.disableEnterSend = $scope.setting.disableEnterSend;
                    //显示当前版本
                    $scope.version = GLOBAL_SETTING.version;
                    $scope.sendMsgKeyLabel = (Utils.isMac() ? "⌘" : "Ctrl") + "+Enter"
                        //接收广播，显示更新，传更新信息info
                    $scope.$on('updateVersion', function(e, info) {
                        //newVersion返回为真，显示更新元素
                        $scope.newVersion = true;
                        $scope.updateUrl = info.upgrade_url;
                    });
                    //国际化复选框的选项初始化
                    // $scope.languages = [
                    //     {value: 'ch', name: '简体中文'},
                    //     {value: 'en', name: 'English'}
                    // ];
                    $('#setting-close').click(function(event){
                        $.magnificPopup.close();
                    });
                }
            ],
            link: function(scope, ele, attrs) {
                //获取广播 更新事件，取得更新信息
                var button = ele.find('a');
                button.bind('click', function(e) {
                    e.preventDefault();
                    if (scope.newVersion) {
                        var gui = require('nw.gui');
                        var win = gui.Window.get();
                        //用系统默认浏览器打开下载地址，且点击后关闭窗口
                        gui.Shell.openExternal(scope.updateUrl);
                        win.close();
                    }

                });

                //切换语言方法
                //scope.switching = function(lang){
                    //$translate.use(lang.value);
                    // window.localStorage.lang = lang.value;
                    //window.location.reload();
                    // $translate(['alert_succ','setting_select_language.a']).then(function (e) {
                    //     console.info(e);
                    // });
                //};


            }
        }
    }
])