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

    // compressor code
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
        var full = mini.replace(/\.js$/i, '-debug.js');
        return code.replace('"file":"{{file}}"', '"file":"' + mini + '"')
            .replace('"sources":["?"]', '"sources":["' + full + '"]');
    }

    // combine, not include the excludes file
    // default read file from fpath, but you can set from code string by set fromstr args
    function combine(fpath, options, fromstr) {
        var stack = [];
        var excludes = options.excludes;
        var records = grunt.option('concat-records');

        // deep combine helper
        function loop(fpath, options) {
            // file path, if set fromstr, fpath equal code
            fpath = normalize(path.join(options.librarys, options.root, iduri.appendext(fpath)));
            // cache readed file, prevent an circle loop, optimize efficiency        
            if (records[fpath]) return;
            records[fpath] = true;
            // file not existe
            if (!grunt.file.exists(fpath)) {
                grunt.log.write('>>   '.red + 'Can not find module : '.red + fpath.grey + ' !'.red + linefeed);
                return stack;
            }
            // deps, excludes, records, code, meta      
            var code = grunt.file.read(fpath);
            var meta = ast.parseFirst(code);

            if (meta) {
                if (meta.id) {
                    // loop dependencies modules
                    meta.dependencies.forEach(function(id) {
                        // relative require
                        if (id.charAt(0) === '.') {
                            id = iduri.absolute(meta.id, id);
                        }
                        // deep combine
                        if (!records[id] && id !== meta.id 
                            && excludes.indexOf(id) === -1 
                            && /\.js$/i.test(iduri.appendext(id))) {
                            loop(id, options);
                        }
                    });
                } else {
                    // module has no module id, it will not work, return it
                    grunt.log.write('>>   '.red + 'Module : '.red + fpath.grey + ' has no module id !'.red + linefeed);
                }
            }

            // push code to the first stack
            stack.push(code);
        }

        // start deep combine
        loop(fpath, options);

        // return stack
        return stack;
    }

    // exports js concat
    exports.jsConcat = function(file, options) {
        // code stack
        var stack = [];
        var excludes = options.excludes;
        var fpath = file.src;
        // output file path relative the online resource root
        var output = normalize(path.relative(path.join(options.librarys, options.root), file.src));
        // merger result
        var merger = {
            compressor: {
                output: output
            },
            uncompressor: {
                output: output.replace(/\.js$/i, '-debug.js')
            }
        };

        // combine
        switch (options.include) {
            case '.':
                var code = grunt.file.read(fpath);
                var meta = ast.parseFirst(code);
                if (meta) {
                    if (meta.id) {
                        // include relative file
                        meta.dependencies.forEach(function(id) {
                            if (id.charAt(0) === '.') {
                                id = iduri.absolute(meta.id, id);
                                if (excludes.indexOf(id) === -1 && id !== meta.id) {
                                    var fpath = normalize(path.join(options.librarys, 
                                        options.root, iduri.appendext(id)));
                                    if (grunt.file.exists(fpath)) {
                                        code.push(grunt.file.read(fpath));
                                    } else {
                                        grunt.log.write('>>   '.red + 'Can not find module : '.red 
                                            + fpath.grey + ' !'.red + linefeed);
                                    }
                                }
                            }
                        });
                    } else {
                        // module has no module id
                        grunt.log.write('>>   '.red + 'Module : '.red + fpath.grey 
                            + ' has no module id !'.red + linefeed);
                    }
                }
                stack.push(code);
                break;
            case '*':
                stack = combine(output, options);
                break;
            default:
                stack.push(grunt.file.read(fpath));
                break;
        }

        // get merger code
        merger.compressor.code = merger.uncompressor.code = stack.join(linefeed);
        // create minify file
        grunt.log.write('>>   '.green + 'Compressoring script'.cyan + ' ...' + linefeed);
        var compressorAst = compressor(merger.compressor.code);
        grunt.log.write('>>   '.green + 'Compressor script success'.cyan + ' ...').ok();
        merger.compressor.code = compressorAst.code + linefeed + '//@ sourceMappingURL=' 
            + iduri.basename(merger.compressor.output) + '.map';
        // create source map
        grunt.log.write('>>   '.green + 'Creating script sourcemap'.cyan + ' ...' + linefeed);
        // sourcemap info
        merger.sourcemap = {
            output: merger.compressor.output + '.map',
            code: fixSourcemap(compressorAst.map, merger.compressor.output)
        };
        grunt.log.write('>>   '.green + 'Create script sourcemap success'.cyan + ' ...').ok();
        // create debug file
        grunt.log.write('>>   '.green + 'Creating debug script'.cyan + ' ...' + linefeed);
        merger.uncompressor.code = modify(merger.uncompressor.code);
        grunt.log.write('>>   '.green + 'Create debug script success'.cyan + ' ...').ok();
        // return merger result
        return merger;
    };

    return exports;
};
