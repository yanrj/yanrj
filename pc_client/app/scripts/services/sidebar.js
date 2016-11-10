'use strict';

angular.module('mx.sidebar', [])

.factory('SidebarNavBinder', ['CurUserDB','ConversationListBinder',
	function(CurUserDB, ConversationListBinder) {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		o.readedMessage = function(num, ignore) {
			that.readed('message', num, ignore);
		};

		o.readedCircle = function(num) {
			that.readed('circle', num);
		};

		/**
		 * 设置全局未读数
		 */
		o.setMessageUnreadNum = function(count) {
			//var num = 0;
			// if(!count){
			// 	var ele = $(".box:eq(0) .unread-num");
	  //           for(var i = 0; i < ele.length; i++){
	  //               num += parseInt($(".box:eq(0) .unread-num:eq("+ i +")").text());
	  //           }
			// }else{
			// 	num = count;
			// }
			// var conItems = ConversationListBinder.getConvList();
   //          console.info('设置全局未读数：count', num, conItems , angular.copy(conItems));


			// $.each(conItems, function(index, val) {
			// 	console.info('val.unread_count',val.default_name, val.remind==false , !val.category_id , val.unread_count, val);
			// 	if(val.remind == false && !val.category_id && val.unread_count){
			// 		num += val.unread_count;
			// 		console.info('val.unread_count', val.unread_count);
			// 	}
			// });
			
			scope.unreadHandler(1, count);
			CurUserDB.convsUnreadNum(count);
			
		};

		//获取全局消息未读数
		o.getMessageUnreadNum = function() {
			return scope.unreadMessage;
		};

		//仅闪动图标
		o.iconAttention = function() {
			scope.unreadHandler();
		}

		return o;
	}
])