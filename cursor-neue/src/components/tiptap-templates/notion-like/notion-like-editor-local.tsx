import { useContext, useEffect, useRef, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Code } from "@tiptap/extension-code";
import { Mention } from "@tiptap/extension-mention";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder, Selection } from "@tiptap/extensions";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Emoji, gitHubEmojis } from "@tiptap/extension-emoji";
import { AgentLink } from "@/components/tiptap-node/agent-link-node/agent-link-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { PrLink } from "@/components/tiptap-node/pr-link-node/pr-link-node-extension";
import { UiState } from "@/components/tiptap-extension/ui-state-extension";
import { Image } from "@/components/tiptap-node/image-node/image-node-extension";
import { NodeBackground } from "@/components/tiptap-extension/node-background-extension";
import { NodeAlignment } from "@/components/tiptap-extension/node-alignment-extension";
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { TableKit } from "@/components/tiptap-node/table-node/extensions/table-node-extension";
import { EmojiDropdownMenu } from "@/components/tiptap-ui/emoji-dropdown-menu";
import { MentionDropdownMenu } from "@/components/tiptap-ui/mention-dropdown-menu";
import { SlashDropdownMenu } from "@/components/tiptap-ui/slash-dropdown-menu";
import { DragContextMenu } from "@/components/tiptap-ui/drag-context-menu";
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import "@/components/tiptap-node/table-node/styles/prosemirror-table.scss";
import "@/components/tiptap-node/table-node/styles/table-node.scss";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "@/components/tiptap-templates/notion-like/notion-like-editor.scss";
import { NotionToolbarFloating } from "@/components/tiptap-templates/notion-like/notion-like-editor-toolbar-floating";
import { ListNormalizationExtension } from "@/components/tiptap-extension/list-normalization-extension";
import { Indent } from "@/components/tiptap-extension/indent-extension";
import { TripleClickBlockSelection } from "@/components/tiptap-extension/triple-click-block-selection-extension";
import { useUiEditorState } from "@/hooks/use-ui-editor-state";

function isCustomLinkNode(target: Element): boolean {
  return Boolean(target.closest(".agent-link-node, .pr-link-node"));
}

/** Notion-like UI, local only. No Tiptap Cloud collab or AI. */
export function NotionEditorLocal({
  content,
  sourceKey,
  placeholder = "Type / for commands…",
  cover,
  onLinkClick,
}: {
  content: JSONContent;
  sourceKey: string;
  placeholder?: string;
  /** Sits above the title, outside the editable document. */
  cover?: ReactNode;
  /** Regular `<a>` marks (not agent or PR nodes). */
  onLinkClick?: (href: string) => void;
}) {
  const onLinkClickRef = useRef(onLinkClick);
  onLinkClickRef.current = onLinkClick;

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "notion-like-editor",
      },
      handleClick: (_view, _pos, event) => {
        const open = onLinkClickRef.current;
        if (!open) return false;
        const target = event.target;
        if (!(target instanceof Element) || isCustomLinkNode(target)) return false;
        const anchor = target.closest("a");
        const href = anchor?.getAttribute("href");
        if (!href) return false;
        event.preventDefault();
        open(href);
        return true;
      },
    },
    extensions: [
      StarterKit.configure({
        code: false,
        horizontalRule: false,
        dropcursor: { width: 2 },
        link: { openOnClick: false },
      }),
      Code.extend({ excludes: "" }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder,
        emptyNodeClass: "is-empty with-slash",
      }),
      Mention,
      AgentLink,
      PrLink,
      Emoji.configure({
        emojis: gitHubEmojis.filter((emoji) => !emoji.name.includes("regional")),
        forceFallbackImages: true,
      }),
      TableKit.configure({
        table: { resizable: true, cellMinWidth: 120 },
      }),
      NodeBackground.configure({
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "taskList",
          "bulletList",
          "orderedList",
          "tableCell",
          "tableHeader",
        ],
      }),
      NodeAlignment,
      TextStyle,
      Superscript,
      Subscript,
      Indent,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Selection,
      Image,
      ListNormalizationExtension,
      TripleClickBlockSelection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      Typography.configure({
        rightArrow: "➝",
      }),
      UiState,
    ],
    content,
  });

  const contentRef = useRef(content);
  contentRef.current = content;
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(contentRef.current);
  }, [editor, sourceKey]);

  if (!editor) return null;

  return (
    <div className="notion-like-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <div className={cover ? "notion-like-editor-layout has-cover" : "notion-like-editor-layout"}>
          {cover ? <div className="notion-like-editor-cover">{cover}</div> : null}
          <LocalEditorContent />
        </div>
      </EditorContext.Provider>
    </div>
  );
}

function LocalEditorContent() {
  const { editor } = useContext(EditorContext)!;
  const { isDragging } = useUiEditorState(editor);
  if (!editor) return null;
  return (
    <EditorContent
      editor={editor}
      role="presentation"
      className="notion-like-editor-content"
      style={{ cursor: isDragging ? "grabbing" : "auto" }}
    >
      <DragContextMenu />
      <EmojiDropdownMenu />
      <MentionDropdownMenu />
      <SlashDropdownMenu />
      <NotionToolbarFloating />
    </EditorContent>
  );
}
