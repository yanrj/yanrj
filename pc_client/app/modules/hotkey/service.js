  'use strict';

angular.module('mx.hotkey')

.factory('HotkeyBinder', ['RootscopeApply','Storage','Utils',
  function(RootscopeApply,Storage,Utils) {
    var o = {};
    var that, scope;
    var gui = require('nw.gui');
    var win = gui.Window.get();

    o.bind = function($scope) {
        that = this;
        scope = $scope;
    };

    //绑定快捷键
    o.bindHotkey = function(v,type){
        if (!v) return;
        v = v.toUpperCase();
        if(v && Utils.isMac()){
            v = v.replace('COMMAND','CTRL')
        }
        var option = {
            key: v,
            active: function() {
                if(type == 'activateWindow'){
                    //激活窗口
                    win.show();
                }else if(type == 'screenShot'){
                    //截屏
                    $(".screenshot").click();
                }
            },
            failed: function(msg) {
            // :(, fail to register the |key| or couldn't parse the |key|.
                //console.log('快捷键绑定失败',msg);
            }
        };
        var shortcut = new gui.Shortcut(option);
        gui.App.registerGlobalHotKey(shortcut);
    }

    //解绑快捷键
    o.unbindHotkey = function(v){
        var shortcut = new gui.Shortcut({key: v});
        gui.App.unregisterGlobalHotKey(shortcut);
    }

    //监听键盘
    o.keylogging = function(setInput){
        var isHotKey = '',bool = false,type='',v = '',keyVal = '',hotkey = '',rmBtn = '';
        setInput.focus(function(){
            setInput = this;
            type = $(this).data('type');
            if(type == 'activateWindow'){
                keyVal = 'window';
                hotkey = 'setActiveWin';
                rmBtn = 'showActiveWinRemove';
            }else if(type == 'screenShot'){
                keyVal = 'screenShot';
                hotkey = 'setScreenShot';
                rmBtn = 'showScreenShotRemove';
            };
        });

        //监听键盘按下事件
        setInput.keydown(function(e){
            e = e || window.event;

            var k = KeyCode;
            var key = k.translate_event(e);
            var value = k.hot_key(key);
            var defaultHotkey = "SHIFT+"; //默认快捷键组
            isHotKey = key;
            if(Utils.isMac()){
                value = value.replace('Ctrl','Command');
            }
            v = value;
            
            if(((isHotKey.code >= 48 && isHotKey.code <= 92) || (isHotKey.code >= 112 && isHotKey.code <= 123) || key.code == 16 || key.code == 17 || key.code == 18 ) && isHotKey.code != 59 && isHotKey.code != 61 && isHotKey.code != 62){
                if(key.ctrl && key.command){

                }else if((key.shift || key.ctrl || key.alt || key.command) && (key.code != 16 || key.code != 17 || key.code != 18 || key.code != 91 || key.code != 92)){
                    bool = true;
                    
                    RootscopeApply(scope, function() {
                        scope.setVal(value,bool,type);
                    });
                    
                }else if((key.shift == false || key.ctrl == false || key.alt == false || key.command == false) && (key.code != 16 || key.code != 17 || key.code != 18 || key.code != 91  || key.code != 92 )){
                    bool = true;
                    value = defaultHotkey + value;
                    v = value;
                    RootscopeApply(scope, function() {
                        scope.setVal(value,bool,type);
                    });
                }
                KeyCode.key_down(e);
                if(e.preventDefault) {
                    e.preventDefault();
                }
                return true;
            }else{
                return false;
            }
        });

        //监听键盘抬起事件
        setInput.keyup(function(e){
            if((!(isHotKey.code >= 48 && isHotKey.code <= 92) && !(isHotKey.code >= 112 && isHotKey.code <= 123)) || (isHotKey.shift || isHotKey.ctrl || isHotKey.alt || isHotKey.command) && (isHotKey.code == 16 || isHotKey.code == 17 ||  isHotKey.code == 18 || isHotKey.code == 91 || isHotKey.code == 92 || isHotKey.code == 8 || isHotKey.code == 9 || isHotKey.code == 20)){
                bool = true;
                var dbVal = Storage.hotKey(keyVal),value = '';
                if(dbVal){
                    value = Storage.hotKey(keyVal);
                }else{
                    bool = false;
                }
                RootscopeApply(scope, function() {
                    scope.setVal(value,bool,type);
                });
            }else if(((isHotKey.code >= 48 && isHotKey.code <= 92) || (isHotKey.code >= 112 && isHotKey.code <= 123) || isHotKey.code == 16 || isHotKey.code == 17 || isHotKey.code == 18 ) && isHotKey.code != 59 && isHotKey.code != 61 && isHotKey.code != 62){
                //解决设置默认shift重复保存
                if(scope.setActiveWin == scope.setScreenShot){
                    if(scope.setScreenShot == Storage.hotKey('window')){
                        if(!Storage.hotKey('screenShot')){
                            RootscopeApply(scope, function() {
                                value = '';
                                bool = false;
                                scope.setVal(value,bool,type);
                            });
                        }else{
                            RootscopeApply(scope, function() {
                                scope.setScreenShot = Storage.hotKey('screenShot');
                            });
                        }
                    }else if(scope.setActiveWin == Storage.hotKey('screenShot')){
                        if(!Storage.hotKey('window')){
                            RootscopeApply(scope, function() {
                                value = '';
                                bool = false;
                                scope.setVal(value,bool,type);
                            });
                        }else{
                            RootscopeApply(scope, function() {
                                scope.setActiveWin = Storage.hotKey('window');
                            });
                        }
                    }
                }
                //解绑
                o.unbindHotkey(Storage.hotKey(keyVal));
                //将快捷键存在本地数据库
                Storage.hotKey(keyVal,v.toUpperCase());
                v = $.trim(v);
                //绑定快捷键
                o.bindHotkey(v,type);
            }
            
        });

        //防止各种突然失去焦点情况，保证输入框内容正确
        setInput.focus(function(event) {
            RootscopeApply(scope, function() {
                if(scope[type] && Storage.hotKey(keyVal) != ''){
                  scope[type] = Storage.hotKey(keyVal);
                }
            });
        });

        setInput.blur(function(event) {
            RootscopeApply(scope, function() {
                if(scope[type] && Storage.hotKey(keyVal) != ''){
                  scope[type] = Storage.hotKey(keyVal);
                }
            });
        });

        //点击输入框取消按钮，清空输入框
        $('.inputRemove').bind('click', function(e) {
            var rmBtn = $(this).attr('ng-show');
            var input = $(this).parent().find('input');
            type = input.data('type');
            if(type == 'activateWindow'){
                keyVal = 'window';
                hotkey = 'setActiveWin';
            }else if(type == 'screenShot'){
                keyVal = 'screenShot';
                hotkey = 'setScreenShot';
            };
            RootscopeApply(scope, function() {
              input.val('');
              scope[rmBtn] = false;
              scope[hotkey] = '';
              //解绑
              o.unbindHotkey(Storage.hotKey(keyVal));
              Storage.delHotKey(keyVal);
            });
        });
    }

    return o;
  }
])