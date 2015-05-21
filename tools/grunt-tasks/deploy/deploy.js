/**
 * deploy task
 * author : Newton
 **/
var path = require('path'),
  iduri = require('cmd-helper').iduri;

module.exports = function (grunt){
  var linefeed = grunt.util.linefeed,
    script = require('./lib/script').init(grunt),
    style = require('./lib/style').init(grunt),
    log = require('../log').init(grunt);

  // 注册任务
  grunt.registerMultiTask('deploy', 'Deploy cmd modules.', function (){
    var options, that = this;

    console.time('$'.green + ' Deploy time consuming'.cyan);

    // 初始化配置
    options = that.options({
      // 构建缓存根目录
      buildRoot: '.build',
      // 构建时缓存文件类别根目录
      familyRoot: 'js',
      // 生成未压缩文件
      debugFile: grunt.option('debugfile') === true,
      // 生成 source map
      sourceMap: grunt.option('sourcemap') === true,
      // 发布根目录
      outputRoot: 'script',
      // 模块配置
      pkg: grunt.file.exists('alias.json') ? grunt.file.readJSON('alias.json') : { alias: {} },
      // 注释信息
      banner: '/*! cmd-build author: Nuintun email: nuintun@gmail.com **/',
      // 合并引擎
      parsers: {
        '.js': script.jsConcat,
        '.css': style.cssConcat
      }
    });

    // 初始化根目录设置
    options.buildRoot = grunt.util._.isString(options.buildRoot) ? options.buildRoot : '.build';
    options.familyRoot = grunt.util._.isString(options.familyRoot) ? options.familyRoot : 'js';
    options.outputRoot = grunt.util._.isString(options.outputRoot) ? options.outputRoot : 'script';

    // 设置注释信息
    options.banner = grunt.util._.isString(options.banner) ? options.banner : '';
    options.banner = options.banner.trim();
    options.banner = options.banner ? options.banner + linefeed : options.banner;

    // 设置调试文件生成开关
    options.debugFile = options.sourceMap ? true : options.debugFile;

    // 循环文件
    that.files.forEach(function (file){
      file.src.forEach(function (fpath){
        var dist, parsers, data,
          extname, include, excludes;

        fpath = iduri.normalize(fpath);
        // 文件包含模式
        include = options.include || 'default';
        include = grunt.util._.isFunction(include) ? include(fpath) : include;
        options.include = include === '.' || include === '*' ? include : 'default';
        // 文件排除
        excludes = options.excludes;
        excludes = grunt.util._.isFunction(excludes) ? excludes(fpath) : excludes;
        excludes = Array.isArray(excludes) ? excludes : [excludes];
        options.excludes = grunt.util._.uniq(excludes);
        // 获取文件真实路径
        fpath = iduri.join(file.cwd, fpath);
        // 发布路径
        dist = path.relative(options.familyRoot, path.relative(options.buildRoot, fpath));
        dist = iduri.normalize(iduri.join(options.outputRoot, dist));

        // 文件未找到
        if (!grunt.file.exists(fpath)) {
          log.warn('File'.red, fpath.grey, 'not found !'.red);
          return;
        }

        // 文件扩展名
        extname = path.extname(fpath).toLowerCase();
        // 获取合并引擎
        parsers = options.parsers[extname];

        // 未找到文件合并引擎，直接复制文件到发布目录
        if (!options.parsers[extname]) {
          log.info('Deploying'.cyan, fpath.grey);
          grunt.file.copy(fpath, dist);
          log.ok('Deploy to'.cyan, dist.grey);
          return;
        }

        log.info('Deploying'.cyan, fpath.grey);

        // 开始合并文件
        data = parsers({
          src: fpath,
          dist: dist
        }, options);

        // 合并失败
        if (!data) {
          log.warn('File'.red, fpath.grey, 'deploy failed !'.red);
          return;
        }

        // 发布文件
        grunt.file.write(dist, options.banner + data.minify.code);
        log.ok('Deploy to'.cyan, dist.grey);

        // 生成未压缩文件
        if (options.debugFile) {
          // 生成 source map
          if (options.sourceMap) {
            if (data.map) {
              dist = data.map.dist;
              grunt.file.write(dist, data.map.code);
              log.ok('Deploy to'.cyan, dist.grey);
            }
          }

          dist = data.source.dist;
          grunt.file.write(dist, options.banner + data.source.code);
          log.ok('Deploy to'.cyan, dist.grey);
        }
      });
    });

    console.timeEnd('$'.green + ' Deploy time consuming'.cyan);
  });
};
