# JSON Helper

Edit, validate, format, and search JSON files directly in an Obsidian vault.

## Usage

Open a `.json` file from the Files sidebar. The editor saves changes automatically, including incomplete drafts. It highlights syntax errors and reports the line and column of the first error.

- **Format (格式化)** indents valid JSON with two spaces and preserves key order, duplicate keys, number literals, and string escapes. Undo with `Command+Z` or `Ctrl+Z`.
- **Find (查找)** searches the current file for literal text. Open it with `Command+F` or `Ctrl+F`, then use `Enter` and `Shift+Enter` to move through the matches. Press `Esc` to close the search bar.

## Installation

Install **JSON Helper** from Obsidian's Community plugins when the listing is available. To install manually, download `main.js`, `manifest.json`, and `styles.css` from a GitHub release and place them in `<vault>/.obsidian/plugins/json-helper/`. Restart Obsidian and enable the plugin under **Settings → Community plugins**.

JSON Helper is free and runs locally. It uses no accounts, network requests, or telemetry. If another plugin already handles `.json` files, disable that handler before enabling JSON Helper.

## 中文说明

在 Obsidian 文件列表中点击 `.json` 文件，即可编辑、校验、格式化和查找 JSON 内容。

- 修改会自动保存到原文件。语法无效时仍可保留草稿。
- 暂停输入后，编辑器用红色标出错误位置，顶部提示首个错误所在的行和列。
- 点击「格式化」应用两空格缩进。格式化只调整空白，保留字段顺序、重复键、字符串转义和数字写法。可以用 `⌘Z` 或 `Ctrl+Z` 撤销。
- 点击「查找」，或在编辑器中按 `⌘F`（Windows 和 Linux 为 `Ctrl+F`），可搜索当前文件中的字面文本。匹配会高亮，按 `Enter` 跳到下一处，按 `Shift+Enter` 返回上一处，按 `Esc` 关闭。

社区条目上线后，可从 Obsidian「设置 → 第三方插件」安装。手动安装时，从 GitHub Release 下载 `main.js`、`manifest.json` 和 `styles.css`，放到 `<库>/.obsidian/plugins/json-helper/` 中。重启 Obsidian 后，在「第三方插件」中启用 **JSON Helper**。如果库使用了自定义配置目录，请使用该目录下的 `plugins/`。

## Development

Run `npm ci`, `npm test`, and `npm run build`. The build produces `main.js`.

JSON Helper uses Obsidian's built-in CodeMirror packages and bundles Microsoft's MIT-licensed [jsonc-parser](https://github.com/microsoft/node-jsonc-parser). The dependency's license is in [THIRD-PARTY-LICENSES.txt](THIRD-PARTY-LICENSES.txt) and is embedded in the JavaScript bundle.

## License

JSON Helper is licensed under the [MIT License](LICENSE).
