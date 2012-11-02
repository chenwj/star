//define the main module
var as = angular.module('angularspring', []);

as.config(function ($routeProvider, $httpProvider) {
    //configure the rounting of ng-view
    $routeProvider.when('/person', { controller: 'PersonController', templateUrl: 'person.html'});
    $routeProvider.when('/admin', { controller: 'AdminController', templateUrl: 'admin/admin.html'});

    //configure $http to catch message responses and show them
    $httpProvider.responseInterceptors.push(function ($q) {
        var setMessage = function (response) {
            //is the response has a text and a type, save it into as.message
            if (response.data.text && response.data.type) {
                as.message = {
                    text: response.data.text,
                    type: response.data.type,
                    show: true
                };
            }
        };
        return function (promise) {
            return promise.then(
                //this is called after each successful server request
                function (response) {
                    setMessage(response);
                    return response;
                },
                //this is called after each unsuccessful server request
                function (response) {
                    setMessage(response);
                    return $q.reject(response);
                }
            );
        };
    });

    //configure $http to show a login dialog whenever a 401 forbidden response arrives
    $httpProvider.responseInterceptors.push(function ($rootScope, $q) {
        return function (promise) {
            return promise.then(
                //success -> don't intercept
                function (response) {
                    return response;
                },
                //error -> if 401 save the request and broadcast an event
                function (response) {
                    if (response.status === 401) {
                        var deferred = $q.defer(),
                            req = {
                                config: response.config,
                                deferred: deferred
                            };
                        $rootScope.requests401.push(req);
                        $rootScope.$broadcast('event:loginRequired');
                        return deferred.promise;
                    }
                    return $q.reject(response);
                }
            );
        };
    });
    as.headers = $httpProvider.defaults.headers;
});


as.run(function ($rootScope, $http,base64) {

    /**
     * Holds all the requests which failed due to 401 response.
     */
    $rootScope.requests401 = [];

    $rootScope.$on('event:loginRequired', function () {
        $('#login').modal('show');
    });

    /**
     * On 'event:loginConfirmed', resend all the 401 requests.
     */
    $rootScope.$on('event:loginConfirmed', function () {
        var i,
            requests = $rootScope.requests401,
            retry = function (req) {
                $http(req.config).then(function (response) {
                    req.deferred.resolve(response);
                });
            };

        for (i = 0; i < requests.length; i += 1) {
            retry(requests[i]);
        }
        $rootScope.requests401 = [];
    });

    /**
     * On 'event:loginRequest' send credentials to the server.
     */
    $rootScope.$on('event:loginRequest', function (event, username, password) {
        as.headers.common['Authorization'] = 'Basic ' + base64.encode(username + ':' + password);
        $http.get('/action/userInfo').success(function (data) {
            $rootScope.$broadcast('event:loginConfirmed');
        });
    });
});