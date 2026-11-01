import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeWatermark } from "@/components/ThemeWatermark";
import { UploadProvider } from "@/components/UploadContext";
import { BackgroundUploadWidget } from "@/components/BackgroundUploadWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GaleriKita — Private Photo & Video Gallery",
  description: "Private self-hosted photo and video gallery with shared password authentication",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fcfcfc] rose:bg-[#fff9f9] text-neutral-900 rose:text-[#3a2228] font-sans transition-colors duration-150 relative">
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('galerikita_theme');
                  var root = document.documentElement;
                  root.classList.remove('dark', 'rose');
                  if (saved === 'light') {
                    // light theme
                  } else {
                    // Default to rose (Pink Sakura Romantis)
                    root.classList.add('rose');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          <UploadProvider>
            <ThemeWatermark />
            <div className="relative z-10 flex-1 flex flex-col">
              {children}
            </div>
            <BackgroundUploadWidget />
          </UploadProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
