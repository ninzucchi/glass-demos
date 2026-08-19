import type { Config } from "tailwindcss";

/**
 * Glass token system (ported from cursor-neue). Only the named CSS-variable
 * tokens below exist — used via shorthand utilities (bg-sidebar,
 * text-secondary, border-tertiary, bg-blue-tertiary, ...).
 */

const FAMILIES = [
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "magenta",
  "purple",
] as const;

const SEMANTIC = ["accent", "success", "warn", "danger"] as const;

function ramp(ns: string, name: string) {
  return {
    DEFAULT: `var(--${ns}-${name})`,
    secondary: `var(--${ns}-${name}-secondary)`,
    tertiary: `var(--${ns}-${name}-tertiary)`,
    quaternary: `var(--${ns}-${name}-quaternary)`,
  };
}

function colorFamilies(ns: string) {
  return Object.fromEntries(
    [...FAMILIES, ...SEMANTIC].map((name) => [name, ramp(ns, name)]),
  );
}

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",
      white: "#ffffff",
      black: "#000000",
    },
    fontSize: {
      xs: ["var(--font-size-xs)", { lineHeight: "var(--line-height-xs)" }],
      sm: ["var(--font-size-sm)", { lineHeight: "var(--line-height-sm)" }],
      base: ["var(--font-size-base)", { lineHeight: "var(--line-height-base)" }],
      lg: ["var(--font-size-lg)", { lineHeight: "var(--line-height-lg)" }],
      xl: ["var(--font-size-xl)", { lineHeight: "var(--line-height-xl)" }],
      "2xl": ["var(--font-size-2xl)", { lineHeight: "var(--line-height-2xl)" }],
      "3xl": ["var(--font-size-3xl)", { lineHeight: "var(--line-height-3xl)" }],
    },
    extend: {
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      height: { toolbar: "var(--toolbar-h)" },
      minHeight: { toolbar: "var(--toolbar-h)" },
      backgroundColor: {
        chrome: "var(--bg-chrome)",
        editor: "var(--bg-editor)",
        sidebar: "var(--bg-sidebar)",
        elevated: "var(--bg-elevated)",
        scrim: "var(--bg-scrim)",

        neutral: "var(--bg-neutral)",
        "neutral-hover": "var(--bg-neutral-hover)",
        "neutral-secondary": "var(--bg-neutral-secondary)",

        primary: "var(--bg-primary)",
        secondary: "var(--bg-secondary)",
        tertiary: "var(--bg-tertiary)",
        quaternary: "var(--bg-quaternary)",
        quinary: "var(--bg-quinary)",
        "primary-opaque": "var(--bg-primary-opaque)",
        "secondary-opaque": "var(--bg-secondary-opaque)",
        "tertiary-opaque": "var(--bg-tertiary-opaque)",
        "quaternary-opaque": "var(--bg-quaternary-opaque)",
        "quinary-opaque": "var(--bg-quinary-opaque)",

        brand: "var(--bg-brand)",
        "brand-hover": "var(--bg-brand-hover)",

        luminous: ramp("bg", "luminous"),

        ...colorFamilies("bg"),
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        quaternary: "var(--text-quaternary)",
        inverted: "var(--text-inverted)",
        "inverted-secondary": "var(--text-inverted-secondary)",
        luminous: ramp("text", "luminous"),
        brand: "var(--text-brand)",
        ...colorFamilies("text"),
      },
      borderColor: {
        DEFAULT: "var(--border-tertiary)",
        primary: "var(--border-primary)",
        secondary: "var(--border-secondary)",
        tertiary: "var(--border-tertiary)",
        quaternary: "var(--border-quaternary)",
        "tertiary-opaque": "var(--border-tertiary-opaque)",
        "quaternary-opaque": "var(--border-quaternary-opaque)",
        neutral: "var(--border-neutral)",
        focus: "var(--border-focus)",
        ...colorFamilies("border"),
      },
      ringColor: {
        DEFAULT: "var(--border-focus)",
        primary: "var(--border-primary)",
        secondary: "var(--border-secondary)",
        tertiary: "var(--border-tertiary)",
        quaternary: "var(--border-quaternary)",
        focus: "var(--border-focus)",
        ...colorFamilies("border"),
      },
      boxShadow: {
        sm: "var(--cursor-box-shadow-sm)",
        base: "var(--cursor-box-shadow-base)",
        lg: "var(--cursor-box-shadow-lg)",
        xl: "var(--cursor-box-shadow-xl)",
        window: "var(--window-shadow)",
      },
      borderRadius: {
        window: "16px",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--ease-default)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
    },
  },
  plugins: [],
} satisfies Config;
