/**
 * deploy script helper
 * author : Newton
 **/
exports.init = function (grunt){
    var exports = {};
    var linefeed = grunt.util.linefeed;
    var path = require('path');
    var cmd = require('cmd-helper');
    var ast = cmd.ast;
    var iduri = cmd.iduri;
    var UglifyJS = require('uglify-js');
    var log = require('../../log').init(grunt);
    var verbose = grunt.option('verbose');
    var RELPATH_RE = /^\.{1,2}[/\\]/;

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // debug modify
    function modify(code, parsers){
        var parsed = ast.modify(code, function (v){
            var ext = path.extname(v);
            return ext && parsers[ext] ?
                v.replace(new RegExp('\\' + ext + '$'), '-debug' + ext) :
                v + '-debug';
        });
        // return code
        return parsed.print_to_string({
            beautify: true,
            comments: true
        });
    }

    // exports modify api
    exports.modify = modify;

    // compressor code
    function compressor(code){
        return UglifyJS.minify(code, {
            outSourceMap: '{{file}}',
            fromString: true,
            warnings: verbose
        });
    }

    // fix sourcemap
    function fixSourcemap(code, file){
        var mini = iduri.basename(file);
        var full = mini.replace(/\.js$/i, '-debug.js');
        return code.replace('"file":"{{file}}"', '"file":"' + mini + '"')
            .replace('"sources":["?"]', '"sources":["' + full + '"]');
    }

    // combine, not include the excludes file
    // default read file from fpath, but you can set from code string by set fromstr args
    function combine(fpath, options){
        // reset records
        grunt.option('concat-records', {});
        var stack = [];
        var excludes = options.excludes;
        var records = grunt.option('concat-records');

        // deep combine helper
        function walk(fpath, options){
            // cache readed file, prevent an circle loop, optimize efficiency
            if (records[fpath]) return;
            records[fpath] = true;
            // file not existe
            if (!grunt.file.exists(fpath)) {
                log.warn('  Can not find module :'.red, fpath.grey, '!'.red);
                return;
            }
            // deps, excludes, records, code, meta      
            var code = grunt.file.read(fpath);
            var meta = ast.parseFirst(code);

            if (meta) {
                if (meta.id) {
                    // walk dependencies modules
                    meta.dependencies.forEach(function (id){
                        // relative require
                        if (RELPATH_RE.test(id)) {
                            id = iduri.absolute(meta.id, id);
                        }
                        var file = iduri.normalize(iduri.appendext(id));
                        // deep combine
                        if (id !== meta.id
                            && excludes.indexOf(id) === -1
                            && /\.js$/i.test(file)) {
                            walk(normalize(path.join(options.librarys, options.root, file)), options);
                        }
                    });
                } else {
                    // module has no module id, it will not work, return it
                    log.warn('  Module :'.red, fpath.grey, 'has no module id !'.red);
                }
            }

            // push code to the first stack
            stack.push(code);
        }

        // start deep combine
        walk(fpath, options);

        // return stack
        return stack;
    }

    // exports combine api
    exports.combine = combine;

    // exports js concat
    exports.jsConcat = function (file, options){
        // reset records
        grunt.option('concat-records', {});
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
                        meta.dependencies.forEach(function (id){
                            if (RELPATH_RE.test(id)) {
                                id = iduri.absolute(meta.id, id);
                                if (excludes.indexOf(id) === -1 && id !== meta.id) {
                                    var file = iduri.normalize(iduri.appendext(id))
                                    var fpath = normalize(path.join(options.librarys, options.root, file));
                                    if (grunt.file.exists(fpath)) {
                                        stack.push(grunt.file.read(fpath));
                                    } else {
                                        log.warn('  Can not find module :'.red, fpath.grey, '!'.red);
                                    }
                                }
                            }
                        });
                    } else {
                        // module has no module id
                        log.warn('  Module :'.red, fpath.grey, 'has no module id !'.red);
                    }
                }
                stack.push(code);
                break;
            case '*':
                stack = combine(fpath, options);
                break;
            default:
                stack.push(grunt.file.read(fpath));
                break;
        }

        // get merger code
        merger.compressor.code = merger.uncompressor.code = stack.join(linefeed);
        // create minify file
        log.info('  Compressoring script'.cyan);
        var compressorAst = compressor(merger.compressor.code);
        merger.compressor.code = compressorAst.code + linefeed;
        log.ok('  Compressoring script success'.cyan);

        if (options.debugfile) {
            // create source map
            grunt.log.write('>>   '.green + 'Creating script sourcemap'.cyan + ' ...' + linefeed);
            log.info('  Creating script sourcemap'.cyan);
            merger.compressor.code += '/*' + linefeed + '//@ sourceMappingURL='
                + iduri.basename(merger.compressor.output) + '.map' + linefeed + '*/';
            // sourcemap info
            merger.sourcemap = {
                output: merger.compressor.output + '.map',
                code: fixSourcemap(compressorAst.map, merger.compressor.output)
            };
            log.ok('  Create script sourcemap success'.cyan);
            // create debug file
            log.info('  Creating debug script'.cyan);
            merger.uncompressor.code = modify(merger.uncompressor.code, options.parsers);
            log.ok('  Create debug script success'.cyan);
        }

        // return merger result
        return merger;
    };

    return exports;
};
