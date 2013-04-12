/**
 * transport style helper
 * author : Newton
 **/
exports.init = function (grunt){
    var exports = {};
    var path = require('path');
    var format = require('util').format;

    // normalize uri to linux format
    function normalize(uri){
        return path.normalize(uri).replace(/\\/g, '/');
    }

    var ast = require('../../cmd-util').ast;
    var iduri = require('../../cmd-util').iduri;
    var css = require('../../cmd-util').css;
    var linefeed = grunt.util.linefeed;

    exports.css2jsParser = function (file, options){
        var fpath = normalize(file.src);
        var dest = normalize(file.dest) + '.js';
        // don't transport debug css files
        if (/\-debug\.css$/.test(fpath)) return;
        // transport css to js
        var data = file.content || grunt.file.read(fpath);
        var id = iduri.idFromPackage(options.pkg, file.name, options.format);

        data = css2js(data, id);
        data = ast.getAst(data).print_to_string({
            beautify: true,
            comments: true
        });
        grunt.file.write(dest, data);
    };

    // the real css parser
    exports.cssParser = function (file, options){
        var fpath = normalize(file.src);
        var dest = normalize(file.dest);
        var data = file.content || grunt.file.read(fpath);
        data = css.parse(data);

        // file
        var ret = css.stringify(data[0].code, function (node){
            if (node.type === 'import' && node.id) {
                if (node.id.charAt(0) === '.') {
                    return node;
                }
                if (!iduri.isAlias(options.pkg, node.id)) {
                    grunt.log.write('>>   '.red + 'Alias '.red + node.id.green + ' not defined'.red + linefeed);
                } else {
                    node.id = iduri.parseAlias(options.pkg, node.id);
                    if (!/\.css$/.test(node.id)) {
                        node.id += '.css';
                    }
                    return node;
                }
            }
        });
        var id = iduri.idFromPackage(options.pkg, file.name, options.format);
        var banner = format('/*! define %s */', id);
        grunt.file.write(dest, [banner, ret].join('\n'));
    };

    return exports;
};

// helpers
function css2js(code, id){
    var cleancss = require('clean-css');
    // transform css to js
    // spmjs/spm#581
    var tpl = [
        'define("%s", [], function() {',
        "seajs.importStyle('%s')",
        '});'
    ].join('\n');

    code = cleancss.process(code, {
        keepSpecialComments: 0,
        removeEmpty: true
    });
    // spmjs/spm#651
    code = code.split(/\r\n|\r|\n/).map(function (line){
        return line.replace(/\\/g, '\\\\');
    }).join('\n');

    code = format(tpl, id, code.replace(/\'/g, '\\\''));
    return code;
}

exports.css2js = css2js;
