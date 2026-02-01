# The Mask in the Dark - 发布指南

恭喜！您的游戏已准备好发布。
以下是打包和发布的简易指南。

## 1. 游戏文件清单
发布版本包含以下文件/文件夹：
- `index.html` (启动入口)
- `style.css` (样式表)
- `src/` (游戏代码)
- `images/` (图片资源)
- `videos/` (视频资源)
- `audios/` (音频资源)

## 2. 如何发布到 itch.io (推荐用于 Game Jam)
1.  注册/登录 [itch.io](https://itch.io)。
2.  点击右上角箭头 -> "Upload new project"。
3.  填写 Title (游戏名) 和 URL。
4.  **Key Configuration**:
    - **Kind of project**: 选择 `HTML`。
    - **Release status**: `Released` 或 `In development`。
5.  **Uploads**:
    - 上传我为您生成的 `TheMaskInTheDark_Build.zip` 文件。
    - 勾选 **This file will be played in the browser**。
6.  **Embed Options**:
    - 建议尺寸: `1280` x `720` (或者根据你的设计自适应，点击 `Auto-detect` 可能有效，但手动设置更稳)。
    -勾选 `Mobile friendly` (如果适配了移动端)。
7.  点击页面底部的 "Save & View page" 预览效果。
8.  如果一切正常，点击 "Draft" 按钮将其改为 "Public" 发布。

## 3. 如何发布到 GitHub Pages
1.  将 `TheMaskInTheDark_Build.zip` 解压到一个新的 GitHub 仓库中。
2.  确保 `index.html` 在仓库根目录。
3.  进入仓库 Settings -> Pages。
4.  Source 选择 `Deploy from a branch`。
5.  Branch 选择 `main` / `master`，Folder 选择 `/ (root)`。
6.  保存后，GitHub 会生成一个链接 (如 `https://username.github.io/repo-name/`)。

## 4. 本地运行
直接在浏览器中打开 `index.html` 可能会因为浏览器安全策略导致音频或模块加载失败。
建议使用 VS Code 的 "Live Server" 插件，或者使用 Python 快速启动本地服务器：
```bash
python -m http.server
```
然后在浏览器访问 `http://localhost:8000`。
