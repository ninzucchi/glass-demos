// Suppresses native text selection (and optionally forces a cursor) during a
// pointer-driven drag. Ref-counted so nested drags don't clear it early: body
// styles are captured on the first lock and restored on the last release. Each
// lock returns an idempotent release fn.

let active = 0;
let prevUserSelect = "";
let prevWebkitUserSelect = "";
let prevCursor = "";

type WebkitStyle = CSSStyleDeclaration & { webkitUserSelect?: string };

export function lockDragSelection(cursor?: string): () => void {
  const style = document.body.style as WebkitStyle;
  if (active === 0) {
    prevUserSelect = style.userSelect;
    prevWebkitUserSelect = style.webkitUserSelect ?? "";
    prevCursor = style.cursor;
    style.userSelect = "none";
    style.webkitUserSelect = "none";
    if (cursor) style.cursor = cursor;
  }
  active += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    active -= 1;
    if (active === 0) {
      style.userSelect = prevUserSelect;
      style.webkitUserSelect = prevWebkitUserSelect;
      style.cursor = prevCursor;
    }
  };
}
