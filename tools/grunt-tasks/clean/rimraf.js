/**
 * Created by Newton on 2014/5/6.
 */
module.exports = rimraf;
rimraf.sync = rimrafSync;

var fs = require('fs'),
    path = require('path'),
    isWindows = (process.platform === "win32");

// for EMFILE handling
exports.EMFILE_MAX = 1000;
exports.BUSYTRIES_MAX = 3;

function defaults(options){
    var methods = [
        'unlink',
        'chmod',
        'stat',
        'rmdir',
        'readdir'
    ];

    methods.forEach(function (m){
        options[m] = options[m] || fs[m];
        m = m + 'Sync';
        options[m] = options[m] || fs[m];
    });
}

function rimraf(p, options, cb){
    var timeout = 0,
        busyTries = 0;

    if (typeof options === 'function') {
        cb = options;
        options = {};
    }

    defaults(options);

    if (!cb) throw new Error("No callback passed to rimraf()");

    rimraf_(p, options, function fn(er){
        var time;

        if (er) {
            if (isWindows && (er.code === "EBUSY" || er.code === "ENOTEMPTY") &&
                busyTries < exports.BUSYTRIES_MAX) {
                busyTries++;
                time = busyTries * 100;

                // try again, with the same exact callback as this one.
                setTimeout(function (){
                    rimraf_(p, options, fn);
                }, time);
                // return
                return;
            }

            // this one won't happen if graceful-fs is used.
            if (er.code === "EMFILE" && timeout < exports.EMFILE_MAX) {
                setTimeout(function (){
                    rimraf_(p, options, fn);
                }, timeout++);
                // return
                return;
            }

            // already gone
            if (er.code === "ENOENT") er = null;
        }

        // callback
        cb(er);
    });
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_(p, options, cb){
    options.unlink(p, function (er){
        if (er) {
            if (er.code === "ENOENT") return cb(null);

            if (er.code === "EPERM")
                return isWindows
                    ? fixWinEPERM(p, options, er, cb)
                    : rmdir(p, options, er, cb);

            if (er.code === "EISDIR") return rmdir(p, options, er, cb);
        }

        return cb(er);
    });
}

function fixWinEPERM(p, options, er, cb){
    options.chmod(p, 666, function (er2){
        if (er2)
            cb(er2.code === "ENOENT" ? null : er);
        else
            options.stat(p, function (er3, stats){
                if (er3)
                    cb(er3.code === "ENOENT" ? null : er);
                else if (stats.isDirectory())
                    rmdir(p, options, er, cb);
                else
                    options.unlink(p, cb);
            });
    });
}

function fixWinEPERMSync(p, options, er){
    try {
        options.chmodSync(p, 666);
    } catch (er2) {
        if (er2.code === "ENOENT")
            return;
        else
            throw er;
    }

    try {
        var stats = options.statSync(p);
    } catch (er3) {
        if (er3.code === "ENOENT")
            return;
        else
            throw er;
    }

    if (stats.isDirectory())
        rmdirSync(p, options, er);
    else
        options.unlinkSync(p);
}

function rmdir(p, options, er, cb){
    // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
    // if we guessed wrong, and it's not a directory, then
    // raise the original error.
    options.rmdir(p, function (er2){
        if (er2 && (er2.code === "ENOTEMPTY" || er2.code === "EEXIST" || er2.code === "EPERM"))
            rmkids(p, options, cb);
        else if (er2 && er2.code === "ENOTDIR")
            cb(er);
        else
            cb(er2);
    });
}

function rmkids(p, options, cb){
    options.readdir(p, function (er, files){
        var n, errState;

        if (er) return cb(er);

        n = files.length;

        if (n === 0) return options.rmdir(p, cb);

        files.forEach(function (f){
            rimraf(path.join(p, f), options, function (er){
                if (errState) return;

                if (er) return cb(errState = er);

                if (--n === 0) options.rmdir(p, cb);
            })
        })
    })
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync(p, options){
    options = options || {};

    defaults(options);

    try {
        options.unlinkSync(p);
    } catch (er) {
        if (er.code === "ENOENT") return;

        if (er.code === "EPERM")
            return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);

        if (er.code !== "EISDIR") throw er;

        rmdirSync(p, options, er);
    }
}

function rmdirSync(p, options, er){
    try {
        options.rmdirSync(p);
    } catch (er2) {
        if (er2.code === "ENOENT") return;

        if (er2.code === "ENOTDIR") throw er;

        if (er2.code === "ENOTEMPTY" || er2.code === "EEXIST" || er2.code === "EPERM")
            rmkidsSync(p, options);
    }
}

function rmkidsSync(p, options){
    options.readdirSync(p).forEach(function (f){
        rimrafSync(path.join(p, f), options);
    });
    options.rmdirSync(p);
}