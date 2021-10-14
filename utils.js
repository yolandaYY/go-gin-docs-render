/**
 * 匹配块
 * @param {String}} str 
 * @param {String} startSign 开始标识
 * @param {String} endSign 结束标识
 * @param {Number} startIndex 从什么位置开始匹配
 * @returns {{ begin: Number, end: Number }}
 */
function matchBlock(str, startSign, endSign, isNested = false, startIndex = 0) {
    let begin = -1;
    let end = -1;
    if (isNested) {
        const regexp = new RegExp(`\\${startSign}|\\${endSign}`, "g");
        str = str.slice(startIndex);
        const stack = [];

        while (1) {
            const result = regexp.exec(str);
            if (!result) break;

            if (result[0] == startSign) {
                stack.push(true);
                if (begin == -1) begin = result.index;
            } else {
                end = result.index;
                stack.pop();
            }

            if (begin != -1 && !stack.length) {
                break;
            }
        }

        if (~begin && ~end) {
            begin += startIndex;
            end += startIndex;
        }

    } else {
        begin = str.indexOf(startSign, startIndex);
        end = str.indexOf(endSign, begin + 1);
    }

    if (begin == -1 || end == -1) return null;

    return { begin, end };
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
    removeCommentContent,
    matchBlock,
}