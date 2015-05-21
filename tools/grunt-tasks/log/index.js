/**
 * log
 * author : Nuintun
 **/
var slice = Array.prototype.slice;

exports.init = function (grunt){
  var exports = {},
    linefeed = grunt.util.linefeed;

  // warn log
  exports.warn = function (){
    grunt.log.write('$ '.red + slice.call(arguments).join(' ') + linefeed);
  };

  // info log
  exports.info = function (){
    grunt.log.write('$ '.green + slice.call(arguments).join(' ') + ' ...' + linefeed);
  };

  // ok log
  exports.ok = function (){
    grunt.log.write('$ '.green + slice.call(arguments).join(' ') + ' ...').ok();
  };

  return exports;
};
