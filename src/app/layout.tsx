import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draw a Way",
  description: "Draw a solution to a small story problem, see what it changes, and try again.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eef3ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to the mission
        </a>
        {children}
        <noscript>
          <p className="noscript">Draw a Way needs JavaScript to let you draw. Please turn it on and reload.</p>
        </noscript>
      </body>
    </html>
  );
}
