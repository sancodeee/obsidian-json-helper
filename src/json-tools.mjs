import { format, ParseErrorCode, visit } from "jsonc-parser";

const strictJson = { disallowComments: true, allowTrailingComma: false };

const errorMessages = {
    [ParseErrorCode.InvalidSymbol]: "存在无法识别的字符或标记",
    [ParseErrorCode.InvalidNumberFormat]: "数字格式无效",
    [ParseErrorCode.PropertyNameExpected]: "属性名应使用双引号，并去掉多余的逗号",
    [ParseErrorCode.ValueExpected]: "缺少 JSON 值，或存在多余的逗号",
    [ParseErrorCode.ColonExpected]: "属性名后缺少冒号",
    [ParseErrorCode.CommaExpected]: "缺少逗号",
    [ParseErrorCode.CloseBraceExpected]: "缺少右大括号 }",
    [ParseErrorCode.CloseBracketExpected]: "缺少右方括号 ]",
    [ParseErrorCode.EndOfFileExpected]: "根值后存在多余内容",
    [ParseErrorCode.InvalidCommentToken]: "标准 JSON 不支持注释",
    [ParseErrorCode.UnexpectedEndOfComment]: "块注释未结束",
    [ParseErrorCode.UnexpectedEndOfString]: "字符串缺少结束引号",
    [ParseErrorCode.UnexpectedEndOfNumber]: "数字未写完整",
    [ParseErrorCode.InvalidUnicode]: "Unicode 转义无效",
    [ParseErrorCode.InvalidEscapeCharacter]: "字符串中的转义字符无效",
    [ParseErrorCode.InvalidCharacter]: "字符串中有未转义的控制字符",
};

export function getJsonDiagnostics(text) {
    const diagnostics = [];
    try {
        visit(text, {
            onError(code, from, length) {
                // A missing token can produce several follow-on errors at the same position.
                if (diagnostics[diagnostics.length - 1]?.from === from) return;
                diagnostics.push({
                    from,
                    to: from + length,
                    severity: "error",
                    message: errorMessages[code] ?? "JSON 语法错误",
                });
            },
        }, strictJson);
    } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        diagnostics.push({ from: 0, to: 0, severity: "error", message: "嵌套层级过深，无法完成校验" });
    }
    return diagnostics;
}

export function getJsonFormatEdits(text) {
    if (getJsonDiagnostics(text).length > 0) return [];
    return format(text, undefined, {
        tabSize: 2,
        insertSpaces: true,
        eol: "\n",
        insertFinalNewline: text.endsWith("\n"),
    });
}
