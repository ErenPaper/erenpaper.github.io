import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Unbounded, VT323, Big_Shoulders_Display } from "next/font/google";
import "../styles/global.css";

const space = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-jb",
});
// Console-logo face — used only for the "rr" mark in the boot/landing screens.
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-unbounded",
});
// "Side B" type: VT323 is the camcorder on-screen display (channel numbers,
// REC, labels); Big Shoulders is the tall condensed film-title-card face.
const osd = VT323({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-osd",
});
const filmTitle = Big_Shoulders_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-film",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://erenpaper.github.io"),
  title: "Raphael Ramos · Computer Engineer",
  description:
    "Raphael Ramos — Computer Engineering graduate (2026). A desktop-OS portfolio of firmware, embedded systems, and hardware projects.",
  openGraph: {
    title: "Raphael Ramos · Computer Engineer",
    description:
      "Firmware, embedded systems, and hardware — projects from edge ML to FPGA CPUs.",
    images: ["/assets/raphael.jpg"],
    url: "https://erenpaper.github.io/",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-persona="pro"
      data-theme="dark"
      suppressHydrationWarning
      /* Font variables must live on <html>: :root's --font-sans/--font-mono
         reference them, and var() resolves where the property is defined. */
      className={`${space.variable} ${jetbrains.variable} ${unbounded.variable} ${osd.variable} ${filmTitle.variable}`}
    >
      <head>
        {/* Apply persisted persona/theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=new URLSearchParams(location.search).get('v');document.documentElement.setAttribute('data-persona',v==='os'?'personal':'pro');var t=localStorage.getItem('theme')==='light'?'light':'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
