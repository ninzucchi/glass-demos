// Dependency-free DOM screenshot. Serializes a live element into an SVG
// <foreignObject>, rasterizes it to a canvas, and downloads a PNG.
//
// Fidelity hinges on three things the foreignObject sandbox does NOT inherit
// from the page, so we reconstruct them explicitly:
//   1. Stylesheets  - copied verbatim so class-based rules (incl. ::before icon
//                     glyphs) still apply to the clone.
//   2. Icon font    - the @font-face url is a relative path that can't resolve
//                     inside the SVG, so we re-declare it with the woff2 inlined.
//   3. Theme tokens - design tokens live on `:root` / `:root.dark`, which never
//                     matches our wrapper; we copy the resolved custom
//                     properties onto the wrapper so every var() resolves.
//   4. Base typography - font-family, text color, smoothing etc. live on `body`
//                     (`body { @apply font-sans text-primary ... }`) and reach
//                     the UI purely through inheritance. The clone is parented
//                     to a bare wrapper with no <body>, so that rule never
//                     matches and text falls back to the foreignObject default
//                     (a serif face, black text). We copy body's resolved
//                     inherited props onto the wrapper to restore the baseline.
// Same-origin images are inlined as data URLs so they're present at rasterize
// time — except the wallpaper, which is composited onto the canvas beneath the
// rasterized SVG (an SVG-as-image reports itself loaded before nested images
// have decoded, so a large embedded wallpaper only renders some of the time).
//
// Two engine quirks shape the pipeline (see `rasterize` and `takeWindowShadows`):
//   - The SVG must be loaded via a data: URL, never a blob: URL. Both engines
//     treat foreignObject-in-blob as cross-origin and taint the canvas, which
//     makes toBlob/toDataURL return nothing, so downloads silently fail.
//   - WebKit paints an SVG's first load before the resources inside it have
//     loaded, so it is loaded twice and the second pass is the one drawn.
//
// Known limitation: foreignObject cannot render `backdrop-filter`, so glass
// blur is captured flat. Wallpaper and content render correctly.

const ICON_FONT_URL = "/fonts/Cursor Icons 16.woff2";
const SCALE = 2;

export interface CaptureOptions {
  filename: string;
  /** Render the clone at this size instead of its live size. Percentage- and
   *  inset-based descendants (wallpaper, dock) re-lay out to fill it, so a shot
   *  can have a canonical size regardless of the real viewport. */
  size?: { w: number; h: number };
  /** Paint the desktop background behind the clone. The desktop's own fill
   *  lives on <body>, which is never cloned, so without this a shot whose
   *  wallpaper failed to inline comes out transparent instead of on-brand. */
  backdrop?: boolean;
  /** Adjust the detached clone (e.g. re-position a window) before rasterizing.
   *  Must not add or remove nodes. */
  prepare?: (clone: HTMLElement) => void;
}

/** Capture `node` to a downloaded PNG. Prefer this over the selector helper
 *  when the caller already resolved the front-most / intended target. */
export async function captureElement(
  node: HTMLElement,
  { filename, size, backdrop, prepare }: CaptureOptions,
): Promise<void> {
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(size?.w ?? rect.width));
  const height = Math.max(1, Math.ceil(size?.h ?? rect.height));

  const clone = node.cloneNode(true) as HTMLElement;
  // Keep a positioning context for absolute children (windows on the desktop).
  // Only strip translate offsets — never force `static`, which orphans them.
  const computed = getComputedStyle(node);
  Object.assign(clone.style, {
    position: computed.position === "static" ? "relative" : computed.position,
    left: "0",
    top: "0",
    right: "auto",
    bottom: "auto",
    margin: "0",
    transform: "none",
    width: `${width}px`,
    height: `${height}px`,
  });

  await document.fonts.ready.catch(() => undefined);

  // The wallpaper is painted onto the canvas rather than embedded in the SVG,
  // so it is left out of the clone entirely.
  const wallpaper = backdrop ? await activeWallpaper(node) : null;
  const pairs = pairElements(node, clone);
  preserveScroll(pairs);
  await inlineImages(pairs, { w: width * SCALE, h: height * SCALE }, wallpaper?.layer);
  prepare?.(clone);
  // Runs after `prepare`, which is what settles each window's final position.
  const shadows = backdrop ? takeWindowShadows(node, clone) : [];

  const css = `${await iconFontFace()}\n${collectCss()}\n${HIDE_SCROLLBARS}`;
  // An opaque wrapper would hide the canvas-painted wallpaper, so it only
  // stands in when there is no image to paint (color/gradient wallpapers, or a
  // wallpaper that failed to load).
  const wrapperStyle = backdrop && !wallpaper?.image ? "background:var(--desktop-bg);" : "";
  const svg = await rasterize(clone, css, width, height, wrapperStyle);

  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  if (wallpaper?.image) drawCover(ctx, wallpaper.image, width, height);
  paintShadows(ctx, shadows);
  ctx.drawImage(svg, 0, 0, canvas.width, canvas.height);

  await downloadPng(canvas, filename);
}

