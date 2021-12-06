const { matchBlock } = require("./utils");
const { findNameByValue, findState, parseFunc, parseParameter } = require("./type");
const { parseHandle } = require("./handle");
const { parseImportState } = require("./module");
const fs = require("fs");

const keyWords = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"];


// TODO 权限等中间层未解决
function parseRoute(modules, moduleName, codeIndex, stateData, routeVarName) {
    let content = modules[moduleName].code[codeIndex].content.slice(stateData.begin, stateData.end + 1);
    let routerName = routeVarName;
    
    if (!routeVarName) {
        const returnResult = content.match(/return\s+([^}]+)}\s*$/);
        if (!returnResult) return {};

        routerName = returnResult[1].trim();
    }

    let router = [];

    let stack = [{ prefix: "", regexp: new RegExp(`(?:\\s+|;)${routerName}\\.([^(\\s]+)\\s*\\(`, "g") }];
    while (1) {
        if (!stack.length) break;

        const data = stack.pop();
        const regexp = data.regexp;
        const prefix = data.prefix;
        while (1) {
            let result = regexp.exec(content);
            if (!result) break;

            const method = result[1].trim();

            const block = matchBlock(content, "(", ")", true, result.index);
            const parameters = parseParameter(content.slice(block.begin + 1, block.end));
            if (parameters && parameters[0]) {
                const path = parameters[0].name;
                if (keyWords.includes(method)&& parameters.length >= 2) {
                    if (path) {
                        const invokeData = findState(modules, moduleName, codeIndex, stateData, parameters[1].name);
                        if (invokeData) {
                            if (invokeData && invokeData.type.startsWith("func") && findNameByValue(invokeData.parameter, "*gin.Context")) {
                                const _moduleName = invokeData.moduleName || moduleName;
                                const _codeIndex = invokeData.codeIndex == undefined ? codeIndex : invokeData.codeIndex;
                                // if (!router.length) {   // 仅测试
                                parseFunc(invokeData, modules[_moduleName].code[_codeIndex]);
                                if (invokeData.moduleName) parseImportState(modules, modules[invokeData.moduleName].code);
                                // }
                                router.push({
                                    url: prefix + path,
                                    method,
                                    // parameters,
                                    // handleState: JSON.stringify(invokeData, null, 2)
                                    handleState: parseHandle(modules, _moduleName, _codeIndex, invokeData),
                                });
                            }
                        }
                    }
                } else if (method == "Group") {
                    const nameObj = findNameByValue(stateData.funcBlockData.state, content.slice(result.index, block.end));
                    if (nameObj && nameObj.name)
                        stack.push({ prefix: prefix + path, regexp: new RegExp(`[\\s;{]${nameObj.name}\\.([^(\\s]+)\\s*\\(`, "g") });
                }
            }

        }

    }

    return router;
}

module.exports = {
    parseRoute
}
