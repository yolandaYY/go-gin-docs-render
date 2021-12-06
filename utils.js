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
    "Request.FormFile": "Form",
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


/**
 * 匹配块
 * @param {String}} str 
 * @param {String} startSign 开始标识
 * @param {String} endSign 结束标识
 * @param {Number} startIndex 从什么位置开始匹配
 * @returns {{ begin: Number, end: Number }}
 */
function matchBlock(str, startSign, endSign, isNested = false, startIndex = 0) {
    let begin = -1;
    let end = -1;
    if (isNested) {
        const regexp = new RegExp(`\\${startSign}|\\${endSign}`, "g");
        str = str.slice(startIndex);
        const stack = [];

        while (1) {
            const result = regexp.exec(str);
            if (!result) break;

            if (result[0] == startSign) {
                stack.push(true);
                if (begin == -1) begin = result.index;
            } else {
                end = result.index;
                stack.pop();
            }

            if (begin != -1 && !stack.length) {
                break;
            }
        }

        if (~begin && ~end) {
            begin += startIndex;
            end += startIndex;
        }

    } else {
        begin = str.indexOf(startSign, startIndex);
        end = str.indexOf(endSign, begin + 1);
    }

    if (begin == -1 || end == -1) return null;

    return { begin, end };
}

/**
 * 移除代码中的注释
 * // 单行注释  /*多行注释 排除字符串 "//" ' `
 * @param {String} str 
 */
function removeCommentContent(str) {
    const stringAndCommentRegExp = /\/(?:\/.*|\*[\s\S]*?\*\/)\s?|('[^\\']*(?:\\.[^\\']*)*'|"[^\\"]*(?:\\.[^\\"]*)*"|`[^\\`]*(?:\\.[^\\`]*)*`)/g;
    return str.replace(stringAndCommentRegExp, "$1");
}



module.exports = {
    removeCommentContent,
    matchBlock,
    KEYWORDS: Object.keys(requestMapper).concat(Object.keys(responseMapper)),
    requestMapper,
    responseMapper,
    httpStatusMapper
}
