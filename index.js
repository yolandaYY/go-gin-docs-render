const fs = require("fs");
const path = require("path");

const { readAllFile } = require("./file");
const { parsePackage } = require("./module");
const { removeCommentContent } = require("./utils");

// TODO 命令行输入要生成文档的项目地址
const projectPath = path.join("../go-gin-example");
console.log(projectPath);
const excludePaths = [path.join(projectPath, "vendor")];

let moduleRootPath = "";

try {
    const modFileContent = fs.readFileSync(path.join(projectPath, "go.mod"), "utf-8");
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
readAllFile(projectPath, excludePaths).then(files => {
    files.forEach(file => {
        file.path = file.path.replace(projectPath, moduleRootPath).replace(/\\/g, "/");
        const importState = file.path.slice(0, file.path.lastIndexOf("/"));
        file.content = removeCommentContent(file.content);  // 去掉代码注释
    
        const packageName = parsePackage(file.content);
        if (!modules[importState]) modules[importState] = { packageName, code: [] };


        if (packageName != modules[importState].packageName) {
            throw new Error("同一目录下只能存在一个package");
        }

    });
    console.log(modules);
})

