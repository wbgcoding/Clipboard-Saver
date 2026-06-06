# Graph Report - .  (2026-06-06)

## Corpus Check
- 27 files · ~30,277 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 366 nodes · 929 edges · 24 communities (22 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend Core & Settings|Backend Core & Settings]]
- [[_COMMUNITY_Tauri Commands & State|Tauri Commands & State]]
- [[_COMMUNITY_UI Core & Layout|UI Core & Layout]]
- [[_COMMUNITY_Floating Window & i18n|Floating Window & i18n]]
- [[_COMMUNITY_Tauri Configuration|Tauri Configuration]]
- [[_COMMUNITY_Update & Geometry Utils|Update & Geometry Utils]]
- [[_COMMUNITY_UI Media & Modals|UI Media & Modals]]
- [[_COMMUNITY_UI Initialization|UI Initialization]]
- [[_COMMUNITY_NPM Package Info|NPM Package Info]]
- [[_COMMUNITY_Grid & Library Rendering|Grid & Library Rendering]]
- [[_COMMUNITY_Learn-Watch Tracking|Learn-Watch Tracking]]
- [[_COMMUNITY_Application Icons|Application Icons]]
- [[_COMMUNITY_Default Capabilities|Default Capabilities]]
- [[_COMMUNITY_UI Screenshot Mockups|UI Screenshot Mockups]]
- [[_COMMUNITY_UI Modal Utils|UI Modal Utils]]
- [[_COMMUNITY_Color Picker Logic|Color Picker Logic]]
- [[_COMMUNITY_Export & Notifications|Export & Notifications]]
- [[_COMMUNITY_Gemini Settings Hooks|Gemini Settings Hooks]]
- [[_COMMUNITY_Storage & Documentation|Storage & Documentation]]

