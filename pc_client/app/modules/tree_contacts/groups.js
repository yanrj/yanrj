'use strict';
angular.module('mx.treecontacts.groups', [])
/*
 * 群聊成员服务
 */
.factory('GroupMembersServ', ['Cache',
	function(Cache) {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope
		};

		o.init = function(members) {
			that.renderMembers(members);
		};

		o.getConvId = function() {
			return scope.convInfoId;
		};

		//关闭群聊成员面版
		o.closePanel = function() {
			scope.close();
			that.cancelDel();
		};

		//获取群聊成员数据并返回
		o.getMembersData = function(uids) {
			var users = [];

			for (var i in uids) {
				users[i] = Cache.get('user_' + uids[i]);
			}

			return users;
		};

		return o;
	}
])
/*
 * 群聊选择器
 */
.factory('GroupMemberSelect', ['$q', 'Cache', 'FriendsListServ', '$rootScope', 'ConversationBinder', 'Crumbs', 'RootscopeApply', 'CompanyListBinder',
	function($q, Cache, FriendsListServ, $rootScope, ConversationBinder, Crumbs, RootscopeApply, CompanyListBinder) {
		var o = {};
		var that, scope;
		var delay = null;

		//选择器的Directive会通过injector.invoke调用bind，并将其传递给this
		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		/**
		 * 初始化成员管理器
		 * @param type[Number]: 初始化类型{0: 新建对话; 1: 添加群聊成员};
		 */
		o.init = function(type) {
			delay = $q.defer();

			scope.showCrumbs = true;
			scope.selectorStatus = 'friends';
			scope.selectedArr = [];
			scope.count = 0;
			scope.selectorType = type;
			scope.showCrumbsPath = true;

			//初始化好友列表
			FriendsListServ.init({
				selector: true	//设置为好友选择器列表
			});

			Crumbs.init({
				triggerHandler: function(data) {
					RootscopeApply(scope, function() {
						if (Crumbs.arr().length > 1) {
							scope.selectorStatus = 'company';
							scope.showCrumbs = true;
							CompanyListBinder.render(data);
						} else {
							scope.selectorStatus = 'friends';
							scope.showCrumbs = true;
						}
					});
				}
			});

			//添加记录
			Crumbs.add({
				name: '联系人',
				data: null
			});

			return delay.promise;
		};

		o.finish = function(data) {
			delay.resolve(data);
		};

		o.memberCtrl = function(selected, memberItem) {
			if (selected) {
				scope.addMember(memberItem);
			} else {
				scope.delMember(memberItem);
			}
		};

		o.clear = function() {
			scope.clear();
		};

		return o;
	}
])

/*
 * 群聊对话数据源
 */
.factory('GroupCoversations', ['$resource', 'GLOBAL_SETTING',
	function($resource, GLOBAL_SETTING){
		var url = GLOBAL_SETTING.URL + '/api/v1/users/current/conversations';

		return $resource(url, {
			limit: 50
		});
	}
])
/*
 * 群聊对话加载器
 */
.factory('GroupConversationsLoader', ['GroupCoversations', '$q',
	function(GroupsRs, $q){
		var o = {};

		o.query = function() {
			var delay = $q.defer();

			GroupsRs.get(function(data){
				delay.resolve(data);
			}, function(data) {
				delay.reject(data);
			});

			return delay.promise;
		};

		return o;
	}
])
//TODO 需要把添加删除成员服务都改到这里
.factory('GroupMemberUserRS', ['$resource', 'GLOBAL_SETTING', function($resource, GLOBAL_SETTING) {
	return function(convId) {
		var url = GLOBAL_SETTING.URL + '/api/v1/conversations/' + convId + '/users/:userId';

		return $resource(url, {
			userId: '@userId'
		});
	}
}])

.factory('GroupMemberReq', ['$http', '$q', 'GLOBAL_SETTING', 'GroupMemberUserRS', 'ConversationBinder', 'CurUserDB', 
	function($http, $q, GLOBAL_SETTING, GroupMemberUserRS, ConversationBinder, CurUserDB ) {
		var o = {};

		

		//将对话数据存入数据库
		function _saveToDB(data) {
			var delay = $q.defer();
			var convId = data.items[0].conversation_id;

			//将新数据存入数据库
			CurUserDB.saveReferences(data.references)
				.then(function() {
					//将新对话数据存入数据库
					return CurUserDB.saveConvList(data.items);
				})
				.then(function() {
					delay.resolve();
				});

			return delay.promise;
		}

		//删除成员之后，更新数据库和缓存中对话的数据
		function _delUserFromConvDB(convId, userId) {
			var delay = $q.defer();
			var tmpConv;

			CurUserDB.getConvList(convId)
				.then(function(conv) {
					//获取到数据库中的对话数据，并修改其用户数量和id集合
					tmpConv = conv;
					var uids = tmpConv.user_ids;
					var index = uids.ids.indexOf(userId);

					if (index > -1) {
						uids.ids.splice(index, 1);
						uids.count -= 1;
					}

					tmpConv.uids = uids;
					//更新数据库
					return CurUserDB.saveConvList([tmpConv]);
				})
				.then(function() {
					//保存到数据库references表
					return CurUserDB.saveReferences([tmpConv]);
				})
				.then(function() {
					delay.resolve(tmpConv);
				})

				return delay.promise;
		}

		//添加成员
		o.invite = function(data) {
			var convId = ConversationBinder.getCurrentConvId();
			var delay = $q.defer();

			GroupMemberUserRS(convId).save(data,
				function(data) {
					delay.resolve(data);
				}, function(err) {
					delay.reject(err);
				});

			return delay.promise;
		};

		//删除成员
		o.delMember = function(userId) {
			var convId = ConversationBinder.getCurrentConvId();
			var delay = $q.defer();

			GroupMemberUserRS(convId).remove({userId: userId},
				function(data) {
					delay.resolve(data);
				}, function(err) {
					delay.reject(err);
				});

			return delay.promise;
		};

		return o;
	}
])

//群聊的面包屑记录服务
.factory('GroupsCrumbs', ['Crumbs', '$rootScope', 'ContactsStatus', function(Crumbs, $rootScope, ContactsStatus) {
	return function(data) {
		Crumbs.init({
			triggerHandler: function(data) {
				$rootScope.$broadcast('groupConv_contacts.loaded', data);
				//将通讯录状态置为"群聊"
				ContactsStatus('groups');
			}
		});

		//添加记录
		Crumbs.add({
			name: '群聊',
			data: data
		});
	}
}])