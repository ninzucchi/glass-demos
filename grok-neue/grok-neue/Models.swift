import Foundation

// The demo hierarchy: workspaces (Home + spaces) hold loose threads and
// projects (agents); threads nest without bound.

struct Message: Identifiable, Hashable {
    let id: String
    var role: Role
    var text: String

    enum Role: Hashable {
        case user, agent
    }
}

/// Named ChatThread to avoid shadowing Foundation.Thread.
struct ChatThread: Identifiable, Hashable {
    let id: String
    var title: String
    /// Message in the parent chat this thread replies to; renders a reply
    /// pill under that message.
    var parentMessageID: String?
    var messages: [Message] = []
    var threads: [ChatThread] = []
}

struct Project: Identifiable, Hashable {
    let id: String
    var name: String
    var kind: Kind = .agent
    /// SF Symbol name; falls back to the name's initial letter.
    var icon: String?
    var messages: [Message] = []
    var threads: [ChatThread] = []

    enum Kind: Hashable {
        case agent, group
    }
}

enum WorkspaceItem: Identifiable, Hashable {
    case thread(ChatThread)
    case project(Project)

    var id: String {
        switch self {
        case .thread(let thread): thread.id
        case .project(let project): project.id
        }
    }
}

struct Workspace: Identifiable, Hashable {
    let id: String
    var name: String
    /// SF Symbol name; falls back to the name's initial letter.
    var icon: String?
    var messages: [Message] = []
    var items: [WorkspaceItem] = []
}

/// The two shortlisted "Selects" home layouts from the hierarchy demo.
enum HomeVariant: String, CaseIterable, Identifiable {
    /// 1B — Home section (agents + threads) with Spaces below.
    case sections
    /// 5A — one flat Chats run: home items then spaces.
    case flat

    var id: String { rawValue }

    var label: String {
        switch self {
        case .sections: "1B. Spaces, Agents, Threads"
        case .flat: "5A. Chats, Agents, Threads"
        }
    }
}

/// A simulated content surface: when a sent message implies one of these
/// mediums, the footer capsule grows a matching tab (an empty placeholder
/// screen — the point is the "tabs flex with the conversation" vibe).
enum ContentSurface: String, CaseIterable, Identifiable {
    case image, code, doc

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .image: "photo"
        case .code: "curlybraces"
        case .doc: "doc.text"
        }
    }

    var label: String {
        switch self {
        case .image: "Image"
        case .code: "Code"
        case .doc: "Doc"
        }
    }

    private var keywords: [String] {
        switch self {
        case .image: ["image", "photo", "picture", "logo", "render", "draw", "illustration", "wallpaper"]
        case .code: ["code", "function", "script", "component", "refactor", "bug", "implement"]
        case .doc: ["doc", "draft", "write", "essay", "notes", "outline"]
        }
    }

    /// Surfaces the conversation has flexed open so far (user messages
    /// only — agent replies shouldn't spawn tabs).
    static func surfaces(for messages: [Message]) -> [ContentSurface] {
        allCases.filter { surface in
            messages.contains { message in
                guard message.role == .user else { return false }
                let lowered = message.text.lowercased()
                return surface.keywords.contains { lowered.contains($0) }
            }
        }
    }
}

/// How a top-level container exposes its child index: the nav bar's list
/// button opening a bottom sheet, or a footer capsule swapping the whole
/// screen between the main chat and the index.
enum IndexStyle: String, CaseIterable, Identifiable {
    case sheet
    case footer

    var id: String { rawValue }

    var label: String {
        switch self {
        case .sheet: "Bottom Sheet"
        case .footer: "Footer Toggle"
        }
    }
}
