/*jshint esversion: 6 */

const router = require('express').Router();
const multer = require('multer');
const fs = require('mz/fs');
const path = require('path');
const lodash = require('lodash');
const archiver = require('archiver');
const rimraf = require('rimraf');

const dirExists = fs.existsSync;    //  fs.existsSync might get deprecated (or is already?)
const fileExists = fs.existsSync;  //   might need a rewrite.

var getDestination = function(req, file) {
  var dir = './uploads';
  if ( !dirExists(dir) ) {
    fs.mkdirSync(dir);
  }
  return dir;
};
var getFileName = function(req, file) {
  var dest = getDestination(req, file);
  var filename = file.originalname;
  console.log('getting file name');
  if ( fileExists(dest + '/' + filename) ) {
    console.log(filename + ' already exists');
    var name = path.parse(filename).name;
    var ext = path.extname(filename);
    var ending = '';
    var iter = 1;
    var available = false;
    while ( !available ) {
      ending = '(' + iter + ')';
      filename = name + ending + ext;
      available = !fileExists(dest + '/' + filename);
      iter += 1;
    }
  }
  console.log('returning filename = ' + filename);
  return filename;
};

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, getDestination(req, file));
  },
  filename: function (req, file, cb) {
    cb(null, getFileName(req, file));
  }
});
var upload = multer({ storage: storage });

// returns promise
var gatherFiles = function(currDir) {
  var files = [];

  return fs.readdir(currDir)
    .then(function(items) {
      var promises = [];
      lodash.each(items, function(item) {
        promises.push(createItem(currDir, item));
      });
      return Promise.all(promises);
    });
};

var createItem = function(currDir, name) {
  var item = {
    path: currDir,
    name: name,
    label: name ,
    size: 0,
    isFile: false,
    isDir: false,
  };
  var itemPath = path.join(currDir, name);
  return fs.stat(itemPath)
    .then(function(stats) {
      if ( stats.isFile() ) {
        item.isFile = true;
        item.size = stats.size;
        item.label += ' (' + stats.size + ' bytes)';
        return Promise.resolve(item);
      } else if ( stats.isDirectory() ) {
        item.isDir = true;
        return gatherFiles(itemPath)
          .then(function(children) {
            if ( stats.size ) {
              item.size = stats.size;
              lodash.each(children, function(child) {
                item.size += child.size;
              });
              item.label += '(' + item.size + ' bytes)';
            } else {
              console.log('there is no size');
            }
            item.children = children;
            return Promise.resolve(item);
          });
      } else {
        return Promise.resolve(item);
      }
    })
    .then(undefined, function(err) {
      return Promise.resolve(item);
    });
};

// returns promise
var ensureTopDirectory = function(dir, doNotCreate) {
  return fs.stat(path.join(dir))
    .then(function(stats) {
      if ( stats.isDirectory() ) {
        return Promise.resolve(true);
      } else {
        return Promise.reject(dir + ' is not a directory');
      }
    }, function(err) {
      if ( !!doNotCreate ) {
        return Promise.reject();
      } else {
        return fs.mkdir(dir);
      }
    });
};

// returns a promise
const zipDownloads = './upload_zips';
var zipDirectory = function(zipDir) {
  var doNotCreate = true;
  var zipName = path.basename(zipDir) + '.zip';
  var modPath = path.join(zipDownloads, zipName);
  console.log('gonna start zippin ' + zipDir + ' to ' + zipName);
  return ensureTopDirectory(zipDir, doNotCreate)
    .then(function() {
      console.log('got zipDir');
      return ensureTopDirectory(zipDownloads);
    }).then(function() {
      return new Promise(function(resolve, reject) {
        console.log('gonna zip er up good');
        var output = fs.createWriteStream(modPath);
        var archive = archiver('zip');

        output.on('close', function() {
          console.log(archive.pointer() + ' total bytes');
          console.log('archiver has been finalized and the output file descriptor has closed');
          return resolve();
        });

        archive.on('error', function(err) {
          console.log('got console error');
          return reject(err);
        });

        archive.pipe(output);
        archive.directory(zipDir, path.basename(zipDir));
        archive.finalize();
      });
    }).then(function() {
      console.log('in the final zip then');
      return Promise.resolve(modPath);
    });

};

