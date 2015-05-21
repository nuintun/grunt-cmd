/*
 * grunt-contrib-clean
 * http://gruntjs.com/
 *
 * Copyright (c) 2014 Tim Branyen, contributors
 * Licensed under the MIT license.
 */
var path = require('path'),
  iduri = require('cmd-helper').iduri;

module.exports = function (grunt){
  var rimraf = require('./rimraf')(grunt);

  function clean(filepath, options){
    filepath = iduri.normalize(filepath);

    if (!grunt.file.exists(filepath)) {
      return false;
    }

    grunt.log.write('$ '.green
      + (options['no-write'] ? 'Not actually cleaning ' : 'Cleaning ').cyan
      + filepath.grey + ' ...');

    // Only delete cwd or outside cwd if --force enabled. Be careful, people!
    if (!options.force) {
      if (grunt.file.isPathCwd(filepath)) {
        grunt.verbose.error();
        grunt.fail.warn('Cannot delete the current working directory.'.red);
        return false;
      } else if (!grunt.file.isPathInCwd(filepath)) {
        grunt.verbose.error();
        grunt.fail.warn('Cannot delete files outside the current working directory.'.red);
        return false;
      }
    }

    try {
      // Actually delete. Or not.
      if (!options['no-write']) {
        rimraf.sync(filepath);
      }

      grunt.log.ok();
    } catch (e) {
      grunt.log.error();
      grunt.fail.warn('Unable to delete '.red
        + filepath.grey + (' file (' + e.message + ').').red, e);
    }
  }

  grunt.registerMultiTask('clean', 'Clean files and folders.', function (){
    var options, that = this;

    // Merge task-specific and/or target-specific options with these defaults.
    options = that.options({
      force: grunt.option('force') === true,
      'no-write': grunt.option('no-write') === true
    });

    console.time('$'.green + ' Clean time consuming'.cyan);

    // Clean specified files / dirs.
    that.filesSrc.forEach(function (filepath){
      clean(filepath, options);
    });

    console.timeEnd('$'.green + ' Clean time consuming'.cyan);
  });
};