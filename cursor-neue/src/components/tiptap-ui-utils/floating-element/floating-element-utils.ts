import type { Editor } from "@tiptap/react"

export const isElementWithinEditor = (
  editor: Editor | null,
  element: Node | null
) => {
  if (!element || !editor) {
    return false
  }

  const editorWrapper = editor.view.dom.parentElement
  const editorDom = editor.view.dom

  if (!editorWrapper) {
    return false
  }

  return (
    editorWrapper === element ||
    editorDom === element ||
    editorWrapper.contains(element)
  )
}

export const isElementWithinExternalPortal = (
  element: Node | null
): boolean => {
  if (!(element instanceof HTMLElement)) return false
  return (
    element.closest(
      ["[data-radix-popper-content-wrapper]", "[data-base-ui-portal]"].join(",")
    ) !== null
  )
}

/**
 * Whether a press was swallowed by an open modal layer instead of landing on
 * real UI.
 *
 * A modal dismissable layer such as `DropdownMenu modal` sets
 * `pointer-events: none` on `<body>` for as long as it is open, so hit-testing
 * skips every element underneath it, including the trigger that opened it. The
 * browser then reports `<html>` or `<body>` as the press target, which reads
 * like a press far outside any floating UI even when the user clicked a button
 * inside one. The layer closes itself on that press, so anything else
 * listening for outside presses must let it pass.
 */
export const isPressSwallowedByModalLayer = (element: Node | null): boolean => {
  const doc = element?.ownerDocument
  if (!doc) return false

  if (element !== doc.documentElement && element !== doc.body) return false

  const view = doc.defaultView
  if (!view) return false

  return view.getComputedStyle(doc.body).pointerEvents === "none"
}
