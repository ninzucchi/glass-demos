import SwiftUI

/// A pushed screen. Every push in the Selects variants is a chat, so routes
/// only need the target entity's id; screens resolve content via `AppModel`.
enum Route: Hashable {
    case workspace(String)
    case project(String)
    case thread(String)
}

/// Leading identity treatment, mirroring the demo's per-variant badges.
enum BadgeShape: Hashable {
    /// Rounded-square space badge (sections variant).
    case chiclet(icon: String?)
    /// Circular space badge (flat variant).
    case circle(icon: String?)
    /// Agent face: hashed fill with two upright eyes.
    case face
    /// Plain thread dot.
    case dot
}

/// One tappable row in the home list or a child-index sheet.
struct RowItem: Identifiable, Hashable {
    let id: String
    var title: String
    var badge: BadgeShape
    var isContainer: Bool
    var route: Route
}

struct HomeSection: Identifiable {
    let id: String
    var label: String
    var rows: [RowItem]
}

/// Everything a pushed chat screen renders, resolved from a `Route`.
struct ChatContext {
    var id: String
    var title: String
    var subtitle: String?
    var badge: BadgeShape?
    var messages: [Message]
    /// Child threads; ones anchored to a message render as reply pills.
    var threads: [ChatThread]
    /// Children shown by the nav bar's list button (empty hides the button).
    var childRows: [RowItem]
    /// Label for the trailing plus; nil on leaf thread screens.
    var createLabel: String?
}

@MainActor
@Observable
final class AppModel {
    var workspaces: [Workspace] = SampleData.workspaces
    var variant: HomeVariant = .sections
    var indexStyle: IndexStyle = .footer
    var path: [Route] = []

    // MARK: - Navigation

    func open(_ row: RowItem) {
        path.append(row.route)
    }

    func openThread(_ id: String) {
        path.append(.thread(id))
    }

    /// Creates a thread inside the target container and pushes it.
    func createChild(of targetID: String) {
        let thread = ChatThread(id: UUID().uuidString, title: "New Thread")
        if let index = workspaces.firstIndex(where: { $0.id == targetID }) {
            workspaces[index].items.append(.thread(thread))
        } else if !appendThreadToProject(thread, projectID: targetID) {
            return
        }
        path.append(.thread(thread.id))
    }

    private func appendThreadToProject(_ thread: ChatThread, projectID: String) -> Bool {
        for i in workspaces.indices {
            for j in workspaces[i].items.indices {
                if case .project(var project) = workspaces[i].items[j], project.id == projectID {
                    project.threads.append(thread)
                    workspaces[i].items[j] = .project(project)
                    return true
                }
            }
        }
        return false
    }

    // MARK: - Home sections

    func homeSections() -> [HomeSection] {
        let home = workspaces.first { $0.id == SampleData.homeID }
        let spaces = workspaces.filter { $0.id != SampleData.homeID }
        let homeRows = home?.items.map(itemRow) ?? []

        switch variant {
        case .sections:
            return [
                HomeSection(id: "home", label: "Home", rows: homeRows),
                HomeSection(id: "spaces", label: "Spaces", rows: spaces.map(spaceRow)),
            ]
        case .flat:
            return [
                HomeSection(id: "chats", label: "Chats", rows: homeRows + spaces.map(spaceRow)),
            ]
        }
    }

    private func itemRow(_ item: WorkspaceItem) -> RowItem {
        switch item {
        case .thread(let thread):
            RowItem(id: thread.id, title: thread.title, badge: .dot, isContainer: false, route: .thread(thread.id))
        case .project(let project):
            RowItem(id: project.id, title: project.name, badge: .face, isContainer: true, route: .project(project.id))
        }
    }

    private func spaceRow(_ workspace: Workspace) -> RowItem {
        RowItem(
            id: workspace.id,
            title: workspace.name,
            badge: variant == .flat ? .circle(icon: workspace.icon) : .chiclet(icon: workspace.icon),
            isContainer: true,
            route: .workspace(workspace.id)
        )
    }

