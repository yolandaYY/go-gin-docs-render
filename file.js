const fs = require("fs");
const path = require("path");

/**
 * 
 * @param {String} root 项目根地址
 * @param {Array} excludePaths 排除地址，不读
 * @param {Function} callback 
 */
function readAllGoFile(root, excludePaths, callback) {
    const stack = [root];
    const readFileTasks = [];
    while (!!stack.length) {
        const _path = stack.pop();
        if (excludePaths.indexOf(_path) == -1) {
            const stat = fs.statSync(_path);
            if (stat.isDirectory()) {
                const fileList = fs.readdirSync(_path);
                fileList.forEach(name => {
                    stack.push(path.join(_path, name));
                });
            } else if (_path.endsWith(".go")) {
                readFileTasks.push(new Promise((resolve, reject) => {
                    fs.readFile(_path, "utf8", function (err, data) {
                        if (err) reject(err);
                        resolve({content: data, path: _path});
                    })
                }));
            }
        }
    }

    return Promise.all(readFileTasks);
}

module.exports = {
    readAllGoFile: readAllGoFile
}