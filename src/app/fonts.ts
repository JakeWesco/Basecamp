import localFont from "next/font/local";

// Fraunces is bundled in src/app/fonts (OFL, see FRAUNCES-OFL.txt) so the build
// never needs the network. The "full" files carry every axis, including SOFT
// and WONK. Latin and Latin Extended are two faces of one family, split by
// unicode-range, so Polish and German names in headings stay in Fraunces.
// Geist comes from the geist package, which also ships its files locally.
// next/font needs literal options, so the two calls repeat themselves.

export const fraunces = localFont({
  src: "./fonts/fraunces-latin-full-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  style: "normal",
  display: "swap",
  fallback: ["Georgia", "serif"],
  declarations: [
    { prop: "font-family", value: "fraunces" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

export const frauncesExt = localFont({
  src: "./fonts/fraunces-latin-ext-full-normal.woff2",
  variable: "--font-fraunces-ext",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
  declarations: [
    { prop: "font-family", value: "fraunces" },
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    },
  ],
});
