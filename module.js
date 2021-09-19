const fs = require("fs");
const path = require("path");
const process = require("process");


function parseModule(code, filePath) {
    const importBlockRegexp = /^\s*package\s+(\S+)\s*((?:^\s*import\s*(?:\w*\s*"[^"]+"|\([^)]+\))\s*)+)?/m;
    const importBlockMatchResult = code.match(importBlockRegexp);
    if (!importBlockMatchResult) throw new Error("文件缺少 package 声明\n" + filePath);

    const importStates = {};

    if (importBlockMatchResult && importBlockMatchResult[2]) {
        const importStateRegexp = /[ \t(]\s*(\w*)\s*"([^"]+)"/g;
        while (1) {
            let importStateMatchResult = importStateRegexp.exec(importBlockMatchResult[2]);
            if (!importStateMatchResult) break;

            importStates[importStateMatchResult[1] || importStateMatchResult[2]] = importStateMatchResult[2];

        }
    }

    return {
        packageName: importBlockMatchResult[1],
        importStates,
        lastIndex: importBlockMatchResult.index + importBlockMatchResult[0].length
    }
}

// 暂不支持变量结构体声明
// 不支持匿名函数声明
function parseState(code) {
    const funcRegexp = /^\s*func\s*(\([^)]+\))?\s*([^(]+)\s*\(([^)]*)\)\s*(\([^)]+\)|[^{]+)?/mg;
    const structRegexp = /^\s*type\s+(\S+)\s+struct/mg;

    const state = {};
    while (1) {
        const funcMatchResult = funcRegexp.exec(code);
        if (!funcMatchResult) break;

        const receive = funcMatchResult[1];
        const funcName = funcMatchResult[2];
        const parameter = funcMatchResult[3];
        const returnState = funcMatchResult[4];
        if (!state[funcName]) state[funcName] = [];
        const funcData = {type: "func", isParse: false, receive, parameter, returnState, contentBegin: funcMatchResult.index + funcMatchResult[0].length};
        state[funcName].push(funcData);
    }

    while (1) {
        const structMatchResult = structRegexp.exec(code);
        if (!structMatchResult) break;

        const structName = structMatchResult[1];
        state[structName] = {
            type: "struct",
            isParse: false,
            contentBegin: structMatchResult.index + structMatchResult[0].length
        }
    }

    return state;
}

module.exports = {
    parseModule,
    parseState
}