/** The desktop's visible image wallpaper, decoded and ready to paint. Returns
 *  the layer too, so the caller can keep it out of the clone.
 *
 *  Compositing it here rather than inlining it into the SVG is deliberate: an
 *  SVG-as-image reports itself loaded before nested images have decoded, so an
 *  embedded wallpaper renders only sometimes — the bigger it is, the less
 *  often. Color and gradient wallpapers have no such problem and stay in the
 *  SVG. */
async function activeWallpaper(
  root: HTMLElement,
): Promise<{ layer: HTMLElement; image: HTMLImageElement | null } | null> {
  const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-wallpaper]"));
  for (const layer of layers) {
    const style = getComputedStyle(layer);
    if (parseFloat(style.opacity) < 0.5) continue;
    const url = style.backgroundImage.match(/url\((['"]?)(.*?)\1\)/);
    if (!url) return null; // a color wallpaper: the SVG renders it fine
    // Same-origin (bundled asset), so drawing it leaves the canvas untainted.
    const image = await decodeImage(url[2]).catch(() => null);
    if (!image) console.warn(`Screenshot: could not load wallpaper ${url[2]}`);
    return { layer, image };
  }
  return null;
}

interface ShadowLayer {
  css: string;
  color: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
}

interface WindowShadow {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  layers: ShadowLayer[];
}

/** Lift each window's drop shadow out of the clone so the canvas can draw it.
 *
 *  Chrome does not reliably apply the blur radius of a box-shadow inside a
 *  foreignObject: the shadow can rasterize as hard-edged rectangles extending
 *  blur+spread from the window. Canvas shadows blur properly, so the shot draws
 *  them itself and the clone renders none. Positions come from the clone's
 *  inline geometry, which is authoritative after any re-centering. */
function takeWindowShadows(live: HTMLElement, clone: HTMLElement): WindowShadow[] {
  const liveShells = live.querySelectorAll<HTMLElement>("[data-window-shell]");
  const cloneShells = clone.querySelectorAll<HTMLElement>("[data-window-shell]");

  return Array.from(cloneShells).flatMap((shell, i) => {
    const source = liveShells[i];
    const frame = shell.closest<HTMLElement>("[data-window-frame]");
    if (!source || !frame) return [];

    const style = getComputedStyle(source);
    const layers = parseBoxShadow(style.boxShadow);
    // Only blurred layers are affected by the bug. Hairline rings (blur 0) stay
    // in the clone, where they render crisper than a canvas redraw.
    const blurred = layers.filter((layer) => layer.blur > 0);
    shell.style.boxShadow =
      layers
        .filter((layer) => layer.blur === 0)
        .map((layer) => layer.css)
        .join(", ") || "none";
    if (!blurred.length) return [];

    return [
      {
        x: parseFloat(frame.style.left) || 0,
        y: parseFloat(frame.style.top) || 0,
        w: parseFloat(frame.style.width) || source.offsetWidth,
        h: parseFloat(frame.style.height) || source.offsetHeight,
        radius: parseFloat(style.borderTopLeftRadius) || 0,
        layers: blurred,
      },
    ];
  });
}

/** Parse a resolved `box-shadow` (always "<color> <x> <y> <blur> <spread>" per
 *  comma-separated layer). Inset layers are skipped: they paint inside the box,
 *  where the window's own content covers them. */
function parseBoxShadow(value: string): ShadowLayer[] {
  if (!value || value === "none") return [];

  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")") depth--;
    else if (value[i] === "," && depth === 0) {
      layers.push(value.slice(start, i));
      start = i + 1;
    }
  }
  layers.push(value.slice(start));

  return layers.flatMap((layer) => {
    if (layer.includes("inset")) return [];
    const color = layer.match(/^\s*(rgba?\([^)]*\)|#[0-9a-fA-F]+)/)?.[1];
    const lengths = layer.match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    if (!color || lengths.length < 2) return [];
    const [x, y, blur = 0, spread = 0] = lengths;
    return [{ css: layer.trim(), color, x, y, blur, spread }];
  });
}

/** Draw window shadows beneath where the SVG layer will paint the windows. The
 *  solid rounded rect casting each shadow ends up hidden under the opaque
 *  window, so only the blurred halo shows. */
function paintShadows(ctx: CanvasRenderingContext2D, shadows: WindowShadow[]): void {
  for (const { x, y, w, h, radius, layers } of shadows) {
    for (const layer of layers) {
      const sw = w + layer.spread * 2;
      const sh = h + layer.spread * 2;
      if (sw <= 0 || sh <= 0) continue;

      ctx.save();
      ctx.shadowColor = layer.color;
      ctx.shadowBlur = layer.blur * SCALE;
      ctx.shadowOffsetX = layer.x * SCALE;
      ctx.shadowOffsetY = layer.y * SCALE;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.roundRect(
        (x - layer.spread) * SCALE,
        (y - layer.spread) * SCALE,
        sw * SCALE,
        sh * SCALE,
        Math.max(0, radius + layer.spread) * SCALE,
      );
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Paint `img` over a w×h area with `background-size: cover` semantics. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, ((w - dw) / 2) * SCALE, ((h - dh) / 2) * SCALE, dw * SCALE, dh * SCALE);
}

/** Convenience: resolve a selector then capture. No-ops if missing. */
export async function captureToPng(
  selector: string,
  filename: string,
  options?: Omit<CaptureOptions, "filename">,
): Promise<void> {
  const node = document.querySelector<HTMLElement>(selector);
  if (!node) return;
  await captureElement(node, { ...options, filename });
}

// Scrollbars are page furniture, never wanted in a shot — and a rendered one
// also steals gutter width, which re-truncates text against the live layout.
const HIDE_SCROLLBARS =
  "*{scrollbar-width:none !important;}*::-webkit-scrollbar{display:none !important;}";

/** Concatenate every readable stylesheet, dropping the original (unresolvable)
 *  icon @font-face so our inlined one wins. */
function collectCss(): string {
  let out = "";
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules; // throws for cross-origin sheets
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSFontFaceRule && /Cursor Icons/.test(rule.cssText)) continue;
      out += rule.cssText + "\n";
    }
  }
  return out;
}

