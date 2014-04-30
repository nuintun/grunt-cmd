/**
 * transport task
 * author : Newton
 **/
module.exports = function (grunt){
    var path = require('path');
    var script = require('./lib/script').init(grunt);
    var style = require('./lib/style').init(grunt);
    var log = require('../log').init(grunt);

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // string regexp
    function sourceRegx(source){
        var imp = /[.?*^$\-+|\\/(){}\[\]]/igm;
        source = source.replace(imp, function (match){
            return '\\' + match;
        });
        return new RegExp(source, 'i');
    }

    // registerMultiTask
    grunt.registerMultiTask('transport', 'Transport everything into cmd.', function (){
        console.time('$'.green + ' Transport time consuming'.cyan);
        var that = this;
        // config
        var options = that.options({
            // librarys
            librarys: '.librarys',
            // type root
            root: 'script',
            // module id format
            format: '{{family}}/{{name}}/{{version}}/{{filename}}',
            // create a debug file or not
            debug: true,
            // path or object
            pkg: grunt.file.exists('alias.json') ? grunt.file.readJSON('alias.json') : {alias: {}},
            // process
            process: false,
            // parsers
            parsers: {
                '.js': script.jsParser,
                '.css': style.cssParser
            }
        });

        that.files.forEach(function (file){
            // set librarys dir
            options.librarys = grunt.util._.isString(options.librarys) ? options.librarys : '.librarys';
            // set librarys dir
            options.root = grunt.util._.isString(options.root) ? options.root : 'script';
            // if donot set cwd warn it
            if (!file.cwd) {
                log.warn('Please set cwd !'.red);
                return;
            }
            // for each files
            file.src.forEach(function (fpath){
                // format fpath
                fpath = normalize(fpath);
                // file source
                var source = options.source;
                source = grunt.util._.isFunction(source) ? source(fpath) : source;
                source = grunt.util._.isString(source) ? source : 'src';
                source = source.replace(/\\/g, '/').replace(/^(\.|\/)[./]*|[/]*$/g, '');
                // split file path
                var dirs = normalize(path.dirname(fpath).replace(sourceRegx(source), '')).split('/');
                // file name
                var fname = path.basename(fpath);
                // extname
                var extname = path.extname(fname).toLowerCase();
                // find fileparsers
                var fileparsers = options.parsers[extname];
                // set family name version
                options.pkg.family = options.family || '';
                options.pkg.name = dirs.shift() || '';
                options.pkg.version = dirs.join('/');
                fpath = normalize(path.join(file.cwd, fpath));

                // file not found
                if (!grunt.file.exists(fpath)) {
                    log.warn('File :'.red, fpath.grey, 'not found !'.red);
                    return;
                }
                // set dest file
                var dest = normalize(path.join(
                    options.librarys,
                    options.root,
                    options.pkg.family,
                    options.pkg.name,
                    options.pkg.version,
                    fname
                ));
                // if not has fileparsers copy file
                if (!fileparsers) {
                    // copy file
                    log.info('Transporting'.cyan, fpath.grey);
                    grunt.file.copy(fpath, dest);
                    log.ok('Transport to'.cyan, dest.grey);
                    return;
                }
                // code
                var code = grunt.file.read(fpath);
                // grunt template
                if (options.process) {
                    code = grunt.template.process(code, options.process);
                }

                // file info
                log.info('Transporting'.cyan, fpath.grey);
                // fileparsers
                fileparsers({
                    src: fpath,
                    code: code,
                    name: fname,
                    dest: dest
                }, options);
                log.ok('Transport to'.cyan, dest.grey);
            });
        });
        console.timeEnd('$'.green + ' Transport time consuming'.cyan);
    });
};
