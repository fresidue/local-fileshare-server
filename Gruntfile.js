var _ = require('lodash');

module.exports = function(grunt) {

  var _banner = '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> */';
  var _dist_body = 'public/dist/<%= pkg.name %>-<%= pkg.version %>';
  var _dist_css = _dist_body + '.css';
  var _dist_css_min = _dist_body + '.min.css';
  var _dist_js = _dist_body + '.js';
  var _dist_js_min = _dist_body + '.min.js';
  var _bower_js_dist = 'public/dist/_bower.js';
  var _bower_css_dist = 'public/dist/_bower.css';

  var minify_bower = false;

  var port = grunt.option('port') || 3000;

  var clientFiles = [
    'public/js/app.js',     // need to make sure this one is included first
    'public/js/**/*.js',
  ];

  var cssFiles = [
    "public/css/*.css",
  ];

  var serverFiles = [
    'app.js',
    'routes/**/*.js',  // should be able to replace this guy for all the ones below
  ];

  var allSourceFiles = ['Gruntfile.js'].concat(clientFiles).concat(serverFiles);

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    concurrent: {
      start: {
        tasks: [
          'watch:client',
          'watch:server',
          'nodemon',
        ],
        options: {
          logConcurrentOutput: true,
        },
      },
    },

    nodemon: {
      dev: {
        options: {
          nodeArgs: ['--port', port],
          watch: serverFiles,
        },
      },
    },

    watch: {
      client: {
        files: clientFiles.concat(cssFiles),
        tasks: [
          'wiredep:develop',  // injects individual bower components
          'jshint:hint_client',
          'injector:develop',
        ],
        options: {
          livereload: true,
        },
      },
      server: {
        files: ['Gruntfile.js'].concat(serverFiles),
        tasks: [
          'jshint:hint_server',
        ],
      },
    },


    jshint: {
      hint_server: {
        files: {
          src: ['Gruntfile.js'].concat(serverFiles),
        },
        options: {
          reporter: require('jshint-stylish'),
        },
      },
      hint_client: {
        files: {
          src: clientFiles,
        },
        options: {
          reporter: require('jshint-stylish'),
        },
      },
    },


    injector: {
      develop:{
        options: {
          ignorePath: 'public/',
        },
        files: {
          'public/index.html': clientFiles.concat(cssFiles),
        },
      },
    },



    wiredep: {
      develop: {
        src: ["public/index.html"],
        options: {
          fileTypes: {
            html: {
              replace: {
                js: '<script type="text/javascript" src="/{{filePath}}"></script>',
                css: '<link type="text/css" rel="stylesheet" href="/{{filePath}}"/>',
              },
            },
          },
        },
      },
    },


  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-injector');
  grunt.loadNpmTasks('grunt-wiredep');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-concurrent');


  // the default task
  grunt.registerTask('go', ['concurrent:start']);
  grunt.registerTask('default', 'go');

};
