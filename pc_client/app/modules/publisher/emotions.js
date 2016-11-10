angular.module('mx.emotions', [])
	.directive('emoBtn', function() {
		return {
			replace: false,
			restrict: 'A',
			link: function postLink(scope, element, attrs) {
				var jqForm = element.parents('form');
				var jqTextarea = jqForm.find('textarea');
				var jqNav = jqForm.find('nav');


				var emo = element.jqfaceedit({
					txtAreaObj: jqTextarea,	//TextArea对象
	                containerObj: jqNav, 	//表情框父对象
	                // textareaid: 'msg',	//textarea元素的id
	                //popName: '', 			//iframe弹出框名称,containerObj为父窗体时使用
	                //emotions: em, 		//表情信息json格式，id表情排序号 phrase表情使用的替代短语url表情文件名
	                top: '-205px', 			//相对偏移
	                left: 0 				//相对偏移
				});

				element.bind('click', function(e) {
					e.preventDefault();
					//console.log(1111);
				})
			}
		}
	})

	/*
	 * 表情相关服务
	 */
	.service('emotionsServ', function() {
		var service = {};

		//将内容中的表情转换为编码
		service.emotionNameToCode = function(content) {
			return $.emotionNameToCode(content);
		}

		//将包含头像编码的内容转换成图片内容
		service.emotionsToHtml = function(data) {
			return $.emotionsToHtml(data);
		}
		//将表情符号转换为描述文字，如 大笑|smile
		service.emotionsToName=function (data) {
			return $.emotionsToName(data);
		}
		return service;
	})