// Main-window controller. Uses Tauri's global API (withGlobalTauri).
import { I18N, LANGS } from "./i18n.js";
import { FONTS, FONT_LABELS, fitText } from "./fonts.js";
import { IMAGE_EXT, mediaKind, buildMediaBar, applyVideoPrefs, setMediaDefaults } from "./media.js";

const { invoke, convertFileSrc } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const $ = (id) => document.getElementById(id);
const gridEl = $("grid");
const inputEl = $("input");
const saveBtn = $("save");
const toastEl = $("toast");
const ctxEl = $("ctx");
const settingsEl = $("settings");
const libraryEl = $("library");
const viewsEl = $("views");
const modal = {
  root: $("modal"),
  title: $("modal-title"),
  name: $("modal-name"),
  text: $("modal-text"),
  cancel: $("modal-cancel"),
  confirm: $("modal-confirm"),
  delete: $("modal-delete"),
  fav: $("modal-fav"),
  imgWrap: $("modal-img-wrap"),
  img: $("modal-img"),
  video: $("modal-video"),
  caption: $("modal-caption"),
  captionSize: $("modal-caption-size"),
  captionPreview: $("modal-caption-preview"),
  showImage: $("modal-show-image"),
  showText: $("modal-show-text"),
  replaceImg: $("modal-replace-img"),
  removeImg: $("modal-remove-img"),
  addIcon: $("modal-add-icon"),
  fileWrap: $("modal-file-wrap"),
  fileName: $("modal-file-name"),
  replaceFile: $("modal-replace-file"),
  fontSel: $("modal-font"),
  sizeSel: $("modal-size"),
  textBar: $("modal-text-bar"),
  varsHint: $("modal-vars-hint"),
};

const DRAG_THRESHOLD = 5;
const INPUT_MAX = 160; // keep in sync with .input max-height
// Grid-dimension and view-count limits are expert values: val("gridMax") /
// val("maxViews"). The backend keeps a hard ceiling of 100 for both.
let PREVIEW_MAX = 600; // tooltip preview length (expert-tunable)
let BUBBLE_MS = 950; // "Copied!" bubble lifetime (expert-tunable)
let TOAST_MS = 1400; // toast lifetime for plain messages (expert-tunable)
const SIZE_MIN = 10; // text size range, steps of 2 (keep in sync with backend)
const SIZE_MAX = 40;
const SIZE_STEP = 2;
const FILE_POLL_MS = 5000; // missing-file watcher interval
const DISARM_MS = 3000; // confirm-button auto-disarm delay

const clampGrid = (n, fallback) =>
  Math.min(val("gridMax"), Math.max(1, Math.round(Number(n) || fallback)));

// Cached state (refreshed by renderGrid).
let prompts = [];
let settings = { theme: "system", views: [], active_view: "" };

let modalState = null;
let modalInitial = ""; // snapshot of the open modal's content (unsaved-change guard)
let ctxId = null;
let drag = null;
let libQuery = ""; // prompt library search text
let libType = "all"; // prompt library type filter
let libColor = "all"; // prompt library color filter
let libFav = false; // prompt library "favorites only" filter
let journalQuery = ""; // copy-history search text
let journalType = "all"; // copy-history type filter
let journalColor = "all"; // copy-history color filter
let toastTimer = null;
let deleteAllTimer = null;
let expertResetTimer = null;
let versionLabel = ""; // "v1.6.0", shown in the update status

// Surface unexpected errors as a toast instead of failing silently.
window.addEventListener("error", (e) => toast(String(e.message)));
window.addEventListener("unhandledrejection", (e) => toast(String(e.reason)));

// Right-click is disabled everywhere inside the app (tiles re-enable it).
window.addEventListener("contextmenu", (e) => e.preventDefault());

const DOTS =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M6 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>';
const CROSS =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4Z"/></svg>';
const GRID_PLUS =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm12 0h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3Z"/></svg>';
const PLUS_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>';
// Corner badges marking what a tile copies (attached file / image).
const ICON_FILE =
  '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21.2 11.2l-8.4 8.4a5.5 5.5 0 0 1-7.8-7.8l8.4-8.4a3.7 3.7 0 0 1 5.2 5.2l-8.4 8.4a1.9 1.9 0 0 1-2.6-2.6l7.7-7.7"/></svg>';
const ICON_IMAGE =
  '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 16H3V5h18v14Zm-5.5-9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM8.5 14l2-2.5 2 2.5 2.5-3 3.5 5H5l3.5-4.5Z"/></svg>';
const ICON_VIDEO =
  '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M15 8.5V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2.5l5 4v-15l-5 4ZM6.5 9.8 12 13l-5.5 3.2V9.8Z"/></svg>';
// Plain grey document marker for PDF attachments (replaces the paperclip).
const ICON_PDF =
  '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 2 4 4h-4V4ZM8 12h8v1.6H8V12Zm0 3.2h8v1.6H8v-1.6Z"/></svg>';
const ICON_EDIT =
  '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.2V20Zm9.5-12.5 3 3"/></svg>';

let LANG = "en";
function resolveLang(pref) {
  const p = (pref && pref !== "auto" ? pref : (navigator.language || "en")).toLowerCase();
  return LANGS.find((code) => p.startsWith(code)) || "en";
}
const t = (key) => I18N[LANG][key] ?? I18N.en[key] ?? key;

function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}

// ---- Helpers ----
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// Tile color palette ("" = default surface), full spectrum, one modal row.
// Empty = no color; the rest are hue-sorted and fill two rows of ten with the
// "none" and custom swatches. The user can recolor the palette (expert menu);
// COLORS holds the live set, DEFAULT_COLORS the shipped fallback.
const DEFAULT_COLORS = [
  "",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#64748b",
];
let COLORS = [...DEFAULT_COLORS];
const PALETTE_LEN = DEFAULT_COLORS.length - 1; // editable hues (index 0 is "none")
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Load the custom palette from settings (ui_texts.palette = JSON hex array), or
// fall back to defaults. Invalid/partial data is ignored so colors never break.
function loadPalette() {
  let custom = null;
  try {
    const raw = settings.ui_texts?.palette;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === PALETTE_LEN && arr.every((c) => HEX_RE.test(c))) {
        custom = arr;
      }
    }
  } catch (_) { /* malformed -> defaults */ }
  COLORS = custom ? ["", ...custom] : [...DEFAULT_COLORS];
}

// Rebuild the filter dots (cached) after a palette change, and refresh any open list.
function refreshColorUI() {
  for (const [wrap, cur] of [[$("library-colors"), libColor], [$("journal-colors"), journalColor]]) {
    if (wrap) { wrap.innerHTML = ""; buildColorFilter(wrap, cur); }
  }
  if (!libraryEl.classList.contains("hidden")) renderLibrary();
  if (!$("journal").classList.contains("hidden")) renderJournal();
}

function applyTileStyle() {
  const root = document.documentElement.style;
  root.setProperty("--tile-font", FONTS[settings.tile_font] || FONTS.system);
  // tile_size 0 = auto-fit (per-tile, handled after every grid render).
  root.setProperty("--tile-size", `${settings.tile_size || 15}px`);
  fitCache.clear(); // font metrics changed -> cached fit sizes are stale
}

// Auto-fit cache per (text, cell size); cleared on font changes.
const fitCache = new Map();
const FIT_QUANT = 8; // measurement-box bucket size (see fitAllTiles)

// All fitting is measured inside ONE off-screen ruler pinned to 0/0: the
// result can never depend on a tile's own (sub)pixel position, cell or DPI.
let ruler = null;
function getRuler() {
  if (!ruler) {
    ruler = document.createElement("span");
    ruler.className = "tile-name fit tile-ruler";
    document.body.appendChild(ruler);
  }
  return ruler;
}

// Largest font size where the wrapped text fits the shared measurement box;
// depends only on (text, font, maxW, maxH).
function fitTileText(tile, maxW, maxH) {
  if (tile.classList.contains("has-image") || tile.dataset.fitMode === "fixed") return;
  const name = tile.querySelector(".tile-name");
  if (!name) return;
  name.classList.add("fit");
  const key = `${name.textContent}|${name.style.fontFamily}|${maxW}x${maxH}`;
  let size = fitCache.get(key);
  if (size == null) {
    const r = getRuler();
    r.style.fontFamily = name.style.fontFamily;
    r.textContent = name.textContent;
    r.style.width = `${maxW}px`;
    // scrollWidth only exceeds maxW when a single unbreakable word overflows.
    const fits = (s) => {
      r.style.fontSize = `${s}px`;
      return r.scrollHeight <= maxH && r.scrollWidth <= maxW;
    };
    let lo = 8;
    let hi = Math.max(8, Math.min(96, maxH));
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(mid)) lo = mid;
      else hi = mid - 1;
    }
    size = lo;
    if (fitCache.size > 1000) fitCache.clear();
    fitCache.set(key, size);
  }
  name.style.fontSize = `${size}px`;
}

// Measurement box cached per grid state: as long as the window and grid
// layout are unchanged, every render uses the EXACT same box — moving tiles
// around can never change a fitted text size.
const fitBox = { key: "", maxW: 0, maxH: 0 };

function fitAllTiles() {
  const globalAuto = Number(settings.tile_size) === 0;
  const tiles = [...gridEl.querySelectorAll(".tile")].filter(
    (tile) =>
      (globalAuto || tile.dataset.fitMode === "auto") &&
      tile.dataset.fitMode !== "fixed" &&
      !tile.classList.contains("has-image")
  );
  if (!tiles.length) return;
  const key =
    `${gridEl.style.gridTemplateColumns}|${gridEl.style.gridTemplateRows}` +
    // Include the gap: it changes the cell size without changing the grid's own
    // size or template, so without it a gap change would reuse a stale fit box
    // (text kept its old size, leaving wrong vertical spacing).
    `|${gridEl.clientWidth}x${gridEl.clientHeight}|${getComputedStyle(gridEl).gap}`;
  if (fitBox.key !== key) {
    // Shared box = smallest grid CELL (cells exist for every slot) minus the
    // tile chrome from computed style — fractional-exact, no per-cell rounding.
    let cellW = Infinity;
    let cellH = Infinity;
    for (const cell of gridEl.children) {
      cellW = Math.min(cellW, cell.clientWidth);
      cellH = Math.min(cellH, cell.clientHeight);
    }
    if (!Number.isFinite(cellW)) return;
    const cs = getComputedStyle(tiles[0]);
    const chromeW =
      parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) +
      parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const chromeH =
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) +
      parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    fitBox.key = key;
    // Quantize to an 8px bucket: DPI handoffs and monitor drags shift cell
    // rounding by ±1px — inside one bucket the fitted size cannot change,
    // and the slack guarantees the text never clips after such a shift.
    fitBox.maxW = Math.floor((cellW - chromeW) / FIT_QUANT) * FIT_QUANT;
    fitBox.maxH = Math.floor((cellH - chromeH - 2) / FIT_QUANT) * FIT_QUANT;
  }
  if (fitBox.maxW <= 0 || fitBox.maxH <= 0) return;
  for (const tile of tiles) fitTileText(tile, fitBox.maxW, fitBox.maxH);
}

// Re-fit on window resize (cells change size with the window).
let fitRaf = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(fitRaf);
  fitRaf = requestAnimationFrame(fitAllTiles);
});

// Re-measure cells when the window moves to a monitor with a different scale
// factor. The fit cache is kept: sizes are in DPI-independent CSS px, and the
// quantized box leaves enough slack that ±1px rounding can never clip — so a
// cross-monitor drag can never change an already fitted text size.
function watchDpr() {
  matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener(
    "change",
    () => {
      fitBox.key = ""; // cell rounding differs at the new DPI
      fitAllTiles();
      watchDpr();
    },
    { once: true }
  );
}
watchDpr();

function hideToast() {
  toastEl.classList.remove("show");
  setTimeout(() => toastEl.classList.add("hidden"), 200);
}

// Optional action: { label, onClick } adds a button and keeps the toast longer.
function toast(msg, action = null) {
  toastEl.textContent = msg;
  toastEl.classList.toggle("actionable", !!action);
  if (action) {
    const btn = document.createElement("button");
    btn.className = "toast-btn";
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      hideToast();
      action.onClick();
    });
    toastEl.appendChild(btn);
  }
  toastEl.classList.remove("hidden");
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 12000 : TOAST_MS);
}

function autoGrow(el) {
  el.style.height = "auto";
  const target = el.scrollHeight + 2;
  el.style.height = `${Math.min(target, INPUT_MAX)}px`;
  el.style.overflowY = target > INPUT_MAX ? "auto" : "hidden";
}

const cellKey = (c, r) => `${c},${r}`;

// ---- Grid-size value picker ----
// Scrollable popup under a grid-size input: lists every value with a
// visible scrollbar, highlights and centers the current selection.
const numPop = document.createElement("div");
numPop.className = "num-pop hidden";
document.body.appendChild(numPop);
let popInput = null;
let popApply = null;

function renderNumPop() {
  const v = clampGrid(popInput.value, 1);
  numPop.innerHTML = "";
  let selected = null;
  for (let i = 1; i <= val("gridMax"); i++) {
    const row = document.createElement("button");
    row.type = "button";
    row.textContent = i;
    if (i === v) {
      row.className = "sel";
      selected = row;
    }
    row.addEventListener("pointerdown", (e) => {
      e.preventDefault(); // keep the input focused
      popInput.value = i;
      closeNumPop(true);
    });
    numPop.appendChild(row);
  }
  if (selected) selected.scrollIntoView({ block: "center" });
}

// CSS `zoom` on <body> (UI scale) shifts JS-positioned fixed popups; divide anchor
// coords by it so popups stay aligned at any uiScale (no-op at 100%).
const uiZoom = () => parseFloat(getComputedStyle(document.body).zoom) || 1;

function openNumPop(input, apply) {
  popInput = input;
  popApply = apply;
  const r = input.getBoundingClientRect();
  const z = uiZoom();
  numPop.style.left = `${Math.min(r.left, window.innerWidth - 70) / z}px`;
  numPop.style.top = `${(r.bottom + 4) / z}px`;
  // Unhide first: centering the selection needs a laid-out list.
  numPop.classList.remove("hidden");
  renderNumPop();
}

function closeNumPop(apply) {
  if (!popInput) return;
  numPop.classList.add("hidden");
  const done = popApply;
  popInput = null;
  popApply = null;
  if (apply && done) done();
}

// Generic list popup for <select>-backed pickers (8 rows visible, scrollbar
// only when the list overflows).
let popOnPick = null;
let popAnchor = null; // select that opened the popup (click again = close)
let popSuppressOpen = false;

function openValuePop(anchor, items, current, onPick) {
  popInput = null;
  popApply = null;
  popOnPick = onPick;
  popAnchor = anchor;
  numPop.innerHTML = "";
  let selected = null;
  for (const item of items) {
    const row = document.createElement("button");
    row.type = "button";
    row.textContent = item.label;
    // Font entries preview themselves in their own typeface.
    if (item.font) row.style.fontFamily = item.font;
    if (String(item.value) === String(current)) {
      row.className = "sel";
      selected = row;
    }
    row.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const pick = popOnPick;
      closeValuePop();
      pick(item.value);
    });
    numPop.appendChild(row);
  }
  // Width follows the widest entry, not the anchor.
  const r = anchor.getBoundingClientRect();
  const z = uiZoom();
  numPop.style.left = `${Math.min(r.left, window.innerWidth - 120) / z}px`;
  numPop.style.top = `${(r.bottom + 4) / z}px`;
  numPop.classList.remove("hidden");
  if (selected) selected.scrollIntoView({ block: "center" });
}

function closeValuePop() {
  popOnPick = null;
  popAnchor = null;
  numPop.classList.add("hidden");
}

document.addEventListener("pointerdown", (e) => {
  if (!popOnPick || numPop.contains(e.target)) return;
  // Clicking the anchor of the open popup toggles it closed instead of
  // letting the following mousedown reopen it immediately.
  popSuppressOpen = !!popAnchor && popAnchor.contains(e.target);
  closeValuePop();
});

// Replace the native dropdown of a <select> with the scrollable popup.
function attachSelectPicker(sel) {
  sel.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (popSuppressOpen) { popSuppressOpen = false; return; }
    const items = [...sel.options].map((o) => ({
      value: o.value,
      label: o.textContent,
      font: o.style.fontFamily,
    }));
    openValuePop(sel, items, sel.value, (v) => {
      sel.value = v;
      sel.dispatchEvent(new Event("change"));
    });
  });
}

// Combo behaviour: typing stays possible, focus opens the picker,
// wheel / arrow keys step through the values, blur or Enter applies.
function attachGridPicker(input, apply) {
  input.addEventListener("focus", () => openNumPop(input, apply));
  // Re-open on click even when the input kept focus after a pick.
  // Apply a still-open sibling picker first (pointerdown fires before blur).
  input.addEventListener("pointerdown", () => {
    if (popInput === input) return;
    closeNumPop(true);
    openNumPop(input, apply);
  });
  input.addEventListener("input", () => { if (popInput === input) renderNumPop(); });
  input.addEventListener("blur", () => { if (popInput === input) closeNumPop(true); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
    else if (e.key === "Escape") closeNumPop(false);
  });
  input.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      input.value = clampGrid(Number(input.value) + (e.deltaY > 0 ? 1 : -1), 1);
      if (popInput === input) renderNumPop();
      else openNumPop(input, apply);
    },
    { passive: false }
  );
}

// ---- Custom color picker (theme-styled popup with SV field + hue bar) ----
const colorPop = document.createElement("div");
colorPop.className = "color-pop hidden";
colorPop.innerHTML =
  '<div class="cp-sv"><div class="cp-knob"></div></div>' +
  '<input class="cp-hue" type="range" min="0" max="360" step="1" data-i18n-aria="colorHue" />' +
  '<div class="cp-row"><span class="cp-preview"></span><input class="cp-hex" type="text" maxlength="7" spellcheck="false" data-i18n-aria="colorHex" /></div>';
document.body.appendChild(colorPop);
const cpSv = colorPop.querySelector(".cp-sv");
const cpKnob = colorPop.querySelector(".cp-knob");
const cpHue = colorPop.querySelector(".cp-hue");
const cpPreview = colorPop.querySelector(".cp-preview");
const cpHex = colorPop.querySelector(".cp-hex");
let cp = { h: 215, s: 0.85, v: 0.92 };
let cpOnPick = null;

function hsvToHex({ h, s, v }) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

