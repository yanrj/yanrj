'use strict';

angular.module('mx.rtc', [])

.provider('RTC', function() {
	//使用RTC必须在app.js中配置socket url
	var socketUrl = null;
	//自己的rtc id
	var selfRTCId = null;
	//存储文件发送的对象，按照rtc id匹配存储
	var fileSender = {};

	//在app.config中可以调用此config来配置RTC参数
	this.config = function(config) {
		socketUrl = config.socketUrl;
	};

	this.$get = ['RootscopeApply', '$q', 'TipsPopBinder', 'PopMessage', 'FileUploaderBinder', 'UserLoaderServ',
						'NewFileMessage', 'RealtimeMsgHandler', 'P2PFileReceiver', 'PublisherBinder', '$location',
		function(RootscopeApply, $q, TipsPopBinder, PopMessage, FileUploaderBinder, UserLoaderServ,
			NewFileMessage, RealtimeMsgHandler, P2PFileReceiver, PublisherBinder, $location) {

			/**
			 * @param setting[Object]: 一些初始化设置
			 *				.username: 用户名
			 */
			function init(setting) {
				if (!easyrtc) return;
				var username = setting.username;
				//将用户id设置为RTC的username，方便将用户与rtc的id匹配
				if (username) easyrtc.setUsername(username);
				//设置socket url
	    	easyrtc.setSocketUrl(socketUrl);
	    	//开启数据传输频道
				easyrtc.enableDataChannels(true);
				//关闭视频
		    easyrtc.enableVideo(false);
		    //关闭音频
		    easyrtc.enableAudio(false);
		    //当有用户连接到RTC时会执行的回调
		    easyrtc.setRoomOccupantListener(function(roomName, occupants, isPrimary) {
		    	//console.info('roomName, ', roomName);
		    	//console.info('occupants, ', occupants);
		    	//console.info('isPrimary, ', isPrimary);
		    });

		    //有连接请求时的回调
		    easyrtc.setAcceptChecker(function(easyrtcid, acceptor) {
		    	console.info('收到来自' + easyrtcid + '的连接请求，并接受此请求');
		    	//默认接受一切连接请求
		        acceptor(true);
		    });

		    //有消息推送的时候会触发
		    easyrtc.setPeerListener(recievedData);

		    //当数据频道打开并准备传输数据时，会执行此回调
		    easyrtc.setDataChannelOpenListener(function(easyrtcid, usesPeer) {
	        console.info('数据频道已开启');
		    });

		    //当数据频道关闭时执行的回调
		    easyrtc.setDataChannelCloseListener(function(easyrtcid) {
		    	console.info('数据频道已关闭', easyrtcid);
		    	easyrtc.hangup(easyrtcid);
		    	//FileUploaderBinder.cancelAll();

		    	//关闭文件消息弹窗
		    	P2PFileReceiver.closePopWin(easyrtcid);
		    	//中断后，暂时不提示信息，因为意外断开都会有这个回调， fix #6312
		    	// PopMessage.tip({
		    	// 	msg: '文件传输已被中断',
		    	// 	type: 1
		    	// });
		    });

				easyrtc.connect('mx.p2pc_connect', loginSuccess, loginFailure);
			}

			//连接RTC服务器成功
			function loginSuccess(rtcid) {
		    selfRTCId = rtcid;
		    console.info('RTC登陆成功，ID是' + rtcid);
		    P2PFileReceiver.init();
			}

			//连接RTC服务器失败
			function loginFailure(errorCode, message) {
		    console.error('RTC登陆失败', message);
		    //easyrtc.showError(errorCode, message);
			}

			//接收数据
			function recievedData(otherGuy, msgType, data) {
				//QA报的登录页面也会弹，所以这里加一道锁。
				if ($location.path() === '/login') return;

	    	console.info('收到了' + otherGuy + '发来的' + msgType, $location.path());
	    	var msg = data.items[0];
	    	var msgId = otherGuy + '_' + msg.name;

	    	//如果是P2P文件传输,新建文件接收器
	    	if (msgType === 'p2pFileMsg') {
	    		P2PFileReceiver.newFile({
	    			rtcid: otherGuy,
	    			fileMsgData: data
	    		});
	    	}

	    	//先将消息数据存入数据集合，等用户接受传送后，找到对应的数据，并推送到界面
	    	//fileMsgs[msgId] = data;
	    	//console.info('文件已存入', fileMsgs);
	    }

			/**
			 * 请求与指定用户的连接
			 * @param rtcid[String]: 要连接的用户rtc ID
			 */
			function connectUser(rtcid) {

			}

			/**
			 * 检查指定用户是否在线
			 * @param userId[Number]: 用户ID
			 */
			function checkUser(userId) {
				//获取用户id对应的rtc用户列表
				var userList = easyrtc.usernameToIds(String(userId));
				//如果没有对应的RTC用户，返回false
				//if (userList.length === 0) return false;
				return userList[0] ? userList[0].easyrtcid : null;
			}

			/**
			 * 检查与指定rtc用户之间的连接状态
			 * @param rtcid[String]: 用户rtc ID
			 */
			function checkConnect(rtcid) {
				var s = easyrtc.getConnectStatus(rtcid);

				if (s === easyrtc.IS_CONNECTED) {
					return true;
				} else {
					return false;
				}
			}
			return {
				init: function(setting) {
					//异常捕获，如果easyrtc未定义(js未加载)
					try {
						init(setting);
					} catch (e){
						console.error(e.message);
					}
				},
				//退出RTC连接
				quit: function() {
					//异常捕获，如果easyrtc未定义(js未加载)
					try {
						easyrtc.disconnect();
					} catch (e){
						console.error(e.message);
					}
				},
				//获取RTC ID
				getRTCId: function() {
					return selfRTCId;
				},
				/**
				 * 向指定用户发送文件
				 * @param userIds[Array]: 用户id数组集合
				 * @param file[Array]: 文件对象集合
				 * @param statusCB[Function]: 用来传递文件传输进度状态的回调函数
				 * @param fileMsg[Object]: 文件消息数据
				 */
				sendFile: function(userIds, file, statusCB, fileMsg) {
					var uid = userIds[0];
					var rtcid = checkUser(uid);
					//如果没有获取到在线对应的rtc用户，返回错误
					if (!rtcid) return false;
					var delay = $q.defer();
					var connectStatus = easyrtc.getConnectStatus(rtcid);

					//发送文件
					function fileSend() {
						//如果已创建向此用户传文件的函数对象，则不再创建
						/*if (!fileSender[rtcid]) {
							fileSender[rtcid] = easyrtc_ft.buildFileSender(rtcid, statusCB);
						}*/
						fileSender[rtcid] = easyrtc_ft.buildFileSender(rtcid, statusCB);
						//开始传
						fileSender[rtcid]([file]);
					}

					//console.info('是否已与此用户连接', easyrtc.getConnectStatus(uid));
					//尝试连接用户
					easyrtc.call(rtcid,
						function(easyrtcid, mediaType) {
							console.log("Got mediatype " + mediaType + " from " + easyrtc.idToName(easyrtcid));
							//给对方发送文件消息数据
							easyrtc.sendDataP2P(rtcid, 'p2pFileMsg', fileMsg);

							//下面要开始给对方传送文件了
							fileSend();
						},
						function(errorCode, errMessage) {
							console.log("call to  " + easyrtc.idToName(rtcid) + " failed:" + errMessage);
							delay.reject();
						},
						function(wasAccepted, easyrtcid) {
							if( wasAccepted ){
								console.log("call accepted by " + easyrtc.idToName(easyrtcid));
							}
							else {
								console.log("call rejected" + easyrtc.idToName(easyrtcid));
								delay.reject();
							}
						});

					return delay.promise;
				},

				//取消对某用户文件发送，目前是'挂断'对该用户的点对点连接
				cancelFile: function(userId) {
					var rtcid = checkUser(userId);

					if (rtcid) easyrtc.hangup(rtcid);

					//清空file input的value值
					PublisherBinder.clearFileInputValue();
				},

				//返回当前用户的rtcid
				getMyRTCId: function() {
					if (!window.easyrtc) return null;

					return easyrtc.myEasyrtcid;
				},

				checkUser: checkUser
			}
		}
	]
})