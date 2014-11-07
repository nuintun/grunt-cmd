/**
 * deploy style helper
 * author : Nuintun
 **/
var path = require('path'),
    cmd = require('cmd-helper'),
    format = require('util').format,
    css = cmd.css,
    iduri = cmd.iduri,
    CleanCss = require('clean-css'),
    RELPATH_RE = /^\.{1,2}[/\\]/;

exports.init = function (grunt){
    var exports = {},
        linefeed = grunt.util.linefeed,
        log = require('../../log').init(grunt),
        verbose = grunt.option('verbose');

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
        var records,
            code = grunt.file.read(file.src),
            meta = css.parse(code)[0],
            id = meta.id,
            data = {
                minify: {
                    code: '',
                    dist: file.dist
                },
                source: {
                    code: '',
                    dist: file.dist.slice(0, -4) + '-debug.css'
                }
            };

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
            var fpath, meta, id = node.id;

            if (RELPATH_RE.test(id)) {
                if (parent && parent.id) {
                    id = node.id = iduri.absolute(parent.id, id);
                } else {
                    log.warn('  Require a transported file !'.red);
                    return;
                }
            }

            // find file in librarys
            fpath = iduri.normalize(path.join(options.buildRoot, options.familyRoot, iduri.realpath(id)));

            // circle imports
            if (records[fpath]) return;

            // cache id
            records[fpath] = true;

            // add extname
            if (fpath.slice(-4) !== '.css') fpath += '.css';

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

        // compressor code
        log.info('  Compressoring css'.cyan);
        data.minify.code = format('/*! define %s */', data.minify.dist) + linefeed + code;
        data.minify.code = minify(data.minify.code);
        log.ok('  Compressor css success'.cyan);

        if (options.debugFile) {
            // create debug file
            log.info('  Creating debug css'.cyan);
            data.source.code = format('/*! define %s */', data.source.dist) + linefeed + code;
            log.ok('  Create debug css success'.cyan);
        }

        return data;
    };

    return exports;
};