function hexToHsv(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return { h: 215, s: 0.85, v: 0.92 };
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

function cpRender(notify = true) {
  cpSv.style.background =
    `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${cp.h}, 100%, 50%))`;
  cpKnob.style.left = `${cp.s * 100}%`;
  cpKnob.style.top = `${(1 - cp.v) * 100}%`;
  cpHue.value = cp.h;
  const hex = hsvToHex(cp);
  cpPreview.style.background = hex;
  if (document.activeElement !== cpHex) cpHex.value = hex;
  if (notify) cpOnPick?.(hex);
}

function openColorPop(anchor, current, onPick) {
  cp = hexToHsv(current);
  cpOnPick = null;
  cpRender(false); // show the current color without re-triggering the pick
  cpOnPick = onPick;
  const r = anchor.getBoundingClientRect();
  colorPop.classList.remove("hidden");
  const w = colorPop.offsetWidth;
  const z = uiZoom();
  colorPop.style.left = `${Math.min(r.left, window.innerWidth - w - 8) / z}px`;
  colorPop.style.top = `${(r.bottom + 6) / z}px`;
}

function closeColorPop() {
  cpOnPick = null;
  colorPop.classList.add("hidden");
}

// Floating preset palette anchored to a swatch button (views editor rows).
const swatchPop = document.createElement("div");
swatchPop.className = "swatch-pop swatches hidden";
document.body.appendChild(swatchPop);
function openSwatchPop(anchor, selected, onPick) {
  buildSwatches(
    swatchPop,
    selected,
    (hex) => { onPick(hex); closeSwatchPop(); },
    (a, cur) => openColorPop(anchor, cur, (hex) => onPick(hex))
  );
  swatchPop.classList.remove("hidden");
  const r = anchor.getBoundingClientRect();
  const w = swatchPop.offsetWidth;
  const z = uiZoom();
  swatchPop.style.left = `${Math.min(r.left, window.innerWidth - w - 8) / z}px`;
  swatchPop.style.top = `${(r.bottom + 6) / z}px`;
}
function closeSwatchPop() {
  swatchPop.classList.add("hidden");
}
document.addEventListener("pointerdown", (e) => {
  if (swatchPop.classList.contains("hidden")) return;
  if (!swatchPop.contains(e.target) && !e.target.closest(".view-color-dot")) closeSwatchPop();
});

function cpDrag(e) {
  const r = cpSv.getBoundingClientRect();
  cp.s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  cp.v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
  cpRender();
}
cpSv.addEventListener("pointerdown", (e) => {
  cpSv.setPointerCapture(e.pointerId);
  cpDrag(e);
});
cpSv.addEventListener("pointermove", (e) => {
  if (cpSv.hasPointerCapture(e.pointerId)) cpDrag(e);
});
cpHue.addEventListener("input", () => {
  cp.h = Number(cpHue.value);
  cpRender();
});
cpHex.addEventListener("change", () => {
  if (/^#?[0-9a-f]{6}$/i.test(cpHex.value)) {
    cp = hexToHsv(cpHex.value);
    cpRender();
  }
});
document.addEventListener("pointerdown", (e) => {
  if (colorPop.classList.contains("hidden")) return;
  if (!colorPop.contains(e.target) && !e.target.closest(".swatch.custom")) closeColorPop();
});

// Two-step confirmation: first call arms the button and returns false,
// the second call (while armed) returns true.
function armButton(btn, confirmLabel) {
  if (btn.classList.contains("confirm")) return true;
  btn.classList.add("confirm");
  btn.textContent = confirmLabel;
  return false;
}
function disarmButton(btn, label) {
  btn.classList.remove("confirm");
  btn.textContent = label;
}

// ---- Collapsible bars (header / composer) ----
function applyBars() {
  const header = settings.show_header !== false;
  const composer = settings.show_composer !== false;
  document.body.classList.toggle("no-header", !header);
  document.body.classList.toggle("no-composer", !composer);
  $("show-top").classList.toggle("hidden", header);
  $("show-bottom").classList.toggle("hidden", composer);
  // The grid area changed size — re-fit the tile text.
  requestAnimationFrame(fitAllTiles);
}

function setBars(header, composer) {
  settings.show_header = header;
  settings.show_composer = composer;
  invoke("set_bars", { header, composer }).catch(() => {});
  applyBars();
}

// ---- Expert feature flags & values ----
// Every feature ships enabled; the expert menu lets the user switch single
// pieces off. A missing flag means enabled, so old configs keep everything on.
const FLAG_LABELS = {
  fileAttach: "flagFileAttach",
  screenshot: "flagScreenshot",
  multiView: "flagMultiView",
  quickGrid: "flagQuickGrid",
  floating: "flagFloating",
  barToggles: "flagBarToggles",
  tileMenu: "flagTileMenu",
  tileHover: "flagTileHover",
  tilePreview: "flagTilePreview",
  iconTooltips: "flagIconTooltips",
  tooltipTimeout: "flagTooltipTimeout",
  typeBadges: "flagTypeBadges",
  captions: "flagCaptions",
  copyBubble: "flagCopyBubble",
  videoControls: "flagVideoControls",
  videoAutoplay: "flagVideoAutoplay",
  videoMuted: "flagVideoMuted",
  videoLoop: "flagVideoLoop",
  animations: "flagAnimations",
  pinButton: "flagPinButton",
  pasteMedia: "flagPasteMedia",
  dragDrop: "flagDragDrop",
  promptVars: "flagPromptVars",
  captureExclusion: "flagCaptureExclusion",
  copyHistory: "flagCopyHistory",
  historyTimestamps: "flagHistoryTimestamps",
  historyGrouped: "flagHistoryGrouped",
  librarySearch: "flagLibrarySearch",
  searchSuggest: "flagSearchSuggest",
  colorFilter: "flagColorFilter",
  closeAfterCopy: "flagCloseAfterCopy",
  libraryCloseToggle: "flagLibraryCloseToggle",
  imagePreview: "flagImagePreview",
  libraryVideoPreview: "flagLibraryVideoPreview",
  confirmDiscard: "flagConfirmDiscard",
  showLogo: "flagShowLogo",
  showTitle: "flagShowTitle",
  chainPrompts: "flagChainPrompts",
  showUpdates: "flagShowUpdates",
  importExport: "flagImportExport",
  tileReorder: "flagTileReorder",
  libraryTypeFilter: "flagLibraryTypeFilter",
  journalSearch: "flagJournalSearch",
  journalTypeFilter: "flagJournalTypeFilter",
  journalColorFilter: "flagJournalColorFilter",
  journalClear: "flagJournalClear",
  journalMostUsed: "flagJournalMostUsed",
  journalRecent: "flagJournalRecent",
  journalGroupBtn: "flagJournalGroupBtn",
  journalRecentSort: "flagJournalRecentSort",
  journalUsedSort: "flagJournalUsedSort",
  confirmClearHistory: "flagConfirmClearHistory",
  chainLock: "flagChainLock",
  favorites: "flagFavorites",
  keyboardNav: "flagKeyboardNav",
  varDefaults: "flagVarDefaults",
  libraryColsToggle: "flagLibraryColsToggle",
  favViewButton: "flagFavViewButton",
  favViewReorder: "flagFavViewReorder",
  tileShadow: "flagTileShadow",
  tilePressScale: "flagTilePressScale",
  copyFlash: "flagCopyFlash",
  headerSeparators: "flagHeaderSeparators",
  cleanupFiles: "flagCleanupFiles",
};
const ALL_FLAG_KEYS = Object.keys(FLAG_LABELS);

// Opt-in flags: OFF by default (the mirror of the flags above, which are ON by
// default). Enabled only when explicitly set true; wired via a `flag-<key>` body
// class that is present exactly when the option is on.
const OPT_FLAG_LABELS = {
  // Features extras
  storeFiles: "flagStoreFiles",
  gridLines: "flagGridLines",
  uppercaseTiles: "flagUppercaseTiles",
  boldTileNames: "flagBoldTileNames",
  monospaceTiles: "flagMonospaceTiles",
  italicTiles: "flagItalicTiles",
  tileTextShadow: "flagTileTextShadow",
  // Library/search extras
  searchAutofocus: "flagSearchAutofocus",
  // Appearance extras
  compactTiles: "flagCompactTiles",
  tileGradient: "flagTileGradient",
  tileHoverLift: "flagTileHoverLift",
  accentHeader: "flagAccentHeader",
  frostedModals: "flagFrostedModals",
  hideScrollbars: "flagHideScrollbars",
  accentScrollbar: "flagAccentScrollbar",
  smoothScroll: "flagSmoothScroll",
  // Privacy extras
  blurTilesUntilHover: "flagBlurTilesUntilHover",
  blurMediaUntilHover: "flagBlurMediaUntilHover",
  hideTileNames: "flagHideTileNames",
  dimUnhovered: "flagDimUnhovered",
  // Media extras
  grayscaleMedia: "flagGrayscaleMedia",
  dimMedia: "flagDimMedia",
  mediaBorder: "flagMediaBorder",
  roundMedia: "flagRoundMedia",
};
const OPT_FLAG_KEYS = Object.keys(OPT_FLAG_LABELS);
const optFlag = (key) => settings.ui_flags?.[key] === true;
const isOptFlag = (key) => key in OPT_FLAG_LABELS;
// Current state + label key, whichever kind of flag this is.
const flagState = (key) => (isOptFlag(key) ? optFlag(key) : flag(key));
const flagLabelKey = (key) => OPT_FLAG_LABELS[key] || FLAG_LABELS[key];
// A value/select/dropdown may declare `gate: "flagKey"` (or "!flagKey" to invert)
// so its row hides while that feature is off — no dead sliders for disabled things.
const gateOpen = (gate) => {
  if (!gate) return true;
  const inv = gate[0] === "!";
  const on = flagState(inv ? gate.slice(1) : gate);
  return inv ? !on : on;
};

// Copy-history slider stops: coarser steps as the value grows (10s -> 100s ->
// 1000s -> 10000s -> 100000s) so the slider stays smooth all the way to 1,000,000.
const HISTORY_STOPS = (() => {
  const s = [];
  for (let v = 0; v <= 100; v += 10) s.push(v);
  for (let v = 200; v <= 1000; v += 100) s.push(v);
  for (let v = 2000; v <= 10000; v += 1000) s.push(v);
  for (let v = 20000; v <= 100000; v += 10000) s.push(v);
  for (let v = 200000; v <= 1000000; v += 100000) s.push(v);
  return s;
})();

// Numeric value tweaks. `def` is the shipped default; a missing value uses it.
const EXPERT_VALUES = {
  videoVolume: { label: "valVideoVolume", min: 0, max: 100, step: 5, def: 100, unit: "%", gate: "!videoMuted" },
  animSpeed: { label: "valAnimSpeed", min: 0, max: 1000, step: 10, def: 150, unit: "ms", gate: "animations" },
  gridGap: { label: "valGridGap", min: 0, max: 60, step: 1, def: 8, unit: "px" },
  bubbleMs: { label: "valBubbleMs", min: 300, max: 6000, step: 50, def: 950, unit: "ms" },
  toastMs: { label: "valToastMs", min: 800, max: 10000, step: 100, def: 1400, unit: "ms" },
  previewLen: { label: "valPreviewLen", min: 0, max: 4000, step: 20, def: 600, unit: "" },
  viewBorder: { label: "valViewBorder", min: 1, max: 12, step: 1, def: 3, unit: "px", gate: "multiView" },
  // Floating-button opacity (%). Floored at 20% so the pill never vanishes.
  floatOpacity: { label: "valFloatOpacity", min: 20, max: 100, step: 5, def: 100, unit: "%", gate: "floating" },
  // Custom tile tooltip max width (it wraps + grows taller instead of widening).
  tooltipWidth: { label: "valTooltipWidth", min: 180, max: 640, step: 10, def: 340, unit: "px", gate: "tilePreview" },
  // How long the hover tooltip stays before auto-hiding (paired with tooltipTimeout).
  tooltipTimeoutMs: { label: "valTooltipTimeout", min: 2000, max: 60000, step: 1000, def: 15000, unit: "ms", gate: "tooltipTimeout" },
  // Appearance scales (percent, 100 = unchanged). Applied as CSS zoom.
  uiScale: { label: "valUiScale", min: 50, max: 300, step: 5, def: 100, unit: "%" },
  modalScale: { label: "valModalScale", min: 60, max: 300, step: 5, def: 100, unit: "%" },
  composerScale: { label: "valComposerScale", min: 60, max: 300, step: 5, def: 100, unit: "%" },
  iconScale: { label: "valIconScale", min: 60, max: 300, step: 5, def: 100, unit: "%" },
  primaryScale: { label: "valPrimaryScale", min: 60, max: 300, step: 5, def: 100, unit: "%" },
  // Max length for prompt names + captions (raise it for long labels).
  nameMaxLen: { label: "valNameMaxLen", min: 20, max: 1000, step: 10, def: 80, unit: "" },
  // Limit overrides (defaults match the classic 20; backend ceiling is 200).
  maxViews: { label: "valMaxViews", min: 1, max: 200, step: 1, def: 20, unit: "" },
  gridMax: { label: "valGridMax", min: 1, max: 200, step: 1, def: 20, unit: "" },
  // Copy-history length (0 = keep none).
  historyMax: { label: "valHistoryMax", def: 100, unit: "", stops: HISTORY_STOPS, gate: "copyHistory" },
  // Max copy-history rows the journal renders at once (UI cap, not storage).
  journalLimit: { label: "valJournalLimit", min: 50, max: 10000, step: 50, def: 100, unit: "", gate: "copyHistory" },
  // Block re-copying the SAME prompt within this window (0 = off). Never blocks others.
  copyCooldownMs: { label: "valCopyCooldown", min: 0, max: 10000, step: 100, def: 2000, unit: "ms" },
  // Header favorites-star size.
  favStarSize: { label: "valFavStarSize", min: 14, max: 48, step: 1, def: 22, unit: "px", gate: "favViewButton" },
  // Favorites grid: cap the column count (0 = auto-size to the count).
  favMaxCols: { label: "valFavMaxCols", min: 0, max: 20, step: 1, def: 0, unit: "", gate: "favViewButton" },
  // Prompt-list (library) column options: how many columns the header toggle offers.
  libraryMaxCols: { label: "valLibraryMaxCols", min: 1, max: 6, step: 1, def: 2, unit: "", gate: "libraryColsToggle" },
  // Prompt-list (library) dialog width.
  libraryWidth: { label: "valLibraryWidth", min: 520, max: 1400, step: 20, def: 900, unit: "px" },
  // How many recent search terms the suggestions dropdown keeps + shows.
  searchRecentMax: { label: "valSearchRecentMax", min: 1, max: 20, step: 1, def: 8, unit: "", gate: "searchSuggest" },
  // Tile geometry.
  tileRadius: { label: "valTileRadius", min: 0, max: 30, step: 1, def: 10, unit: "px" },
  tileBorderWidth: { label: "valTileBorderWidth", min: 0, max: 6, step: 1, def: 1, unit: "px" },
  // Tile hover-lift travel (paired with the tileHoverLift toggle).
  hoverLift: { label: "valHoverLift", min: 1, max: 12, step: 1, def: 2, unit: "px", gate: "tileHoverLift" },
  // Header vertical padding + screenshot-preview max height.
  headerPadY: { label: "valHeaderPadY", min: 2, max: 30, step: 1, def: 10, unit: "px" },
  snipPreviewVh: { label: "valSnipPreviewVh", min: 30, max: 92, step: 1, def: 74, unit: "%", gate: "screenshot" },
  // Scrollbar thickness across every dialog (thumb keeps its 3px inset border).
  scrollbarWidth: { label: "valScrollbarWidth", min: 8, max: 20, step: 1, def: 12, unit: "px" },
  // Frosted-glass dialog background blur (paired with the frostedModals toggle).
  frostedBlur: { label: "valFrostedBlur", min: 0, max: 20, step: 1, def: 4, unit: "px", gate: "frostedModals" },
  // Privacy blur strength (each paired with its "blur until hover" toggle).
  tileBlur: { label: "valTileBlur", min: 1, max: 16, step: 1, def: 4, unit: "px", gate: "blurTilesUntilHover" },
  mediaBlur: { label: "valMediaBlur", min: 1, max: 30, step: 1, def: 10, unit: "px", gate: "blurMediaUntilHover" },
  // Dim strength for the "dim unhovered / dim media" toggles (lower = dimmer).
  dimOpacity: { label: "valDimOpacity", min: 10, max: 90, step: 5, def: 45, unit: "%", gate: "dimUnhovered" },
  mediaDimOpacity: { label: "valMediaDim", min: 10, max: 95, step: 5, def: 80, unit: "%", gate: "dimMedia" },
  // Rounded-media corner radius (paired with the roundMedia toggle).
  mediaRadius: { label: "valMediaRadius", min: 0, max: 24, step: 1, def: 8, unit: "px", gate: "roundMedia" },
};

// Preset-or-custom numeric settings (dropdown with a free-entry option).
const EXPERT_SELECTS = {
  historyDays: { label: "valHistoryDays", options: [1, 3, 7, 30], def: 7, unit: "d", gate: "copyHistory" },
};

// Dropdowns like the settings' text-size / font selects. copySize lives in
// ui_values (0 = auto-fit to the button), copyFont in ui_texts ("" = default).
const EXPERT_DROPDOWNS = {
  copySize: {
    label: "valCopySize",
    options: () => {
      const o = [["0", t("langAuto")]];
      for (let s = SIZE_MIN; s <= SIZE_MAX; s += SIZE_STEP) o.push([String(s), String(s)]);
      return o;
    },
    get: () => String(Number(settings.ui_values?.copySize) || 0),
    set: async (v) => {
      settings.ui_values = { ...(settings.ui_values || {}), copySize: Number(v) };
      try { await invoke("set_ui_value", { key: "copySize", value: Number(v) }); } catch (e) { toast(String(e)); }
    },
  },
  copyFont: {
    label: "valCopyFont",
    options: () => {
      const o = [["", t("styleDefault"), ""]];
      for (const [key, stack] of Object.entries(FONTS)) {
        o.push([key, FONT_LABELS[key] ?? t(key === "script" ? "fontScript" : "fontSystem"), stack]);
      }
      return o;
    },
    get: () => settings.ui_texts?.copyFont ?? "",
    set: async (v) => {
      settings.ui_texts = { ...(settings.ui_texts || {}), copyFont: v };
      try { await invoke("set_ui_text", { key: "copyFont", value: v }); } catch (e) { toast(String(e)); }
    },
  },
};

// Expert menu organised into tabs (it has grown large — tabs keep it tidy).
const EXPERT_TABS = [
  { title: "expTabGeneral", groups: [
    { title: "expGroupCreate", flags: ["fileAttach", "screenshot", "pasteMedia", "dragDrop", "promptVars", "varDefaults"], values: ["snipPreviewVh"] },
    { title: "expGroupWorkspace", flags: ["multiView", "quickGrid", "floating", "pinButton", "barToggles", "showLogo", "showTitle", "keyboardNav", "headerSeparators"], values: ["viewBorder", "floatOpacity"] },
    { title: "expGroupSystem", flags: ["showUpdates", "importExport"] },
  ] },
  { title: "expTabTiles", groups: [
    { title: "expGroupTiles", flags: ["tileMenu", "tileHover", "tilePreview", "iconTooltips", "tooltipTimeout", "typeBadges", "captions", "copyBubble", "copyFlash", "tileReorder", "tileShadow", "tilePressScale", "chainPrompts", "chainLock"], values: ["copyCooldownMs", "tileRadius", "tileBorderWidth", "tooltipWidth", "tooltipTimeoutMs"] },
    { title: "expGroupFavorites", flags: ["favViewButton", "favViewReorder"], values: ["favStarSize", "favMaxCols"] },
    { title: "expGroupExtras", flags: ["storeFiles", "gridLines", "uppercaseTiles", "boldTileNames", "monospaceTiles", "italicTiles", "tileTextShadow"] },
  ] },
  { title: "expTabAppearance", groups: [
    { title: "expGroupScale", values: ["uiScale", "modalScale", "composerScale", "iconScale", "primaryScale"] },
    { title: "expGroupVisual", flags: ["animations"], values: ["animSpeed", "gridGap", "headerPadY"], dropdowns: ["copySize", "copyFont"] },
    { title: "expGroupColors", palette: true },
    { title: "expGroupLimits", values: ["maxViews", "gridMax", "previewLen", "nameMaxLen", "bubbleMs", "toastMs"] },
    { title: "expGroupExtrasLook", flags: ["compactTiles", "tileGradient", "tileHoverLift", "accentHeader", "hideScrollbars", "accentScrollbar", "smoothScroll", "frostedModals"], values: ["hoverLift", "scrollbarWidth", "frostedBlur"] },
  ] },
  { title: "expTabLibrary", groups: [
    { title: "expGroupLibrary", flags: ["librarySearch", "searchSuggest", "libraryTypeFilter", "colorFilter", "favorites", "searchAutofocus", "imagePreview", "libraryVideoPreview", "closeAfterCopy", "libraryCloseToggle", "libraryColsToggle", "confirmDiscard"], values: ["searchRecentMax", "libraryMaxCols", "libraryWidth"] },
    { title: "expGroupPrivacy", flags: ["captureExclusion", "copyHistory", "historyTimestamps", "historyGrouped", "cleanupFiles"], values: ["historyMax", "journalLimit"], selects: ["historyDays"], paths: ["screenshotDir", "dataDir"] },
    { title: "expGroupJournal", flags: ["journalSearch", "journalTypeFilter", "journalColorFilter", "journalRecent", "journalMostUsed", "journalGroupBtn", "journalRecentSort", "journalUsedSort", "journalClear", "confirmClearHistory"] },
    { title: "expGroupExtrasPrivacy", flags: ["blurTilesUntilHover", "blurMediaUntilHover", "hideTileNames", "dimUnhovered"], values: ["tileBlur", "mediaBlur", "dimOpacity"] },
  ] },
  { title: "expTabMedia", groups: [
    { title: "expGroupMedia", flags: ["videoControls", "videoAutoplay", "videoMuted", "videoLoop"], values: ["videoVolume"] },
    { title: "expGroupExtrasMedia", flags: ["grayscaleMedia", "dimMedia", "mediaBorder", "roundMedia"], values: ["mediaDimOpacity", "mediaRadius"] },
  ] },
];

const flag = (key) => settings.ui_flags?.[key] !== false;
const val = (key) => {
  const cfg = EXPERT_VALUES[key];
  const raw = settings.ui_values?.[key];
  const v = Number.isFinite(raw) ? raw : cfg.def;
  // Clamp to the setting's own range so no stored/imported value can push a
  // slider-bounded setting out of bounds (grid geometry etc. stays always valid).
  if (cfg.stops) {
    return Math.min(cfg.stops[cfg.stops.length - 1], Math.max(cfg.stops[0], v));
  }
  if (Number.isFinite(cfg.min) && Number.isFinite(cfg.max)) {
    return Math.min(cfg.max, Math.max(cfg.min, v));
  }
  return v;
};
const txt = (key) => settings.ui_texts?.[key] || "";

// Mirror each disabled flag onto a body class so CSS can hide the matching UI.
function applyFlags() {
  for (const key of ALL_FLAG_KEYS) {
    document.body.classList.toggle(`noflag-${key}`, !flag(key));
  }
  // Opt-in (default-off) flags: a `flag-<key>` class appears only when enabled.
  for (const key of OPT_FLAG_KEYS) {
    document.body.classList.toggle(`flag-${key}`, optFlag(key));
  }
  if (chainMode && !flag("chainPrompts")) setChainMode(false); // killed in expert menu
  if (chainLock && !flag("chainLock")) { chainLock = false; $("chain-btn")?.classList.remove("chain-locked"); }
  applyValues();
}

// Apply every numeric tweak to its live target (CSS vars + JS constants).
function applyValues() {
  const root = document.documentElement.style;
  root.setProperty("--transition", `${val("animSpeed")}ms cubic-bezier(0.4, 0, 0.2, 1)`);
  root.setProperty("--gap", `${val("gridGap")}px`);
  root.setProperty("--view-border", `${val("viewBorder")}px`);
  // Appearance scales (CSS zoom; 1 = unchanged).
  root.setProperty("--ui-zoom", val("uiScale") / 100);
  root.setProperty("--modal-zoom", val("modalScale") / 100);
  root.setProperty("--composer-zoom", val("composerScale") / 100);
  root.setProperty("--icon-zoom", val("iconScale") / 100);
  root.setProperty("--primary-zoom", val("primaryScale") / 100);
  // Sizes exposed to CSS (favorites star, chain badge, tile geometry, header, snip).
  root.setProperty("--fav-star-size", `${val("favStarSize")}px`);
  root.setProperty("--tile-radius", `${val("tileRadius")}px`);
  root.setProperty("--tile-border-w", `${val("tileBorderWidth")}px`);
  root.setProperty("--header-pad-y", `${val("headerPadY")}px`);
  root.setProperty("--snip-preview-vh", `${val("snipPreviewVh")}vh`);
  root.setProperty("--frosted-blur", `${val("frostedBlur")}px`);
  root.setProperty("--hover-lift", `${val("hoverLift")}px`);
  root.setProperty("--lib-width", `${val("libraryWidth")}px`);
  root.setProperty("--sb-width", `${val("scrollbarWidth")}px`);
  root.setProperty("--tooltip-width", `${val("tooltipWidth")}px`);
  root.setProperty("--blur-tiles", `${val("tileBlur")}px`);
  root.setProperty("--blur-media", `${val("mediaBlur")}px`);
  root.setProperty("--dim-unhovered", val("dimOpacity") / 100);
  root.setProperty("--dim-media", val("mediaDimOpacity") / 100);
  root.setProperty("--media-radius", `${val("mediaRadius")}px`);
  BUBBLE_MS = val("bubbleMs");
  TOAST_MS = val("toastMs");
  PREVIEW_MAX = val("previewLen");
  const nameMax = val("nameMaxLen");
  for (const id of ["modal-name", "modal-caption", "view-modal-name"]) {
    const el = $(id);
    if (el) el.maxLength = nameMax;
  }
  setMediaDefaults({ volume: val("videoVolume"), muted: flag("videoMuted"), looped: flag("videoLoop") });
}

function flagRow(key) {
  const row = document.createElement("label");
  row.className = "field switch-field";
  const span = document.createElement("span");
  span.textContent = t(flagLabelKey(key));
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "switch";
  input.checked = flagState(key);
  input.addEventListener("change", async () => {
    const enabled = input.checked;
    settings.ui_flags = { ...(settings.ui_flags || {}), [key]: enabled };
    try {
      await invoke("set_ui_flag", { key, enabled });
    } catch (err) {
      toast(String(err));
    }
    applyFlags();
    renderExpert(); // reveal/hide this feature's gated parameter rows live
    renderViews();
    await renderGrid(true);
  });
  row.append(span, input);
  return row;
}

// Live slider preview: reflect the value visually while dragging (CSS vars + one
// grid re-render per frame), then persist it on release.
let liveRenderQueued = false;
function previewValue(key, value) {
  settings.ui_values = { ...(settings.ui_values || {}), [key]: value };
  applyValues();
  if (liveRenderQueued) return;
  liveRenderQueued = true;
  requestAnimationFrame(() => { liveRenderQueued = false; renderGrid(true); });
}
async function commitValue(key, value) {
  settings.ui_values = { ...(settings.ui_values || {}), [key]: value };
  try { await invoke("set_ui_value", { key, value }); } catch (err) { toast(String(err)); }
  applyValues();
  await renderGrid(true);
}

function valueRow(key) {
  const cfg = EXPERT_VALUES[key];
  const fmt = (v) => `${v}${cfg.unit}`;
  const row = document.createElement("div");
  row.className = "field value-field";
  const head = document.createElement("div");
  head.className = "value-head";
  const span = document.createElement("span");
  span.textContent = t(cfg.label);
  const out = document.createElement("span");
  out.className = "value-out";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "value-range";
  // A `stops` list drives a stepped slider (e.g. history length up to a million,
  // coarser as it climbs); everything else is a plain min/max/step slider.
  const cur = cfg.stops
    ? () => cfg.stops[Number(slider.value)]
    : () => Number(slider.value);
  const show = cfg.stops ? (v) => String(v) : fmt;
  if (cfg.stops) {
    slider.min = 0;
    slider.max = cfg.stops.length - 1;
    slider.step = 1;
    const idx = cfg.stops.findIndex((s) => s >= val(key));
    slider.value = idx < 0 ? cfg.stops.length - 1 : idx;
  } else {
    slider.min = cfg.min;
    slider.max = cfg.max;
    slider.step = cfg.step;
    slider.value = val(key);
  }
  out.textContent = show(cur());
  slider.addEventListener("input", () => { out.textContent = show(cur()); previewValue(key, cur()); });
  slider.addEventListener("change", () => commitValue(key, cur()));
  head.append(span, out);
  row.append(head, slider);
  return row;
}

// A preset dropdown (e.g. 1d/3d/7d/30d) plus a free-entry "custom" option.
function selectRow(key) {
  const cfg = EXPERT_SELECTS[key];
  const cur = Number.isFinite(settings.ui_values?.[key]) ? settings.ui_values[key] : cfg.def;
  const row = document.createElement("div");
  row.className = "field value-field";
  const head = document.createElement("div");
  head.className = "value-head";
  const span = document.createElement("span");
  span.textContent = t(cfg.label);
  head.appendChild(span);
  const sel = document.createElement("select");
  sel.className = "modal-input expert-select";
  for (const o of cfg.options) {
    const opt = document.createElement("option");
    opt.value = String(o);
    opt.textContent = `${o}${cfg.unit}`;
    sel.appendChild(opt);
  }
  const customOpt = document.createElement("option");
  customOpt.value = "custom";
  customOpt.textContent = t("valCustom");
  sel.appendChild(customOpt);
  const num = document.createElement("input");
  num.type = "number";
  num.min = 1;
  num.max = 3650;
  num.className = "modal-input expert-num";
  const isPreset = cfg.options.includes(cur);
  sel.value = isPreset ? String(cur) : "custom";
  num.value = cur;
  num.classList.toggle("hidden", isPreset);
  const persist = async (value) => {
    settings.ui_values = { ...(settings.ui_values || {}), [key]: value };
    try { await invoke("set_ui_value", { key, value }); } catch (err) { toast(String(err)); }
  };
  sel.addEventListener("change", () => {
    if (sel.value === "custom") {
      num.classList.remove("hidden");
      num.focus();
      persist(Math.max(1, Number(num.value) || cfg.def));
    } else {
      num.classList.add("hidden");
      persist(Number(sel.value));
    }
  });
  num.addEventListener("change", () => {
    const v = Math.max(1, Math.min(3650, Number(num.value) || cfg.def));
    num.value = v;
    persist(v);
  });
  row.append(head, sel, num);
  return row;
}

// A plain value/font dropdown (no custom entry), like the settings selects.
function dropdownRow(key) {
  const cfg = EXPERT_DROPDOWNS[key];
  const row = document.createElement("div");
  row.className = "field value-field";
  const head = document.createElement("div");
  head.className = "value-head";
  const span = document.createElement("span");
  span.textContent = t(cfg.label);
  head.appendChild(span);
  const sel = document.createElement("select");
  sel.className = "modal-input expert-select";
  for (const [value, lbl, stack] of cfg.options()) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = lbl;
    if (stack) o.style.fontFamily = stack;
    sel.appendChild(o);
  }
  sel.value = cfg.get();
  sel.addEventListener("change", () => cfg.set(sel.value));
  row.append(head, sel);
  return row;
}

