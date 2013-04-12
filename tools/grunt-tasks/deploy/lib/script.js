/**
 * deploy script helper
 * author : Newton
 **/
exports.init = function (grunt){
    var exports = {};
    var linefeed = grunt.util.linefeed;
    var path = require('path');
    var cmd = require('../../cmd-util');
    var ast = cmd.ast;
    var iduri = cmd.iduri;
    var UglifyJS = require('uglify-js');
    var verbose = grunt.option('verbose');

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // debug modify
    function modify(code){
        var parsed = ast.modify(code, function (v){
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
        var full = mini.replace(/\.js$/, '-debug.js');
        return code.replace('"file":"{{file}}"', '"file":"' + mini + '"')
            .replace('"sources":["?"]', '"sources":["' + full + '"]');
    }
    
    // get all concat  dependencies, not include the excludes file
    function concatDeps(fpath, options){
        // file path
        fpath = path.join(options.librarys, options.root, iduri.appendext(fpath));
        // file not existe
        if (!grunt.file.exists(fpath)) {
            grunt.log.write('>>   '.red + 'Can\'t find module '.red + fpath.grey + linefeed);
            return [];
        }
        // deps, excludes, records, code, meta
        var deps = [];
        var excludes = options.excludes;
        var records = grunt.option('concat-records');
        var code = grunt.file.read(fpath);
        var meta = ast.parseFirst(code);

        if (records[meta.id]) return [];
        records[meta.id] = meta.id;

        meta.dependencies.forEach(function (id){
            if (id.charAt(0) === '.') {
                id = iduri.absolute(meta.id, id);                
            }
            if (id !== meta.id && excludes.indexOf(id) === -1) {
                deps.push(id);
                if (/\.js$/.test(iduri.appendext(id))) {
                    deps = grunt.util._.union(deps, concatDeps(id, options));
                }
            }
            records[id] = id;
        });
        
        return deps;
    }

    // exports js concat
    exports.jsConcat = function (file, options){
        var fpath = normalize(file.src);
        // read file
        var deps = [];
        var excludes = options.excludes;
        var code = grunt.file.read(fpath);
        var meta = ast.parseFirst(code);
        var concat = {
            compressor: {
                id: iduri.appendext(meta.id),
                code: []
            },
            uncompressor: {
                id: iduri.appendext(meta.id + '-debug'),
                code: []
            }
        };
        //concat
        switch (options.include) {
            case '.':
                meta.dependencies.forEach(function (id){
                    if (id.charAt(0) === '.') {
                        id = iduri.absolute(meta.id, id);
                        excludes.indexOf(id) === -1 && deps.push(id);
                    }
                });
                break;
            case '*':
                deps = concatDeps(meta.id, options);
                break;
            default :
                break;
        }

        // read file
        deps.forEach(function (id){
            if(id === meta.id) return;
            var fpath = normalize(path.join(options.librarys, options.root, iduri.appendext(id)));
            if(!/\.js$/.test(fpath)) return;
            if (grunt.file.exists(fpath)) {
                var code = grunt.file.read(fpath);
                // minify
                concat.compressor.code.push(code);
                // create debug
                concat.uncompressor.code.push(code);
                // return
                return;
            }
            grunt.log.write('>>   File '.red + fpath.grey + ' not found'.red + linefeed);
        });
        // compressor content
        concat.compressor.code.push(code);
        concat.compressor.code = concat.compressor.code.join(linefeed);
        var sourcemapName = concat.compressor.id.split('/').pop() + '.map';
        grunt.log.write('>>   '.green + 'Compressoring script '.cyan + linefeed);
        var compressorAst = compressor(concat.compressor.code, sourcemapName);
        grunt.log.write('>>   '.green + 'Compressor script success'.cyan + ' ...').ok();
        concat.compressor.code = compressorAst.code + linefeed + '//@ sourceMappingURL=' + sourcemapName;
        // compressor mapping
        grunt.log.write('>>   '.green + 'Createing script sourcemap '.cyan + linefeed);
        concat.sourcemap = {
            id: iduri.join(iduri.dirname(concat.compressor.id), sourcemapName),
            code: fixSourcemap(compressorAst.map, concat.compressor.id)
        };
        grunt.log.write('>>   '.green + 'Create script sourcemap success'.cyan + ' ...').ok();
        // uncompressor content
        concat.uncompressor.code.push(code);
        concat.uncompressor.code = concat.uncompressor.code.join(linefeed);
        grunt.log.write('>>   '.green + 'Createing debug script '.cyan + linefeed);
        concat.uncompressor.code = modify(concat.uncompressor.code);
        grunt.log.write('>>   '.green + 'Create debug script success'.cyan + ' ...').ok();
        return concat;
    };
    return exports;
};
