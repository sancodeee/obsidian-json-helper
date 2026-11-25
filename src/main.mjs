import { Plugin, Scope, TextFileView } from "obsidian";
import { defaultKeymap, history, historyKeymap, isolateHistory } from "@codemirror/commands";
import { diagnosticCount, linter } from "@codemirror/lint";
import { openSearchPanel } from "@codemirror/search";
import { Annotation, EditorState, Text, Transaction } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { jsonSearch } from "./json-search.mjs";
import { getJsonDiagnostics, getJsonFormatEdits } from "./json-tools.mjs";

const VIEW_TYPE = "json-helper";
const fileUpdate = Annotation.define();
let nextStatusId = 0;

class JsonFileView extends TextFileView {
    constructor(leaf) {
        super(leaf);
        this.scope = new Scope(this.app.scope);
        this.scope.register(["Mod"], "f", () => {
            if (!this.editor) return;
            openSearchPanel(this.editor);
            return false;
        });
    }

    getViewType() {
        return VIEW_TYPE;
    }

    getIcon() {
        return "file-json";
    }

    canAcceptExtension(extension) {
        return extension === "json";
    }

    async onOpen() {
        this.contentEl.addClass("json-helper-view");
        const toolbar = this.contentEl.createDiv("json-helper-toolbar");
        this.statusEl = toolbar.createDiv({
            cls: "json-helper-status",
            attr: { id: `json-helper-status-${++nextStatusId}`, role: "status" },
        });
        const actions = toolbar.createDiv("json-helper-actions");
        const searchButton = actions.createEl("button", { text: "查找", attr: { type: "button" } });
        this.registerDomEvent(searchButton, "click", () => openSearchPanel(this.editor));
        this.formatButton = actions.createEl("button", { text: "格式化", attr: { type: "button" } });
        this.formatButton.disabled = true;
        this.registerDomEvent(this.formatButton, "click", () => this.formatJson());
        this.editor = new EditorView({
            parent: this.contentEl.createDiv("json-helper-editor"),
            state: this.createEditorState(this.fileDocument ?? Text.empty),
        });
    }

    async onClose() {
        try {
            // TextFileView reads the editor when it flushes a pending save on close.
            await super.onClose();
        } finally {
            this.editor?.destroy();
            this.editor = null;
        }
    }

    createEditorState(doc) {
        return EditorState.create({
            doc,
            extensions: [
                lineNumbers(),
                history(),
                jsonSearch,
                keymap.of([...defaultKeymap, ...historyKeymap]),
                EditorView.contentAttributes.of((view) => {
                    const invalid = diagnosticCount(view.state) > 0;
                    return {
                        "aria-label": "JSON 编辑器",
                        "aria-invalid": String(invalid),
                        ...(invalid ? { "aria-describedby": this.statusEl.id } : {}),
                        spellcheck: "false",
                        autocapitalize: "off",
                        autocorrect: "off",
                    };
                }),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged && !update.transactions.some((transaction) => transaction.annotation(fileUpdate))) {
                        this.requestSave();
                    }
                }),
                linter((view) => {
                    const diagnostics = getJsonDiagnostics(view.state.doc.toString());
                    this.showValidation(view.state.doc, diagnostics);
                    return diagnostics;
                }, { delay: 250 }),
            ],
        });
    }

    getViewData() {
        const doc = this.editor?.state.doc;
        if (!doc || doc.eq(this.fileDocument ?? Text.empty)) return this.fileText ?? "";
        return doc.sliceString(0, doc.length, this.lineEnding ?? "\n");
    }

    setViewData(data, clear) {
        this.fileText = data;
        this.lineEnding = data.match(/\r\n?|\n/)?.[0] ?? "\n";
        this.fileDocument = Text.of(data.split(/\r\n?|\n/));
        if (!this.editor) return;
        if (clear) {
            this.editor.setState(this.createEditorState(this.fileDocument));
        } else if (!this.editor.state.doc.eq(this.fileDocument)) {
            this.editor.dispatch({
                changes: { from: 0, to: this.editor.state.doc.length, insert: this.fileDocument },
                annotations: [fileUpdate.of(true), Transaction.addToHistory.of(false)],
            });
        }
    }

    clear() {
        this.setViewData("", true);
    }

    showValidation(doc, diagnostics) {
        const first = diagnostics[0];
        this.formatButton.disabled = Boolean(first);
        this.statusEl.toggleClass("json-helper-error", Boolean(first));
        let message = "JSON 格式正确";
        if (first) {
            const line = doc.lineAt(first.from);
            const column = Array.from(line.text.slice(0, first.from - line.from)).length + 1;
            message = `第 ${line.number} 行，第 ${column} 列：${first.message}`;
            if (diagnostics.length > 1) message += `（共 ${diagnostics.length} 处）`;
        }
        if (this.statusEl.textContent !== message) this.statusEl.textContent = message;
    }

    formatJson() {
        const edits = getJsonFormatEdits(this.editor.state.doc.toString());
        if (edits.length === 0) return;
        this.editor.dispatch({
            changes: edits.map(({ offset, length, content }) => ({ from: offset, to: offset + length, insert: content })),
            annotations: isolateHistory.of("full"),
        });
    }
}

export default class JsonHelperPlugin extends Plugin {
    onload() {
        this.registerView(VIEW_TYPE, (leaf) => new JsonFileView(leaf));
        this.registerExtensions(["json"], VIEW_TYPE);
    }
}
