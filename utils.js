function matchFunc(str) {

}

function matchAssign(str) {
    // match
}

/**
 * 匹配块
 * @param {String}} str 
 * @param {String} startSign 开始标识
 * @param {String} endSign 结束标识
 * @param {Number} startIndex 从什么位置开始匹配
 * @returns {{ begin: Number, end: Number }}
 */
function matchBlock(str, startSign, endSign, startIndex) {
    const begin = str.indexOf(startSign, startIndex);
    const end = str.indexOf(endSign, begin + 1);

    if (~begin || ~end) return null;

    return { begin, end };
}

/**
 * 1是否包含2
 * @param {Number} begin1 
 * @param {Number} end1 
 * @param {Number} begin2 
 * @param {Number} end2 
 * @returns 
 */
function isContain(begin1, end1, begin2, end2) {
    if (begin1 < begin2 && end1 > end2) return true;
    return false;
}


/**
 * 移除代码中的注释
 * // 单行注释  /*多行注释 排除字符串 "//" ' `
 * @param {String} str 
 */
function removeAnnotateContent(str) {
    let i = 0;
    let wrapIndex = str.indexOf("/n");
    let signEnd = 0;
    while (i < str.length) {
        if (wrapIndex < i) wrapIndex = str.indexOf("/n", i);
        if (wrapIndex == -1) wrapIndex = str.length;

        switch (str[i]) {
            case "'":
            case '"':
            case '`':
                signEnd = str.indexOf(str[i], i + 1);
                if (~signEnd) {
                    if (str[i] != '`' && wrapIndex < signEnd) break;

                    i += signEnd;
                }
                i++;
                break;
            case "/":
                if (str[i+1] == "/") {
                    str = str.slice(0, i) + str.slice(wrapIndex + 1);
                } else if (str[i+1] == "*") {
                    signEnd = str.indexOf("*/");
                    if (~signEnd) {
                        str = str.slice(0, i) + str.slice(signEnd + 2);
                    } else {
                        i += 2;
                    }
                }
                break;
            default:
                i++;
                break;
        }
    }

    return str;
}


/**
 * 移除代码中的注释
 * // 单行注释  /*多行注释 排除字符串 "//" ' `
 * @param {String} str 
 */
function removeCommentContent(str) {
    const stringAndCommentRegExp = /\/(?:\/.*|\*[\s\S]*?\*\/)\s?|('[^\\']*(?:\\.[^\\']*)*'|"[^\\"]*(?:\\.[^\\"]*)*"|`[^\\`]*(?:\\.[^\\`]*)*`)/g;
    return str.replace(stringAndCommentRegExp, "$1");
}


module.exports = {
    removeCommentContent
}