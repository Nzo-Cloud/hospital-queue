import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
export const metadata: Metadata = {
  title: "Hospital Queue System",
  description: "Real-time hospital queue and appointment management system built with ASP.NET Core, Next.js, and SignalR.",
  openGraph: {
    title: "Hospital Queue System",
    description: "Real-time hospital queue and appointment management system built with ASP.NET Core, Next.js, and SignalR.",
    type: "website",
    url: "https://hospital-queue-nzo.vercel.app",
    siteName: "Hospital Queue System",
  },
  twitter: {
    card: "summary",
    title: "Hospital Queue System",
    description: "Real-time hospital queue and appointment management system built with ASP.NET Core, Next.js, and SignalR.",
  },
  metadataBase: new URL("https://hospital-queue-nzo.vercel.app"),
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
