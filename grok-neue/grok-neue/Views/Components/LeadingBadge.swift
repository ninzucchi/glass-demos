import SwiftUI

/// Face-badge fills; each agent hashes to a stable pick (same palette and
/// hash as the web demo, so agents keep their colors across platforms).
private let facePalette: [Color] = [
    Color(red: 0xC9 / 255, green: 0x4F / 255, blue: 0x46 / 255),
    Color(red: 0xD9 / 255, green: 0x8A / 255, blue: 0x3D / 255),
    Color(red: 0xC9 / 255, green: 0xA9 / 255, blue: 0x3F / 255),
    Color(red: 0x5F / 255, green: 0x9E / 255, blue: 0x58 / 255),
    Color(red: 0x4A / 255, green: 0x9E / 255, blue: 0x97 / 255),
    Color(red: 0x5B / 255, green: 0x87 / 255, blue: 0xD6 / 255),
    Color(red: 0x8B / 255, green: 0x6F / 255, blue: 0xC9 / 255),
    Color(red: 0xC9 / 255, green: 0x6F / 255, blue: 0x9E / 255),
]

private func faceColor(for label: String) -> Color {
    var hash: UInt32 = 0
    for scalar in label.unicodeScalars {
        hash = hash &* 31 &+ scalar.value
    }
    return facePalette[Int(hash % UInt32(facePalette.count))]
}

/// Subtle sheen layered over circular badges.
private let sheen = LinearGradient(
    colors: [.white.opacity(0.12), .white.opacity(0)],
    startPoint: .top,
    endPoint: .bottom
)

/// 20pt leading identity badge: rounded-square chiclet for spaces, circle
/// for spaces in circle variants, an agent "face" (hashed color with two
/// upright eyes), or a plain thread dot.
struct LeadingBadge: View {
    let shape: BadgeShape
    /// Drives the face color hash and the initial-letter fallback glyph.
    let label: String

    var body: some View {
        ZStack {
            switch shape {
            case .dot:
                Circle()
                    .fill(Color.text.tertiary)
                    .frame(width: 7, height: 7)
            case .face:
                Circle()
                    .fill(faceColor(for: label))
                    .overlay(Circle().fill(sheen))
                HStack(spacing: 3) {
                    Eye()
                    Eye()
                }
            case .chiclet(let icon):
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.bg.tertiary)
                BadgeGlyph(icon: icon, label: label)
            case .circle(let icon):
                Circle()
                    .fill(Color.bg.tertiary)
                    .overlay(Circle().fill(sheen))
                BadgeGlyph(icon: icon, label: label)
            }
        }
        .frame(width: 20, height: 20)
    }
}

private struct Eye: View {
    var body: some View {
        Capsule()
            .fill(.black.opacity(0.75))
            .frame(width: 2.5, height: 7)
    }
}

/// Icon if the entity has one, else its initial letter.
private struct BadgeGlyph: View {
    let icon: String?
    let label: String

    var body: some View {
        ZStack {
            if let icon {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(Color.icon.secondary)
            } else {
                Text(label.prefix(1).uppercased())
                    .font(.sm.medium)
                    .foregroundStyle(Color.text.secondary)
            }
        }
    }
}

#Preview {
    HStack(spacing: 12) {
        LeadingBadge(shape: .face, label: "Executive Assistant")
        LeadingBadge(shape: .face, label: "Scribe")
        LeadingBadge(shape: .chiclet(icon: "airplane"), label: "Trip to Japan")
        LeadingBadge(shape: .circle(icon: nil), label: "Acme Labs")
        LeadingBadge(shape: .dot, label: "Thread")
    }
    .padding()
    .background(Color.bg.sidebar)
}