## God Nodes (most connected - your core abstractions)
1. `$()` - 109 edges
2. `String` - 60 edges
3. `AppHandle` - 42 edges
4. `lock()` - 40 edges
5. `Settings` - 31 edges
6. `State` - 31 edges
7. `Db` - 31 edges
8. `save_settings()` - 28 edges
9. `import_prompts()` - 19 edges
10. `add_prompt()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `$()` --implements--> `Grid Layout System`  [INFERRED]
  ui/main.js → README.md
- `Icon (128x128)` --semantically_similar_to--> `Icon SVG`  [EXTRACTED] [semantically similar]
  src-tauri/icons/128x128.png → ui/assets/icon.svg
- `Icon (128x128@2x)` --semantically_similar_to--> `Icon SVG`  [EXTRACTED] [semantically similar]
  src-tauri/icons/128x128@2x.png → ui/assets/icon.svg
- `Icon (32x32)` --semantically_similar_to--> `Icon SVG`  [EXTRACTED] [semantically similar]
  src-tauri/icons/32x32.png → ui/assets/icon.svg
- `Icon (64x64)` --semantically_similar_to--> `Icon SVG`  [EXTRACTED] [semantically similar]
  src-tauri/icons/64x64.png → ui/assets/icon.svg

## Import Cycles
- 1-file cycle: `src-tauri/src/lib.rs -> src-tauri/src/lib.rs`

## Hyperedges (group relationships)
- **Prompt Saver Architecture** — src_tauri_src_lib, src_tauri_src_main, ui_main, ui_floating, src_tauri_tauri_conf [EXTRACTED 1.00]

## Communities (24 total, 2 thin omitted)

### Community 0 - "Backend Core & Settings"
Cohesion: 0.06
Nodes (69): Default, HashMap, PathBuf, Auto Updates System, Image and Media Support, Prompt Entity, Application Settings, View Entity (+61 more)

### Community 1 - "Tauri Commands & State"
Cohesion: 0.15
Nodes (57): AppHandle, Db, F, FileDialog, MutexGuard, Result, add_view(), apply_autostart() (+49 more)

### Community 2 - "UI Core & Layout"
Cohesion: 0.05
Nodes (35): Auto-Fit Text Scaling, Grid Layout System, $(), clampGrid(), colorPop, COLORS, cp, cpHex (+27 more)

### Community 3 - "Floating Window & i18n"
Cohesion: 0.10
Nodes (27): Multi-language Support, applyFont(), applyPillSize(), applyPrompt(), applySettings(), appWin, closeMenu(), enforcePillSize() (+19 more)

### Community 4 - "Tauri Configuration"
Cohesion: 0.07
Nodes (26): app, security, windows, withGlobalTauri, enable, scope, build, frontendDist (+18 more)

### Community 5 - "Update & Geometry Utils"
Cohesion: 0.16
Nodes (17): DynamicImage, Monitor, Option, centered_on_primary(), check_update(), fetch_latest(), get_clipboard_file_path(), get_clipboard_image() (+9 more)

### Community 6 - "UI Media & Modals"
Cohesion: 0.18
Nodes (15): armButton(), buildMediaBar(), buildTile(), deleteAll(), disarmButton(), editPrompt(), getVideoWrap(), openCtx() (+7 more)

### Community 7 - "UI Initialization"
Cohesion: 0.21
Nodes (15): applyBars(), applyI18n(), applyTheme(), applyTileStyle(), attachGridPicker(), attachSelectPicker(), bind(), fillFontSelects() (+7 more)

### Community 8 - "NPM Package Info"
Cohesion: 0.14
Nodes (13): author, description, devDependencies, @tauri-apps/cli, name, scripts, build, dev (+5 more)

### Community 9 - "Grid & Library Rendering"
Cohesion: 0.27
Nodes (12): activeView(), cellKey(), firstFree(), gridKeyOf(), layoutOf(), moveTileDom(), normalizeLayout(), placeTile() (+4 more)

### Community 10 - "Learn-Watch Tracking"
Cohesion: 0.18
Nodes (10): deep_interview_lock_active, deep_interview_lock_source, last_actionable_message_count, last_event_key, last_prompted_at, last_prompted_session_id, last_reason, last_session_id (+2 more)

### Community 11 - "Application Icons"
Cohesion: 0.29
Nodes (7): Icon SVG, Logo SVG, Icon (128x128), Icon (128x128@2x), Icon (32x32), Icon (64x64), App Icon

### Community 12 - "Default Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 13 - "UI Screenshot Mockups"
Cohesion: 0.40
Nodes (5): Prompt Creation Composer, Floating Quick-Copy Pill, Main Application Window, Prompt Management Grid, Prompt Saver UI Design

### Community 14 - "UI Modal Utils"
Cohesion: 0.40
Nodes (5): autoGrow(), closeColorPop(), closeModal(), confirmModal(), pollMissingFiles()

### Community 15 - "Color Picker Logic"
Cohesion: 0.40
Nodes (5): cpDrag(), cpRender(), hexToHsv(), hsvToHex(), openColorPop()

### Community 16 - "Export & Notifications"
Cohesion: 0.50
Nodes (4): runExport(), startFileCreate(), toast(), withDialog()

## Knowledge Gaps
- **96 isolated node(s):** `BeforeTool`, `last_session_id`, `last_event_key`, `last_prompted_session_id`, `last_prompted_at` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$()` connect `UI Core & Layout` to `Backend Core & Settings`, `Floating Window & i18n`, `UI Media & Modals`, `UI Initialization`, `Grid & Library Rendering`, `UI Modal Utils`, `Color Picker Logic`, `Export & Notifications`?**
  _High betweenness centrality (0.352) - this node is a cross-community bridge._
- **Why does `Settings` connect `Backend Core & Settings` to `Tauri Commands & State`, `Update & Geometry Utils`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `String` connect `Tauri Commands & State` to `Backend Core & Settings`, `Update & Geometry Utils`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `BeforeTool`, `last_session_id`, `last_event_key` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Core & Settings` be split into smaller, more focused modules?**
  _Cohesion score 0.05760905760905761 - nodes in this community are weakly interconnected._
- **Should `UI Core & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.05179704016913319 - nodes in this community are weakly interconnected._
- **Should `Floating Window & i18n` be split into smaller, more focused modules?**
  _Cohesion score 0.1032258064516129 - nodes in this community are weakly interconnected._