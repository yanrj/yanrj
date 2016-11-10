'use strict';
angular.module('mx.files')

.factory('FilesListBinder', ['$http', 'GLOBAL_SETTING','CurUserDB',
	function($http, GLOBAL_SETTING, CurUserDB) {
		var o = {};
		var that, scope;

		o.bind = function($scope) {
			that = this;
			scope = $scope;
		};

		o.loadFiles = function(uri, params) {
			//如果uri 是 downloaded 说明要请求本地 下载数据库
			if(uri === 'downloaded'){	
				scope.uri = uri;
				var obj = {};
				CurUserDB.getDownloadFile()
				.then(function(data){
					var arr = [];
					if(params.content_class == 'all'){
						obj.items = data;
					}else{
						$.each(data, function(index, val) {
							if(val.catalog == params.content_class){
								arr.push(val);
							}
						});
						obj.items = arr;
					}
					
					scope.renderFilesList(obj);
					scope.catalog = params.content_class;
				});
				
				return;
			}
			var url = GLOBAL_SETTING.URL + uri;
			if (uri === scope.uri && params.page === 1 && params.content_class === scope.catalog)
				return;

			//追加一些固定参数
			params.limit = params.limit ? params.limit : 15;
			params.content_class = params.content_class ? params.content_class : 'all';
			params.is_followed_by = scope.selfId;
			params.network_id = scope.networkId;

			//将参数拼到url上
			url += '?' + $.param(params);

			//设置为正在加载状态
			if (params.page === 1) {
				scope.loadingFiles = true;
				scope.loadingMore = false;
			} else {
				scope.loadingMore = true;
				scope.loadingFiles = false;
			}

			$http({
				url: url,
				method: 'GET'
			}).success(function(data) {
				scope.uri = uri;
				scope.pageNum = params.page;
				scope.catalog = params.content_class;
				scope.renderFilesList(data);
				scope.loadingMore = false;
				scope.loadingFiles = false;
				scope.uninit = false;
			}).error(function(err) {
				scope.loadingMore = false;
				scope.loadingFiles = false;
				console.error(err);
				scope.uninit = false;
			});
		};

		//加载更多
		o.loadMoreFiles = function() {
			o.loadFiles(scope.uri, {
				content_class: scope.catalog,
				page: scope.pageNum + 1,
			});
		};

		return o;
	}
])

//将文件尺寸转换为相应单位的尺寸字符串
.factory('FileSizeString', [
	function() {
		return function(size) {
			var units = ['KB', 'MB', 'GB', 'TB'];
			var i = -1;
			var tmpSize = size;

			do {
				i += 1;
				tmpSize = tmpSize/1024;
			} while (tmpSize >= 1024);

			return tmpSize.toFixed(1) + units[i];
		};
	}
])

//通过用户id从references中获取到用户名
.factory('FilesGetUserName', [function() {
	return function(id, refs) {
		var creatorName = null;

		refs.some(function(ref) {
			if (ref.type === 'user' && ref.id === id) {
				creatorName = ref.name;
				return true;
			}

			return false;
		});

		return creatorName;
	}
}])

//通过工作圈id从references中获取到工作圈名
.factory('FilesGetCircleName', [function() {
	return function(id, refs) {
		var circleName = null;

		refs.some(function(ref) {
			if (ref.type === 'group' && ref.id === id) {
				circleName = ref.name;
				return true;
			}

			return false;
		});

		return circleName;
	}
}])

//查看文件详情分配器
.factory('FilesViewer', ['GLOBAL_SETTING', function(GLOBAL_SETTING) {
	return function(item) {
		var catalog = item.catalog;
		var URL = GLOBAL_SETTING.URL;

		//图片查看
		var imageViewer = function() {
			$.magnificPopup.open({
				items: {
					src: URL + item.preview_url,
					type: 'image'
				},
				closeBtnInside: false,
				mainClass: 'file-panel-viewer'
			});
		};

		//视频查看
		var videoViewer = function() {
			var videoHtml = '<div class="message-video-player">\
									<video controls src="' + (URL + item.stream_url) + '" ></video>\
								</div>';
			var jqVideo = $(videoHtml);

			jqVideo.find('video').css('height', $('body').height() * 0.8);

			$.magnificPopup.open({
				items: {
					src: jqVideo,
					type: 'inline'
				},
				mainClass: 'file-panel-viewer'
			});
		};

		//音频
		var audioViewer = function() {
			var audioHtml = '<div class="message-audio-player">\
									<audio controls src="' + (URL + item.stream_url) + '" ></audio>\
								</div>';
			var jqAudio = $(audioHtml);

			$.magnificPopup.open({
				items: {
					src: jqAudio,
					type: 'inline'
				},
				mainClass: 'file-panel-viewer'
			});
		};

		//文档
		var docViewer = function() {
			var docHtml = '<div class="message-doc-player">\
								<div id="docPlayerWrap" class="flexpaper_viewer"></div>\
							</div>';
			var jqDoc = $(docHtml);

			$.magnificPopup.open({
				items: {
					src: jqDoc,
					type: 'inline'
				},
				callbacks: {
					open: function() {
						var jumpUrl = item.stream_url;
						var url = URL + jumpUrl;
						if(item.owa_url){
							jumpUrl = item.owa_url;
							url = URL + jumpUrl;
							$('#docPlayerWrap').load(url);
						}else{
							$('#docPlayerWrap').FlexPaperViewer({
								config : {
						                SwfFile : escape(url),
						                jsDirectory: '/vendor/flexpaper/js/',
						                Scale : 1.2
						            }
							});
						}
					}
				},
				mainClass: 'file-panel-viewer'
			});
		};

		//txt
		var txtViewer = function() {
			var docHtml = '<div class="message-txt-player">\
								<div id="txtPlayerWrap" class="flexpaper_viewer"></div>\
							</div>';
			var jqDoc = $(docHtml);

			$.magnificPopup.open({
				items: {
					src: jqDoc,
					type: 'inline'
				},
				callbacks: {
					open: function() {

						var jumpUrl = item.stream_url;
						var url = URL + jumpUrl;
						if(item.owa_url){
							var jumpUrl = item.owa_url;
							url = URL + jumpUrl;
							$('#txtPlayerWrap').load(url);
						}
					}
				},
				mainClass: 'file-panel-viewer'
			});
		};

		switch(catalog) {
			case 'image':
				imageViewer();
				break;
			case 'video':
				videoViewer();
				break;
			case 'audio':
				audioViewer();
				break;
			case 'doc':
				docViewer();
				break;
			case 'txt':
				txtViewer();
				break;
		}
	};
}])



