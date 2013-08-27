/**
 * deploy style helper
 * author : Newton
 **/
exports.init = function (grunt){
    var exports = {};
    var linefeed = grunt.util.linefeed;
    var path = require('path');
    var cmd = require('../../cmd-util');
    var format = require('util').format;
    var css = cmd.css;
    var cleancss = require('clean-css');
    var verbose = grunt.option('verbose');
    var RELPATH_RE = /^\.{1,2}[/\\]+/;

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // compressor css
    function compressor(code){
        return cleancss.process(code, {
            keepSpecialComments: 0,
            removeEmpty: true,
            debug: verbose
        });
    }

    // css concat
    exports.cssConcat = function (file, options){
        var code = grunt.file.read(file.src);
        var meta = css.parse(code)[0];
        var id = meta.id;
        var records = grunt.option('concat-records');

        // no id
        if (!id) {
            grunt.log.write('>>   '.red + 'Require a transported file !'.red + linefeed);
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

            if (RELPATH_RE.test(id)) {
                if (parent && parent.id) {
                    node.id = normalize(path.join(path.dirname(parent.id), node.id));
                }
            }

            // find file in librarys
            fpath = normalize(path.join(path.dirname(file.src), node.id));

            // circle imports
            if (records[node.id]) return false;

            // cache id
            records[node.id] = node.id;

            // add extname
            if (!/\.css$/.test(fpath)) fpath += '.css';

            // file not exists
            if (!grunt.file.exists(fpath)) {
                grunt.log.write('>>   '.red + 'File : '.red + fpath.grey + ' not found !'.red + linefeed);
                return false;
            }

            // get meta
            meta = css.parse(grunt.file.read(fpath))[0];

            // no meta id
            if (!meta.id) {
                grunt.log.write('>>   '.red + 'File : '.red + fpath.grey + ' has no defined id !'.red + linefeed);
            }

            meta.id = node.id;

            return meta;
        }

        // output file path relative the online resource root
        var output = normalize(path.relative(path.join(options.librarys, options.root), file.src));

        // merger info
        var merger = {
            compressor: {
                output: output,
                code: []
            },
            uncompressor: {
                output: output.replace(/\.css$/i, '-debug.css'),
                code: []
            }
        };

        // compressor code
        grunt.log.write('>>   '.green + 'Compressoring css'.cyan + ' ...' + linefeed);
        merger.compressor.code.push(format('/*! define %s */', merger.compressor.output), code);
        merger.compressor.code = merger.compressor.code.join(linefeed);
        merger.compressor.code = compressor(merger.compressor.code);
        grunt.log.write('>>   '.green + 'Compressor css success'.cyan + ' ...').ok();
        // create debug file
        grunt.log.write('>>   '.green + 'Creating debug css'.cyan + ' ...' + linefeed);
        merger.uncompressor.code.push(format('/*! define %s */', merger.uncompressor.output), code);
        merger.uncompressor.code = merger.uncompressor.code.join(linefeed);
        grunt.log.write('>>   '.green + 'Create debug css success'.cyan + ' ...').ok();
        return merger;
    };

    return exports;
};
