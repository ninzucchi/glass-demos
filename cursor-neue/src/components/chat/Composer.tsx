import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { ThreadOriginCaption } from "@/components/chat/ThreadOrigin";
import { useWindowId } from "@/components/window/WindowContext";
import type { Agent } from "@/types";
import { useUiStore } from "@/store/useUiStore";
import { useActiveAgent, useWorkspaceStore } from "@/store/useWorkspaceStore";

// Resting composer height = 3 text lines. text-lg's line-height is 20px
// (--line-height-lg: 1.25rem), so 3 × 20 = 60px. The textarea carries no vertical
// padding of its own (the card supplies the top inset), so the resting min-height
// is exactly the 3-line block; it auto-grows past that up to MAX_INPUT_H, then scrolls.
const INPUT_LINE_H = 20;
const RESTING_INPUT_H = INPUT_LINE_H * 3;
const MAX_INPUT_H = INPUT_LINE_H * 10;

/** Fades composer text at the mic edge; width matches composer padding (p-2). */
const MIC_FADE_PX = 8;
const MIC_FADE_GRADIENT = `linear-gradient(to right, transparent, var(--bg-elevated) ${MIC_FADE_PX}px)`;

/** Static context-usage ring: 14x14, 2px stroke, track + partial progress arc. */
function ContextUsageRing({ percent }: { percent: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r={r} fill="none" stroke="var(--border-secondary)" strokeWidth="2" />
        <circle
          cx="7"
          cy="7"
          r={r}
          fill="none"
          stroke="var(--icon-tertiary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent)}
          transform="rotate(-90 7 7)"
        />
      </svg>
    </span>
  );
}

/** A label + dropdown caret — the shared shape for the workspace, branch, and
 *  model selectors. */
function DropdownChip({ label }: { label: string }) {
  return (
    <button type="button" className="flex min-w-0 items-center gap-1 text-base text-secondary">
      <span className="truncate text-left">{label}</span>
      <Icon name="chevron-down" size="sm" color="quaternary" />
    </button>
  );
}

/** Workspace selector. Null for standalone agents (no workspace to scope to). */
function WorkspaceChip({ agent }: { agent?: Agent }) {
  const workspaceId = agent ? agent.workspaceIds[0] : null;
  const name = useWorkspaceStore((s) => (workspaceId ? s.workspaces[workspaceId]?.name : null));
  return name ? <DropdownChip label={name} /> : null;
}

/** Branch selector. Null for standalone agents (not on a workspace branch). */
function BranchChip({ agent }: { agent?: Agent }) {
  const branch = agent ? agent.branch : null;
  return branch ? <DropdownChip label={branch} /> : null;
}

/** Model selector. Used in the two-story card's bottom bar. */
function ModelChip() {
  return <DropdownChip label="Composer 2.5" />;
}

/** Round add-context button, shared by both variants. */
function AddContextButton() {
  return (
    <button
      type="button"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tertiary hover:bg-quaternary"
      aria-label="Add context"
    >
      <Icon name="plus" size="base" color="secondary" />
    </button>
  );
}

/** Round dictate button, shared by both variants. The empty composer shows the
 *  mic (no text to send), so the trailing action is dictation in both states. */
function DictateButton() {
  return (
    <button
      type="button"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral"
      aria-label="Dictate"
    >
      <Icon
        name="mic-filled"
        size="base"
        color="inherit"
        style={{ color: "var(--text-inverted)" }}
      />
    </button>
  );
}

/** The accessory row under the followup composer: branch chip for regular
 *  chats, the thread-origin caption for threads (they inherit the parent's
 *  branch, so the caption takes the chip's slot), context ring on the right. */
function AccessoryRow({ agent }: { agent?: Agent }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2.5">
      {agent?.thread ? <ThreadOriginCaption agent={agent} /> : <BranchChip agent={agent} />}
      <ContextUsageRing percent={0.32} />
    </div>
  );
}

