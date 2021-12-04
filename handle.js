const { matchBlock, KEYWORDS } = require("./utils");
const { findNameByValue, parseStruct, findState, parseFunc, parseParameter, findFuncInnerStateInPackage } = require("./type");

// TODO 转义
function contextRegexp(contextName) {
    return new RegExp(`[=\\s;{\(]${contextName}\\.([^(\\s]+)\\s*\\(`, "g");
}

function isGinContext(str) {
    if (str.match(/\*gin.Context/)) return true;
    return false;
}

function parseHandle(modules, moduleName, codeIndex, funcData) {
    // console.log(JSON.stringify(funcData, null, 2));

    let content = modules[moduleName].code[codeIndex].content.slice(funcData.begin + 1, funcData.end);
    if (funcData.type === "func closure") {
        content = funcData.content;
    }

    const parameterResult = findNameByValue(funcData.parameter, /\*gin.Context/);
    if (!parameterResult) return;

    const contextName = parameterResult.name;
    const stack = [{ name: contextName, regexp: contextRegexp(contextName) }];

    const handle = {};

    for (let name in funcData.funcBlockData.state) {
        const state = funcData.funcBlockData.state[name];
        if (!state.type) {
            const invokeData = findState(modules, moduleName, codeIndex, funcData, state.value);
            if (invokeData) {
                if (invokeData.type == "struct") {
                    state.type = "struct";
                    state.structData = invokeData;
                }
                const _moduleName = invokeData.moduleName || moduleName;
                const _codeIndex = invokeData.codeIndex == undefined ? codeIndex : invokeData.codeIndex;
                if (invokeData.type == "struct") {
                    parseStruct(modules, _moduleName, _codeIndex, invokeData);

                    for (let _name in invokeData.structState) {
                        if (isGinContext(invokeData.structState[_name].type)) {
                            state.structData.ginProperty = _name;
                            stack.push({ name, state: state, regexp: contextRegexp(name) });
                            break;
                        }
                    }
                    // console.log(invokeData);
                    // TODO 函数的情况
                } else if (invokeData.type.startsWith("func") && isGinContext(invokeData.returnStr)) {
                    const returnResult = modules[_moduleName].code[_codeIndex].content.slice(invokeData.begin + 1, invokeData.end).match(/return\s+([^}]+)}\s*$/);
                    stack.push({ name: returnResult[1].trim(), state: state, regexp: contextRegexp(returnResult[1].trim()) });
                }
            }
        }
    }
    // console.log(funcData.funcBlockData);
    // TODO 加优化表
    while (1) {
        if (!stack.length) break;

        const { regexp, name, state } = stack.pop();

        while (1) {
            let result = regexp.exec(content);
            if (!result) break;
            const method = result[1].trim();

            const block = matchBlock(content, "(", ")", true, result.index + (result[0][0] == "(" ? 1 : 0));
            const invokeParameters = parseParameter(content.slice(block.begin + 1, block.end));

            if (~KEYWORDS.indexOf(method)) {
                if (!handle[method]) handle[method] = [];
                handle[method].push(invokeParameters);
                // console.log(method);
            } else {
                const invokeData = findState(modules, moduleName, codeIndex, funcData, result[0]);
                if (invokeData && invokeData.type == "receiver" && state.structData && state.structData.ginProperty) {
                    const _moduleName = state.structData.moduleName || moduleName;
                    const _codeIndex = state.structData.codeIndex == undefined ? codeIndex : state.structData.codeIndex;
                    parseFunc(invokeData, modules[_moduleName].code[_codeIndex]);

                    const _content = modules[_moduleName].code[_codeIndex].content.slice(invokeData.begin, invokeData.end);
                    const ginRegexp = contextRegexp(invokeData.receiveName + "." + state.structData.ginProperty);
                    while (1) {
                        let _result = ginRegexp.exec(_content);
                        if (!_result) break;

                        const _method = _result[1].trim();
                        const _block = matchBlock(_content, "(", ")", true, _result.index);
                        const ginParameters = parseParameter(_content.slice(_block.begin + 1, _block.end));
                        if (~KEYWORDS.indexOf(_method)) {
                            // 变量解析、加表
                            // console.log("->", invokeData, invokeParameters, method, ginParameters);
                            // console.log(_method);
                            const params = [];
                            ginParameters.forEach(param => {
                                if (param.type == "struct") {
                                    let _state = findFuncInnerStateInPackage(modules, _moduleName, _codeIndex, invokeData, param.name);
                                    if (!_state) {
                                        throw new Error("找不到" + param.name);
                                    } else {
                                        // TODO
                                        const structObj = parseStruct(modules, _moduleName, _codeIndex, _state);
                                        _state = [];
                                        Object.keys(param.obj).forEach(name => {
                                            let _paramState = findState(modules, _moduleName, _codeIndex, invokeData, param.obj[name]);
                                            const jsonKey = structObj && structObj[name].jsonKey;
                                            const comment = structObj && structObj[name].comment;
                                            const type = structObj && structObj[name].type;
                                            if (_paramState && _paramState.isParameter) {

                                                // 找非结构体、map、nil 的传参类型 TODO 需要循环查找
                                                if (!invokeParameters[_paramState.order].type && invokeParameters[_paramState.order].name != "nil") {
                                                    let paramState = findState(modules, moduleName, codeIndex, funcData, invokeParameters[_paramState.order].name, true);
                                                    if (paramState) {
                                                        invokeParameters[_paramState.order].type = paramState.type;
                                                        invokeParameters[_paramState.order].obj = paramState.value;

                                                        if (paramState.type == "struct") {
                                                            invokeParameters[_paramState.order].obj = parseStruct(modules, paramState.moduleName, paramState.codeIndex, paramState);
                                                        }
                                                    }
                                                }

                                                _state.push({
                                                    name,
                                                    jsonKey,
                                                    value: invokeParameters[_paramState.order].type ?
                                                        (invokeParameters[_paramState.order].obj || invokeParameters[_paramState.order]._objStr) : invokeParameters[_paramState.order].name,
                                                    type,
                                                    comment
                                                });
                                            } else {
                                                _state.push({ name, jsonKey, value: param.obj[name], type, comment });
                                            }
                                        })

                                        params.push(_state);
                                    }
                                } else {
                                    let _state = findState(modules, _moduleName, _codeIndex, invokeData, param.name);
                                    if (!_state) {
                                        _state = param.name;
                                    } else if (_state.isParameter) {
                                        _state = invokeParameters[_state.order];
                                    }
                                    params.push(_state)
                                }
                            });
                            if (!handle[_method]) handle[_method] = [];
                            handle[_method].push(params);
                        }
                    }

                }
                // console.log(JSON.stringify(state, null, 2));
            }
        }

    }
    return handle;
}


module.exports = {
    parseHandle
}