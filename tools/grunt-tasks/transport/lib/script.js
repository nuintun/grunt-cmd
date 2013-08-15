/**
 * transport script helper
 * author : Newton
 **/
exports.init = function (grunt){
    var exports = {};
    var path = require('path');
    var ast = require('../../cmd-util').ast;
    var iduri = require('../../cmd-util').iduri;
    var linefeed = grunt.util.linefeed;

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // exports
    exports.jsParser = function (file, options){
        // file content
        var fpath = normalize(file.src);
        var dest = normalize(file.dest);
        var code = ast.getAst(file.code);

        // code meta array
        var meta = ast.parseFirst(code);
        
        // meta
        if (!meta) {
            grunt.log.write('>>   '.red + 'File : '.red + fpath.grey + ' not a cmd module !'.red + linefeed);
            return grunt.file.copy(fpath, dest);
        } else if (meta.id) {
            grunt.log.write('>>   '.red + 'File : '.red + fpath.grey + ' found module id !'.red + linefeed);
            return grunt.file.copy(fpath, dest);
        }
        // deps
        var deps = moduleDependencies(meta, options);
        grunt.log.write(deps.length ?
            '>>   '.green + 'Dependencies : '.green
                + '['.grey + linefeed + '>>   '.green + '   '
                + deps.map(function (deps){
                return deps.green;
            }).join(' ,'.grey + linefeed + '>>   '.green + '   ')
                + linefeed + '>>   '.green + ']'.grey + linefeed :
            '>>   '.green + 'Dependencies : '.green + '[]'.grey + linefeed);
        // modify js file
        code = ast.modify(code, {
            id: iduri.idFromPackage(options.pkg, file.name, options.format),
            dependencies: deps,
            require: function (v){
                return iduri.parseAlias(options.pkg, v);
            },
            async: function (v){
                return iduri.parseAlias(options.pkg, v);
            }
        });
        // write file
        grunt.file.write(dest, code.print_to_string({
            beautify: true,
            comments: true
        }));
    };

    // helpers
    function moduleDependencies(meta, options){
        var deps = [];
        meta.dependencies.forEach(function (id){
            if (iduri.isAlias(options.pkg, id)) {
                deps.push(iduri.parseAlias(options.pkg, id));
            } else {
                deps.push(iduri.normalize(id));
                if (id.charAt(0) !== '.') {
                    grunt.log.write('>>   '.red + 'Alias : '.red + id.green + ' not defined !'.red + linefeed);
                }
            }
        });
        return deps;
    }

    // exports
    return exports;
};
