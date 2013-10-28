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
    var RELPATH_RE = /^\.{1,2}[/\\]+/;

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // exports
    exports.jsParser = function (file, options){
        // file content
        var deps = [],
            async = [],
            fpath = normalize(file.src),
            dest = normalize(file.dest),
            code = ast.getAst(file.code);

        // code meta array
        var metas = ast.parse(code);

        // meta
        if (!metas.length) {
            grunt.log.write('>>   '.red + 'File : '.red + fpath.grey + ' not a cmd module !'.red + linefeed);
            return grunt.file.copy(fpath, dest);
        } else if (metas.length > 1) {
            grunt.log.write('>>   '.red + 'File : '.red + fpath.grey + ' contains '.red
                + metas.length.toString().green + ' modules !'.red + linefeed);
        }

        // parse alias
        function parseDeps(alias){
            var id = iduri.parseAlias(options.pkg, alias);
            if (!iduri.isAlias(options.pkg, alias) && !RELPATH_RE.test(id) && deps.concat(async).indexOf(alias) > -1) {
                grunt.log.write('>>   '.red + 'Alias : '.red + alias.green + ' not defined !'.red + linefeed);
            }
            deps.indexOf(id) === -1 && deps.push(id);
            return id;
        }

        // parse async
        function parseAsync(alias){
            var id = iduri.parseAlias(options.pkg, alias);
            if (!iduri.isAlias(options.pkg, alias) && !RELPATH_RE.test(id) && deps.concat(async).indexOf(alias) > -1) {
                grunt.log.write('>>   '.red + 'Alias : '.red + alias.green + ' not defined !'.red + linefeed);
            }
            async.indexOf(id) === -1 && async.push(id);
            return id;
        }

        // modify js file
        code = ast.modify(code, {
            id: function (id){
                id && grunt.log.write('>>   '.red + 'File : '.red + fpath.grey
                    + ' found module id '.red + id.green + ' !'.red + linefeed);
                return id || iduri.idFromPackage(options.pkg, file.name, options.format);
            },
            dependencies: parseDeps,
            require: parseDeps,
            async: parseAsync
        });

        // log deps info
        moduleDependencies(deps, 'Dependencies');
        moduleDependencies(async, 'Async');

        // write file
        grunt.file.write(dest, code.print_to_string({
            beautify: true,
            comments: true
        }));
    };

    // helpers
    function moduleDependencies(deps, type){
        grunt.log.write(deps.length ?
            '>>   '.green + (type + ' : ').green
                + '['.grey + linefeed + '>>   '.green + '   '
                + deps.map(function (deps){
                return deps.green;
            }).join(','.grey + linefeed + '>>   '.green + '   ')
                + linefeed + '>>   '.green + ']'.grey + linefeed :
            '>>   '.green + (type + ' : ').green + '[]'.grey + linefeed);
    }

    // exports
    return exports;
};