// Folder-path options (expert): current path + a Change (folder picker) and,
// where applicable, a reset-to-default button.
let currentDataDir = "";
let defaultScreenshotDir = "";
const EXPERT_PATHS = {
  screenshotDir: {
    label: "valScreenshotDir",
    get: () => settings.ui_texts?.screenshotDir || defaultScreenshotDir,
    change: async () => {
      const dir = await invoke("pick_folder").catch(() => null);
      if (!dir) return;
      settings.ui_texts = { ...(settings.ui_texts || {}), screenshotDir: dir };
      invoke("set_ui_text", { key: "screenshotDir", value: dir }).catch((e) => toast(String(e)));
      renderExpert();
    },
    onReset: () => {
      settings.ui_texts = { ...(settings.ui_texts || {}), screenshotDir: "" };
      invoke("set_ui_text", { key: "screenshotDir", value: "" }).catch((e) => toast(String(e)));
      renderExpert();
    },
  },
  dataDir: {
    label: "valDataDir",
    get: () => currentDataDir,
    change: async () => {
      const dir = await invoke("pick_folder").catch(() => null);
      if (!dir) return;
      let oldPath;
      try { oldPath = await invoke("set_data_dir", { dir }); } catch (e) { toast(String(e)); return; }
      currentDataDir = dir;
      renderExpert();
      // Offer to delete the old data (default = keep). Message notes the restart.
      if (oldPath && oldPath !== dir) {
        const del = await confirmDialog({
          title: t("valDataDir"),
          message: t("dataDirConfirm"),
          confirmLabel: t("delete"),
          cancelLabel: t("dataDirKeep"),
        });
        if (del) await invoke("delete_data_dir", { path: oldPath }).catch(() => {});
      }
    },
  },
};

function pathRow(key) {
  const cfg = EXPERT_PATHS[key];
  const row = document.createElement("div");
  row.className = "field value-field path-field";
  const head = document.createElement("div");
  head.className = "value-head";
  const span = document.createElement("span");
  span.textContent = t(cfg.label);
  const out = document.createElement("span");
  out.className = "value-out path-out";
  const cur = cfg.get() || t("pathDefault");
  out.textContent = cur;
  out.title = cur;
  head.append(span, out);
  const btns = document.createElement("div");
  btns.className = "path-btns";
  const change = document.createElement("button");
  change.type = "button";
  change.className = "ghost-btn";
  change.textContent = t("pathChange");
  change.addEventListener("click", cfg.change);
  btns.appendChild(change);
  if (cfg.onReset) {
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "ghost-btn";
    reset.textContent = t("pathDefault");
    reset.addEventListener("click", cfg.onReset);
    btns.appendChild(reset);
  }
  row.append(head, btns);
  return row;
}

let expertTab = 0;
let expertQuery = ""; // expert-menu search filter
// Editable default-color palette: one native color picker per hue + reset.
function paletteRow() {
  const row = document.createElement("div");
  row.className = "field palette-field";
  const grid = document.createElement("div");
  grid.className = "palette-grid";
  const cur = COLORS.slice(1);
  const inputs = [];
  for (let i = 0; i < PALETTE_LEN; i++) {
    const c = document.createElement("input");
    c.type = "color";
    c.className = "palette-swatch";
    c.value = HEX_RE.test(cur[i]) ? cur[i] : DEFAULT_COLORS[i + 1];
    c.title = c.value;
    c.addEventListener("input", () => { c.title = c.value; });
    c.addEventListener("change", () => savePalette(inputs.map((x) => x.value)));
    inputs.push(c);
    grid.appendChild(c);
  }
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "ghost-btn palette-reset";
  reset.textContent = t("paletteReset");
  reset.addEventListener("click", () => savePalette(null));
  row.append(grid, reset);
  return row;
}

// Persist the palette (null = reset to defaults), remap every saved prompt/view
// color from the old hue to the new one, and refresh every colour surface live.
async function savePalette(colors) {
  const oldHues = COLORS.slice(1);
  const value = colors ? JSON.stringify(colors) : "";
  settings.ui_texts = { ...(settings.ui_texts || {}), palette: value };
  try { await invoke("set_ui_text", { key: "palette", value }); } catch (e) { toast(String(e)); }
  loadPalette();
  const newHues = COLORS.slice(1);
  const pairs = [];
  for (let i = 0; i < PALETTE_LEN; i++) {
    if (oldHues[i] && newHues[i] && oldHues[i] !== newHues[i]) pairs.push([oldHues[i], newHues[i]]);
  }
  if (pairs.length) {
    try { await invoke("remap_colors", { pairs }); } catch (e) { toast(String(e)); }
    // Reload the caches so the grid/views reflect the remap without a restart.
    try {
      const s = await invoke("get_state");
      prompts = s.prompts;
      settings = s.settings;
      loadPalette();
    } catch (_) { /* keep going with the in-memory state */ }
  }
  refreshColorUI();
  renderViews();
  renderExpert();
  await renderGrid(true);
}

// Translation-key lookup per setting kind — used by the expert-menu search.
const EXPERT_LABEL_KEYS = {
  flags: (k) => flagLabelKey(k),
  values: (k) => EXPERT_VALUES[k].label,
  selects: (k) => EXPERT_SELECTS[k].label,
  dropdowns: (k) => EXPERT_DROPDOWNS[k].label,
  paths: (k) => EXPERT_PATHS[k].label,
};
// The def a given setting kind lives in — so its optional `gate` can be read.
const EXPERT_DEFS = { values: EXPERT_VALUES, selects: EXPERT_SELECTS, dropdowns: EXPERT_DROPDOWNS };
// A search matches if the term is in the active language OR in English — English
// is the lingua franca, so a non-native speaker's query still finds the setting.
function i18nHit(key, q) {
  return (I18N[LANG][key] || "").toLowerCase().includes(q) || (I18N.en[key] || "").toLowerCase().includes(q);
}

// The "off by default" extras groups start folded (kept tidy until wanted).
const DEFAULT_COLLAPSED_GROUPS = ["expGroupExtras", "expGroupExtrasLook", "expGroupExtrasPrivacy", "expGroupExtrasMedia"];
// Collapsed expert categories, persisted as a JSON title list in ui_texts. Unset
// (first ever open) → the extras groups collapsed; after that the stored list wins.
function expertCollapsedSet() {
  const stored = settings.ui_texts?.expertCollapsed;
  if (stored == null) return new Set(DEFAULT_COLLAPSED_GROUPS);
  try { return new Set(JSON.parse(stored)); } catch (_) { return new Set(); }
}
function toggleExpertGroup(title) {
  const set = expertCollapsedSet();
  set.has(title) ? set.delete(title) : set.add(title);
  const value = JSON.stringify([...set]);
  settings.ui_texts = { ...(settings.ui_texts || {}), expertCollapsed: value };
  invoke("set_ui_text", { key: "expertCollapsed", value }).catch(() => {});
  renderExpert();
}

function renderExpert() {
  const box = $("expert-flags");
  const tabBar = $("expert-tabs-bar");
  const keepScroll = box.scrollTop; // survive live re-renders (e.g. a toggled gate)
  box.innerHTML = "";
  tabBar.innerHTML = "";
  if (expertTab >= EXPERT_TABS.length) expertTab = 0;
  const q = expertQuery.trim().toLowerCase();
  const searching = q.length > 0;
  // Tab bar lives in the fixed header (stays visible while the rows scroll); it is
  // hidden while searching, when every tab's groups are scanned at once.
  if (!searching) {
    const bar = document.createElement("div");
    bar.className = "expert-tabs";
    EXPERT_TABS.forEach((tab, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "expert-tab" + (i === expertTab ? " active" : "");
      b.textContent = t(tab.title);
      b.addEventListener("click", () => { expertTab = i; box.scrollTop = 0; renderExpert(); });
      bar.appendChild(b);
    });
    tabBar.appendChild(bar);
  }
  const tabs = searching ? EXPERT_TABS : [EXPERT_TABS[expertTab]];
  const collapsed = expertCollapsedSet();
  let shown = 0;
  for (const tab of tabs) {
    for (const group of tab.groups) {
      const groupHit = searching && i18nHit(group.title, q);
      const keep = (kind) => (group[kind] || []).filter((k) => {
        if (searching) return groupHit || i18nHit(EXPERT_LABEL_KEYS[kind](k), q);
        // Not searching: drop a row whose gating feature is currently off.
        return gateOpen(EXPERT_DEFS[kind]?.[k]?.gate);
      });
      const flags = keep("flags");
      const values = keep("values");
      const selects = keep("selects");
      const dropdowns = keep("dropdowns");
      const paths = keep("paths");
      const palette = group.palette && (!searching || groupHit || i18nHit("expGroupColors", q));
      if (searching && !flags.length && !values.length && !selects.length && !dropdowns.length && !paths.length && !palette) continue;
      shown++;
      // Categories collapse on click (persisted); searching always shows them.
      const isCollapsed = !searching && collapsed.has(group.title);
      const sec = document.createElement("div");
      sec.className = "expert-group" + (isCollapsed ? " collapsed" : "");
      const head = document.createElement("div");
      head.className = "expert-group-title";
      head.textContent = t(group.title);
      if (!searching) {
        head.classList.add("collapsible");
        head.addEventListener("click", () => toggleExpertGroup(group.title));
      }
      sec.appendChild(head);
      if (searching) {
        // Flat list while searching (grouping a match under a non-matching toggle
        // would hide it); adjacency only matters for the calm, browsable view.
        for (const key of flags) sec.appendChild(flagRow(key));
        for (const key of values) sec.appendChild(valueRow(key));
        for (const key of selects) sec.appendChild(selectRow(key));
      } else {
        // A param whose gate names a toggle in THIS group renders right beneath that
        // toggle (and vanishes with it), so a feature and its sub-settings stay together.
        const ownerIn = (kind, k) => {
          const g = EXPERT_DEFS[kind]?.[k]?.gate;
          return g && g[0] !== "!" && (group.flags || []).includes(g) ? g : null;
        };
        const owned = {};
        const orphan = { values: [], selects: [] };
        for (const k of values) { const o = ownerIn("values", k); (o ? (owned[o] ||= []) : orphan.values).push(["values", k]); }
        for (const k of selects) { const o = ownerIn("selects", k); (o ? (owned[o] ||= []) : orphan.selects).push(["selects", k]); }
        const render = ([kind, k]) => sec.appendChild(kind === "selects" ? selectRow(k) : valueRow(k));
        for (const key of flags) { sec.appendChild(flagRow(key)); (owned[key] || []).forEach(render); }
        orphan.values.forEach(render);
        orphan.selects.forEach(render);
      }
      if (dropdowns.length) {
        const pair = document.createElement("div");
        pair.className = "dropdown-pair";
        for (const key of dropdowns) pair.appendChild(dropdownRow(key));
        sec.appendChild(pair);
      }
      for (const key of paths) sec.appendChild(pathRow(key));
      if (palette) sec.appendChild(paletteRow());
      box.appendChild(sec);
    }
  }
  if (searching && !shown) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = t("libraryNoResults");
    box.appendChild(empty);
  }
  box.scrollTop = keepScroll;
}

async function onResetExpert() {
  settings.ui_flags = {};
  settings.ui_values = {};
  settings.ui_texts = {};
  try {
    await invoke("reset_expert");
  } catch (err) {
    toast(String(err));
  }
  loadPalette();
  refreshColorUI();
  applyFlags();
  renderExpert();
  renderViews();
  await renderGrid(true);
  toast(t("expertResetDone"));
}

// Switch between the main settings page and the expert sub-page.
function showExpertPage(on) {
  $("settings-main").classList.toggle("hidden", on);
  $("settings-expert").classList.toggle("hidden", !on);
  $("expert-back").classList.toggle("hidden", !on);
  $("settings-title").textContent = on ? t("expertMenu") : t("settings");
  if (on) renderExpert();
}

// ---- View helpers ----
function activeView() {
  return settings.views.find((v) => v.id === settings.active_view) || settings.views[0];
}
const gridKeyOf = (v) => `${v.cols}x${v.rows}`;
const layoutOf = (v) => v.layouts?.[gridKeyOf(v)] || {};

// ---- Favorites view: a live, auto-sized grid of every starred prompt.
// Enabled by the favView setting (off by default); the header star toggles it.
let favView = false; // currently showing the favorites grid
const favViewEnabled = () => settings.ui_flags?.favView === true;

// Favorites layout: prompt id -> [col,row]. Free placement (gaps allowed), saved
// in ui_texts; the grid grows to fit the count and to cover any hand-placed cell.
function favLayoutMap() {
  try { const m = JSON.parse(settings.ui_texts?.favLayout || "{}"); return m && typeof m === "object" ? m : {}; } catch (_) { return {}; }
}
function saveFavLayout(map) {
  const value = JSON.stringify(map);
  settings.ui_texts = { ...(settings.ui_texts || {}), favLayout: value };
  invoke("set_ui_text", { key: "favLayout", value }).catch(() => {});
}

// Star button visibility (setting + expert flag) + pressed state. In the favorites
// view the grid-size control stays visible (so the size is shown) but read-only —
// the favorites grid sizes itself.
function refreshFavViewUi() {
  const btn = $("fav-view-btn");
  if (btn) {
    btn.classList.toggle("hidden", !(favViewEnabled() && flag("favViewButton")));
    btn.classList.toggle("active", favView);
  }
  const qg = $("quick-grid");
  if (qg) qg.classList.toggle("qg-readonly", favView);
  $("qg-cols").readOnly = favView;
  $("qg-rows").readOnly = favView;
}

function setFavView(on) {
  favView = on && favViewEnabled();
  renderGrid(true);
}

// Favorites grid with FREE placement inside a grid that always fits the count:
// a favorite keeps the cell it is dragged to (gaps allowed), but the grid resizes
// the moment the count changes, and any button now outside it is re-fitted.
function renderFavGrid() {
  const favs = prompts.filter((p) => p.favorite);
  const n = favs.length;
  const ids = new Set(favs.map((p) => p.id));
  const layout = favLayoutMap();
  let changed = false;
  for (const id of Object.keys(layout)) if (!ids.has(id)) { delete layout[id]; changed = true; }

  // Size fits the count (landscape); an expert cap can pin the column count.
  let cols = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(Math.sqrt(n)))));
  const capCols = val("favMaxCols");
  if (capCols > 0) cols = Math.min(cols, capCols);
  let rows = Math.max(1, Math.ceil(n / cols));
  while (cols * rows < n) rows++; // always room for every favorite

  // Placed cells outside the (re)computed grid are dropped and re-placed below,
  // so shrinking the grid re-fits any button that fell off it.
  const occupied = new Map();
  for (const [id, cell] of Object.entries(layout)) {
    if (cell[0] < cols && cell[1] < rows && !occupied.has(cellKey(cell[0], cell[1]))) {
      occupied.set(cellKey(cell[0], cell[1]), id);
    } else { delete layout[id]; changed = true; }
  }
  // Newly starred favorites (not yet placed) drop into the first free cell.
  for (const p of favs) {
    if (layout[p.id]) continue;
    const cell = firstFree(occupied, cols, rows);
    if (cell) { layout[p.id] = cell; occupied.set(cellKey(...cell), p.id); changed = true; }
  }
  if (changed) saveFavLayout(layout);

  const byCell = new Map();
  for (const p of favs) { const c = layout[p.id]; if (c) byCell.set(cellKey(c[0], c[1]), p); }
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  $("qg-cols").value = cols; // show (read-only) the auto-computed favorites size
  $("qg-rows").value = rows;
  const frag = document.createDocumentFragment();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.dataset.col = c;
      cellEl.dataset.row = r;
      const p = byCell.get(cellKey(c, r));
      if (p) cellEl.appendChild(buildTile(p));
      frag.appendChild(cellEl);
    }
  }
  gridEl.innerHTML = "";
  gridEl.appendChild(frag);
  if (!n) {
    const empty = document.createElement("div");
    empty.className = "fav-empty";
    empty.textContent = t("favViewEmpty");
    gridEl.appendChild(empty);
  }
  pruneVideoCache();
  renderViews();
  refreshFavViewUi();
  fitAllTiles();
}

// Move a favorite to the drop cell, swapping with any occupant. Dropping on an
// empty cell just moves it there and frees the old one — gaps are preserved.
async function placeFav(id, col, row) {
  if (!flag("favViewReorder")) return;
  const layout = favLayoutMap();
  const ids = new Set(prompts.filter((p) => p.favorite).map((p) => p.id));
  for (const k of Object.keys(layout)) if (!ids.has(k)) delete layout[k];
  const old = layout[id];
  const occupant = Object.entries(layout).find(([oid, c]) => oid !== id && c[0] === col && c[1] === row);
  if (occupant) { if (old) layout[occupant[0]] = old; else delete layout[occupant[0]]; }
  layout[id] = [col, row];
  saveFavLayout(layout);
  await renderGrid(true);
}

