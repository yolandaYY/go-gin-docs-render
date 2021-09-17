const fs = require("fs");
const path = require("path");

const { readAllFile } = require("./file");
const { parseModule } = require("./module");

// TODO 命令行输入要生成文档的项目地址
const projectPath = "../go-gin-example";

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
readAllFile(projectPath, excludePaths).then((files) => {
    parseModule(moduleRootPath, files)
}).then(() => {
    // console.log(modules);
});

