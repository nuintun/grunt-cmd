/*
 * iduri
 * https://spmjs.org
 * Hsiaoming Yang <lepture@me.com>
 */
// path
var path = require('path');
var HASH_END_RE = /#$/;
var URI_END_RE = /\?|\.(?:css|js)$|\/$/i;

// resolve uri to meta info
exports.resolve = function (uri){
    // family/name@version
    // family/name#version
    // family.name@version
    // family.name#version

    var regex = /^([a-z][a-z0-9]*(?:\/|\.))?([a-zA-Z][a-zA-Z0-9\-]*)((?:@|#).*)?$/;
    var m = uri.match(regex);

    var family = m[1] || '';
    family = family.replace(/\/|\.$/, '');
    var name = m[2] || '';
    var version = m[3] || '';
    version = version.replace(/^@|#/, '');
    if (!family) {
        if (/^[a-z][a-z0-9]*$/.test(name)) {
            family = name;
        } else {
            return null;
        }
    }
    if (!family && !name && !version) return null;
    return {
        family: family,
        name: name,
        version: version
    };
};

// normalize uri
// make sure the uri to be pretty,
// for example a//b/../c should be a/c.
function normalize(uri){
    var isCurDir = /^\.[/\\]+/.test(uri);
    uri = path.normalize(uri).replace(/\\/g, '/');
    uri = !isCurDir || (isCurDir && uri.charAt(0) === '.') ? uri : './' + uri;
    var lastChar = uri.charAt(uri.length - 1);
    if (lastChar === '/') return uri;
    // if it ends with #, we should return the uri without #
    if (lastChar === '#') return uri.slice(0, -1);
    // TODO ext logical
    return uri;
}
exports.normalize = normalize;

// this is very different from node's path.relative.
// if uri starts with /, it's absolute uri, we don't relative it.
// if base is `path/to/a', uri is `static/a.js`
// relative is: ../../../static/a.js
exports.relative = function (base, uri){
    if (uri.charAt(0) === '/') return normalize(uri);

    var bits = normalize(base.replace(/^\.[/\\]+/, '')).split('/');
    var dots = [];
    if (bits.length > 1) {
        bits.forEach(function (){
            dots.push('..');
        });
        return normalize(dots.join('/') + '/' + uri);
    }
    return normalize(uri);
};

// base is `arale/base/1.0.0/parser`
// uri is `./base`
// the result should be `arale/base/1.0.0/base`
exports.absolute = function (base, uri){
    if (uri.charAt(0) !== '.') return normalize(uri);
    uri = path.join(path.dirname(base), uri);
    return normalize(uri);
};

exports.join = function (){
    return normalize(path.join.apply(path, arguments).replace(/\\/g, '/'));
};

exports.dirname = function (uri){
    return normalize(path.dirname(uri));
};

exports.basename = function (uri){
    return path.basename(uri);
};

exports.extname = function (uri){
    var ext = path.extname(uri);
    // default ext is js
    return ext ? ext : '.js';
};

exports.appendext = function (uri){
    // Add the default `.js` extension except that the uri ends with `#`
    if (HASH_END_RE.test(uri)) {
        uri = uri.slice(0, -1);
    } else if (!URI_END_RE.test(uri)) {
        uri += ".js";
    }
    return normalize(uri);
};

exports.parseAlias = function (pkg, name){
    // relative name: ./class
    if (name.charAt(0) === '.') {
        name = name.replace(/\.js$/i, '');
    }
    var alias = getAlias(pkg);
    if (alias.hasOwnProperty(name)) {
        name = alias[name];
    }
    return normalize(name);
};

exports.isAlias = function (pkg, name){
    var alias = getAlias(pkg);
    return alias.hasOwnProperty(name);
};

exports.idFromPackage = function (pkg, filename, format){
    if (filename && !format && ~filename.indexOf('{{')) {
        format = filename;
        filename = '';
    }
    if (!filename) {
        filename = pkg.filename || '';
    }
    if (filename.charAt(0) === '.') {
        return filename.replace(/\.js$/i, '');
    }
    format = format || '{{family}}/{{name}}/{{version}}/{{filename}}';
    var data = pkg;
    data.filename = filename.replace(/\.js$/i, '');
    return normalize(template(format, data));
};

// validate if the format is the default format
exports.validateFormat = function (format){
    var regex = /^\{\{\s*family\s*\}\}\/\{\{\s*name\s*\}\}\/\{\{\s*version\s*\}\}\/\{\{\s*filename\s*\}\}$/;
    return regex.test(format);
};

function getAlias(pkg){
    return pkg.alias || {};
}

function template(format, data){
    var regex = /\{\{\s*(.*?)\s*\}\}/g;
    var ret = format;
    var match = regex.exec(format);

    var getData = function (obj, key){
        var keys = key.split('.');
        keys.forEach(function (k){
            if (obj && obj.hasOwnProperty(k)) {
                obj = obj[k];
            }
        });
        return obj || '';
    };

    var placeholder, key, value;
    while (match) {
        placeholder = match[0], key = match[1];
        value = getData(data, key);
        ret = ret.replace(placeholder, value);
        match = regex.exec(format);
    }
    return ret;
}
