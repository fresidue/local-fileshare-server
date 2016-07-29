angular.module('LocalUploader', [
  'ngResource',
  'ui.router',
  'ngFileUpload',
  'angular-spinkit',
  'angularBootstrapNavTree', // file listing directive
  'ngFileSaver',  // FileSaver and Blob
]);

angular.module('LocalUploader').config([
  '$stateProvider',
  '$locationProvider',
  '$urlRouterProvider',
  function($stateProvider, $locationProvider, $urlRouterProvider) {

    $locationProvider.html5Mode(true);

    // for any unmatched url, redirect to root
    $urlRouterProvider.otherwise('/root');

    // states
    $stateProvider
      .state('root', {
        url: '/',
        views: {
          'content@': {
            templateUrl: '/views/root.html',
            controller: 'Controller',
          },
        },
      });
  },
]);

// A tiny service to hold the base url
angular.module('LocalUploader').factory('BaseUrl', [
  function() {
    return {
      state: {
        url: null,
      },
    };
  },
]);

// sets the base Url is used for activation link in email sent upon Signup.
angular.module('LocalUploader').run(['$location', 'BaseUrl', function($location, BaseUrl) {
  var port = $location.port();
  BaseUrl.state.url = $location.protocol() + '://' + $location.host() + ((port == 80) ? '' : (':' + port)) +  '/';
  console.log('baseurl = ' + BaseUrl.state.url);
}]);
