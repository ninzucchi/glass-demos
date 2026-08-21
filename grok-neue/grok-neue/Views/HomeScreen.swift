import SwiftUI

/// Root screen: the flattened hierarchy sections for the active Selects
/// variant, search in the nav bar, and the floating New Thread pill.
struct HomeScreen: View {
    @Bindable var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                ForEach(model.homeSections()) { section in
                    HomeSectionView(section: section) { model.open($0) }
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 4)
            .padding(.bottom, 96)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color.bg.sidebar)
        .toolbar {
            ToolbarItem(placement: .navigation) {
                Menu {
                    Picker("Layout", selection: $model.variant) {
                        ForEach(HomeVariant.allCases) { variant in
                            Text(variant.label).tag(variant)
                        }
                    }
                    .pickerStyle(.inline)
                    Picker("Child Index", selection: $model.indexStyle) {
                        ForEach(IndexStyle.allCases) { style in
                            Text(style.label).tag(style)
                        }
                    }
                    .pickerStyle(.inline)
                } label: {
                    Image(systemName: "slider.horizontal.3")
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button {
                    // Search is out of scope for the scaffold.
                } label: {
                    Image(systemName: "magnifyingglass")
                }
            }
        }
        .overlay(alignment: .bottom) {
            NewThreadFooter {
                model.createChild(of: SampleData.homeID)
            }
        }
    }
}

private struct HomeSectionView: View {
    let section: HomeSection
    let onSelect: (RowItem) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(section.label)
                .font(.sm.medium)
                .foregroundStyle(Color.text.quaternary)
                .padding(.horizontal, 8)
            VStack(spacing: 0) {
                ForEach(section.rows) { row in
                    EntityRowView(row: row) { onSelect(row) }
                }
            }
        }
    }
}

/// Gradient footer keeps the pill legible over the scrolling list.
private struct NewThreadFooter: View {
    let onNewThread: () -> Void

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            LinearGradient(
                colors: [Color.bg.sidebar.opacity(0), Color.bg.sidebar.opacity(0.85), Color.bg.sidebar],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 96)
            .allowsHitTesting(false)

            Button(action: onNewThread) {
                HStack(spacing: 8) {
                    Image(systemName: "square.and.pencil")
                        .font(.lg.medium)
                    Text("New Thread")
                        .font(.lg.medium)
                }
                .foregroundStyle(Color.text.primary)
                .padding(.leading, 16)
                .padding(.trailing, 20)
                .frame(height: 44)
                .background(Color.bg.elevated, in: .capsule)
                .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
            }
            .padding(12)
        }
    }
}
