'use strict';
angular.module('mx.treecontacts', [])
/*
 * 公司通讯录按钮
 */
.directive('companyTreeList', ['ContactTreeBinder', '$rootScope','$http','GLOBAL_SETTING','Storage','Cache','UserLoaderServ',
	function(ContactTreeBinder, $rootScope, $http, GLOBAL_SETTING, Storage, Cache, UserLoaderServ) {
		return {
			restrict: 'A',
			transclude:true,
			template: 	'<span class="loading">正在加载</span><div id="user-list"></div>',
			controller: ['$scope', 'GLOBAL_SETTING', '$injector',
				function($scope, GLOBAL_SETTING, $injector) {
					var token = Storage.getToken();
					var netWorks = Cache.get('networks');
					var netWorkWebUrl = '';
					var currentUser=Storage.getCurrentUser();
					var timer;
					$.each(netWorks.items, function(index, val) {
						if(currentUser.network_id==val.id){
							netWorkWebUrl=val.web_url;
							return;	
						}
					});
					var contactUser = function(id) {
						UserLoaderServ.getUser(id)
						.then(function(data) {
							$rootScope.$broadcast('usertreeinfo.show', data);
						}, function(err) {
							console.log(err);
						});
					};
					//定时刷新状态
					var refreshOnlineStatus=function(){
						timer=window.setInterval(function(){
							var userNodes=$("#user-list").find("a.tree-online-status");
							var userIds=_.map(userNodes,function(node){return $(node).data("id") });
								$http({
									url: GLOBAL_SETTING.URL +"/api/v1/users/online/"+encodeURIComponent(userIds.join(",")) ,
									method: 'GET',
								}).success(function(datas) {
									//设置默认值
									userNodes.attr("class","jstree-anchor tree-online-status");
									//获取在线用户
									if(datas&&datas.length>0){
										for(var i=0;i<datas.length;i++){
											var data=datas[i];
											if(data.status==1){
											userNodes.filter('a[data-id="'+data.id+'"]').addClass("web");
												//web
											}else{
												//mobile
											userNodes.filter('a[data-id="'+data.id+'"]').addClass("mobile");
											}
										}
									}
								}).error(function(err) {
								});

						},(GLOBAL_SETTING.online_status_interval||5)*60000);
					}
					//通讯录中的部门处理逻辑
					var contectDepart = function(id) {
						ContactTreeBinder.getAllCompanyCounts(id)
						.then(function(data) {
							$rootScope.$broadcast('deptinfo.show', data);
						}, function(err) {
							console.log(err);
						});
					};

					//初始化tree，绑定监听tree方法
					var initTree = function(){
						$("#user-list").on("open_node.jstree", function(event, data) {
					        $.each(data.node.children, function(index, val) {
					        	var ele = $("#"+val);
					        	var line = ele.find('a').data('online-status');
					        	if(line){
					        		ele.find('a').addClass('tree-online-status '+line);
					        		ele.find('a i').css('background-size',"22px 22px");
					        	}
					        });
					    }).jstree({
							"core" : {
							    "animation" : 0,
							    "check_callback" : true, 
							    'data' : {
							      'url' : function (node) {
							        return GLOBAL_SETTING.URL + netWorkWebUrl + '/manage_organizations/child_depts.json?include_users=true&address=true&user_group=true';
							      },
							      'data' : function (node) {
							        return { 'id' : node.id };
							      }
							    }
						  	},
						}).on("changed.jstree", function (e, data) {
							// $('.jstree-node').removeClass('item-current');
							// $("#"+data.node.id).addClass('item-current');
							$(".user-tree").hide();
							$(".dept-tree-info").hide();
							$(".tree-bg").hide();
							var ele = $('#'+data.node.a_attr.id);
							var type = ele.data('type');
							var id = ele.data('id');
						    if(type == 'user'){
							    contactUser(id);
							    $(".user-tree").show();
						    }else if(type == 'dept'){
						    	contectDepart(id);
						    	$(".dept-tree-info").show();
						    }
						}).on("loaded.jstree", function(e, data){
							setTimeout(function(){
								$(".tree-contacts .loading").hide();
								$(".jstree-anchor:eq(0)").hide();
								$("i.jstree-icon:eq(0)").hide();
								$('#user-list').show();	
								refreshOnlineStatus();
							}, 1000)
							
						});
					}
					
					initTree();
					$scope.$on("$destroy",function(){
						timer&&window.clearInterval(timer);
					})

				}
			],
			link: function postLink(scope, ele) {
				
			}
		}
	}
])
.factory('ContactTreeBinder', ['$http', 'GLOBAL_SETTING', '$q', function($http, GLOBAL_SETTING, $q) {
		var o = {};

		o.getAllCompanyCounts = function(deptId){
			var url = GLOBAL_SETTING.URL + '/api/v1/departments/'+deptId;
			var delay = $q.defer();

			$http({
				url: url,
				method: 'GET',
			}).success(function(data) {
				delay.resolve(data);
			}).error(function(err) {
				delay.reject(err);
			});

			return delay.promise;
		};

		o.destroy = function(){
			scope&&scope.$destroy();
		}

		return o;
}])