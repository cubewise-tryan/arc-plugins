
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("usersGroups", "Users and Groups", "page", {
        menu: "administration",
        icon: "fa-sitemap",
        description: "This plugin adds the users and groups administration page.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "0.4.0"
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
      controller: ["$scope", "$rootScope", "$http", "$timeout", "$tm1", "$dialogs", "$helper","$log","ngDialog", function ($scope, $rootScope, $http, $timeout, $tm1, $dialogs, $helper,$log,ngDialog) {

         $scope.selections = {
               filter: ""
         };

         $scope.load = function(){
            $scope.reload = false;

            // Loads the UserList information from TM1
            // First part of URL is the encoded instance name and then REST API URL (excluding api/v1/)
            var queryGetUsersWithGroups = "/Users?$expand=Groups($filter=Name ne '}tp_Everyone')";
            $http.get(encodeURIComponent($scope.instance) + queryGetUsersWithGroups).then(function(success,error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  $scope.usersWithGroups = success.data.value;

               }else{
                  // Error to display on page
                  if(success.data && success.data.error && success.data.error.message){
                     $scope.message = success.data.error.message;
                  }
                  else {
                     $scope.message = success.data;
                  }
                  $timeout(function(){
                     $scope.message = null;
                  }, 5000);
               }
            });
         };
         // Load the users the first time
         $scope.load();


         $scope.editUser = function(rowIndex){
            ngDialog.open({
               template: "__/plugins/users-groups/editUser.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     name : $scope.$parent.usersWithGroups[rowIndex].Name,
                     alias : $scope.$parent.usersWithGroups[rowIndex].FriendlyName,
                  }

                  $scope.updateUser = function(){
                     // work in progress....
                     $scope.closeThisDialog();
                  }
              
               }],
               data: {view: $scope.view}
            });

         }


         $scope.addUser = function(){
            ngDialog.open({
               template: "__/plugins/users-groups/addUser.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     name: '',
                     alias:'',
                     password:'',
                     groups: [],
                     message:''
                  }

                  $scope.updateGroupsArray = function(group){
                     var array = [];
                     var arrayElement = "Groups('" + group + "')";
                     array.push(arrayElement);
                     $scope.dataParameter = array;
                  }

                  $scope.createUser = function(){
                     var url = "/Users";
                     var data = {
                        "Name" : $scope.view.name,
                        "Groups@odata.bind":$scope.dataParameter
                     }
                     $http.post(encodeURIComponent($scope.$parent.instance) + url, data).then(function(success,error){
                        if(success.status == 401){
                           $scope.view.messageError = "User Exists";
                           $timeout(function(){
                              $scope.view.messageError = null;
                           }, 5000);
                           return;
                        
                        }else if(success.status < 400){
                           $scope.view.messageSuccess = "User added";

                           $timeout(function(){
                              $scope.view.messageSuccess = null;
                              $scope.closeThisDialog();
                              $scope.$parent.load();
                           }, 2000);

                           return;

                        }else{
                           // Error to display on page
                           $log.log(success);
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.messageError = success.data.error.message;
                           }
                           else {
                              $scope.view.messageError = success.data;
                              
                           }
                           $timeout(function(){
                              $scope.view.messageError = null;
                           }, 5000);
                        }
                     });

                  }

                  $scope.closeThisDialog = function(){
                     ngDialog.close();
                  }

              
               }],
               data: {view: $scope.view, updateGroupsArray:$scope.updateGroupsArray}
            });

         }


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