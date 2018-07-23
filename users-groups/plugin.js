arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("usersGroups", "Users and Groups", "page", {
        menu: "administration",
        icon: "fa-users",
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
      controller: ["$scope", "$rootScope", "$http", "$timeout", "$tm1", "$dialogs", "$helper", "$log", "ngDialog", "$translate", "$q", function ($scope, $rootScope, $http, $timeout, $tm1, $dialogs, $helper, $log, ngDialog, $translate, $q) {

         $scope.selections = {
            filterUser : "",
            filterGroup : "",
            filterApplication : "",
            filterCube : "",
            filterDimension : "",
            filterProcess : "",
            filterChore : "",
            filterGroupGroup : "",
            filterGroupUser : "",
            filterUser : ""
         };

         $rootScope.uiPrefs.groupsDisplayNumber = 20;
         //for testing make 2, as test model does not have enough groups. Later make default 20
         $rootScope.uiPrefs.usersDisplayNumber = 20;
         //for testing make 2, as test model does not have enough groups. Later make default 20

         $scope.load = function(){
            $scope.reload = false;

            // First part of URL is the encoded instance name and then REST API URL (excluding api/v1/)
            $scope.buildUsersWithGroups = function(){
               var deferred = $q.defer();

               var usersWithGroupsURL = "/Users?$expand=Groups";
               $http.get(encodeURIComponent($scope.instance) + usersWithGroupsURL).then(function(success,error){
                  if(success.status == 401){
                     // Set reload to true to refresh after the user logs in
                     $scope.reload = true;
                     deferred.reject(success.data);
                  
                  }else if(success.status < 400){
                     $scope.usersWithGroups = success.data.value;
   
                     //retrieve user display name
                     var displayAllMDXDetailURL = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                     var mdx = "SELECT NON EMPTY {[}ElementAttributes_}Clients].[}TM1_DefaultDisplayValue]} ON COLUMNS, NON EMPTY {TM1SUBSETALL([}Clients])}ON ROWS FROM [}ElementAttributes_}Clients]";
                     var data = {
                        "MDX": mdx
                     }
                     $http.post(encodeURIComponent($scope.instance) + displayAllMDXDetailURL, data).then(function(success, error){
                        if(success.status == 401){
                           // Set reload to true to refresh after the user logs in
                           $scope.reload = true;
                           deferred.reject(success.data);
                           // return;
   
                        }else if(success.status < 400){
                           var options = {
                              alias: {},
                              suppressZeroRows: 1,
                              suppressZeroColumns: 1,
                              maxRows: 50
                           };
                           var cubeName = "}ElementAttributes_}Clients";
   
                           $scope.result = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);
      
                           //add properties to object to control number of display groups and user display name
                           for(var i = 0; i < $scope.usersWithGroups.length; i++){
                              $scope.usersWithGroups[i].groupsMax = $scope.usersWithGroups[i].Groups.length;
                              $scope.usersWithGroups[i].groupsDisplay = $rootScope.uiPrefs.groupsDisplayNumber;
      
                              $scope.usersWithGroups[i].groupsRemaining = $scope.usersWithGroups[i].groupsMax - $rootScope.uiPrefs.groupsDisplayNumber;
                              if($scope.usersWithGroups[i].groupsRemaining < 0){$scope.usersWithGroups[i].groupsRemaining = 0};
      
                              if(typeof $scope.result.metadata["}Clients"][$scope.usersWithGroups[i].Name] !== "undefined"){
                                 $scope.usersWithGroups[i].displayName = $scope.result.metadata["}Clients"][$scope.usersWithGroups[i].Name].attributes["}TM1_DefaultDisplayValue"];
                              }else{
                                 $scope.usersWithGroups[i].displayName = $scope.usersWithGroups[i].Name;
                              }
                              
                              $scope.usersWithGroups[i].displayNamePrevious = $scope.usersWithGroups[i].displayName;
                           }
                           // $log.log($scope.usersWithGroups);
   
                           deferred.resolve();

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
                           deferred.reject(success.data);
                        }
   
   
                     });
   
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
                     deferred.reject(success.data);
                  }
               });

               return deferred.promise;
            }

            $scope.buildGroupsWithUsers = function(){
               var deferred = $q.defer();

               var groupsWithUsersURL = "/Groups?$expand=Users";
               $http.get(encodeURIComponent($scope.instance) + groupsWithUsersURL).then(function(success,error){
                  if(success.status == 401){
                     // Set reload to true to refresh after the user logs in
                     $scope.reload = true;
                     return;
                  
                  }else if(success.status < 400){
                     $scope.groupsWithUsers = success.data.value;
   
                     //add properties to object to control number of display users
                     for(var i = 0; i < $scope.groupsWithUsers.length; i++){
                        $scope.groupsWithUsers[i].usersMax = $scope.groupsWithUsers[i].Users.length;
                        $scope.groupsWithUsers[i].usersDisplay = $rootScope.uiPrefs.usersDisplayNumber;
   
                        $scope.groupsWithUsers[i].usersRemaining = $scope.groupsWithUsers[i].usersMax - $rootScope.uiPrefs.usersDisplayNumber;
                        if($scope.groupsWithUsers[i].usersRemaining < 0){$scope.groupsWithUsers[i].usersRemaining = 0};
   
                     }
                     // $log.log($scope.groupsWithUsers);

                     deferred.resolve(true);
   
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

               return deferred.promise;
            }


            $scope.crossMapping = function(){
               //maps indexes of usersWithGroups to groupsWithUsers and vice versa
               for(var i = 0; i < $scope.usersWithGroups.length; i++){
                  for(var j = 0; j < $scope.usersWithGroups[i].Groups.length; j++){
                     var groupName = $scope.usersWithGroups[i].Groups[j].Name;
                     var groupIndex = _.findIndex($scope.groupsWithUsers, function(k){
                        return k.Name === groupName
                     });
                     $scope.usersWithGroups[i].Groups[j].groupsWithUsersIndex = groupIndex;

                  }
               }
   
               for(var l = 0; l < $scope.groupsWithUsers.length; l++){
                  for(var m = 0; m < $scope.groupsWithUsers[l].Users.length; m++){
                     var userName = $scope.groupsWithUsers[l].Users[m].Name;
                     var userIndex = _.findIndex($scope.usersWithGroups, function(n){
                        return n.Name === userName
                     });
                     $scope.groupsWithUsers[l].Users[m].usersWithGroupsIndex = userIndex;
                  }
               }

            }

            $scope.buildMain = function(){
               $scope.buildUsersWithGroups()
                  .then($scope.buildGroupsWithUsers)
                  .then($scope.crossMapping)
                  .catch(function(response){
                     $log.log(response);
                  })
            };
            $scope.buildMain();

            var applicationsURL = "/Contents('Applications')?$select=Name&$expand=tm1.Folder/Contents($expand=tm1.Folder/Contents($expand=tm1.Folder/Contents($expand=tm1.Folder/Contents($expand=tm1.Folder/Contents($expand=tm1.Folder/Contents($expand=tm1.Folder/Contents($expand=tm1.Folder/Contents($expand=tm1.Folder/Contents($expand=tm1.Folder/Contents)))))))))";
            //at time of writing REST API does not support $levels for recursive call = for now make 10 levels deep
            $http.get(encodeURIComponent($scope.instance) + applicationsURL).then(function(success,error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  //array for all application entities, used for dropdown list
                  $scope.applicationsList = [];
                  //object which tracks each element with their children, used to handle cases where a parent is given READ and the children also then needs to be given access
                  $scope.applicationsListWithChildren = {};
                  //object which tracks each element with their parents, used to handle cases where a child is given READ and their parents also then needs to be given access
                  $scope.applicationsListWithParents = {};

                  var parent = "";

                  var buildString = function(previous, current){
                     if(previous==""){
                        return current;
                     }else{
                        return previous + "\\" + current ;
                     }
                  }

                  var recursivelyBuildList = function myself(retrievedObject, previousParentName){
                     _.each(retrievedObject, function(nestedObject){
                        var fullString = buildString(previousParentName, nestedObject.ID);

                        $scope.applicationsList.push(
                           {Name : fullString}
                        );

                        if(nestedObject.hasOwnProperty("Contents")){
                           myself(nestedObject.Contents, fullString);
                        }else{
                           return;
                        }

                     });

                  };
                  recursivelyBuildList(success.data.Contents, parent);
                  // $scope.applicationsList.push({Name: "}Applications"});
                  

                  for(var i=0; i<$scope.applicationsList.length; i++){
                     if(!$scope.applicationsListWithChildren.hasOwnProperty($scope.applicationsList[i].Name)){
                        $scope.applicationsListWithChildren[$scope.applicationsList[i].Name] = [];
                     }
                     if(!$scope.applicationsListWithParents.hasOwnProperty($scope.applicationsList[i].Name)){
                        $scope.applicationsListWithParents[$scope.applicationsList[i].Name] = [];
                     }
                  }


                  for(var i=0; i<$scope.applicationsList.length; i++){
                     var allLevels = _.split($scope.applicationsList[i].Name,"\\");
                     
                     var level = "";
                     for(var j = 0; j < allLevels.length; j++){
                        if(level!==""){
                           level = level + "\\" + allLevels[j];
                        }else{
                           level = allLevels[j];
                        }

                        $scope.applicationsListWithChildren[level].push($scope.applicationsList[i].Name);
                        $scope.applicationsListWithParents[$scope.applicationsList[i].Name].push(level);

                     }   
                  
                  }



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

            var cubesURL = "/Cubes?$select=Name";
            $http.get(encodeURIComponent($scope.instance) + cubesURL).then(function(success,error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  $scope.cubesList = success.data.value;

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
            
            var dimensionsURL = "/Dimensions?$select=Name";
            $http.get(encodeURIComponent($scope.instance) + dimensionsURL).then(function(success,error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  $scope.dimensionsList = success.data.value;

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


            var processesURL = "/Processes?$select=Name";
            $http.get(encodeURIComponent($scope.instance) + processesURL).then(function(success,error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  $scope.processesList = success.data.value;

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


            var choresURL = "/Chores?$select=Name";
            $http.get(encodeURIComponent($scope.instance) + choresURL).then(function(success,error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  $scope.choresList = success.data.value;

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

            //for }Capabilities
            var capabilitiesURL = "/Dimensions('}Features')?$expand=DefaultHierarchy($expand=Elements)";
            $http.get(encodeURIComponent($scope.instance) + capabilitiesURL).then(function(success,error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  $scope.capabilitiesList = [];
                  _.forEach(success.data.DefaultHierarchy.Elements, function(featureObj){
                     $scope.capabilitiesList.push({Name : featureObj.Name});
                     // $scope.capabilitiesList.push(featureObj.Name);
                  });


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

            var securityCubesURL = "/Cubes?$select=Name&$filter=contains(Name,'}ElementSecurity')";
            $http.get(encodeURIComponent($scope.instance) + securityCubesURL).then(function(success,error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  $scope.securityCubesObj = {};
                  _.forEach(success.data.value, function(featureObj){
                     $scope.securityCubesObj[featureObj.Name] = true;
                  });

                  return;

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
         $scope.load();




         $scope.updateUserDisplayName = function(userName, newDisplayName){
            var url = "/Cubes('}ElementAttributes_}Clients')/tm1.Update";
            var data = {
               "Cells" : [
                  {"Tuple@odata.bind": [
                     "Dimensions('}Clients')/DefaultHierarchy/Elements('" + userName +"')",
                     "Dimensions('}ElementAttributes_}Clients')/DefaultHierarchy/Elements('}TM1_DefaultDisplayValue')"
                     ]
                  }
               ],
               "Value" : newDisplayName
            } 

            $http.post(encodeURIComponent($scope.instance) + url, data).then(function(success, error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  //success
                  return;

               }else{
                  if(success.data.error.code == 285){
                     //duplicate alias assignments
                     var currentUserNameIndex = _.findIndex($scope.usersWithGroups, function(i){
                        return i.Name === userName;
                     });
                     
                     var duplicateUserDisplayNames = _.filter($scope.usersWithGroups, function(j){
                        if(j.displayName == newDisplayName){
                           return j.Name;
                        }
                     });

                     var duplicateUserDisplayNamesString = _.map(duplicateUserDisplayNames, "Name").join(" , ");
                     $scope.message = $translate.instant("WARNINGDUPLICATEDISPLAYNAMES") + duplicateUserDisplayNamesString;

                     $scope.usersWithGroups[currentUserNameIndex].displayName = $scope.usersWithGroups[currentUserNameIndex].displayNamePrevious;

                     $scope.messageWarning = true;
                     $timeout(function(){
                        $scope.message = null;
                        $scope.messageWarning = null;
                     }, 5000);

                  }
                  // other Error to display on page
                  else if(success.data && success.data.error && success.data.error.message){
                     $scope.message = success.data.error.message;
                  }
                  else {
                     $scope.message = success.data;
                  }
                  $scope.messageWarning = true;

                  $timeout(function(){
                     $scope.message = null;
                     $scope.messageWarning = null;
                  }, 5000);

               }

            })
         }

         $scope.changePassword = function(userName){
            var confirmMessage = $translate.instant("EDITPASSWORDCONFIRMMESSAGE") + userName + "?";
            $dialogs.confirm(confirmMessage, changeUserPassword);

            function changeUserPassword(){
              var dialog =  ngDialog.open({
                  template: "__/plugins/users-groups/changePassword.html",
                  className: "ngdialog-theme-default small",
                  scope: $scope,
                  controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
    
                     $scope.view = {
                        name : userName,
                        password: "",
                        hidePassword: true,
                        message:"",
                        messageSuccess : false,
                        messageWarning : false
                     }
   

                     $scope.updatePassword = function(userName, password){
                        var url = "/Users('" + userName + "')";
                        var data = {
                           "Password" : password
                        };
            
                        $http.patch(encodeURIComponent($scope.instance) + url, data).then(function(success, error){
                           if(success.status == 401){
                              return;
            
                           }else if(success.status < 400){
                              $scope.view.message = $translate.instant("EDITUSERPASSWORDSUCCESS");
                              $scope.view.messageSuccess = true;
                              $timeout(function(){
                                 $scope.view.message = null;
                                 $scope.view.messageSuccess = null;
                                 $scope.closeThisDialog();
                              }, 1000);
            
                           }else{
                              if(success.data && success.data.error && success.data.error.message){
                                 $scope.view.message = success.data.error.message;
                              }else{
                                 $scope.view.message = success.data;
                              }
                              $scope.view.messageWarning = true;
                           }

                        });
                     }
                  }],
                  data: {
                     usersWithGroups : $scope.usersWithGroups,
                     view : $scope.view,
                     instance : $scope.instance,
                     message : $scope.message
                  }
               });


            }
         }


         $scope.auditUser = function(rowIndex){
            ngDialog.open({
               template: "__/plugins/users-groups/auditUser.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     name : $scope.ngDialogData.usersWithGroups[rowIndex].Name,
                     alias : $scope.ngDialogData.usersWithGroups[rowIndex].displayName,
                     active: $scope.ngDialogData.usersWithGroups[rowIndex].IsActive,
                     password: "",
                     groups: $scope.ngDialogData.usersWithGroups[rowIndex].Groups,
                     message:""
                  }


                  $scope.updatePassword = function(userName, password){
                     var url = "/Users('" + userName + "')";
                     var data = {
                        "Password" : password
                     };

                     $http.patch(encodeURIComponent($scope.ngDialogData.instance) + url, data).then(function(success, error){
                        if(success.status == 401){
                           return;

                        }else if(success.status < 400){
                           //success
                           $scope.view.message = $translate.instant("FUNCTIONEDITUSERSUCCESS");
                           $scope.view.messageSuccess = true;

                        }else{
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.message = success.data.error.message;
                           }else{
                              $scope.view.message = success.data;
                           }
                           $scope.view.messageWarning = true;
                        }

                     });

                  }


                  $scope.updateUser = function(userName, aliasName, password){
                     if(password){
                        $scope.updatePassword(userName, password);
                     }
                     if(aliasName){
                        $scope.updateUserDisplayName(userName, aliasName);
                        $scope.ngDialogData.usersWithGroups[rowIndex].displayName = aliasName;
                     }
                     $timeout(function(){
                        $scope.view.message = null;
                        $scope.closeThisDialog();
                     }, 1000);
                  }
              

                  $scope.getApplicationSecurityPerUser = function(){
                     var applicationSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}ApplicationSecurity'; });
                     if(typeof applicationSecurityExists !== "undefined"){
                        var groupsMDX = $scope.ngDialogData.groupsArrayToGroupsMDX($scope.view.groups);

                        if(typeof groupsMDX !== "undefined"){
                           var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                           var mdx = "SELECT " + groupsMDX + " ON COLUMNS, {TM1SUBSETALL( [}ApplicationEntries] )} ON ROWS FROM [}ApplicationSecurity]"
                           var data = { 
                              "MDX" : mdx
                            };
                            
                           $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                              if(success.status == 401){
                                 // Set reload to true to refresh after the user logs in
                                 $scope.reload = true;
                                 return;
                              
                              }else if(success.status < 400){
                                 var options = {
                                    alias: {},
                                    suppressZeroRows: 0,
                                    suppressZeroColumns: 0,
                                    maxRows: 50
                                 };
                                 var cubeName = "}ApplicationSecurity";
                                 $scope.applicationSecurityResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);
      
                                 $scope.applications = [];
                                 for(var i = 0; i < $scope.applicationSecurityResult.rows.length; i++){
                                    var item = {
                                       name : "",
                                       groupsWithAccess : []
                                    }
                                    item.name = $scope.applicationSecurityResult.rows[i]["}ApplicationEntries"].name;
      
                                    for(var j = 0; j < $scope.applicationSecurityResult.rows[i].cells.length; j++){
                                       var group = {
                                          name:"",
                                          access:""
                                       };
   
                                       group.name = $scope.applicationSecurityResult.rows[i].cells[j].key;
                                       group.access = $scope.applicationSecurityResult.rows[i].cells[j].value;
                                       if(group.access===""){
                                          group.access = "READ";
                                       }
                                       item.groupsWithAccess.push(group);
                                       
                                    }
   
                                    $scope.applications.push(item);
                                 }
                                 $log.log($scope.applications);
   
                              }else{
                                 if(success.data && success.data.error && success.data.error.message){
                                    $scope.view.message = success.data.error.message;
                                 }else{
                                    $scope.view.message = success.data;
                                 }
                                 $scope.view.messageWarning = true;
      
                              }
      
                           })
                        }
                     }


                  }
                  $scope.getApplicationSecurityPerUser();
                  $scope.applicationFilter = function(application, index){
                     if(!$scope.selections.filterApplication){
                        return true;
                     }else{
                        if(application.name.toLowerCase().indexOf($scope.selections.filterApplication.toLowerCase())!==-1){
                           return true;
                        }else{
                           return false;
                        }
                     }
                  }


                  $scope.getCubeSecurityPerUser = function(){
                     var cubeSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}CubeSecurity'; });
                     if(typeof cubeSecurityExists !== "undefined"){
                        var groupsMDX = $scope.ngDialogData.groupsArrayToGroupsMDX($scope.view.groups);

                        if(typeof groupsMDX != "undefined"){
                           var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                           var mdx = "SELECT NON EMPTY" + groupsMDX + "ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}Cubes] )} ON ROWS FROM [}CubeSecurity]"
                           var data = { 
                              "MDX" : mdx
                            };
                            
                           $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                              if(success.status == 401){
                                 // Set reload to true to refresh after the user logs in
                                 $scope.reload = true;
                                 return;
                              
                              }else if(success.status < 400){
                                 var options = {
                                    alias: {},
                                    suppressZeroRows: 1,
                                    suppressZeroColumns: 1,
                                    maxRows: 50
                                 };
                                 var cubeName = "}CubeSecurity";
                                 $scope.cubeSecurityResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);
      
                                 $scope.cubes = [];
                                 for(var i = 0; i < $scope.cubeSecurityResult.rows.length; i++){
                                    var item = {
                                       name : "",
                                       groupsWithAccess : []
                                    }
      
                                    item.name = $scope.cubeSecurityResult.rows[i]["}Cubes"].name;
      
                                    for(var j = 0; j < $scope.cubeSecurityResult.rows[i].cells.length; j++){
                                       var group = {
                                          name:"",
                                          access:""
                                       };
                                       if($scope.cubeSecurityResult.rows[i].cells[j].value){
                                          group.name = $scope.cubeSecurityResult.rows[i].cells[j].key;
                                          group.access = $scope.cubeSecurityResult.rows[i].cells[j].value;
                                          item.groupsWithAccess.push(group);
                                       }
                                       
                                    }
      
                                    $scope.cubes.push(item);
                                 }
      
                              }else{
                                 if(success.data && success.data.error && success.data.error.message){
                                    $scope.view.message = success.data.error.message;
                                 }else{
                                    $scope.view.message = success.data;
                                 }
                                 $scope.view.messageWarning = true;
      
                              }
      
                           })
   
                        }
                     }
                  }
                  $scope.getCubeSecurityPerUser();
                  $scope.cubeFilter = function(cube, index){
                     if(!$scope.selections.filterCube){
                        return true;
                     }else{
                        if(cube.name.toLowerCase().indexOf($scope.selections.filterCube.toLowerCase())!==-1){
                           return true;
                        }else{
                           return false;
                        }
                     }
                  }


                  $scope.getDimesionSecurityPerUser = function(){
                     var dimensionSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}DimensionSecurity'; });
                     if(typeof dimensionSecurityExists !== "undefined"){
                        var groupsMDX = $scope.ngDialogData.groupsArrayToGroupsMDX($scope.view.groups);

                        if(typeof groupsMDX !== "undefined"){
                           var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                           var mdx = "SELECT NON EMPTY" + groupsMDX + "ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}Dimensions] )} ON ROWS FROM [}DimensionSecurity]"
                           var data = { 
                              "MDX" : mdx
                            };
                            
                           $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                              if(success.status == 401){
                                 // Set reload to true to refresh after the user logs in
                                 $scope.reload = true;
                                 return;
                              
                              }else if(success.status < 400){
                                 var options = {
                                    alias: {},
                                    suppressZeroRows: 1,
                                    suppressZeroColumns: 1,
                                    maxRows: 50
                                 };
                                 var cubeName = "}DimensionSecurity";
                                 $scope.dimensionSecurityResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);
      
                                 $scope.dimensions = [];
                                 for(var i = 0; i < $scope.dimensionSecurityResult.rows.length; i++){
                                    var item = {
                                       name : "",
                                       securityCube:false,
                                       groupsWithAccess : []
                                    }
                                    item.name = $scope.dimensionSecurityResult.rows[i]["}Dimensions"].name;
      
                                    if($scope.securityCubesObj["}ElementSecurity_"+item.name]){
                                       item.securityCube = true;
                                    }

                                    for(var j = 0; j < $scope.dimensionSecurityResult.rows[i].cells.length; j++){
                                       var group = {
                                          name:"",
                                          access:""
                                       };

                                       if($scope.dimensionSecurityResult.rows[i].cells[j].value){
                                          group.name = $scope.dimensionSecurityResult.rows[i].cells[j].key;
                                          group.access = $scope.dimensionSecurityResult.rows[i].cells[j].value;
                                          item.groupsWithAccess.push(group);
                                       }

                                          
                                    };
                                       
                                    
                                    $scope.dimensions.push(item);
                                 }
      
                              }else{
                                 if(success.data && success.data.error && success.data.error.message){
                                    $scope.view.message = success.data.error.message;
                                 }else{
                                    $scope.view.message = success.data;
                                 }
                                 $scope.view.messageWarning = true;
      
                              }
      
                           })
                        }

                     }
                  }
                  $scope.getDimesionSecurityPerUser();


                  $scope.cubeSelected = "";
                  $scope.getDimensionsPerCube = function(cubeName){
                     var url = "/Cubes('" + cubeName + "')?$expand=Dimensions($select=Name)";
                     $http.get(encodeURIComponent($scope.instance) + url).then(function(success, error){
                        if(success.status == 401){
                           // Set reload to true to refresh after the user logs in
                           $scope.reload = true;
                           return;
                        
                        }else if(success.status < 400){
                           $scope.dimensionsInCube = success.data.Dimensions;
                           
                           //trigger selected cube colour/filter change
                           if($scope.cubeSelected === cubeName){
                              $scope.cubeSelected = "";
                           }else{
                              $scope.cubeSelected = cubeName;
                           }

                        }else{
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.message = success.data.error.message;
                           }else{
                              $scope.view.message = success.data;
                           }
                           $scope.view.messageWarning = true;
                        }


                     });
                  }


                  $scope.dimensionFilter = function(dimension, index){
                     if($scope.cubeSelected.length || ($scope.cubeSelected.length && !$scope.selections.filterDimension.length)){
                        if($scope.dimensionsInCube){
                           for(var i = 0; i < $scope.dimensionsInCube.length; i++){
                              if($scope.dimensionsInCube[i].Name.toLowerCase().indexOf(dimension.name.toLowerCase())!==-1){
                                 return true;
                              }
                           }
                           return false;
   
                        }
                        else{
                           return true;
                        }

                     }else{
                        if(dimension.name.toLowerCase().indexOf($scope.selections.filterDimension.toLowerCase())!==-1){
                           return true;
                        }else{
                           return false;
                        }
                     }

                  }

                  $scope.getProcessSecurityPerUser = function(){
                     var processSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}ProcessSecurity'; });
                     if(typeof processSecurityExists !== "undefined"){
                        var groupsMDX = $scope.ngDialogData.groupsArrayToGroupsMDX($scope.view.groups);

                        if(typeof groupsMDX!== "undefined"){
                           var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                           var mdx = "SELECT NON EMPTY" + groupsMDX + "ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}Processes] )} ON ROWS FROM [}ProcessSecurity]"
                           var data = { 
                              "MDX" : mdx
                            };
                            
                           $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                              if(success.status == 401){
                                 // Set reload to true to refresh after the user logs in
                                 $scope.reload = true;
                                 return;
                              
                              }else if(success.status < 400){
                                 var options = {
                                    alias: {},
                                    suppressZeroRows: 1,
                                    suppressZeroColumns: 1,
                                    maxRows: 50
                                 };
                                 var cubeName = "}ProcessSecurity";
                                 $scope.processSecurityResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);
      
                                 $scope.processes = [];
                                 for(var i = 0; i < $scope.processSecurityResult.rows.length; i++){
                                    var item = {
                                       name : "",
                                       groupsWithAccess : []
                                    }
                                    item.name = $scope.processSecurityResult.rows[i]["}Processes"].name;
      
                                    for(var j = 0; j < $scope.processSecurityResult.rows[i].cells.length; j++){
                                       var group = {
                                          name:"",
                                          access:""
                                       };
                                       if($scope.processSecurityResult.rows[i].cells[j].value){
                                          group.name = $scope.processSecurityResult.rows[i].cells[j].key;
                                          group.access = $scope.processSecurityResult.rows[i].cells[j].value;
                                          item.groupsWithAccess.push(group);
                                       }
                                       
                                    }
                                    $scope.processes.push(item);
                                 }
                              }else{
                                 if(success.data && success.data.error && success.data.error.message){
                                    $scope.view.message = success.data.error.message;
                                 }else{
                                    $scope.view.message = success.data;
                                 }
                                 $scope.view.messageWarning = true;
      
                              }
      
                           })
   
                        }
                     }
                  }
                  $scope.getProcessSecurityPerUser();

                  $scope.processFilter = function(process, index){
                     if(!$scope.selections.filterProcess){
                        return true;
                     }else{
                        if(process.name.toLowerCase().indexOf($scope.selections.filterProcess.toLowerCase())!==-1){
                           return true;
                        }else{
                           return false;
                        }
                     }
                  }


                  $scope.getChoreSecurityPerUser = function(){
                     var choreSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}ChoreSecurity'; });
                     $log.log(choreSecurityExists);
                     if(typeof choreSecurityExists !== "undefined"){
                        var groupsMDX = $scope.ngDialogData.groupsArrayToGroupsMDX($scope.view.groups);

                        if(typeof groupsMDX !== "undefined"){
                           var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                           var mdx = "SELECT NON EMPTY " + groupsMDX + " ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}Chores] )} ON ROWS FROM [}ChoreSecurity]"
                           var data = { 
                              "MDX" : mdx
                            };
                            
                           $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                              if(success.status == 401){
                                 // Set reload to true to refresh after the user logs in
                                 $scope.reload = true;
                                 return;
                              
                              }else if(success.status < 400){
                                 var options = {
                                    alias: {},
                                    suppressZeroRows: 1,
                                    suppressZeroColumns: 1,
                                    maxRows: 50
                                 };
                                 var cubeName = "}ChoreSecurity";
                                 $scope.choreSecurityResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);
      
                                 $scope.chores = [];
                                 for(var i = 0; i < $scope.choreSecurityResult.rows.length; i++){
                                    var item = {
                                       name : "",
                                       groupsWithAccess : []
                                    }
                                    item.name = $scope.choreSecurityResult.rows[i]["}Chores"].name;
      
                                    for(var j = 0; j < $scope.choreSecurityResult.rows[i].cells.length; j++){
                                       var group = {
                                          name:"",
                                          access:""
                                       };
                                       if($scope.choreSecurityResult.rows[i].cells[j].value){
                                          group.name = $scope.choreSecurityResult.rows[i].cells[j].key;
                                          group.access = $scope.choreSecurityResult.rows[i].cells[j].value;
                                          item.groupsWithAccess.push(group);
                                       }
                                       
                                    }
                                    $scope.chores.push(item);
                                 }
                              }else{
                                 if(success.data && success.data.error && success.data.error.message){
                                    $scope.view.message = success.data.error.message;
                                 }else{
                                    $scope.view.message = success.data;
                                 }
                                 $scope.view.messageWarning = true;
      
                              }
      
                           })
                        }

                     }
                  }
                  $scope.getChoreSecurityPerUser();

                  $scope.choreFilter = function(chore, index){
                     if(!$scope.selections.filterChore){
                        return true;
                     }else{
                        if(chore.name.toLowerCase().indexOf($scope.selections.filterChore.toLowerCase())!==-1){
                           return true;
                        }else{
                           return false;
                        }
                     }
                  }

               }],
               data: {
                  usersWithGroups : $scope.usersWithGroups,
                  view : $scope.view,
                  instance : $scope.instance,
                  groupsArrayToGroupsMDX : $scope.groupsArrayToGroupsMDX
               }
            });

         }


         $scope.elementSecurity = function(userNamePassedIn, dimensionNamePassedIn, userGroupsPassedIn){
            ngDialog.open({
               template: "__/plugins/users-groups/elementSecurity.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     userName: userNamePassedIn,
                     dimensionName : dimensionNamePassedIn,
                     userGroups : userGroupsPassedIn,
                     userGroupsFilter : _.clone(userGroupsPassedIn),
                     elementsWithGroupsAndSecurity : [],
                     elementsWithGroupsAndSecurityFilter:[],
                     accessPrivelages:[],
                     elementRule:""
                  }


                  $scope.reloadGroups = function(){
                     $scope.view.userGroupsFilter = _.clone($scope.view.userGroups);
                  }
                  $scope.reloadElements = function(){
                     $scope.view.elementsWithGroupsAndSecurityFilter = _.clone($scope.view.elementsWithGroupsAndSecurity);
                  }

                  $scope.removeFromFilter = function(currentArray, itemToRemove){
                     var index = _.findIndex(currentArray, function(i){return i.name == itemToRemove.name;});
                     currentArray.splice(index, 1);
                  }

                  $scope.addToFilter = function(currentArray, itemToAdd){
                     currentArray.push(itemToAdd);
                     currentArray = _.uniqBy(currentArray, "name");
                  }

                  $scope.elementsArrayToElementsMDX = function(dimensionName, elementsArray){
                     var elementsMDX = "";
         
                     if(elementsArray.constructor === Array){   
                        if(elementsArray.length>0){
                              angular.forEach(elementsArray, function(value, key){
                                 elementsMDX = elementsMDX + "[" + dimensionName +"].[" + value.name + "],";
                              })
                              elementsMDX = "{" + elementsMDX.slice(0, -1) + "}";
                              return elementsMDX;
         
                        }
                     }else{
                        elemnetsMDX = "{[" + dimensionName + "].[" + elementsArray + "]}";
                        return elementsMDX;
                     }
         
         
                  }

                  $scope.removeAllUserGroups = function(){
                     var prompt = "Remove all filter Groups?";
                     $dialogs.confirmDelete(prompt, removeAll);

                     function removeAll(){
                        $scope.view.userGroupsFilter = [];
                     }

                  }

                  $scope.removeAllElements = function(){
                     var prompt = "Remove all filter Elements?";
                     $dialogs.confirmDelete(prompt, removeAll);

                     function removeAll(){
                        $scope.view.elementsWithGroupsAndSecurityFilter = [];
                     }

                  }


                  $scope.getElementSecurityPerGroup = function(dimensionName, userGroups, elementSelected){
                     var elementSecurityCube = "}ElementSecurity_" + dimensionName;
                     var elementSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === elementSecurityCube; });
                     if(typeof elementSecurityExists !== "undefined"){
                        var groupsMDX = $scope.ngDialogData.groupsArrayToGroupsMDX(userGroups);

                        if(typeof groupsMDX !== "undefined"){
                           var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                           
                           if(elementSelected === null){
                              var mdx = "SELECT NON EMPTY " + groupsMDX + " ON COLUMNS, NON EMPTY {[" + dimensionName + "].members}  ON ROWS FROM [" + elementSecurityCube + "]"
                           }else{
                              var elementsMDX = $scope.elementsArrayToElementsMDX(dimensionName, elementSelected);
                              var mdx = "SELECT NON EMPTY " + groupsMDX + " ON COLUMNS, NON EMPTY " + elementsMDX + "  ON ROWS FROM [" + elementSecurityCube + "]"
                           }
                           
                           var data = { 
                              "MDX" : mdx
                            };
                            
                           $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                              if(success.status == 401){
                                 // Set reload to true to refresh after the user logs in
                                 $scope.reload = true;
                                 return;
                              
                              }else if(success.status < 400){
                                 var options = {
                                    alias: {},
                                    suppressZeroRows: 1,
                                    suppressZeroColumns: 1,
                                    maxRows: 50
                                 };
                                 var cubeName = elementSecurityCube;
                                 $scope.elementSecurityResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);
      

                                 $scope.view.elementsWithGroupsAndSecurityFilter = [];
                                 $scope.view.accessPrivelages = [];

                                 for(var i = 0; i < $scope.elementSecurityResult.rows.length; i++){
                                    var item = {
                                       name : "",
                                       groupsWithAccess : []
                                    }
                                    item.name = $scope.elementSecurityResult.rows[i][dimensionName].name;
      
                                    for(var j = 0; j < $scope.elementSecurityResult.rows[i].cells.length; j++){
                                       var group = {
                                          name:"",
                                          access:""
                                       };
   
                                       group.name = $scope.elementSecurityResult.rows[i].cells[j].key;
                                       group.access = $scope.elementSecurityResult.rows[i].cells[j].value;
                                       if(group.access!==""){
                                          item.groupsWithAccess.push(group);
                                       }
                                       
                                    }
                                    
                                    if(elementSelected === null){
                                       $scope.view.elementsWithGroupsAndSecurity.push(item);
                                       $scope.view.elementsWithGroupsAndSecurityFilter.push(item);

                                    }else{
                                       $scope.view.elementsWithGroupsAndSecurityFilter.push(item);
                                    }
                                    
                                    $scope.view.accessPrivelages.push(item);
                                    

                                 }

                              }else{
                                 if(success.data && success.data.error && success.data.error.message){
                                    $scope.view.message = success.data.error.message;
                                 }else{
                                    $scope.view.message = success.data;
                                 }
                                 $scope.view.messageWarning = true;
      
                              }
      
                           })
                        }
                     }


                  }
                  $scope.getElementSecurityPerGroup($scope.view.dimensionName, $scope.view.userGroupsFilter, null);


                  $scope.refreshAccessPrivelages = function(){
                     $scope.getElementSecurityPerGroup($scope.view.dimensionName, $scope.view.userGroupsFilter, $scope.view.elementsWithGroupsAndSecurityFilter);
                  }


                  $scope.getTm1Rule = function(dimensionName, elementName, groupName){


                     var elementSecurityCube = "}ElementSecurity_" + dimensionName;
                     var elementSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === elementSecurityCube; });
                     if(typeof elementSecurityExists !== "undefined"){

                        var url = "/Cubes('" + elementSecurityCube + "')/tm1.TraceCellCalculation";
                        var data = {"Tuple@odata.bind": [
                           "Dimensions('}Groups')/DefaultHierarchy/Elements('" + groupName + "')",
                           "Dimensions('" + dimensionName + "')/DefaultHierarchy/Elements('" + elementName + "')"
                        ]}
                        
                        $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                           if(success.status == 401){
                              // Set reload to true to refresh after the user logs in
                              $scope.reload = true;
                              return;
                           
                           }else if(success.status < 400){
                              if(success.data.Statements.length>0){
                                 $scope.view.elementRule = success.data.Statements[0];
                              }else{
                                 $scope.view.elementRule = "No Rule";
                              }

                              $dialogs.alert("Rules on Element", $scope.view.elementRule);
                              return;

                           }else{
                              if(success.data && success.data.error && success.data.error.message){
                                 $scope.view.message = success.data.error.message;
                              }else{
                                 $scope.view.message = success.data;
                              }
                              $scope.view.messageWarning = true;
   
                           }
   
                        })

                     }

                  }



               }],
               data: {
                  view : $scope.view,
                  instance : $scope.instance,
                  groupsArrayToGroupsMDX : $scope.groupsArrayToGroupsMDX
               }
            });
         }


         $scope.groupsArrayToGroupsMDX = function(userGroupsArray){
            var groupsMDX = "";

            if(userGroupsArray.constructor === Array){   
               if(userGroupsArray.length>0){
                  if(userGroupsArray[0].hasOwnProperty("Name")){
                     angular.forEach(userGroupsArray, function(value, key){
                        groupsMDX = groupsMDX + "[}Groups].[" + value.Name + "],";
                     })
                     groupsMDX = "{" + groupsMDX.slice(0, -1) + "}";
                     return groupsMDX;
                  }else{
                     angular.forEach(userGroupsArray, function(value, key){
                        groupsMDX = groupsMDX + "[}Groups].[" + value.name + "],";
                     })
                     groupsMDX = "{" + groupsMDX.slice(0, -1) + "}";
                     return groupsMDX;
                  }

               }
            }else{
               groupsMDX = "{[}Groups].[" + userGroupsArray + "]}";
               return groupsMDX;
            }


         }



         $scope.settingsUser = function(rowIndex){
            ngDialog.open({
               template: "__/plugins/users-groups/settingsUser.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     name : $scope.ngDialogData.usersWithGroups[rowIndex].Name,
                     alias : $scope.ngDialogData.usersWithGroups[rowIndex].displayName,
                     active: $scope.ngDialogData.usersWithGroups[rowIndex].IsActive,
                     password: "",
                     groups: $scope.ngDialogData.usersWithGroups[rowIndex].Groups,
                     message:""
                  }


                  $scope.getClientPropertiesPerUser = function(userName){
                     var userMDX = "{[}Clients].[}Clients].[" + userName + "]}";
                     var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                     var mdx = "SELECT " + userMDX + "ON COLUMNS, { EXCEPT( {TM1SUBSETALL( [}ClientProperties] )}, { [}ClientProperties].[PASSWORD] }) } ON ROWS FROM [}ClientProperties]";

                     var data = { 
                        "MDX" : mdx
                      };
                      
                     $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                        $log.log(success);
                        if(success.status == 401){
                           // Set reload to true to refresh after the user logs in
                           $scope.reload = true;
                           return;
                        
                        }else if(success.status < 400){
                           var options = {
                              alias: {},
                              suppressZeroRows: 0,
                              suppressZeroColumns: 0,
                              maxRows: 50
                           };
                           var cubeName = "}ClientProperties";
                           $scope.clientPropertiesResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);
                           $log.log($scope.clientPropertiesResult);

                           $scope.clientProperties = [];
                           for(var i = 0; i < $scope.clientPropertiesResult.rows.length; i++){
                              var item = {
                                 name : "",
                                 value : "",
                                 isReadOnly : false
                              }
                              item.name = $scope.clientPropertiesResult.rows[i]["}ClientProperties"].name;
                              item.value = $scope.clientPropertiesResult.rows[i].cells[0].value;
                              if($scope.clientPropertiesResult.rows[i]["}ClientProperties"].name == "PasswordLastTimeUpdated"){
                                 item.isReadOnly = true;
                              }

                              $scope.clientProperties.push(item);
                           }

                        }else{
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.message = success.data.error.message;
                           }else{
                              $scope.view.message = success.data;
                           }
                           $scope.view.messageWarning = true;

                        }

                     })

                  }


                  $scope.updateClientProperty = function(userName, propertyName, newValue){
                     var url = "/Cubes('}ClientProperties')/tm1.Update ";
                     var data = {
                        "Cells" : [
                           {"Tuple@odata.bind": [
                              "Dimensions('}Clients')/DefaultHierarchy/Elements('" + userName +"')",
                              "Dimensions('}ClientProperties')/DefaultHierarchy/Elements('" + propertyName + "')"
                              ]
                           }
                        ],
                        "Value" : newValue
                     } 
         
                     $http.post(encodeURIComponent($scope.instance) + url, data).then(function(success, error){
                        if(success.status == 401){
                           // Set reload to true to refresh after the user logs in
                           $scope.reload = true;
                           return;
                        
                        }else if(success.status < 400){
                           //success
                           return;
         
                        }else{
                           // Error to display on page
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.message = success.data.error.message;
                           }
                           else {
                              $scope.message = success.data;
                           }
                           $scope.messageWarning = true;
         
                           $timeout(function(){
                              $scope.message = null;
                              $scope.messageWarning = null;
                           }, 5000);
         
                        }
         
                     })
                  }


                  $scope.getClientSettingsPerUser = function(userName){
                     var userMDX = "{[}Clients].[}Clients].[" + userName + "]}";
                     var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                     var mdx = "SELECT " + userMDX + "ON COLUMNS, {TM1SUBSETALL( [}ClientSettings] )} ON ROWS FROM [}ClientSettings]";

                     var data = { 
                        "MDX" : mdx
                      };
                      
                     $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                        $log.log(success);
                        if(success.status == 401){
                           // Set reload to true to refresh after the user logs in
                           $scope.reload = true;
                           return;
                        
                        }else if(success.status < 400){
                           var options = {
                              alias: {},
                              suppressZeroRows: 0,
                              suppressZeroColumns: 0,
                              maxRows: 50
                           };
                           var cubeName = "}ClientSettings";
                           $scope.clientSettingsResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);
                           $log.log($scope.clientSettingsResult);

                           $scope.clientSettings = [];
                           for(var i = 0; i < $scope.clientSettingsResult.rows.length; i++){
                              var item = {
                                 name : "",
                                 value : ""
                              }
                              item.name = $scope.clientSettingsResult.rows[i]["}ClientSettings"].name;
                              item.value = $scope.clientSettingsResult.rows[i].cells[0].value;

                              $scope.clientSettings.push(item);
                           }

                        }else{
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.message = success.data.error.message;
                           }else{
                              $scope.view.message = success.data;
                           }
                           $scope.view.messageWarning = true;

                        }

                     })

                  }

                  $scope.updateClientSetting = function(userName, settingName, newValue){
                     var url = "/Cubes('}ClientSettings')/tm1.Update ";
                     var data = {
                        "Cells" : [
                           {"Tuple@odata.bind": [
                              "Dimensions('}Clients')/DefaultHierarchy/Elements('" + userName +"')",
                              "Dimensions('}ClientSettings')/DefaultHierarchy/Elements('" + settingName + "')"
                              ]
                           }
                        ],
                        "Value" : newValue
                     } 
         
                     $http.post(encodeURIComponent($scope.instance) + url, data).then(function(success, error){
                        if(success.status == 401){
                           // Set reload to true to refresh after the user logs in
                           $scope.reload = true;
                           return;
                        
                        }else if(success.status < 400){
                           //success
                           return;
         
                        }else{
                           // Error to display on page
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.message = success.data.error.message;
                           }
                           else {
                              $scope.message = success.data;
                           }
                           $scope.messageWarning = true;
         
                           $timeout(function(){
                              $scope.message = null;
                              $scope.messageWarning = null;
                           }, 5000);
         
                        }
         
                     })
                  }


               }],
               data: {
                  usersWithGroups : $scope.usersWithGroups,
                  view : $scope.view,
                  instance : $scope.instance
               }
            });

         }


         $scope.includedInGroup = true;
         $scope.toggleIncludedInGroup = function(){
            $scope.includedInGroup = !$scope.includedInGroup;
         }


         $scope.listFilterUser = function(user) {
            if((!$scope.selections.filterUser || !$scope.selections.filterUser.length)
               && (!$scope.selections.filterGroup || !$scope.selections.filterGroup.length)
               //user and group blank
            ){
               return true;
            }else if($scope.selections.filterUser
                     && (!$scope.selections.filterGroup || !$scope.selections.filterGroup.length)){
               //user input, group is blank
               var filterUser = $scope.selections.filterUser.toLowerCase();
               if(user.Name.toLowerCase().indexOf(filterUser) !== -1
                  || (user.FriendlyName && user.FriendlyName.toLowerCase().indexOf(filterUser) !== -1 )){

                  return true;
               }

            }else if((!$scope.selections.filterUser || !$scope.selections.filterUser.length)
                     && $scope.selections.filterGroup){
               //user is blank, group has input
               var filterGroup = $scope.selections.filterGroup.toLowerCase();

               if(user.Groups){
                  if($scope.includedInGroup){
                     for(var i = 0; i < user.Groups.length; i++){
                        if(user.Groups[i].Name && user.Groups[i].Name.toLowerCase().indexOf(filterGroup)!== -1){
                           return true;
                        }
                     }
                  }else{
                     var containsFilterGroup = false;
                     for(var i = 0; i < user.Groups.length; i++){
                        if(user.Groups[i].Name && user.Groups[i].Name.toLowerCase().indexOf(filterGroup) == -1){
                           containsFilterGroup = true;
                        }else{
                           return false;
                        }
                     }
                     return containsFilterGroup;

                  }
               }
               

            }else{
               //both have input
               var filterUser = $scope.selections.filterUser.toLowerCase();
               if(user.Name.toLowerCase().indexOf(filterUser) !== -1
                  || (user.FriendlyName && user.FriendlyName.toLowerCase().indexOf(filterUser) !== -1 )){
                     var filterGroup = $scope.selections.filterGroup.toLowerCase();

                     if(user.Groups){
                        if($scope.includedInGroup){
                           for(var i = 0; i < user.Groups.length; i++){
                              if(user.Groups[i].Name && user.Groups[i].Name.toLowerCase().indexOf( filterGroup)!== -1){
                                 return true;
                              }
                           }
                        }else{
                           var containsFilterGroup = false;
                           for(var i = 0; i < user.Groups.length; i++){
                              if(user.Groups[i].Name && user.Groups[i].Name.toLowerCase().indexOf(filterGroup) == -1){
                                 containsFilterGroup = true;
                              }else{
                                 return false;
                              }
                           }
                           return containsFilterGroup;


                        }

                     }
                     

               }

            }

            return false;
         };


         $scope.showMoreGroups = function(userIndex){
            var step = $rootScope.uiPrefs.groupsDisplayNumber;
            $scope.usersWithGroups[userIndex].groupsDisplay = $scope.usersWithGroups[userIndex].groupsDisplay + step;
            if($scope.usersWithGroups[userIndex].groupsDisplay > $scope.usersWithGroups[userIndex].groupsMax){
               $scope.usersWithGroups[userIndex].groupsDisplay = $scope.usersWithGroups[userIndex].groupsMax;
            }
            $scope.usersWithGroups[userIndex].groupsRemaining = $scope.usersWithGroups[userIndex].groupsMax - $scope.usersWithGroups[userIndex].groupsDisplay;

            return true;
         }


         $scope.includedInGroupGroup = true;
         $scope.toggleIncludedInGroupGroup = function(){
            $scope.includedInGroupGroup = !$scope.includedInGroupGroup;
         }


         $scope.listFilterGroup = function(group) {
            if((!$scope.selections.filterGroupGroup || !$scope.selections.filterGroupGroup.length)
               && (!$scope.selections.filterGroupUser || !$scope.selections.filterGroupUser.length)
               //group and user blank
            ){
               return true;
            }else if($scope.selections.filterGroupGroup
                     && (!$scope.selections.filterGroupUser || !$scope.selections.filterGroupUser.length)){
               //group input, user is blank
               var filterGroupGroup = $scope.selections.filterGroupGroup.toLowerCase();
               if(group.Name.toLowerCase().indexOf(filterGroupGroup) !== -1
                  || (group.FriendlyName && group.FriendlyName.toLowerCase().indexOf(filterGroupGroup) !== -1 )){

                  return true;
               }

            }else if((!$scope.selections.filterGroupGroup || !$scope.selections.filterGroupGroup.length)
                     && $scope.selections.filterGroupUser){
               //group is blank, user has input
               var filterGroupUser = $scope.selections.filterGroupUser.toLowerCase();

               if(group.Users){
                  if($scope.includedInGroupGroup){
                     for(var i = 0; i < group.Users.length; i++){
                        if(group.Users[i].Name && group.Users[i].Name.toLowerCase().indexOf(filterGroupUser)!== -1){
                           return true;
                        }
                     }
                  }else{
                     var containsFilterUser = false;
                     for(var i = 0; i < group.Users.length; i++){
                        if(group.Users[i].Name && group.Users[i].Name.toLowerCase().indexOf(filterGroupUser) == -1){
                           containsFilterUser = true;
                        }else{
                           return false;
                        }
                     }
                     return containsFilterUser;

                  }
               }
               

            }else{
               //both have input
               var filterGroupGroup = $scope.selections.filterGroupGroup.toLowerCase();
               if(group.Name.toLowerCase().indexOf(filterGroupGroup) !== -1
                  || (group.FriendlyName && group.FriendlyName.toLowerCase().indexOf(filterGroupGroup) !== -1 )){
                     var filterGroupUser = $scope.selections.filterGroupUser.toLowerCase();

                     if(group.Users){
                        if($scope.includedInGroupGroup){
                           for(var i = 0; i < group.Users.length; i++){
                              if(group.Users[i].Name && group.Users[i].Name.toLowerCase().indexOf( filterGroupUser)!== -1){
                                 return true;
                              }
                           }
                        }else{
                           var containsFilterUser = false;
                           for(var i = 0; i < group.Users.length; i++){
                              if(group.Users[i].Name && group.Users[i].Name.toLowerCase().indexOf(filterGroupUser) == -1){
                                 containsFilterUser = true;
                              }else{
                                 return false;
                              }
                           }
                           return containsFilterUser;


                        }

                     }
                     

               }

            }

            return false;
         };


         $scope.generateHSLColour = function (string) {
            //HSL refers to hue, saturation, lightness
            var styleObject = {
               "background-color":"",
               "color":"white"
            };
            //for ngStyle format

            var hash = 0;
            var saturation = "50";
            var lightness = "50";

            for (var i = 0; i < string.length; i++) {
               hash = string.charCodeAt(i) + ((hash << 5) - hash);
            }
         
            var h = hash % 360;
            styleObject["background-color"] = 'hsl(' + h + ', ' + saturation + '%, '+ lightness + '%)';

            return styleObject;
         };


         $scope.securityAccessColourMapping = function (string){
            var accessColour = "";

            if(string === "ADMIN"){
               accessColour = "badge badge-danger"
            }else if(string === "WRITE"){
               accessColour = "badge badge-warning"
            }else if(string === "READ"){
               accessColour = "badge badge-info"
            }else if(string === "RESERVE"){
               accessColour = "badge badge-primary"
            }else if(string === "LOCK"){
               accessColour = "badge badge-info"
            }else if(string === "BLANK"){
               accessColour = "badge badge-warning"
            }else if(string === "GRANT"){
               accessColour = "badge badge-primary"
            }else if(string === "DENY"){
               accessColour = "badge badge-danger"
            }else{
               accessColour = "badge badge-light"
            }

            return accessColour;

         }


         $scope.updateGroupsArray = function(newGroup, previousGroups){
            var array = [];

            if(newGroup !== null){
               var arrayElement = "Groups('" + newGroup + "')";
               array.push(arrayElement);
            }

            if(typeof previousGroups !== "undefined"){
               for(var i=0; i < previousGroups.length; i++){
                  arrayElement = "Groups('" + previousGroups[i].Name + "')";
                  array.push(arrayElement)
               }
            }

            return array;
         }


         $scope.addUser = function(){
            var dialog = ngDialog.open({
               template: "__/plugins/users-groups/addUser.html",
               className: "ngdialog-theme-default medium",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     hidePassword : true,
                     message : "",
                     messageSuccess : false,
                     messageWarning : false
                  }

                  $scope.newUser = {
                     name : "",
                     alias : "",
                     password : "",
                     cloneUser : {
                        name : "",
                        groups : []
                     },
                     groupsAssigned : []
                  }

                  $scope.addCloneUserGroupsToNewUser = function(cloneUser){
                     var cloneUserIndex = _.findIndex($scope.usersWithGroups, function(i) { return i.Name == cloneUser.Name; });
                     $scope.newUser.groupsAssigned = _.union($scope.newUser.groupsAssigned, $scope.usersWithGroups[cloneUserIndex].Groups);
                     $scope.newUser.groupsAssigned = _.uniqBy($scope.newUser.groupsAssigned, "Name");
                  }

                  $scope.addIndividualGroupToNewUser = function(group){
                     if(_.filter($scope.newUser.groupsAssigned, function(o){return o.Name == group.Name}).length == 0 ){
                        $scope.newUser.groupsAssigned.push({Name:group.Name});
                     }
                  }

                  $scope.removeGroupFromNewUser = function(groupName){
                     var groupIndex = _.findIndex($scope.newUser.groupsAssigned, function(i){return i.Name == groupName;});
                     $scope.newUser.groupsAssigned.splice(groupIndex, 1);
                  }

                  $scope.updatePassword = function(){
                     var url = "/Users('" + $scope.newUser.name + "')";
                     var data = {
                        "Password" : $scope.newUser.password
                     };
         
                     $http.patch(encodeURIComponent($scope.instance) + url, data).then(function(success, error){
                        if(success.status == 401){
                           return;
         
                        }else if(success.status < 400){
                           $scope.view.message = $translate.instant("EDITUSERPASSWORDSUCCESS");
                           $scope.view.messageSuccess = true;
                           return;
         
                        }else{
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.message = success.data.error.message;
                           }else{
                              $scope.view.message = success.data;
                           }
                           $scope.view.messageWarning = true;
                        }

                     });
                  }

                  $scope.createUser = function(){
                     var userExists = _.findIndex($scope.usersWithGroups, function(i) { return i.Name == $scope.newUser.name; });
                     if(userExists === -1 && $scope.newUser.groupsAssigned.length > 0 && $scope.newUser.password !==""){

                        //check for duplicate alias names
                        var duplicateUserDisplayNames = _.filter($scope.usersWithGroups, function(j){
                           $log.log(j);
                           if(j.displayName == $scope.newUser.alias){
                              return j.Name;
                           }
                        });
                        var duplicateUserDisplayNamesString = _.map(duplicateUserDisplayNames, "Name").join(" , ");
                        
                        if(duplicateUserDisplayNamesString.length > 0){
                           $scope.view.message = $translate.instant("WARNINGDUPLICATEDISPLAYNAMES") + duplicateUserDisplayNamesString;
                           $scope.view.messageWarning = true;
                           $timeout(function(){
                              $scope.view.message = null;
                              $scope.view.messageWarning = null;
                           }, 5000);

                        }else{
                           var url = "/Users";
                           var data = {
                              "Name" : $scope.newUser.name,
                              "Groups@odata.bind": $scope.ngDialogData.updateGroupsArray(null, $scope.newUser.groupsAssigned)
                           }
                           $http.post(encodeURIComponent($scope.ngDialogData.instance) + url, data).then(function(success,error){
                              if(success.status == 401){
                                 $scope.view.message = $translate.instant("FUNCTIONADDUSERERROR");
                                 $scope.view.messageWarning = true;
                                 $timeout(function(){
                                    $scope.view.message = null;
                                    $scope.view.messageWarning = false;
                                 }, 2000);
                                 return;
                              
                              }else if(success.status < 400){
                                 $scope.ngDialogData.updateUserDisplayName($scope.newUser.name, $scope.newUser.alias);
                                 $scope.updatePassword($scope.newUser.name, $scope.newUser.password);
                                 
                                 $scope.view.message = $translate.instant("EDITUSERPASSWORDSUCCESS");
                                 $scope.view.message = "User added";
                                 $scope.view.messageSuccess = true;
   
                                 $timeout(function(){
                                    $scope.view.message = null;
                                    $scope.view.messageSuccess = null;
                                    $scope.ngDialogData.load();
                                    $scope.closeThisDialog();
                                 }, 2000);
   
   
                              }else{
                                 // Error to display on page
                                 if(success.data && success.data.error && success.data.error.message){
                                    $scope.view.message = success.data.error.message;
                                    $scope.view.messageWarning = true;
                                 }
                                 else {
                                    $scope.view.message = success.data;
                                    $scope.view.messageWarning = true;
                                 }
                                 $timeout(function(){
                                    $scope.view.message = null;
                                    $scope.view.messageWarning = null;
      
                                 }, 2000);
                              }
                           });

                        }

                     }else{
                        $scope.view.messageWarning = true;
                        $scope.view.message = "Check Inputs";
                        $timeout(function(){
                           $scope.view.messageWarning = null;
                           $scope.view.message = null;
                        }, 1000);

                     }
                  }


                  $scope.closeThisDialog = function(){
                     ngDialog.close();
                  }

               }],
               data: {
                  view : $scope.view,
                  instance : $scope.instance,
                  addUserToGroup : $scope.addUserToGroup,
                  updateGroupsArray : $scope.updateGroupsArray,
                  updateUserDisplayName : $scope.updateUserDisplayName,
                  load : $scope.load}
            });

         }


         $scope.deleteUser = function(user){
            $dialogs.confirmDelete(user, deleteSelectedUser);

            function deleteSelectedUser(){
               var url = "/Users('" + user + "')"
               $http.delete(encodeURIComponent($scope.instance)+url).then(function(success,error){
                  if(success.status==204){
                     //success
                     $scope.message = $translate.instant("FUNCTIONDELETEUSERSUCCESS");
                     $scope.messageSuccess = true;

                     $scope.load();
                     $timeout(function(){
                        $scope.message = null;
                        $scope.messageSuccess = null;
                     }, 2000);
                     return;

                  }else{
                     if(success.data && success.data.error && success.data.error.message){
                        $scope.message = success.data.error.message;
                        $scope.messageWarning = true;
                     }
                     else {
                        $scope.message = success.data;
                        $scope.messageWarning = true;
                     }
                     $timeout(function(){
                        $scope.view.message = null;
                        $scope.messageWarning = null;
                     }, 5000);
                  }
               });
            }
         }


         $scope.removeUserFromGroup = function(user, group){
            var prompt = "Remove user " + user + " from group " + group + "?";
            $dialogs.confirmDelete(prompt, removeUserFromSelectedGroup);

            function removeUserFromSelectedGroup(){
               var url = "/Users('"+ user + "')/Groups?$id=Groups('" + group + "')";
               $http.delete(encodeURIComponent($scope.instance) + url).then(function(success,error){
                  if(success.status == 401){
                     $scope.message = $translate.instant("FUNCTIONREMOVEUSERFROMGROUPERROR");
                     $timeout(function(){
                        $scope.message = null;
                     }, 5000);

                     return;
                     
                  }else if(success.status < 400){
                     $scope.message = $translate.instant("FUNCTIONREMOVEUSERFROMGROUPSUCCESS");
                     $scope.messageSuccess = true;
                     $scope.load();
   
                     $timeout(function(){
                        $scope.message = null;
                        $scope.messageSuccess = null;
                     }, 5000);
   
                     return;
   
                  }else{
                     // Error to display on page
                     $log.log(success);
                     if(success.data && success.data.error && success.data.error.message){
                        $scope.message = success.data.error.message;
                        $scope.messageWarning = true;
                     }
                     else {
                        $scope.message = success.data;
                        $scope.messageSuccess = false;
                        $scope.messageWarning = true;
                     }
                     $timeout(function(){
                        $scope.messageError = null;
                        $scope.messageWarning = null;
                     }, 5000);
                  }
               });
            }

         }


         $scope.showMoreUsers = function(groupIndex){
            ngDialog.open({
               template: "__/plugins/users-groups/showUsers.html",
               className: "ngdialog-theme-default",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     name: $scope.groupsWithUsers[groupIndex].Name,
                     users: $scope.groupsWithUsers[groupIndex].Users,
                     removedUsers : [],
                     message: "",
                     messageSuccess: false,
                     messageWarning: false

                  }


                  $scope.userFilter = function(user){
                     if($scope.view.removedUsers.length > 0 && $scope.view.removedUsers.indexOf(user.Name)!==-1){
                        return false
                     }else{
                        if(!$scope.selections.filterUser){
                           return true;
                        }else{
                           if(user.Name.toLowerCase().indexOf($scope.selections.filterUser.toLowerCase())!==-1){
                              return true;
   
                           }else{
                              var displayName = $scope.getDisplayNameFromObject(user.Name);
                              if(displayName.toLowerCase().indexOf($scope.selections.filterUser.toLowerCase())!==-1){
                                 return true;
                              }else{
                                 return false;
                              }
                           }
                        }
                     }

                  }


                  $scope.getDisplayNameFromObject = function(userName){
                     var currentUserNameIndex = _.findIndex($scope.usersWithGroups, function(i){
                        return i.Name === userName;
                     });

                     return $scope.usersWithGroups[currentUserNameIndex].displayName;
                  }

                  $scope.removeUserFromGroup = function(user, group){
                     var prompt = "Remove user " + user + " from group " + group + "?";
                     $dialogs.confirmDelete(prompt, removeUserFromSelectedGroup);
         
                     function removeUserFromSelectedGroup(){
                        var url = "/Users('"+ user + "')/Groups?$id=Groups('" + group + "')";
                        $http.delete(encodeURIComponent($scope.instance) + url).then(function(success,error){
                           if(success.status == 401){
                              $scope.view.message = $translate.instant("FUNCTIONREMOVEUSERFROMGROUPERROR");
                              $scope.view.removedUsers = [];
                              $timeout(function(){
                                 view.message = null;
                              }, 5000);
         
                              return;
                              
                           }else if(success.status < 400){
                              $scope.view.message = $translate.instant("FUNCTIONREMOVEUSERFROMGROUPSUCCESS");
                              $scope.view.messageSuccess = true;

                              //add users to array used in ng-repeat filter logic
                              $scope.view.removedUsers.push(user);

                              $scope.load();
            
                              $timeout(function(){
                                 $scope.view.message = null;
                                 $scope.view.messageSuccess = null;
                              }, 2000);
            
                              return;
            
                           }else{
                              // Error to display on page
                              $log.log(success);
                              if(success.data && success.data.error && success.data.error.message){
                                 $scope.view.message = success.data.error.message;
                                 $scope.view.messageWarning = true;
                                 $scope.view.removedUsers = [];
                              }
                              else {
                                 $scope.view.message = success.data;
                                 $scope.view.messageSuccess = false;
                                 $scope.view.messageWarning = true;
                                 $scope.view.removedUsers = [];
                              }
                              $timeout(function(){
                                 $scope.view.messageError = null;
                                 $scope.view.messageWarning = null;
                              }, 5000);
                           }
                        });
                     }
         
                  }


                  $scope.closeThisDialog = function(){
                     ngDialog.close();
                  }

              
               }],
               data: {
                  view : $scope.view,
                  groupsWithUsers : $scope.groupsWithUsers,
                  usersWithGroups : $scope.usersWithGroups,
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
               if(success.status == 401){
                  $scope.reload = true;
                  $scope.message = null;

                  return;

               }else if(success.status < 400){
                  //success
                  $scope.load();

                  $scope.message = $translate.instant("FUNCTIONADDUSERTOGROUPSUCCESS");
                  $scope.messageSuccess = true;
                  $timeout(function(){
                     $scope.message = null;
                     $scope.messageSuccess = null;
                  },5000);

                  return;

               }else{
                  if(success.data && success.data.error && success.data.error.message){
                     $scope.message = success.data.error.message;
                     $scope.messageWarning = true;
                  }
                  $timeout(function(){
                     $scope.message = null;
                     $scope.messageWarning = null;
                  },5000);
                  
               }

            });

         }


         $scope.addSingleUserToGroup = function(selectedUser, currentGroup){
            $scope.addUserToGroup(selectedUser.Name, currentGroup, selectedUser.Groups);
         }


         $scope.addMultipleUsersToGroup = function(selectedGroup, currentGroup){
            var itemIndex = _.findIndex($scope.groupsWithUsers, function(i){return i.Name == selectedGroup.Name;});
            var arrayOfUsers = $scope.groupsWithUsers[itemIndex].Users;

            for(var i = 0; i < arrayOfUsers.length; i++){
               $scope.addUserToGroup(arrayOfUsers[i].Name, currentGroup, $scope.usersWithGroups[arrayOfUsers[i].usersWithGroupsIndex].Groups);
            }
         }


         $scope.updateGroupsArray = function(newGroup, previousGroups){
            var array = [];

            if(newGroup !== null){
               var arrayElement = "Groups('" + newGroup + "')";
               array.push(arrayElement);
            }

            if(typeof previousGroups !== "undefined"){
               for(var i=0; i < previousGroups.length; i++){
                  arrayElement = "Groups('" + previousGroups[i].Name + "')";
                  array.push(arrayElement)
               }
            }

            return array;
         }

         $scope.nextAccess = function(newGroup, tm1Section, itemName, currentAccess){
            var assignedAccessObj = {
               applications:{
                  "READ":0,
                  "ADMIN":1
               },
               dimensions:{
                  "READ":0,
                  "WRITE":1,
                  "RESERVE":2,
                  "LOCK":3,
                  "ADMIN":4
               },
               cubes:{
                  "READ":0,
                  "WRITE":1,
                  "RESERVE":2,
                  "LOCK":3,
                  "ADMIN":4
               },
               processes:{
                  "READ":0
               },
               chores:{
                  "READ":0
               },
               capabilities:{
                  "BLANK":0,
                  "DENY":1,
                  "GRANT":2
               }
   
            }
   
            var assignedAccessArray = {
               applications:[
                  "READ",
                  "ADMIN"
               ],
               dimensions:[
                  "READ",
                  "WRITE",
                  "RESERVE",
                  "LOCK",
                  "ADMIN"
               ],
               cubes:[
                  "READ",
                  "WRITE",
                  "RESERVE",
                  "LOCK",
                  "ADMIN"
               ],
               processes:[
                  "READ"
               ],
               chores:[
                  "READ"
               ],
               capabilities:[
                  "BLANK",
                  "DENY",
                  "GRANT"
               ]
            }


            var currentIndex = 0;
            var nextIndex = 0;

            currentIndex = assignedAccessObj[tm1Section][currentAccess];
            nextIndex = currentIndex+1;

            var itemIndex = _.findIndex(newGroup[tm1Section], function(i){return i.name == itemName;});

            if(nextIndex > assignedAccessArray[tm1Section].length-1){
               newGroup[tm1Section][itemIndex].access = assignedAccessArray[tm1Section][0];
            }else{
               newGroup[tm1Section][itemIndex].access = assignedAccessArray[tm1Section][nextIndex];
            }
         }


         $scope.addIndividualTm1SectionItemToNewGroup = function(newGroup, tm1Section, group){
            if(tm1Section === "applications"){
               for(var i=0; i < $scope.applicationsListWithChildren[group.Name].length; i++){
                  var child = $scope.applicationsListWithChildren[group.Name][i]
                  newGroup[tm1Section].push({name:child, access:"READ"});
               }

               for(var i=0; i < $scope.applicationsListWithParents[group.Name].length; i++){
                  var child = $scope.applicationsListWithParents[group.Name][i]
                  newGroup[tm1Section].push({name:child, access:"READ"});
               }

               //remove duplicates
               newGroup[tm1Section] = _.uniqBy(newGroup[tm1Section], "name");

            }else{
               if(_.filter(newGroup[tm1Section], function(o){return o.name == group.Name}).length == 0 ){
                  if(tm1Section==="capabilities"){
                     newGroup[tm1Section].push({name:group.Name, access:"BLANK"});
                  }else{
                     newGroup[tm1Section].push({name:group.Name, access:"READ"});
                  }
                  
               }
               $log.log(newGroup[tm1Section]);

            }

         }

         $scope.removeTm1SectionItemFromNewGroup = function(newGroup, tm1Section, groupName){
            var groupIndex = _.findIndex(newGroup[tm1Section], function(i){return i.name == groupName;});
            var itemObjToRemove = newGroup[tm1Section][groupIndex];

            if(tm1Section === "applications"){
               for(var i=0; i < $scope.applicationsListWithChildren[itemObjToRemove.name].length; i++){
                  var child = $scope.applicationsListWithChildren[itemObjToRemove.name][i]

                  var childIndex = _.findIndex(newGroup[tm1Section], function(i){return i.name == child;});
                  if(childIndex !==-1){
                     newGroup[tm1Section][childIndex].access = "NONE";
                     
                     newGroup["applicationsNONE"].push(newGroup[tm1Section][childIndex]);
                     newGroup[tm1Section].splice(childIndex, 1);
                  }

               }

            }else{
               newGroup[tm1Section].splice(groupIndex, 1);
            }
            

         }

         $scope.addCloneGroupsToNewGroupApplications = function(newGroup, cloneGroup){
            var groupsMDX = $scope.groupsArrayToGroupsMDX(cloneGroup);

            if(typeof groupsMDX !== "undefined"){
               var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
               var mdx = "SELECT " + groupsMDX + "ON COLUMNS, {TM1SUBSETALL( [}ApplicationEntries] )} ON ROWS FROM [}ApplicationSecurity]"
               var data = { 
                  "MDX" : mdx
                };
                  
               $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                  if(success.status == 401){
                     // Set reload to true to refresh after the user logs in
                     $scope.reload = true;
                     return;
                  
                  }else if(success.status < 400){
                     var options = {
                        alias: {},
                        suppressZeroRows: 0,
                        suppressZeroColumns: 1,
                        maxRows: 50
                     };

                     var applicationName = "}ApplicationSecurity";
                     $scope.groupApplicationSecurityResult = $tm1.resultsetTransform($scope.instance, applicationName, success.data, options);

                     for(var i = 0; i < $scope.groupApplicationSecurityResult.rows.length; i++){   
                        for(var j = 0; j < $scope.groupApplicationSecurityResult.rows[i].cells.length; j++){
                           var application = {
                              name:"",
                              access:"READ"
                           };
                           application.name = $scope.groupApplicationSecurityResult.rows[i]["}ApplicationEntries"].key;

                           if($scope.groupApplicationSecurityResult.rows[i].cells[j].value!==""){   
                              application.access = $scope.groupApplicationSecurityResult.rows[i].cells[j].value;
                           }

                           if(application.access!=="NONE" && application.name!=="}Applications"){
                              newGroup.applications.push(application);
                           }
                           
                        }

                     }

                     //remove duplicates
                     newGroup.applications = _.uniqBy(newGroup.applications, "name");

                  }else{
                     if(success.data && success.data.error && success.data.error.message){
                        $scope.view.message = success.data.error.message;
                     }else{
                        $scope.view.message = success.data;
                     }
                     $scope.view.messageWarning = true;

                  }

               })

            }

         };


         $scope.addCloneGroupsToNewGroupCubes = function(newGroup, cloneGroup){
            var groupsMDX = $scope.groupsArrayToGroupsMDX(cloneGroup);

            if(typeof groupsMDX != "undefined"){
               var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
               var mdx = "SELECT NON EMPTY " + groupsMDX + " ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}Cubes] )} ON ROWS FROM [}CubeSecurity]"
               var data = { 
                  "MDX" : mdx
                  };
                  
               $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                  if(success.status == 401){
                     // Set reload to true to refresh after the user logs in
                     $scope.reload = true;
                     return;
                  
                  }else if(success.status < 400){
                     var options = {
                        alias: {},
                        suppressZeroRows: 1,
                        suppressZeroColumns: 1,
                        maxRows: 50
                     };

                     var cubeName = "}CubeSecurity";
                     $scope.groupCubeSecurityResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);

                     for(var i = 0; i < $scope.groupCubeSecurityResult.rows.length; i++){   
                        for(var j = 0; j < $scope.groupCubeSecurityResult.rows[i].cells.length; j++){
                           var cube = {
                              name:"",
                              access:""
                           };
                           if($scope.groupCubeSecurityResult.rows[i].cells[j].value){
                              cube.name = $scope.groupCubeSecurityResult.rows[i]["}Cubes"].key;
                              cube.access = $scope.groupCubeSecurityResult.rows[i].cells[j].value;
                              newGroup.cubes.push(cube);
                           }
                           
                        }

                     }

                     //remove duplicates
                     newGroup.cubes = _.uniqBy(newGroup.cubes, "name");

                  }else{
                     if(success.data && success.data.error && success.data.error.message){
                        $scope.view.message = success.data.error.message;
                     }else{
                        $scope.view.message = success.data;
                     }
                     $scope.view.messageWarning = true;

                  }

               })

            }

         };


         $scope.addCloneGroupsToNewGroupDimensions = function(newGroup, cloneGroup){
            var groupsMDX = $scope.groupsArrayToGroupsMDX(cloneGroup);

            if(typeof groupsMDX != "undefined"){
               var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
               var mdx = "SELECT NON EMPTY " + groupsMDX + " ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}Dimensions] )} ON ROWS FROM [}DimensionSecurity]"
               var data = { 
                  "MDX" : mdx
                  };
                  
               $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                  if(success.status == 401){
                     // Set reload to true to refresh after the user logs in
                     $scope.reload = true;
                     return;
                  
                  }else if(success.status < 400){
                     var options = {
                        alias: {},
                        suppressZeroRows: 1,
                        suppressZeroColumns: 1,
                        maxRows: 50
                     };

                     var dimensionName = "}DimensionSecurity";
                     $scope.groupDimensionSecurityResult = $tm1.resultsetTransform($scope.instance, dimensionName, success.data, options);

                     for(var i = 0; i < $scope.groupDimensionSecurityResult.rows.length; i++){   
                        for(var j = 0; j < $scope.groupDimensionSecurityResult.rows[i].cells.length; j++){
                           var dimension = {
                              name:"",
                              access:""
                           };
                           if($scope.groupDimensionSecurityResult.rows[i].cells[j].value){
                              dimension.name = $scope.groupDimensionSecurityResult.rows[i]["}Dimensions"].key;
                              dimension.access = $scope.groupDimensionSecurityResult.rows[i].cells[j].value;
                              newGroup.dimensions.push(dimension);
                           }
                           
                        }

                     }

                     //remove duplicates
                     newGroup.dimensions = _.uniqBy(newGroup.dimensions, "name");

                  }else{
                     if(success.data && success.data.error && success.data.error.message){
                        $scope.view.message = success.data.error.message;
                     }else{
                        $scope.view.message = success.data;
                     }
                     $scope.view.messageWarning = true;

                  }

               })

            }

         };


         $scope.addCloneGroupsToNewGroupProcesses = function(newGroup, cloneGroup){
            var groupsMDX = $scope.groupsArrayToGroupsMDX(cloneGroup);

            if(typeof groupsMDX != "undefined"){
               var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
               var mdx = "SELECT NON EMPTY " + groupsMDX + " ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}Processes] )} ON ROWS FROM [}ProcessSecurity]"
               var data = { 
                  "MDX" : mdx
                  };
                  
               $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                  if(success.status == 401){
                     // Set reload to true to refresh after the user logs in
                     $scope.reload = true;
                     return;
                  
                  }else if(success.status < 400){
                     var options = {
                        alias: {},
                        suppressZeroRows: 1,
                        suppressZeroColumns: 1,
                        maxRows: 50
                     };

                     var processName = "}ProcessSecurity";
                     $scope.groupProcessSecurityResult = $tm1.resultsetTransform($scope.instance, processName, success.data, options);

                     for(var i = 0; i < $scope.groupProcessSecurityResult.rows.length; i++){   
                        for(var j = 0; j < $scope.groupProcessSecurityResult.rows[i].cells.length; j++){
                           var processItem = {
                              name:"",
                              access:""
                           };
                           if($scope.groupProcessSecurityResult.rows[i].cells[j].value){
                              processItem.name = $scope.groupProcessSecurityResult.rows[i]["}Processes"].key;
                              processItem.access = $scope.groupProcessSecurityResult.rows[i].cells[j].value;
                              newGroup.processes.push(processItem);
                           }
                           
                        }

                     }

                     //remove duplicates
                     newGroup.processes = _.uniqBy(newGroup.processes, "name");
                     $log.log(newGroup.processes);

                  }else{
                     if(success.data && success.data.error && success.data.error.message){
                        $scope.view.message = success.data.error.message;
                     }else{
                        $scope.view.message = success.data;
                     }
                     $scope.view.messageWarning = true;

                  }

               })

            }

         };


         $scope.addCloneGroupsToNewGroupChores = function(newGroup, cloneGroup){
            var groupsMDX = $scope.groupsArrayToGroupsMDX(cloneGroup);

            if(typeof groupsMDX != "undefined"){
               var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
               var mdx = "SELECT NON EMPTY " + groupsMDX + " ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}Chores] )} ON ROWS FROM [}ChoreSecurity]"
               var data = { 
                  "MDX" : mdx
                  };
                  
               $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                  if(success.status == 401){
                     // Set reload to true to refresh after the user logs in
                     $scope.reload = true;
                     return;
                  
                  }else if(success.status < 400){
                     var options = {
                        alias: {},
                        suppressZeroRows: 1,
                        suppressZeroColumns: 1,
                        maxRows: 50
                     };

                     var choreName = "}ChoreSecurity";
                     $scope.groupChoreSecurityResult = $tm1.resultsetTransform($scope.instance, choreName, success.data, options);

                     for(var i = 0; i < $scope.groupChoreSecurityResult.rows.length; i++){   
                        for(var j = 0; j < $scope.groupChoreSecurityResult.rows[i].cells.length; j++){
                           var chore = {
                              name:"",
                              access:""
                           };
                           if($scope.groupChoreSecurityResult.rows[i].cells[j].value){
                              chore.name = $scope.groupChoreSecurityResult.rows[i]["}Chores"].key;
                              chore.access = $scope.groupChoreSecurityResult.rows[i].cells[j].value;
                              newGroup.chores.push(chore);
                           }
                           
                        }

                     }

                     //remove duplicates
                     newGroup.chores = _.uniqBy(newGroup.chores, "name");

                  }else{
                     if(success.data && success.data.error && success.data.error.message){
                        $scope.view.message = success.data.error.message;
                     }else{
                        $scope.view.message = success.data;
                     }
                     $scope.view.messageWarning = true;

                  }

               })

            }

         };

         $scope.addCloneGroupsToNewGroupAll = function(newGroup, cloneGroup){
            $scope.clearCLoneGroupsToNewGroupAll(newGroup);
            $scope.addCloneGroupsToNewGroupApplications(newGroup, cloneGroup);
            $scope.addCloneGroupsToNewGroupCubes(newGroup, cloneGroup);
            $scope.addCloneGroupsToNewGroupDimensions(newGroup, cloneGroup);
            $scope.addCloneGroupsToNewGroupProcesses(newGroup, cloneGroup);
            $scope.addCloneGroupsToNewGroupChores(newGroup, cloneGroup);
         }

         $scope.clearCLoneGroupsToNewGroupAll = function(newGroup){
            newGroup.applications = [];
            newGroup.cubes = [];
            newGroup.dimensions = [];
            newGroup.processes = [];
            newGroup.chores = [];
         }



         $scope.addNewGroup = function(newGroup){
            var deferred = $q.defer();

            var url = "/Groups";
            var data = {
               "Name" : newGroup.name
            }

            $http.post(encodeURIComponent($scope.instance)+ url, data).then(function(success, error){
               if(success.status < 400){
                  deferred.resolve(newGroup);

               }else{
                  deferred.reject(success);

               }

            });

            return deferred.promise;
         }

         $scope.updateValues = function(newGroup){
            var deferred = $q.defer();

            var transformAndPost = function(tm1Item, tm1Dimension, tm1Cube){
               var deferred = $q.defer();

               var data = [];

               if(tm1Item === "applications"){
                  if(newGroup[tm1Item].length === 0){
                     //then load all elements with NONE
                     for(var i = 0; i < $scope.applicationsList.length; i++){
                        var item =  {
                           "Cells":[
                              {"Tuple@odata.bind": [
                                 "Dimensions('" + tm1Dimension + "')/Hierarchies('" + tm1Dimension + "')/Elements('"+ $scope.applicationsList[i].Name +"')",
                                 "Dimensions('}Groups')/Hierarchies('}Groups')/Elements('" + newGroup.name + "')"
                                 ]
                              }
                           ],
                           "Value" : "NONE"
                        }
                        data.push(item);

                     }

                  }else{
                     //for application security, NONE is triggered when you remove the item from the UI. These items are pushed to a seperate array
                     //load this array here
                     for(var i = 0; i < newGroup["applicationsNONE"].length; i++){
                        var item =  {
                           "Cells":[
                              {"Tuple@odata.bind": [
                                 "Dimensions('" + tm1Dimension + "')/Hierarchies('" + tm1Dimension + "')/Elements('" + newGroup["applicationsNONE"][i].name + "')",
                                 "Dimensions('}Groups')/Hierarchies('}Groups')/Elements('" + newGroup.name + "')"
                                 ]
                              }
                           ],
                           "Value" : newGroup["applicationsNONE"][i].access
                        }
                        data.push(item);
                     }

                     for(var i = 0; i < newGroup[tm1Item].length; i++){
                        //for application security, blank cells and READ cells are both handled as READ. But on frontend display we want to display READ
                        if(newGroup[tm1Item][i].access === "READ"){
                           newGroup[tm1Item][i].access = "";
                        }

                        var item =  {
                           "Cells":[
                              {"Tuple@odata.bind": [
                                 "Dimensions('" + tm1Dimension + "')/Hierarchies('" + tm1Dimension + "')/Elements('" + newGroup[tm1Item][i].name + "')",
                                 "Dimensions('}Groups')/Hierarchies('}Groups')/Elements('" + newGroup.name + "')"
                                 ]
                              }
                           ],
                           "Value" : newGroup[tm1Item][i].access
                        }
                        data.push(item);



                     }
                     
                  }

               }else{
                  for(var i = 0; i < newGroup[tm1Item].length; i++){
                     var item =  {
                        "Cells":[
                           {"Tuple@odata.bind": [
                              "Dimensions('" + tm1Dimension + "')/Hierarchies('" + tm1Dimension + "')/Elements('" + newGroup[tm1Item][i].name + "')",
                              "Dimensions('}Groups')/Hierarchies('}Groups')/Elements('" + newGroup.name + "')"
                              ]
                           }
                        ],
                        "Value" : newGroup[tm1Item][i].access
                     }
                     data.push(item);
                  }


               }


               // http parameters
               var url = "/Cubes('" + tm1Cube +"')/tm1.Update";

               $http.post(encodeURIComponent($scope.instance) + url, data).then(function(success,error){
                  if(success.status < 400){
                     deferred.resolve(success);

                  }else{
                     deferred.reject(success);
                  }

               });

               return deferred.promise;

            }


            $q.all([
               transformAndPost("applications","}ApplicationEntries","}ApplicationSecurity"),
               transformAndPost("cubes","}Cubes","}CubeSecurity"),
               transformAndPost("dimensions","}Dimensions","}DimensionSecurity"),
               transformAndPost("processes","}Processes","}ProcessSecurity"),
               transformAndPost("chores","}Chores","}ChoreSecurity")
            ])
            .then(function(response){
               deferred.resolve(response);
            })
            .catch(function(response){
               deferred.reject(response);
            });


            return deferred.promise;

         }



         $scope.editGroup = function(rowIndex){
            ngDialog.open({
               template: "__/plugins/users-groups/editGroup.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1' ,'$q' ,'$log', function ($rootScope, $scope, $http, $state, $tm1, $q, $log) {
 
                  $scope.view = {
                     message:"",
                     messageWarning:false,
                     messageSuccess:false
                  }

                  //default objects/arrays
                  //for application security, blank cells and READ cells are both handled as READ. But on frontend display we want to display READ only
                  //if an application is not displayed on the frontend, then it should have a value of NONE in the application security cube
                  $scope.newGroup = {
                     name: $scope.ngDialogData.groupsWithUsers[rowIndex].Name,
                     applications:[],
                     applicationsNONE:[],
                     cubes: [],
                     dimensions:[],
                     processes:[],
                     chores:[]
                  }

                  $scope.deleteSelection = function(tm1ItemSelected){
                     $dialogs.confirmDelete(tm1ItemSelected, deleteTm1ItemsSelected);
         
                     function deleteTm1ItemsSelected(){
                        if(tm1ItemSelected==="all"){
                           $scope.newGroup.applications = [];
                           $scope.newGroup.cubes = [];
                           $scope.newGroup.dimensions = [];
                           $scope.newGroup.processes = [];
                           $scope.newGroup.chores = [];
                        }else{
                           $scope.newGroup[tm1ItemSelected] = [];
                        }

                     }
                  }


                  $scope.retrieveSecurity = function(rowName, cubeName, tm1Item){
                     var deferred = $q.defer();

                     var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                     var mdxColumn = "{[}Groups].[" + $scope.newGroup.name + "]}";
                     var mdxRow = "[" + rowName + "]";
                     var mdxFrom = "[" + cubeName + "]";

                     if(cubeName === "}ApplicationSecurity"){
                        var mdxFull = "SELECT " + mdxColumn + " ON COLUMNS, {TM1SUBSETALL(" + mdxRow +  ")} ON ROWS FROM " + mdxFrom;
                     }else{
                        var mdxFull = "SELECT NON EMPTY " + mdxColumn + " ON COLUMNS, NON EMPTY {TM1SUBSETALL(" + mdxRow +  ")} ON ROWS FROM " + mdxFrom;
                     }

                      
                     var data = {
                        "MDX" : mdxFull
                     }

                     $http.post(encodeURIComponent($scope.instance) + url, data).then(function(success, error){
                        if(success.status < 400){
                           if(cubeName === "}ApplicationSecurity"){
                              //For application security one needs to handle READ and NONE values specifically
                              var options = {
                                 alias: {},
                                 suppressZeroRows: 0,
                                 suppressZeroColumns: 1,
                                 maxRows: 50
                              };
   
                              $scope.cubeSecurityResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);

                              for(var i = 0; i < $scope.cubeSecurityResult.rows.length; i++){
                                 var item = {
                                    name : "",
                                    access : "READ"
                                 }
                                 
                                 if($scope.cubeSecurityResult.rows[i][rowName].name !=="}Applications"){
                                    item.name = $scope.cubeSecurityResult.rows[i][rowName].name;
   
                                    for(var j = 0; j < $scope.cubeSecurityResult.rows[i].cells.length; j++){
                                       if($scope.cubeSecurityResult.rows[i].cells[j].value !== ""){
                                          item.access = $scope.cubeSecurityResult.rows[i].cells[j].value;
                                       }
   
                                    }
                                    
                                    if(item.access!=="NONE"){
                                       $scope.newGroup[tm1Item].push(item);
                                    }
                                 }

                                 
                              }

                           }else{
                              var options = {
                                 alias: {},
                                 suppressZeroRows: 1,
                                 suppressZeroColumns: 1,
                                 maxRows: 50
                              };
   
                              $scope.cubeSecurityResult = $tm1.resultsetTransform($scope.instance, cubeName, success.data, options);

                              for(var i = 0; i < $scope.cubeSecurityResult.rows.length; i++){
                                 var item = {
                                    name : "",
                                    access : ""
                                 }
   
                                 item.name = $scope.cubeSecurityResult.rows[i][rowName].name;
   
                                 for(var j = 0; j < $scope.cubeSecurityResult.rows[i].cells.length; j++){
                                       item.access = $scope.cubeSecurityResult.rows[i].cells[j].value;                                 
                                 }
   
                                 $scope.newGroup[tm1Item].push(item);
                              }

                           }


                           deferred.resolve({name:true});

                        }else{
                           deferred.reject(success);

                        }
                     })

                     return deferred.promise;

                  }

                  $scope.retrieveGroupSecurityApplications = function(){
                     var applicationSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}ApplicationSecurity'; });
                     if(typeof applicationSecurityExists !== "undefined"){
                        return $scope.retrieveSecurity("}ApplicationEntries","}ApplicationSecurity","applications");
                     }
                     
                  }
                  $scope.retrieveGroupSecurityCubes = function(){
                     var cubeSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}CubeSecurity'; });
                     if(typeof cubeSecurityExists !== "undefined"){
                        return $scope.retrieveSecurity("}Cubes","}CubeSecurity","cubes");
                     }
                     
                  }
                  $scope.retrieveGroupSecurityDimensions = function(){
                     var dimensionSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}DimensionSecurity'; });
                     if(typeof dimensionSecurityExists !== "undefined"){
                        return $scope.retrieveSecurity("}Dimensions","}DimensionSecurity","dimensions");
                     }

                  }
                  $scope.retrieveGroupSecurityProcesses = function(){
                     var processSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}ProcessSecurity'; });
                     if(typeof processSecurityExists !== "undefined"){
                        return $scope.retrieveSecurity("}Processes","}ProcessSecurity","processes");
                     }

                  }
                  $scope.retrieveGroupSecurityChores = function(){
                     var choreSecurityExists = _.find($scope.cubesList, function(o) { return o.Name === '}ChoreSecurity'; });
                     if(typeof choreSecurityExists !== "undefined"){
                        return $scope.retrieveSecurity("}Chores","}ChoreSecurity","chores");
                     }

                  }

                  $scope.retrieveErrorHandler = function(rejectedObject){
                     if(rejectedObject.status >=400 ){
                        // Error to display on page
                        if(rejectedObject.data && rejectedObject.data.error && rejectedObject.data.error.message){
                           $scope.view.message = rejectedObject.data.error.message;
                           $scope.view.messageWarning = true;
         
                        }
                        else {
                           $scope.view.message = rejectedObject.data;
                           $scope.view.messageWarning = true;
                        }
         
                     }else{
                        $scope.view.message = $translate.instant("FUNCTIONEDITGROUPERROR");
                        $scope.view.messageWarning = true;
                        $log.log(rejectedObject);
         
                     }
                     $timeout(function(){
                        $scope.view.message = null;
                        $scope.view.messageWarning = false;
                     }, 2000);
                  }


                  $scope.retrieveGroupSecurityAll = function(){
                     $scope.retrieveGroupSecurityApplications()
                        .then($scope.retrieveGroupSecurityCubes)
                        .then($scope.retrieveGroupSecurityDimensions)
                        .then($scope.retrieveGroupSecurityProcesses)
                        .then($scope.retrieveGroupSecurityChores)
                        .catch($scope.retrieveErrorHandler);
                  }
                  $scope.retrieveGroupSecurityAll();


                  $scope.addSuccess = function(){
                     //success to display on page
                     $scope.view.message = $translate.instant("FUNCTIONEDITGROUPSUCCESS");
                     $scope.view.messageSuccess = true;
         
                     $timeout(function(){
                        $scope.view.message = null;
                        $scope.view.messageSuccess = false;
                        $scope.ngDialogData.load();
                        $scope.closeThisDialog();
                     }, 1000);
                  }
         
         
                  $scope.addErrorHandler = function(rejectedObject){
                     if(rejectedObject.status >=400 ){
                        // Error to display on page
                        if(rejectedObject.data && rejectedObject.data.error && rejectedObject.data.error.message){
                           $scope.view.message = rejectedObject.data.error.message;
                           $scope.view.messageWarning = true;
         
                        }
                        else {
                           $scope.view.message = rejectedObject.data;
                           $scope.view.messageWarning = true;
                        }
         
                     }else{
                        $scope.view.message = $translate.instant("FUNCTIONADDGROUPERROR");
                        $scope.view.messageWarning = true;
                        $log.log(rejectedObject);
         
                     }
                     $timeout(function(){
                        $scope.view.message = null;
                        $scope.view.messageWarning = false;
                     }, 2000);
                  }



                  $scope.updateGroup = function(){
                     if($scope.newGroup.name!==""){
                     $scope.updateValues($scope.newGroup)
                        .then($scope.addSuccess)
                        .catch($scope.addErrorHandler);
                     }
                  }


               }],
               data: {
                  groupsWithUsers : $scope.groupsWithUsers,
                  view : $scope.view,
                  load : $scope.load,
                  instance : $scope.instance,
                  nextAccess : $scope.nextAccess,
                  previousAccess : $scope.previousAccess,
                  addIndividualTm1SectionItemToNewGroup : $scope.addIndividualTm1SectionItemToNewGroup,
                  removeTm1SectionItemFromNewGroup : $scope.removeTm1SectionItemFromNewGroup,
                  addCloneGroupsToNewGroupApplications : $scope.addCloneGroupsToNewGroupApplications,
                  addCloneGroupsToNewGroupCubes : $scope.addCloneGroupsToNewGroupCubes,
                  addCloneGroupsToNewGroupDimensions : $scope.addCloneGroupsToNewGroupDimensions,
                  addCloneGroupsToNewGroupProcesses : $scope.addCloneGroupsToNewGroupProcesses,
                  addCloneGroupsToNewGroupChores : $scope.addCloneGroupsToNewGroupChores,
                  addNewGroup : $scope.addNewGroup,
                  updateValues : $scope.updateValues

               }
            });

         }


         $scope.addGroup = function(){
            ngDialog.open({
               template: "__/plugins/users-groups/addGroup.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$q','$log', function ($rootScope, $scope, $http, $state, $tm1, $q, $log) {
 
                  $scope.view = {
                     message:"",
                     messageWarning:false,
                     messageSuccess:false
                  }

                  //default objects/arrays
                  $scope.newGroup = {
                     name:"",
                     applications:[],
                     applicationsNONE:[],
                     cubes: [],
                     dimensions:[],
                     processes:[],
                     chores:[]
                  }

                  $scope.deleteSelection = function(tm1ItemSelected){
                     $dialogs.confirmDelete(tm1ItemSelected, deleteTm1ItemsSelected);
         
                     function deleteTm1ItemsSelected(){
                        if(tm1ItemSelected==="all"){
                           $scope.newGroup.applications = [];
                           $scope.newGroup.cubes = [];
                           $scope.newGroup.dimensions = [];
                           $scope.newGroup.processes = [];
                           $scope.newGroup.chores = [];
                        }else{
                           $scope.newGroup[tm1ItemSelected] = [];
                        }

                     }
                  }


                  $scope.addSuccess = function(){
                     //success to display on page
                     $scope.view.message = $translate.instant("FUNCTIONADDGROUPSUCCESS");
                     $scope.view.messageSuccess = true;
         
                     $timeout(function(){
                        $scope.view.message = null;
                        $scope.view.messageSuccess = false;
                        $scope.ngDialogData.load();
                        $scope.closeThisDialog();
                     }, 1000);
                  }
         
         
                  $scope.addErrorHandler = function(rejectedObject){
                     if(rejectedObject.status >=400 ){
                        // Error to display on page
                        if(rejectedObject.data && rejectedObject.data.error && rejectedObject.data.error.message){
                           $scope.view.message = rejectedObject.data.error.message;
                           $scope.view.messageWarning = true;
         
                        }
                        else {
                           $scope.view.message = rejectedObject.data;
                           $scope.view.messageWarning = true;
                        }
         
                     }else{
                        $scope.view.message = $translate.instant("FUNCTIONADDGROUPERROR");
                        $scope.view.messageWarning = true;
                        $log.log(rejectedObject);
         
                     }
                     $timeout(function(){
                        $scope.view.message = null;
                        $scope.view.messageWarning = false;
                     }, 2000);
                  }


                  $scope.createGroup = function(){
                     if($scope.newGroup.name!==""){
                        $scope.addNewGroup($scope.newGroup)
                           .then($scope.updateValues)
                           .then($scope.addSuccess)
                           .catch($scope.addErrorHandler);
                     }
                  }


                  $scope.closeThisDialog = function(){
                     ngDialog.close();
                  }

               }],
               data: {
                  view : $scope.view,
                  updateGroupsArray : $scope.updateGroupsArray,
                  load : $scope.load,
                  groupsArrayToGroupsMDX : $scope.groupsArrayToGroupsMDX,
                  nextAccess : $scope.nextAccess,
                  previousAccess : $scope.previousAccess,
                  addIndividualTm1SectionItemToNewGroup : $scope.addIndividualTm1SectionItemToNewGroup,
                  removeTm1SectionItemFromNewGroup : $scope.removeTm1SectionItemFromNewGroup,
                  addCloneGroupsToNewGroupApplications : $scope.addCloneGroupsToNewGroupApplications,
                  addCloneGroupsToNewGroupCubes : $scope.addCloneGroupsToNewGroupCubes,
                  addCloneGroupsToNewGroupDimensions : $scope.addCloneGroupsToNewGroupDimensions,
                  addCloneGroupsToNewGroupProcesses : $scope.addCloneGroupsToNewGroupProcesses,
                  addCloneGroupsToNewGroupChores : $scope.addCloneGroupsToNewGroupChores,
                  addCloneGroupsToNewGroupAll : $scope.addCloneGroupsToNewGroupAll,
                  addNewGroup : $scope.addNewGroup,
                  updateValues : $scope.updateValues

               }
            });

         }



         $scope.deleteGroup = function(group){
            $dialogs.confirmDelete(group, deleteSelectedGroup);

            function deleteSelectedGroup(){
               var url = "/Groups('" + group + "')"
               $http.delete(encodeURIComponent($scope.instance)+url).then(function(success,error){
                  if(success.status==204){
                     //success
                     $scope.message = $translate.instant("FUNCTIONDELETEGROUPSUCCESS");
                     $scope.messageSuccess = true;

                     $scope.load();
                     $timeout(function(){
                        $scope.message = null;
                        $scope.messageSuccess = null;
                     }, 2000);
                     return;

                  }else{
                     if(success.data && success.data.error && success.data.error.message){
                        $scope.message = success.data.error.message;
                        $scope.messageWarning = true;
                     }
                     else {
                        $scope.message = success.data;
                        $scope.messageWarning = true;
                     }
                     $timeout(function(){
                        $scope.view.message = null;
                        $scope.messageWarning = null;
                     }, 5000);
                  }
               });
            }
         }


         $scope.settingsGroup = function(rowIndex){
            ngDialog.open({
               template: "__/plugins/users-groups/settingsGroup.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     name : $scope.groupsWithUsers[rowIndex].Name,
                     message:"",
                     messageSuccess:false,
                     messageWarning:false
                  }

                  //default array
                  $scope.groupSettings = {
                     capabilities:[]
                  };


                  $scope.getGroupCapabilitySettings = function(groupName){
                     var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                     var mdx = "SELECT NON EMPTY {[}Permissions].[EXECUTE]} ON COLUMNS, {[}Features].members} ON ROWS FROM [}Capabilities] WHERE ([}Groups].[" + groupName + "])"
                     var data = { 
                        "MDX" : mdx
                        };
                        
                     $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                        if(success.status == 401){
                           // Set reload to true to refresh after the user logs in
                           $scope.reload = true;
                           return;
                        
                        }else if(success.status < 400){
                           var options = {
                              alias: {},
                              suppressZeroRows: 0,
                              suppressZeroColumns: 1,
                              maxRows: 50
                           };
      
                           var capabilitiesName = "}Capabilities";
                           $scope.groupCapabilitiesResult = $tm1.resultsetTransform($scope.instance, capabilitiesName, success.data, options);
      
                           for(var i = 0; i < $scope.groupCapabilitiesResult.rows.length; i++){   
                              if($scope.groupCapabilitiesResult.rows[i].cells.length === 0){
                                 var capability = {
                                    name:"",
                                    access:"BLANK"
                                 };
                                 capability.name = $scope.groupCapabilitiesResult.rows[i]["}Features"].key;
                                 $scope.groupSettings.capabilities.push(capability);

                              }else{
                                 for(var j = 0; j < $scope.groupCapabilitiesResult.rows[i].cells.length; j++){
                                    var capability = {
                                       name:"",
                                       access:""
                                    };
                                    capability.name = $scope.groupCapabilitiesResult.rows[i]["}Features"].key;
                                    if($scope.groupCapabilitiesResult.rows[i].cells[j].value===""){
                                       capability.access = "BLANK";
                                    }else{
                                       capability.access = $scope.groupCapabilitiesResult.rows[i].cells[j].value;
                                    }
                                    
                                    $scope.groupSettings.capabilities.push(capability);
                                    
                                 }
                              }
      
                           }
            
                        }else{
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.message = success.data.error.message;
                           }else{
                              $scope.view.message = success.data;
                           }
                           $scope.view.messageWarning = true;
      
                        }
      
                     })

                  }
                  $scope.getGroupCapabilitySettings($scope.view.name);


                  $scope.addCloneGroupsToCapabilitySettings = function(newGroup, cloneGroup){

                     var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                     var mdx = "SELECT NON EMPTY {[}Permissions].[EXECUTE]} ON COLUMNS, {[}Features].members} ON ROWS FROM [}Capabilities] WHERE ([}Groups].[" + cloneGroup + "])"
                     var data = { 
                        "MDX" : mdx
                        };
                        
                     $http.post(encodeURIComponent($scope.instance)+url, data).then(function(success, error){
                        if(success.status == 401){
                           // Set reload to true to refresh after the user logs in
                           $scope.reload = true;
                           return;
                        
                        }else if(success.status < 400){
                           var options = {
                              alias: {},
                              suppressZeroRows: 0,
                              suppressZeroColumns: 1,
                              maxRows: 50
                           };

                           newGroup.capabilities = [];
      
                           var capabilitiesName = "}Capabilities";
                           $scope.groupCapabilitiesResult = $tm1.resultsetTransform($scope.instance, capabilitiesName, success.data, options);
      
                           for(var i = 0; i < $scope.groupCapabilitiesResult.rows.length; i++){
                              if($scope.groupCapabilitiesResult.rows[i].cells.length === 0){
                                 var capability = {
                                    name:"",
                                    access:"BLANK"
                                 };
                                 capability.name = $scope.groupCapabilitiesResult.rows[i]["}Features"].key;
                                 newGroup.capabilities.push(capability);

                              }else{
                                 for(var j = 0; j < $scope.groupCapabilitiesResult.rows[i].cells.length; j++){
                                    var capability = {
                                       name:"",
                                       access:""
                                    };
                                    capability.name = $scope.groupCapabilitiesResult.rows[i]["}Features"].key;
                                    if($scope.groupCapabilitiesResult.rows[i].cells[j].value===""){
                                       capability.access = "BLANK";
                                    }else{
                                       capability.access = $scope.groupCapabilitiesResult.rows[i].cells[j].value;
                                    }
                                    
                                    newGroup.capabilities.push(capability);
                                    
                                 }
                              }
      
                           }
      
                           //remove duplicates
                           newGroup.capabilities = _.uniqBy(newGroup.capabilities, "name");
      
                           $log.log(newGroup.capabilities.length);

                        }else{
                           if(success.data && success.data.error && success.data.error.message){
                              $scope.view.message = success.data.error.message;
                           }else{
                              $scope.view.message = success.data;
                           }
                           $scope.view.messageWarning = true;
      
                        }
      
                     })
         
                     
         
                  };

                  $scope.deleteSelection = function(tm1ItemSelected){
                     $dialogs.confirmDelete(tm1ItemSelected, deleteTm1ItemsSelected);
         
                     function deleteTm1ItemsSelected(){
                        $scope.groupSettings[tm1ItemSelected] = [];
                     }
                  }

                  $scope.postGroupCapabilitySettings = function(groupName, settingName, newValue){

                     if(newValue==="BLANK"){
                        newValue = "";
                     }

                     var url = "/Cubes('}Capabilities')/tm1.Update ";
                     var data = {
                        "Cells" : [
                              {"Tuple@odata.bind": [
                                 "Dimensions('}Features')/DefaultHierarchy/Elements('" + settingName + "')",
                                 "Dimensions('}Permissions')/DefaultHierarchy/Elements('EXECUTE')",
                                 "Dimensions('}Groups')/DefaultHierarchy/Elements('" + groupName + "')"
                                 ]
                              }
                           ],
                        "Value" : newValue
                       }
         
                     $http.post(encodeURIComponent($scope.instance) + url, data).then(function(success, error){
                        if(success.status == 401){
                           // Set reload to true to refresh after the user logs in
                           $scope.reload = true;
                           return;
                        
                        }else if(success.status < 400){
                           //success
                           $scope.view.message = $translate.instant('SETTINGSCAPABILITIESSUCCESS');
                           $scope.view.messageSuccess = true;
                           $scope.view.messageWarning = null;

                           $timeout(function(){
                              $scope.view.message = null;
                              $scope.view.messageSuccess = null;
                              $scope.closeThisDialog();
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
                           $scope.view.messageWarning = true;
         
                           $timeout(function(){
                              $scope.view.message = null;
                              $scope.view.messageWarning = null;
                           }, 5000);
         
                        }
         
                     })
                  }


                  $scope.loadAll = function(){
                     _.forEach($scope.groupSettings.capabilities,function(capabilitySetting){
                        $scope.postGroupCapabilitySettings($scope.view.name, capabilitySetting.name, capabilitySetting.access);

                     })
                  }

                  $scope.closeThisDialog = function(){
                     ngDialog.close();
                  }


               }],
               data: {
                  groupsWithUsers : $scope.groupsWithUsers,
                  view : $scope.view,
                  instance : $scope.instance,
                  addIndividualTm1SectionItemToNewGroup: $scope.addIndividualTm1SectionItemToNewGroup

               }
            });

         }


         $scope.$on("login-reload", function(event, args) {
               // Check that instance in args matches your $scope
               if(args.instance === $scope.instance && $scope.reload){
                  load();
               }
         });


         $scope.$on("close-tab", function(event, args) {
               // Event to capture when a user has clicked close on the tab
               if(args.page == "usersGroups" && args.instance == $scope.instance && args.name == null){
                  // The page matches this one so close it
                  $rootScope.close(args.page, {instance: $scope.instance});
               }
         });

        

        }]
    };
});