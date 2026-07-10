import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { NoZoom } from "@/components/no-zoom";
import { WelcomeBack } from "@/components/welcome-back";
import { Agentation } from "agentation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GymBud · Gym Tracker",
  description: "Your personal gym buddy. Log lifts, track progress, never get stuck.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GymBud",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0e",
  width: "device-width",
  initialScale: 1,
  // Personal single-user app: lock zoom so accidental pinch / double-tap
  // mid-set never shifts the layout. (Trades off WCAG pinch-zoom by request.)
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Keyboard overlays content instead of resizing the viewport, so the fixed
  // bottom nav stays glued to the bottom and never "lifts up" when typing.
  interactiveWidget: "overlays-content",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <NoZoom />
        <main
          className="mx-auto w-full max-w-md px-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
        >
          {children}
        </main>
        <BottomNav />
        <WelcomeBack />
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
