angular.module('LocalUploader').factory('DownloadService', [
  '$resource',
  '$http',
  'FileSaver',
  'Blob',
  function($resource, $http, FileSaver, Blob) {

    var state = {
      files: [],
    };


    var refreshFiles = function() {
      var Files = $resource('api/upload');
      return Files.query().$promise.then(function(files) {
        if ( !!files ) {
          // state.files.splice(0, state.files.length, ...files);
          state.files.splice(0, state.files.length);
          for(var i=0; i<files.length; i++) {
            state.files.push(files[i]);
          }
        }
      });
    };
    refreshFiles();


    var download = function(item) {
      $http({
        url: 'api/upload/download',
        method: 'POST',
        data: {
          item: item,
        },
        responseType: 'blob',
      }).then(function(payload) {
        console.log('payload = ' + JSON.stringify(payload, null, 2) );
        var blob = new Blob([payload.data]);
        var fileName = payload.headers('content-disposition');
        fileName = fileName.split(';')[1].trim().split('=')[1];
        fileName = fileName.replace(/"/g, '');
        FileSaver.saveAs(blob, fileName);
      }, function(err) {
        console.log('Unable to download file err = ' + err);
      });
    };

    return {
      state: state,
      refreshFiles: refreshFiles,
      download: download,
    };
  },
]);
