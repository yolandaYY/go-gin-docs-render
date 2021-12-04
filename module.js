const fs = require("fs");
const path = require("path");
const process = require("process");
const { matchBlock } = require("./utils");
const { parseVarState, parseConstState, parseParameter } = require("./type");


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

// TODO
// 不支持map
// 不支持 type name type
// 不支持函数声明返回值是函数(括号问题未解决)
function parseState(code) {
    const funcRegexp = /^\s*func\s*(\([^)]+\))?\s*([^(]+)\s*\(([^)]*)\)\s*(\([^)]+\)|[^{]+)?/mg;
    const structRegexp = /^\s*type\s+(\S+)\s+struct/mg;

    let str = code;
    const state = {};
    const receiver = {};
    while (1) {
        const funcMatchResult = funcRegexp.exec(code);
        if (!funcMatchResult) break;

        const receive = funcMatchResult[1];
        const funcName = funcMatchResult[2];
        let parameter = {};
        if (funcMatchResult[3]) {
            // TODO 省略声明（用后者）
            const arr = funcMatchResult[3].split(",");
            let _type = "";
            for (let i = arr.length - 1; i >= 0; --i) {
                const _result = arr[i].match(/^\s*(\S+)/);
                const type = arr[i].slice(_result[0].length).trim();
                _type = type || _type;
                parameter[_result[1]] = {
                    type: _type,
                    value: _type,
                    isParameter: true,
                    order: i,
                }

            }
        }
        const returnStr = funcMatchResult[4];
        let returnsType = [returnStr];
        if (returnStr && returnStr.match(/^\(.*\)$/)) {
            returnsType = parseParameter(returnStr.slice(1, returnStr.length - 1)).map(it => it.name);
        }
        
        const contentBegin = funcMatchResult.index + funcMatchResult[0].length;
        const block = matchBlock(code, "{", "}", true, contentBegin);
        if (receive) {
            // TODO 暂时不区分值还是引用
            const receiveResult = receive.match(/\(\s*(\S+)\s+\*?(\S+)\s*\)/);
            if (receiveResult) {
                if (!receiver[receiveResult[2]]) {
                    receiver[receiveResult[2]] = {};
                }
                receiver[receiveResult[2]][funcName] = {
                    isParse: false, receiveName: receiveResult[1], parameter, returnStr, returnsType,
                    begin: block.begin, end: block.end, name: funcName, type: "receiver"
                }

            }
        } else {
            state[funcName] = {
                type: "func", isParse: false, parameter, returnStr, returnsType,
                begin: block.begin, end: block.end, name: funcName
            };
        }
        str = str.slice(0, funcMatchResult.index) + " ".repeat(block.end - funcMatchResult.index + 1) + str.slice(block.end + 1);
    }

    while (1) {
        const structMatchResult = structRegexp.exec(code);
        if (!structMatchResult) break;

        const structName = structMatchResult[1];
        const contentBegin = structMatchResult.index + structMatchResult[0].length;
        const block = matchBlock(code, "{", "}", true, contentBegin);

        state[structName] = {
            type: "struct",
            isParse: false,
            name: structName,
            begin: block.begin, end: block.end
        }
        str = str.slice(0, structMatchResult.index) + " ".repeat(block.end - structMatchResult.index + 1) + str.slice(block.end + 1);
        // console.log(parseStruct(code.slice(block.begin + 1, block.end)));
    }
    const varState = parseVarState(str, true);
    const constState = parseConstState(str);

    return { receiver, states: Object.assign({}, varState, constState, state) };
}


// 处理import引入模块的名称与依赖
function parseImportState(modules, codes) {
    Object.values(modules).forEach(moduleObj => {
        moduleObj.code.forEach(codeData => {
            for (let importState in codeData.importStates) {
                if (modules[importState]) {
                    codeData.importStates[importState] = modules[importState].packageName;
                    modules[importState].code.forEach(_codeData => {
                        if(!_codeData.states) {
                            Object.assign(_codeData, parseState(_codeData.content));
                        }
                    })
                } else {
                    // TODO 去掉非本地模块(注意写死的部分gin等)(还有_.等特殊别名)
                    codeData.importStates[importState] = "";
                }
            }
        });
    });
}


module.exports = {
    parseModule,
    parseState,
    parseImportState
}