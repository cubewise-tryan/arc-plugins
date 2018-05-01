
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("usersGroups", "Users and Groups", "page", {
        menu: "administration",
        icon: "fa-sitemap",
        description: "This plugin adds the users and groups administration page.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "0.2.0"
    });

}]);

arc.directive("usersGroups", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"  
        },
        templateUrl: "__/plugins/users-groups/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$timeout", "$tm1", "$dialogs", "$helper","$log","$q","$uibModal", function ($scope, $rootScope, $http, $timeout, $tm1, $dialogs, $helper,$log,$q,$uibModal) {

            // CHECK
            $log.log('testing123');
            // $log.log($rootScope);
            // $log.log($scope);

            //OBJECTS
            $scope.selections = {
                filter: ""
            };

            //test users object
            $scope.users = [
                {
                    Name:'testUser1',
                    FriendlyName:'Mr Black',
                    Type:'testLevel1',
                    IsActive: 'false',
                    Groups:'testGroup1'
                },
                {
                    Name:'testUser2',
                    FriendlyName:'Mr Pink',
                    Type:'testLevel2',
                    IsActive: 'false',
                    Groups:'testGroup2'
                },
                {
                    Name:'testUser3',
                    FriendlyName:'Mr White',
                    Type:'testLevel3',
                    IsActive: 'false',
                    Groups:'testGroup3'
                },
                {
                    Name:'testUser4',
                    FriendlyName:'Mr Orange',
                    groups:'testGroup4',
                    Type:'testLevel4',
                    IsActive: 'false',
                    Groups:'testGroup4'
                }

            ];

            //LOAD USER DATA
            var load = function(){
                // Loads the UserList information from TM1
                // First part of URL is the encoded instance name and then REST API URL (excluding api/v1/)

                //check
                $log.log('in load function>>>');

                //set reaload flag
                $scope.reload = false;

                //TM1 REST API QUERY
                var odataQuery = "/Users";

                //MAIN FUNCTION
                $http.get(encodeURIComponent($scope.instance) + odataQuery)
                    .then(success)
                    .catch(error);

                    //SUCCESS
                    function success(response){
                        //review status
                        if(response.status < 400){
                            //check
                            $log.log('success');
                            $log.log(response.data.value);

                            //build user object........
                            buildUsers(response.data.value);

                        }else{
                            return $q.reject(response);
                        }


                        //construct user object
                        function buildUsers(usersArray){

                            $scope.users = usersArray;
                            $log.log($scope.users);
                            // angular.forEach(usersArray, function(value,key){
                                // $log.log(value);
                                // $log.log(key);
                            // });
                        }

                    }

                    //ERRORHANDLER
                    function error(response){
                        //check
                        $log.log('error');
                        $log.log(response);

                        if(response == 400){
                            // Set reload to true to refresh after the user logs in
                            $scope.reload = true;
                            return;

                        }else{
                            // Error to display on page
                            if(response.data && response.data.error && response.data.error.message){
                                $scope.message = success.data.error.message;
                            }
                            else {
                                $scope.message = success.data;
                            }
                            $timeout(function(){
                                $scope.message = null;
                            }, 5000);

                        }
                        

                    }

            };

            // Load the users the first time
            load();


            //EDIT USER
            var $ctrl = this;
            $ctrl.items = ['item1', 'item2', 'item3'];
            
            $scope.editUserModal = function(){
                //check
                $log.log('editUser');

                var modalInstance = $uibModal.open({
                    animation: $ctrl.animationsEnabled,
                    component: 'modalComponent',
                    resolve: {
                        items: function () {
                            return $ctrl.items;
                        }
                    }
                });

            }

            //RELOAD FOR SESSION TIME OUTS
            // Event to reload the page, normally after the session has timed out
            $scope.$on("login-reload", function(event, args) {
                // Check that instance in args matches your $scope
                if(args.instance === $scope.instance && $scope.reload){
                    load();
                }
            });


            //FILTER USER TABLE
            $scope.listFilter = function(user) {
                // Check text filter
                if(!$scope.selections.filter || !$scope.selections.filter.length){
                    return true;
                }

                //Check for Match
                var filter = $scope.selections.filter.toLowerCase();
                if(user.Name.toLowerCase().indexOf(filter) !== -1
                    || user.FriendlyName.toLowerCase().indexOf(filter) !== -1 ){
                    return true;
                }
                return false;
                
            };


            //CLOSE USERS AND GROUPS TAB
            $scope.$on("close-tab", function(event, args) {

                $log.log('in close tab function');
                $log.log(args);

                // Event to capture when a user has clicked close on the tab
                if(args.page == "usersGroups" && args.instance == $scope.instance && args.name == null){
                    // The page matches this one so close it
                    $rootScope.close(args.page, {instance: $scope.instance});
                }
            });


            //CLEANUP - destroy event broadcast just before child scope removal..
            $scope.$on("$destroy", function(event){
                // Cancel the timeout and any other resources
                clearTimeout($scope.loadTimeout);
            });
        

        }]
    };
});