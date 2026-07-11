## Prompt Saver 2.4.0

A polish release: a **full-screen viewer** for your images and videos, cleaner **tooltips**, faster and better-named **screenshots**, and a tidier **expert menu**.

### Downloads

| File | Use it when |
|---|---|
| `Prompt.Saver_2.4.0_x64-setup.exe` | Installer — choose **all users** (admin) or **current user only**; upgrades replace the previous version automatically, your data is kept |
| `prompt-saver.exe` | Portable standalone version — one file, no installation |

Requires the Microsoft WebView2 runtime (preinstalled on Windows 11 and current Windows 10). If it is missing, the app offers the official Microsoft installer on first start.

### Added
- **Full-screen media viewer**: click any preview image or video in an edit or library dialog to open it full-screen — scroll to zoom in (up to 8×), drag to pan, close with the **✕** or the Escape key.
- **Favorite star in the title bar**: the edit and add dialogs now show a gold **★** in their title bar; one click marks a prompt as a favorite.
- **Forget recent searches**: each entry in the recent-searches dropdown has its own **✕** to remove it.
- **Tooltip toggle**: a new expert-menu option turns the small icon tooltips off for a quieter interface.

### Improved
- **Redesigned tooltips**: every hover hint uses the same themed popup, and a tooltip left open hides itself automatically after a short while.
- **Better screenshot names**: captures are saved as `Screenshot` plus an exact date and time; a single-window capture also adds that app's name.
- **Tidier expert menu**: the settings that adjust a feature now sit directly under that feature's on/off switch and disappear when it is off — no more stray sliders for a disabled feature. The optional "extras" groups start collapsed.
- **The recent-searches dropdown no longer opens on its own** when you open the library or history — only when you click the search field again.
- **Consistent look**: the three-dot menu on every tile matches your theme regardless of the tile's color or content, scrollbars sit flush against the edge, the close **✕** is in the same spot in every popup, and the grid-size **✕** is crisp and centered. A clearer chain-link icon marks chained prompts.
- The app title can no longer be accidentally selected as text.

### Fixed
- **Saving a large screenshot as a button no longer freezes the app** — captures are stored efficiently and appear instantly.

Full history: see [CHANGELOG.md](../../blob/master/CHANGELOG.md)
