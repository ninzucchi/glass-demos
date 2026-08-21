import SwiftUI

// Type scale mirroring everysphere's FontExtensions (xs…xxxl pinned to
// system text styles so Dynamic Type keeps working).
extension Font {
    static let xs: Font = .caption2
    static let sm: Font = .footnote
    static let base: Font = .subheadline
    static let lg: Font = .callout
    static let xl: Font = .title3
    static let xxl: Font = .title2
    static let xxxl: Font = .title

    static let mono = MonoFontFamily()
}

// Sugar over `Font.weight(_:)` so call sites can chain `.font(.base.medium)`.
extension Font {
    var regular: Font { weight(.regular) }
    var medium: Font { weight(.medium) }
    var semibold: Font { weight(.semibold) }
    var bold: Font { weight(.bold) }
}

struct MonoFontFamily {
    let xs = Font.system(.caption2, design: .monospaced)
    let sm = Font.system(.footnote, design: .monospaced)
    let base = Font.system(.subheadline, design: .monospaced)
    let lg = Font.system(.callout, design: .monospaced)
    let xl = Font.system(.title3, design: .monospaced)
    let xxl = Font.system(.title2, design: .monospaced)
    let xxxl = Font.system(.title, design: .monospaced)
}
