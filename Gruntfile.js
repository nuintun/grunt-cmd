/**
 * Gruntfile
 * 打包合并配置文件
 */
var path = require('path'),
  UglifyJS = require('uglify-js'),
  cmd = require('cmd-helper');

module.exports = function (grunt){
  var debugFile = grunt.option('debugfile') === true,
    sourceMap = grunt.option('sourcemap') === true,
    ScriptDeploy = require('./tools/grunt-tasks/deploy/lib/script').init(grunt),
    combine = ScriptDeploy.combine,
    modify = ScriptDeploy.modify,
    configAst = UglifyJS.parse(grunt.file.read('js/config.js')),
    pkg = { alias: getAlias(configAst) },
    excludes = [pkg.alias['$']],
    linefeed = grunt.util.linefeed,
    CSSBanner = [
      '/*!',
      ' * Project: CSS Assets',
      ' * Author: nuintun',
      ' * Date: <%= grunt.template.today("yyyy-mm-dd") %>',
      ' */'
    ].join(linefeed),
    JSBanner = [
      '/*!',
      ' * Project: JS Assets',
      ' * Author: nuintun',
      ' * Date: <%= grunt.template.today("yyyy-mm-dd") %>',
      ' */'
    ].join(linefeed);

  // 通过config.js获取alias
  function getAlias(ast){
    var alias = {},
      walker = new UglifyJS.TreeWalker(function (node){
        if (node instanceof UglifyJS.AST_Call && node.start.value === 'seajs'
          && node.expression.property === 'config' && node.args.length) {
          node.args[0].properties.forEach(function (node){
            if (node.key === 'alias') {
              node.value.properties.forEach(function (node){
                alias[node.key] = node.value.value;
              });
            }
          });
        }
      });

    ast.walk(walker);

    return alias;
  }

  // 获取线上配置文件config.js
  function getConfig(ast){
    var trans = new UglifyJS.TreeTransformer(function (node){
      if (node instanceof UglifyJS.AST_Call && node.start.value === 'seajs'
        && node.expression.property === 'config' && node.args.length) {
        node.args[0].properties = node.args[0].properties.filter(function (node){
          return node.key !== 'alias';
        });
        return node;
      }
    });

    return ast.transform(trans).print_to_string({ beautify: true, comments: true });
  }

  // 获取整站公用脚本common.js
  function getCommon(fpath, excludes){
    var modules = [],
      common = combine(fpath, {
        buildRoot: '.build',
        familyRoot: 'js',
        excludes: Array.isArray(excludes) ? excludes : []
      });

    // 获取公共脚本总已经包含的模块，页面脚本要排除
    cmd.ast.parse(common).forEach(function (meta){
      modules.push(meta.id);
    });

    return {
      modules: modules,
      code: common
    };
  }

  // 初始化网站脚本执行环境
  grunt.registerTask('environ', 'Initialize execution environment.', function (){
    grunt.log.write('$ '.green + 'Initializing execution environment'.cyan + ' ...' + linefeed);

    // move seajs
    grunt.file.recurse('js', function (fpath, root){
      fpath = fpath.replace(/\\/g, '/');

      if (/\/sea\.js$/i.test(fpath)) {
        var seajs = grunt.file.read(fpath),
          config = getConfig(configAst),
          common = getCommon('.build/js/view/common.js', [pkg.alias['$']]),
          combo = seajs + linefeed + config + linefeed + common.code,
          banner = [
            '/*!',
            ' * Sea.js ' + path.dirname(fpath).split('/').pop() + ' | seajs.org/LICENSE.md',
            ' * Author: lifesinger & nuintun',
            ' * Date: ' + grunt.template.today('yyyy-mm-dd'),
            ' */'
          ].join(linefeed), // banner
          minify = UglifyJS.minify(combo, {
            outSourceMap: '{{file}}',
            fromString: true,
            warnings: grunt.option('verbose')
          }), // minify code
          code = banner + linefeed
            + minify.code.replace(/\n\/\/# sourceMappingURL=\{\{file\}\}$/i, '');

        // 排除common.js中已经包含的模块
        excludes = excludes.concat(common.modules);

        fpath = path.join('script', path.relative(root, fpath)).replace(/\\/g, '/');

        // add source map url
        if (sourceMap) {
          debugFile = sourceMap;
          code += '/*' + linefeed
            + '//@ sourceMappingURL=sea.js.map' + linefeed
            + '*/';
        }

        // 生成sea.js
        grunt.file.write(fpath, code);

        // 生成sea-debug.js
        if (debugFile) {
          // 生成sea.js.map
          if (sourceMap) {
            var map = minify.map
              .replace('"file":"{{file}}"', '"file":"sea.js"')
              .replace('"sources":["?"]', '"sources":["sea-debug.js"]'); // source map

            grunt.file.write(fpath + '.map', map);
          }

          grunt.file.write(fpath.replace(/\.js$/i, '-debug.js'), modify(combo, { '.js': true, '.css': true }));
        }
      }

      grunt.file.copy(fpath, path.join('script', path.relative(root, fpath)).replace(/\\/g, '/'));
    }, 'seajs');

    grunt.log.write('$ '.green + 'Initialize execution environment'.cyan + ' ...').ok();
  });

  // 修复资源引用路径
  grunt.registerTask('pathfix', 'Resource path fix.', function (){
    grunt.log.write('$ '.green + 'Fixing resource path'.cyan + ' ...' + grunt.util.linefeed);

    grunt.file.recurse('.build', function (fpath){
      var code;

      if (!grunt.file.isFile(fpath)) return;

      fpath = fpath.replace(/\\/g, '/');

      if (!/\.css$/i.test(path.basename(fpath))) return;

      code = grunt.file.read(fpath);
      code = code.replace(/\s*\/Res\/css\//img, '/Res/style/');
      grunt.file.write(fpath, code);
    });

    grunt.log.write('$ '.green + 'Fix resource path'.cyan + ' ...').ok();
  });

  // 初始化构建配置
  grunt.initConfig({
    // 转换
    transport: {
      options: {
        pkg: pkg,
        familyRoot: 'js'
      },
      base: {
        options: {
          family: 'base'
        },
        files: [
          {
            cwd: 'js/base',
            src: ['**/*'],
            filter: 'isFile'
          }
        ]
      },
      util: {
        options: {
          family: 'util'
        },
        files: [
          {
            cwd: 'js/util',
            src: ['**/*'],
            filter: 'isFile'
          }
        ]
      },
      common: {
        options: {
          family: 'common'
        },
        files: [
          {
            cwd: 'js/common',
            src: ['**/*'],
            filter: 'isFile'
          }
        ]
      },
      view: {
        options: {
          family: 'view'
        },
        files: [
          {
            cwd: 'js/view',
            src: ['**/*'],
            filter: 'isFile'
          }
        ]
      },
      css: {
        options: {
          familyRoot: 'css',
          family: 'default'
        },
        files: [
          {
            cwd: 'css/default',
            src: ['**/*'],
            filter: 'isFile'
          }
        ]
      },
      htc: {
        options: {
          familyRoot: 'css',
          family: 'css3pie'
        },
        files: [
          {
            cwd: 'css/css3pie',
            src: ['**/*'],
            filter: 'isFile'
          }
        ]
      }
    },
    // 发布
    deploy: {
      options: {
        pkg: pkg,
        familyRoot: 'js',
        banner: JSBanner,
        include: '*',
        excludes: function (){
          return excludes;
        },
        debugFile: debugFile,
        sourceMap: sourceMap
      },
      // 非脚本文件处理
      other: {
        options: {
          include: 'default'
        },
        files: [
          {
            cwd: '.build/js',
            src: ['**/*'],
            /**
             * 文件过滤
             * @param file
             * @returns {*}
             */
            filter: function (file){
              if (grunt.file.isFile(file)) {
                file = file.replace(/\\/g, '/');
                var basename = path.basename(file);
                if (!(/\.js$/i.test(basename) && /\/js\/view\//.test(file))) {
                  return file;
                }
              }
            }
          }
        ]
      },
      // 页面视图脚本
      view: {
        files: [
          {
            cwd: '.build/js/view',
            src: ['**/*'],
            /**
             * 文件过滤
             * @param file
             * @returns {*}
             */
            filter: function (file){
              if (!grunt.file.isFile(file)) return;
              if (!/common\.js$/i.test(path.basename(file))) return file;
            }
          }
        ]
      },
      // 站点样式
      css: {
        options: {
          familyRoot: 'css',
          outputRoot: 'style',
          banner: CSSBanner
        },
        files: [
          {
            cwd: '.build/css',
            src: ['**/*'],
            /**
             * 文件过滤
             * @param file
             * @returns {*}
             */
            filter: function (file){
              if (!grunt.file.isFile(file)) return;
              if (!/[/\\]common\.css$/i.test(file) && !/[/\\]+widget[/\\]+/.test(file)) return file;
            }
          }
        ]
      }
    },
    // 清理
    clean: {
      options: {
        force: true
      },
      // 清理以前的旧文件
      output: {
        src: ['script', 'style']
      },
      // 清理临时转换目录
      librarys: {
        src: ['.build']
      }
    }
  });

  // 加载构建任务
  grunt.loadTasks('tools/grunt-tasks/transport');
  grunt.loadTasks('tools/grunt-tasks/deploy');
  grunt.loadTasks('tools/grunt-tasks/clean');
  grunt.registerTask('default', ['clean:output', 'transport', 'pathfix', 'environ', 'deploy', 'clean:librarys']);
};
