import SwiftUI

/// Pushed chat screen for a space, agent, or thread. Resolves its content
/// from the model so sends and creates reflect immediately.
struct ChatScreen: View {
    let model: AppModel
    let route: Route

    var body: some View {
        VStack(spacing: 0) {
            if let context = model.chatContext(for: route) {
                ChatBody(
                    model: model,
                    context: context,
                    // The footer swap applies only to the top-most pushed
                    // entity; deeper containers keep the sheet approach.
                    usesFooterIndex: model.indexStyle == .footer
                        && model.path.first == route
                        && !context.childRows.isEmpty
                )
            } else {
                ContentUnavailableView("Not Found", systemImage: "questionmark.circle")
            }
        }
        .background(Color.bg.chrome)
        .toolbarTitleDisplayMode(.inline)
    }
}

/// What a footer-index screen is currently showing.
private enum ChatViewMode: Equatable {
    case index, chat
    case content(ContentSurface)
}

// Pinned beside the back button; macOS has no top-bar leading placement,
// so it falls back to the generic navigation slot there.
#if os(macOS)
private let indexButtonPlacement: ToolbarItemPlacement = .navigation
#else
private let indexButtonPlacement: ToolbarItemPlacement = .topBarLeading
#endif

private struct ChatBody: View {
    let model: AppModel
    let context: ChatContext
    let usesFooterIndex: Bool
    @State private var draft = ""
    @State private var showsIndex = false
    // Footer screens land on the chat; the capsule swaps to the index.
    @State private var mode: ChatViewMode = .chat

    private var showsIndexBody: Bool {
        usesFooterIndex && mode == .index
    }

    /// The conversation-grown surface on screen, if the capsule picked one.
    private var activeSurface: ContentSurface? {
        guard usesFooterIndex, case .content(let surface) = mode else { return nil }
        return surface
    }

    var body: some View {
        let repliesByMessage = Dictionary(
            grouping: context.threads.filter { $0.parentMessageID != nil },
            by: { $0.parentMessageID! }
        )
        let surfaces = usesFooterIndex ? ContentSurface.surfaces(for: context.messages) : []

        VStack(spacing: 0) {
            if showsIndexBody {
                // Child index takes over the screen (footer approach).
                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(context.childRows) { row in
                            EntityRowView(row: row) { model.open(row) }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                }
            } else if let surface = activeSurface {
                SurfacePlaceholder(surface: surface)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 16) {
                        ForEach(context.messages) { message in
                            MessageCell(
                                message: message,
                                replies: repliesByMessage[message.id] ?? [],
                                onOpenThread: { model.openThread($0.id) }
                            )
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .defaultScrollAnchor(.bottom)
            }
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 6) {
                if !showsIndexBody && activeSurface == nil {
                    Composer(draft: $draft) {
                        model.send(draft, to: context.id)
                        draft = ""
                    }
                }
                if usesFooterIndex {
                    IndexChatToggle(mode: $mode, surfaces: surfaces)
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .principal) {
                ChatTitle(title: context.title, subtitle: context.subtitle, badge: context.badge)
            }
            if !context.childRows.isEmpty && !usesFooterIndex {
                ToolbarItem(placement: indexButtonPlacement) {
                    Button {
                        showsIndex = true
                    } label: {
                        Image(systemName: "list.bullet")
                    }
                }
            }
            ToolbarItem(placement: .primaryAction) {
                if context.createLabel != nil {
                    Button {
                        model.createChild(of: context.id)
                    } label: {
                        Image(systemName: "plus")
                    }
                } else {
                    Menu {
                        Button("Rename", systemImage: "pencil") {}
                        Button("Delete", systemImage: "trash", role: .destructive) {}
                    } label: {
                        Image(systemName: "ellipsis")
                    }
                }
            }
        }
        .sheet(isPresented: $showsIndex) {
            ChildIndexSheet(title: context.title, rows: context.childRows) { row in
                model.open(row)
            }
        }
    }
}

/// Centered identity: badge stacked over the title; muted parent context
/// line when there's no badge (thread screens).
private struct ChatTitle: View {
    let title: String
    let subtitle: String?
    let badge: BadgeShape?

    var body: some View {
        VStack(spacing: 2) {
            if let badge {
                LeadingBadge(shape: badge, label: title)
            }
            Text(title)
                .font(.sm.medium)
                .foregroundStyle(Color.text.primary)
                .lineLimit(1)
            if badge == nil, let subtitle {
                Text(subtitle)
                    .font(.xs)
                    .foregroundStyle(Color.text.tertiary)
                    .lineLimit(1)
            }
        }
    }
}

/// One transcript entry: user text in a trailing bubble, agent text plain,
/// with reply pills for threads anchored to this message.
private struct MessageCell: View {
    let message: Message
    let replies: [ChatThread]
    let onOpenThread: (ChatThread) -> Void

