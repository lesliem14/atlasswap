import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://atlasswap.io"),
  title: "AtlasSwap — The World's Atlas of Crypto Swapping",
  description:
    "AtlasSwap aggregates ChangeNOW, Exolix and Swapzone in real time — routing every swap to the best available rate. Zero custody. No registration. Instant.",
  // Renders: <meta name="google-site-verification" content="…" /> in <head>
  verification: {
    google: "x8FdtnoSlpktJ6y7IXmbo8Vp4GdedYWcbzTmSGtJ95I",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${syne.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
