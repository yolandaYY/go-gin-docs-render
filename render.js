const fs = require("fs");
const { requestMapper, responseMapper, httpStatusMapper } = require("./utils");


// TODO 这里没有检查 net/http 的包名

function transformStatusToCode(status) {
    if (status) {
        const statusArr = status.split(".");
        return httpStatusMapper[statusArr[statusArr.length - 1]];
    }
}

function commentPrefix(len) {
    const prefixLength = 25 - len;
    if (prefixLength < 0) {
        return " ";
    } else {
        return new Array(prefixLength).join(" ");
    }
}

function transformStructProperty(val, prefix) {
    for (let _key in val.value) {
        const { jsonKey, type, comment } = val.value[_key];
        if (typeof val.value[_key] == "object" && jsonKey) {
            if (typeof val.value[_key].value == "object") {
                transformStructProperty(val.value[_key], prefix);
                val.value[jsonKey] = val.value[_key].value;
            } else {
                const _type = type ? ` [${type}] ` : "";
                const { value } = val.value[_key];
                val.value[jsonKey] = (value || "") + commentPrefix(jsonKey.length + (typeof value == "string" ? value.length : 0)) + " // " + _type + (comment || "");
            }
            delete val.value[_key];
        }
    }
}

function transformStruct(val, prefix) {

    let str = "";
    if (typeof val.value == "object") {
        transformStructProperty(val, prefix);
        val.value = JSON.stringify(val.value, null, prefix.length + 4).replace(/"|,/g, "");
    }

    if (val.value && val.value.endsWith("}")) val.value = val.value.slice(0, val.value.length - 1) + prefix + "}"

    if (val.value == "nil") val.value = "null";
    if (val.type == "interface{}") val.type = "";

    const _str = (val.jsonKey || val.name) + ": " + val.value + ",";
    str += prefix + _str;

    if (val.comment || val.type) {
        // TODO comment 更可读
        str += commentPrefix(_str.length) + `// [${val.type}]  ${val.comment}`;
    }

    return str;
}

function handleValue(value, prefix, isShowComment) {
    if (Array.isArray(value) && value) {
        return value.reduce((str, val) => {
            str += transformStruct(val, prefix);
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
        handleStr += `  - **状态码** ***${(params[0] && (transformStatusToCode(params[0].name) || params[0].name))}***\n  - **${responseMapper[key] || key}**  \n${prefix}  \n`;
        if (key.endsWith("JSON")) {
            handleStr += `\`\`\`\n{\n${handleValue(params[1], prefix)}\n}\n\`\`\`  \n`;
        } else {
            handleStr += handleValue(params[1], prefix) + "  \n";
        }
    })
    return handleStr;
}

function renderMarkDown(jsonPath) {
    let data = fs.readFileSync(jsonPath, "utf-8");
    data = JSON.parse(data);
    let str = "";

    if (data.length > 0) {
        const port = data[0].port;
        str += "# 端口" + port + "  \n\n";
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
                    // TODO 只解释第一个参数，后续可根据请求方法改进
                    req += handleValue(params[0], "    - ", false) + "\n";
                })
            }
            if (key in responseMapper) {
                let resStr = handleResponse(key, urlData.handleState[key]);
                res += resStr;
            }
        }
        str += `\n## 请求\n${req || "无"}\n## 响应\n${res || "无"} </details>`;
    });

    return str;
}


module.exports = {
    renderMarkDown,
}