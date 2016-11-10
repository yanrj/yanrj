'use strict';

angular.module('mx.conversations.list')
/*
 * 格式化对话标题
 * 需要将item中user_ids配对references中的user_id取username
 */
.filter('convTitleFilter', ['Storage', function(Storage) {
	return function(name, item, arrRefs) {
		//如果对话有自定义标题，则返回
		//否则比配成员名组成标题
		if (name) return name;
		var selfId = Storage.getUser('id');
		var ids = angular.copy(item.user_ids.ids);
		var users = [];
		var out = '';

		//如果是不是群聊，将自己的ID从所有ID中去掉
		/*if (!item.is_multi_user && ids.indexOf(selfId) > -1) {
			ids.splice(ids.indexOf(selfId), 1);
		}*/

		//只要对话人数大于1人，就把自己的id去掉
		// if (ids.indexOf(selfId) > -1 && ids.length > 1) {
		// 	ids.splice(ids.indexOf(selfId), 1);
		// }

		var reg = new RegExp('^(' + ids.join('|') + ')$');

		//TODO: 性能有待优化
		arrRefs.forEach(function(ref) {
			if (ref.type === 'user' && reg.test(ref.id)) {
				var i = ids.indexOf(ref.id);
				users[i] = ref.name;
			}
		});
		//console.log(users.reverse());
		out = users.join('、');
		//console.log(out);
		//标题字数裁剪
		//out = out.length > 10 ? out.substring(0, 8) + '...' : out;

		return out;
	}
}])
/*
 * 过滤并返回新的references数组
 * 由于每次加载对话列表返回的references数组总会有重复的，所以需要过滤一下，避免重复
 * @param originRefs[Array]: 原始数组
 * @param newRefs[Array]: 新获取到的数组
 */
.filter('referencesFilter', [function() {
	return function(originRefs, newRefs) {
		var tmpRefs = [];

		originRefs = originRefs || [];

		//先给newRefs去重
		newRefs.forEach(function(el) {
			var check = tmpRefs.some(function(ele) {
				return ele.id === el.id && ele.type === el.type;
			});

			if (!check) tmpRefs.push(el);
		});
		newRefs = tmpRefs;

		//合并references
		var refs = newRefs.filter(function(e) {
			return !originRefs.some(function(ele) {
				return ele.id === e.id && ele.type === e.type;
			})
		});

		return originRefs.concat(refs);
	};
}])

/*
 * 格式化对话标题
 * 需要将item中user_ids配对references中的user_id取username
 */
.factory('ConvTitleFilter', ['Storage', 'Cache', function(Storage, Cache) {
	return function(name, item) {
		var selfId = Storage.getUser('id');
		var ids = angular.copy(item.user_ids.ids);
		var out = [];

		//如果对话有自定义标题，则返回
		//否则比配成员名组成标题
		if (name) return name;

		//只要对话人数大于1人，就把自己的id去掉
		if (ids.indexOf(selfId) > -1 && ids.length > 1) {
			ids.splice(ids.indexOf(selfId), 1);
		}

		var tmpCache;
		for (var i = 0, len = ids.length; i < len; i++) {
			tmpCache = Cache.get('user_' + ids[i]);
			if (tmpCache) out[i] = tmpCache.name;
		}

		return out.join('、');
	}
}])

/*
 * 过滤掉一些不需要显示的对话(用于对话列表)
 * @param convItems[Array]: 对话列表数组
 */
.filter('ConvItemsFilter', ['Cache', 'Storage', function(Cache, Storage) {
	return function(convItems) {
		if (!convItems) return convItems;
		var selfId = Storage.getUser('id');

		var newItems = convItems.filter(function(ele) {
			var ids = ele.user_ids.ids;

			if (ids.indexOf(selfId) === -1) return false;

			//开始过滤公众号，如果不是ocu类型对话，返回true
			if (!ele.ocu_id) return true;

			//如果是ocu类型，从缓存获取ocu数据
			var ocu = Cache.get('ocu_' + ele.ocu_id);

			if (!ocu) return true;

			var ocuInfo = ocu.ocu_info;

			//如果是默认订阅公众号返回true，保留
			if (ocuInfo && ocuInfo.auto_subscribed) {
				return true;
			}

			//判断是否订阅该ocu，未订阅的排除在外
			if (ocu.followed_by_current) {
				return true;
			} else {
				return false;
			}
		});

		return newItems;
	}
}])