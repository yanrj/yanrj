'use strict';
angular.module('mx.files')

//文件分类列表
.directive('filesListPanel', ['$filter','Storage',
	function($filter,Storage) {
		return {
			restrict: 'EA',
			controller: ['$scope', '$element', function($scope,$element) {
				$scope.items = $filter('groupsFilter')($scope.joinedGroups);
				//获取sidebar配置
				$scope.validNewModulesCircle = true;
				var licens = Storage.validNewModules();
					console.info('licens', licens);
				if(licens.work_circle == false){
					$scope.validNewModulesCircle = false;
				}
			}],
			link: function(scope, ele, atrrs) {
			}
		}
	}
])

/*
 * 文件列表选项
 */
.directive('btnFileItem', ['GLOBAL_SETTING', 'FilesListBinder', 'Storage','$timeout',
	function(GLOBAL_SETTING, FilesListBinder, Storage,$timeout) {
		return {
			restrict: 'EA',
			replace: true,
			template: '<div class="item" title="">\
							<img ng-src="{{head}}" alt="头像" />\
							<span class="name">{{name}}</span>\
						</div>',
			controller: ['$scope', function($scope) {
				var item = $scope.item;
				var type = item.type;

				$scope.name = item.name;
				$scope.head = GLOBAL_SETTING.URL + item.avatar_url;

				if (type === 'group') {
					$scope.uri = '/api/v1/uploaded_files/in_group/' + item.id;
				}else if(type === 'downloaded'){
					$scope.uri = 'downloaded';
				}else {
					$scope.uri = item.api_url;
				}
			}],
			link: function(scope, ele, attrs) {
				switch (scope.name) {
                    case '我关注的':
                        ele.find('img').addClass('my-followed');
                        scope.head = '';
                        break;
                    case '我上传的':
                        ele.find('img').addClass('my-uploaded');
                        scope.head = '';
                        break;
                    case '我下载的':
                        ele.find('img').addClass('my-downloaded');
                        scope.head = '';
                        break;
                }

				ele.bind('click', function(e) {
					e.preventDefault();

					//标记为点击样式
					ele.parent().find('.act').removeClass('act');
					$(this).addClass('act');
					//加载文件列表
					FilesListBinder.loadFiles(scope.uri, {
						is_followed_by: scope.selfId,
						limit: 15,
						page: 1,
						network_id: scope.networkId,
						content_class: 'all'
					});
				});

				if (scope.$last === true) {
	                $timeout(function() {
	                   ele.parent().find('.item:first').trigger("click"); 
	                });
	            }

			}
		}
	}
])

.directive('filesListWrap', ['FilesListBinder', '$injector', '$filter',
	function(FilesListBinder, $injector, $filter) {
		return {
			restrict: 'E',
			replace: true,
			template: 	'<div class="files-list-wrap">\
							<files-type-nav ng-show="uri"></files-type-nav>\
							<div ng-class="uninit ? \'uninit\' : \'\'" class="files-box">\
								<ul>\
									<li file-item ng-repeat="item in files | orderBy : \'-order_by\'"></li>\
								</ul>\
								<span ng-show="loadingMore" class="loading-more">正在加载</span>\
								<span ng-show="loadingFiles" class="loading-files">正在加载</span>\
								<p ng-show="nothingFile" class="nothing">当前没有数据</p>\
							</div>\
						</div>',
			controller: ['$scope', '$element',
				function($scope, $element) {
					//绑定服务
					$injector.invoke(FilesListBinder.bind, this, {
						$scope: $scope
					});

					var refsFilter = $filter('referencesFilter');

					$scope.uninit = true;

					var scopeWorker = function(data) {
						var files = $scope.files || [];
						var refs = $scope.references || [];
						//如果获取到的文件列表为空
						if (data.items.length === 0) {
							if ($scope.pageNum === 1) {
								//如果是初次加载，侧设置为无文件
								$scope.nothingFile = true;
							} else {
								//如果不是初次加载，标记为无更多
								$scope.noMore = true;
							}
							return;
						}

						//$scope.catalog = $scope.pageNum === 1 ? 'all' : $scope.catalog;
						$scope.noMore = false;
						$scope.nothingFile = false;
						$scope.files = files.concat(data.items);
						if(!data.references) {
							$scope.uri = 'downloaded';
							var dataArr = [];
							$.each($scope.files, function(index, val) {
								if(val.version){
									dataArr.push(val);
								}
							});
							if(dataArr.length == 0){
								$scope.nothingFile = true;
							}
							$scope.files = dataArr;
							return;
						}
						$scope.references = refsFilter(refs, data.references);
					};

					var clear = function() {
						$scope.files = null;
						$scope.references = null;
					};

					$scope.renderFilesList = function(data) {
						if ($scope.pageNum === 1) {
							$element.find('.files-box').scrollTop(0);
							clear();
						}

						scopeWorker(data);
					};
				}
			],
			link: function(scope, ele, attrs) {
				var box = ele.find('.files-box');
				var list = box.find('ul');

				//滚动到底部加载更多文件列表
				box.bind('scroll', function(e) {
					var listHeight = list.height();
					var scrollHeight = box.scrollTop() + box.height();

					if (scrollHeight >= listHeight && !scope.noMore && !scope.filesLoading && scope.uri != 'downloaded') {
						FilesListBinder.loadMoreFiles();
					}
				});
			}
		}
	}
])

