import SwiftUI

/// 44pt single-line list row: identity leading, title, trailing chevron on
/// containers. Used by the home list and child-index sheets.
struct EntityRowView: View {
    let row: RowItem
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 10) {
                LeadingBadge(shape: row.badge, label: row.title)
                Text(row.title)
                    .font(.lg)
                    .foregroundStyle(Color.text.primary)
                    .lineLimit(1)
                Spacer(minLength: 0)
                if row.isContainer {
                    Image(systemName: "chevron.right")
                        .font(.xs.semibold)
                        .foregroundStyle(Color.icon.quaternary)
                }
            }
            .padding(.horizontal, 8)
            .frame(height: 44)
            .contentShape(.rect(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }
}
