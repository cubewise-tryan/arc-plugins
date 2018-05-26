
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
      controller: ["$scope", "$rootScope", "$http", "$timeout", "$tm1", "$dialogs", "$helper", "$log", "ngDialog", "$translate", function ($scope, $rootScope, $http, $timeout, $tm1, $dialogs, $helper, $log, ngDialog, $translate ) {

         $scope.selections = {
            filterUser : "",
            filterGroup : "",
            filterApplication : "",
            filterCube : "",
            filterDimension : "",
            filterProcess : "",
            filterChore : "",
            filterGroupGroup : "",
            filterGroupUser : ""
         };

         $rootScope.uiPrefs.groupsDisplayNumber = 2;
         //for now make 2, as test model does not have enough groups. Later make default 20


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
                        return;

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
                           
                        }
                        $log.log($scope.usersWithGroups);

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

            var groupsWithUsersURL = "/Groups?$expand=Users";
            $http.get(encodeURIComponent($scope.instance) + groupsWithUsersURL).then(function(success,error){
               if(success.status == 401){
                  // Set reload to true to refresh after the user logs in
                  $scope.reload = true;
                  return;
               
               }else if(success.status < 400){
                  $scope.groupsWithUsers = success.data.value;
                  $log.log($scope.groupsWithUsers);

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
         // Load for first time: usersWithGroups, Groups
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

         $scope.changePassword = function(userName){
            var confirmMessage = $translate.instant("EDITPASSWORDCONFIRMMESSAGE") + userName + "?";
            $dialogs.confirm(confirmMessage, changeUserPassword);

            function changeUserPassword(){
               ngDialog.open({
                  template: "__/plugins/users-groups/changePassword.html",
                  className: "ngdialog-theme-default small",
                  scope: $scope,
                  controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
    
                     $scope.view = {
                        name : userName,
                        password: "",
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
                  }
               });
            }


         }



         $scope.editUser = function(rowIndex){
            ngDialog.open({
               template: "__/plugins/users-groups/editUser.html",
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
                     var groupsMDX = groupsArrayToGroupsMDX($scope.view.groups);

                     var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                     var mdx = "SELECT NON EMPTY" + groupsMDX + "ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}ApplicationEntries] )} ON ROWS FROM [}ApplicationSecurity]"
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
                                 if($scope.applicationSecurityResult.rows[i].cells[j].value){
                                    group.name = $scope.applicationSecurityResult.rows[i].cells[j].key;
                                    group.access = $scope.applicationSecurityResult.rows[i].cells[j].value;
                                    item.groupsWithAccess.push(group);
                                 }
                                 
                              }
                              $scope.applications.push(item);
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
                     var groupsMDX = groupsArrayToGroupsMDX($scope.view.groups);

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
                     var groupsMDX = groupsArrayToGroupsMDX($scope.view.groups);

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
                           $log.log($scope.dimensionSecurityResult);

                           $scope.dimensions = [];
                           for(var i = 0; i < $scope.dimensionSecurityResult.rows.length; i++){
                              var item = {
                                 name : "",
                                 groupsWithAccess : []
                              }
                              item.name = $scope.dimensionSecurityResult.rows[i]["}Dimensions"].name;

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
                                 
                              }
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
                        // 
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
                     var groupsMDX = groupsArrayToGroupsMDX($scope.view.groups);

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
                     var groupsMDX = groupsArrayToGroupsMDX($scope.view.groups);

                     var url = "/ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes;$expand=Parent($select=Name);$expand=Element($select=Name,Type,Level)))),Cells($select=Value,Updateable,Consolidated,RuleDerived,HasPicklist,FormatString,FormattedValue)";
                     var mdx = "SELECT NON EMPTY" + groupsMDX + "ON COLUMNS, NON EMPTY {TM1SUBSETALL( [}Chores] )} ON ROWS FROM [}ChoreSecurity]"
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

                  var groupsArrayToGroupsMDX = function(userGroupsArray){
                     var groupsMDX = "";
                     if(userGroupsArray.length>0){
                        angular.forEach(userGroupsArray, function(value, key){
                           groupsMDX = groupsMDX + "[}Groups].[" + value.Name + "],";
                        })
                        groupsMDX = "{" + groupsMDX.slice(0, -1) + "}";
                        return groupsMDX;
                     }
                  }


               }],
               data: {
                  usersWithGroups : $scope.usersWithGroups,
                  view : $scope.view,
                  instance : $scope.instance,
               }
            });

         }


         $scope.includedInGroup = true;
         $scope.toggleIncludedInGroup = function(){
            $scope.includedInGroup = !$scope.includedInGroup;
         }

         $scope.showMoreGroups = function(userIndex){
            var step = $rootScope.uiPrefs.groupsDisplayNumber;
            $scope.usersWithGroups[userIndex].groupsDisplay = $scope.usersWithGroups[userIndex].groupsDisplay + step;
            if($scope.usersWithGroups[userIndex].groupsDisplay > $scope.usersWithGroups[userIndex].groupsMax){
               $scope.usersWithGroups[userIndex].groupsDisplay = $scope.usersWithGroups[userIndex].groupsMax;
            }
            $scope.usersWithGroups[userIndex].groupsRemaining = $scope.usersWithGroups[userIndex].groupsMax - $scope.usersWithGroups[userIndex].groupsDisplay;

            return true;
         }


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
            }else{
               accessColour = "badge badge-light"
            }

            return accessColour;

         }


         $scope.updateGroupsArray = function(newGroup, previousGroups){
            //used in addUser, addUserToGroup
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
                           $scope.view.message = $translate.instant("FUNCTIONADDUSERERROR");
                           $scope.view.messageWarning = true;
                           $timeout(function(){
                              $scope.view.message = null;
                              $scope.view.messageWarning = false;
                           }, 2000);
                           return;
                        
                        }else if(success.status < 400){
                           $scope.view.message = $translate.instant("FUNCTIONADDUSERSUCCESS");
                           $scope.view.messageSuccess = true;

                           $timeout(function(){
                              $scope.view.message = null;
                              $scope.view.messageSuccess = null;
                              $scope.closeThisDialog();
                              $scope.ngDialogData.load();
                           }, 2000);

                           return;

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

                  $scope.closeThisDialog = function(){
                     ngDialog.close();
                  }

              
               }],
               data: {
                  view : $scope.view,
                  updateGroupsArray : $scope.updateGroupsArray,
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


         $scope.editGroup = function(rowIndex){
            ngDialog.open({
               template: "__/plugins/users-groups/editGroup.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     name : $scope.ngDialogData.groupsWithUsers[rowIndex].Name
                  }


                  $scope.updateGroup = function(groupName, password){
                     if(password){
                        $scope.updatePassword(groupName, password);
                     }

                  }


               }],
               data: {
                  groupsWithUsers : $scope.groupsWithUsers,
                  view : $scope.view,
                  instance : $scope.instance,
               }
            });

         }


         $scope.addGroup = function(){
            ngDialog.open({
               template: "__/plugins/users-groups/addGroup.html",
               className: "ngdialog-theme-default large",
               scope: $scope,
               controller: ['$rootScope', '$scope', '$http', '$state', '$tm1','$log', function ($rootScope, $scope, $http, $state, $tm1, $log) {
 
                  $scope.view = {
                     name: '',
                     groups: [],
                  }

                  $scope.createGroup = function(){
                     //WORK IN PROGRESS
                     var url = "/Users";
                     var data = {
                        "Name" : $scope.view.name,
                        "Groups@odata.bind": $scope.ngDialogData.updateGroupsArray($scope.view.groups)
                     }
                     // $http.post(encodeURIComponent($scope.$parent.instance) + url, data).then(function(success,error){
                        // if(success.status == 401){
                           // $scope.view.message = "User Exists";
                           // $timeout(function(){
                              // $scope.view.message = null;
                           // }, 2000);
                           // return;
                        
                        // }else if(success.status < 400){
                           // $scope.view.message = "User added";

                           // $timeout(function(){
                              // $scope.view.message = null;
                              // $scope.closeThisDialog();
                              // $scope.ngDialogData.load();
                           // }, 2000);

                           // return;

                        // }else{
                           // Error to display on page
                           // if(success.data && success.data.error && success.data.error.message){
                              // $scope.view.message = success.data.error.message;
                           // }
                           // else {
                              // $scope.view.message = success.data;
                              
                           // }
                           // $timeout(function(){
                              // $scope.view.message = null;
                           // }, 2000);
                        // }
                     // });

                  }

                  $scope.closeThisDialog = function(){
                     ngDialog.close();
                  }

              
               }],
               data: {
                  view : $scope.view,
                  updateGroupsArray : $scope.updateGroupsArray,
                  load : $scope.load
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


         $scope.$on("close-tab", function(event, args) {
               $log.log('in close tab function');
               $log.log(args);

               // Event to capture when a user has clicked close on the tab
               if(args.page == "usersGroups" && args.instance == $scope.instance && args.name == null){
                  // The page matches this one so close it
                  $rootScope.close(args.page, {instance: $scope.instance});
               }
         });

        

        }]
    };
});