.directive('fileItem', ['GLOBAL_SETTING', 'FileSizeString', 'FilesGetUserName', 'FilesGetCircleName', 'FilesViewer','PopMessage','CurUserDB',
	function(GLOBAL_SETTING, FileSizeString, FilesGetUserName, FilesGetCircleName, FilesViewer, PopMessage,CurUserDB) {
		return {
			restrict: 'A',
			template: 	'<a class="thumb" href=""><img ng-src="{{thumbUrl}}" alt="缩略图" /></a>\
						<h5>{{fileName}} ({{size}})</h5>\
						<span class="info">{{circleName}} - {{creatorName}}</span>\
						<time>{{time | momentFilter}}</time>\
						<a ng-show="isPath" class="view" href="{{path}}">查看</a>\
						<a ng-hide="isPath" target="fileDownloadIfm" class="downloads" href="{{downloadUrl}}">下载</a>',
			controller: ['$scope',
				function($scope) {
					var item = $scope.item;
					$scope.thumbUrl = GLOBAL_SETTING.URL + item.thumbnail_url;
					$scope.isPath = item.path ? true : false;
					$scope.fileName = item.name;
					$scope.creatorName = item.sender_name ? item.sender_name : FilesGetUserName(item.creator_id, $scope.references);
					$scope.itemCatalog = item.catalog;
					$scope.time = item.updated_at;
					$scope.size = FileSizeString(item.size);
					$scope.downloadUrl = GLOBAL_SETTING.URL + item.download_url;

					if(!item.path){
						$scope.circleName = FilesGetCircleName(item.group_id, $scope.references);
					}else{
						$scope.path = item.path + item.name;
					}
					
				}
			],
			link: function(scope, ele, attrs) {
				var btnThumb = ele.find('a.thumb');
				var btnView = ele.find('a.view');
				btnThumb.bind('click', function(e) {
					e.preventDefault();
					//btnView.click();
					//FilesViewer(scope.item);
				});
				//点击查看
				btnView.bind('click', function(e) {
					e.preventDefault();
		            var gui = require('nw.gui');
		            var path = $(e.currentTarget).attr('href');
		            
		            var fs = require('fs');
		            var str = $(this);
		            fs.exists(path, function(exists) {
		              if (exists) {
		                gui.Shell.openItem(path);
		              } else {
		                PopMessage.err({
		                    message: '您所访问文件不存在，请下载！'
		                });
		                scope.isPath = false;
		              }
		            });
				});
			}
		}
	}
])

.directive('filesTypeNav', ['FilesListBinder',
	function(FilesListBinder) {
		return {
			restrict: 'E',
			replace: true,
			template: 	'<div class="files-type-nav">\
							<nav>\
								<ul>\
									<li data-catalog="all" ng-class="catalog===\'all\' ? \'act\' : \'\'" class="btn-all-files"><span>全部</span></li>\
									<li data-catalog="documents" ng-class="catalog===\'documents\' ? \'act\' : \'\'" class="btn-doc-files"><span>文档</span></li>\
									<li data-catalog="images" ng-class="catalog===\'images\' ? \'act\' : \'\'" class="btn-img-files"><span>图片</span></li>\
									<li data-catalog="videos" ng-class="catalog===\'videos\' ? \'act\' : \'\'" class="btn-video-files"><span>视频</span></li>\
								</ul>\
							</nav>\
						</div>',
			controller: ['$scope',
				function($scope) {

				}
			],
			link: function(scope, ele, attrs) {
				var btnAll = ele.find('.btn-all-files');
				var btnDoc = ele.find('.btn-doc-files');
				var btnImg = ele.find('.btn-img-files');
				var btnVideo = ele.find('.btn-video-files');
				var btns = ele.find('li');

				btns.bind('click', function(e) {
					e.preventDefault();

					var catalog = $(this).data('catalog');

					//如果已经是当前分类，不再进行请求
					if (scope.catalog === catalog) return;

					//发送请求
					FilesListBinder.loadFiles(scope.uri, {
						content_class: catalog,
						page: 1
					});
				});
			}
		}
	}
])