/** The two-story composer card: an auto-growing textarea over a bottom action
 *  bar (add-context, model chip, dictate), optionally topped with a quoted
 *  excerpt (threads). The placeholder renders as a truncating overlay because
 *  text-overflow:ellipsis doesn't apply to a textarea's native placeholder. */
function ComposerCard({
  inputRef,
  empty,
  placeholder,
  quote,
  autoFocus,
  defaultValue,
  onInput,
  onKeyDown,
  onExpand,
}: {
  inputRef: RefObject<HTMLTextAreaElement>;
  empty: boolean;
  placeholder: string;
  quote?: string;
  autoFocus?: boolean;
  defaultValue?: string;
  onInput: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Opens the expanded writing surface. Omitted where there's no agent to
   *  attach the surface's text and shapes to. */
  onExpand?: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-elevated shadow-[0_0_0_1px_var(--border-secondary)]">
      {quote && (
        <div className="px-2.5 pt-2.5">
          <div className="truncate border-l-2 border-secondary pl-2 text-base italic text-tertiary">
            {quote}
          </div>
        </div>
      )}
      <div className={clsx("relative px-2.5", quote ? "pt-2" : "pt-2.5")}>
        <textarea
          ref={inputRef}
          rows={1}
          autoFocus={autoFocus}
          defaultValue={defaultValue}
          onInput={onInput}
          onKeyDown={onKeyDown}
          aria-label={placeholder}
          style={{ minHeight: RESTING_INPUT_H, maxHeight: MAX_INPUT_H }}
          className={clsx(
            "w-full min-w-0 resize-none overflow-y-auto bg-transparent text-lg leading-[20px] text-primary outline-none",
            onExpand && "pr-7",
          )}
        />
        {empty && (
          <div
            className={clsx(
              "pointer-events-none absolute inset-x-2.5 truncate text-lg leading-[20px] text-quaternary",
              quote ? "top-2" : "top-2.5",
              onExpand && "pr-7",
            )}
          >
            {placeholder}
          </div>
        )}
        {onExpand && (
          <IconButton
            name="arrows-expand"
            size="sm"
            aria-label="Expand composer"
            onClick={onExpand}
            className="absolute right-1.5 top-1.5"
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-2">
        <div className="flex min-w-0 items-center gap-2">
          <AddContextButton />
          <ModelChip />
        </div>
        <DictateButton />
      </div>
    </div>
  );
}

export type ComposerVariant = "followup" | "expanded";

/** The chat composer in one of three layouts:
 *
 *  - "expanded" (an agent's empty state, centered): the two-story ComposerCard
 *    with a workspace/branch selector row on top.
 *  - "followup" for a FRESH thread (nothing sent yet): the same card with the
 *    highlighted excerpt quoted above the input and the thread-origin caption
 *    below — the reply's context lives in the composer, not a header.
 *  - "followup" otherwise: a fully-rounded single-line pill (input + mic-fade)
 *    with the accessory row (branch chip / thread caption + ring) below.
 *
 *  The shared atoms (chips, buttons, card, accessory row) are factored out
 *  above; only the layout shells differ, so each variant is its own return
 *  block rather than one tree riddled with per-element conditionals. The
 *  textarea autosize state lives here unconditionally (it no-ops for the pill,
 *  whose ref is never attached) so the component keeps a single set of hooks. */
export function Composer({
  variant = "followup",
  agent,
}: {
  variant?: ComposerVariant;
  /** The agent this composer addresses (per chat tab, not the window's active). */
  agent?: Agent;
}) {
  // Workspace agents show the workspace/branch selectors (expanded only); standalone don't.
  const hasContext = !!agent;
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const setDraft = useWorkspaceStore((s) => s.setDraft);
  // Unsent thread text is mirrored to the store so the parent chat's "1 Draft"
  // pill tracks it; the field itself stays uncontrolled (defaultValue restores
  // the draft when the thread reopens).
  const draft = useWorkspaceStore((s) => (agent ? s.drafts[agent.id] ?? "" : ""));
  // Auto-grow the card textarea: reset to the 3-line resting block, then grow
  // to fit content up to MAX_INPUT_H (beyond which it scrolls). A restored
  // draft starts non-empty.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [empty, setEmpty] = useState(() => draft === "");
  const autosize = () => {
    const el = inputRef.current;
    // The single-line pill shares this ref (for focus) but must not autosize.
    if (!(el instanceof HTMLTextAreaElement)) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_H)}px`;
  };

  // Focusing a chat tab makes its agent the window's active one; pull the caret
  // into this composer so the user can type immediately (stealing focus from
  // wherever it was — e.g. another chat's input — is intended).
  const activeAgentId = useActiveAgent()?.id;
  const isActiveChat = !!agent && agent.id === activeAgentId;
  useEffect(() => {
    if (isActiveChat) inputRef.current?.focus();
  }, [isActiveChat]);
  const handleInput = () => {
    autosize();
    setEmpty(!inputRef.current?.value);
  };
  useLayoutEffect(autosize, []);

  // The expanded surface edits the same draft, so pull any outside change into
  // this (uncontrolled) field. Typing here writes the draft first, so the value
  // already matches and this no-ops.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || el.value === draft) return;
    el.value = draft;
    autosize();
    setEmpty(draft === "");
  }, [draft]);

  const windowId = useWindowId();
  const openComposerSurface = useUiStore((s) => s.openComposerSurface);
  const expand = agent ? () => openComposerSurface(windowId, agent.id) : undefined;
  // Mirror typing into the draft so the surface opens on the current text.
  const onCardInput = () => {
    handleInput();
    if (agent) setDraft(agent.id, inputRef.current?.value ?? "");
  };

  // Enter sends (Shift+Enter keeps the newline in the card textarea).
  const submit = (el: HTMLInputElement | HTMLTextAreaElement) => {
    if (!agent || !el.value.trim()) return;
    sendMessage(agent.id, el.value);
    el.value = "";
    if (el === inputRef.current) {
      autosize();
      setEmpty(true);
    }
  };
  const onSendKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    submit(e.currentTarget);
  };

  if (variant === "expanded") {
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-2 pl-3 pr-[calc(12px+var(--island-inset,0px))]">
        {hasContext && (
          <div className="flex min-w-0 items-center gap-2 px-2.5">
            <WorkspaceChip agent={agent} />
            <BranchChip agent={agent} />
          </div>
        )}
        <ComposerCard
          inputRef={inputRef}
          empty={empty}
          placeholder="Plan, @ for context, / for commands"
          defaultValue={draft}
          onInput={onCardInput}
          onKeyDown={onSendKeyDown}
          onExpand={expand}
        />
      </div>
    );
  }

  // Fresh thread (nothing sent yet): the card with the excerpt quoted above the
  // input. After the first send the thread drops to the normal pill below.
  if (agent?.thread && agent.messages.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-2.5 pb-3 pl-3 pr-[calc(12px+var(--island-inset,0px))]">
        <ComposerCard
          inputRef={inputRef}
          empty={empty}
          placeholder="Reply in thread..."
          quote={agent.thread.excerpt}
          autoFocus
          defaultValue={draft}
          onInput={onCardInput}
          onKeyDown={onSendKeyDown}
          onExpand={expand}
        />
        <AccessoryRow agent={agent} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-2.5 pb-3 pl-3 pr-[calc(12px+var(--island-inset,0px))]">
      {/* Composer/Glass: elevated, 1px secondary ring, fully rounded */}
      <div className="flex items-center gap-2 rounded-full bg-elevated p-2 shadow-[0_0_0_1px_var(--border-secondary)]">
        <AddContextButton />
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef as unknown as RefObject<HTMLInputElement>}
            className="w-full min-w-0 bg-transparent text-lg text-primary outline-none placeholder:text-quaternary"
            placeholder="/ for commands, @ to add context..."
            onKeyDown={onSendKeyDown}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-2"
            style={{ background: MIC_FADE_GRADIENT }}
            aria-hidden
          />
        </div>
        <DictateButton />
      </div>
      <AccessoryRow agent={agent} />
    </div>
  );
}