// ---- Layout normalization (active view, current grid size) ----
function firstFree(occupied, cols, rows) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!occupied.has(cellKey(c, r))) return [c, r];
    }
  }
  return null;
}

function normalizeLayout(view) {
  const { cols, rows } = view;
  const layout = { ...layoutOf(view) };
  const occupied = new Map();
  const ids = new Set(prompts.map((p) => p.id));
  let changed = false;

  for (const id of Object.keys(layout)) {
    if (!ids.has(id)) { delete layout[id]; changed = true; }
  }
  for (const p of prompts) {
    const cell = layout[p.id];
    if (cell && cell[0] < cols && cell[1] < rows && !occupied.has(cellKey(...cell))) {
      occupied.set(cellKey(...cell), p.id);
    } else if (cell) {
      delete layout[p.id];
      changed = true;
    }
  }
  // Unplaced prompts stay reachable via the library. No auto-fill: saved
  // per-grid-size arrangements must stay untouched.
  view.layouts[gridKeyOf(view)] = layout;
  return changed;
}

// ---- Render ----
// skipFetch: caller already updated the local state (drag/hide hot path).
async function renderGrid(skipFetch = false) {
  hideTileTip(); // the hovered tile may be replaced by this render
  if (!skipFetch) {
    try {
      const s = await invoke("get_state");
      prompts = s.prompts;
      settings = s.settings;
    } catch (e) {
      // IPC hiccup: keep the last good state instead of throwing into the
      // global handler and leaving a half-rendered grid.
      toast(String((e && e.message) || e));
      if (!settings || !prompts) return;
    }
  }
  if (favView && !favViewEnabled()) favView = false; // setting switched off underneath us
  if (favView) { renderFavGrid(); return; }
  const view = activeView();
  if (normalizeLayout(view)) {
    invoke("set_layout", { layout: layoutOf(view) }).catch(() => {});
  }

  const { cols, rows } = view;
  const layout = layoutOf(view);
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  $("qg-cols").value = cols;
  $("qg-rows").value = rows;
  $("qg-cols").max = val("gridMax");
  $("qg-rows").max = val("gridMax");

  const byCell = new Map();
  for (const p of prompts) {
    const cell = layout[p.id];
    if (cell) byCell.set(cellKey(...cell), p);
  }

  // Build off-DOM, attach once (1 reflow instead of cols*rows).
  const frag = document.createDocumentFragment();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.dataset.col = c;
      cellEl.dataset.row = r;
      const p = byCell.get(cellKey(c, r));
      if (p) cellEl.appendChild(buildTile(p));
      frag.appendChild(cellEl);
    }
  }
  gridEl.innerHTML = "";
  gridEl.appendChild(frag);

  pruneVideoCache();
  renderViews();
  refreshFavViewUi();
  fitAllTiles();
}

// Header view switcher: one button per view (switch on click, manage on
// right-click) plus a trailing "+" to add a view via the name popup.
function renderViews() {
  viewsEl.innerHTML = "";
  // Multi-view disabled (expert menu): no switcher, no add button.
  if (!flag("multiView")) {
    viewsEl.classList.add("hidden");
    return;
  }
  for (const v of settings.views) {
    const btn = document.createElement("button");
    // While the favorites view is open, no normal view is the active one.
    btn.className = "view-btn" + (!favView && v.id === settings.active_view ? " active" : "");
    if (v.color) {
      btn.classList.add("colored");
      btn.style.setProperty("--view-color", v.color);
    }
    btn.textContent = v.name;
    btn.addEventListener("click", async () => {
      favView = false; // picking a normal view leaves the favorites grid
      settings = await invoke("set_active_view", { id: v.id });
      await renderGrid(true); // prompts unchanged, settings already fresh
    });
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openViewModal(v);
    });
    viewsEl.appendChild(btn);
  }
  if (settings.views.length < val("maxViews")) {
    const add = document.createElement("button");
    add.className = "view-btn view-add-top";
    add.innerHTML = PLUS_ICON;
    add.setAttribute("aria-label", t("addView")); // aria only — no hover tooltip
    add.addEventListener("click", () => openViewModal(null));
    viewsEl.appendChild(add);
  }
  viewsEl.classList.toggle("hidden", viewsEl.childElementCount === 0);
}

// ---- View add / rename / delete popup ----
const viewModal = {
  root: $("view-modal"),
  title: $("view-modal-title"),
  name: $("view-modal-name"),
  colorRow: $("view-color-row"),
  confirm: $("view-modal-confirm"),
  cancel: $("view-modal-cancel"),
  delete: $("view-modal-delete"),
  close: $("view-modal-close"),
};
let viewModalId = null; // null = create, otherwise the view being edited
let viewModalColor = ""; // empty = default

function renderViewColor() {
  buildSwatches(
    viewModal.colorRow,
    viewModalColor,
    (hex) => { viewModalColor = hex; renderViewColor(); },
    (anchor, cur) => openColorPop(anchor, cur, (hex) => { viewModalColor = hex; renderViewColor(); })
  );
}

function openViewModal(view) {
  viewModalId = view ? view.id : null;
  viewModalColor = view ? (view.color || "") : "";
  // The add-view label carries a leading "+"; the popup title drops it.
  viewModal.title.textContent = view ? t("renameView") : t("addView").replace(/^\+\s*/, "");
  viewModal.name.value = view ? view.name : "";
  renderViewColor();
  // Delete only when editing and at least two views remain.
  const canDelete = !!view && settings.views.length > 1;
  viewModal.delete.classList.toggle("hidden", !canDelete);
  disarmButton(viewModal.delete, t("delete"));
  viewModal.root.classList.remove("hidden");
  viewModal.name.focus();
  viewModal.name.select();
}

function closeViewModal() {
  viewModal.root.classList.add("hidden");
  viewModalId = null;
}

async function confirmViewModal() {
  const name = viewModal.name.value.trim();
  if (!name) { viewModal.name.focus(); return; }
  try {
    if (viewModalId) {
      await invoke("rename_view", { id: viewModalId, name });
      settings = await invoke("set_view_color", { id: viewModalId, color: viewModalColor });
    } else {
      settings = await invoke("add_view", { name, color: viewModalColor });
    }
  } catch (err) {
    toast(String(err));
    return;
  }
  closeViewModal();
  renderViews();
  renderViewsEditor();
  await renderGrid(true);
}

// ---- Prompt chaining ----
// The chain button turns several TEXT buttons into one clipboard copy: click it,
// then click text buttons in the order you want them; each shows its position (1,
// 2, 3 …) and the joined text (newline-separated) lands on the clipboard after
// every pick. It auto-ends after a paste (Ctrl+V while focused, or leaving the
// window to paste elsewhere) or when the button is clicked again. Only text
// prompts qualify — image/file/video buttons copy media, which can't be joined.
let chainMode = false;
let chainLock = false; // "always on" — survives window blur until turned off by hand
const chainSel = []; // selected prompt ids, in pick order
const chainTexts = new Map(); // id -> resolved copy text (variables already filled)

const isTextPrompt = (p) => !!p && !p.copy_image && !p.file_path;

// Chained prompts are joined with a blank line (two newlines) between them.
const CHAIN_SEP = "\n\n";

function chainText() {
  return chainSel.map((id) => chainTexts.get(id) ?? "").join(CHAIN_SEP);
}

function pushChainClipboard() {
  if (!chainSel.length) return;
  invoke("copy_text", { text: chainText() }).catch((e) => toast(String(e)));
}

// Reflect one tile's chain state (skip / picked + order badge) without a re-render.
function applyChainToTile(tile, p) {
  tile.classList.toggle("chain-skip", chainMode && !isTextPrompt(p));
  const idx = chainMode ? chainSel.indexOf(p.id) : -1;
  tile.classList.toggle("chain-picked", idx >= 0);
  tile.querySelector(".tile-chain-badge")?.remove();
  if (idx >= 0) {
    const badge = document.createElement("span");
    badge.className = "tile-chain-badge";
    badge.textContent = String(idx + 1);
    tile.appendChild(badge);
  }
}

function refreshChainUi() {
  for (const tile of gridEl.querySelectorAll(".tile")) {
    const p = prompts.find((x) => x.id === tile.dataset.id);
    if (p) applyChainToTile(tile, p);
  }
}

async function toggleChainPick(p) {
  if (!isTextPrompt(p)) return; // only text buttons chain
  const i = chainSel.indexOf(p.id);
  if (i >= 0) {
    chainSel.splice(i, 1); // deselect → the rest renumber
    chainTexts.delete(p.id);
  } else {
    // Resolve {#{variables}#} right when the button is picked into the chain.
    let text = p.text || p.name || "";
    if (flag("promptVars") && extractVars(p.text).length) {
      const values = await promptVarsDialog(extractVars(p.text));
      if (!values) return; // cancelled → leave it unselected
      text = fillVars(p.text, values);
    }
    chainSel.push(p.id);
    chainTexts.set(p.id, text);
  }
  refreshChainUi();
  pushChainClipboard();
}

function setChainMode(on) {
  if (on && !flag("chainPrompts")) return;
  chainMode = on;
  if (!on) { chainSel.length = 0; chainTexts.clear(); chainLock = false; }
  document.body.classList.toggle("chain-mode", on);
  const btn = $("chain-btn");
  if (btn) {
    btn.classList.toggle("active", on);
    btn.classList.toggle("chain-locked", chainLock);
    btn.setAttribute("aria-pressed", String(on));
  }
  refreshChainUi();
}

// Latch chaining "always on": a window switch normally resets the chain, but a
// locked chain survives until the user turns it off by hand. The button fills with
// the accent colour to mark the locked (infinite-repeat) state.
function setChainLock() {
  if (!flag("chainPrompts") || !flag("chainLock")) return;
  chainLock = true;
  setChainMode(true); // turning on never clears the current picks; refreshes the button state
}

// Each click advances one fixed step: off → on → latched (∞) → off. Deterministic
// order, no double-click timing to misfire. A plain toggle when latching is off.
function onChainClick() {
  if (!flag("chainLock")) { setChainMode(!chainMode); return; }
  if (!chainMode) setChainMode(true); // off → on
  else if (!chainLock) setChainLock(); // on → latched
  else setChainMode(false); // latched → off
}

// ---- Themed tooltips: ONE shared popup for every hover hint — rich tile previews
// AND the native `title` on any button/icon — so nothing falls back to the OS
// tooltip. A raw `title` is converted to `data-tip` on first hover (removed so the
// OS tip never fires); tiles carry `data-tip-name`/`data-tip-body` for the richer
// name + preview + hint layout.
let tipEl = null;
let tipCur = null;   // element the tooltip is currently anchored to
let tipTimer = null;
let tipExpired = null; // element whose tooltip timed out; suppressed until another is hovered
function hideTileTip() {
  tipCur = null;
  if (tipTimer) { clearTimeout(tipTimer); tipTimer = null; }
  tipEl?.classList.remove("show");
}
function wireTooltips() {
  tipEl = document.createElement("div");
  tipEl.className = "tile-tip";
  tipEl.setAttribute("role", "tooltip");
  tipEl.innerHTML = '<div class="tile-tip-name"></div><div class="tile-tip-body"></div><div class="tile-tip-hint"></div>';
  document.body.appendChild(tipEl);
  const nameEl = tipEl.querySelector(".tile-tip-name");
  const bodyEl = tipEl.querySelector(".tile-tip-body");
  const hintEl = tipEl.querySelector(".tile-tip-hint");
  const OFF = 16, PAD = 12;
  const place = (e) => {
    const r = tipEl.getBoundingClientRect();
    let x = e.clientX + OFF;
    let y = e.clientY + OFF;
    if (x + r.width + PAD > innerWidth) x = e.clientX - OFF - r.width;
    if (y + r.height + PAD > innerHeight) y = e.clientY - OFF - r.height;
    const z = uiZoom(); // fixed popup lives inside the zoomed body
    tipEl.style.left = `${Math.max(PAD, x) / z}px`;
    tipEl.style.top = `${Math.max(PAD, y) / z}px`;
  };
  document.addEventListener("pointerover", (e) => {
    if (drag) return; // no hover hints mid-drag
    const el = e.target.closest?.("[data-tip-name], [data-tip], [title]");
    if (!el) { if (tipCur) hideTileTip(); return; }
    if (el.hasAttribute("title")) { el.dataset.tip = el.getAttribute("title"); el.removeAttribute("title"); }
    const rich = !!el.dataset.tipName;
    if (!rich && !flag("iconTooltips")) { hideTileTip(); return; } // icon hints off
    const name = el.dataset.tipName || el.dataset.tip || "";
    if (!name) { hideTileTip(); return; }
    if (el === tipCur) return;     // already showing on this element
    if (el === tipExpired) return; // timed out here — hover elsewhere to reset
    tipExpired = null;
    tipCur = el;
    // Plain (icon/label) tooltips get a compact single-line style; tiles get the
    // richer name + preview + hint box.
    tipEl.classList.toggle("plain", !rich);
    nameEl.textContent = name;
    bodyEl.textContent = rich ? (el.dataset.tipBody || "") : "";
    hintEl.textContent = rich ? t("tileTooltip") : "";
    place(e);
    tipEl.classList.add("show");
    // AFK cleanness: auto-hide after the timeout, then don't reshow on this same
    // element until the pointer visits a different one.
    if (flag("tooltipTimeout")) {
      tipTimer = setTimeout(() => { tipExpired = el; hideTileTip(); }, val("tooltipTimeoutMs"));
    }
  });
  document.addEventListener("pointermove", (e) => { if (tipCur) place(e); });
  document.addEventListener("pointerout", (e) => {
    if (tipCur && !tipCur.contains(e.relatedTarget)) hideTileTip();
  });
  document.addEventListener("pointerdown", hideTileTip); // out of the way while clicking/dragging
}

// Themed recent-searches dropdown for a search field, replacing the browser's
// unstyled native autofill. Terms live in ui_texts (DPAPI-encrypted like the rest),
// most-recent first, deduped, capped. Picking one re-runs the field's own search.
function wireSearchSuggest(input, storeKey) {
  if (!input) return;
  input.setAttribute("autocomplete", "off");
  const pop = document.createElement("div");
  pop.className = "search-suggest hidden";
  document.body.appendChild(pop);
  const load = () => {
    try { const a = JSON.parse(settings.ui_texts?.[storeKey] || "[]"); return Array.isArray(a) ? a : []; }
    catch { return []; }
  };
  const remember = (term) => {
    term = term.trim();
    if (term.length < 2 || !flag("searchSuggest")) return;
    const list = load().filter((x) => x.toLowerCase() !== term.toLowerCase());
    list.unshift(term);
    const value = JSON.stringify(list.slice(0, val("searchRecentMax")));
    settings.ui_texts = { ...(settings.ui_texts || {}), [storeKey]: value };
    invoke("set_ui_text", { key: storeKey, value }).catch(() => {});
  };
  const forget = (term) => {
    const value = JSON.stringify(load().filter((x) => x.toLowerCase() !== term.toLowerCase()));
    settings.ui_texts = { ...(settings.ui_texts || {}), [storeKey]: value };
    invoke("set_ui_text", { key: storeKey, value }).catch(() => {});
  };
  const hide = () => pop.classList.add("hidden");
  const show = () => {
    if (!flag("searchSuggest")) { hide(); return; }
    const q = input.value.trim().toLowerCase();
    const items = load().filter((x) => !q || x.toLowerCase().includes(q)).slice(0, val("searchRecentMax"));
    pop.innerHTML = "";
    if (!items.length) { hide(); return; }
    for (const term of items) {
      const row = document.createElement("div");
      row.className = "search-suggest-item";
      const label = document.createElement("span");
      label.className = "search-suggest-text";
      label.textContent = term;
      label.addEventListener("mousedown", (e) => {
        e.preventDefault(); // keep focus so blur-hide doesn't beat the click
        input.value = term;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        remember(term);
        hide();
      });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "search-suggest-del";
      del.textContent = "×";
      del.title = t("delete");
      del.setAttribute("aria-label", t("delete"));
      del.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        forget(term);
        show(); // re-render the shortened list, keeping the popup open
      });
      row.append(label, del);
      pop.appendChild(row);
    }
    // Divide by the body zoom (uiScale): fixed popups live inside the zoomed body.
    const z = uiZoom();
    const r = input.getBoundingClientRect();
    pop.style.left = `${r.left / z}px`;
    pop.style.top = `${(r.bottom + 4) / z}px`;
    pop.style.width = `${r.width / z}px`;
    pop.classList.remove("hidden");
  };
  // Open on an explicit click/type, NOT on the focus the dialog may grab on open.
  input.addEventListener("pointerdown", show);
  input.addEventListener("input", show);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { remember(input.value); hide(); } });
  input.addEventListener("blur", () => { remember(input.value); setTimeout(hide, 120); });
}

// ---- Fullscreen media viewer (lightbox): click a preview to zoom (wheel) + pan
// (drag). Stays inside the app window; X / Escape / backdrop-click close it.
let lbScale = 1, lbX = 0, lbY = 0, lbDrag = null;
function lbMedia() {
  return $("lightbox-img").classList.contains("hidden") ? $("lightbox-video") : $("lightbox-img");
}
function lbApply() {
  lbMedia().style.transform = `translate(${lbX}px, ${lbY}px) scale(${lbScale})`;
  $("lightbox-stage").classList.toggle("zoomed", lbScale > 1);
}
function openLightbox(src, isVideo) {
  if (!src) return;
  lbScale = 1; lbX = 0; lbY = 0;
  const img = $("lightbox-img"), vid = $("lightbox-video");
  img.classList.toggle("hidden", isVideo);
  vid.classList.toggle("hidden", !isVideo);
  if (isVideo) { vid.src = src; vid.play?.().catch(() => {}); }
  else { vid.pause?.(); vid.removeAttribute("src"); img.src = src; }
  lbApply();
  $("lightbox").classList.remove("hidden");
}
function closeLightbox() {
  if ($("lightbox").classList.contains("hidden")) return;
  $("lightbox").classList.add("hidden");
  const vid = $("lightbox-video");
  vid.pause?.(); vid.removeAttribute("src");
  $("lightbox-img").removeAttribute("src");
}
function wireLightbox() {
  const stage = $("lightbox-stage");
  $("lightbox-close").addEventListener("click", closeLightbox);
  // Backdrop click closes only when not zoomed (a zoomed click may be a pan).
  stage.addEventListener("click", (e) => { if (lbScale === 1 && e.target === stage) closeLightbox(); });
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    lbScale = Math.min(8, Math.max(1, lbScale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    if (lbScale === 1) { lbX = 0; lbY = 0; }
    lbApply();
  }, { passive: false });
  stage.addEventListener("pointerdown", (e) => {
    if (lbScale <= 1 || e.target.closest(".lightbox-close")) return;
    lbDrag = { x: e.clientX, y: e.clientY };
    stage.classList.add("grabbing");
    stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!lbDrag) return;
    const z = uiZoom();
    lbX += (e.clientX - lbDrag.x) / z;
    lbY += (e.clientY - lbDrag.y) / z;
    lbDrag.x = e.clientX; lbDrag.y = e.clientY;
    lbApply();
  });
  const endDrag = () => { lbDrag = null; stage.classList.remove("grabbing"); };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
}

function buildTile(p) {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.dataset.id = p.id;
  const raw = p.file_path || p.text || "";
  const preview = PREVIEW_MAX <= 0 ? "" : raw.length > PREVIEW_MAX ? `${raw.slice(0, PREVIEW_MAX)}…` : raw;
  // Themed hover tooltip (rendered by wireTooltips' shared popup, not the native
  // title): stash name + preview on the tile; the popup wraps + grows tall so long
  // prompts read comfortably at a constrained width.
  if (flag("tilePreview")) {
    tile.dataset.tipName = p.name;
    if (preview && preview !== p.name) tile.dataset.tipBody = preview;
  }

  // Media on the tile: stored still, or gif/video from the icon/file path.
  const kind = p.file_path ? mediaKind(p.file_path) : "";
  const iconKind = !p.image && p.icon_path ? mediaKind(p.icon_path) : "";
  const showPath = iconKind ? p.icon_path : p.file_path;
  const showKind = p.image ? "" : iconKind || kind;
  const pathVideo = p.show_image && !p.image && showKind === "video";
  const pathGif = p.show_image && !p.image && showKind === "gif";
  if (p.show_image && (p.image || pathVideo || pathGif)) {
    tile.classList.add("has-image");
    // The chosen color tints the border area around the image.
    if (p.color) {
      tile.style.background = p.color;
      tile.style.borderColor = p.color;
    }
    if (pathVideo) {
      tile.appendChild(getVideoWrap(p, convertFileSrc(showPath)));
      // The control bar only appears while the mouse is in the lower part.
      tile.addEventListener("mousemove", (e) => {
        const r = tile.getBoundingClientRect();
        const zone = Math.max(48, r.height * 0.35);
        // Stay visible while on the bar itself (volume popup reaches higher).
        tile.classList.toggle(
          "media-hover",
          e.clientY > r.bottom - zone || !!e.target.closest(".media-bar")
        );
      });
      tile.addEventListener("mouseleave", () => {
        if (!tile.querySelector(".media-sound.dragging")) {
          tile.classList.remove("media-hover");
        }
      });
    } else {
      const img = document.createElement("img");
      img.className = "tile-img";
      img.src = p.image || convertFileSrc(showPath);
      img.draggable = false;
      tile.appendChild(img);
    }
    // Optional caption overlay (0 = default, 1 = auto-scale, else fixed px).
    if (p.caption && flag("captions")) {
      const cap = document.createElement("span");
      cap.className = "tile-caption";
      cap.textContent = p.caption;
      if (p.caption_size === 1) cap.classList.add("auto");
      else if (p.caption_size > 1) cap.style.fontSize = `${p.caption_size}px`;
      tile.appendChild(cap);
    }
  } else if (p.color) {
    tile.classList.add("tinted");
    tile.style.background = p.color;
    tile.style.borderColor = p.color;
  }

  const name = document.createElement("span");
  name.className = "tile-name";
  name.textContent = p.name;
  // Per-tile style overrides (0 = follow settings, 1 = auto-fit, else fixed).
  if (p.font) name.style.fontFamily = FONTS[p.font] || "";
  if (p.font_size === 1) {
    tile.dataset.fitMode = "auto";
  } else if (p.font_size > 1) {
    name.style.fontSize = `${p.font_size}px`;
    tile.dataset.fitMode = "fixed";
  }
  tile.appendChild(name);

  // Subtle type badge in the top-left corner. It reflects what the button
  // COPIES (file/image/video) — a decorative media icon never changes it.
  const typeIcon = p.file_path
    ? (kind === "video" ? ICON_VIDEO : kind ? ICON_IMAGE : PDF_EXT.test(p.file_path) ? ICON_PDF : ICON_FILE)
    : p.copy_image ? ICON_IMAGE : "";
  if (typeIcon && flag("typeBadges")) {
    const badge = document.createElement("span");
    badge.className = "tile-type";
    badge.innerHTML = typeIcon;
    tile.appendChild(badge);
  }

  // The actions menu (⋯ button + right-click) can be switched off entirely.
  if (flag("tileMenu")) {
    const menuBtn = document.createElement("button");
    menuBtn.className = "tile-menu";
    menuBtn.innerHTML = DOTS;
    menuBtn.title = t("actions");
    menuBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const r = menuBtn.getBoundingClientRect();
      openCtx(p.id, r.left, r.bottom + 4);
    });
    tile.appendChild(menuBtn);
    tile.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCtx(p.id, e.clientX, e.clientY);
    });
  }

  tile.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".tile-menu")) return;
    drag = { id: p.id, startX: e.clientX, startY: e.clientY, moved: false, el: tile };
  });

  // Prompts with an attached file or media icon get a persistent error
  // banner while that file is missing.
  if (p.file_path || p.icon_path) {
    const err = document.createElement("span");
    err.className = "tile-error";
    err.textContent = t("fileMissing");
    tile.appendChild(err);
    if (missingFiles.has(p.id)) tile.classList.add("file-missing");
  }
  if (chainMode) applyChainToTile(tile, p); // keep badges/skip across re-renders
  return tile;
}

