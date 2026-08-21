import SwiftUI

/// The core navigation stack: home list at the root, a chat screen pushed
/// per container or thread (mirrors the demo's MobileShell push stack).
struct RootView: View {
    @State private var model = AppModel()

    var body: some View {
        NavigationStack(path: Bindable(model).path) {
            HomeScreen(model: model)
                .navigationDestination(for: Route.self) { route in
                    ChatScreen(model: model, route: route)
                }
        }
        .tint(Color.text.primary)
    }
}

#Preview {
    RootView()
}
