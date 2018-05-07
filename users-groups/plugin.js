
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
            // var queryGetUsersWithGroups = "/Users?$expand=Groups($filter=Name ne '}tp_Everyone')";
            var queryGetUsersWithGroups = "/Users?$expand=Groups";
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


         $scope.viewGroups = function(groupName){
            $scope.selectedTab = 1;
            $log.log($scope.selectedTab);
            $log.log(groupName);
         }


         $scope.getRandomColour = function () {
            return {
               'background-color': '#' + Math.floor(Math.random()*16777215).toString(16)
           }
        };


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
                              $scope.ngDialogData.load();
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
               data: {view: $scope.view, updateGroupsArray:$scope.updateGroupsArray, load: $scope.load}
            });

         }


         $scope.removeUserFromGroup = function(user, group){
            // https://localhost:8111/api/v1/Users('dd')/Groups?$id=Groups('Asia')
            var url = "/Users('"+ user + "')/Groups?$id=Groups('" + group + "')";
            $log.log(url);
            // var data = {
               // "Name" : $scope.view.name,
               // "Groups@odata.bind":$scope.dataParameter
            // }
            $http.delete(encodeURIComponent($scope.instance) + url).then(function(success,error){
               if(success.status == 401){
                  $scope.message = "User Does not Exist";
                  $timeout(function(){
                     $scope.message = null;
                  }, 5000);
                  return;
               
               }else if(success.status < 400){
                  $scope.message = "User removed from Group";
                  $scope.load();

                  $timeout(function(){
                     $scope.message = null;
                  }, 2000);

                  return;

               }else{
                  // Error to display on page
                  $log.log(success);
                  if(success.data && success.data.error && success.data.error.message){
                     $scope.message = success.data.error.message;
                  }
                  else {
                     $scope.message = success.data;
                     
                  }
                  $timeout(function(){
                     $scope.messageError = null;
                  }, 5000);
               }
            });
         }


         $scope.$on("login-reload", function(event, args) {
               // Check that instance in args matches your $scope
               if(args.instance === $scope.instance && $scope.reload){
                  load();
               }
         });


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


         $scope.$on("close-tab", function(event, args) {
               $log.log('in close tab function');
               $log.log(args);

               // Event to capture when a user has clicked close on the tab
               if(args.page == "usersGroups" && args.instance == $scope.instance && args.name == null){
                  // The page matches this one so close it
                  $rootScope.close(args.page, {instance: $scope.instance});
               }
         });


         $scope.$on("$destroy", function(event){
               // Cancel the timeout and any other resources
               clearTimeout($scope.loadTimeout);
         });
        

        }]
    };
});