// ---- Video tiles: YouTube-style hover bar ----
// Video tiles keep their DOM element across grid re-renders — rebuilding
// would restart playback. Reparenting the cached wrapper does not.
const videoCache = new Map(); // prompt id -> { src, wrap }

function getVideoWrap(p, src) {
  const cached = videoCache.get(p.id);
  if (cached && cached.src === src) return cached.wrap;
  const wrap = document.createElement("div");
  wrap.className = "tile-media";
  const video = document.createElement("video");
  video.className = "tile-video";
  video.src = src;
  video.muted = true;
  video.loop = true;
  video.autoplay = flag("videoAutoplay");
  video.playsInline = true;
  wrap.append(video);
  if (flag("videoControls")) {
    wrap.append(buildMediaBar(video, {
      onChange: (prefs) => invoke("set_video_prefs", { id: p.id, ...prefs }).catch(() => {}),
    }));
  }
  applyVideoPrefs(video, settings.video_prefs?.[p.id]);
  // Ensure a freshly added video actually starts — the autoplay attribute alone
  // can be unreliable for dynamically created elements. Muted videos may play.
  if (flag("videoAutoplay")) video.play().catch(() => {});
  videoCache.set(p.id, { src, wrap });
  return wrap;
}

function pruneVideoCache() {
  for (const id of videoCache.keys()) {
    if (!prompts.some((p) => p.id === id)) videoCache.delete(id);
  }
}

// Looping tile videos pause while the window is hidden (tray/minimised)
// and resume afterwards — manual pauses stay paused.
document.addEventListener("visibilitychange", () => {
  document.querySelectorAll(".tile-video").forEach((v) => {
    if (document.hidden) {
      if (!v.paused) {
        v.pause();
        v.dataset.resume = "1";
      }
    } else if (v.dataset.resume) {
      delete v.dataset.resume;
      v.play().catch(() => {});
    }
  });
});

// ---- Missing-file watcher (every few seconds) ----
let missingFiles = new Set();

async function pollMissingFiles() {
  if (!prompts.some((p) => p.file_path || p.icon_path)) {
    missingFiles.clear();
    return;
  }
  try {
    missingFiles = new Set(await invoke("missing_files"));
    document.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.toggle("file-missing", missingFiles.has(tile.dataset.id));
    });
  } catch {}
}

// ---- Pointer-based drag to any cell ----
function cellAt(x, y) {
  return document.elementFromPoint(x, y)?.closest(".cell") || null;
}

// Track the hovered cell instead of querying all cells on every mousemove.
let hoverCell = null;

function setHoverCell(cell) {
  if (cell === hoverCell) return;
  hoverCell?.classList.remove("drag-over");
  hoverCell = cell;
  hoverCell?.classList.add("drag-over");
}

function endDragVisuals() {
  document.body.classList.remove("drag-active");
  setHoverCell(null);
}

window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  // No reorder while chaining (a click selects) or when reorder is switched off in
  // the expert menu — but always allow finishing a library-placed tile or a
  // favorites-view reorder (reordering favorites is intrinsic to that view).
  if (!drag.moved && (chainMode || (!flag("tileReorder") && !drag.fromLibrary && !favView))) return;
  if (!drag.moved) {
    if (Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD &&
        Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD) return;
    drag.moved = true;
    drag.el.classList.add("dragging");
    document.body.classList.add("drag-active");
    // Dragging out of the library: hide the overlay so the grid is visible.
    if (drag.fromLibrary) libraryEl.classList.add("hidden");
    // Live ghost: a clone of the tile follows the cursor.
    const r = drag.el.getBoundingClientRect();
    drag.offX = drag.startX - r.left;
    drag.offY = drag.startY - r.top;
    drag.ghost = drag.el.cloneNode(true);
    drag.ghost.classList.add("drag-ghost");
    drag.ghost.classList.remove("dragging");
    drag.ghost.style.width = `${r.width}px`;
    drag.ghost.style.height = `${r.height}px`;
    // A cloned <video> would autoplay and decode while following the cursor —
    // that, not the move itself, makes video-tile drags stutter.
    drag.ghost.querySelectorAll("video").forEach((v) => {
      v.removeAttribute("autoplay");
      v.removeAttribute("src");
    });
    // Pause the original too for the duration of the drag.
    drag.el.querySelectorAll("video").forEach((v) => {
      if (!v.paused) {
        v.pause();
        v.dataset.resume = "1";
      }
    });
    document.body.appendChild(drag.ghost);
  }
  drag.ghost.style.transform =
    `translate(${e.clientX - drag.offX}px, ${e.clientY - drag.offY}px)`;
  setHoverCell(cellAt(e.clientX, e.clientY));
});

// Resume videos the drag paused (visibility pauses use the same marker).
function resumeDragVideos(el) {
  el.querySelectorAll("video").forEach((v) => {
    if (v.dataset.resume) {
      delete v.dataset.resume;
      v.play().catch(() => {});
    }
  });
}

window.addEventListener("pointerup", async (e) => {
  if (!drag) return;
  const { id, moved, el, ghost } = drag;
  drag = null;
  ghost?.remove();
  el.classList.remove("dragging");
  resumeDragVideos(el);
  endDragVisuals();

  if (!moved) {
    if (el.classList.contains("tile")) {
      const p = prompts.find((x) => x.id === id);
      if (chainMode) { if (p) await toggleChainPick(p); return; } // pick (asks vars), don't copy
      if (copyOnCooldown(id)) return; // same prompt copied moments ago
      if (p && flag("promptVars") && !p.copy_image && !p.file_path && extractVars(p.text).length) {
        await copyTextWithVars(p, el);
      } else if (await invoke("copy_prompt", { id }).catch((e) => { toast(String(e)); return false; })) {
        showCopied(el);
        recordCopy(id);
      }
    }
    return;
  }
  const cell = cellAt(e.clientX, e.clientY);
  if (!cell) return;
  if (favView) { await placeFav(id, Number(cell.dataset.col), Number(cell.dataset.row)); return; }
  await placeTile(id, Number(cell.dataset.col), Number(cell.dataset.row));
});

window.addEventListener("pointercancel", () => {
  if (drag) {
    drag.el.classList.remove("dragging");
    drag.ghost?.remove();
    resumeDragVideos(drag.el);
  }
  drag = null;
  endDragVisuals();
});

// Apply the expert copy-feedback font + size to a "Copied!" element. copySize 0
// (default) auto-fits the text to the element's button; otherwise a fixed px.
function styleCopyText(el, maxW, maxH, cap) {
  el.style.fontFamily = FONTS[txt("copyFont")] || "";
  const cs = Number(settings.ui_values?.copySize) || 0;
  if (cs > 0) el.style.fontSize = `${cs}px`;
  else fitText(el, maxW, maxH, cap);
}

// Flash + small "Copied!" bubble at the bottom of the tile.
function showCopied(tile) {
  tile.classList.add("copied");
  setTimeout(() => tile.classList.remove("copied"), 350);
  if (!flag("copyBubble")) return; // border flash stays; bubble is optional
  const pop = document.createElement("div");
  pop.className = "copy-pop";
  // Match the fade animation to the (expert-tunable) bubble lifetime so it never
  // gets cut off early or lingers invisibly after the CSS fade ends.
  pop.style.animationDuration = `${BUBBLE_MS}ms`;
  pop.textContent = t("copied");
  tile.appendChild(pop);
  styleCopyText(pop, tile.clientWidth * 0.8, tile.clientHeight * 0.45, 26);
  setTimeout(() => pop.remove(), BUBBLE_MS);
}

// Pure layout move: the tile element is re-parented as-is — its fitted text
// size cannot change and a playing video keeps running. Falls back to a full
// render when the tile isn't in the grid yet (placed from the library).
function moveTileDom(id, col, row) {
  const tile = gridEl.querySelector(`.tile[data-id="${CSS.escape(id)}"]`);
  const target = gridEl.querySelector(`.cell[data-col="${col}"][data-row="${row}"]`);
  if (!tile || !target) return false;
  const source = tile.parentElement;
  if (source === target) return true;
  const occupant = target.firstElementChild;
  if (occupant) source.appendChild(occupant); // swap
  target.appendChild(tile);
  return true;
}

// Place a tile at [col,row]; swaps with the occupant. Renders from local
// state immediately, persistence runs in the background.
async function placeTile(id, col, row) {
  const view = activeView();
  const layout = { ...layoutOf(view) };
  const old = layout[id];
  const occupant = Object.entries(layout).find(
    ([oid, c]) => oid !== id && c[0] === col && c[1] === row
  );
  if (occupant) {
    if (old) layout[occupant[0]] = old;
    else delete layout[occupant[0]];
  }
  layout[id] = [col, row];
  view.layouts[gridKeyOf(view)] = layout;
  invoke("set_layout", { layout }).catch((e) => toast(String(e)));
  if (!moveTileDom(id, col, row)) await renderGrid(true);
}

// ---- Context menu ----
function openCtx(id, x, y) {
  ctxId = id;
  // Reset an armed delete confirmation from a previous open.
  disarmButton(ctxEl.querySelector('[data-act="delete"]'), t("delete"));
  // Hide the floating-button action when that feature is switched off.
  ctxEl.querySelector('[data-act="pin"]').classList.toggle("hidden", !flag("floating"));
  // In the favorites view a prompt can't be hidden/removed — unstar it instead.
  ctxEl.querySelector('[data-act="hide"]').classList.toggle("hidden", favView);
  ctxEl.classList.remove("hidden");
  const w = ctxEl.offsetWidth, h = ctxEl.offsetHeight;
  const z = uiZoom();
  ctxEl.style.left = `${Math.min(x, window.innerWidth - w - 4) / z}px`;
  ctxEl.style.top = `${Math.min(y, window.innerHeight - h - 4) / z}px`;
}
function closeCtx() {
  ctxEl.classList.add("hidden");
  ctxId = null;
}

// ---- Modal ----
// Reusable palette: "no color" + free picker + presets, into any container.
// onPick(hex) for none/preset; onCustom(anchor, current) opens the free picker.
function buildSwatches(container, selected, onPick, onCustom) {
  container.innerHTML = "";
  const isCustom = !!selected && !COLORS.includes(selected);

  const mkSwatch = (cls, bg) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = `swatch ${cls}`.trim();
    if (bg) sw.style.background = bg;
    container.appendChild(sw);
    return sw;
  };

  const none = mkSwatch("none" + (selected === "" ? " sel" : ""));
  none.addEventListener("click", () => onPick(""));

  const custom = mkSwatch("custom" + (isCustom ? " sel" : ""), isCustom ? selected : "");
  custom.addEventListener("click", () => onCustom(custom, isCustom ? selected : ""));

  for (const c of COLORS.slice(1)) {
    const sw = mkSwatch(c === selected ? "sel" : "", c);
    sw.addEventListener("click", () => onPick(c));
  }
}

function renderSwatches(selected) {
  buildSwatches(
    $("color-row"),
    selected,
    (hex) => { modalState.color = hex; renderSwatches(hex); },
    (anchor, cur) => openColorPop(anchor, cur, (hex) => {
      if (!modalState) return;
      modalState.color = hex;
      renderSwatches(hex);
    })
  );
}

// Live caption overlay on the modal media preview — mirrors the on-tile render
// (0 = default size, 1 = auto-scale, else fixed px) so the user sees it as-is.
function updateCaptionPreview() {
  const el = modal.captionPreview;
  if (!el) return;
  const text = modal.caption.value.trim();
  const size = Number(modal.captionSize.value) || 0;
  el.textContent = text;
  el.classList.toggle("hidden", !text);
  el.classList.toggle("auto", size === 1);
  el.style.fontSize = size > 1 ? `${size}px` : "";
}

// Serialized content of the open modal — compared on dismiss to detect edits.
function modalSnapshot() {
  if (!modalState) return "";
  return JSON.stringify([
    modal.name.value, modal.text.value, modal.caption.value, modal.captionSize.value,
    modal.fontSel.value, modal.sizeSel.value, modalState.color || "", modalState.image || "",
    !!modalState.showImage, modalState.filePath || "", modalState.iconPath || "", modal.fav.classList.contains("active"),
  ]);
}

