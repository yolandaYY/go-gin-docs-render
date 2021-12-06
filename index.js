const fs = require("fs");
const path = require("path");

const { readAllGoFile } = require("./file");
const { parseModule, parseState, parseImportState } = require("./module");
const { removeCommentContent, matchBlock } = require("./utils");
const { findState, parseFunc, findNameByValue, parseObject, parseParameter } = require("./type");
const { parseRoute } = require("./router");
const { renderMarkDown } = require("./render");


let targetPath = [];

function getPath(input) {
    const _path = input.toString().trim();
    if (_path && fs.existsSync(_path)) {
        return _path;
    }
}

console.log("请输入项目路径：");
process.stdin.on('data', (input) => {
    const _path = getPath(input);
    if (!targetPath.length) {
        if (_path) {
            targetPath.push(_path);
            console.log("请输入文档输出路径（不输入则为项目路径）：");
        } else {
            console.log("无效路径！请重新输入项目路径");
        }

    } else {
        console.log(targetPath[0]);
        main(targetPath[0], _path || targetPath[0]);
    }

});


function output(outputPath, router) {
    const jsonPath = path.join(outputPath, "go-gin-project-docs.json");
    fs.writeFileSync(jsonPath, JSON.stringify(router, null, 2));
    const markdownStr = renderMarkDown(jsonPath);
    fs.writeFileSync(path.join(outputPath, "go-gin-project-docs.md"), markdownStr);
}


function main(projectPath, outputPath) {

    const GIN = "github.com/gin-gonic/gin";
    const GORM = "github.com/jinzhu/gorm";
    const NET = "net/http";

    const excludePaths = [path.join(projectPath, "vendor")];

    let moduleRootPath = "";

    try {
        let modFileContent = fs.readFileSync(path.join(projectPath, "go.mod"), "utf-8");
        modFileContent = removeCommentContent(modFileContent);
        const moduleMatchResult = modFileContent.match(/^\s*module\s+(.+)/);

        if (!moduleMatchResult || !moduleMatchResult[1]) throw new Error("can't find module in go.mod");
        moduleRootPath = moduleMatchResult[1];
        console.log("project module ", moduleRootPath);

    } catch (error) {
        // TODO 提示go.mod文件不存在，用户手动输入mod文件地址或module名
        console.log("go.mod 不存在");
        return;
    }


    const modules = {};

    let router = {};
    let port;

    // TODO reject
    readAllGoFile(projectPath, excludePaths).then(files => {
        // 整理模块
        files.forEach(file => {
            file.path = file.path.replace(projectPath, moduleRootPath).replace(/\\/g, "/");
            const importState = file.path.slice(0, file.path.lastIndexOf("/"));
            file.content = removeCommentContent(file.content);  // 去掉代码注释
            file.content = file.content.replace(/\s*([\({,:\.])\s+/g, "$1"); // 去掉多余的空格

            const moduleData = parseModule(file.content, file.path);

            if (!modules[importState]) modules[importState] = { packageName: moduleData.packageName, code: [] };


            if (moduleData.packageName != modules[importState].packageName) {
                throw new Error("同一目录下只能存在一个package\n" + file.path);
            }

            modules[importState].code.push({ importStates: moduleData.importStates, content: file.content.slice(moduleData.lastIndex), states: false, filePath: file.path });
        });

        let mainPackage = null;
        let mainModuleName = "";

        for (let moduleName in modules) {
            if (modules[moduleName].packageName == "main") {
                mainPackage = modules[moduleName];
                mainModuleName = moduleName;

                mainPackage.code.forEach(codeData => {
                    Object.assign(codeData, parseState(codeData.content));
                })
            }
        }

        parseImportState(modules, mainPackage.code);


        // 如果main包引入NET包，就搜索一下有没有初始化.Server
        for (let i = 0; i < mainPackage.code.length; ++i) {
            const codeData = mainPackage.code[i];
            if (NET in codeData.importStates) {
                const packageName = codeData.importStates[NET] || "http";   // NET包引入的名称
                // 规定main函数一定会声明server
                if (codeData.states.main) {
                    const mainFunc = codeData.states.main;
                    const funcBlockData = parseFunc(mainFunc, codeData);

                    // 假设在main函数 http.server 并 ListenAndServe 开启服务 TODO 端口
                    const server = findNameByValue(funcBlockData.state, `&${packageName}.Server`);
                    if (server && ~codeData.content.indexOf(server.name + ".ListenAndServe")) {
                        const serverObj = parseObject(codeData.content, server.data.index);
                        if (serverObj.Handler && funcBlockData.state[serverObj.Handler]) {
                            const routerValue = funcBlockData.state[serverObj.Handler];
                            console.log(routerValue);

                            if (!routerValue.type) {    // TODO 同一函数内未处理
                                const invokeData = findState(modules, mainModuleName, i, mainFunc, routerValue.value);
                                if (invokeData) {
                                    if (invokeData.type.startsWith("func") && invokeData.returnStr == "*gin.Engine") {
                                        const _moduleName = invokeData.moduleName || mainModuleName;
                                        const _codeIndex = invokeData.codeIndex == undefined ? i : invokeData.codeIndex;
                                        parseFunc(invokeData, modules[_moduleName].code[_codeIndex])
                                        invokeData.moduleName && parseImportState(modules, modules[invokeData.moduleName].code);

                                        const runParamPos = matchBlock(codeData.content, "(", ")", true, codeData.content.indexOf(server.name + ".ListenAndServe"));
                                        const runParams = parseParameter(codeData.content.slice(runParamPos.begin + 1, runParamPos.end));
                                        port = runParams[0] && runParams[0].name;

                                        router = parseRoute(modules, _moduleName, _codeIndex, invokeData, null);
                                    }
                                }

                            }
                            // TODO
                        }

                        // 假设在main函数利用gin.Default或gin.New声明路由，并开启服务
                    } else if (GIN in codeData.importStates) {
                        const name = codeData.importStates[GIN] || "gin";

                        function serverMatch(key) {
                            const server = findNameByValue(funcBlockData.state, name + key);
                            const serverRunIndex = codeData.content.indexOf(server.name + ".Run");

                            if (server && server.name && ~serverRunIndex) {
                                const runParamPos = matchBlock(codeData.content, "(", ")", true, serverRunIndex);
                                const runParams = parseParameter(codeData.content.slice(runParamPos.begin + 1, runParamPos.end));
                                port = runParams[0] && runParams[0].name;
                                router = parseRoute(modules, mainModuleName, i, codeData.states.main, server.name);
                            }
                        }

                        serverMatch(".Default")
                    }

                    break;
                }
            }
        }

        router.unshift({ port: port || 8080 }); // 默认端口为8080

        output(outputPath, router);

        process.exit(1);

    })
}

