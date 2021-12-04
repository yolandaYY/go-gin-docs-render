const fs = require("fs");
const { requestMapper, responseMapper, httpStatusMapper } = require("./utils");

let data = fs.readFileSync(__dirname + "//2.json", "utf-8");
data = JSON.parse(data);


// TODO 这里没有检查 net/http 的包名

let str = "";

function transformStatusToCode(status) {
    if (status) {
        const statusArr = status.split(".");
        return httpStatusMapper[statusArr[statusArr.length - 1]];
    }
}

function handleValue(value, prefix, isShowComment) {
    if (Array.isArray(value) && value) {
        return value.reduce((str, val) => {
            if (typeof val.value == "object") val.value = JSON.stringify(val.value, null, prefix.length * 2);
            if (val.value.endsWith("}")) val.value = val.value.slice(0, val.value.length - 1) + prefix + "}"
            if (val.type == "interface{}") val.type = ""

            str += prefix + (val.jsonKey || val.name) + (val.type ? ` [${val.type}]` : "") + (val.value ? ": " + val.value : "");
            if (val.comment && isShowComment) {
                val.comment = val.comment.replace('binding:"required"', "必填")
                str += " // " + val.comment;
            }
            return str + "  \n";
        }, "");
    } else if (typeof value == "object") {
        return prefix + value.name;
    } else {
        return prefix + value;
    }

}

function handleResponse(key, arr) {
    let handleStr = "\n";
    let okIndex = 0;
    for (let i = 0; i < arr.length; ++i) {
        if (arr[i][0] && arr[i][0].name === "http.StatusOK") {
            let temp = arr[i];
            arr[i] = arr[okIndex];
            arr[okIndex] = temp;
            okIndex++;   
        }
    }

    const prefix = "    "
    arr.forEach(params => {
        handleStr += `  - **状态码** ***${(params[0] && (transformStatusToCode(params[0].name) || params[0].name))}***  \n${prefix}  \n`;
        if (key.endsWith("JSON")) {
            handleStr += `\`\`\`\n${prefix}{\n${handleValue(params[1], prefix + prefix)}\n${prefix}}\n\`\`\`  \n`;
        } else {
            handleStr += handleValue(params[1], prefix) + "  \n";
        }
    })
    return handleStr;
}

if (data[0] && data[0].port) {
    str += "# 端口" + data[0].port + "  \n\n";
    data.shift();
}

data.forEach(urlData => {
    str += `<details> <summary>${urlData.method} ${urlData.url}</summary>\n`;
    let req = "";
    let res = "";
    for (key in urlData.handleState) {
        if (key in requestMapper) {
            req += "- " + (requestMapper[key] || key) + "\n\n";
            urlData.handleState[key].forEach(params => {
                req += handleValue(params[0], "    - ", false) + "\n";
            })
        }
        if (key in responseMapper) {
            res += "- " + (responseMapper[key] || key) + "\n";
            let resStr = handleResponse(key, urlData.handleState[key]);
            res += resStr;
        }
    }
    str += `\n## 请求\n${req || "无"}\n## 响应\n${res || "无"} </details>`;
});



fs.writeFileSync(__dirname + "//2.md", str);

