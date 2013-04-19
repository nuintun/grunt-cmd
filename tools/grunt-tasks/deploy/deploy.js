/**
 * deploy task
 * author : Newton
 **/
module.exports = function (grunt){
    var path = require('path');
    var linefeed = grunt.util.linefeed;
    var script = require('./lib/script').init(grunt);
    var style = require('./lib/style').init(grunt);
    var parsers = {
        '.js': script.jsConcat,
        '.css': style.cssConcat
    };

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // registerMultiTask
    grunt.registerMultiTask('deploy', 'Deploy cmd modules.', function (){
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            librarys: '.librarys',
            output: 'js',
            pkg: grunt.file.readJSON('alias.json'),
            banner: '/** cmd-build author: Newton email: yongmiui@gmail.com **/'
        });

        this.files.forEach(function (file){
            file.src.forEach(function (fpath){
                fpath = normalize(fpath);
                // reset records
                grunt.option('concat-records', {});
                // set librarys dir
                options.librarys = grunt.util._.isString(options.librarys) ? options.librarys : '.librarys';
                // set librarys dir
                options.root = grunt.util._.isString(options.root) ? options.root : 'script';
                // file include
                var include = options.include || 'default';
                include = grunt.util._.isFunction(include) ? include(fpath) : include;
                options.include = include === '.' || include === '*' ? include : 'default';
                // file excludes
                var excludes = options.excludes || [];
                excludes = grunt.util._.isFunction(excludes) ? excludes(fpath) : excludes;
                excludes = Array.isArray(options.excludes) ? excludes : [].push(excludes);
                options.excludes = grunt.util._.uniq(excludes);
                // real file path
                var dest = normalize(path.join(options.output, fpath));
                fpath = normalize(path.join(file.cwd, fpath));
                // file not found
                if (!grunt.file.exists(fpath)) {
                    return grunt.log.write('>> '.red + 'File '.red + fpath.grey + ' not found'.red + linefeed);
                }
                // extname
                var extname = path.extname(fpath).toLowerCase();
                // none parsers
                if (!parsers[extname]) {
                    grunt.log.write('>> '.green + 'Deploying '.cyan + fpath.grey + ' ...' + linefeed);
                    grunt.file.copy(fpath, dest);
                    return grunt.log.write('>> '.green + 'Deploy '.cyan + dest.grey + ' ...').ok();
                }
                // start merger
                grunt.log.write('>> '.green + 'Deploying '.cyan + fpath.grey + ' ...' + linefeed);
                // merger file start
                var merger = parsers[extname]({
                    src: fpath
                }, options);
                // merger fail
                if (!merger) return;
                // banner
                var banner = grunt.util._.isString(options.banner) ? options.banner : '';
                banner = banner.trim();
                banner = banner ? banner + linefeed : banner;
                // minify file
                dest = normalize(path.join(options.output, merger.compressor.output));
                grunt.file.write(dest, banner + merger.compressor.code);
                grunt.log.write('>> '.green + 'Deploy '.cyan + dest.grey + ' ...').ok();
                // source map, for the online debug, now chrome support sourcemap
                if (merger.sourcemap) {
                    dest = normalize(path.join(options.output, merger.sourcemap.output));
                    grunt.file.write(dest, merger.sourcemap.code);
                    grunt.log.write('>> '.green + 'Deploy '.cyan + dest.grey + ' ...').ok();
                }
                // debug file
                dest = normalize(path.join(options.output, merger.uncompressor.output));
                grunt.file.write(dest, banner + merger.uncompressor.code);
                grunt.log.write('>> '.green + 'Deploy '.cyan + dest.grey + ' ...').ok();
            });
        });
    });
};
