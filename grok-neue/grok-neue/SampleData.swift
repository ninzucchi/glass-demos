import Foundation

/// Seed content echoing the hierarchy demo's dataset.
enum SampleData {
    static let homeID = "ws-home"

    static let workspaces: [Workspace] = [
        Workspace(
            id: homeID,
            name: "Home",
            icon: "house",
            items: [
                .project(Project(
                    id: "pj-ea",
                    name: "Executive Assistant",
                    icon: "briefcase",
                    messages: [
                        Message(id: "m-ea-1", role: .user, text: "What's on my calendar tomorrow?"),
                        Message(id: "m-ea-2", role: .agent, text: "Three things: design sync at 10, a 1:1 with Sam at 1, and the offsite planning block at 3. The afternoon is otherwise clear."),
                    ],
                    threads: [
                        ChatThread(
                            id: "th-ea-offsite",
                            title: "Offsite Logistics",
                            parentMessageID: "m-ea-2",
                            messages: [
                                Message(id: "m-off-1", role: .user, text: "Can you shortlist venues for the offsite?"),
                                Message(id: "m-off-2", role: .agent, text: "Shortlisted three: a lodge in Tahoe, a ranch outside Austin, and a retreat center in Ojai. Tahoe has the best group rates for the week you mentioned."),
                            ]
                        ),
                    ]
                )),
                .project(Project(
                    id: "pj-pr",
                    name: "PR Manager",
                    icon: "arrow.triangle.branch",
                    messages: [
                        Message(id: "m-pr-1", role: .user, text: "Anything waiting on my review?"),
                        Message(id: "m-pr-2", role: .agent, text: "Two PRs are ready: the sidebar refactor (approved by CI, one open comment) and the settings migration (needs a rebase before merge)."),
                    ]
                )),
                .project(Project(
                    id: "pj-scribe",
                    name: "Scribe",
                    icon: "pencil.tip",
                    messages: [
                        Message(id: "m-sc-1", role: .agent, text: "I drafted notes from this morning's design sync. Want me to circulate them?"),
                    ]
                )),
                .thread(ChatThread(
                    id: "th-destijl",
                    title: "History of De Stijl",
                    messages: [
                        Message(id: "m-ds-1", role: .user, text: "Give me a quick primer on De Stijl."),
                        Message(id: "m-ds-2", role: .agent, text: "De Stijl was a Dutch art movement founded in 1917 around Mondrian and van Doesburg — pure abstraction, primary colors, and strict horizontals and verticals."),
                    ]
                )),
                .thread(ChatThread(
                    id: "th-coffee",
                    title: "v60 vs French Press",
                    messages: [
                        Message(id: "m-cf-1", role: .user, text: "Which brews a cleaner cup?"),
                        Message(id: "m-cf-2", role: .agent, text: "The v60 — its paper filter catches fines and oils, so you get a brighter, clearer cup. The French press trades clarity for body."),
                    ]
                )),
            ]
        ),
        Workspace(
            id: "ws-acme",
            name: "Acme Labs",
            messages: [
                Message(id: "m-ac-1", role: .user, text: "Summarize the current state of the working tree."),
                Message(id: "m-ac-2", role: .agent, text: "Eight modified files, mostly in the sidebar package. The CI fix and the onboarding rewrite are branch-ready; spacing polish is still in progress."),
            ],
            items: [
                .thread(ChatThread(
                    id: "th-tree",
                    title: "Summarize working tree",
                    parentMessageID: "m-ac-2",
                    messages: [
                        Message(id: "m-tr-1", role: .agent, text: "Diff summary: 8 files changed, 214 insertions, 96 deletions."),
                    ]
                )),
                .thread(ChatThread(
                    id: "th-ci",
                    title: "Fix flaky CI tests",
                    messages: [
                        Message(id: "m-ci-1", role: .user, text: "The snapshot suite keeps flaking on CI."),
                        Message(id: "m-ci-2", role: .agent, text: "The failures correlate with the shared simulator pool. Pinning each job to its own simulator clone should stabilize it."),
                    ]
                )),
                .thread(ChatThread(
                    id: "th-onboarding",
                    title: "Onboarding doc rewrite",
                    messages: [
                        Message(id: "m-ob-1", role: .agent, text: "Restructured the doc into setup, first PR, and team norms. Draft is ready for review."),
                    ]
                )),
                .thread(ChatThread(
                    id: "th-spacing",
                    title: "Sidebar cell spacing"
                )),
            ]
        ),
        Workspace(
            id: "ws-figma",
            name: "Figma Plugins",
            items: [
                .thread(ChatThread(
                    id: "th-naming",
                    title: "Export naming scheme",
                    messages: [
                        Message(id: "m-nm-1", role: .user, text: "Propose a naming scheme for exported assets."),
                        Message(id: "m-nm-2", role: .agent, text: "Suggest `component/variant@scale` — it sorts naturally and round-trips through the asset pipeline without escaping."),
                    ]
                )),
            ]
        ),
        Workspace(
            id: "ws-japan",
            name: "Trip to Japan",
            icon: "airplane",
            items: [
                .thread(ChatThread(
                    id: "th-ryokan",
                    title: "Ryokan Shortlist",
                    messages: [
                        Message(id: "m-ry-1", role: .agent, text: "Three ryokan fit the dates: one in Hakone with a private onsen, one in Kinosaki near the seven public baths, and a quieter one in Kurokawa."),
                    ]
                )),
            ]
        ),
    ]
}
