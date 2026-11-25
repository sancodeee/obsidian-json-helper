import assert from "node:assert/strict";
import test from "node:test";
import { applyEdits } from "jsonc-parser";
import { getJsonDiagnostics, getJsonFormatEdits } from "../src/json-tools.mjs";
import { getMessages } from "../src/messages.mjs";

test("accepts strict JSON roots and rejects JSONC and malformed values", () => {
    for (const text of ["null", "0", '"中文"', "{}", "[false, -0, 1e+010]"]) {
        assert.deepEqual(getJsonDiagnostics(text), [], text);
    }
    for (const text of ["", "[01]", "[1,]", "{/* comment */}", '{"a":undefined}', '[1 2]', '"\\q"', '"\t"']) {
        assert.ok(getJsonDiagnostics(text).length, `Expected an error for ${JSON.stringify(text)}`);
    }
});

test("reports both token errors and a missing token at the end of the file", () => {
    const missingValue = '{\n  "a": ,\n  "b": 1\n}';
    const [first] = getJsonDiagnostics(missingValue);
    assert.equal(first.from, missingValue.indexOf(","));
    assert.equal(first.to, first.from + 1);
    const missingBrace = '{"a":1';
    assert.ok(getJsonDiagnostics(missingBrace).some(({ from, to }) => from === missingBrace.length && to === from));
});

test("localizes diagnostics while preserving their source ranges", () => {
    const json = '{\n  "test": ,\n}';
    const [english] = getJsonDiagnostics(json, getMessages("en-US"));
    const [chinese] = getJsonDiagnostics(json, getMessages("zh-CN"));
    assert.equal(english.from, chinese.from);
    assert.equal(english.to, chinese.to);
    assert.match(english.message, /JSON value/);
    assert.match(chinese.message, /JSON 值/);
    assert.equal(getMessages("zh-TW").language, "zh");
    assert.equal(getMessages("fr-FR").language, "en");
});

test("formats whitespace while preserving duplicate keys and exact number and string tokens", () => {
    const source = '{"n":9007199254740993,"n":1e+010,"escaped":"\\u4e2d","arr":[-0,1.00]}\n';
    const formatted = applyEdits(source, getJsonFormatEdits(source));
    assert.equal(formatted, '{\n  "n": 9007199254740993,\n  "n": 1e+010,\n  "escaped": "\\u4e2d",\n  "arr": [\n    -0,\n    1.00\n  ]\n}\n');
    assert.deepEqual(getJsonFormatEdits(formatted), []);
    assert.deepEqual(getJsonFormatEdits('{"missing":}'), []);
});