// ---- Prompt variables ({#{placeholder}#}) ----
// The {#{ ... }#} fence is deliberately uncommon so a literal "{{" pasted from a
// code block is never mistaken for a variable.
const VAR_RE = /\{#\{\s*([^}\n]{1,60}?)\s*\}#\}/g;
function extractVars(text) {
  const seen = [];
  for (const m of (text || "").matchAll(VAR_RE)) {
    const k = m[1].trim();
    if (k && !seen.includes(k)) seen.push(k);
  }
  return seen;
}
const fillVars = (text, values) => text.replace(VAR_RE, (_, k) => values[k.trim()] ?? "");

// Fill-in dialog shown when copying a prompt that holds {#{placeholders}#}.
// Resolves a {name: value} map, or null when cancelled.
let varsCleanup = null;
function promptVarsDialog(vars) {
  const root = $("vars-modal");
  $("vars-title").textContent = t("varsTitle");
  const fields = $("vars-fields");
  fields.innerHTML = "";
  // Remembered values are stored globally by variable name (expert: varDefaults).
  const useRemember = flag("varDefaults");
  let remembered = {};
  try { remembered = JSON.parse(settings.ui_texts?.varDefaults || "{}"); } catch (_) { /* ignore */ }
  const inputs = vars.map((name) => {
    const label = document.createElement("label");
    label.className = "field";
    const span = document.createElement("span");
    span.textContent = name;
    const input = document.createElement("input");
    input.className = "modal-input";
    input.type = "text";
    input.dataset.var = name;
    if (useRemember && name in remembered) input.value = remembered[name];
    label.append(span, input);
    if (useRemember) {
      const rem = document.createElement("label");
      rem.className = "vars-remember";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "switch";
      cb.checked = name in remembered;
      cb.dataset.rem = name;
      const rlbl = document.createElement("span");
      rlbl.textContent = t("rememberValue");
      rem.append(cb, rlbl);
      label.appendChild(rem);
    }
    fields.appendChild(label);
    return input;
  });
  // Save/forget remembered values on confirm (never on cancel).
  const persistRemembered = () => {
    if (!useRemember) return;
    const obj = {};
    for (const i of inputs) {
      const cb = fields.querySelector(`input[data-rem="${CSS.escape(i.dataset.var)}"]`);
      if (cb?.checked) obj[i.dataset.var] = i.value;
    }
    const json = JSON.stringify(obj);
    if (json !== JSON.stringify(remembered)) {
      settings.ui_texts = { ...(settings.ui_texts || {}), varDefaults: json };
      invoke("set_ui_text", { key: "varDefaults", value: json }).catch(() => {});
    }
  };
  $("vars-ok").textContent = t("varsCopy");
  $("vars-cancel").textContent = t("cancel");
  varsCleanup?.(null);
  root.classList.remove("hidden");
  inputs[0]?.focus();
  return new Promise((resolve) => {
    const ok = $("vars-ok");
    const cancel = $("vars-cancel");
    const collect = () => Object.fromEntries(inputs.map((i) => [i.dataset.var, i.value]));
    const done = (val) => {
      root.classList.add("hidden");
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      root.removeEventListener("pointerdown", onBg);
      document.removeEventListener("keydown", onKey);
      varsCleanup = null;
      resolve(val);
    };
    const onOk = () => { persistRemembered(); done(collect()); };
    const onCancel = () => done(null);
    const onBg = (e) => { if (e.target === root) done(null); };
    const onKey = (e) => {
      if (e.key === "Escape") done(null);
      else if (e.key === "Enter") { persistRemembered(); done(collect()); }
    };
    varsCleanup = done;
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    root.addEventListener("pointerdown", onBg);
    document.addEventListener("keydown", onKey);
  });
}

// Record a copy for the history/usage journal (backend honours the privacy flag).
const recordCopy = (id) => invoke("record_copy", { id }).catch(() => {});

// Per-prompt copy throttle: block re-copying the SAME prompt within the cooldown
// (expert value, 0 = off). Other prompts are never blocked, so a wrong pick can
// be corrected instantly. Returns true if this copy should be skipped.
const copyTimes = new Map();
const COPY_TIMES_CAP = 256; // sweep entries past the cooldown once the map grows
function copyOnCooldown(id) {
  const ms = val("copyCooldownMs");
  if (!ms) return false;
  const now = Date.now();
  const last = copyTimes.get(id);
  if (last && now - last < ms) return true;
  if (copyTimes.size >= COPY_TIMES_CAP) {
    for (const [k, t0] of copyTimes) if (now - t0 >= ms) copyTimes.delete(k);
  }
  copyTimes.set(id, now);
  return false;
}

// Build a Tauri accelerator ("CommandOrControl+Shift+P") from a keydown event.
// Returns null unless at least one modifier plus a real key was pressed.
function accelFromEvent(e) {
  if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return null;
  const mods = [];
  if (e.ctrlKey) mods.push("CommandOrControl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  if (e.metaKey) mods.push("Super");
  if (!mods.length) return null;
  let key = e.key;
  if (key === " ") key = "Space";
  else if (key.startsWith("Arrow")) key = key.slice(5);
  else if (key.length === 1) key = key.toUpperCase();
  return [...mods, key].join("+");
}

// Turn a stored Tauri accelerator ("CommandOrControl+Shift+P") into a readable,
// localized label ("Strg + Umschalt + P"). Display only — the raw accelerator is
// what stays saved and registered.
const MOD_LABELS = {
  CommandOrControl: () => t("keyCtrl"), Control: () => t("keyCtrl"),
  Shift: () => t("keyShift"),
  Alt: () => "Alt", Option: () => "Alt",
  Super: () => "Win", Meta: () => "Win", Command: () => "Win", Cmd: () => "Win",
};
function prettyAccel(accel) {
  if (!accel) return "";
  return accel.split("+").map((p) => (MOD_LABELS[p] ? MOD_LABELS[p]() : p)).join(" + ");
}

// Copy a text prompt after filling its placeholders.
async function copyTextWithVars(p, el) {
  const values = await promptVarsDialog(extractVars(p.text));
  if (!values) return;
  const ok = await invoke("copy_text", { text: fillVars(p.text, values) })
    .catch((e) => { toast(String(e)); return false; });
  if (ok) { showCopied(el); recordCopy(p.id); }
}

// ---- Keyboard navigation: arrow keys move a focus ring across the grid,
// Enter/Space copies the focused tile (feature-gated by keyboardNav).
let kbFocus = null;
function focusTile(id) {
  kbFocus = id;
  for (const el of gridEl.querySelectorAll(".tile")) el.classList.toggle("kb-focus", el.dataset.id === id);
  gridEl.querySelector(`.tile[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
}
function moveKbFocus(dc, dr) {
  const layout = layoutOf(activeView());
  const cells = Object.entries(layout);
  if (!cells.length) return;
  if (!kbFocus || !layout[kbFocus]) { focusTile(cells[0][0]); return; }
  const [cc, cr] = layout[kbFocus];
  let best = null;
  let bestD = Infinity;
  for (const [id, [col, row]] of cells) {
    if (id === kbFocus) continue;
    const inDir = (dc > 0 && col > cc) || (dc < 0 && col < cc) || (dr > 0 && row > cr) || (dr < 0 && row < cr);
    if (!inDir) continue;
    // Prefer the same row/column: penalise the off-axis distance heavily.
    const d = dc ? Math.abs(col - cc) + Math.abs(row - cr) * 4 : Math.abs(row - cr) + Math.abs(col - cc) * 4;
    if (d < bestD) { bestD = d; best = id; }
  }
  if (best) focusTile(best);
}
async function activateTile(id) {
  const p = prompts.find((x) => x.id === id);
  if (!p) return;
  const el = gridEl.querySelector(`.tile[data-id="${CSS.escape(id)}"]`);
  if (chainMode) { await toggleChainPick(p); return; }
  if (copyOnCooldown(id)) return;
  if (flag("promptVars") && !p.copy_image && !p.file_path && extractVars(p.text).length) {
    await copyTextWithVars(p, el);
  } else if (await invoke("copy_prompt", { id }).catch((e) => { toast(String(e)); return false; })) {
    if (el) showCopied(el);
    recordCopy(id);
  }
}

function openModal({ mode, id, name = "", text = "", color = "", image = "", showImage = false, copyImage = false, filePath = "", iconPath = "", caption = "", captionSize = 0, font = "", fontSize = 0, favorite = false, title }) {
  modalState = { mode, id, color, image, showImage, copyImage, filePath, iconPath };
  modal.title.textContent = title;
  modal.fav.classList.toggle("active", !!favorite);
  modal.fav.setAttribute("aria-pressed", String(!!favorite));
  modal.name.value = name;
  modal.text.value = text;
  modal.caption.value = caption;
  modal.captionSize.value = String(normSize(captionSize) || 0);
  updateCaptionPreview();
  // Per-tile style overrides, available when creating and editing.
  modal.fontSel.value = font;
  modal.sizeSel.value = String(normSize(fontSize));
  modal.delete.classList.toggle("hidden", mode !== "edit");
  disarmButton(modal.delete, t("delete"));
  renderSwatches(color);
  // Show the dialog before wiring the preview so the <video>/<img> decode and
  // lay out in a visible context (a hidden element never renders a first frame).
  modal.root.classList.remove("hidden");
  syncModalImageUi(mode);
  modalInitial = modalSnapshot();
  modal.name.focus();
  modal.name.select();
}

// Keep all image/file modal controls consistent with modalState.
function syncModalImageUi(mode) {
  const { image, showImage, copyImage, filePath, iconPath } = modalState;
  const kind = filePath ? mediaKind(filePath) : "";
  const iconKind = !image && iconPath ? mediaKind(iconPath) : "";
  // Any media file previews straight from its path (image/gif/video) — so an
  // image still shows even when the backend preview re-encode returned nothing.
  const fileMedia = !image && !iconKind && !!kind;
  const hasPreview = !!image || !!iconKind || fileMedia;
  // Image and file prompts have no text field — the name doubles as the copy text.
  // Plain text prompts expose it on create (review before saving) and edit.
  const textVisible = (mode === "edit" || mode === "create") && !copyImage && !filePath;
  // Full-height dialog only when editing a text prompt (max textarea space).
  modal.root.classList.toggle("tall", textVisible);
  modal.text.classList.toggle("hidden", !textVisible);
  modal.textBar.classList.toggle("hidden", !(textVisible && flag("promptVars")));
  modal.varsHint.classList.toggle("hidden", !(textVisible && flag("promptVars")));
  modal.name.placeholder = filePath
    ? t(kind === "video" ? "videoNamePh" : kind ? "imageNamePh" : "fileNamePh")
    : copyImage ? t("imageNamePh") : t("namePh");
  modal.imgWrap.classList.toggle("hidden", !hasPreview);
  modal.addIcon.classList.toggle("hidden", hasPreview);
  // "Replace media" always available next to "Remove media"; only the image
  // of a clipboard-image prompt cannot be removed (it IS the prompt).
  modal.removeImg.classList.toggle("hidden", copyImage);
  if (hasPreview) {
    const previewPath = iconKind ? iconPath : filePath;
    const isVideo = !image && mediaKind(previewPath) === "video";
    modal.img.classList.toggle("hidden", isVideo);
    modal.video.classList.toggle("hidden", !isVideo);
    if (isVideo) {
      modal.video.src = convertFileSrc(previewPath);
      modal.video.load();
      modal.video.play().catch(() => {}); // show a frame even if autoplay is held
    } else {
      // Prefer the re-encoded preview; fall back to the raw file, and if even
      // that fails to decode, ask the backend for a data URL once.
      modal.img.onerror = () => {
        modal.img.onerror = null;
        loadFilePreview(previewPath).then((d) => { if (d) modal.img.src = d; });
      };
      modal.img.src = image || convertFileSrc(previewPath);
      modal.video.removeAttribute("src");
    }
    modal.showImage.classList.toggle("active", showImage);
    modal.showText.classList.toggle("active", !showImage);
  } else {
    modal.video.removeAttribute("src");
  }
  modal.fileWrap.classList.toggle("hidden", !filePath);
  const fileHint = $("modal-file-hint");
  fileHint.classList.toggle("hidden", !filePath);
  fileHint.textContent = t(optFlag("storeFiles") ? "fileHintStored" : "fileHint");
  if (filePath) {
    $("modal-file-icon").innerHTML = PDF_EXT.test(filePath) ? ICON_PDF : ICON_FILE;
    modal.fileName.textContent = filePath.split(/[\\/]/).pop();
    modal.fileName.title = filePath;
  }
}

// One native dialog at a time: ignore further requests until it is closed
// (the dialog is also window-modal on the backend side).
let dialogBusy = false;
async function withDialog(fn) {
  if (dialogBusy) return null;
  dialogBusy = true;
  try {
    return await fn();
  } finally {
    dialogBusy = false;
  }
}

const PDF_EXT = /\.pdf$/i;
async function loadFilePreview(path) {
  // A PDF gets its first page rendered as the preview image.
  if (PDF_EXT.test(path)) {
    return (await invoke("pdf_preview", { path }).catch(() => "")) || "";
  }
  if (!IMAGE_EXT.test(path)) return "";
  return (await invoke("load_image_file", { path }).catch(() => "")) || "";
}

// Build a file-attach prompt from a path. Image, gif, video and PDF
// attachments behave like media prompts; a PDF shows its rendered first page
// but still copies the file on click.
async function openFileCreate(path) {
  const kind = mediaKind(path);
  const isPdf = PDF_EXT.test(path);
  const image = await loadFilePreview(path);
  openModal({
    mode: "file-create",
    title: t(kind === "video" ? "videoModalTitle" : kind || isPdf ? "imageModalTitle" : "fileModalTitle"),
    name: path.split(/[\\/]/).pop(),
    filePath: path,
    image,
    showImage: !!kind || (isPdf && !!image),
  });
}

// Left click: open the file dialog directly.
async function startFileCreate() {
  await withDialog(async () => {
    const path = await invoke("pick_file_path");
    if (path) await openFileCreate(path);
  });
}

// Right click: take a file from the clipboard (not text) — a copied file, or a
// copied image (screenshot) kept as a new file.
async function startFileFromClipboard() {
  await withDialog(async () => {
    const path = await invoke("get_clipboard_file_path").catch(() => "");
    if (path) { await openFileCreate(path); return; }
    const clipImg = await invoke("get_clipboard_image").catch(() => "");
    if (clipImg) {
      openModal({ mode: "image-create", title: t("imageModalTitle"), name: t("filterImage"), image: clipImg, showImage: true, copyImage: true });
      return;
    }
    toast(t("noClipboardFile"));
  });
}
function closeModal() {
  closeColorPop();
  modal.root.classList.add("hidden");
  modal.video.removeAttribute("src"); // stop a playing preview
  modalState = null;
  modalInitial = "";
}

// Themed yes/no dialog. Resolves true on confirm, false on cancel / dismiss.
let confirmCleanup = null;
function confirmDialog({ title, message, confirmLabel, cancelLabel }) {
  const root = $("confirm-modal");
  $("confirm-title").textContent = title;
  $("confirm-msg").textContent = message;
  const ok = $("confirm-ok");
  const cancel = $("confirm-cancel");
  ok.textContent = confirmLabel;
  cancel.textContent = cancelLabel || t("cancel");
  confirmCleanup?.(false); // resolve any stale dialog first
  root.classList.remove("hidden");
  return new Promise((resolve) => {
    const done = (val) => {
      root.classList.add("hidden");
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      root.removeEventListener("pointerdown", onBg);
      confirmCleanup = null;
      resolve(val);
    };
    const onOk = () => done(true);
    const onCancel = () => done(false);
    const onBg = (e) => { if (e.target === root) done(false); };
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    root.addEventListener("pointerdown", onBg);
    confirmCleanup = done;
    ok.focus();
  });
}

// Ask before dismissing the modal via the background. A new save dialog (text,
// image, file, screenshot) always holds unsaved work; an edit only when changed.
async function confirmDiscardIfDirty() {
  if (!flag("confirmDiscard")) return true;
  const isNew = modalState && modalState.mode !== "edit";
  if (!isNew && modalSnapshot() === modalInitial) return true;
  return confirmDialog({
    title: t("discardTitle"),
    message: t("discardMsg"),
    confirmLabel: t("discardConfirm"),
    cancelLabel: t("keepEditing"),
  });
}

function startCreate() {
  const text = inputEl.value.trim();
  if (!text) return;
  // Carry the composed text into the dialog so it can be reviewed/edited (and
  // previewed as Markdown) before saving.
  openModal({ mode: "create", text, title: t("nameModalTitle") });
}

async function confirmModal() {
  if (!modalState) return;
  const name = modal.name.value.trim();
  if (!name) { modal.name.focus(); return; }

  const color = modalState.color || "";
  const image = modalState.image || "";
  const filePath = modalState.filePath || "";
  const iconPath = modalState.iconPath || "";
  const caption = modal.caption.value.trim();
  const captionSize = Number(modal.captionSize.value) || 0;
  const font = modal.fontSel.value;
  const fontSize = Number(modal.sizeSel.value) || 0;
  const favorite = modal.fav.classList.contains("active");
  // NOTE: Tauri expects camelCase keys for snake_case Rust args.
  // Path media (gif/video icon or attachment) shows without a stored image.
  const showImage =
    image || mediaKind(filePath) || mediaKind(iconPath) ? modalState.showImage : false;
  const copyImage = image ? modalState.copyImage : false;
  try {
    if (modalState.mode === "create") {
      const text = modal.text.value.trim();
      if (!text) { closeModal(); return; }
      await invoke("add_prompt", { name, text, color, image, showImage, copyImage, filePath, iconPath, caption, captionSize, font, fontSize, favorite });
      inputEl.value = "";
      autoGrow(inputEl);
      saveBtn.disabled = true;
    } else if (modalState.mode === "image-create" || modalState.mode === "file-create") {
      // The name doubles as the copy text when shown as text.
      await invoke("add_prompt", { name, text: name, color, image, showImage, copyImage, filePath, iconPath, caption, captionSize, font, fontSize, favorite });
    } else {
      const text = copyImage || filePath ? name : modal.text.value;
      await invoke("update_prompt", { id: modalState.id, name, text, color, image, showImage, copyImage, filePath, iconPath, caption, captionSize, font, fontSize, favorite });
    }
  } catch (err) {
    toast(String(err)); // keep the modal open so nothing typed is lost
    return;
  }
  closeModal();
  await renderGrid();
  pollMissingFiles(); // a replaced file clears the error immediately
  if (!libraryEl.classList.contains("hidden")) renderLibrary();
}

async function editPrompt(id) {
  const p = await invoke("get_prompt", { id });
  if (p) {
    const kind = p.file_path ? mediaKind(p.file_path) : "";
    openModal({
      mode: "edit",
      id,
      name: p.name,
      text: p.text,
      color: p.color || "",
      image: p.image || "",
      showImage: p.show_image || false,
      copyImage: p.copy_image || false,
      filePath: p.file_path || "",
      iconPath: p.icon_path || "",
      caption: p.caption || "",
      captionSize: p.caption_size || 0,
      font: p.font || "",
      fontSize: p.font_size || 0,
      favorite: p.favorite || false,
      title: p.file_path
        ? t(kind === "video" ? "videoEditTitle" : kind ? "imageEditTitle" : "fileEditTitle")
        : p.copy_image ? t("imageEditTitle") : t("editModalTitle"),
    });
  }
}

// ---- Prompt library (all prompts, click to edit) ----
// Classify a prompt for the library type filter / thumbnails.
function promptType(p) {
  if (PDF_EXT.test(p.file_path)) return "pdf";
  const kind = p.file_path ? mediaKind(p.file_path) : p.icon_path ? mediaKind(p.icon_path) : "";
  if (kind === "video") return "video";
  if (kind === "image" || kind === "gif") return "image";
  if (p.copy_image && p.image) return "image";
  if (p.file_path) return "file";
  return "text";
}

// Library display name: fall back to a type label ("Bild" etc.) so saved
// images/screenshots/files are never shown blank.
const LIB_TYPE_LABEL = { image: "filterImage", video: "filterVideo", pdf: "filterPdf", file: "filterFile" };
function libLabel(p) {
  if (p.name) return p.name;
  const key = LIB_TYPE_LABEL[promptType(p)];
  return key ? t(key) : p.text;
}

// Best preview source for a prompt's library thumbnail; "" = no image.
function thumbSrc(p) {
  if (p.image) return p.image;
  const path = mediaKind(p.file_path) === "image" || mediaKind(p.file_path) === "gif"
    ? p.file_path
    : mediaKind(p.icon_path) === "image" || mediaKind(p.icon_path) === "gif"
      ? p.icon_path
      : "";
  return path ? convertFileSrc(path) : "";
}

function videoSrc(p) {
  if (mediaKind(p.file_path) === "video") return p.file_path;
  if (mediaKind(p.icon_path) === "video") return p.icon_path;
  return "";
}

// Only the videos currently scrolled into view play — keeps a long list cheap.
// Library and journal each get their own observer so opening one panel never
// pauses the other's still-mounted video thumbnails.
let _libObs = null;
let _journalObs = null;
let _activeVidObs = null; // observer the current render attaches new videos to
function makeVideoObserver() {
  return new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) e.target.play().catch(() => {});
      else e.target.pause();
    }
  }, { threshold: 0.1 });
}

function thumbDot(p) {
  const dot = document.createElement("span");
  dot.className = "dot";
  if (p.color) dot.style.background = p.color;
  return dot;
}

// Shared row preview for library + journal: a looping muted inline video for
// video prompts, an image for image/gif/stored-image prompts, else a color dot.
function thumbEl(p) {
  if (!flag("imagePreview")) return thumbDot(p);
  const vsrc = flag("libraryVideoPreview") ? videoSrc(p) : "";
  if (vsrc) {
    const v = document.createElement("video");
    v.className = "lib-thumb";
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.draggable = false;
    v.src = convertFileSrc(vsrc);
    if (_activeVidObs) _activeVidObs.observe(v);
    v.addEventListener("click", (e) => { e.stopPropagation(); openLightbox(v.src, true); });
    return v;
  }
  const src = thumbSrc(p);
  if (src) {
    const img = document.createElement("img");
    img.className = "lib-thumb";
    img.src = src;
    img.draggable = false;
    img.addEventListener("click", (e) => { e.stopPropagation(); openLightbox(img.src, false); });
    return img;
  }
  return thumbDot(p);
}

function setLibType(type) {
  libType = type;
  setActiveFilter($("library-types"), ".lib-type", "type", type);
}

function libMatches(p) {
  if (libFav && !p.favorite) return false;
  if (libType !== "all" && promptType(p) !== libType) return false;
  if (libColor !== "all" && (p.color || "") !== libColor) return false;
  const q = libQuery.trim().toLowerCase();
  if (!q) return true;
  return [p.name, p.text, p.file_path].some((s) => (s || "").toLowerCase().includes(q));
}

// Color-filter dots (once per wrap). "All" + every palette color. Shared by the
// library and the copy-history journal.
function buildColorFilter(wrap, current) {
  if (!wrap || wrap.childElementCount) return; // built once; refreshColorUI clears first
  const mk = (color, cls) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `lib-color ${cls}`.trim();
    b.dataset.color = color;
    if (color && color !== "all") b.style.background = color;
    if (color === current) b.classList.add("active");
    return b;
  };
  wrap.appendChild(mk("all", "lib-color-all"));
  for (const c of COLORS) if (c) wrap.appendChild(mk(c, ""));
}
function setActiveFilter(wrap, selector, attr, value) {
  for (const b of wrap.querySelectorAll(selector)) {
    b.classList.toggle("active", b.dataset[attr] === value);
  }
}
function setLibColor(color) {
  libColor = color;
  setActiveFilter($("library-colors"), ".lib-color", "color", color);
}

function renderLibrary() {
  const list = $("library-list");
  list.innerHTML = "";
  syncLibraryCols();
  if (_libObs) _libObs.disconnect();
  _libObs = makeVideoObserver();
  _activeVidObs = _libObs;
  const anyLibFilter = flag("librarySearch") || flag("libraryTypeFilter") || flag("colorFilter") || flag("favorites");
  $("library-search").classList.toggle("hidden", !prompts.length || !anyLibFilter);
  if (!prompts.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = t("libraryEmpty");
    list.appendChild(empty);
    return;
  }
  // Hidden filters keep their default state, so this is inert when they are off.
  const items = prompts.filter(libMatches);
  // Favorites float to the top (stable otherwise) when the feature is on.
  if (flag("favorites")) items.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = t("libraryNoResults");
    list.appendChild(empty);
    return;
  }
  const placed = new Set(Object.keys(layoutOf(activeView())));
  for (const p of items) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "lib-item";
    row.title = t("copy");

    const body = document.createElement("span");
    body.className = "lib-body";
    const name = document.createElement("span");
    name.className = "lib-name";
    name.textContent = libLabel(p);
    const text = document.createElement("span");
    text.className = "lib-text";
    text.textContent = p.file_path || p.text;
    body.append(name, text);

    // Per-type preview: video plays inline, image/gif as a thumbnail, else a dot.
    row.append(thumbEl(p), body);

    // Place on the current layout: drag the row onto the grid, or one click.
    row.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest(".lib-add, .lib-edit, .lib-fav")) return;
      drag = { id: p.id, startX: e.clientX, startY: e.clientY, moved: false, el: row, fromLibrary: true };
    });
    // Add-to-view icon (leftmost of the action group): place on the current layout.
    if (!placed.has(p.id)) {
      const add = document.createElement("span");
      add.className = "icon-btn lib-add";
      add.title = t("addToLayout");
      add.innerHTML = GRID_PLUS;
      add.addEventListener("pointerdown", (e) => e.stopPropagation());
      add.addEventListener("click", async (e) => {
        e.stopPropagation();
        const view = activeView();
        const occupied = new Map(
          Object.entries(layoutOf(view)).map(([id, c]) => [cellKey(...c), id])
        );
        const free = firstFree(occupied, view.cols, view.rows);
        if (!free) { toast(t("gridFull")); return; }
        await placeTile(p.id, free[0], free[1]);
        renderLibrary();
      });
      row.appendChild(add);
    }
    // Star (middle): mark/unmark this prompt as a favorite (feature-gated).
    if (flag("favorites")) {
      const fav = document.createElement("span");
      fav.className = "icon-btn lib-fav" + (p.favorite ? " active" : "");
      fav.textContent = "★";
      fav.title = t(p.favorite ? "favoriteRemove" : "favoriteAdd");
      fav.addEventListener("pointerdown", (e) => e.stopPropagation());
      fav.addEventListener("click", async (e) => {
        e.stopPropagation();
        p.favorite = !p.favorite;
        try { await invoke("set_favorite", { id: p.id, favorite: p.favorite }); } catch (err) { toast(String(err)); }
        renderLibrary();
        if (favView) renderGrid(true); // favorites grid updates live underneath
      });
      row.appendChild(fav);
    }
    // Edit icon (rightmost): opens the edit dialog without copying.
    const edit = document.createElement("span");
    edit.className = "icon-btn lib-edit";
    edit.title = t("edit");
    edit.innerHTML = ICON_EDIT;
    edit.addEventListener("pointerdown", (e) => e.stopPropagation());
    edit.addEventListener("click", (e) => { e.stopPropagation(); editPrompt(p.id); });
    row.appendChild(edit);

    // Click copies the prompt; optionally closes the library afterwards.
    row.addEventListener("click", () => libraryCopy(p));
    list.appendChild(row);
  }
}

// Copy a prompt from the library (handles {{variables}}), then optionally close.
// Copy a prompt, asking for {{variables}} first when applicable. Returns false
// if the copy failed or the user cancelled the variable dialog. Shared by the
// library and the copy-history journal so both honour variable prompts.
async function copyResolved(p) {
  const useVars = flag("promptVars") && !p.copy_image && !p.file_path && extractVars(p.text).length;
  if (useVars) {
    const values = await promptVarsDialog(extractVars(p.text));
    if (!values) return false;
    return invoke("copy_text", { text: fillVars(p.text, values) }).catch(() => false);
  }
  return invoke("copy_prompt", { id: p.id }).catch((e) => { toast(String(e)); return false; });
}

async function libraryCopy(p) {
  if (copyOnCooldown(p.id)) return;
  if (!(await copyResolved(p))) return;
  recordCopy(p.id);
  toast(t("copied"));
  if (flag("closeAfterCopy")) libraryEl.classList.add("hidden");
}

// Reflect the close-after-copy flag on the library header toggle.
function syncLibraryToggle() {
  const btn = $("library-close-toggle");
  const on = flag("closeAfterCopy");
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", String(on));
  btn.classList.toggle("hidden", !flag("libraryCloseToggle"));
}

// Library list columns: a user-chosen count (1 = one wide column by default), with
// the number of options set by the libraryMaxCols expert value.
const libCols = () => {
  const n = parseInt(settings.ui_texts?.libCols, 10) || 1;
  return Math.min(Math.max(1, n), val("libraryMaxCols"));
};
async function setLibCols(n) {
  const value = String(n);
  if ((settings.ui_texts?.libCols || "1") === value) return;
  settings.ui_texts = { ...(settings.ui_texts || {}), libCols: value };
  try { await invoke("set_ui_text", { key: "libCols", value }); } catch (err) { toast(String(err)); }
  syncLibraryCols();
}
// Rebuild the 1..max segmented toggle and apply the current column count.
function syncLibraryCols() {
  const max = val("libraryMaxCols");
  const cur = libCols();
  $("library-list").style.setProperty("--lib-cols", cur);
  const seg = $("lib-cols-seg");
  seg.innerHTML = "";
  for (let n = 1; n <= max; n++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seg-btn" + (n === cur ? " active" : "");
    b.textContent = String(n);
    b.setAttribute("aria-label", `${n} ${t("libraryColumns")}`);
    b.addEventListener("click", () => setLibCols(n));
    seg.appendChild(b);
  }
}

// ---- Copy history & usage journal ----

function journalRow(p, subtitle, onClick, subtitle2) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "lib-item";
  row.title = t("copy");
  const body = document.createElement("span");
  body.className = "lib-body";
  const name = document.createElement("span");
  name.className = "lib-name";
  name.textContent = libLabel(p);
  body.append(name);
  if (subtitle) {
    const text = document.createElement("span");
    text.className = "lib-text";
    text.textContent = subtitle;
    body.append(text);
  }
  if (subtitle2 && typeof subtitle2 === "object") {
    // Two-part sub-line: left text + right text on one row (e.g. time + count).
    const sub = document.createElement("span");
    sub.className = "lib-sub lib-subrow";
    const l = document.createElement("span");
    l.textContent = subtitle2.left || "";
    const r = document.createElement("span");
    r.className = "lib-sub-right";
    r.textContent = subtitle2.right || "";
    sub.append(l, r);
    body.append(sub);
  } else if (subtitle2) {
    const sub = document.createElement("span");
    sub.className = "lib-sub";
    sub.textContent = subtitle2;
    body.append(sub);
  }
  row.append(thumbEl(p), body);
  row.addEventListener("click", onClick);
  return row;
}

// Format a unix-seconds copy timestamp for the history column.
const fmtCopyTime = (ts) => {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString(LANG, { dateStyle: "short", timeStyle: "short" });
};

function journalMatches(p) {
  if (journalType !== "all" && promptType(p) !== journalType) return false;
  if (journalColor !== "all" && (p.color || "") !== journalColor) return false;
  const q = journalQuery.trim().toLowerCase();
  if (!q) return true;
  return [p.name, p.text, p.file_path].some((s) => (s || "").toLowerCase().includes(q));
}

function setJournalType(type) {
  journalType = type;
  setActiveFilter($("journal-types"), ".lib-type", "type", type);
}
function setJournalColor(color) {
  journalColor = color;
  setActiveFilter($("journal-colors"), ".lib-color", "color", color);
}

let journalLog = []; // cached newest copy events; refetched only on open/group/copy
let journalRecentRev = false; // recently-copied sorted oldest-first
let journalUsedRev = false; // most-used sorted least-first

// Refetch the copy log (the query changes: open, grouped toggle, after a copy).
async function loadJournal() {
  const grouped = flag("historyGrouped");
  journalLog = await invoke("recent_copies", { limit: val("journalLimit"), grouped }).catch(() => []);
  renderJournal();
}

// Render from the cached log. Filters run client-side, so typing in the search
// box re-renders instantly without an IPC roundtrip (and without a render race).
function renderJournal() {
  const body = $("journal-body");
  if (_journalObs) _journalObs.disconnect();
  _journalObs = makeVideoObserver();
  _activeVidObs = _journalObs;
  const byId = new Map(prompts.map((p) => [p.id, p]));
  const grouped = flag("historyGrouped");
  const showTime = flag("historyTimestamps");
  let recent = journalLog
    .map((e) => [byId.get(e.id), e.ts])
    .filter(([p]) => p && journalMatches(p));
  if (journalRecentRev) recent = recent.slice().reverse();
  // Most used: copy count + last-used timestamp, busiest first (or least-first).
  const lastUsed = settings.last_used || {};
  const used = Object.entries(settings.usage || {})
    .map(([id, n]) => [byId.get(id), n, lastUsed[id] || 0])
    .filter(([p]) => p && journalMatches(p))
    .sort((a, b) => (journalUsedRev ? a[1] - b[1] : b[1] - a[1]))
    .slice(0, 20);
  body.innerHTML = "";
  const copyAgain = (p) => async () => {
    if (copyOnCooldown(p.id)) return; // same prompt copied moments ago
    if (await copyResolved(p)) { // handles {{variables}} like the library does
      await recordCopy(p.id); // await: the log must refetch AFTER the copy is recorded
      toast(t("copied"));
      settings = await invoke("get_settings");
      await loadJournal();
    }
  };
  // `rows` items are [prompt, subtitle, subtitle2?]. `extra` is an optional
  // control rendered to the right of the column title.
  const column = (titleKey, rows, extra, cls) => {
    const col = document.createElement("div");
    col.className = "journal-col" + (cls ? " " + cls : "");
    const head = document.createElement("div");
    head.className = "lib-section journal-head";
    const title = document.createElement("span");
    title.textContent = t(titleKey);
    head.append(title);
    if (extra) head.append(extra);
    col.appendChild(head);
    if (!rows.length) {
      const e = document.createElement("div");
      e.className = "hint";
      e.textContent = t("journalEmpty");
      col.appendChild(e);
    } else {
      for (const [p, sub, sub2] of rows) col.appendChild(journalRow(p, sub, copyAgain(p), sub2));
    }
    return col;
  };
  // Reverse-sort arrow for a column title (▼ newest/most first, ▲ reversed).
  const sortBtn = (rev, onClick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "journal-sort" + (rev ? " rev" : "");
    b.textContent = rev ? "▲" : "▼";
    b.title = t("sortToggle");
    b.setAttribute("aria-label", t("sortToggle"));
    b.addEventListener("click", onClick);
    return b;
  };
  const headExtras = (...nodes) => {
    const s = document.createElement("span");
    s.className = "journal-head-extras";
    for (const n of nodes) if (n) s.append(n);
    return s;
  };
  // Toggle beside the "recently copied" title: group repeats vs show every copy.
  let groupBtn = null;
  if (flag("journalGroupBtn")) {
    groupBtn = document.createElement("button");
    groupBtn.type = "button";
    groupBtn.className = "journal-toggle" + (grouped ? " active" : "");
    groupBtn.textContent = t("journalGrouped");
    groupBtn.title = t("journalGrouped");
    groupBtn.setAttribute("aria-pressed", String(grouped));
    groupBtn.addEventListener("click", async () => {
      const next = !grouped;
      settings.ui_flags = { ...(settings.ui_flags || {}), historyGrouped: next };
      try { await invoke("set_ui_flag", { key: "historyGrouped", enabled: next }); } catch (err) { toast(String(err)); }
      await loadJournal(); // grouping changes the query → refetch
    });
  }
  const recentSort = flag("journalRecentSort")
    ? sortBtn(journalRecentRev, () => { journalRecentRev = !journalRecentRev; renderJournal(); })
    : null;
  const usedSort = flag("journalUsedSort")
    ? sortBtn(journalUsedRev, () => { journalUsedRev = !journalUsedRev; renderJournal(); })
    : null;
  body.append(
    column("recentlyCopied", recent.map(([p, ts]) => [p, showTime ? fmtCopyTime(ts) : ""]), headExtras(groupBtn, recentSort), "journal-col-recent"),
    column("mostUsed", used.map(([p, n, ts]) => [
      p,
      "",
      // One sub-line: last-used time on the left, copy count on the right.
      { left: showTime && ts ? fmtCopyTime(ts) : "", right: t("usedTimes").replace("{n}", n) },
    ]), headExtras(usedSort), "journal-col-used"),
  );
}

async function openJournal() {
  settings = await invoke("get_settings");
  journalQuery = "";
  if ($("journal-q")) $("journal-q").value = "";
  setJournalType("all");
  setJournalColor("all");
  // Hide the whole filter bar when every filter is switched off (expert menu).
  const anyFilter = flag("journalSearch") || flag("journalTypeFilter") || flag("journalColorFilter");
  $("journal-search").classList.toggle("hidden", !anyFilter);
  await loadJournal();
  $("journal").classList.remove("hidden");
  if (flag("journalSearch") && optFlag("searchAutofocus")) $("journal-q").focus();
}


// ---- Settings: views editor ----
function renderViewsEditor() {
  const editor = $("views-editor");
  editor.innerHTML = "";
  for (const v of settings.views) {
    const row = document.createElement("div");
    row.className = "view-row";

    const input = document.createElement("input");
    input.className = "modal-input";
    input.type = "text";
    input.maxLength = 30;
    input.value = v.name;
    input.placeholder = t("viewNamePh");
    input.addEventListener("change", async () => {
      settings = await invoke("rename_view", { id: v.id, name: input.value });
      renderViews();
      renderViewsEditor();
    });
    row.appendChild(input);

    // Per-view grid size (columns × rows), applied on change.
    const grid = document.createElement("span");
    grid.className = "view-grid";
    const mkNum = (value) => {
      const n = document.createElement("input");
      n.className = "grid-mini";
      n.type = "number";
      n.min = 1;
      n.max = val("gridMax");
      n.value = value;
      return n;
    };
    const colsIn = mkNum(v.cols);
    const rowsIn = mkNum(v.rows);
    const applyGrid = async () => {
      const cols = clampGrid(colsIn.value, v.cols);
      const rows = clampGrid(rowsIn.value, v.rows);
      settings = await invoke("set_view_grid", { id: v.id, cols, rows });
      renderViewsEditor();
      if (v.id === settings.active_view) await renderGrid(true);
    };
    attachGridPicker(colsIn, applyGrid);
    attachGridPicker(rowsIn, applyGrid);
    const times = document.createElement("span");
    times.className = "times";
    times.textContent = "×";
    grid.append(colsIn, times, rowsIn);
    row.appendChild(grid);

    // Per-view tab color: a swatch dot opening the preset palette.
    const colorDot = document.createElement("button");
    colorDot.type = "button";
    colorDot.className = "swatch view-color-dot" + (v.color ? "" : " none");
    if (v.color) colorDot.style.background = v.color;
    colorDot.title = t("viewColor");
    colorDot.addEventListener("click", () => {
      openSwatchPop(colorDot, v.color || "", async (hex) => {
        settings = await invoke("set_view_color", { id: v.id, color: hex });
        renderViews();
        renderViewsEditor();
      });
    });
    row.appendChild(colorDot);

    if (settings.views.length > 1) {
      const del = document.createElement("button");
      del.className = "icon-btn";
      del.innerHTML = CROSS;
      del.title = t("delete");
      // Two-step confirm: first click arms (red), second click deletes.
      del.addEventListener("click", async () => {
        if (!del.classList.contains("confirm")) {
          del.classList.add("confirm");
          del.title = `${t("delete")}?`;
          setTimeout(() => {
            del.classList.remove("confirm");
            del.title = t("delete");
          }, DISARM_MS);
          return;
        }
        try {
          settings = await invoke("delete_view", { id: v.id });
          renderViewsEditor();
          await renderGrid(true);
        } catch (err) {
          toast(String(err));
        }
      });
      row.appendChild(del);
    }
    editor.appendChild(row);
  }
  // At the limit the add button disappears entirely.
  $("view-add").classList.toggle("hidden", settings.views.length >= val("maxViews"));
}

// ---- Settings actions ----
async function runExport(format) {
  try {
    await withDialog(() => invoke("export_prompts", { format }));
  } catch (err) {
    if (String(err) !== "canceled") toast(t("exportFailed"));
  }
}

async function runImport() {
  try {
    const count = await withDialog(() => invoke("import_prompts"));
    if (count == null) return;
    await renderGrid(); // refreshes prompts AND settings
    // Imported preferences apply on the spot — no restart needed.
    LANG = resolveLang(settings.language);
    applyI18n();
    fillSizeSelects();
    fillFontSelects();
    $("lang-select").value = settings.language || "auto";
    $("theme-select").value = settings.theme || "system";
    $("tile-font").value = settings.tile_font || "system";
    $("tile-size").value = String(normSize(Number(settings.tile_size ?? 0)));
    $("opt-minimize").checked = settings.minimize_to_tray === true;
    $("opt-screenshot-folder").checked = settings.ui_flags?.screenshotSave === true;
    $("opt-autoupdate").checked = settings.auto_update !== false;
    applyTheme(await invoke("current_theme"));
    applyTileStyle();
    applyBars();
    await renderGrid(true); // re-render with the new tile style
    renderViewsEditor();
    toast(`${count} ${t("imported")}`);
  } catch (err) {
    if (String(err) !== "canceled") toast(t("importFailed"));
  }
}

// "Everything" backup: prompts + all settings in one JSON file.
async function runExportAll() {
  try {
    await withDialog(() => invoke("export_all"));
  } catch (err) {
    if (String(err) !== "canceled") toast(t("exportFailed"));
  }
}

async function runImportAll() {
  try {
    const count = await withDialog(() => invoke("import_all"));
    if (count == null) return;
    // Settings were replaced wholesale (window, hotkey, theme, toggles…) — a full
    // reload re-applies every one of them cleanly instead of poking each control.
    location.reload();
  } catch (err) {
    if (String(err) !== "canceled") toast(t("importFailed"));
  }
}

async function deleteAll() {
  const btn = $("delete-all");
  if (!armButton(btn, t("deleteAllConfirm"))) {
    clearTimeout(deleteAllTimer);
    deleteAllTimer = setTimeout(() => disarmButton(btn, t("deleteAll")), DISARM_MS);
    return;
  }
  clearTimeout(deleteAllTimer);
  disarmButton(btn, t("deleteAll"));
  await invoke("delete_all_data");
  location.reload(); // full re-init: default theme, views, toggles, grid
}

// ---- Wire events ----
function bind() {
  inputEl.addEventListener("input", () => {
    autoGrow(inputEl);
    saveBtn.disabled = !inputEl.value.trim();
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); startCreate(); }
  });
  // Paste an image or file (Ctrl+V) to save it as a button; plain text pastes
  // normally. A broken/unreadable image is reported, never saved.
  inputEl.addEventListener("paste", async (e) => {
    if (!flag("pasteMedia")) return;
    const dt = e.clipboardData;
    if (!dt) return;
    // Only intercept when the clipboard carries a file/image payload; plain text
    // keeps pasting normally.
    const hasPayload = dt.files?.length > 0 || [...(dt.items || [])].some((it) => it.kind === "file");
    if (!hasPayload) return;
    e.preventDefault();
    await withDialog(async () => {
      // Pasted bitmaps (screenshots) arrive as a file item with an empty type,
      // so try the image clipboard first, then fall back to a real file path.
      const img = await invoke("get_clipboard_image").catch(() => "");
      if (img) {
        openModal({ mode: "image-create", title: t("imageModalTitle"), name: t("filterImage"), image: img, showImage: true, copyImage: true });
        return;
      }
      const path = await invoke("get_clipboard_file_path").catch(() => "");
      if (path) await openFileCreate(path);
      else toast(t("imagePasteFailed"));
    });
  });
  saveBtn.addEventListener("click", startCreate);

  modal.confirm.addEventListener("click", confirmModal);
  modal.cancel.addEventListener("click", closeModal);
  modal.fav.addEventListener("click", () => {
    const on = modal.fav.classList.toggle("active");
    modal.fav.setAttribute("aria-pressed", String(on));
  });
  // Click the preview media → fullscreen zoom/pan viewer.
  modal.img.addEventListener("click", () => { if (modal.img.src) openLightbox(modal.img.src, false); });
  modal.video.addEventListener("click", () => { if (modal.video.src) openLightbox(modal.video.src, true); });
  modal.name.addEventListener("keydown", (e) => { if (e.key === "Enter") confirmModal(); });

  // Image / Text display toggle (text mode shows the name on the tile).
  modal.showImage.addEventListener("click", () => {
    if (!modalState) return;
    modalState.showImage = true;
    syncModalImageUi(modalState.mode);
  });
  modal.showText.addEventListener("click", () => {
    if (!modalState) return;
    modalState.showImage = false;
    syncModalImageUi(modalState.mode);
  });
  // Shared media pick: image, gif or video. Stills are stored as a preview,
  // gif/video become the icon path (shown, never copied). An image keeps the
  // prompt's copy behaviour; a gif/video icon switches copying back to text.
  async function pickReplacementMedia() {
    const path = await withDialog(() => invoke("pick_file_path"));
    if (!path || !modalState) return false;
    const kind = mediaKind(path);
    if (!kind) {
      toast(t("unsupportedFile"));
      return false;
    }
    if (kind === "image") {
      const data = await loadFilePreview(path);
      if (!data) return false;
      modalState.image = data;
      modalState.iconPath = "";
    } else {
      modalState.image = "";
      modalState.iconPath = path;
      modalState.copyImage = false;
    }
    modalState.showImage = true;
    return true;
  }
  // "Replace media" (preview exists) and "Media as icon" (no media yet).
  modal.replaceImg.addEventListener("click", async () => {
    if (modalState && (await pickReplacementMedia())) syncModalImageUi(modalState.mode);
  });
  modal.addIcon.addEventListener("click", async () => {
    if (modalState && (await pickReplacementMedia())) syncModalImageUi(modalState.mode);
  });
  modal.removeImg.addEventListener("click", () => {
    if (!modalState) return;
    modalState.image = "";
    modalState.iconPath = "";
    modalState.showImage = false;
    syncModalImageUi(modalState.mode);
  });

  // Replacing the attached file re-classifies the prompt by file type:
  // stills/gifs/videos switch to the media layout, anything else to plain file.
  modal.replaceFile.addEventListener("click", async () => {
    if (!modalState) return;
    const path = await withDialog(() => invoke("pick_file_path"));
    if (!path || !modalState) return;
    modalState.filePath = path;
    const kind = mediaKind(path);
    modalState.image = await loadFilePreview(path);
    modalState.copyImage = false; // the file itself is what gets copied
    modalState.showImage = !!kind;
    syncModalImageUi(modalState.mode);
  });

  // Paperclip button in the composer bar (files, images, gifs, videos).
  $("file-btn").addEventListener("click", startFileCreate);
  $("file-btn").addEventListener("contextmenu", (e) => {
    e.preventDefault();
    startFileFromClipboard();
  });

  // Snipping tool: open the overlay; the backend notifies us with the crop.
  $("snip-btn").addEventListener("click", () => {
    invoke("open_snip").catch((err) => toast(String(err)));
  });

  // Chain mode: combine several text buttons into one clipboard copy. Single
  // click toggles it; a quick double-click latches it "always on".
  $("chain-btn").addEventListener("click", onChainClick);
  // A paste ends chain mode (unless latched). Ctrl/Cmd+V is only seen while we're
  // focused; leaving the window to paste elsewhere blurs it — both finalize (the
  // clipboard already holds the chain). Clicking the chain button is the manual off.
  document.addEventListener("keydown", (e) => {
    if (chainMode && !chainLock && (e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) setChainMode(false);
  });
  // Arrow keys move a focus ring across grid tiles; Enter/Space copies.
  const NAV = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  document.addEventListener("keydown", (e) => {
    if (!flag("keyboardNav")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    if (document.querySelector(".overlay:not(.hidden)")) return; // a dialog is open
    if (NAV[e.key]) { e.preventDefault(); moveKbFocus(...NAV[e.key]); }
    else if ((e.key === "Enter" || e.key === " ") && kbFocus) { e.preventDefault(); activateTile(kbFocus); }
  });
  // Hold Shift during keyboard navigation to arm chaining on the fly: it switches
  // on while Shift is down and off again when released — unless a prompt was picked
  // into the chain during the hold, in which case it latches "always on" so the
  // user can keep building the chain from there.
  let shiftChain = false;
  const kbBlocked = (e) => e.target.closest("input, textarea, [contenteditable]") || document.querySelector(".overlay:not(.hidden)");
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Shift" || e.repeat || shiftChain || chainMode) return;
    if (!flag("keyboardNav") || !flag("chainPrompts") || kbBlocked(e)) return;
    shiftChain = true;
    setChainMode(true);
  });
  document.addEventListener("keyup", (e) => {
    if (e.key !== "Shift" || !shiftChain) return;
    shiftChain = false;
    if (!chainSel.length) { setChainMode(false); return; }
    if (flag("chainLock")) setChainLock(); // picked something → keep the chain alive
  });
  // Keep the chain armed while a variable dialog is open — switching windows to
  // look something up must not abort the chain (it leaves the popup stranded). A
  // latched chain ignores blur entirely (that is the point of the lock).
  window.addEventListener("blur", () => { if (chainMode && chainSel.length && !varsCleanup && !chainLock) setChainMode(false); });
  // A latched chain survives the blur but starts fresh when we return: the
  // previous chain was already copied, so clear the picks (mode stays on).
  window.addEventListener("focus", () => { if (chainLock && chainSel.length) { chainSel.length = 0; chainTexts.clear(); refreshChainUi(); } });
  const snipModal = $("snip-modal");
  let pendingSnip = null;
  let pendingSnipPath = ""; // disk path if this shot was auto-saved to the folder
  let pendingSnipName = ""; // backend-suggested "Screenshot <app?> <timestamp>"
  const closeSnipModal = () => {
    snipModal.classList.add("hidden");
    pendingSnip = null;
    pendingSnipPath = "";
    pendingSnipName = "";
  };
  listen("snip-captured", (e) => {
    pendingSnip = e.payload?.data_url || "";
    if (!pendingSnip) return;
    pendingSnipPath = e.payload?.path || "";
    pendingSnipName = e.payload?.name || "";
    $("snip-preview").src = pendingSnip;
    $("snip-save-folder").checked = settings.ui_flags?.screenshotSave === true;
    snipModal.classList.remove("hidden");
  });
  // Folder toggle on the result dialog = the same setting as in the main settings.
  // On -> save this shot to the folder now; off -> delete the saved copy.
  $("snip-save-folder").addEventListener("change", async (ev) => {
    const on = ev.target.checked;
    settings.ui_flags = { ...(settings.ui_flags || {}), screenshotSave: on };
    invoke("set_ui_flag", { key: "screenshotSave", enabled: on }).catch((err) => toast(String(err)));
    const optBox = $("opt-screenshot-folder");
    if (optBox) optBox.checked = on;
    if (on) {
      if (!pendingSnipPath && pendingSnip) {
        pendingSnipPath = (await invoke("save_screenshot_now", { dataUrl: pendingSnip }).catch(() => "")) || "";
      }
    } else if (pendingSnipPath) {
      invoke("delete_screenshot_file", { path: pendingSnipPath }).catch(() => {});
      pendingSnipPath = "";
    }
  });
  $("snip-modal-saveas").addEventListener("click", async () => {
    if (!pendingSnip) return;
    await invoke("save_screenshot_as", { dataUrl: pendingSnip }).catch((err) => toast(String(err)));
  });
  $("snip-modal-yes").addEventListener("click", () => {
    const image = pendingSnip;
    const name = pendingSnipName || t("snipTitle");
    closeSnipModal();
    if (!image) return;
    // The screenshot becomes a button that copies the image on click.
    openModal({
      mode: "image-create",
      title: t("imageModalTitle"),
      name,
      image,
      showImage: true,
      copyImage: true,
    });
  });
  // Discard this shot and immediately start a new one.
  $("snip-modal-retry").addEventListener("click", () => {
    closeSnipModal();
    invoke("open_snip").catch((err) => toast(String(err)));
  });
  $("snip-modal-close").addEventListener("click", closeSnipModal);
  $("snip-preview").addEventListener("click", () => { const s = $("snip-preview").src; if (s) openLightbox(s, false); });
  snipModal.addEventListener("pointerdown", (e) => {
    if (e.target === snipModal) closeSnipModal();
  });

  // Delete from the edit dialog, with the same two-step confirmation.
  modal.delete.addEventListener("click", async () => {
    if (!modalState || modalState.mode !== "edit") return;
    if (!armButton(modal.delete, t("deleteConfirm"))) return;
    const id = modalState.id;
    closeModal();
    await invoke("delete_prompt", { id });
    await renderGrid();
    if (!libraryEl.classList.contains("hidden")) renderLibrary();
  });
  modal.root.addEventListener("pointerdown", async (e) => {
    if (e.target !== modal.root) return;
    if (await confirmDiscardIfDirty()) closeModal();
  });

  $("gear").addEventListener("click", () => {
    showExpertPage(false); // always open on the main page
    renderViewsEditor();
    settingsEl.classList.remove("hidden");
  });
  $("expert-open").addEventListener("click", () => {
    expertQuery = "";
    $("expert-search").value = "";
    showExpertPage(true);
  });
  $("expert-back").addEventListener("click", () => showExpertPage(false));
  $("expert-search").addEventListener("input", (e) => { expertQuery = e.target.value; renderExpert(); });
  // Two-step confirm: first click arms it red, second within 3s resets.
  $("expert-reset").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    if (!armButton(btn, t("expertResetConfirm"))) {
      clearTimeout(expertResetTimer);
      expertResetTimer = setTimeout(() => disarmButton(btn, t("expertReset")), DISARM_MS);
      return;
    }
    clearTimeout(expertResetTimer);
    disarmButton(btn, t("expertReset"));
    onResetExpert();
  });

  // Quick grid-size control (top-right of the layout, active view).
  const applyQuickGrid = async () => {
    if (favView) return; // favorites grid sizes itself; the control is read-only there
    const view = activeView();
    const cols = clampGrid($("qg-cols").value, view.cols);
    const rows = clampGrid($("qg-rows").value, view.rows);
    if (cols === view.cols && rows === view.rows) return;
    settings = await invoke("set_view_grid", { id: view.id, cols, rows });
    await renderGrid(true);
  };
  attachGridPicker($("qg-cols"), applyQuickGrid);
  attachGridPicker($("qg-rows"), applyQuickGrid);

  // Show/hide the top and bottom bars.
  $("hide-top").addEventListener("click", () => setBars(false, settings.show_composer !== false));
  $("show-top").addEventListener("click", () => setBars(true, settings.show_composer !== false));
  $("hide-bottom").addEventListener("click", () => setBars(settings.show_header !== false, false));
  $("show-bottom").addEventListener("click", () => setBars(settings.show_header !== false, true));

  buildColorFilter($("library-colors"), libColor);
  $("library-btn").addEventListener("click", () => {
    libQuery = "";
    $("library-q").value = "";
    setLibType("all");
    setLibColor("all");
    libFav = false;
    $("library-fav").classList.remove("active");
    syncLibraryToggle();
    renderLibrary();
    libraryEl.classList.remove("hidden");
    if (flag("librarySearch") && optFlag("searchAutofocus")) $("library-q").focus();
  });
  // "Close after copy" toggle in the library header (mirrors the expert flag).
  $("library-close-toggle").addEventListener("click", async () => {
    const enabled = !flag("closeAfterCopy");
    settings.ui_flags = { ...(settings.ui_flags || {}), closeAfterCopy: enabled };
    try { await invoke("set_ui_flag", { key: "closeAfterCopy", enabled }); } catch (err) { toast(String(err)); }
    syncLibraryToggle();
  });
  $("library-q").addEventListener("input", (e) => { libQuery = e.target.value; renderLibrary(); });
  wireSearchSuggest($("library-q"), "recentSearchLib");
  $("library-types").addEventListener("click", (e) => {
    if (e.target.closest("#library-fav")) {
      libFav = !libFav;
      $("library-fav").classList.toggle("active", libFav);
      renderLibrary();
      return;
    }
    const btn = e.target.closest(".lib-type");
    if (btn) { setLibType(btn.dataset.type); renderLibrary(); }
  });
  $("library-colors").addEventListener("click", (e) => {
    const btn = e.target.closest(".lib-color");
    if (btn) { setLibColor(btn.dataset.color); renderLibrary(); }
  });
  $("library-close").addEventListener("click", () => libraryEl.classList.add("hidden"));
  libraryEl.addEventListener("pointerdown", (e) => {
    if (e.target === libraryEl) libraryEl.classList.add("hidden");
  });

  // Copy history & usage journal.
  const journalEl = $("journal");
  buildColorFilter($("journal-colors"), journalColor);
  $("journal-btn").addEventListener("click", openJournal);
  $("journal-close").addEventListener("click", () => journalEl.classList.add("hidden"));
  journalEl.addEventListener("pointerdown", (e) => {
    if (e.target === journalEl) journalEl.classList.add("hidden");
  });
  $("journal-q").addEventListener("input", (e) => { journalQuery = e.target.value; renderJournal(); });
  wireSearchSuggest($("journal-q"), "recentSearchJournal");
  $("journal-types").addEventListener("click", (e) => {
    const btn = e.target.closest(".lib-type");
    if (btn) { setJournalType(btn.dataset.type); renderJournal(); }
  });
  $("journal-colors").addEventListener("click", (e) => {
    const btn = e.target.closest(".lib-color");
    if (btn) { setJournalColor(btn.dataset.color); renderJournal(); }
  });
  $("journal-clear").addEventListener("click", async () => {
    if (flag("confirmClearHistory")) {
      const ok = await confirmDialog({
        title: t("clearHistory"),
        message: t("clearHistoryConfirm"),
        confirmLabel: t("clearHistory"),
      });
      if (!ok) return;
    }
    await invoke("clear_copy_history").catch((e) => toast(String(e)));
    settings.usage = {};
    settings.last_used = {};
    await loadJournal();
  });
  $("settings-close").addEventListener("click", () => settingsEl.classList.add("hidden"));
  // pointerdown (not click): selecting text that ends outside an input must not close.
  settingsEl.addEventListener("pointerdown", (e) => { if (e.target === settingsEl) settingsEl.classList.add("hidden"); });

  $("view-add").addEventListener("click", () => openViewModal(null));

  // View add / rename / delete popup.
  viewModal.confirm.addEventListener("click", confirmViewModal);
  viewModal.name.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmViewModal();
  });
  viewModal.cancel.addEventListener("click", closeViewModal);
  viewModal.close.addEventListener("click", closeViewModal);
  viewModal.root.addEventListener("pointerdown", (e) => {
    if (e.target === viewModal.root) closeViewModal();
  });
  // Two-step delete: first click arms (red), second click removes.
  viewModal.delete.addEventListener("click", async () => {
    if (!armButton(viewModal.delete, `${t("delete")}?`)) {
      setTimeout(() => disarmButton(viewModal.delete, t("delete")), DISARM_MS);
      return;
    }
    try {
      settings = await invoke("delete_view", { id: viewModalId });
    } catch (err) {
      toast(String(err));
      return;
    }
    closeViewModal();
    renderViews();
    renderViewsEditor();
    await renderGrid(true);
  });

  $("opt-minimize").addEventListener("change", (e) => {
    invoke("set_minimize_on_close", { enabled: e.target.checked }).catch((err) => toast(String(err)));
  });
  $("opt-screenshot-folder").addEventListener("change", (e) => {
    settings.ui_flags = { ...(settings.ui_flags || {}), screenshotSave: e.target.checked };
    invoke("set_ui_flag", { key: "screenshotSave", enabled: e.target.checked }).catch((err) => toast(String(err)));
  });
  $("opt-autostart").addEventListener("change", async (e) => {
    try {
      await invoke("set_autostart", { enabled: e.target.checked });
    } catch (err) {
      e.target.checked = !e.target.checked;
      toast(String(err));
    }
  });
  $("opt-startmin").addEventListener("change", async (e) => {
    try {
      await invoke("set_start_minimized", { enabled: e.target.checked });
    } catch (err) {
      e.target.checked = !e.target.checked;
      toast(String(err));
    }
  });
  // Always-on-top: the header pin and the settings switch stay in sync; the
  // pin tints itself (accent) while active.
  const setOnTop = (on) => {
    settings.always_on_top = on;
    $("opt-ontop").checked = on;
    $("pin-top").classList.toggle("active", on);
    invoke("set_always_on_top", { enabled: on }).catch((err) => toast(String(err)));
  };
  $("opt-ontop").addEventListener("change", (e) => setOnTop(e.target.checked));
  $("pin-top").addEventListener("click", () => setOnTop(!settings.always_on_top));

  // Favorites view: setting enables the header star; the star toggles the grid.
  $("opt-favview").addEventListener("change", (e) => {
    const on = e.target.checked;
    settings.ui_flags = { ...(settings.ui_flags || {}), favView: on };
    invoke("set_ui_flag", { key: "favView", enabled: on }).catch((err) => toast(String(err)));
    if (!on && favView) favView = false;
    refreshFavViewUi();
    renderGrid(true);
  });
  $("fav-view-btn").addEventListener("click", () => setFavView(!favView));

  // Global hotkey: click the field and press a key combo to capture it.
  $("opt-hotkey").addEventListener("keydown", async (e) => {
    if (e.key === "Tab" || e.key === "Escape") return; // let focus leave the field
    e.preventDefault();
    const accel = accelFromEvent(e);
    if (!accel) return; // a modifier + key is required
    try {
      await invoke("set_hotkey", { hotkey: accel });
      settings.hotkey = accel;
      $("opt-hotkey").value = prettyAccel(accel);
      toast(t("hotkeySet"));
    } catch (err) {
      $("opt-hotkey").value = prettyAccel(settings.hotkey);
      toast(t("hotkeyFail"));
    }
  });
  $("hotkey-clear").addEventListener("click", async () => {
    await invoke("set_hotkey", { hotkey: "" }).catch(() => {});
    settings.hotkey = "";
    $("opt-hotkey").value = "";
  });
  // The global hotkey summons the window + opens the quick launcher (library).
  listen("summon-launcher", () => { $("library-btn").click(); });

  $("import-btn").addEventListener("click", runImport);
  $("export-csv").addEventListener("click", () => runExport("csv"));
  $("export-txt").addEventListener("click", () => runExport("txt"));
  $("import-all").addEventListener("click", runImportAll);
  $("export-all").addEventListener("click", runExportAll);
  $("delete-all").addEventListener("click", deleteAll);

  const themeSelect = $("theme-select");
  themeSelect.addEventListener("change", async () => {
    applyTheme(await invoke("set_theme", { theme: themeSelect.value }));
  });

  // Language: persist, then re-render every translated string in place —
  // no restart, no reload.
  $("lang-select").addEventListener("change", async (e) => {
    await invoke("set_language", { lang: e.target.value });
    LANG = resolveLang(e.target.value);
    applyI18n();
    // Re-fill the JS-built selects, then restore their current values.
    fillSizeSelects();
    fillFontSelects();
    $("tile-font").value = settings.tile_font || "system";
    $("tile-size").value = String(normSize(Number(settings.tile_size ?? 0)));
    await renderGrid(); // fresh state: tooltips + a renamed default view
    renderViewsEditor();
    if (!libraryEl.classList.contains("hidden")) renderLibrary();
  });

  // Prompt-tile font + size.
  const tileStyleChanged = async () => {
    settings.tile_font = $("tile-font").value;
    settings.tile_size = Number($("tile-size").value); // 0 = auto-fit
    applyTileStyle();
    invoke("set_tile_style", { font: settings.tile_font, size: settings.tile_size }).catch(() => {});
    await renderGrid(true); // re-render so auto-fit (or fixed size) applies cleanly
  };
  $("tile-font").addEventListener("change", tileStyleChanged);
  $("tile-size").addEventListener("change", tileStyleChanged);
  // Every dropdown uses the same popup style (scrollbar only when needed).
  attachSelectPicker($("tile-size"));
  attachSelectPicker(modal.sizeSel);
  attachSelectPicker(modal.captionSize);
  modal.caption.addEventListener("input", updateCaptionPreview);
  modal.captionSize.addEventListener("change", updateCaptionPreview);
  attachSelectPicker($("tile-font"));
  attachSelectPicker(modal.fontSel);
  attachSelectPicker($("theme-select"));
  attachSelectPicker($("lang-select"));

  ctxEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    const act = btn?.dataset.act;
    if (!act || !ctxId) return;
    const id = ctxId;
    if (act === "delete") {
      if (!armButton(btn, t("deleteConfirm"))) return;
      closeCtx();
      await invoke("delete_prompt", { id });
      await renderGrid();
      return;
    }
    closeCtx();
    if (act === "edit") {
      await editPrompt(id);
    } else if (act === "hide") {
      // Remove from the active view's grid; stays available in the library.
      const view = activeView();
      const layout = { ...layoutOf(view) };
      delete layout[id];
      view.layouts[gridKeyOf(view)] = layout;
      invoke("set_layout", { layout }).catch((e) => toast(String(e)));
      await renderGrid(true);
    } else if (act === "pin") {
      await invoke("toggle_floating", { id });
    }
  });

  document.addEventListener("pointerdown", (e) => {
    if (!ctxEl.classList.contains("hidden") && !ctxEl.contains(e.target)) closeCtx();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("lightbox").classList.contains("hidden")) closeLightbox();
    else if (confirmCleanup) confirmCleanup(false);
    else if (!colorPop.classList.contains("hidden")) closeColorPop();
    else if (!ctxEl.classList.contains("hidden")) closeCtx();
    else if (!$("update-modal").classList.contains("hidden")) $("update-modal").classList.add("hidden");
    else if (!$("snip-modal").classList.contains("hidden")) $("snip-modal").classList.add("hidden");
    else if (!viewModal.root.classList.contains("hidden")) closeViewModal();
    else if (!modal.root.classList.contains("hidden")) confirmDiscardIfDirty().then((ok) => { if (ok) closeModal(); });
    else if (!libraryEl.classList.contains("hidden")) libraryEl.classList.add("hidden");
    else if (!settingsEl.classList.contains("hidden")) settingsEl.classList.add("hidden");
  });

  // Updates: manual check in the settings + daily background notification.
  let updateInfo = null;
  let statusTimer = null;
  const updateBtn = $("update-btn");
  const updateStatus = $("update-status");
  // Temporary status message; falls back to the version label after 5s.
  const flashStatus = (txt) => {
    updateStatus.textContent = txt;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { updateStatus.textContent = versionLabel; }, 5000);
  };
  const offerUpdate = (info) => {
    updateInfo = info;
    updateBtn.textContent = t("installUpdate").replace("{v}", info.version);
  };

  // Changelog popup shown before any install (manual check or daily toast).
  const updateModal = {
    root: $("update-modal"),
    title: $("update-modal-title"),
    notes: $("update-modal-notes"),
    warn: $("update-modal-warn"),
    cancel: $("update-modal-cancel"),
    skip: $("update-modal-skip"),
    install: $("update-modal-install"),
    close: $("update-modal-close"),
  };
  const openUpdateModal = (info) => {
    offerUpdate(info);
    updateModal.title.textContent = t("updateAvailable").replace("{v}", info.version);
    updateModal.notes.textContent = info.notes?.trim() || t("noChangelog");
    updateModal.warn.classList.toggle("hidden", !info.skipped);
    updateModal.root.classList.remove("hidden");
  };
  const closeUpdateModal = () => updateModal.root.classList.add("hidden");

  updateBtn.addEventListener("click", async () => {
    if (updateInfo?.available) { openUpdateModal(updateInfo); return; }
    updateBtn.disabled = true;
    try {
      const info = await invoke("check_update");
      if (info.available) openUpdateModal(info);
      else flashStatus(t("upToDate"));
    } catch (err) {
      flashStatus(t("updateFailed"));
      toast(String(err));
    }
    updateBtn.disabled = false;
  });
  updateModal.install.addEventListener("click", async () => {
    updateModal.install.disabled = true;
    try {
      await invoke("install_update", { url: updateInfo.url }); // app exits
    } catch (err) {
      updateModal.install.disabled = false;
      toast(String(err));
    }
  });
  updateModal.skip.addEventListener("click", async () => {
    const v = updateInfo?.version;
    if (!v) return;
    try { await invoke("skip_version", { version: v }); } catch (err) { toast(String(err)); }
    updateInfo = null;
    updateBtn.textContent = t("checkUpdate");
    closeUpdateModal();
    toast(t("versionSkipped").replace("{v}", v));
  });
  updateModal.cancel.addEventListener("click", closeUpdateModal);
  updateModal.close.addEventListener("click", closeUpdateModal);
  updateModal.root.addEventListener("pointerdown", (e) => {
    if (e.target === updateModal.root) closeUpdateModal();
  });

  $("opt-autoupdate").addEventListener("change", (e) => {
    invoke("set_auto_update", { enabled: e.target.checked }).catch((err) => toast(String(err)));
  });
  listen("update-available", (e) => {
    offerUpdate(e.payload);
    toast(t("updateAvailable").replace("{v}", e.payload.version), {
      label: t("installNow"),
      onClick: () => openUpdateModal(e.payload),
    });
  });

  listen("theme-changed", (e) => applyTheme(e.payload));
  // "Edit prompt" chosen in a floating pill's right-click menu.
  listen("edit-prompt", (e) => editPrompt(String(e.payload)));
}

// Fill both text-size selects: special options + 10..40 in steps of 2.
function fillSizeSelects() {
  const fill = (sel, specials) => {
    sel.innerHTML = "";
    const add = (value, label) => {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      sel.appendChild(o);
    };
    for (const [value, key] of specials) add(value, t(key));
    for (let s = SIZE_MIN; s <= SIZE_MAX; s += SIZE_STEP) add(String(s), s);
  };
  fill($("tile-size"), [["0", "langAuto"]]);
  fill(modal.sizeSel, [["0", "styleDefault"], ["1", "langAuto"]]);
  fill(modal.captionSize, [["0", "styleDefault"], ["1", "langAuto"]]);
}

// Fill both font selects from the shared catalog; every entry carries its own
// font family so the popup can preview it.
function fillFontSelects() {
  const fill = (sel, withDefault) => {
    sel.innerHTML = "";
    if (withDefault) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = t("styleDefault");
      sel.appendChild(o);
    }
    for (const [key, stack] of Object.entries(FONTS)) {
      const o = document.createElement("option");
      o.value = key;
      o.textContent =
        FONT_LABELS[key] ?? t(key === "script" ? "fontScript" : "fontSystem");
      o.style.fontFamily = stack;
      sel.appendChild(o);
    }
  };
  fill($("tile-font"), false);
  fill(modal.fontSel, true);
}

// Snap legacy sizes (13/15/18/22) onto the new 10..40 grid.
const normSize = (v) =>
  v <= 1 ? v : Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(v / 2) * 2));

// Drag & drop onto the window: a dropped file/image/PDF becomes a button right
// away (same dialog as the paperclip); dropped text fills the composer and opens
// the save dialog. Extends the existing clipboard/screenshot paths.
function setupDragDrop() {
  const wv = window.__TAURI__?.webview?.getCurrentWebview?.();
  wv?.onDragDropEvent?.((e) => {
    if (!flag("dragDrop")) return;
    const kind = e.payload?.type;
    document.body.classList.toggle("drag-over", kind === "enter" || kind === "over");
    if (kind === "drop") {
      document.body.classList.remove("drag-over");
      const path = e.payload?.paths?.[0];
      if (path) openFileCreate(path).catch((err) => toast(String(err)));
    }
  }).catch?.(() => {});
  // Text dropped from another app (no file paths) — native handler ignores it.
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => {
    if (!flag("dragDrop")) return;
    const text = e.dataTransfer?.getData("text");
    if (text && !(e.dataTransfer.files && e.dataTransfer.files.length)) {
      e.preventDefault();
      inputEl.value = text;
      autoGrow(inputEl);
      saveBtn.disabled = !text.trim();
      startCreate();
    }
  });
}

// ---- Init ----
async function init() {
  try {
    settings = await invoke("get_settings");
    loadPalette();
    LANG = resolveLang(settings.language);
    applyI18n();
    fillSizeSelects();
    fillFontSelects();
    applyTheme(await invoke("current_theme"));
    bind();
    wireTooltips();
    wireLightbox();
    setupDragDrop();
    applyFlags();
    applyBars();
    await renderGrid();
    $("theme-select").value = settings.theme;
    $("lang-select").value = settings.language || "auto";
    $("opt-minimize").checked = settings.minimize_to_tray === true;
    $("opt-screenshot-folder").checked = settings.ui_flags?.screenshotSave === true;
    $("opt-autostart").checked = settings.autostart === true;
    $("opt-startmin").checked = settings.start_minimized === true;
    $("opt-ontop").checked = settings.always_on_top === true;
    $("opt-favview").checked = favViewEnabled();
    refreshFavViewUi();
    $("opt-hotkey").value = prettyAccel(settings.hotkey);
    $("pin-top").classList.toggle("active", settings.always_on_top === true);
    $("opt-autoupdate").checked = settings.auto_update !== false;
    $("tile-font").value = settings.tile_font || "system";
    $("tile-size").value = String(normSize(Number(settings.tile_size ?? 0)));
    invoke("app_version").then((v) => {
      versionLabel = `v${v}`;
      $("update-status").textContent = versionLabel;
    }).catch(() => {});
    invoke("current_data_dir").then((d) => { currentDataDir = d || ""; }).catch(() => {});
    invoke("default_screenshot_dir").then((d) => { defaultScreenshotDir = d || ""; }).catch(() => {});
    applyTileStyle();
    autoGrow(inputEl);
    inputEl.focus();
    pollMissingFiles();
    setInterval(pollMissingFiles, FILE_POLL_MS);
  } catch (e) {
    // Never strand the user with an invisible app: log, surface a toast if the
    // UI got far enough to have one, and still reveal the window below.
    console.error(e);
    try { toast(String((e && e.message) || e)); } catch (_) {}
  } finally {
    // Reveal only after the first fitted paint — the user never sees text sizing.
    requestAnimationFrame(() => {
      try { fitCache.clear(); fitAllTiles(); } catch (_) {}
      requestAnimationFrame(() => invoke("show_main_window").catch(() => {}));
    });
  }
}

init();