/** Re-declare the icon @font-face with the woff2 embedded as a data URL. */
async function iconFontFace(): Promise<string> {
  const dataUrl = await fetchAsDataUrl(ICON_FONT_URL);
  if (!dataUrl) return "";
  return `@font-face{font-family:"Cursor Icons";font-style:normal;font-weight:normal;font-display:block;src:url("${dataUrl}") format("woff2");}`;
}

/** Snapshot of the resolved CSS custom properties on :root, so themed var()
 *  references resolve against the wrapper. */
function rootVars(): string {
  const style = getComputedStyle(document.documentElement);
  let out = "";
  for (const name of Array.from(style)) {
    if (name.startsWith("--")) out += `${name}:${style.getPropertyValue(name)};`;
  }
  return out;
}

// Inherited properties set on <body> that the cloned subtree relies on. Copied
// from the live body's resolved style so the wrapper reproduces the inheritance
// baseline the foreignObject sandbox can't get from a missing <body>.
const INHERITED_BASE = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant",
  "font-feature-settings",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "color",
  "text-rendering",
  "text-transform",
  "-webkit-font-smoothing",
  "-moz-osx-font-smoothing",
] as const;

/** Snapshot of body's resolved inherited typography/color, so the clone
 *  inherits the same baseline it had on the live page. */
function baseStyle(): string {
  const style = getComputedStyle(document.body);
  let out = "";
  for (const name of INHERITED_BASE) {
    const value = style.getPropertyValue(name);
    if (value) out += `${name}:${value};`;
  }
  return out;
}

type Pair = [live: HTMLElement, clone: HTMLElement];

/** Walk the live tree and its clone in lockstep. Both are identical structures,
 *  so document order pairs each clone with the live element it came from. */
function pairElements(source: HTMLElement, clone: HTMLElement): Pair[] {
  const srcEls = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
  const cloneEls = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  return srcEls.flatMap((live, i) => (cloneEls[i] ? [[live, cloneEls[i]] as Pair] : []));
}

/** A foreignObject can't scroll, so a scrolled pane (sidebar, transcript, file
 *  tree) would otherwise rewind to the top in the shot. Shift its contents by
 *  the live scroll offset instead, and clip as the real container does. */
function preserveScroll(pairs: Pair[]): void {
  for (const [live, el] of pairs) {
    const { scrollTop, scrollLeft } = live;
    if (!scrollTop && !scrollLeft) continue;
    el.style.overflow = "hidden";
    for (const child of Array.from(el.children)) {
      if (child instanceof HTMLElement) {
        child.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
      }
    }
  }
}

