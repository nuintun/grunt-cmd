/**
 * deploy script helper
 * author : Newton
 **/
exports.init = function(grunt) {
    var exports = {};
    var linefeed = grunt.util.linefeed;
    var path = require('path');
    var cmd = require('../../cmd-util');
    var ast = cmd.ast;
    var iduri = cmd.iduri;
    var UglifyJS = require('uglify-js');
    var verbose = grunt.option('verbose');

    // normalize uri to linux format
    function normalize(uri) {
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // debug modify
    function modify(code) {
        var parsed = ast.modify(code, function(v) {
            var ext = path.extname(v);
            return ext ? v.replace(new RegExp('\\' + ext + '$'), '-debug' + ext) : v + '-debug';
        });
        // return code
        return parsed.print_to_string({
            beautify: true,
            comments: true
        });
    }

    // minify
    function compressor(code) {
        return UglifyJS.minify(code, {
            outSourceMap: '{{file}}',
            fromString: true,
            warnings: verbose
        });
    }

    // fix sourcemap
    function fixSourcemap(code, file) {
        var mini = iduri.basename(file);
        var full = mini.replace(/\.js$/, '-debug.js');
        return code.replace('"file":"{{file}}"', '"file":"' + mini + '"')
            .replace('"sources":["?"]', '"sources":["' + full + '"]');
    }

    // combine, not include the excludes file
    // default read file from fpath, but you can set from code string by set fromstr args
    function combine(fpath, options, fromstr) {
        var merger = [];
        // file path, if set fromstr, fpath equal code
        fpath = fromstr ? fpath : normalize(path.join(options.librarys, options.root, iduri.appendext(fpath)));
        // file not existe
        if (!fromstr && !grunt.file.exists(fpath)) {
            grunt.log.write('>>   '.red + 'Can\'t find module '.red + fpath.grey + linefeed);
            return merger;
        }
        // deps, excludes, records, code, meta      
        var code = fromstr ? fpath : grunt.file.read(fpath);
        var meta = ast.parseFirst(code);
        var excludes = options.excludes;
        // cache readed file, prevent an circle loop, optimize efficiency
        var records = grunt.option('concat-records');

        if (records[meta.id]) return merger;
        records[meta.id] = meta.id;
        merger.push(code);

        meta.dependencies.forEach(function(id) {
            // relative require
            if (id.charAt(0) === '.') {
                id = iduri.absolute(meta.id, id);
            }
            // deep combine
            if (!records[id] && id !== meta.id && excludes.indexOf(id) === -1 && /\.js$/.test(iduri.appendext(id))) {
                merger = merger.concat(combine(id, options));
            }
        });

        return merger;
    }

    // exports js concat
    exports.jsConcat = function(file, options) {
        // code set
        var code = [];
        var excludes = options.excludes;
        var meta = ast.parseFirst(file.code);
        // concat
        switch (options.include) {
            case '.':
                meta.dependencies.forEach(function(id) {
                    if (id.charAt(0) === '.') {
                        id = iduri.absolute(meta.id, id);
                        if (excludes.indexOf(id) === -1 && id !== meta.id) {
                            var fpath = normalize(path.join(options.librarys, options.root, iduri.appendext(id)));
                            if (grunt.file.exists(fpath)) {
                                code.push(grunt.file.read(fpath));
                            } else {
                                grunt.log.write('>>   '.red + 'Can\'t find module '.red + fpath.grey + linefeed);
                            }
                        }
                    }
                });
                code.push(file.code);
                break;
            case '*':
                code = combine(file.code, options, true).reverse();
                break;
            default:
                code.push(file.code);
                break;
        }

        // merger result
        var merger = {
            compressor: {
                id: iduri.appendext(meta.id)
            },
            uncompressor: {
                id: iduri.appendext(meta.id + '-debug')
            }
        };

        // get merger code
        merger.compressor.code = merger.uncompressor.code = code.join(linefeed);
        // scurce map name
        var sourcemapName = merger.compressor.id.split('/').pop() + '.map';
        // create minify file
        grunt.log.write('>>   '.green + 'Compressoring script '.cyan + linefeed);
        var compressorAst = compressor(merger.compressor.code, sourcemapName);
        grunt.log.write('>>   '.green + 'Compressor script success'.cyan + ' ...').ok();
        merger.compressor.code = compressorAst.code + linefeed + '//@ sourceMappingURL=' + sourcemapName;
        // create source map
        grunt.log.write('>>   '.green + 'Createing script sourcemap '.cyan + linefeed);
        // sourcemap info
        merger.sourcemap = {
            id: iduri.join(iduri.dirname(merger.compressor.id), sourcemapName),
            code: fixSourcemap(compressorAst.map, merger.compressor.id)
        };
        grunt.log.write('>>   '.green + 'Create script sourcemap success'.cyan + ' ...').ok();
        // create debug file
        grunt.log.write('>>   '.green + 'Createing debug script '.cyan + linefeed);
        merger.uncompressor.code = modify(merger.uncompressor.code);
        grunt.log.write('>>   '.green + 'Create debug script success'.cyan + ' ...').ok();
        // return merger result
        return merger;
    };

    return exports;
};