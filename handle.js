const { matchBlock } = require("./utils");
const { findNameByValue, parseStruct, invoke } = require("./type");

const keyWords = {
    PostForm: "request",
    Response: "response"
}

// TODO 转义
function contextRegexp(contextName) {
    return new RegExp(`[=\\s;]${contextName}\\.([^(\\s]+)\\s*\\(`, "g");
}

function isGinContext(str) {
    if (str.match(/\*gin.Context/)) return true;
    return false;
}

function parseHandle(modules, moduleName, codeIndex, stateData) {
    // console.log(JSON.stringify(stateData, null, 2));

    let content = modules[moduleName].code[codeIndex].content.slice(stateData.begin, stateData.end + 1);
    const parameterResult = findNameByValue(stateData.parameter, /\*gin.Context/);
    if (!parameterResult) return;

    const contextName = parameterResult.name;
    const stack = [contextRegexp(contextName)];

    for (let name in stateData.funcData.state) {
        const state = stateData.funcData.state[name];
        if (!state.type) {
            const invokeData = invoke(modules, moduleName, codeIndex, stateData.name, state.value);
            if (invokeData) {
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
                            stack.push(contextRegexp(name));
                            break;
                        }
                    }

                } else if (invokeData.type == "func" && isGinContext(invokeData.returnState)) {
                    const returnResult = modules[_moduleName].code[_codeIndex].content.slice(invokeData.begin + 1, invokeData.end).match(/return\s+([^}]+)}$/);
                    // TODO 新增额外的信息
                    stack.push(contextRegexp(returnResult[1].trim()))
                }
            }
        }
    }

    while (1) {
        if (!stack.length) break;

        const regexp = stack.pop();
        while (1) {
            let result = regexp.exec(content);
            if (!result) break;

            const method = result[1].trim();

            const block = matchBlock(content, "(", ")", true, result.index);
            const parameters = content.slice(block.begin + 1, block.end).split(",");

            if (keyWords[method]) {
                console.log(parameters);
            }
        }

    }

}


module.exports = {
    parseHandle
}