// Dependency-free DOM screenshot, ported (simplified) from cursor-neue's
// src/lib/screenshot.ts. Serializes a live element into an SVG
// <foreignObject>, rasterizes it to a canvas at 2x, and downloads a PNG.
//
// Fidelity hinges on things the foreignObject sandbox does NOT inherit from
// the page, so they are reconstructed explicitly:
//   1. Stylesheets  - copied verbatim so class-based rules (incl. ::before
//                     icon glyphs) still apply to the clone.
//   2. Icon font    - the @font-face url is a relative path that can't
//                     resolve inside the SVG; re-declared with woff2 inlined.
//   3. Theme tokens - custom properties live on `:root`, which never matches
//                     the wrapper; the resolved values are copied onto it.
//   4. Base typography - font/color live on `body` and reach the UI purely
//                     through inheritance; body's resolved props are copied
//                     onto the wrapper to restore the baseline.
//
// Engine quirks (see `rasterize` and `liftShadows`):
//   - The SVG must load via a data: URL — foreignObject-in-blob taints the
//     canvas in both engines and downloads silently fail.
//   - WebKit paints an SVG's first load before its inner resources have
//     loaded, so it is decoded twice and the second pass is drawn.
//   - Chrome doesn't reliably blur box-shadows inside a foreignObject, so
//     blurred layers are lifted out of the clone and drawn by the canvas.
//
// Known limitation: foreignObject cannot render `backdrop-filter`, so glass
// blur is captured flat (invisible here — the page bg is a uniform color).

const ICON_FONT_URL = "/fonts/Cursor Icons 16.woff2";
const SCALE = 2;

export interface CaptureOptions {
  filename: string;
  /** Canvas fill behind the clone. The page background lives on <body> /
   *  <html>, which are never cloned, so without this the shot's backdrop
   *  comes out transparent. */
  background?: string;
  /** Adjust the detached clone (e.g. remove UI that shouldn't ship in the
   *  shot) before rasterizing. */
  prepare?: (clone: HTMLElement) => void;
}

/** Capture `node` to a downloaded PNG. */
export async function captureElement(
  node: HTMLElement,
  { filename, background, prepare }: CaptureOptions,
): Promise<void> {
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));

  const clone = node.cloneNode(true) as HTMLElement;
  // Keep a positioning context for absolute children. Only strip translate
  // offsets — never force `static`, which orphans them.
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

  const pairs = pairElements(node, clone);
  preserveScroll(pairs);
  prepare?.(clone);
  const shadows = liftShadows(node, pairs);

  const css = `${await iconFontFace()}\n${collectCss()}\n${HIDE_SCROLLBARS}`;
  const svg = await rasterize(clone, css, width, height);

  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  paintShadows(ctx, shadows);
  ctx.drawImage(svg, 0, 0, canvas.width, canvas.height);

  await downloadPng(canvas, filename);
}

interface ShadowLayer {
  css: string;
  color: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
}

interface LiftedShadow {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  layers: ShadowLayer[];
}

/** Strip every blurred box-shadow from the clone and record its geometry so
 *  the canvas can draw it instead (see the Chrome quirk above). Hairline
 *  rings (blur 0) stay in the clone, where they render crisper. */
function liftShadows(root: HTMLElement, pairs: Pair[]): LiftedShadow[] {
  const rootRect = root.getBoundingClientRect();
  return pairs.flatMap(([live, el]) => {
    const style = getComputedStyle(live);
    const layers = parseBoxShadow(style.boxShadow);
    const blurred = layers.filter((layer) => layer.blur > 0);
    if (!blurred.length) return [];

    el.style.boxShadow =
      layers
        .filter((layer) => layer.blur === 0)
        .map((layer) => layer.css)
        .join(", ") || "none";

    const rect = live.getBoundingClientRect();
    return [
      {
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top,
        w: rect.width,
        h: rect.height,
        radius: parseFloat(style.borderTopLeftRadius) || 0,
        layers: blurred,
      },
    ];
  });
}

/** Parse a resolved `box-shadow` (always "<color> <x> <y> <blur> <spread>"
 *  per comma-separated layer). Inset layers are skipped: they paint inside
 *  the box, where the element's own content covers them. */
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

// Offset that pushes the shadow caster fully off-canvas so only its blurred
// halo lands in the shot. Unlike cursor-neue's windows, the shot's panes are
// translucent — a caster rect painted beneath one would show through it.
const OFFSCREEN = 100_000;

/** Draw lifted shadows beneath where the SVG layer will paint the panes. */
function paintShadows(ctx: CanvasRenderingContext2D, shadows: LiftedShadow[]): void {
  for (const { x, y, w, h, radius, layers } of shadows) {
    for (const layer of layers) {
      const sw = w + layer.spread * 2;
      const sh = h + layer.spread * 2;
      if (sw <= 0 || sh <= 0) continue;

      ctx.save();
      ctx.shadowColor = layer.color;
      ctx.shadowBlur = layer.blur * SCALE;
      ctx.shadowOffsetX = (layer.x + OFFSCREEN) * SCALE;
      ctx.shadowOffsetY = layer.y * SCALE;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.roundRect(
        (x - layer.spread - OFFSCREEN) * SCALE,
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

// Scrollbars are page furniture, never wanted in a shot — and a rendered one
// also steals gutter width, which re-truncates text against the live layout.
const HIDE_SCROLLBARS =
  "*{scrollbar-width:none !important;}*::-webkit-scrollbar{display:none !important;}";

/** Concatenate every readable stylesheet, dropping the original
 *  (unresolvable) icon @font-face so our inlined one wins. */
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

// Inherited properties set on <body> that the cloned subtree relies on.
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

/** Walk the live tree and its clone in lockstep. Both are identical
 *  structures, so document order pairs each clone with its live source. */
function pairElements(source: HTMLElement, clone: HTMLElement): Pair[] {
  const srcEls = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
  const cloneEls = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  return srcEls.flatMap((live, i) => (cloneEls[i] ? [[live, cloneEls[i]] as Pair] : []));
}

/** A foreignObject can't scroll, so a scrolled pane would otherwise rewind
 *  to the top in the shot. Shift its contents by the live scroll offset
 *  instead, and clip as the real container does. */
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

/** Escape text so it can sit inside an SVG/XML <style> block. */
function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/** Wrap the clone in an SVG foreignObject and decode it as an image, ready
 *  to paint over whatever backdrop the caller composited first. */
async function rasterize(
  clone: HTMLElement,
  css: string,
  width: number,
  height: number,
): Promise<HTMLImageElement> {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.cssText =
    `${rootVars()}${baseStyle()}position:relative;width:${width}px;height:${height}px;` +
    `overflow:hidden;`;
  wrapper.append(clone);

  const styleTag = `<style>${escapeXml(css)}</style>`;
  const body = new XMLSerializer().serializeToString(wrapper);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">${styleTag}${body}</foreignObject>` +
    `</svg>`;

  // data: URL is required so the canvas stays untainted (see file header).
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  // WebKit paints the first load before inner resources (the icon webfont)
  // have loaded; the second decode hits the cache with everything ready.
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
      // Tainted canvas (or oversized) yields null — try the sync data-URL
      // path so we surface a real error instead of a silent no-op.
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
