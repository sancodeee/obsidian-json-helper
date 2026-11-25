import { setIcon } from "obsidian";
import {
    getSearchQuery,
    search,
    SearchQuery,
    setSearchQuery,
} from "@codemirror/search";

function collectMatches(state, query) {
    const matches = [];
    if (query.valid) {
        const cursor = query.getCursor(state);
        for (let match = cursor.next(); !match.done; match = cursor.next()) {
            matches.push(match.value);
        }
    }
    return matches;
}

function firstMatchAtOrAfter(matches, offset) {
    let start = 0;
    let end = matches.length;
    while (start < end) {
        const middle = Math.floor((start + end) / 2);
        if (matches[middle].from < offset) start = middle + 1;
        else end = middle;
    }
    return start;
}

function createSearchPanel(view, messagesFacet) {
    let query = getSearchQuery(view.state);
    let messages = view.state.facet(messagesFacet);
    let matches = collectMatches(view.state, query);
    let activeIndex = 0;
    let scrollFrame;
    const ownerWindow = view.dom.ownerDocument.defaultView;
    const dom = view.dom.ownerDocument.createElement("div");
    dom.className = "json-helper-search";
    const input = dom.createEl("input", {
        attr: {
            type: "search",
            "main-field": "true",
            spellcheck: "false",
            autocapitalize: "off",
            autocorrect: "off",
        },
    });
    input.value = query.search;

    const status = dom.createSpan({ cls: "json-helper-search-status", attr: { role: "status" } });
    const addMatchButton = (icon) => {
        const button = dom.createEl("button", { cls: "json-helper-match", attr: { type: "button" } });
        setIcon(button, icon);
        return button;
    };
    const first = addMatchButton("chevrons-up");
    const previous = addMatchButton("chevron-up");
    const next = addMatchButton("chevron-down");
    const last = addMatchButton("chevrons-down");
    const buttons = [
        [first, "firstMatch"],
        [previous, "previousMatch"],
        [next, "nextMatch"],
        [last, "lastMatch"],
    ];

    const updateLabels = () => {
        input.placeholder = messages.findPlaceholder;
        input.setAttribute("aria-label", messages.findLabel);
        for (const [button, label] of buttons) {
            button.setAttribute("aria-label", messages[label]);
            button.title = messages[label];
        }
    };

    const updateMatchControls = () => {
        const total = matches.length;
        const position = total ? activeIndex + 1 : 0;
        for (const [button] of buttons) button.disabled = total === 0;
        const count = query.valid ? `${position}/${total}` : "";
        const label = query.valid ? (total ? messages.matchPosition(position, total) : messages.noMatches) : "";
        if (status.title !== label) {
            status.title = label;
            if (label) status.setAttribute("aria-label", label);
            else status.removeAttribute("aria-label");
        }
        if (status.textContent !== count) status.textContent = count;
    };

    const jumpTo = (index) => {
        if (!matches.length) return;
        activeIndex = (index + matches.length) % matches.length;
        const { from, to } = matches[activeIndex];
        view.dispatch({
            selection: { anchor: from, head: to },
            scrollIntoView: true,
            userEvent: "select.search",
        });
        updateMatchControls();
    };

    const syncVisibleMatch = () => {
        scrollFrame = undefined;
        if (!matches.length || !view.scrollDOM.clientHeight) return;
        const top = view.scrollDOM.getBoundingClientRect().top - view.documentTop;
        const firstVisibleOffset = view.lineBlockAtHeight(top).from;
        const lastVisibleOffset = view.lineBlockAtHeight(top + view.scrollDOM.clientHeight - 1).to;
        const current = matches[activeIndex];
        if (current.from >= firstVisibleOffset && current.from <= lastVisibleOffset) return;

        // Track the visible result without moving the editor selection.
        const visibleIndex = firstMatchAtOrAfter(matches, firstVisibleOffset);
        if (matches[visibleIndex]?.from <= lastVisibleOffset) {
            activeIndex = visibleIndex;
            updateMatchControls();
        }
    };

    const scheduleScrollSync = () => {
        if (matches.length && scrollFrame === undefined) {
            scrollFrame = ownerWindow.requestAnimationFrame(syncVisibleMatch);
        }
    };

    const updateQuery = () => {
        if (input.value === query.search) return;
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: input.value, literal: true })) });
        jumpTo(0);
    };
    input.addEventListener("input", (event) => {
        if (!event.isComposing) updateQuery();
    });
    input.addEventListener("compositionend", updateQuery);
    first.addEventListener("click", () => jumpTo(0));
    previous.addEventListener("click", () => jumpTo(activeIndex - 1));
    next.addEventListener("click", () => jumpTo(activeIndex + 1));
    last.addEventListener("click", () => jumpTo(matches.length - 1));

    dom.addEventListener("keydown", (event) => {
        // The key can belong to an IME candidate, including on older WebKit.
        if (event.isComposing || event.keyCode === 229) return;
        if (event.key === "Escape") {
            event.preventDefault();
            input.value = "";
            updateQuery();
            view.focus();
        } else if (event.target === input && event.key === "Enter") {
            event.preventDefault();
            (event.shiftKey ? previous : next).click();
        }
    });

    updateLabels();
    updateMatchControls();
    return {
        dom,
        top: true,
        mount() {
            view.scrollDOM.addEventListener("scroll", scheduleScrollSync, { passive: true });
        },
        update(update) {
            const nextMessages = update.state.facet(messagesFacet);
            const languageChanged = nextMessages !== messages;
            if (languageChanged) {
                messages = nextMessages;
                updateLabels();
            }
            const newQuery = getSearchQuery(update.state);
            const queryChanged = !newQuery.eq(query);
            if (queryChanged) {
                query = newQuery;
                if (input.value !== query.search) input.value = query.search;
            }
            if (queryChanged || update.docChanged) {
                const previousMatch = matches[activeIndex];
                matches = collectMatches(update.state, query);
                activeIndex = 0;
                if (!queryChanged && previousMatch && matches.length) {
                    const offset = update.changes.mapPos(previousMatch.from, 1);
                    activeIndex = Math.min(firstMatchAtOrAfter(matches, offset), matches.length - 1);
                }
            }
            if (update.selectionSet && matches.length) {
                const selection = update.state.selection.main;
                const selectedIndex = firstMatchAtOrAfter(matches, selection.from);
                const selected = matches[selectedIndex];
                if (selected?.from === selection.from && selected.to === selection.to) {
                    activeIndex = selectedIndex;
                }
            }
            if (languageChanged || queryChanged || update.docChanged || update.selectionSet) updateMatchControls();
        },
        destroy() {
            view.scrollDOM.removeEventListener("scroll", scheduleScrollSync);
            if (scrollFrame !== undefined) ownerWindow.cancelAnimationFrame(scrollFrame);
        },
    };
}

export function createJsonSearch(messagesFacet) {
    return search({ top: true, literal: true, createPanel: (view) => createSearchPanel(view, messagesFacet) });
}
