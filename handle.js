const { matchBlock } = require("./utils");
const { findNameByValue, parseStruct, invoke, parseFuncContent, parseParameter, findFuncInnerStateInPackage } = require("./type");

const keyWords = {
    PostForm: "request",
    JSON: "response",
    Param: "request",
    Query: "request",
}

// TODO 转义
function contextRegexp(contextName) {
    return new RegExp(`[=\\s;{]${contextName}\\.([^(\\s]+)\\s*\\(`, "g");
}

function isGinContext(str) {
    if (str.match(/\*gin.Context/)) return true;
    return false;
}

function parseHandle(modules, moduleName, codeIndex, funcData) {
    // console.log(JSON.stringify(funcData, null, 2));

    let content = modules[moduleName].code[codeIndex].content.slice(funcData.begin + 1, funcData.end);
    const parameterResult = findNameByValue(funcData.parameter, /\*gin.Context/);
    if (!parameterResult) return;

    const contextName = parameterResult.name;
    const stack = [{ name: contextName, regexp: contextRegexp(contextName) }];

    const handle = {};

    for (let name in funcData.funcBlockData.state) {
        const state = funcData.funcBlockData.state[name];
        if (!state.type) {
            const invokeData = invoke(modules, moduleName, codeIndex, funcData.name, state.value);
            if (invokeData) {
                if (invokeData.type == "struct") {
                    state.type = "struct";
                    state.structData = invokeData;
                }
                const _moduleName = invokeData.moduleName || moduleName;
                const _codeIndex = invokeData.codeIndex == undefined ? codeIndex : invokeData.codeIndex;
                if (invokeData.type == "struct") {
                    if (!invokeData.isParse) {
                        const structObj = parseStruct(modules[_moduleName].code[_codeIndex].content.slice(invokeData.begin + 1, invokeData.end));
                        invokeData.isParse = true;
                        invokeData.structState = structObj;
                    }

                    for (let _name in invokeData.structState) {
                        if (isGinContext(invokeData.structState[_name].type)) {
                            state.structData.ginProperty = _name;
                            stack.push({ name, state: state, regexp: contextRegexp(name) });
                            break;
                        }
                    }
                    // console.log(invokeData);
                    // TODO 函数的情况
                } else if (invokeData.type == "func" && isGinContext(invokeData.returnState)) {
                    const returnResult = modules[_moduleName].code[_codeIndex].content.slice(invokeData.begin + 1, invokeData.end).match(/return\s+([^}]+)}$/);
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

            const block = matchBlock(content, "(", ")", true, result.index);
            const invokeParameters = parseParameter(content.slice(block.begin + 1, block.end));

            if (keyWords[method]) {
                if (!handle[method]) handle[method] = [];
                handle[method].push(invokeParameters);
            } else {
                const invokeData = invoke(modules, moduleName, codeIndex, funcData.name, result[0]);
                if (invokeData && invokeData.type == "receiver" && state.structData && state.structData.ginProperty) {
                    const _moduleName = state.structData.moduleName || moduleName;
                    const _codeIndex = state.structData.codeIndex == undefined ? codeIndex : state.structData.codeIndex;
                    const _content = modules[_moduleName].code[_codeIndex].content.slice(invokeData.begin, invokeData.end);
                    if (!invokeData.isParse) {
                        const funcBlockData = parseFuncContent(_content);
                        invokeData.isParse = true;
                        invokeData.funcBlockData = funcBlockData;
                    }
                    const ginRegexp = contextRegexp(invokeData.receiveName + "." + state.structData.ginProperty);
                    while (1) {
                        let _result = ginRegexp.exec(_content);
                        if (!_result) break;

                        const _method = _result[1].trim();
                        const _block = matchBlock(_content, "(", ")", true, _result.index);
                        const ginParameters = parseParameter(_content.slice(_block.begin + 1, _block.end));
                        if (keyWords[_method]) {
                            // 变量解析、加表
                            // console.log(invokeData, invokeParameters, method, ginParameters);
                            // console.log(_method);
                            const params = [];
                            ginParameters.forEach(param => {
                                if (param.type == "struct") {
                                    let _state = findFuncInnerStateInPackage(modules, _moduleName, _codeIndex, invokeData, param.name);
                                    if (!_state) {
                                        _state = param.name;
                                    } else {
                                        // TODO
                                        const structObj = parseStruct(modules[_moduleName].code[_codeIndex].content.slice(_state.begin + 1, _state.end));
                                        _state = {};
                                        Object.keys(param.obj).forEach(key => {
                                            let _paramState = findFuncInnerStateInPackage(modules, _moduleName, _codeIndex, invokeData, param.obj[key]);
                                            const jsonKey = structObj && structObj[key].json;
                                            const comment = structObj && structObj[key].comment;
                                            const type = structObj && structObj[key].type;
                                            if (_paramState && _paramState.isParameter) {
                                                _state[jsonKey || key] = "[value]：" + (invokeParameters[_paramState.order].type ?
                                                    invokeParameters[_paramState.order]._objStr : invokeParameters[_paramState.order].name) + " [" + type + "]：" + comment;
                                            } else {
                                                _state[key] = "[value]：" + param.obj[key];
                                            }
                                        })

                                        params.push(_state);
                                    }
                                } else {
                                    let _state = findFuncInnerStateInPackage(modules, _moduleName, _codeIndex, invokeData, param.name);
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