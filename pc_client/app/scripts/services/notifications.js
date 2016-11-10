'use strict';
angular.module('mx.services.notifications', [])

.factory('NotificationsServ', ['GLOBAL_SETTING','emotionsServ', 'ConversationBinder', 'Storage', 'Cache','Utils','$rootScope',
    function(GLOBAL_SETTING, emotionsServ,ConversationBinder, Storage, Cache,Utils,$rootScope) {
        var URL = GLOBAL_SETTING.URL;

        //储存当前对话数据，以便点击"查看消息"时触发打开对应对话
        var currentData = null;

        var gui = require('nw.gui');
        var win = gui.Window.get();

        //激活客户端窗口
        var focusWin = function() {
            win.show();
            win.focus();
        };

        //显示新消息提示
        var show = function(options) {
            console.log('============ show notification ============');
            // window.DEA.notifications.create(options, function(target) {
            //   //console.log(target);

            //   // Possible Events
            //   switch (target) {
            //     case 'closer':
            //       console.log('closer');
            //       break;
            //     case 'title':
            //       break;
            //     case 'description':
            //       break;
            //     case 'icons':
            //       break;
            //     case 'gallery-image':
            //       break;
            //     case 'gallery-image title':
            //       break;
            //     case 'button primary':
            //       //console.log('.button.primary');
            //       if (options.triggerConv) {
            //         ConversationBinder.trigger(currentData);
            //       }
            //       focusWin();
            //       break;
            //     case 'button secondary':
            //       break;
            //     default:
            //       break;
            //   }
            // });



            var notification = new Notification(options.title, {
                icon: options.iconUrl,
                body: options.message
            });
            notification.onclick = function() {
                if (options.triggerConv) {
                    ConversationBinder.trigger(currentData);
                    focusWin();
                }
            }

            notification.onshow = function() {
                // auto close after 1 second
                setTimeout(function() {
                    notification.close();
                }, 3000);
            }

        };

        /*var getUserName = function(uid) {
      var userName = '';

      refs.some(function(ele) {
        if (ele.id === uid) {
          userName = ele.name;
          return true;
        }
        return false;
      });

      return userName;
    };*/

        //根据消息类型返回字符串
        var typeStr = function(type) {
            var t = '';

            switch (type) {
                case 'image':
                    t = '[图片]';
                    break;
                case 'voice_file':
                    t = '[语音]';
                    break;
                case 'doc':
                    t = '[文档]';
                    break;
                case 'video':
                    t = '[视频]';
                    break;
                case 'audio':
                    t = '[音频]';
                    break;
                case 'txt':
                    t = '[文本]';
                    break;
                case 'unknown':
                    t = '[文件]';
                    break;
                case 'rich_content_message':
                    t = '[图文消息]';
                    break;
                case 'share_link':
                    t = '[分享链接]';
                    break;
                case 'p2p_file':
                    t = '[文件]';
                    break;
                case 'custom':
                    t = '当前版本暂不支持查看此消息，请在手机上查看。';
                    break;
                case 'plugin_message':
                    t = '当前版本暂不支持查看此消息，请在手机上查看。';
                    break;
                default:
                    t = '[' + type + ']';
            }
            return t;
        };

        return function(item) {
            //var item = data.items[0];
            //var refs = data.references;
            var headUrl = URL + item.avatar_url;
            var message = item.last_message;
            if(message){
                
                var body = Utils.unescape(message.body);
                var type = message.message_type;
                var multi = item.is_multi_user;
                var title = item.name?item.name:'';
                var senderId = message.sender_id;
                //var senderName = getUserName(senderId);
                var senderName = Cache.get('user_' + senderId) ? Cache.get('user_' + senderId).name : '';
                var selfId = Storage.getUser('id');
                var conv=Cache.get('conversation_'+item.id);
                //如果是自己发的消息,或者当前会话设置静音了，就不弹消息
                if (selfId === senderId||!conv.remind || conv.conv_remind===false) {
                    return;
                }

                $rootScope.$emit('playNotificationVoice');


                //如果已有自定义对话名，则把消息发送者名加入标题
                if (title) {
                    title = senderName + ' - [' + title + ']';
                }

                //如果是群聊又没有自定义名，也要加入发送者名
                if (multi && !title) {
                    title = senderName + ' - [群聊]';
                }

                //单聊且没有自定义名的就不加发送者名了，因为本身对话名就是用户名
                if (!title && !multi) {
                    title = senderName;
                }

                if (/text_message|system_message|notification|rich_content_message|notice_message/.test(type)) {
                    body = emotionsServ.emotionsToName(body);
                } else {
                    body = typeStr(type);
                }

                var options = {
                    type: 'text',
                    title: title,
                    message: body,
                    iconUrl: headUrl,
                    buttonPrimary: '查看消息',
                    triggerConv: true
                        //buttonSecondary: '其他操作'
                };

                //p2p文件不触发对话
                if (type === 'p2p_file') {
                    options.triggerConv = false;
                }

                show(options);

                currentData = item;
            }
        };
    }
])