import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AppChrome } from "@/components/ui/AppChrome";
import { ServiceWorkerRegister } from "@/components/ui/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "PartsDeck",
  description: "Truck parts inventory tracker & warehouse transfer system",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PartsDeck",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy text-slate-100 antialiased">
        <ToastProvider>
          <AppChrome>{children}</AppChrome>
        </ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
