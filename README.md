# Clipboard-Saver

A tiny, fully offline Windows tool for storing your frequently used text snippets, images, videos and files and copying them to the clipboard with a single click — from a customizable grid or from floating always-on-top buttons that work over any application.

![Clipboard-Saver](docs/screenshot.svg)

## Features

- **Snippet grid** – free placement on a per-view grid (1×1 up to 20×20, default 5×4), drag tiles anywhere, swap by dropping; layouts are remembered per grid size
- **One-click copy** – click a tile and the snippet text is in your clipboard ("Copied!" bubble confirms)
- **Searchable library** – the header list searches every saved snippet; copy with one click, edit with the pencil icon, drag onto the grid, filter by color or type, and optionally close right after copying
- **Screenshot tool** – a camera button captures a screen region or a whole window (even protected ones like the Task Manager) and turns it into a copy button; the capture overlay opens instantly
- **Text variables** – write `{#{Name}#}` placeholders and fill them in when you copy
- **Copy history** – a journal of recently copied and most-used snippets with optional timestamps and an adjustable retention time (can be turned off for privacy)
- **Drag & drop** – drop a file, image or text onto the window to create a button right away
- **Expert menu** – tabs for Features / Appearance / Privacy / Media: size scaling for UI, popups, icons and buttons, hide the logo or title, the "Copied!" text size and font, floating-button opacity, history settings and a guarded reset
- **Multiple views** – up to 20 named pages, each with its own grid size and layout (quick size control in the header)
- **Floating buttons** – pin any snippet as a frameless, transparent, always-on-top pill; click to copy from anywhere, drag to reposition, right-click for size / edit / remove; positions survive restarts
- **Images, GIFs & videos** – save a picture or video from the clipboard or a file and paste it anywhere with one click; attach any file so a click copies the file itself; or give any snippet a media icon and an optional caption
- **Built-in video player** – looping previews on tiles **and** floating buttons with play/pause, scrubber, time, loop toggle and a volume slider; volume, mute and the loop / play-once choice are remembered per snippet
- **Full-screen media viewer** – click any preview image or video in a dialog to open it full-screen: scroll to zoom in (up to 8×), drag to pan, close with ✕ or Escape
- **Per-snippet colors** – tint tiles and floating pills from a palette or a custom color picker (frames media)
- **Auto-fit text** – tile text grows to fill the button (or pick a fixed size and one of 20 fonts, per snippet if you like)
- **16 themes** – light / dark / system (live OS detection) plus 13 color themes (Sunset, Ocean, Forest, Lavender, Candy, Coffee, Midnight, Black & White, Gradient, Programmer, AI, Cyberpunk, Retro)
- **20 languages** – auto-detected from the system (EN fallback): EN, DE, ES, FR, IT, PT, PL, RU, ZH, JA, NL, TR, KO, HI, ID, VI, CS, UK, SV, RO
- **Import / export** – CSV or TXT including views, layouts, colors, styles and language; re-import restores everything
- **Runs in the background** – optional minimize-to-tray on close, autostart at login (optionally minimized)
- **Auto updates** – daily check for new releases with one-click install (also manually via Settings → Updates)
- **Distraction-free mode** – hide the top and bottom bars with subtle arrows; the grid takes over the freed space
- **100% local** – data stored locally in `%APPDATA%`, no network, no telemetry
- **Compact** – ~8 MB installer (Tauri / Rust), uses the Windows WebView2 runtime

## Download

From the [latest release](../../releases/latest):

| File | What it is |
|---|---|
| `Clipboard-Saver_x64-setup.exe` | **Installer** – choose all users (admin) or current user only, desktop / start menu shortcuts and "run after install" included (all optional) |
| `clipboard-saver.exe` | **Portable** – single standalone exe, no installation |

Full version history: [CHANGELOG.md](CHANGELOG.md)

Both need the Microsoft WebView2 runtime (preinstalled on Windows 11 and current Windows 10; the app offers the official installer automatically if it is missing).

## Usage

| Action | How |
|---|---|
| Save a snippet | Type it in the input line → **Save** → name + color (Ctrl+Enter works too) |
| Copy a snippet | Click its tile ("Copied!" bubble) |
| Move a tile | Drag it to any grid cell; drop on an occupied cell to swap |
| Edit / hide / pin / delete | Right-click a tile (or hover **⋮**); deleting asks twice |
| Whole library | List icon in the header: search, edit and place every snippet |
| Screenshot | Camera icon in the header: drag a region or click a window to save it as a copy button |
| Floating button | "Toggle floating button" in the tile menu; right-click the pill for options |
| Views | Buttons next to the title; manage them in the settings |
| Settings | Gear icon: theme, language, fonts, views & grid sizes, background behaviour, autostart, import/export, reset |

## Building from source

Requirements: [Node.js](https://nodejs.org), [Rust](https://rustup.rs) (MSVC toolchain).

```bat
build.bat
```

or manually:

```sh
npm install
npm run build              # portable exe + NSIS installer
# -> src-tauri/target/release/clipboard-saver.exe
# -> src-tauri/target/release/bundle/nsis/Clipboard-Saver_<version>_x64-setup.exe
```

## Tech stack

- [Tauri 2](https://tauri.app) (Rust backend, WebView2 frontend)
- Vanilla HTML/CSS/JS — no bundler, no framework
- `arboard` (clipboard), `rfd` (native dialogs), `winreg` (autostart), `sys-locale` (language detection)
