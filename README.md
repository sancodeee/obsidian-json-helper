# JSON Helper

Edit, validate, format, and search JSON files directly in an Obsidian vault.

## Usage

Open a `.json` file from the Files sidebar. The editor saves changes automatically, including incomplete drafts. It highlights syntax errors and reports the line and column of the first error.

- **Format (格式化)** indents valid JSON with two spaces and preserves key order, duplicate keys, number literals, and string escapes. Undo with `Command+Z` or `Ctrl+Z`.
- The search box stays visible to the left of **Format (格式化)**. The editor highlights literal matches, and the counter shows the current match and total, such as `1/3`. Scroll to another match or use the buttons to jump to the first, previous, next, or last match. Use `Command+F` or `Ctrl+F` to focus search, `Enter` and `Shift+Enter` to move through matches, and `Esc` to clear the query and return to the editor.
- The interface defaults to Obsidian's language, with English as the fallback. Use **EN** or **中** at the far right of the toolbar to switch between English and Simplified Chinese. JSON Helper remembers your choice for the vault.

## Installation

Install [JSON Helper](https://community.obsidian.md/plugins/json-helper) from Obsidian's Community plugins. To install manually, download `main.js`, `manifest.json`, and `styles.css` from the [latest GitHub release](https://github.com/sancodeee/obsidian-json-helper/releases/latest) and place them in `<vault>/.obsidian/plugins/json-helper/`. Restart Obsidian and enable the plugin under **Settings → Community plugins**.

JSON Helper is free and runs locally. It uses no accounts, network requests, or telemetry. If another plugin already handles `.json` files, disable that handler before enabling JSON Helper.

## 中文说明

在 Obsidian 文件列表中点击 `.json` 文件，即可编辑、校验、格式化和查找 JSON 内容。

- 修改会自动保存到原文件。语法无效时仍可保留草稿。
- 暂停输入后，编辑器用红色标出错误位置，顶部提示首个错误所在的行和列。
- 点击「格式化」应用两空格缩进。格式化只调整空白，保留字段顺序、重复键、字符串转义和数字写法。可以用 `⌘Z` 或 `Ctrl+Z` 撤销。
- 搜索框常驻工具栏左侧，与「格式化」同一行。编辑器高亮匹配文字，旁边的 `1/3` 表示当前是第 1 处、共 3 处。滚动到另一处匹配时，计数随之更新。也可以点击按钮跳到第一处、上一处、下一处或最后一处。用 `⌘F`（Windows 和 Linux 为 `Ctrl+F`）聚焦搜索框，用 `Enter` 和 `Shift+Enter` 切换匹配，按 `Esc` 清空搜索并返回编辑器。
- 界面默认跟随 Obsidian 的语言。点击工具栏最右侧的 **EN** 或 **中**，可切换简体中文和英文。语言偏好会保存在当前库。

可从 Obsidian「设置 → 第三方插件」安装 [JSON Helper](https://community.obsidian.md/plugins/json-helper)。手动安装时，从 [GitHub Release](https://github.com/sancodeee/obsidian-json-helper/releases/latest) 下载 `main.js`、`manifest.json` 和 `styles.css`，放到 `<库>/.obsidian/plugins/json-helper/` 中。重启 Obsidian 后，在「第三方插件」中启用 **JSON Helper**。如果库使用了自定义配置目录，请使用该目录下的 `plugins/`。

## Development

Run `npm ci`, `npm test`, and `npm run build`. The build produces `main.js`.

Pushing a version tag runs the [release workflow](.github/workflows/release.yml). It builds and attests `main.js`, `manifest.json`, and `styles.css`, then publishes those three files as the release assets. The same workflow can also be started manually from a version tag.

JSON Helper uses Obsidian's built-in CodeMirror packages and bundles Microsoft's MIT-licensed [jsonc-parser](https://github.com/microsoft/node-jsonc-parser). The dependency's license is in [THIRD-PARTY-LICENSES.txt](THIRD-PARTY-LICENSES.txt) and is embedded in the JavaScript bundle.

## License

JSON Helper is licensed under the [MIT License](LICENSE).
