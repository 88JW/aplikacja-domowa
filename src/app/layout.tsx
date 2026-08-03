import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/app/components/service-worker-registration";

export const metadata: Metadata = {
  title: "Aplikacja domowa",
  description: "Wspólne obowiązki, punkty i domowe wyzwania.",
  applicationName: "Aplikacja domowa",
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dom",
  },
};

export const viewport: Viewport = {
  themeColor: "#39734b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <head>
        <link
          href="/manifest.webmanifest?v=5"
          rel="manifest"
        />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
