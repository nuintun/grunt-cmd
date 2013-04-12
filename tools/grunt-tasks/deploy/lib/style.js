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
    var iduri = cmd.iduri;
    var cleancss = require('clean-css');
    var verbose = grunt.option('verbose');

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // compressor css
    function compressor(data){
        return cleancss.process(data, {
            keepSpecialComments: 0,
            removeEmpty: true,
            debug: verbose
        });
    }

    exports.cssConcat = function (file, options){
        var fpath = normalize(file.src);
        var data = grunt.file.read(fpath);
        var meta = css.parse(data)[0];
        var id = meta.id;
        var records = grunt.option('concat-records');
        var imports = [];

        if (!id) {
            grunt.log.write('>>   '.red + 'Require a transported file'.red + linefeed);
            return false;
        }

        while (hasImport()) {
            // TODO nothing
        }

        function hasImport(){
            meta = css.parse(data)[0];

            var hasImport = false;
            data = css.stringify(meta.code, function (node){
                if (node.type === 'import' && node.id) {
                    hasImport = true;
                    return importNode(node);
                }
            });
            return hasImport;
        }

        function importNode(node){
            // circle imports
            if (grunt.util._.contains(imports, node.id)) {
                return false;
            }
            imports.push(node.id);

            var fpath, parsed;
            if (node.id.charAt(0) === '.') {
                fpath = normalize(path.join(path.dirname(file.src), node.id));
                if (!/\.css$/.test(fpath)) fpath += '.css';
                if (!grunt.file.exists(fpath)) {
                    grunt.log.write('>>   '.red + 'File '.red + fpath.grey + ' not found'.red + linefeed);
                    return false;
                }

                parsed = css.parse(grunt.file.read(fpath))[0];

                // remove circle imports
                if (parsed.id === id) {
                    grunt.log.write('>>   '.red + 'File '.red + fpath.grey + ' has circle dependencies'.red + linefeed);
                    return false;
                }
                if (!parsed.id) {
                    grunt.log.write('>>   '.red + 'File '.red + fpath.grey + ' has no defined id'.red + linefeed);
                }

                parsed.id = node.id;
                return parsed;
            }
            var fileInPaths;
            options.librarys.some(function (basedir){
                fpath = normalize(path.join(basedir, node.id));
                if (!/\.css$/.test(fpath)) fpath += '.css';
                var debugfile = fpath.replace(/\.css$/, '-debug.css');
                // prefer debug file, because it contains all meta info
                if (grunt.file.exists(debugfile)) {
                    fileInPaths = debugfile;
                    return true;
                } else if (grunt.file.exists(fpath)) {
                    fileInPaths = fpath;
                    return true;
                }
            });
            if (!fileInPaths) {
                grunt.log.write('>>   '.red + 'File '.red + node.id.grey + ' not found'.red + linefeed);
                return false;
            }
            parsed = css.parse(grunt.file.read(fileInPaths))[0];

            if (!parsed.id) {
                grunt.log.write('>>   '.red + 'File '.red + fileInPaths.grey + ' has no defined id'.red + linefeed);
            }

            parsed.id = node.id;
            return parsed;
        }

        function toString(){
            meta = css.parse(data)[0];
            return css.stringify(meta.code, function (node){
                if (node.id && records[node.id]) {
                    return false;
                }
                if (node.id) {
                    if (node.id.charAt(0) === '.') {
                        node.id = iduri.absolute(id, node.id);
                    }
                    if (records[node.id]) {
                        return false;
                    }
                    records[node.id] = node.id;
                    return node;
                }
            });
        }

        // concat info
        var concat = {
            compressor: {
                id: /\.css$/.test(id) ? id : id + '.css',
                content: []
            },
            uncompressor: {
                id: /\.css$/.test(id) ? id.replace(/\.css$/, '-debug.css') : id + '-debug.css',
                content: []
            }
        };

        // css content
        data = toString();
        // compressor content
        concat.compressor.content.push(format('/*! define %s */', concat.compressor.id), data);
        concat.compressor.content = concat.compressor.content.join(linefeed);
        grunt.log.write('>>   '.green + 'Compressoring css '.cyan + linefeed);
        concat.compressor.content = compressor(concat.compressor.content);
        grunt.log.write('>>   '.green + 'Compressor css success'.cyan + ' ...').ok();
        // uncompressor content
        concat.uncompressor.content.push(format('/*! define %s */', concat.uncompressor.id), data);
        concat.uncompressor.content = concat.uncompressor.content.join(linefeed);
        concat.uncompressor.content = concat.uncompressor.content;
        return concat;
    };

    return exports;
};
