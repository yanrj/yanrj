'use strict';

angular.module('mxWebClientApp')
	.factory('CommunitySwitcherBinder', ['RootscopeApply',
		function(RootscopeApply) {
			var o = {};
			var that, scope;

			o.bind = function($scope) {
				that = this;
				scope = $scope;
			};

			o.init = function() {
				RootscopeApply(scope, function() {
					scope.init();
				});
			};

			o.clear = function() {
				RootscopeApply(scope, function() {
					scope.clear();
				});
			};

			return o;
		}
	])