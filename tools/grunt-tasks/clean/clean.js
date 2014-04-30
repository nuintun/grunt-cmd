/*
 * grunt-contrib-clean
 * http://gruntjs.com/
 * Copyright (c) 2012 Tim Branyen, contributors
 * Licensed under the MIT license.
 */
module.exports = function (grunt){
    var path = require('path');

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // register task
    grunt.registerMultiTask('clean', 'Clean files and folders.', function (){
        console.time('$'.green + ' Clean time consuming'.cyan);
        var that = this;
        // Merge task-specific and/or target-specific options with these defaults.
        var options = that.options({
            force: false
        });

        grunt.verbose.writeflags(options, 'Options');

        // Clean specified files / dirs.
        that.filesSrc.forEach(function (filepath){
            filepath = normalize(filepath);
            grunt.log.write('$ '.green + 'Cleaning '.cyan + filepath.grey + ' ...');

            try {
                grunt.file.delete(filepath, options);
                grunt.log.ok();
            } catch (e) {
                grunt.log.error();
                grunt.verbose.error(e);
                grunt.fail.warn('Clean operation failed'.red);
            }
        });
        console.timeEnd('$'.green + ' Clean time consuming'.cyan);
    });
};