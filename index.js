const fs = require("fs");
const path = require("path");

const { readAllGoFile } = require("./file");
const { parseModule, parseState, parseImportState } = require("./module");
const { removeCommentContent, matchBlock } = require("./utils");
const { invoke, parseFuncContent, findNameByValue, parseObject } = require("./type");
const { parseRoute } = require("./router");


const GIN = "github.com/gin-gonic/gin";
const GORM = "github.com/jinzhu/gorm";
const NET = "net/http";

// TODO 命令行输入要生成文档的项目地址
const projectPath = path.join("D:\\goproject\\src\\go-gin-example");
console.log(projectPath);
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
}


const modules = {};


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
            // 规定main函数一定会声明一个变量存放server
            if (codeData.states.main) {
                const mainFunc = codeData.states.main;
                const funcBlockData = parseFuncContent(codeData.content.slice(mainFunc.begin, mainFunc.end));
                mainFunc.isParse = true;
                mainFunc.funcBlockData = funcBlockData;

                // 假设开始
                const server = findNameByValue(funcBlockData.state, `&${packageName}.Server`);
                if (~codeData.content.indexOf(server.name + ".ListenAndServe")) {
                    const serverObj = parseObject(codeData.content, server.data.index);
                    if (serverObj.Handler && funcBlockData.state[serverObj.Handler]) {
                        const routerValue = funcBlockData.state[serverObj.Handler];
                        console.log(routerValue);

                        if (!routerValue.type) {    // TODO 同一函数内未处理
                            const invokeData = invoke(modules, mainModuleName, i, "main", routerValue.value);
                            if (invokeData) {
                                if (invokeData.type == "func" && invokeData.returnState == "*gin.Engine") {
                                    const _moduleName = invokeData.moduleName || mainModuleName;
                                    const _codeIndex = invokeData.codeIndex == undefined ? i : invokeData.codeIndex;
                                    if (!invokeData.isParse) {
                                        invokeData.funcBlockData = parseFuncContent(modules[_moduleName].code[_codeIndex].content.slice(invokeData.begin + 1, invokeData.end));
                                        invokeData.isParse = true;
                                    }
                                    invokeData.moduleName && parseImportState(modules, modules[invokeData.moduleName].code);
                                    parseRoute(modules, _moduleName, _codeIndex, invokeData);
                                }
                            }

                        }
                        // TODO
                    }
                }

                break;
            }
        }
    }

    // console.log(JSON.stringify(modules, null, 2))


})

