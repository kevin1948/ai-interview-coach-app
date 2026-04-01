/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 requires the preset
  presets: [require("nativewind/preset")],

  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,ts}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        // Brand palette — mirrors current StyleSheet colours
        brand: {
          50:  "#EEF4FF",
          100: "#DBEAFE",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        surface:    "#FFFFFF",
        background: "#F8FAFC",
        foreground: "#0F172A",
        muted:      "#64748B",
        subtle:     "#475569",
        border:     "#E2E8F0",
        danger:     "#DC2626",
        success:    "#10B981",
        warning:    "#F59E0B",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },

  plugins: [],
};
