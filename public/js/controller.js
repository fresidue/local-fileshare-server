angular.module('LocalUploader').controller('Controller', [
  '$scope',
  'Upload',
  'BaseUrl',
  'DownloadService',
  function($scope, Upload, BaseUrl, DownloadService) {

    $scope.files = null;
    $scope.errFiles = null;
    $scope.loading = false;

    $scope.selectFiles = function(files, errFiles) {
      $scope.files = [files[0]];
      $scope.errFiles = errFiles;
    };

    $scope.continue = function() {
      if ( !!$scope.files && !!$scope.files.length ) {
        $scope.files[0].upload = Upload.upload({
          url: BaseUrl.state.url + 'api/upload/',
          data: {file: $scope.files[0]},
        });
        $scope.loading = true;
        $scope.files[0].upload.then(function(response) {
          $scope.loading = false;
          $scope.files = null;
          $scope.errFiles = null;
          DownloadService.refreshFiles();
        }, function(err) {
          $scope.loading = false;
          $scope.files = null;
          $scope.errFiles = null;
          console.log('fucked up');
        });
      }
    };

    $scope.downloadFiles = DownloadService.state.files;
    $scope.selectedItem = null;
    $scope.selectDL = function(item) {
      $scope.selectedItem = item;
    };
    $scope.downloadText = function() {
      if ( !$scope.selectedItem ) {
        return "No item selected for download";
      } else {
        if ( $scope.selectedItem.isFile ) {
          return "Download file: " + $scope.selectedItem.name;
        } else if ( $scope.selectedItem.isDir ) {
          return "Download zipped directory: " + $scope.selectedItem.name + '  Not working yet';
        } else {

        }
      }
    };
    $scope.isDownloadable = function() {
      if ( !!$scope.selectedItem ) {
        if ( $scope.selectedItem.isFile || $scope.selectedItem.isDir ) {
          return true;
        }
      }
      return false;
    };
    $scope.downloadSelected = function() {
      if ( !$scope.selectedItem ) {
        return;
      }
      DownloadService.download($scope.selectedItem);
      // DownloadService.download($scope.selectedItem).then(function() {
      //   console.log('download should be done');
      // });
    };
  },
]);
