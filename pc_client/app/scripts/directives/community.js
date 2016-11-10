'use strict';

angular.module('mxWebClientApp')
    .directive('communitySwitcher', ['Storage', 'CommunitySwitcherBinder', '$injector',
        function(Storage, CommunitySwitcherBinder, $injector) {
            return {
                restrict: 'A',
                controller: ['$scope',
                    function($scope) {
                        $scope.networkName = '';

                        $injector.invoke(CommunitySwitcherBinder.bind, this, {
                            $scope: $scope
                        });

                        $scope.init = function() {
                            var homeUser = Storage.getUser('homeUser');
                            //console.info('用户信息', homeUser);
                            $scope.networkName = homeUser && homeUser.network_name;
                        };

                        $scope.clear = function() {
                            $scope.networkName = '';
                        };
                    }
                ],
                link: function postLink(scope, element, attrs) {
                }
            };
        }
    ]);