    // MARK: - Chat resolution

    func chatContext(for route: Route) -> ChatContext? {
        switch route {
        case .workspace(let id):
            guard let workspace = workspaces.first(where: { $0.id == id }) else { return nil }
            let looseThreads = workspace.items.compactMap { item -> ChatThread? in
                if case .thread(let thread) = item { return thread }
                return nil
            }
            return ChatContext(
                id: workspace.id,
                title: workspace.name,
                badge: variant == .flat ? .circle(icon: workspace.icon) : .chiclet(icon: workspace.icon),
                messages: workspace.messages,
                threads: looseThreads,
                childRows: workspace.items.map(itemRow),
                createLabel: "New Chat"
            )
        case .project(let id):
            guard let (project, workspace) = findProject(id) else { return nil }
            return ChatContext(
                id: project.id,
                title: project.name,
                subtitle: workspace.id == SampleData.homeID ? nil : workspace.name,
                badge: .face,
                messages: project.messages,
                threads: project.threads,
                childRows: project.threads.map { RowItem(id: $0.id, title: $0.title, badge: .dot, isContainer: false, route: .thread($0.id)) },
                createLabel: "New Thread"
            )
        case .thread(let id):
            guard let (thread, parentTitle) = findThread(id) else { return nil }
            return ChatContext(
                id: thread.id,
                title: thread.title,
                subtitle: parentTitle,
                messages: thread.messages,
                threads: thread.threads,
                childRows: [],
                createLabel: nil
            )
        }
    }

    private func findProject(_ id: String) -> (Project, Workspace)? {
        for workspace in workspaces {
            for item in workspace.items {
                if case .project(let project) = item, project.id == id {
                    return (project, workspace)
                }
            }
        }
        return nil
    }

    private func findThread(_ id: String) -> (thread: ChatThread, parentTitle: String)? {
        for workspace in workspaces {
            for item in workspace.items {
                switch item {
                case .thread(let thread):
                    if let hit = Self.find(id, in: [thread], parentTitle: workspace.name) { return hit }
                case .project(let project):
                    if let hit = Self.find(id, in: project.threads, parentTitle: project.name) { return hit }
                }
            }
        }
        return nil
    }

    private static func find(_ id: String, in threads: [ChatThread], parentTitle: String) -> (ChatThread, String)? {
        for thread in threads {
            if thread.id == id { return (thread, parentTitle) }
            if let hit = find(id, in: thread.threads, parentTitle: thread.title) { return hit }
        }
        return nil
    }

    // MARK: - Messages

    func send(_ text: String, to targetID: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let message = Message(id: UUID().uuidString, role: .user, text: trimmed)

        for i in workspaces.indices {
            if workspaces[i].id == targetID {
                workspaces[i].messages.append(message)
                return
            }
            for j in workspaces[i].items.indices {
                switch workspaces[i].items[j] {
                case .project(var project):
                    if project.id == targetID {
                        project.messages.append(message)
                        workspaces[i].items[j] = .project(project)
                        return
                    }
                    if Self.append(message, toThread: targetID, in: &project.threads) {
                        workspaces[i].items[j] = .project(project)
                        return
                    }
                case .thread(var thread):
                    if thread.id == targetID {
                        thread.messages.append(message)
                        workspaces[i].items[j] = .thread(thread)
                        return
                    }
                    if Self.append(message, toThread: targetID, in: &thread.threads) {
                        workspaces[i].items[j] = .thread(thread)
                        return
                    }
                }
            }
        }
    }

    private static func append(_ message: Message, toThread id: String, in threads: inout [ChatThread]) -> Bool {
        for i in threads.indices {
            if threads[i].id == id {
                threads[i].messages.append(message)
                return true
            }
            if append(message, toThread: id, in: &threads[i].threads) {
                return true
            }
        }
        return false
    }
}