    private var isUser: Bool { message.role == .user }

    var body: some View {
        VStack(alignment: isUser ? .trailing : .leading, spacing: 8) {
            HStack {
                if isUser {
                    Spacer(minLength: 48)
                    Text(message.text)
                        .font(.base)
                        .foregroundStyle(Color.text.primary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(Color.bg.tertiary, in: .rect(cornerRadius: 18))
                } else {
                    Text(message.text)
                        .font(.base)
                        .foregroundStyle(Color.text.primary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            ForEach(replies) { thread in
                ReplyPill(thread: thread) { onOpenThread(thread) }
            }
        }
        .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)
    }
}

private struct ReplyPill: View {
    let thread: ChatThread
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                Image(systemName: "arrow.turn.down.right")
                    .font(.xs)
                Text(thread.title)
                    .font(.sm.medium)
                    .lineLimit(1)
            }
            .foregroundStyle(Color.text.secondary)
            .padding(.horizontal, 12)
            .frame(height: 30)
            .background(Color.bg.quaternary, in: .capsule)
            .overlay(Capsule().stroke(Color.border.tertiary, lineWidth: 0.5))
        }
        .buttonStyle(.plain)
    }
}

/// Footer capsule swapping a footer-index screen between the entity's child
/// index, its main chat, and any conversation-grown content surfaces.
private struct IndexChatToggle: View {
    @Binding var mode: ChatViewMode
    let surfaces: [ContentSurface]

    var body: some View {
        HStack(spacing: 0) {
            ToggleSegment(icon: "list.bullet", isActive: mode == .index) { mode = .index }
            ToggleSegment(icon: "bubble", isActive: mode == .chat) { mode = .chat }
            ForEach(surfaces) { surface in
                ToggleSegment(icon: surface.icon, isActive: mode == .content(surface)) {
                    mode = .content(surface)
                }
            }
        }
        .padding(2)
        .background(Color.bg.quaternary, in: .capsule)
        .padding(.bottom, 6)
        // New surfaces slide the capsule open right as the send lands.
        .animation(.snappy, value: surfaces)
    }
}

/// Empty placeholder for a grown surface — just the medium's identity, to
/// sell the "conversation grows tabs" simulation.
private struct SurfacePlaceholder: View {
    let surface: ContentSurface

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: surface.icon)
                .font(.xxl)
                .foregroundStyle(Color.icon.quaternary)
            Text(surface.label)
                .font(.base.medium)
                .foregroundStyle(Color.text.quaternary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct ToggleSegment: View {
    let icon: String
    let isActive: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Image(systemName: icon)
                .font(.lg)
                .foregroundStyle(isActive ? Color.icon.primary : Color.icon.secondary)
                .frame(width: 56, height: 36)
                .background(Color.bg.elevated.opacity(isActive ? 1 : 0), in: .capsule)
                .shadow(color: .black.opacity(isActive ? 0.08 : 0), radius: 3, y: 1)
        }
        .buttonStyle(.plain)
    }
}

private struct Composer: View {
    @Binding var draft: String
    let onSend: () -> Void

    private var isEmpty: Bool {
        draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Reply…", text: $draft, axis: .vertical)
                .font(.base)
                .lineLimit(1...4)
                .padding(.vertical, 7)
            Button(action: onSend) {
                Image(systemName: "arrow.up")
                    .font(.sm.bold)
                    .foregroundStyle(Color.bg.elevated)
                    .frame(width: 30, height: 30)
                    .background(Color.text.primary, in: .circle)
            }
            .buttonStyle(.plain)
            .disabled(isEmpty)
            .opacity(isEmpty ? 0.35 : 1)
        }
        .padding(.leading, 16)
        .padding(.trailing, 7)
        .padding(.vertical, 7)
        .background(Color.bg.elevated, in: .rect(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.border.secondary, lineWidth: 0.5))
        .padding(.horizontal, 12)
        .padding(.bottom, 8)
    }
}

/// Bottom sheet listing a container's children; tapping a row pushes it.
private struct ChildIndexSheet: View {
    let title: String
    let rows: [RowItem]
    let onPick: (RowItem) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.lg.medium)
                    .foregroundStyle(Color.text.primary)
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.xs.semibold)
                        .foregroundStyle(Color.icon.secondary)
                        .frame(width: 28, height: 28)
                        .background(Color.bg.quaternary, in: .circle)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)

            ScrollView {
                VStack(spacing: 0) {
                    ForEach(rows) { row in
                        EntityRowView(row: row) {
                            dismiss()
                            onPick(row)
                        }
                    }
                }
                .padding(.horizontal, 8)
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(Color.bg.elevated)
    }
}
