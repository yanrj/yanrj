'use strict';

angular.module('mx.files', [])

//"我关注的文件"按钮作用域控制器
.controller('FilesMyFollowedCtrl', ['$scope', function($scope){
	$scope.item = {
		name: '我关注的',
		avatar_url: '/photos/none_group',
		type: 'following',
		api_url: '/api/v1/uploaded_files/followed_by_me'
	}
}])

//"我上传的文件"按钮作用域控制器
.controller('FilesMyUploadedCtrl', ['$scope', function($scope){
	$scope.item = {
		name: '我上传的',
		avatar_url: '/photos/none_group',
		type: 'following',
		api_url: '/api/v1/uploaded_files/uploaded_by_me'
	}
}])

//"我下载的文件"按钮作用域控制器
.controller('FilesMyDownloadCtrl', ['$scope', function($scope){
	$scope.item = {
		name: '我下载的',
		avatar_url: '/photos/none_group',
		type: 'downloaded'
	}
}])