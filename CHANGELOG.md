# Changelog

All notable changes to **Prompt Saver**. Download the latest version from the
[releases page](../../releases/latest).

## 2.4.1 (2026-07-11)

### Improved
- The **update notification** is now a clearer, more prominent card — an icon,
  the new version, and a one-click **Install now** button — while still matching
  your chosen theme.

### Fixed
- The scrollbar in the update changelog now looks exactly like every other
  scrollbar in the app.

## 2.4.0 (2026-07-11)

A polish release: a full-screen viewer for your images and videos, cleaner
tooltips, faster and better-named screenshots, and a tidier expert menu.

### Added
- **Full-screen media viewer**: click any preview image or video in an edit or
  library dialog to open it full-screen. Scroll to zoom in (up to 8×), drag to
  pan around, and close it with the **✕** in the corner or the Escape key.
- **Favorite star in the title bar**: the edit and add dialogs now show a gold
  **★** in their title bar — one click marks a prompt as a favorite, replacing
  the old checkbox row.
- **Forget recent searches**: each entry in the recent-searches dropdown now has
  its own **✕** to remove it from the list.
- **Tooltip toggle**: a new expert-menu option turns the small icon tooltips off
  if you prefer a quieter interface.

### Improved
- **Redesigned tooltips**: every hover hint now uses the same themed popup, and a
  tooltip that is left open hides itself automatically after a short while.
- **Better screenshot names**: captures are now saved as `Screenshot` plus an
  exact date and time; capturing a single window also adds that app's name.
- **Tidier expert menu**: the settings that adjust a feature now sit directly
  under that feature's on/off switch and disappear when it is turned off, so
  there are no more stray sliders for a disabled feature. The optional "extras"
  groups start collapsed.
- **The recent-searches dropdown no longer pops up on its own** when you open the
  library or history — it appears only when you click the search field again.
- **Consistent look**: the three-dot menu on every tile now matches your theme
  regardless of the tile's color or content, scrollbars sit flush against the
  edge, the close **✕** is in the same spot in every popup, and the grid-size
  **✕** is crisp and centered. A clearer chain-link icon marks chained prompts.
- The app title can no longer be accidentally selected as text.

### Fixed
- **Saving a large screenshot as a button no longer freezes the app** — captures
  are stored efficiently and appear instantly.

## 2.2.0 (2026-06-20)

A big update: a built-in screenshot tool, a searchable prompt library, prompt
variables, a copy history, a much larger expert menu, and smoother, sharper
floating buttons.

### Added
- **Screenshot tool**: a camera button captures a screen region or a whole
  window — even protected ones like the Task Manager — and turns it straight
  into a copy button. The capture overlay opens instantly.
- **Searchable prompt library**: the header list is now a search box over all
  your prompts — type to filter, copy with one click, edit with the pencil
  icon, and optionally close the library right after copying. Filter by color
  or type.
- **Prompt variables**: write `{{Name}}` placeholders in a prompt and you're
  asked to fill them in when you copy it.
- **Copy history**: a journal of recently copied and most-used prompts with
  optional timestamps and an adjustable retention time — and it can be turned
  off completely for privacy.
- **Drag & drop**: drop a file, image or text onto the window to create a
  button right away.
- **Expert menu, reorganised and expanded**: tidy tabs (Features / Appearance /
  Privacy / Media) with size scaling for the UI, popups, icons and buttons,
  options to hide the logo or the title, the **"Copied!" text size and font**,
  **floating-button opacity**, history settings, and a guarded reset.
- **Auto-fit "Copied!" text**: the confirmation text scales to the button or
  floating pill (or pick a fixed size and font).

### Improved
- The screenshot overlay now opens **instantly** instead of taking a few
  seconds.
- Floating text buttons resize **smoothly** and always keep their text fully
  visible — they never collapse into a circle and never clip; text and button
  scale up together to the screen size.
- You can drag a floating button only on the visible pill, not on the
  invisible area around its rounded corners.
- All 20 languages are fully translated, including every new menu and option.

### Fixed
- Right-clicking a floating button no longer changes its size.
- Screenshot capture works for windows that previously came out blank.
- The update check no longer mis-orders version numbers.
- Various small layout and resize glitches on the floating buttons.

## 1.8.0 (2026-06-07)

### Added
- **Video player on floating buttons**: hover the lower edge of a video pill
  for play/pause, scrubber, time, loop toggle and sound — same controls as on
  grid tiles
- **Volume slider**: hovering the sound button opens a vertical slider
  (grid tiles and floating buttons)
- **Saved player state**: volume, mute and the loop / play-once choice are
  remembered per prompt and restored on the next start
- **Close button** (X) in the floating button's right-click menu
- The WebView2 setup dialog on first start now speaks all 20 languages

### Improved
- Images and videos fill the floating button **exactly** — every pixel
  visible, no cropping; S/M/L scales the whole button
- Dragging a video button or a video tile no longer stutters
- Tile text keeps its size when the window moves between monitors with
  different display scaling
- The floating button's right-click menu is more compact
- Screen reader labels follow the chosen language