// returns a Promise
var removeDirectoryContents = function(dirPath) {
  return new Promise(function(resolve, reject) {
    rimraf(dirPath, {}, function(err) {
      if ( !!err ) {
        return reject(err);
      } else {
        return resolve(true);
      }
    });
  });
};


module.exports = function() {

  // upload csv
  router.post('/', upload.single('file'), function(req, res, next) {
    res.status(201).json({success: true});
  });

  router.get('/', function(req, res, next) {
    var dir = './uploads';
    fs.stat(dir)
      .then(function(stats) {
        console.log('stats = '  + stats);
        return Promise.resolve();
      }, function(err) {
        console.log('err = ' + err);
        return fs.mkdir(dir);
      }).then(function() {
        return gatherFiles(dir);
      }).then(function(files) {
        res.status(200).json(files);
      }).then(undefined, function(err) {
        return next(err);
      });
    var files = [];
  });

  router.post('/download', function(req, res, next) {
    var err;
    if ( !req.body || !req.body.item ) {
      err = new Error('No file information was included');
      err.status = 400;
      next(err);
    }
    var item = req.body.item;
    console.log('item = ' + JSON.stringify(item, null, 2));
    var originalFilePath = path.join(item.path, item.name);
    console.log('originalFilePath = ' + originalFilePath);

    fs.stat(originalFilePath)
      .then(function(stats) {
        console.log('checking stats');
        if(stats.isFile()) {
          console.log('is a file');
          return Promise.resolve(false);
        } else if ( stats.isDirectory() ) {
          return zipDirectory(originalFilePath);
          // res.json({isFile: false});
        } else {
          return Promise.reject('Not downloadable. Is neither a file nor a directory');
        }
      })
      .then(function(amendedFP) {
        if ( amendedFP ) {
          console.log('got an amendedFP = ' + amendedFP);
          originalFilePath = amendedFP;
          item.name = path.basename(amendedFP);
          return fs.stat(amendedFP);
        } else {
          return fs.stat(originalFilePath);
        }
      })
      .then(function(stats) {
        console.log('checked stats again');
        if ( !stats.isFile() ) {
          console.log('is no a file');
          return Promise.reject('Still not downloadable. Don\'t know what is wrong');
        }
        console.log('about to download ' + originalFilePath + ' with name = ' + item.name);
        return new Promise(function(resolve, reject) {
          res.download(originalFilePath, item.name, function(err) {
            if ( !!err ) {
              return reject(err);
            } else {
              return resolve(true);
            }
          });
        });
      })
      .then(function() {
        // empty uploads_zips
        return removeDirectoryContents(zipDownloads);
      })
      .then(function() {
        // done..
      })
      .then(undefined, function(err) {
        next(err.status(400));
      });

    // var item = req.data.item;
    // console.log('item = ' + item);
    // err = new Error('blablabla');
    // err.status = 400;
    // next(err);
  });

  // router.get('/download*', function(req, res, next) {
  //   var item = req.params[0];
  //   console.log('item = ' + item);
  //   // res.json({params: req.params});
  //   var originalFilePath = '.' + item;
  //   var amendedFilePath = originalFilePath;
  //   var fileName = path.parse(originalFilePath).base;
  //   console.log('fileName = ' + fileName);
  //   fs.stat(originalFilePath)
      // .then(function(stats) {
      //   if(stats.isFile()) {
      //     return Promise.resolve(originalFilePath);
      //   } else if ( stats.isDirectory() ) {
      //     res.json({isFile: false});
      //   } else {
      //     return Promise.reject('Not downloadable. Is neither a file nor a directory');
      //   }
      // })
      // .then(function(amendedFP) {
      //   amendedFilePath = amendedFP;
      //   return fs.stat(amendedFilePath);
      // })
      // .then(function(stats) {
      //   if ( !stats.isFile() ) {
      //     return Promise.reject('Still not downloadable. Don\'t know what is wrong');
      //   }
      //   console.log('about to download ' + amendedFilePath);
      //   res.download(amendedFilePath);
      // })
      // .then(undefined, function(err) {
      //   next(err);
      // });
  //
  // });

  return router;
};
