const { matchBlock } = require("./utils");
const { findNameByValue, invoke, parseFuncContent } = require("./type");
const { parseHandle } = require("./handle");
const { parseImportState } = require("./module");
const fs = require("fs");

const keyWords = ["GET", "POST", "PUT", "DELETE"];


// TODO 权限等中间层未解决
function parseRoute(modules, moduleName, codeIndex, stateData) {
    let content = modules[moduleName].code[codeIndex].content.slice(stateData.begin, stateData.end + 1);
    const returnResult = content.match(/return\s+([^}]+)}$/);
    if (!returnResult) return;

    let routerName = returnResult[1].trim();

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
            const parameters = content.slice(block.begin + 1, block.end).split(",");
            const path = parameters[0].trim().replace(/^(['"])(\S+)\1$/, "$2");

            if (keyWords.includes(method)) {
                if (path) {
                    const invokeData = invoke(modules, moduleName, codeIndex, stateData.name, parameters[1]);
                    if (invokeData) {
                        if (invokeData && invokeData.type == "func" && findNameByValue(invokeData.parameter, "*gin.Context")) {
                            const _moduleName = invokeData.moduleName || moduleName;
                            const _codeIndex = invokeData.codeIndex == undefined ? codeIndex : invokeData.codeIndex;
                            // if (!router.length) {   // TODO 仅测试
                            if (!invokeData.isParse) {
                                invokeData.funcBlockData = parseFuncContent(modules[_moduleName].code[_codeIndex].content.slice(invokeData.begin + 1, invokeData.end));
                                invokeData.isParse = true;
                            }
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

    fs.writeFileSync(__dirname + "//2.json", JSON.stringify(router, null, 2));
}

module.exports = {
    parseRoute
}