### Fixed
- The image on a floating button could appear wrong or not at all
- A frozen video on a floating button now recovers by itself
- Saving a prompt shows an error message if it fails instead of failing
  silently

## 1.7.0 (2026-06-06)

### Added
- **Collapsible bars**: subtle arrows hide the top bar and the input bar —
  the grid grows to use the freed space, the choice survives restarts, and
  small floating arrows bring each bar back
- **Grid-size picker**: the size fields open a scrollable dropdown with all
  values; the current one is highlighted and the mouse wheel steps through

### Improved
- Settings: font and text size now have their own labelled dropdowns
- The settings scrollbar stays inside the rounded corners
- The image and hide buttons in the input bar line up with the Save button

## 1.6.3 (2026-06-06)

### Fixed
- The auto-update label in the settings no longer wraps in languages with
  longer wording

## 1.6.2 (2026-06-06)

### Improved
- Upgrading over an existing installation no longer asks about the previous
  version — it is removed automatically (your prompts and settings are kept)

## 1.6.1 (2026-06-06)

### Fixed
- Installing an update via the notification or the settings no longer fails —
  the silent installer now starts reliably and the app restarts itself
- The update check runs right after launch (was: 30 seconds later)
- No more white flash at the window edges while resizing
- "You're up to date" in the settings makes way for the version number
  after a few seconds

## 1.6.0 (2026-06-06)

### Added
- **Auto update toggle** in the settings (on by default), with a tooltip
  explaining the once-a-day check

### Improved
- Updates now install **fully automatically**: silent installer, no clicks,
  the app restarts itself on the new version

## 1.5.0 (2026-06-06)

### Added
- **Automatic updates**: the app checks GitHub once a day for a new release
  and shows a notification with an **Install now** button; you can also check
  and install manually under Settings → Updates
- Current version is shown in the settings

### Fixed
- Tile text can no longer overflow its button when resizing the window right
  after startup — sizes are re-validated and tiles clip as a hard guarantee

## 1.4.0 (2026-06-06)

### Added
- **Image prompts**: the image button next to the input saves a picture from
  the clipboard (or via file dialog) — clicking the tile copies the image,
  ready to paste anywhere
- **Icon images**: any text prompt can show a picture on its tile instead of
  the name (the click still copies the text)
- Tiles and floating buttons display images edge to edge; the chosen color
  frames grid tiles, floating image buttons are borderless square boxes with
  much larger S / M / L sizes
- High-quality scaling (up to 1024 px, Lanczos) keeps images sharp

### Fixed
- The window now appears only after the first fully sized layout — no more
  visible text resizing on startup
- The "Copied!" overlay on floating image buttons matches the visible image

## 1.3.3 — HotFix (2026-06-04)

### Added
- **Prompt library**: new list button in the header shows every saved prompt
  with its full text — click an entry to edit, drag it onto the grid or use
  its add button to place it on the current layout
- **Quick grid size**: columns × rows of the active view directly in the
  header, next to the library button
- **More colors**: full-spectrum palette (12 colors) plus a free color picker
- Delete option inside the edit dialog
- Hovering a prompt button shows the stored text (what gets copied)
  in the tooltip

### Fixed
- Wrong text size right after starting on monitors with display scaling
- Tile text no longer shifts while dragging a prompt — the drag ghost now
  follows the cursor exactly and the picked-up tile keeps its size
- Letters with descenders (g, j, p, y) are no longer cut off at the bottom
  edge of prompt buttons
- Words are no longer cut mid-word: text hyphenates where possible,
  otherwise the font shrinks to fit

### Improved
- The installer now lets you choose between **installing for all users**
  (asks for administrator rights) or **only for the current user**
- Deleting a prompt always asks for a second confirmation
- The overflow tray is gone — unplaced prompts live in the prompt library

## 1.3.2 (2026-06-04)

### Added
- **Installer** (alongside the portable exe): desktop / start menu shortcuts
  and "run after install" — all pre-selected, all optional
- **Floating button menu**: right-click a floating pill for size presets
  (S / M / L), editing the prompt, or removing the pill
- Floating pills use the same font and text-size rules as the grid tiles
- The default "Home" view follows the app language in all 10 languages
- Automatic check for the WebView2 runtime with a guided one-click install

### Fixed
- App froze when toggling a floating button — fixed for good
- Floating buttons now appear reliably and spawn at the top-left of the
  primary monitor
- Floating button background is fully transparent (no halo, no box)
- Auto-fit tile text fills the whole button with clean word wrapping,
  never clipped at the sides
- Empty row in the floating button menu removed; "Copied!" feedback is
  smaller and unobtrusive

### Changed
- Default grid size is now 5×4
- "Minimize to background on close" is now off by default
- Windows-only build: all mobile (iOS/Android) leftovers removed

## 1.1.0 (2026-06-04)

- First Tauri release: ~3 MB portable exe
- Prompt grid with free placement, multiple views, per-prompt colors,
  10 languages, import/export, floating quick-copy buttons, tray mode,
  autostart
