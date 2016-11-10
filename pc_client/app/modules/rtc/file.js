'use strict';
angular.module('mx.rtc')

/**
 * 接收p2p文件构造函数，返回文件发送实例对象
 */
.factory('P2PFileReceiver', ['UserLoaderServ', 'TipsPopBinder', 'RealtimeMsgHandler', 'ConversationBinder',
    'FileSaverBinder', 'CurUserDB', 'NotificationsServ', 'NewMsgFlashBinder', 'SidebarNavBinder',
    'SettingBinder', 'Cache',
    function(UserLoaderServ, TipsPopBinder, RealtimeMsgHandler, ConversationBinder, FileSaverBinder,
        CurUserDB, NotificationsServ, NewMsgFlashBinder, SidebarNavBinder, SettingBinder, Cache) {
        var o = {};
        //保存弹窗对象
        var popWin = {};
        //存储其他用户推送过来的p2p文件消息数据
        var fileReceiverList = {};
        //依赖node.js的fs模块，用来保存接收的文件
        var fs = require('fs');

        //初始化文件接收器
        o.init = function() {
            easyrtc_ft.buildFileReceiver(acceptRejectCB, fileAcceptor, receiveStatusCB);
        };

        /**
         * 接收到P2P文件传输消息数据
         * @param options[Object]: 配置项
         *          .rtcid[String]: RTC用户id标示
         *          .fileMsgData[Object]: 文件消息数据
         */
        o.newFile = function(options) {
            var rtcid = options.rtcid;
            var fileMsgData = options.fileMsgData;
            var msg = fileMsgData.items[0];
            var receiverId = rtcid + '_' + msg.name;
            var refs = fileMsgData.references;
            var defNmaeIndex = '';

            $.each(refs, function(index, val) {
                 if(val.default_name) {
                    defNmaeIndex = index;
                 }
                 if(val.id == msg.sender_id){
                    refs[defNmaeIndex].default_name = val.name;
                 }
            });


            //先将消息数据存入数据集合，等用户接受传送后，找到对应的数据，并推送到界面
            fileReceiverList[receiverId] = {
                msg: fileMsgData, //消息数据{items:[], references:[]}
                status: 'waiting', //文件传输状态
                progress: 0, //文件传输进度
                realtimePushed: false, //文件消息是否已推送到对话界面
                onStateChange: function(status) {

                }
            };
            //点对点文件传输，都是对方模拟的conversation，所以需要优先从本地缓存读取，如果没有缓存，才需要保存到数据库
            var convData = angular.copy(_.findWhere(refs, {
                type: 'conversation'
            }));
            var cacheConvData=Cache.get("conversation_"+convData.id);
            if(cacheConvData){
              //优先使用cache的会话
              convData=cacheConvData;
            }
            //新消息到达后也会保存cache，所以不用在这个地方保存，暂时移除掉
            // for (var i = 0, len = refs.length; i < len; i++) {
            //   if (refs[i].type === 'conversation') {
            //     convData = angular.copy(refs[i]);
            //   }
            //   //缓存refs里的数据
            //   Cache.put(refs[i].type + '_' + refs[i].id, refs[i]);
            // }
            CurUserDB.saveReferences(refs).then(function() {
                return CurUserDB.saveConvList([convData]);
            }).then(function() {
                var setting = SettingBinder.getSetting();

                //消息提醒弹窗
                if (setting.notification) {
                    NotificationsServ(convData);
                }
                //接收新消息时，任务栏小图标闪动
                NewMsgFlashBinder.init(convData);
                //闪动大图标
                SidebarNavBinder.iconAttention();
            })

        };

        /**
         * 获取文件传输状态
         * @param senderId[Number]: 发送方用户id
         * @param fileName[String]: 文件名
         */
        o.getFileState = function(senderId, fileName) {
            var rtcid = easyrtc.usernameToIds(String(senderId))[0];
            if (!rtcid) return false;

            var receiverId = rtcid + '_' + fileName;
            var receiver = fileReceiverList[receiverId];

            if (!receiver) return false;

            return {
                status: receiver.status,
                progress: receiver.progress
            };
        };

        /**
         * 设置文件传输状态
         * @param senderId[Number]: 发送方用户id
         * @param fileName[String]: 文件名
         * @param status[String]: 文件传输状态
         */
        o.setFileState = function(senderId, fileName, status) {
            var rtcid = easyrtc.usernameToIds(String(senderId))[0];
            if (!rtcid) return false;

            var receiverId = rtcid + '_' + fileName;
            var receiver = fileReceiverList[receiverId];

            if (!receiver) return false;

            //执行之前保存的状态变动回调函数
            receiver.onStateChange(status);
        };

        //关闭点对点文件弹窗
        o.closePopWin = function(otherGuy) {
            if (!popWin[otherGuy]) return;
            popWin[otherGuy].close();
        };

        //接收到文件传送请求时的处理逻辑
        function acceptRejectCB(otherGuy, fileNameList, wasAccepted) {
            var userId = easyrtc.idToName(otherGuy);
            var fileName = fileNameList[0].name;

            //获取用户姓名
            UserLoaderServ.getUser(userId)
                .then(function(data) {
                    //弹窗提示
                    popWin[otherGuy] = TipsPopBinder.show({
                        body: data.name + '向您发送文件"' + fileName + '"，是否接收？',
                        title: '文件发送请求',
                        showCancel: true,
                        showConfirm: true,
                        confirmTxt: '接收',
                        cancelTxt: '拒绝',
                        confirmed: function() {
                            wasAccepted(true);
                            //acceptFile(otherGuy, fileNameList);
                            popWin[otherGuy] = null;
                        },
                        canceled: function() {
                            wasAccepted(false);
                            popWin[otherGuy] = null;
                        }
                    });
                });
        }

        /**
         * 接收文件流处理
         */
        function fileAcceptor(otherGuy, fileData, filename) {
            var receiverId = otherGuy + '_' + filename;
            var receiver = fileReceiverList[receiverId];
            var msgData = receiver ? receiver.msg : null;
            var msgId = msgData ? msgData.items[0].id : null;
            //如果获取到了接收文件对象，保存状态
            if (receiver) {
                receiver.status = 'done';
                receiver.progress = 100;
            }

            //如果获取到了消息id，更新文件消息状态
            if (msgId) {
                updateFileState(msgData, {
                    status: 'done',
                    name: filename
                });
            }

            //将文件数据转换为标准可存储的Buffer数据
            var buffer = new Buffer(msgData.items[0].size);
            var x = 0,
                i = 0;
            while (i < fileData.length) {
                for (var j = 0, len = fileData[i].length; j < len; j++) {
                    buffer[x] = fileData[i][j];
                    x++;
                }
                i++
            }

            //保存文件，直接选目录保存，无法获取用户保存的目录，暂时弃用
            /* ==== 注意 ====
             * 由于使用node保存文件，需要文件的buffer数据
             * 所以修改了vendors/easyrtc/easyrtc_ft.js中返回数据的格式(line 461)
             * 如果还要使用下面这句方法保存文件，请到上面所示的文件中改回数据类型
             */
            //easyrtc_ft.saveAs(blob, filename);

            //调用NW弹窗获取用户选择的保存目录
            FileSaverBinder.getFileDirectory()
                .then(function(path) {
                    console.info('要保存到这个目录', path);

                    fs.writeFile(path + '/' + filename, buffer, function(err) {
                        if (err) console.error(err);
                        else
                            console.info('保存文件成功');

                        //更新文件消息的状态
                        updateFileState(msgData, {
                            status: 'saved',
                            path: path
                        });
                    });
                });
        }

        //确认接收p2p文件后的操作逻辑
        /*function acceptFile(otherGuy, fileNameList) {
          var receiverId = otherGuy + '_' + fileNameList[0].name;

          fileReceiverList[receiverId] = {}

          //var msgData = fileMsgs[msgId];
          console.info('确认接收p2p文件', msgData);
          //推送消息到界面
          //RealtimeMsgHandler(msgData);
        }*/

        //接受文件进度
        var receiveProgress = 0;
        //上一次更新传输状态的时间
        var lastWorkingStateTime;
        //每次更新传输进度的时间间隔
        var workingTimerStep = 1000;
        //传输进度处理
        function working(state, receiver) {
            var workingTime = new Date().getTime();

            //如果没达到时间间隔，不作处理
            if (lastWorkingStateTime && workingTime - lastWorkingStateTime < workingTimerStep) return;

            var msgData = receiver ? receiver.msg : null;
            var msgId = msgData ? msgData.items[0].id : null;

            //更新进度
            receiveProgress = parseInt(state.received / state.size * 100);
            state.progress = receiveProgress;

            receiver.status = 'progress';
            receiver.progress = receiveProgress;

            //更新文件消息的状态
            updateFileState(msgData, state);
            //FileUploaderBinder.progress(receiveProgress);
            //console.info('接收进度' + state.name + ':', receiveProgress);

            //记录当前时间点
            lastWorkingStateTime = workingTime;
        }
        //接收文件状态
        function receiveStatusCB(otherGuy, state) {
            var receiverId = otherGuy + '_' + state.name;
            var receiver = fileReceiverList[receiverId];
            var msgData = receiver ? receiver.msg : null;
            var msgId = msgData ? msgData.items[0].id : null;

            switch (state.status) {
                case "started":
                    console.info('接收文件状态: started');
                    //FileUploaderBinder.uploadStatus(true);
                    break;
                case "eof":
                    console.info('接收文件状态: Finished file');
                    break;
                case "done":
                    console.info('接收文件状态: Stopped because ' + state.reason);
                    //由于done的时候receiver已经不存在，所以要单独执行下面这句
                    updateFileState(msgData, state);
                    break;
                case "started_file":
                    console.info('接收文件状态: started_file', state);
                    //s.status = 'started';
                    break;
                case "progress":
                    //如果当前状态是正在传输，则更新进度
                    working(state, receiver);
                    break;
                default:
                    console.info("strange file receive cb message = ", JSON.stringify(state));
            }

            if (!receiver) return true;

            //如果还未推送消息数据到界面，则推送，并标记
            if (!receiver.realtimePushed && msgData) {
                RealtimeMsgHandler(msgData);
                receiver.realtimePushed = true;
            }

            if (state.status !== 'progress') {
                //标记文件状态
                receiver.status = status;
                //更新文件消息的状态
                if (msgId) updateFileState(msgData, state);
            }

            return true;
        }

        /**
         * 更新文件传输状态
         */
        function updateFileState(msgData, state) {
            if (!msgData) return;
            var msg = msgData.items[0];
            if (!msg) return;
            var msgId = msg.id;

            ConversationBinder.updateP2PFileState(msgId, state);

            msg.state = state;
            //更新数据库中对应的msg数据
            CurUserDB.saveMessages([msg]);
        }

        return o;
    }
])

