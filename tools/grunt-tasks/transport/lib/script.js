/**
 * transport script helper
 * author : Newton
 **/
exports.init = function (grunt){
    var exports = {};
    var path = require('path');
    var cmd = require('cmd-helper');
    var ast = cmd.ast;
    var iduri = cmd.iduri;
    var log = require('../../log').init(grunt);
    var linefeed = grunt.util.linefeed;
    var RELPATH_RE = /^\.{1,2}[/\\]/;

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
        var metas = ast.parse(code);

        // meta
        if (!metas.length) {
            log.warn('  File :'.red, fpath.grey, 'not a cmd module !'.red);
            grunt.file.copy(fpath, dest);
            return;
        } else if (metas.length > 1) {
            log.warn('  File :'.red, fpath.grey, 'contains'.red, metas.length.toString().green, 'modules !'.red);
        }

        // deps cache
        var deps = [];
        var async = [];

        // parse alias
        function parseDeps(alias){
            var id = iduri.parseAlias(options.pkg, alias);
            if (!iduri.isAlias(options.pkg, alias) && !RELPATH_RE.test(id) && deps.concat(async).indexOf(id) === -1) {
                log.warn('  Alias :'.red, alias.green, 'not defined !'.red);
            }
            deps.indexOf(id) === -1 && deps.push(id);
            return id;
        }

        // parse async
        function parseAsync(alias){
            var id = iduri.parseAlias(options.pkg, alias);
            if (!iduri.isAlias(options.pkg, alias) && !RELPATH_RE.test(id) && deps.concat(async).indexOf(id) === -1) {
                log.warn('  Alias :'.red, alias.green, 'not defined !'.red);
            }
            async.indexOf(id) === -1 && async.push(id);
            return id;
        }

        // modify js file
        code = ast.modify(code, {
            id: function (id){
                id && log.warn('  File :'.red, fpath.grey, 'found module id'.red, id.green, '!'.red);
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
            '$   '.green + (type + ' : ').green
                + '['.grey + linefeed + '$   '.green + '  '
                + deps.map(function (deps){
                return deps.green;
            }).join(','.grey + linefeed + '$   '.green + '  ')
                + linefeed + '$   '.green + ']'.grey + linefeed :
            '$   '.green + (type + ' : ').green + '[]'.grey + linefeed);
    }

    // exports
    return exports;
};
