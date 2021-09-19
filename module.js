const fs = require("fs");
const path = require("path");
const process = require("process");

// {
//     xxx: {

//     }
// }

// function parseImport(str, moduleRootPath) {
//     const importData = {};

//     const stateMatchResult = str.match(/^\s*import\s+([("'])/);
//     const signStart = stateMatchResult && stateMatchResult[1];
//     let signEnd = signStart; 
//     if (signStart == "(") {
//         signEnd = ")";
//     }
//     const importContentStartIndex = stateMatchResult.index + stateMatchResult[0].length;
//     const signEndIndex = str.indexOf(signEnd, importContentStartIndex);
//     const importContent = str.slice(importContentStartIndex, signEndIndex);

//     if (signStart == "(") {

//     } else {

//     }
// }

/**
 * 包与代码映射
 * @param {String} moduleRootPath 
 * @param {Array<String>} fileContents 
 */
function parseModule_delete(moduleRootPath, fileContents) {
    const modules = {};
    fileContents.forEach(content => {
        const packageMatchResult = content.match(/^\s*package\s+(\S+)/);
        const packageName = packageMatchResult && packageMatchResult[1];
        if (packageName) {
            const codeObject = { code: "", depend: [] };
            content = content.slice(packageMatchResult.index + packageMatchResult[0].length);

            // TODO import 别名
            const importMatchResult = content.match(/^\s*import\s+\(([^)]+)/);
            const importSingleMathResult = content.match(/^\s*import\s+("[^"]+)/)
            const importResult = importMatchResult || importSingleMathResult;
            if (importResult && importResult[1]) {
                importResult[1].split("\n").forEach((moduleName) => {
                    const index = moduleName.indexOf(moduleRootPath);
                    if (~index) {
                        let name = moduleName.slice(index + moduleRootPath.length);
                        if (name[0] == "/") name = name.slice(1);
                        if (name.endsWith('"')) name = name.slice(0, name.length - 1);
                        codeObject.depend.push(name);
                    }
                });
                content = content.slice(importResult.index + importResult[0].length);
            }

            codeObject.code = content;
            if (!modules[packageName]) modules[packageName] = [];
            modules[packageName].push(codeObject);
        }
    });

    fs.writeFileSync(path.join(process.cwd(), "1.json"), JSON.stringify(modules, null, 2));
}


function parsePackage(code) {
    const packageMatchResult = code.match(/^\s*package\s+(\S+)/);
    if (packageMatchResult && packageMatchResult[1]) {
        return packageMatchResult[1];
    }
}

// const importBlockRegexp = /^package\s+\w+\s*((?:^\s*import\s*(?:\w*\s*"[^"]+"|\([^)]+\))\s*)+)/;

function parseModule(code, filePath) {
    const importBlockRegexp = /^\s*package\s+(\S+)\s*((?:^\s*import\s*(?:\w*\s*"[^"]+"|\([^)]+\))\s*)+)?/m;
    const importBlockMatchResult = code.match(importBlockRegexp);
    if (!importBlockMatchResult) throw new Error("文件缺少 package 声明\n" + filePath);

    const importStates = {};

    if (importBlockMatchResult && importBlockMatchResult[2]) {
        const importStateRegexp = /[ \t(]\s*(\w*)\s*"([^"]+)"/g;
        while (1) {
            let importStateMatchResult = importStateRegexp.exec(importBlockMatchResult[2]);
            if (!importStateMatchResult) break;

            importStates[importStateMatchResult[1] || importStateMatchResult[2]] = importStateMatchResult[2];

        }
    }

    return {
        packageName: importBlockMatchResult[1],
        importStates,
        lastIndex: importBlockMatchResult.index + importBlockMatchResult[0].length
    }
}

module.exports = {
    parseModule,
}