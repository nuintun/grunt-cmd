/**
 * transport style helper
 * author : Newton
 **/
exports.init = function (grunt){
    var exports = {};
    var path = require('path');
    var format = require('util').format;
    var ast = require('../../cmd-util').ast;
    var iduri = require('../../cmd-util').iduri;
    var css = require('../../cmd-util').css;
    var log = require('../../log').init(grunt);
    var linefeed = grunt.util.linefeed;
    var RELPATH_RE = /^\.{1,2}[/\\]+/;

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    // css to js parser
    exports.css2jsParser = function (file, options){
        var fpath = normalize(file.src);
        var dest = normalize(file.dest) + '.js';
        // don't transport debug css files
        if (/\-debug\.css$/.test(fpath)) return;
        // transport css to js
        var code = file.code;
        var id = iduri.idFromPackage(options.pkg, file.name, options.format);

        // format code
        code = css2js(code, id);
        code = ast.getAst(code).print_to_string({
            beautify: true,
            comments: true
        });
        grunt.file.write(dest, code);
    };

    // the real css parser
    exports.cssParser = function (file, options){
        var dest = normalize(file.dest);
        var code = file.code;
        var codeAst = css.parse(code)[0];

        // file
        code = css.stringify(codeAst.code, function (node){
            if (node.type === 'import' && node.id) {
                var id = iduri.parseAlias(options.pkg, node.id);
                if (iduri.isAlias(options.pkg, node.id)) {
                    node.id = id;
                    if (!/\.css$/.test(node.id)) node.id += '.css';
                } else {
                    if (!RELPATH_RE.test(id)) {
                        log.warn('  Alias :'.red, node.id.green, 'not defined !'.red);
                    }
                }

                return node;
            }
        });

        // transport css
        var id = iduri.idFromPackage(options.pkg, file.name, options.format);
        var banner = format('/*! define %s */', codeAst.id || id);
        grunt.file.write(dest, [banner, code].join(linefeed));
    };

    return exports;
};

// helpers
function css2js(code, id){
    var CleanCss = require('clean-css');
    var grunt = require('grunt');
    var linefeed = grunt.util.linefeed;
    // transform css to js
    // spmjs/spm#581
    var tpl = [
        'define("%s", [], function() {',
        "seajs.importStyle('%s')",
        '});'].join(linefeed);

    code = new CleanCss({
        keepSpecialComments: 0,
        processImport: false,
        benchmark: verbose
    }).minify(code);

    // spmjs/spm#651
    code = code.split(/\r\n|\r|\n/).map(function (line){
        return line.replace(/\\/g, '\\\\');
    }).join(linefeed);

    code = format(tpl, id, code.replace(/\'/g, '\\\''));
    return code;
}

exports.css2js = css2js;
