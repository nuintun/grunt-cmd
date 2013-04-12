// GruntFile
module.exports = function (grunt){
    // init config
    grunt.initConfig({
        transport: {
            base: {
                options: {
                    root: 'script',
                    family: 'base'
                },
                files: [
                    {
                        cwd: 'script/base',
                        src: ['**/*.js']
                    }
                ]
            },
            util: {
                options: {
                    root: 'script',
                    family: 'util'
                },
                files: [
                    {
                        cwd: 'script/util',
                        src: ['**/*.js', '**/*.swf']
                    }
                ]
            },
            common: {
                options: {
                    root: 'script',
                    family: 'common'
                },
                files: [
                    {
                        cwd: 'script/common',
                        src: ['**/*.js']
                    }
                ]
            },
            view: {
                options: {
                    root: 'script',
                    family: 'view'
                },
                files: [
                    {
                        cwd: 'script/view',
                        src: ['**/*.js']
                    }
                ]
            },
            css: {
                options: {
                    root: 'style',
                    family: 'default'
                },
                files: [
                    {
                        cwd: 'style/default',
                        src: ['**/*.css']
                    }
                ]
            },
            htc: {
                options: {
                    root: 'style',
                    family: 'css3pie'
                },
                files: [
                    {
                        cwd: 'style/css3pie',
                        src: ['**/*.htc']
                    }
                ]
            }
        },
        deploy: {
            jquery: {
                options: {
                    root: 'script'
                },
                files: [
                    {
                        cwd: '.librarys/script',
                        src: ['**/jquery.js']
                    }
                ]
            },
            swf: {
                options: {
                    root: 'script'
                },
                files: [
                    {
                        cwd: '.librarys/script',
                        src: ['**/*.swf']
                    }
                ]
            },
            view: {
                options: {
                    root: 'script',
                    include: '*',
                    excludes: ['base/jquery/1.9.1/jquery']
                },
                files: [
                    {
                        cwd: '.librarys/script',
                        src: ['view/**/*.js']
                    }
                ]
            },
            css: {
                options: {
                    root: 'style',
                    output: 'css',
                    banner: '/** cmd-build author: Newton email: yongmiui@gmail.com date: ' + Date.now() + ' **/'
                },
                files: [
                    {
                        cwd: '.librarys/style',
                        src: ['**/base.css', '**/index.css']
                    }
                ]
            }
        },
        clean: {
            librarys: ['.librarys']
        }
    });

    //load task
    grunt.loadTasks('tools/grunt-tasks/transport');
    grunt.loadTasks('tools/grunt-tasks/deploy');
    grunt.loadTasks('tools/grunt-tasks/clean');
    grunt.registerTask('default', ['transport', 'deploy', 'clean']);
};
