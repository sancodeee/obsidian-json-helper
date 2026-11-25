import { format, visit } from "jsonc-parser";
import { getMessages } from "./messages.mjs";

const strictJson = { disallowComments: true, allowTrailingComma: false };

export function getJsonDiagnostics(text, messages = getMessages()) {
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
                    message: messages.errors[code] ?? messages.syntaxError,
                });
            },
        }, strictJson);
    } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        diagnostics.push({ from: 0, to: 0, severity: "error", message: messages.nestingTooDeep });
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
