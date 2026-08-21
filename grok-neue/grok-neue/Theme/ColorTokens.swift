import SwiftUI

// Semantic color tokens — the subset of everysphere's ColorExtensions this
// scaffold uses. Values live in Assets.xcassets as light/dark colorsets
// copied from the everysphere catalog, so tokens resolve identically on
// every platform (no UIKit/AppKit dependency).
extension Color {
    struct text {
        static let primary = Color("TextPrimary")
        static let secondary = Color("TextSecondary")
        static let tertiary = Color("TextTertiary")
        static let quaternary = Color("TextQuaternary")
    }

    struct icon {
        static let primary = Color("IconPrimary")
        static let secondary = Color("IconSecondary")
        static let tertiary = Color("IconTertiary")
        static let quaternary = Color("IconQuaternary")
    }

    struct bg {
        // Surfaces
        static let chrome = Color("BgChrome")
        static let sidebar = Color("BgSidebar")
        static let elevated = Color("BgElevated")
        static let scrim = Color("BgScrim")

        // Core
        static let primary = Color("BgPrimary")
        static let secondary = Color("BgSecondary")
        static let tertiary = Color("BgTertiary")
        static let quaternary = Color("BgQuaternary")
        static let quinary = Color("BgQuinary")
    }

    struct border {
        static let primary = Color("BorderPrimary")
        static let secondary = Color("BorderSecondary")
        static let tertiary = Color("BorderTertiary")
        static let quaternary = Color("BorderQuaternary")
    }
}
