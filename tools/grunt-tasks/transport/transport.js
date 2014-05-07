/**
 * transport task
 * author : Newton
 **/
var path = require('path'),
    VERSION_RE = /^(\d+\.){2}\d+$/;

module.exports = function (grunt){
    var script = require('./lib/script').init(grunt),
        style = require('./lib/style').init(grunt),
        log = require('../log').init(grunt);

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // registerMultiTask
    grunt.registerMultiTask('transport', 'Transport everything into cmd.', function (){
        var options, that = this;

        console.time('$'.green + ' Transport time consuming'.cyan);

        // config
        options = that.options({
            // librarys
            librarys: '.librarys',
            // type root
            root: 'script',
            // module id format
            format: '{{family}}/{{name}}/{{version}}/{{filename}}',
            // create a debug file or not
            debug: true,
            // path or object
            pkg: grunt.file.exists('alias.json') ? grunt.file.readJSON('alias.json') : {},
            // process
            process: false,
            // parsers
            parsers: {
                '.js': script.jsParser,
                '.css': style.cssParser
            }
        });
        options.pkg.alias = options.pkg.alias || {};
        options.pkg.family = options.pkg.family || '';
        options.pkg.name = options.pkg.name || '';
        options.pkg.version = options.pkg.version || '';
        // set transport temp librarys dir
        options.librarys = grunt.util._.isString(options.librarys) ? options.librarys : '.librarys';
        // set root dir
        options.root = grunt.util._.isString(options.root) ? options.root : 'script';

        // loop files
        that.files.forEach(function (file){
            // if donot set cwd warn it
            if (!file.cwd) {
                log.warn('Please set cwd !'.red);
                return;
            }

            // for each files
            file.src.forEach(function (fpath){
                var dirname, code, dist,
                    fname, extname, parsers,
                    family, name = '',
                    subname = '', version = '';

                // format fpath
                fpath = normalize(fpath);
                // split file path
                dirname = path.dirname(fpath).split('/');
                // file name
                fname = path.basename(fpath);
                // extname
                extname = path.extname(fname).toLowerCase();
                // find fileparsers
                parsers = options.parsers[extname];

                // set family name version
                for (var i = 0, len = dirname.length; i < len; i++) {
                    if (version) {
                        subname += dirname[i] + '/'
                    } else {
                        if (VERSION_RE.test(dirname[i])) {
                            version = dirname[i];
                        } else {
                            name += dirname[i] + '/'
                        }
                    }
                }

                // name
                name = name.slice(0, -1);
                family = options.pkg.family = options.family || '';
                options.pkg.name = options.name || name;
                options.pkg.version = options.version || version;
                fname = options.pkg.filename = options.filename || subname + fname;
                fpath = normalize(path.join(file.cwd, fpath));

                // file not found
                if (!grunt.file.exists(fpath)) {
                    log.warn('File :'.red, fpath.grey, 'not found !'.red);
                    return;
                }

                // set dest file
                dist = normalize(path.join(
                    options.librarys,
                    options.root,
                    family,
                    name,
                    version,
                    fname
                ));

                // if not has fileparsers copy file
                if (!parsers) {
                    // copy file
                    log.info('Transporting'.cyan, fpath.grey);
                    grunt.file.copy(fpath, dist);
                    log.ok('Transport to'.cyan, dist.grey);
                    return;
                }

                // code
                code = grunt.file.read(fpath);

                // grunt template
                if (options.process) {
                    code = grunt.template.process(code, options.process);
                }

                // file info
                log.info('Transporting'.cyan, fpath.grey);
                // fileparsers
                parsers({
                    src: fpath,
                    code: code,
                    dist: dist
                }, options);
                log.ok('Transport to'.cyan, dist.grey);
            });
        });

        console.timeEnd('$'.green + ' Transport time consuming'.cyan);
    });
};
