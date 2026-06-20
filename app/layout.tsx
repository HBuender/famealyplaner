import type { Metadata, Viewport } from "next";
import { InstallPrompt } from "@/components/InstallPrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Famealyplaner",
  description: "Weekly family dinner planner",
  // Clean standalone chrome on iOS home-screen installs.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Famealy",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* iOS ignores manifest maskable icons and uses apple-touch-icon. */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
