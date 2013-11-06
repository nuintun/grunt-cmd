/**
 * log
 * author : Newton
 **/
exports.init = function (grunt){
    var linefeed = grunt.util.linefeed;
    var slice = Array.prototype.slice;
    
    // warn log
    exports.warn = function (){
        grunt.log.write('>> '.red + slice.call(arguments).join(' ') + linefeed);
    };
    
    // info log
    exports.info = function (){
        grunt.log.write('>> '.green + slice.call(arguments).join(' ') + ' ...' + linefeed);
    };
    
    // ok log
    exports.ok = function (){
        grunt.log.write('>> '.green + slice.call(arguments).join(' ') + ' ...').ok();
    };
};
