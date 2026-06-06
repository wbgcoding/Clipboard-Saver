## Clipboard-Saver 1.6.3

Feature sync release — everything from 1.4.0 to 1.6.3 in one update.

### Downloads

| File | Use it when |
|---|---|
| `Clipboard-Saver_1.6.3_x64-setup.exe` | Installer — choose **all users** (admin) or **current user only**, with desktop / start menu shortcuts and "run after install" (all pre-selected, all optional) |
| `clipboard-saver.exe` | Portable standalone version — one file, no installation |

Requires the Microsoft WebView2 runtime (preinstalled on Windows 11 and current Windows 10). If it is missing, the app offers the official Microsoft installer on first start.

### Added
- **Image tiles**: save a picture from the clipboard or a file — clicking the tile copies the image, ready to paste anywhere
- **Icon images**: any text snippet can show a picture on its tile instead of the name (the click still copies the text)
- **Automatic updates**: daily check for a new release with silent one-click install, toggle in Settings → Updates (on by default)
- Current version shown in the settings

### Fixed
- Tile text can no longer overflow its button when resizing right after startup
- The window appears only after the first fully sized layout — no visible text resizing on startup
- No more white flash at the window edges while resizing
- The auto-update label in the settings no longer wraps in languages with longer wording

### Improved
- Upgrading over an existing installation removes the previous version automatically — your snippets and settings are kept
- High-quality image scaling (up to 1024 px, Lanczos) keeps pictures sharp

Full history: see [CHANGELOG.md](../../blob/master/CHANGELOG.md)
