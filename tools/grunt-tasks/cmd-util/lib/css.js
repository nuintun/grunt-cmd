/*
 * css
 * https://github.com/spmjs/spm2/issues/4
 *
 * Hsiaoming Yang <me@lepture.com>
 */
var endblockRE = /^\/\*!\s*endblock(?:\s*|\s+(.+?)\s*)\*\/$/,
    importRE = /^@import\s+url\s*\((['"]?)(.+?)\1\);?$|^@import\s+(['"])(.+?)\3;?$/,
    tokensRE = /(\/\*[^*]*\*+([^/*][^*]*\*+)*\/)|(@import\s+url\s*\(.+?\);?|@import\s+(['"]).+?\4;?)|((.(?!@import\s|\/\*))+(.(?=@import\s|\/\*))*)|((.(?!@import\s|\/\*))*(.(?=@import\s|\/\*))+)|([\r\n]+)/g;

/* 
 * parse code into a tree
 */
exports.parse = function (code){
    var rules = code.match(tokensRE);

    return parseBlock(rules);
};

function match(text, key){
    // /*! key value */
    var re = new RegExp('^\\/\\*!\\s*' + key + '\\s+(.+?)\\s*\\*\\/$'),
        m = text.match(re);

    if (!m) return;
    return m[1];
}

/*
 * recursive parse a block type code
 */
function parseBlock(rules){
    var tree,
        line = 1,
        node = {
            id: null,
            type: 'block',
            code: []
        },
        blockDepth = [],
        pushfeed = true;

    /*
     * recursive parse a block code string
     */
    function parseString(rule, blockNode){
        var lines = rule.split(/\n/),
            childNode = blockNode.code[blockNode.code.length - 1];

        line += lines.length - 1;

        if (!pushfeed) {
            pushfeed = true;

            rule = rule.replace(/^(\r\n|\r|\n)/, '');
        }

        if (childNode && childNode.type === 'string') {
            childNode.code += rule;
        } else {
            blockNode.code.push({
                type: 'string',
                code: rule
            });
        }
    }

    // parse block
    function parseInBlock(rule){
        var id, blockNode, start,
            end, imports, childNode;

        blockNode = blockDepth[blockDepth.length - 1] || node;

        if (rule.substr(0, 2) === '/*') {
            /*! start block id */
            if (start = match(rule, 'block')) {
                childNode = {
                    id: start,
                    type: 'block',
                    code: []
                };

                blockDepth.push(childNode);
                blockNode.code.push(childNode);
                return;
            }

            /*! endblock id */
            if (end = rule.match(endblockRE)) {

                if (!blockDepth.length) {
                    throw new SyntaxError('block tag indent error in line: ' + line);
                }

                id = end[1];

                // endblock tag closed error
                if (id && (id !== blockNode.id)) {
                    blockDepth = [];
                    throw new SyntaxError('block tag indent error in line: ' + line);
                }

                blockDepth.pop();
                return;
            }

            if (imports = match(rule, 'import')) {
                childNode = {
                    id: imports,
                    type: 'import'
                };

                blockNode.code.push(childNode);
                return;
            }

            if (!node.id && (id = match(rule, 'define'))) {
                node.id = id;
                pushfeed = false;
                return;
            }
        }

        if (rule.substr(0, 8) === '@import ') {
            if (id = rule.match(importRE)) {
                if (id = id[2] || id[4]) {
                    childNode = {
                        id: id,
                        type: 'import'
                    };

                    node.code.push(childNode);
                    return;
                }
            }
        }

        parseString(rule, blockNode);
    }

    // parse syntax tree, notes: for loop faster than forEach
    for (var i = 0, len = rules.length; i < len; i++) {
        parseInBlock(rules[i]);
    }

    // lost endblock tag
    if (blockDepth.length) {
        blockDepth = [];
        throw new SyntaxError('block tag is not closed in line: ' + line);
    }

    !node.id && delete node.id;

    tree = [node];

    return tree;
}

/*
 * Walk through the code tree
 */
exports.walk = function (code, fn){
    if (!Array.isArray(code)) {
        code = exports.parse(code);
    }

    function walk(code){
        var node;

        // if fn return false, it will stop the walk
        if (Array.isArray(code)) {
            for (var i = 0, len = code.length; i < len; i++) {
                node = code[i];

                if (fn(node) !== false && node.type === 'block' && Array.isArray(node.code)) {
                    walk(node.code);
                }
            }
        }
    }

    walk(code);
};

/*
 * print string of the parsed code
 */
exports.stringify = function (code, filter){
    var first = true;

    if (!Array.isArray(code)) {
        return code;
    }

    function print(code, parent){
        var cursor = '',
            newline = first ? '\n' : '';

        first = false;

        function walk(node){
            if (filter) {
                var ret = filter(node, parent);

                if (ret === false) return;

                if (ret && ret.type) {
                    node = ret;
                }
            }

            switch (node.type) {
                case 'string':
                    cursor = [cursor, node.code].join('');
                    break;
                case 'import':
                    cursor = [cursor, '/*! import ' + node.id + ' */'].join('');
                    break;
                case 'block':
                    if (node.id) {
                        cursor = [
                            cursor,
                                '/*! block ' + node.id + ' */',
                            newline,
                            print(node.code, node),
                            newline,
                                '/*! endblock ' + node.id + ' */'
                        ].join('');
                    } else {
                        cursor = print(node.code, node);
                    }
                    break;
            }
        }

        for (var i = 0, len = code.length; i < len; i++) {
            walk(code[i]);
        }

        return cursor;
    }

    return print(code);
};