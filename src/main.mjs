import { getLanguage, moment, Notice, Plugin, Scope, TextFileView } from "obsidian";
import { defaultKeymap, history, historyKeymap, isolateHistory } from "@codemirror/commands";
import { diagnosticCount, forceLinting, linter } from "@codemirror/lint";
import { openSearchPanel } from "@codemirror/search";
import { Annotation, Compartment, EditorState, Facet, Text, Transaction } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, panels } from "@codemirror/view";
import { createJsonSearch } from "./json-search.mjs";
import { getJsonDiagnostics, getJsonFormatEdits } from "./json-tools.mjs";
import { getMessages } from "./messages.mjs";

const VIEW_TYPE = "json-helper";
const fileUpdate = Annotation.define();
const messagesFacet = Facet.define({ combine: (values) => values[0] ?? getMessages() });
const jsonSearch = createJsonSearch(messagesFacet);
let nextStatusId = 0;

class JsonFileView extends TextFileView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.languageConfig = new Compartment();
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
        this.toolbar = toolbar;
        this.searchSlot = toolbar.createDiv("json-helper-search-slot");
        this.statusEl = toolbar.createDiv({
            cls: "json-helper-status",
            attr: { id: `json-helper-status-${++nextStatusId}`, role: "status" },
        });
        this.formatButton = toolbar.createEl("button", {
            cls: "json-helper-format",
            attr: { type: "button" },
        });
        this.formatButton.disabled = true;
        this.registerDomEvent(this.formatButton, "click", () => this.formatJson());
        this.languageButton = toolbar.createEl("button", { cls: "json-helper-language", attr: { type: "button" } });
        this.registerDomEvent(this.languageButton, "click", () => void this.plugin.toggleLanguage());
        this.updateLanguage();
        this.editor = new EditorView({
            parent: this.contentEl.createDiv("json-helper-editor"),
            state: this.createEditorState(this.fileDocument ?? Text.empty),
        });
        openSearchPanel(this.editor);
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
                this.languageConfig.of(messagesFacet.of(this.plugin.messages)),
                panels({ topContainer: this.searchSlot }),
                jsonSearch,
                keymap.of([...defaultKeymap, ...historyKeymap]),
                EditorView.contentAttributes.of((view) => {
                    const invalid = diagnosticCount(view.state) > 0;
                    return {
                        "aria-label": view.state.facet(messagesFacet).editor,
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
                    const messages = view.state.facet(messagesFacet);
                    const diagnostics = getJsonDiagnostics(view.state.doc.toString(), messages);
                    this.showValidation(view.state.doc, diagnostics, messages);
                    return diagnostics;
                }, {
                    delay: 250,
                    needsRefresh: (update) => update.startState.facet(messagesFacet) !== update.state.facet(messagesFacet),
                }),
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
            openSearchPanel(this.editor);
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

    updateLanguage() {
        const messages = this.plugin.messages;
        this.toolbar.lang = messages.lang;
        this.formatButton.textContent = messages.format;
        this.languageButton.textContent = messages.switchButton;
        this.languageButton.setAttribute("aria-label", messages.switchLabel);
        this.languageButton.title = messages.switchLabel;
        if (this.editor) {
            this.editor.dispatch({ effects: this.languageConfig.reconfigure(messagesFacet.of(messages)) });
            forceLinting(this.editor);
        }
    }

    showValidation(doc, diagnostics, messages) {
        const first = diagnostics[0];
        this.formatButton.disabled = Boolean(first);
        this.statusEl.toggleClass("json-helper-error", Boolean(first));
        let message = messages.validJson;
        if (first) {
            const line = doc.lineAt(first.from);
            const column = Array.from(line.text.slice(0, first.from - line.from)).length + 1;
            message = messages.errorAt(line.number, column, first.message, diagnostics.length);
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
    changingLanguage = false;

    async onload() {
        this.settings = (await this.loadData()) ?? {};
        const savedLanguage = this.settings.language;
        const locale = savedLanguage === "en" || savedLanguage === "zh"
            ? savedLanguage
            : getLanguage?.() ?? moment.locale();
        this.messages = getMessages(locale);
        this.registerView(VIEW_TYPE, (leaf) => new JsonFileView(leaf, this));
        this.registerExtensions(["json"], VIEW_TYPE);
    }

    async toggleLanguage() {
        if (this.changingLanguage) return;
        const messages = getMessages(this.messages.language === "zh" ? "en" : "zh");
        const settings = { ...this.settings, language: messages.language };
        this.changingLanguage = true;
        try {
            await this.saveData(settings);
        } catch {
            new Notice(this.messages.saveLanguageFailed);
            return;
        } finally {
            this.changingLanguage = false;
        }
        this.settings = settings;
        this.messages = messages;
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
            if (leaf.view instanceof JsonFileView && leaf.view.editor) leaf.view.updateLanguage();
        }
    }
}
