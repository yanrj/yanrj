angular.module('mx.filters', ['mx.emotions'])
	/*
	 * 日期时间格式化
	 */
	.filter('momentFilter', function() {
	  return function(date) {
	    var moment = global.moment;

	    return moment(date).calendar();
	  }
	})

	/*
	 * 用户头像url过滤器，需要从refferences里通过type和id匹配，并返回
	 * PS: 顺便把username存到作用域中
	 */
	.filter('userHeadFilter', ['Cache', function(Cache){
	  return function(head, con, scope) {
	    var id = con.sender_id;
	    var URL = scope.URL;
	    var user = Cache.get('user_' + id);
	    var out = '';

	    out = URL + user.avatar_url;
	    scope.user_name = user.name;

	    return out;
	  }
	}])

	/*
	 * 过滤表情图片
	 */
	.filter('emotionsFilter', ['emotionsServ', function(emotionsServ) {
		return function(content) {
			if (!content || typeof content !== 'string') return content;

			//return emotionsServ.emotionsToHtml(content);
			return emotionsServ.emotionsToHtml(jEmoji.unifiedToHTML(jEmoji.softbankToUnified(content)));
		}
	}])

	/*
	 * 为链接增加target="_blank"属性
	 */
	.filter('linkFilter', [function() {
		return function(content) {
			if (!content || typeof content !== 'string') return content;

			var dom = angular.element('<div>' + content + '</div>');
			var eLinks = dom.find('a[target!="_blank"]');

			if (eLinks.size()){
				angular.forEach(eLinks, function(v, i) {
					v.setAttribute('target', '_blank');
				});
				content=dom.html();
			} 

			return "<pre>"+content+"</pre>";
		}
	}])

	/*
	 * 字符串截字(一个汉子算两个字符)
	 */
	.filter('cutString', function() {
		return function(string, length) {
			var newStr = '';
			var newLen = 0;

			for (var i = 0, len = string.length, char; i < len; i++) {
				char = string.charAt(i);
				newStr += char;

				if (encodeURI(char).length > 3) {
					newLen += 2;
				} else {
					newLen += 1;
				}

				if (newLen >= length && newStr.length < string.length) {
					newStr += '...';
					break;
				}
			}

			return newStr;
		}
	})

	/*
	 * 将字符串中的html标签转义
	 */
	.filter('encodeHTMLTag', function() {
		return function(string) {
			if (!string || typeof string !== 'string') return string;
			return string.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		}
	})

	/*
	 * 计算文件大小并返回字符串
	 * @param size[Number]: 文件大小
	 */
	.filter('fileSizeFilter', function() {
		return function(size) {
			var newSize;

			if (size < 1024) {
				return size + 'Bytes';
			} else if (size < 1024 * 1024) {
				newSize = size / 1024;
				return newSize.toFixed(1) + 'KB';
			} else if (size < 1024 * 1024 * 1024) {
				newSize = size / Math.pow(1024,2);
				return newSize.toFixed(1) + 'MB';
			}
		}
	})