/** Replace <img> sources and url() backgrounds in the clone with data URLs,
 *  reading the layout-resolved backgrounds from the live source tree. `cap` is
 *  the output size in device pixels; anything larger is downscaled to it. */
async function inlineImages(
  pairs: Pair[],
  cap: { w: number; h: number },
  skip?: HTMLElement,
): Promise<void> {
  await Promise.all(
    pairs.map(async ([orig, el]) => {
      // Invisible layers (the wallpaper stack keeps every choice mounted at
      // opacity 0) would otherwise double the inlined payload for no pixels.
      const style = getComputedStyle(orig);
      if (orig === skip || style.opacity === "0" || style.visibility === "hidden") {
        el.style.backgroundImage = "none";
        return;
      }

      if (el instanceof HTMLImageElement && el.src) {
        const data = await inlineUrl(el.src, cap);
        if (data) el.src = data;
        else el.removeAttribute("src");
        return;
      }

      const bg = style.backgroundImage;
      const url = bg.match(/url\((['"]?)(.*?)\1\)/);
      if (url) {
        const data = await inlineUrl(url[2], cap);
        if (data) el.style.backgroundImage = bg.replace(url[2], data);
        else el.style.backgroundImage = "none";
      }
    }),
  );
}

const dataUrlCache = new Map<string, Promise<string | null>>();

/** Fetch `url` as a data URL, downscaled to `cap` if it is a larger raster.
 *  Only successes are cached: caching a failure would silently blank the
 *  wallpaper for every later capture until the page reloaded. */
function inlineUrl(url: string, cap: { w: number; h: number }): Promise<string | null> {
  const key = `${cap.w}x${cap.h}|${url}`;
  const cached = dataUrlCache.get(key);
  if (cached) return cached;

  const task = (async () => {
    const raw = await fetchAsDataUrl(url);
    if (!raw) {
      console.warn(`Screenshot: could not inline ${url}`);
      return null;
    }
    return await downscale(raw, cap);
  })();

  dataUrlCache.set(key, task);
  void task.then((result) => {
    if (result === null) dataUrlCache.delete(key);
  });
  return task;
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(encodeURI(url));
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Re-encode a raster data URL down to `cap`. Wallpapers ship at 3000×2000 —
 *  far more pixels than any shot needs, and the surplus bloats the SVG data URL
 *  that carries them, which is where oversized captures start failing. */
async function downscale(dataUrl: string, cap: { w: number; h: number }): Promise<string> {
  const isJpeg = dataUrl.startsWith("data:image/jpeg");
  if (!isJpeg && !dataUrl.startsWith("data:image/png")) return dataUrl;

  try {
    const img = await decodeImage(dataUrl);
    const scale = Math.min(1, cap.w / img.naturalWidth, cap.h / img.naturalHeight);
    if (scale >= 1) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(isJpeg ? "image/jpeg" : "image/png", 0.92);
  } catch {
    return dataUrl;
  }
}

/** Escape text so it can sit inside an SVG/XML <style> block. */
function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/** Wrap the clone in an SVG foreignObject and decode it as an image, ready to
 *  paint over whatever backdrop the caller composited first. */
async function rasterize(
  clone: HTMLElement,
  css: string,
  width: number,
  height: number,
  extraStyle = "",
): Promise<HTMLImageElement> {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.cssText =
    `${rootVars()}${baseStyle()}position:relative;width:${width}px;height:${height}px;` +
    `overflow:hidden;${extraStyle}`;
  wrapper.append(clone);

  const styleTag = `<style>${escapeXml(css)}</style>`;
  const body = new XMLSerializer().serializeToString(wrapper);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">${styleTag}${body}</foreignObject>` +
    `</svg>`;

  // data: URL is required so the canvas stays untainted (see file header).
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  // WebKit paints the first load of an SVG before the resources inside it (the
  // icon webfont, any nested images) have finished loading, so that pass comes
  // out missing glyphs and pictures. Loading the identical URL a second time
  // hits the cache with everything ready. Chromium is correct either way; the
  // extra decode is cheap and keeps one code path for both.
  await decodeImage(url).catch(() => undefined);
  return await decodeImage(url);
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      // Tainted canvas (or oversized) yields null — try the sync data-URL path
      // so we surface a real error instead of a silent no-op.
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const comma = dataUrl.indexOf(",");
        const bin = atob(dataUrl.slice(comma + 1));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        resolve(new Blob([bytes], { type: "image/png" }));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("canvas export failed"));
      }
    }, "image/png");
  });
}

async function downloadPng(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  // Revoke after the click has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
