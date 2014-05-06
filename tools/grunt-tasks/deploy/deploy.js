/**
 * deploy task
 * author : Newton
 **/
module.exports = function (grunt){
    var path = require('path'),
        linefeed = grunt.util.linefeed,
        script = require('./lib/script').init(grunt),
        style = require('./lib/style').init(grunt),
        log = require('../log').init(grunt);

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // registerMultiTask
    grunt.registerMultiTask('deploy', 'Deploy cmd modules.', function (){
        var options, that = this;

        console.time('$'.green + ' Deploy time consuming'.cyan);

        // Merge task-specific and/or target-specific options with these defaults.
        options = that.options({
            // modules librarys
            librarys: '.librarys',
            // build debug file
            debugfile: grunt.option('debugfile') === true,
            // build sourcemap
            sourcemap: grunt.option('sourcemap') === true,
            // output root dir
            output: 'js',
            // pkg info
            pkg: grunt.file.exists('alias.json') ? grunt.file.readJSON('alias.json') : {alias: {}},
            // banner
            banner: '/*! cmd-build author: Newton email: yongmiui@gmail.com **/',
            // parsers
            parsers: {
                '.js': script.jsConcat,
                '.css': style.cssConcat
            }
        });
        // set librarys dir
        options.librarys = grunt.util._.isString(options.librarys) ? options.librarys : '.librarys';
        // set librarys dir
        options.root = grunt.util._.isString(options.root) ? options.root : 'script';

        // banner
        options.banner = grunt.util._.isString(options.banner) ? options.banner : '';
        options.banner = options.banner.trim();
        options.banner = options.banner ? options.banner + linefeed : options.banner;

        // loop files
        that.files.forEach(function (file){
            file.src.forEach(function (fpath){
                var include, excludes, extname,
                    dist, data, banner, parsers;

                fpath = normalize(fpath);
                // file include
                include = options.include || 'default';
                include = grunt.util._.isFunction(include) ? include(fpath) : include;
                options.include = include === '.' || include === '*' ? include : 'default';
                // file excludes
                excludes = options.excludes;
                excludes = grunt.util._.isFunction(excludes) ? excludes(fpath) : excludes;
                excludes = Array.isArray(excludes) ? excludes : [excludes];
                options.excludes = grunt.util._.uniq(excludes);
                // real file path
                dist = normalize(path.join(options.output, fpath));
                fpath = normalize(path.join(file.cwd, fpath));

                // file not found
                if (!grunt.file.exists(fpath)) {
                    log.warn('File'.red, fpath.grey, 'not found !'.red);
                    return;
                }

                // extname
                extname = path.extname(fpath).toLowerCase();

                // none parsers
                if (!options.parsers[extname]) {
                    log.info('Deploying'.cyan, fpath.grey);
                    grunt.file.copy(fpath, dist);
                    log.ok('Deploy to'.cyan, dist.grey);
                    return;
                }

                // start merger
                log.info('Deploying'.cyan, fpath.grey);

                // get parsers
                parsers = options.parsers[extname];
                // deploy file start
                data = parsers({
                    src: fpath
                }, options);

                // merger fail
                if (!data) return;

                // banner
                banner = grunt.util._.isString(options.banner) ? options.banner : '';
                banner = banner.trim();
                banner = banner ? banner + linefeed : banner;
                dist = normalize(path.join(options.output, data.minify.dist));

                grunt.file.write(dist, banner + data.minify.code);
                log.ok('Deploy to'.cyan, dist.grey);

                // get sourcemap
                if (options.sourcemap) {
                    if (data.sourcemap) {
                        // source map, for the online debug, now chrome support sourcemap
                        dist = normalize(path.join(options.output, data.sourcemap.dist));
                        grunt.file.write(dist, data.sourcemap.code);
                        log.ok('Deploy to'.cyan, dist.grey);
                    }
                }

                // get debugfile
                if (options.debugfile) {
                    // debug file
                    dist = normalize(path.join(options.output, data.source.dist));
                    grunt.file.write(dist, banner + data.source.code);
                    log.ok('Deploy to'.cyan, dist.grey);
                }
            });
        });

        console.timeEnd('$'.green + ' Deploy time consuming'.cyan);
    });
};
