const { matchBlock } = require("./utils")

const ClosureFlag = "_CLOSURE_INDEX_";

function parseObject(str, startIndex) {
    const pos = matchBlock(str, "{", "}", true, startIndex);
    if (!pos) return {};
    str = str.slice(pos.begin + 1, pos.end);
    const regexp = /\s*([^:]+)\s*:\s*([^,]+),?/g;
    const obj = {};
    while (1) {
        const result = regexp.exec(str);
        if (!result) return obj;
        obj[result[1]] = result[2];
    }
}

// 结构体内部（不包括{}）
function parseStruct(str) {
    const structData = {};
    str.split(/[;\n]/).forEach(line => {
        const commentResult = line.match(/`[^`]+`\s*$/);
        if (commentResult) {
            line = line.slice(0, commentResult.index);
        }
        const typeResult = line.match(/[^,\s]+\s*$/);
        if (typeResult) {
            line = line.slice(0, typeResult.index);
            line = line.replace(/\s+/g, "");
            line.split(",").forEach(name => {
                // 包之间的结构体引用
                if (name) {
                    structData[name] = {
                        type: typeResult[0].trim(),
                        comment: commentResult && commentResult[0].trim()
                    }
                } else {
                    structData[typeResult[0].trim()] = "IMPORT";
                }
            })
        }
    });
    return structData;
}


function parseVarState(str, noShortState) {
    // 批量声明
    const regexp1 = /var\s*\(/g;
    // 赋值声明
    const regexp2 = /var\s*([^=\n;]+)=\s*([^\n;]+)/g;
    // 仅声明
    const regexp3 = /var\s*(\S+)\s*(\S+)/g;
    // 短声明
    const regexp4 = /(?:[\n;]|^)([^:\n;]+)\s*:=\s*([^\n;]+)/g;

    const state = {};

    while (1) {
        let result = regexp1.exec(str);
        if (!result) break;

        const block = matchBlock(str, "(", ")", true, result.index);
        const blockStr = str.slice(block.begin + 1, block.end);

        str = str.slice(0, result.index) + " ".repeat(block.end - result.index + 1) + str.slice(block.end);

        blockStr.split(/[;\n]/).forEach(line => {
            if (~line.indexOf("=")) {
                if (~line.indexOf(",")) {
                    line = line.replace(/\s+/g, "");
                    const assigns = line.split("=");
                    const names = assigns[0].split(",");
                    const values = assigns[1].split(",");
                    for (let i = 0; i < names.length; ++i) {
                        state[names[i]] = {
                            type: parseBasicType(values[i]),
                            value: values[i] || assigns[1],
                            index: block.begin,
                        }
                    }
                } else {
                    const singleAssignResult = line.match(/(\S+)\s+(\S+)?\s*=\s*(\S+)/);
                    if (singleAssignResult) {
                        state[singleAssignResult[1]] = {
                            type: singleAssignResult[2] || parseBasicType(singleAssignResult[3]),
                            value: singleAssignResult[3],
                            index: block.begin,
                        }
                    }
                }
            } else {
                const typeResult = line.match(/(\S+)\s*$/);
                if (typeResult) {
                    line = line.slice(0, typeResult.index);
                    line = line.replace(/\s+/g, "");
                    line.split(",").forEach(name => {
                        state[name] = {
                            type: typeResult[1],
                            value: undefined,
                            index: block.begin,
                        }
                    })
                }
            }
        })
    }


    while (1) {
        const result = regexp2.exec(str);
        if (!result) break;

        str = str.slice(0, result.index) + " ".repeat(result[0].length) + str.slice(result.index + result[0].length);

        if (~result[1].indexOf(",")) {
            const nameStr = result[1].replace(/\s+/g, "");
            const valueStr = result[2].replace(/\s+/g, "");
            const names = nameStr.split(",");
            const values = valueStr.split(",");
            for (let i = 0; i < names.length; ++i) {
                state[names[i]] = {
                    type: parseBasicType(values[i]),
                    value: values[i] || valueStr,
                    index: result.index
                }
            }
        } else {
            const nameStr = result[1].trim();
            const name = nameStr.split(/\s+/);
            const value = result[2].trim();
            state[name[0]] = {
                type: name[1] || parseBasicType(value),
                value: result[2].trim(),
                index: result.index
            }
        }
    }

    while (1) {
        const result = regexp3.exec(str);
        if (!result) break;

        str = str.slice(0, result.index) + " ".repeat(result[0].length) + str.slice(result.index + result[0].length);
        state[result[1]] = {
            type: result[2],
            value: undefined,
            index: result.index
        }

    }

    if (!noShortState) {
        while (1) {
            const result = regexp4.exec(str);
            if (!result) break;

            if (~result[1].indexOf(",")) {
                const nameStr = result[1].replace(/\s+/g, "");
                const valueStr = result[2].replace(/\s+/g, "");
                const names = nameStr.split(",");
                const values = valueStr.split(",");
                for (let i = 0; i < names.length; ++i) {
                    state[names[i]] = {
                        type: parseBasicType(values[i]),
                        value: values[i] || valueStr,
                        index: result.index
                    }
                }
            } else {
                const name = result[1].trim();
                const value = result[2].trim();
                state[name] = {
                    type: parseBasicType(value),
                    value,
                    index: result.index,
                }
            }
        }
    }

    return state;
}


function parseConstState(str) {
    // 批量声明
    const regexp1 = /const\s*\(/g;
    // 赋值声明
    const regexp2 = /const\s*([^=\n;]+)=\s*([^\n;]+)/g;

    const state = {};

    while (1) {
        const result = regexp1.exec(str);
        if (!result) break;

        const block = matchBlock(str, "(", ")", true, result.index);
        const blockStr = str.slice(block.begin + 1, block.end);

        str = str.slice(0, result.index) + " ".repeat(block.end - result.index + 1) + str.slice(block.end);

        blockStr.split(/[;\n]/).forEach(line => {
            if (~line.indexOf(",")) {
                line = line.replace(/\s+/g, "");
                const assigns = line.split("=");
                const names = assigns[0].split(",");
                const values = assigns[1].split(",");
                for (let i = 0; i < names.length; ++i) {
                    state[names[i]] = {
                        type: parseBasicType(values[i]),
                        value: values[i] || assigns[1],
                        index: result.index
                    }
                }

            } else {
                const singleAssignResult = line.match(/(\S+)\s+(\S+)?\s*=\s*(\S+)/);
                if (singleAssignResult) {
                    state[singleAssignResult[1]] = {
                        type: singleAssignResult[2] || parseBasicType(singleAssignResult[3]),
                        value: singleAssignResult[3],
                        index: result.index
                    }
                }
            }
        })
    }

    while (1) {
        const result = regexp2.exec(str);
        if (!result) break;

        if (~result[1].indexOf(",")) {
            const nameStr = result[1].replace(/\s+/g, "");
            const valueStr = result[2].replace(/\s+/g, "");
            const names = nameStr.split(",");
            const values = valueStr.split(",");
            for (let i = 0; i < names.length; ++i) {
                state[names[i]] = {
                    type: parseBasicType(values[i]),
                    value: values[i] || valueStr,
                    index: result.index,
                }
            }
        } else {
            const nameStr = result[1].trim();
            const name = nameStr.split(/\s+/);
            const value = result[2].trim();
            state[name[0]] = {
                type: name[1] || parseBasicType(value),
                value: result[2].trim(),
                index: result.index,
            }
        }
    }

    return state
}

function parseClosure(str) {
    const closures = [];
    const funcRegexp = /func\s*\(([^)]*)\)\s*(\([^)]+\)|[^{,]+)?\s*{/g;
    while (1) {
        const funcMatchResult = funcRegexp.exec(str);
        if (!funcMatchResult) break;

        const block = matchBlock(str, "{", "}", true, funcMatchResult.index + funcMatchResult[0].length - 1);

        const parameter = {};
        funcMatchResult[1].split(",").forEach(_str => {
            const result = _str.match(/^\s*(\S+)/);
            const _type = _str.slice(result.index + 1).trim();
            parameter[result[1]] = {
                type: _type,
                value: _type,
            }
        });
        closures.push({
            isParse: false,
            parameter,
            returnState: funcMatchResult[2],
            begin: block.begin, end: block.end
        });
        str = str.slice(0, funcMatchResult.index) + ClosureFlag + (closures.length - 1) + str.slice(block.end + 1);
    }
    return { closures, content: closures.length && str };
}

function parseFuncContent(str) {
    const closuresData = parseClosure(str);
    str = closuresData.content || str;
    const varState = parseVarState(str);
    const constState = parseConstState(str);

    return { state: Object.assign({}, varState, constState), closures: closuresData.closures };
}


function parseBasicType(value) {
    if (value == undefined) return undefined;
    // TODO 符号转义
    if (value.match(/(["']).*\1|`[^`]*`/)) {
        return "string";
    } else if (value.match(/-?\d+/)) {
        return "int";
    } else if (value.match(/\d+\.\d+/)) {
        return "float";
    } else if (value.match(/true|false/)) {
        return "bool";
    } else if (value.match(/\[[^\]]+\]\s*([^{]+)/)) {
        const result = value.match(/\[[^\]]+\]\s*([^{]+)/)[0];
        if (result[2] == "struct") {
            const block = matchBlock(value, "{", "}", true);
            return result[0] + value.slice(block.begin, block.end);
        }

        return result[0];
    } else if (value.match(ClosureFlag)) {
        return "closure";
    }
    return undefined;
}


function findNameByValue(states, keyWord) {
    for (let name in states) {
        if (states[name].value) {
            if ((typeof keyWord == "string" && ~states[name].value.indexOf(keyWord))
                || typeof keyWord == "object" && states[name].value.match(keyWord))
                return { name, data: states[name] };
        }
    }
}


/**
 * 返回code数组下标(TODO 未对函数参数进行查找)
 * @param {*} packageCodes 
 * @param {*} state 
 * @returns 
 */
function findNameStateInPackage(packageCodes, state) {
    for (let i = 0; i < packageCodes.length; ++i) {
        const codeData = packageCodes[i];
        if (codeData.states[state]) return i;
    }
    return -1;
}

function findNameStateInImport(modules, moduleName, codeIndex, name, property) {
    let stateData;
    // TODO 修改import包映射，加快查找速度
    for (let key in modules[moduleName].code[codeIndex].importStates) {
        if (modules[key] && modules[key].packageName == name) {
            const index = findNameStateInPackage(modules[key].code, property);
            if (~index) {
                stateData = modules[key].code[index].states[property];
                stateData.moduleName = key;
                stateData.codeIndex = index;
                break;
            }
        }
    }
    return stateData;
}

/**
 * 返回被调用函数或结构体(TODO 添加返回值用于快速查找)
 * @param {string} modules 
 * @param {string} moduleName 
 * @param {number} codeIndex 
 * @param {any} funcData 
 * @param {string} invokeState 
 * @returns
 */
function invoke(modules, moduleName, codeIndex, funcName, invokeState) {
    const result = invokeState.match(/([^\.\s]+)\.([^\(\{\s)]+)/);
    if (!result) return;

    const name = result[1];
    const property = result[2];
    const funcState = modules[moduleName].code[codeIndex].states[funcName];
    const funcData = funcState.funcData;

    let stateData;
    // 函数内
    if (funcData.state[name]) stateData = funcData.state[name];
    // 函数参数
    if (funcState.parameter[name]) {
        stateData = funcState.parameter[name];
    }
    // 文件内
    if (!stateData) stateData = modules[moduleName].code[codeIndex].states[name];
    // receiver TODO!!!
    // if(!stateData) stateData = 

    if (!stateData) {
        // 包内
        const otherCodeIndex = findNameStateInPackage(modules[moduleName].code, name);
        if (~otherCodeIndex) {
            stateData = modules[moduleName].code[otherCodeIndex].states[name];
        } else {   // 其他包
            if (property[0] != property[0].toUpperCase()) return;

            stateData = findNameStateInImport(modules, moduleName, codeIndex, name, property);
        }
    }
    return stateData;
}


module.exports = {
    parseStruct,
    parseVarState,
    parseConstState,
    parseClosure,
    parseFuncContent,
    findNameByValue,
    parseObject,
    invoke
}