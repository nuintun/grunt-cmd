/**
 * transport task
 * author : Nuintun
 **/
var path = require('path'),
    iduri = require('cmd-helper').iduri,
    VERSION_RE = /^(\d+\.){2}\d+$/;

module.exports = function (grunt){
    var script = require('./lib/script').init(grunt),
        style = require('./lib/style').init(grunt),
        log = require('../log').init(grunt);

    // 注册任务
    grunt.registerMultiTask('transport', 'Transport everything into cmd.', function (){
        var options, that = this;

        console.time('$'.green + ' Transport time consuming'.cyan);

        // 初始化配置
        options = that.options({
            // 构建时缓存文件根目录
            buildRoot: '.build',
            // 构建时缓存文件类别根目录
            familyRoot: 'js',
            // 模块ID格式指定
            format: '{{family}}/{{name}}/{{version}}/{{filename}}',
            // 模块配置
            pkg: grunt.file.exists('alias.json') ? grunt.file.readJSON('alias.json') : {},
            // 使用grunt.template转换文件中的模板变量
            process: false,
            // 文件转换引擎
            parsers: {
                '.js': script.jsParser,
                '.css': style.cssParser
            }
        });

        // 初始化其他参数
        options.pkg.alias = options.pkg.alias || {};
        options.pkg.family = options.pkg.family || '';
        options.pkg.name = options.pkg.name || '';
        options.pkg.version = options.pkg.version || '';
        options.buildRoot = grunt.util._.isString(options.buildRoot) ? options.buildRoot : '.build';
        options.familyRoot = grunt.util._.isString(options.familyRoot) ? options.familyRoot : 'js';

        // 循环文件
        that.files.forEach(function (file){
            // 未设置起始目录
            if (!file.cwd) {
                log.warn('Please set cwd !'.red);
                return;
            }

            // 循环文件
            file.src.forEach(function (fpath){
                var dirname, code, dist,
                    fname, extname, parsers,
                    family, name = '',
                    subname = '', version = '';

                // 格式化文件路径
                fpath = iduri.normalize(fpath);
                // 拆分文件路径
                dirname = path.dirname(fpath).split('/');
                // 文件名
                fname = path.basename(fpath);
                // 文件扩展名
                extname = path.extname(fname).toLowerCase();
                // 获取转换引擎
                parsers = options.parsers[extname];

                // 获取 family name version 值
                for (var i = 0, len = dirname.length; i < len; i++) {
                    if (version) {
                        subname += dirname[i] + '/'
                    } else {
                        if (VERSION_RE.test(dirname[i])) {
                            version = dirname[i];
                        } else {
                            name += dirname[i] + '/'
                        }
                    }
                }

                name = name.slice(0, -1);
                family = options.pkg.family = options.family || '';
                options.pkg.name = options.name || name;
                options.pkg.version = options.version || version;
                fname = options.pkg.filename = options.filename || subname + fname;
                fpath = iduri.normalize(path.join(file.cwd, fpath));

                // 文件不存在
                if (!grunt.file.exists(fpath)) {
                    log.warn('File :'.red, fpath.grey, 'not found !'.red);
                    return;
                }

                // 设置转换后的路径
                dist = iduri.join(
                    options.buildRoot,
                    options.familyRoot,
                    family,
                    name,
                    version,
                    fname
                );

                // 未找到相应文件的转换引擎
                if (!parsers) {
                    // 直接复制文件到构建缓存
                    log.info('Transporting'.cyan, fpath.grey);
                    grunt.file.copy(fpath, dist);
                    log.ok('Transport to'.cyan, dist.grey);
                    return;
                }

                code = grunt.file.read(fpath);

                // 渲染模板
                if (options.process) {
                    code = grunt.template.process(code, options.process);
                }

                log.info('Transporting'.cyan, fpath.grey);

                // 转换文件
                parsers({
                    src: fpath,
                    code: code,
                    dist: dist
                }, options);

                log.ok('Transport to'.cyan, dist.grey);
            });
        });

        console.timeEnd('$'.green + ' Transport time consuming'.cyan);
    });
};
