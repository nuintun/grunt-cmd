/**
 * transport style helper
 * author : Nuintun
 **/
var CleanCss = require('clean-css'),
    format = require('util').format,
    cmd = require('cmd-helper'),
    ast = cmd.ast,
    iduri = cmd.iduri,
    css = cmd.css,
    RELPATH_RE = /^\.{1,2}[/\\]/;

exports.init = function (grunt){
    var exports = {},
        log = require('../../log').init(grunt),
        linefeed = grunt.util.linefeed;

    // css to js
    function css2js(code, id){
        // transform css to js
        // spmjs/spm#581
        var tpl = 'define("%s", [], function (){ seajs.importStyle("%s"); });';

        code = new CleanCss({
            keepSpecialComments: 0,
            processImport: false
        }).minify(code);

        // spmjs/spm#651
        code = code.replace(/([\\'])/g, '\\\1');
        code = format(tpl, id, code);

        return code;
    }

    exports.css2js = css2js;

    // css to js parser
    exports.css2jsParser = function (file, options){
        var code, id,
            fpath = iduri.normalize(file.src),
            dist = iduri.normalize(file.dist) + '.js';

        // don't transport debug css files
        if (/\-debug\.css$/.test(fpath)) return;

        // transport css to js
        code = file.code;
        id = iduri.idFromPackage(options.pkg, options.format);

        // format code
        code = css2js(code, id);
        code = ast.getAst(code).print_to_string({
            beautify: true,
            comments: true
        });

        // write file
        grunt.file.write(dist, code);
    };

    // the real css parser
    exports.cssParser = function (file, options){
        var banner,
            dist = iduri.normalize(file.dist),
            code = file.code,
            codeAst = css.parse(code)[0],
            id = iduri.idFromPackage(options.pkg, file.name, options.format);

        // file
        code = css.stringify(codeAst.code, function (node){
            if (node.type === 'import' && node.id) {
                var childId = iduri.parseAlias(options.pkg, node.id);

                if (iduri.isAlias(options.pkg, node.id)) {
                    node.id = childId;
                    if (!/\.css$/.test(node.id)) node.id += '.css';
                } else {
                    if (!RELPATH_RE.test(childId)) {
                        log.warn('  Alias :'.red, node.id.green, 'not defined !'.red);
                    } else {
                        node.id = iduri.absolute(id, childId);
                    }
                }

                return node;
            }
        });

        // create banner
        banner = format('/*! define %s */', codeAst.id || id);

        // write file
        grunt.file.write(dist, banner + linefeed + code);
    };

    return exports;
};
