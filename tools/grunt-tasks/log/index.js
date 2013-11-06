/**
 * log
 * author : Newton
 **/
var grunt = require('grunt');
var linefeed = grunt.util.linefeed;
var slice = Array.prototype.slice;

// warn log
exports.warn = function (){
    var args = slice.call(arguments);
    var message = args.join(' ');
    grunt.log.write('>> '.red + message + linefeed);
};

// info log
exports.info = function (){
    var args = slice.call(arguments);
    var message = args.join(' ');
    grunt.log.write('>> '.green + message + ' ...' + linefeed);
};

// ok log
exports.ok = function (){
    var args = slice.call(arguments);
    var message = args.join(' ');
    grunt.log.write('>> '.green + message + ' ...').ok();
};