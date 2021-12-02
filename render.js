const fs = require("fs");

const requestMapper = {
    ShouldBindUri: "path参数 (例如：hello/:name/)",
    PostForm: "Form",
    PostFormMap: "FormMap (例如：names[first]=thinkerou&names[second]=tianou)",
    Param: "path参数  (例如：hello/:name/)",
    Query: "QueryString",
    QueryMap: "QueryStringMap (例如：?ids[a]=1234&ids[b]=hello)",
    DefaultQuery: "QueryString",
    Bind: "",
    BindJSON: "",
    ShouldBindWith: "",
    ShouldBind: "Json/Form/QueryString",
    ShouldBindQuery: "QueryString",
    FormFile: "单文件",
    MultipartForm: "多文件",
}


const responseMapper = {
    JSON: "",
    PureJSON: "Json",
    AsciiJSON: "经过Ascii转义处理的Json",
    JSONP: "",
    Status: "",
    HTML: "",
    String: "String",
    Pusher: "服务器推送",
    SecureJSON: "SecureJSON",
    YAML: "YAML",
    XML: "XML",
    ProtoBuf: "ProtoBuf",
    DataFromReader: "",
}


const httpStatusMapper = {
    StatusContinue: 100,
    StatusSwitchingProtocols: 101,
    StatusProcessing: 102,
    StatusEarlyHints: 103,

    StatusOK: 200,
    StatusCreated: 201,
    StatusAccepted: 202,
    StatusNonAuthoritativeInfo: 203,
    StatusNoContent: 204,
    StatusResetContent: 205,
    StatusPartialContent: 206,
    StatusMultiStatus: 207,
    StatusAlreadyReported: 208,
    StatusIMUsed: 226,

    StatusMultipleChoices: 300,
    StatusMovedPermanently: 301,
    StatusFound: 302,
    StatusSeeOther: 303,
    StatusNotModified: 304,
    StatusUseProxy: 305,

    StatusTemporaryRedirect: 307,
    StatusPermanentRedirect: 308,

    StatusBadRequest: 400,
    StatusUnauthorized: 401,
    StatusPaymentRequired: 402,
    StatusForbidden: 403,
    StatusNotFound: 404,
    StatusMethodNotAllowed: 405,
    StatusNotAcceptable: 406,
    StatusProxyAuthRequired: 407,
    StatusRequestTimeout: 408,
    StatusConflict: 409,
    StatusGone: 410,
    StatusLengthRequired: 411,
    StatusPreconditionFailed: 412,
    StatusRequestEntityTooLarge: 413,
    StatusRequestURITooLong: 414,
    StatusUnsupportedMediaType: 415,
    StatusRequestedRangeNotSatisfiable: 416,
    StatusExpectationFailed: 417,
    StatusTeapot: 418,
    StatusMisdirectedRequest: 421,
    StatusUnprocessableEntity: 422,
    StatusLocked: 423,
    StatusFailedDependency: 424,
    StatusTooEarly: 425,
    StatusUpgradeRequired: 426,
    StatusPreconditionRequired: 428,
    StatusTooManyRequests: 429,
    StatusRequestHeaderFieldsTooLarge: 431,
    StatusUnavailableForLegalReasons: 451,

    StatusInternalServerError: 500,
    StatusNotImplemented: 501,
    StatusBadGateway: 502,
    StatusServiceUnavailable: 503,
    StatusGatewayTimeout: 504,
    StatusHTTPVersionNotSupported: 505,
    StatusVariantAlsoNegotiates: 506,
    StatusInsufficientStorage: 507,
    StatusLoopDetected: 508,
    StatusNotExtended: 510,
    StatusNetworkAuthenticationRequired: 511,
}



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
            if (val.type == "interface{}") val.type = "map[string]interface{}"

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
    let okIndex = arr.findIndex(params => {
        if (params[0] && params[0].name === "http.StatusOK") {
            return true;
        }
    })
    if (~okIndex) {
        let temp = arr[0];
        arr[0] = arr[okIndex];
        arr[okIndex] = temp;
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

data.forEach(urlData => {
    str += `# ${urlData.method} ${urlData.url}\n`;
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
    str += `## 请求\n${req || "无"}\n## 响应\n${res || "无"}`;
});



fs.writeFileSync(__dirname + "//2.md", str);
