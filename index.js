const fs = require("fs");
const path = require("path");

const { readAllGoFile } = require("./file");
const { parseModule } = require("./module");
const { removeCommentContent } = require("./utils");

// TODO 命令行输入要生成文档的项目地址
const projectPath = path.join("../go-gin-example");
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
    files.forEach(file => {
        file.path = file.path.replace(projectPath, moduleRootPath).replace(/\\/g, "/");
        const importState = file.path.slice(0, file.path.lastIndexOf("/"));
        file.content = removeCommentContent(file.content);  // 去掉代码注释
    
        const moduleData = parseModule(file.content, file.path);
        
        if (!modules[importState]) modules[importState] = { packageName: moduleData.packageName, code: [] };
        
        
        if (moduleData.packageName != modules[importState].packageName) {
            throw new Error("同一目录下只能存在一个package\n" + file.path);
        }

        modules[importState].code.push({importStates: moduleData.importStates, content: file.content.slice(moduleData.lastIndex), state: {}});
    });
    
    let mainPackage = null;

    Object.values(modules).forEach(moduleObj => {
        moduleObj.code.forEach(codeData => {
            for(let importState in codeData.importStates) {
                if (modules[importState]) {
                    codeData.importStates[importState] = modules[importState].packageName;
                } else {
                    // 去掉非本地模块
                    codeData.importStates[importState] = "";
                }
            }
        });
        if (moduleObj.packageName == "main") {
            mainPackage = moduleObj;
        }
    })

    console.log(JSON.stringify(mainPackage, null, 2));

    
    
    // console.log(JSON.stringify(modules, null, 2));
})

