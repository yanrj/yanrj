'use strict';
angular.module('mx.crumbs', [])
//面包屑导航
.directive('navCrumbs', ['Crumbs', 'RootscopeApply','$location', function(Crumbs, RootscopeApply, $location) {
	return {
		restrict: 'EA',
		template: '<div ng-show="showCrumbs" class="nav-crumbs">\
					<a href="#" ng-show="showReturn" class="return">返回<span ng-show="showCrumbsPath">上级</span></a>\
					<div ng-show="showCrumbsPath" class="crambs-box">\
						<crumb-item ng-repeat="crumb in crumbsArr"></crumb-item>\
					</div>\
				</div>',
		replace: true,
		controller: ['$scope', function($scope) {
			//监听crumbs数组变化
			$scope.$on('crumbs.changed', function(e, crumbsArr) {
				var type = $('.main-wrap').attr('type');
				// if(type == '3' && $location.path() === '/app-centre'){
				// 	$scope.showCrumbsPath = false;
				// }
				//判断是否显示"返回"按钮
				// if (crumbsArr.length > 1) {
				// 	$scope.showReturn = true;
				// } else {
				// 	$scope.showReturn = false;
				// }

				RootscopeApply($scope, function() {
					$scope.crumbsArr = crumbsArr;
				});
			})
		}],
		link: function(scope, ele, attrs) {
			var btnReturn = ele.find('a.return');

			btnReturn.bind('click', function(e) {
				e.preventDefault();
				//删除最后一个crumb
				Crumbs.del();

				var data = scope.crumbsArr[scope.crumbsArr.length - 1].data;
				Crumbs.trigger(data);
			});
		}
	}
}])
//面包屑单个链接元素
.directive('crumbItem', ['Crumbs', function(Crumbs) {
	return {
		restrict: 'E',
		replace: true,
		template: '<a href="#" title="{{name}}">{{name|cutString:10}}</a>',
		controller: ['$scope', function($scope) {
			var crumb = $scope.crumb;

			$scope.name = crumb.name;
		}],
		link: function postLink(scope, ele, attrs) {
			ele.bind('click', function(e) {
				e.preventDefault();
				//最后一个crumb不可点击
				if (scope.$last) return;

				//获取相应数据
				var data = scope.crumbsArr[scope.$index].data;

				Crumbs.trigger(data);
				Crumbs.del(scope.$index);
			});
		}
	}
}])

/*
 * 面包屑记录服务
 */
.factory('Crumbs', ['$rootScope', function($rootScope) {
	var o = {};
	var crumbsArr = [];
	var setting = {
		triggerHandler: function() {}
	}

	//初始化crumbs
	//可以自定义点击crumb的回调函数
	o.init = function(customSetting) {
		crumbsArr = [];
		setting = customSetting;

		$rootScope.$broadcast('crumbs.changed', crumbsArr);
	};

	//添加crumb项，并传入数据对象，对象必须包含name属性，用来显示crumb名
	o.add = function(crumbItem) {
		crumbsArr.push(crumbItem);
		$rootScope.$broadcast('crumbs.changed', crumbsArr);
	};

	//修改crumb项，需要传递索引值
	o.put = function(index, crumbItem) {
		crumbsArr[index] = crumbItem;
	};

	//删除crumb项，有index则从index下一个开始删除，没有index则删除最后一个crumb
	o.del = function(index) {
		if(typeof index === 'number') {
			crumbsArr.splice(index + 1);
		} else {
			crumbsArr.pop();
		}

		$rootScope.$broadcast('crumbs.changed', crumbsArr);
	};

	//清除面包屑所有记录
	o.clear = function() {
		crumbsArr = [];
	};

	//获取当前crumbs数据数组
	o.arr = function(index) {
		if (typeof index === 'number') {
			return crumbsArr[index]
		} else {
			return crumbsArr;
		}
	};

	//触发回调
	o.trigger = function(data) {
		setting.triggerHandler(data);
	};

	return o;
}])
