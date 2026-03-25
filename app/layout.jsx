import React from "react";

export const metadata = {
  title: "AtlasSwap",
  description: "AtlasSwap crypto swapping UI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

