import {
    closeSearchPanel,
    findNext,
    findPrevious,
    getSearchQuery,
    search,
    SearchQuery,
    setSearchQuery,
} from "@codemirror/search";
import { keymap, runScopeHandlers } from "@codemirror/view";

function createSearchPanel(view) {
    let query = getSearchQuery(view.state);
    const dom = view.dom.ownerDocument.createElement("div");
    dom.className = "json-helper-search";
    const input = dom.createEl("input", {
        attr: {
            type: "search",
            placeholder: "在当前文件中查找",
            "aria-label": "在当前 JSON 文件中查找",
            "main-field": "true",
            spellcheck: "false",
            autocapitalize: "off",
            autocorrect: "off",
        },
    });
    input.value = query.search;

    const previous = dom.createEl("button", { text: "上一处", attr: { type: "button" } });
    const next = dom.createEl("button", { text: "下一处", attr: { type: "button" } });
    const close = dom.createEl("button", { text: "关闭", attr: { type: "button", "aria-label": "关闭查找" } });
    const status = dom.createSpan({ cls: "json-helper-search-status", attr: { role: "status" } });

    const updateMatchControls = (state) => {
        const hasMatch = query.valid && !query.getCursor(state).next().done;
        previous.disabled = next.disabled = !hasMatch;
        const message = query.valid && !hasMatch ? "未找到匹配" : "";
        if (status.textContent !== message) status.textContent = message;
    };

    const updateQuery = () => {
        if (input.value === query.search) return;
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: input.value, literal: true })) });
    };
    input.addEventListener("input", (event) => {
        if (!event.isComposing) updateQuery();
    });
    input.addEventListener("compositionend", updateQuery);
    previous.addEventListener("click", () => findPrevious(view));
    next.addEventListener("click", () => findNext(view));
    close.addEventListener("click", () => closeSearchPanel(view));

    dom.addEventListener("keydown", (event) => {
        if (event.target === input && event.key === "Enter") {
            // Enter can be confirming an IME candidate, including on older WebKit.
            if (event.isComposing || event.keyCode === 229) return;
            event.preventDefault();
            (event.shiftKey ? previous : next).click();
        } else if (runScopeHandlers(view, event, "search-panel")) {
            event.preventDefault();
        }
    });

    updateMatchControls(view.state);
    return {
        dom,
        top: true,
        mount() {
            input.focus();
            input.select();
        },
        update(update) {
            const newQuery = getSearchQuery(update.state);
            const queryChanged = !newQuery.eq(query);
            if (queryChanged) {
                query = newQuery;
                if (input.value !== query.search) input.value = query.search;
            }
            if (queryChanged || update.docChanged) updateMatchControls(update.state);
        },
    };
}

export const jsonSearch = [
    search({ top: true, literal: true, createPanel: createSearchPanel }),
    keymap.of([
        { key: "Escape", run: closeSearchPanel, scope: "editor search-panel" },
    ]),
];
