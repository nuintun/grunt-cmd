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
    function compressor(code){
        return cleancss.process(code, {
            keepSpecialComments: 0,
            removeEmpty: true,
            debug: verbose
        });
    }

    // css concat
    exports.cssConcat = function (file, options){
        var fpath = normalize(file.src);
        var code = grunt.file.read(fpath);
        var meta = css.parse(code)[0];
        var id = meta.id;
        var records = grunt.option('concat-records');
        var imports = [];

        // no id
        if (!id) {
            grunt.log.write('>>   '.red + 'Require a transported file'.red + linefeed);
            return false;
        }

        // for each import
        while (hasImport()) {
            // nothing
        }

        // check import
        function hasImport(){
            var hasImport = false;
            code = css.stringify(meta.code, function (node){
                if (node.type === 'import' && node.id) {
                    hasImport = true;
                    return importNode(node);
                }
            });
            return hasImport;
        }

        // import node
        function importNode(node){
            // circle imports
            if (grunt.util._.contains(imports, node.id)) return false;
            // cache id
            imports.push(node.id);

            var fpath, meta;
            if (node.id.charAt(0) === '.') {
                fpath = normalize(path.join(path.dirname(file.src), node.id));
                if (!/\.css$/.test(fpath)) fpath += '.css';
                if (!grunt.file.exists(fpath)) {
                    grunt.log.write('>>   '.red + 'File '.red + fpath.grey + ' not found'.red + linefeed);
                    return false;
                }

                meta = css.parse(grunt.file.read(fpath))[0];

                // remove circle imports
                if (meta.id === id) {
                    grunt.log.write('>>   '.red + 'File '.red + fpath.grey + ' has circle dependencies'.red + linefeed);
                    return false;
                }
                if (!meta.id) {
                    grunt.log.write('>>   '.red + 'File '.red + fpath.grey + ' has no defined id'.red + linefeed);
                }

                meta.id = node.id;
                
                return meta;
            }
            
            // find file in librarys
            var fileInPaths;
            options.librarys.some(function (basedir){
                fpath = normalize(path.join(basedir, node.id));
                if (!/\.css$/.test(fpath)) fpath += '.css';
                if (grunt.file.exists(fpath)) {
                    fileInPaths = fpath;
                    return true;
                }
            });
            
            if (!fileInPaths) {
                grunt.log.write('>>   '.red + 'File '.red + node.id.grey + ' not found'.red + linefeed);
                return false;
            }
            
            meta = css.parse(grunt.file.read(fileInPaths))[0];

            if (!meta.id) grunt.log.write('>>   '.red + 'File '.red 
                + fileInPaths.grey + ' has no defined id'.red + linefeed);

            meta.id = node.id;
            return meta;
        }

        // get css code string
        function getCode(){
            meta = css.parse(meta)[0];
            return css.stringify(meta.code, function (node){
                if (node.id && records[node.id]) return false;             
                if (!node.id) return false;
                if (node.id.charAt(0) === '.') node.id = iduri.absolute(id, node.id);                
                if (records[node.id]) return false;
                records[node.id] = node.id;
                return node;
            });
        }

        // concat info
        var concat = {
            compressor: {
                id: /\.css$/.test(id) ? id : id + '.css',
                code: []
            },
            uncompressor: {
                id: /\.css$/.test(id) ? id.replace(/\.css$/, '-debug.css') : id + '-debug.css',
                code: []
            }
        };

        // css code
        code = getCode();
        // compressor code
        concat.compressor.code.push(format('/*! define %s */', concat.compressor.id), code);
        concat.compressor.code = concat.compressor.code.join(linefeed);
        grunt.log.write('>>   '.green + 'Compressoring css '.cyan + linefeed);
        concat.compressor.code = compressor(concat.compressor.code);
        grunt.log.write('>>   '.green + 'Compressor css success'.cyan + ' ...').ok();
        // uncompressor content
        concat.uncompressor.code.push(format('/*! define %s */', concat.uncompressor.id), code);
        concat.uncompressor.code = concat.uncompressor.code.join(linefeed);
        return concat;
    };

    return exports;
};