/**
 * 发送p2p文件构造函数，返回文件发送实例对象
 */
.factory('P2PFileSender', ['RTC', 'ConversationBinder', 'TipsPopBinder', 'PopMessage', 'RealtimeMsgHandler',
    'NewFileMessage', 'CurUserDB', 'PublisherBinder',
    function(RTC, ConversationBinder, TipsPopBinder, PopMessage, RealtimeMsgHandler, NewFileMessage,
        CurUserDB, PublisherBinder) {
        var fileSenderList = {};
        var popWin = {};
        var o = {};

        /**
         * @param options[Object]: 配置
         *          .file[file object]: 要传输的文件对象
         *          .targetId[Number]: 接收方用户id
         *          .offlineCB[Function]: 转离线发送回调
         */
        o.newFile = function(options) {
            var targetId = options.targetId;
            var file = options.file;
            var offlineCB = options.offlineCB;
            //创建p2p文件消息数据
            var fileMsgData = NewFileMessage({
                direct_to_user_id: targetId,
                name: file.name,
                size: file.size
            });
            fileMsgData.references[0].default_name
            var msg = fileMsgData.items[0];
            var msgId = msg.id;
            file.msg_id = msgId;
            //console.info('file 信息', file);

            var p2pSender = RTC.sendFile([targetId], file, sendProcessHandler, fileMsgData);

            //如果无法发送p2p文件，返回错误
            if (!p2pSender) {
                offlineCB();
                return;
            }

            //把文件传送的详细信息存入公共对象
            fileSenderList[msgId] = {
                msg: fileMsgData,
                status: 'waiting',
                progress: 0,
                onStateChange: stateChangedCB
            }

            //获取对方的rtc id
            var rtcId = RTC.checkUser(targetId);
            //弹窗提示用户
            popWin[rtcId] = TipsPopBinder.show({
                body: '等待对方响应...',
                title: '文件发送请求',
                showCancel: true,
                showConfirm: true,
                confirmTxt: '离线发送',
                cancelTxt: '取消发送',
                confirmed: function() {
                    //向服务器上传文件
                    offlineCB();
                    //同时取消会导致离线上传失败
                    setTimeout(function() {
                        RTC.cancelFile(targetId);
                    }, 800);

                    //更新文件状态为"已取消"
                    updateFileState(fileMsgData, {
                        status: 'offline'
                    });

                    popWin[rtcId] = null;
                    return;
                },
                canceled: function() {
                    RTC.cancelFile(targetId);

                    //更新文件状态为"已取消"
                    updateFileState(fileMsgData, {
                        status: 'cancelled'
                    });

                    popWin[rtcId] = null;
                }
            });

            //上一次更新传输状态的时间
            var lastWorkingStateTime;
            //每次更新传输进度的时间间隔
            var workingTimerStep = 1000;
            //传输进度处理
            function working(state) {
                var workingTime = new Date().getTime();

                //如果没达到时间间隔，不作处理
                if (lastWorkingStateTime && workingTime - lastWorkingStateTime < workingTimerStep) return;

                var s = {
                    status: 'progress',
                    progress: 0
                };
                s.progress = parseInt(state.position / state.size * 100);
                //标记文件状态为统一字符
                fileSenderList[msgId].status = 'progress';
                //更新文件消息的状态
                updateFileState(fileSenderList[msgId].msg, s);

                //记录当前时间点
                lastWorkingStateTime = workingTime;
            }

            //控制传输进程
            function sendProcessHandler(state) {
                var status = state.status;

                switch (status) {
                    case 'waiting':
                        //推送消息到界面
                        RealtimeMsgHandler(fileMsgData);

                        break;
                    case 'started_file':
                        TipsPopBinder.hide();
                        break;
                    case 'working':
                        working(state);
                        break;
                    case 'rejected':
                        PopMessage.tip({
                            msg: '对方拒绝接收文件',
                            type: 1
                        });
                        TipsPopBinder.hide();
                        //清除文件选择input的value
                        PublisherBinder.clearFileInputValue();
                        break;
                    case 'done':
                        TipsPopBinder.hide();

                        //清除文件选择input的value
                        PublisherBinder.clearFileInputValue();
                        break;
                }

                //非传输状态时标记状态，并更新状态到消息元素
                if (status !== 'working') {
                    //标记文件状态
                    fileSenderList[msgId].status = status;
                    //更新文件消息的状态
                    updateFileState(fileSenderList[msgId].msg, state);
                }

                return true;
            }

            //用户主动修改文件传输状态(如点击"取消")
            function stateChangedCB(status) {

            }
        };

        /**
         * 获取文件传输状态
         * @param msgId[Number]: 文件消息id
         */
        o.getFileState = function(msgId) {
            var sender = fileSenderList[msgId];
            if (!sender) return false;

            return {
                status: sender.status,
                progress: sender.progress
            };
        };

        /**
         * 设置文件传输状态
         * @param msgId[Number]: 文件消息id
         * @param status[String]: 文件传输状态
         */
        o.setFileState = function(msgId, status) {
            var sender = fileSenderList[msgId];
            if (!sender) return;

            //执行之前保存的状态变动回调函数
            sender.onStateChange(status);
        };

        //关闭点对点文件弹窗
        o.closePopWin = function(otherGuy) {
            if (!popWin[otherGuy]) return;
            popWin[otherGuy].close();
        };

        /**
         * 更新文件传输状态
         */
        function updateFileState(msgData, state) {
            if (!msgData) return;
            var msg = msgData.items[0];
            if (!msg) return;
            var msgId = msg.id;
            var convId = msg.conversation_id;

            if (state.status === 'offline') {
                //如果是转为离线发送，删除之前存储的p2p消息
                CurUserDB.removeMsg(msgId);
                ConversationBinder.removeMsg(msgId);
                return;
            }

            ConversationBinder.updateP2PFileState(msgId, state);

            //更新状态
            fileSenderList[msgId].status = state.status;

            msg.state = state;

            // if (convId) {
            //更新数据库中对应的msg数据
            CurUserDB.saveMessages([msg]);
            // }
        }

        return o;
    }
])