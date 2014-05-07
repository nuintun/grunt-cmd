/**
 * deploy style helper
 * author : Newton
 **/
var path = require('path'),
    cmd = require('cmd-helper'),
    format = require('util').format,
    css = cmd.css,
    CleanCss = require('clean-css'),
    RELPATH_RE = /^\.{1,2}[/\\]/;

exports.init = function (grunt){
    var exports = {},
        linefeed = grunt.util.linefeed,
        log = require('../../log').init(grunt),
        verbose = grunt.option('verbose');

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // compressor css
    function minify(code){
        return new CleanCss({
            keepSpecialComments: 0,
            processImport: false,
            benchmark: verbose
        }).minify(code);
    }

    // css concat
    exports.cssConcat = function (file, options){
        var records, dist, data,
            code = grunt.file.read(file.src),
            meta = css.parse(code)[0],
            id = meta.id;

        // reset records
        grunt.option('concat-records', {});

        // get records
        records = grunt.option('concat-records');

        // no id
        if (!id) {
            log.warn('  Require a transported file !'.red);
            return false;
        }

        // for each import
        while (walk()) {
            // nothing
        }

        // walk css file and import require css file
        function walk(){
            var hasImport = false;

            meta = css.parse(code)[0];
            code = css.stringify(meta.code, function (node, parent){
                if (node.type === 'import' && node.id) {
                    hasImport = true;
                    return importNode(node, parent);
                }
            });

            return hasImport;
        }

        // import node
        function importNode(node, parent){
            var fpath, meta;

            if (RELPATH_RE.test(node.id)) {
                if (parent && parent.id) {
                    node.id = iduri.absolute(parent.id, node.id);
                } else {
                    log.warn('  Require a transported file !'.red);
                    return false;
                }
            }

            // find file in librarys
            fpath = normalize(path.join(options.librarys, options.root, node.id));

            // circle imports
            if (records[node.id]) return false;

            // cache id
            records[node.id] = node.id;

            // add extname
            if (!/\.css$/.test(fpath)) fpath += '.css';

            // file not exists
            if (!grunt.file.exists(fpath)) {
                log.warn('  File :'.red, fpath.grey, 'not found !'.red);
                return false;
            }

            // get meta
            meta = css.parse(grunt.file.read(fpath))[0];

            // no meta id
            if (!meta.id) {
                log.warn('  File :'.red, fpath.grey, 'has no defined id !'.red);
            }

            meta.id = node.id;

            return meta;
        }

        // output file path relative the online resource root
        dist = normalize(path.relative(path.join(options.librarys, options.root), file.src));

        // merger info
        data = {
            minify: {
                code: '',
                dist: dist
            },
            source: {
                code: '',
                dist: dist.replace(/\.css$/i, '-debug.css')
            }
        };

        // compressor code
        log.info('  Compressoring css'.cyan);
        data.minify.code = format('/*! define %s */', data.minify.dist) + linefeed + code;
        data.minify.code = minify(data.minify.code);
        log.ok('  Compressor css success'.cyan);

        if (options.debugfile) {
            // create debug file
            log.info('  Creating debug css'.cyan);
            data.source.code = format('/*! define %s */', data.source.dist) + linefeed + code;
            log.ok('  Create debug css success'.cyan);
        }

        return data;
    };

    return exports;
};
