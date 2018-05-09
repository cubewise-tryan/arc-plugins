
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("usersGroups", "Users and Groups", "page", {
        menu: "administration",
        icon: "fa-sitemap",
        description: "This plugin adds the users and groups administration page.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "0.6.0"
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

            // First part of URL is the encoded instance name and then REST API URL (excluding api/v1/)
            var usersWithGroupsURL = "/Users?$expand=Groups";
            $http.get(encodeURIComponent($scope.instance) + usersWithGroupsURL).then(function(success,error){
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

            var groupsURL = "/Groups";
            $http.get(encodeURIComponent($scope.instance) + groupsURL).then(function(success,error){
               if(success.status == 401){
                  $scope.reload = true;
                  return;
               }else if(success.status < 400){
                  $scope.Groups = success.data.value;

                  $scope.selectedGroup = undefined;
                  //ui-typeahead requires a ng-model value, although empty

               }else{
                  //error to display on page
                  if(success.data && success.data.error && success.data.error.message){
                     $scope.message =  success.data.error.message;

                  }else{
                     $scope.message = success.data;
                  }
               }
               $timeout(function(){
                  $scope.message = null;
               },5000);
            });

         };
         // Load for first time: usersWithGroups, Groups
         $scope.load();


         $scope.editUser = function(rowIndex){
            ngDialog.open({
               template: "__/plugins/users-groups/editUser.html",
               className: "ngdialog-theme-default large",
               // scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     name : $scope.ngDialogData.usersWithGroups[rowIndex].Name,
                     alias : $scope.ngDialogData.usersWithGroups[rowIndex].FriendlyName,
                     active: $scope.ngDialogData.usersWithGroups[rowIndex].IsActive,
                     message:''
                  }

                  $scope.disconnectUser = function(userName){
                     var url = "/Users('" + userName + "')/tm1.Disconnect";
                     var data = {
                     }

                     $http.post(encodeURIComponent($scope.ngDialogData.instance) + url, data).then(function(success,error){
                        $log.log('success');
                        $log.log(success);
                        $log.log('error');
                        $log.log(error);

                        if(success.status == 401){
                           return;
                        }else if(success.status < 400){
                           //success, user disconnected
                           $scope.view.active = false;

                        }else{
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.message = success.data.error.message;
                           }
                           else {
                              $scope.view.message = success.data;
                           }

                           $timeout(function(){
                              $scope.view.message = null;
                           }, 5000);
                        }


                     })

                  }


                  $scope.updatePassword = function(password){
                     //work in progress...
                  }

                  $scope.updateUser = function(){
                     // work in progress....
                     $scope.closeThisDialog();
                  }
              
               }],
               data: {usersWithGroups: $scope.usersWithGroups, view: $scope.view, instance:$scope.instance}
            });

         }


         $scope.generateHSLColour = function (string) {
            //HSL refers to hue, saturation, lightness
            var styleObject = {
               "background-color":""
            };
            //for ngStyle format

            var hash = 0;
            var saturation = "30";
            var lightness = "80";

            for (var i = 0; i < string.length; i++) {
               hash = string.charCodeAt(i) + ((hash << 5) - hash);
            }
         
            var h = hash % 360;
            styleObject["background-color"] = 'hsl(' + h + ', ' + saturation + '%, '+ lightness + '%)';

            return styleObject;
        };

        //used in addUser, addUserToGroup
        $scope.updateGroupsArray = function(newGroup, previousGroups){
            var array = [];
            var arrayElement = "Groups('" + newGroup + "')";
            array.push(arrayElement);

            if(typeof previousGroups !== 'undefined'){
               for(var i=0; i < previousGroups.length; i++){
                  arrayElement = "Groups('" + previousGroups[i].Name + "')";
                  array.push(arrayElement)
               }
            }

            return array;
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
                  }

                  $scope.createUser = function(){
                     var url = "/Users";
                     var data = {
                        "Name" : $scope.view.name,
                        "Groups@odata.bind": $scope.ngDialogData.updateGroupsArray($scope.view.groups)
                     }
                     $http.post(encodeURIComponent($scope.$parent.instance) + url, data).then(function(success,error){
                        if(success.status == 401){
                           $scope.view.message = "User Exists";
                           $timeout(function(){
                              $scope.view.message = null;
                           }, 5000);
                           return;
                        
                        }else if(success.status < 400){
                           $scope.view.message = "User added";

                           $timeout(function(){
                              $scope.view.message = null;
                              $scope.closeThisDialog();
                              $scope.ngDialogData.load();
                           }, 2000);

                           return;

                        }else{
                           // Error to display on page
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.message = success.data.error.message;
                           }
                           else {
                              $scope.view.message = success.data;
                              
                           }
                           $timeout(function(){
                              $scope.view.message = null;
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
            var url = "/Users('"+ user + "')/Groups?$id=Groups('" + group + "')";
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


         $scope.addUserToGroup = function(user, newGroup, previousGroups){
            //patching, replaces the set of group relationships. Need to add previous groups
            var url = "/Users('" + user + "')";
            var data ={
               "Name": user,
               "Groups@odata.bind": $scope.updateGroupsArray(newGroup, previousGroups)
            }

            $http.patch(encodeURIComponent($scope.instance)+url,data).then(function(success, error){
               $log.log(success);
               $log.log(error);

               if(success.status == 401){
                  $scope.reload = true;
                  $scope.message = null;

                  return;

               }else if(success.status < 400){
                  //success
                  $scope.load();

                  $scope.message = "User added to Group";
                  $timeout(function(){
                     $scope.message = null;
                  },5000);

                  return;

               }else{
                  if(success.data && success.data.error && success.data.error.message){
                     $scope.message = success.data.error.message;

                  }else{


                  }
                  $timeout(function(){
                     $scope.message = null;
                  },5000);

                  
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