import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono, Oswald, Martian_Mono } from "next/font/google";
import NextAbstractWalletProvider from "@/components/NextAbstractWalletProvider";
import { Navigation } from "@/components/Navigation";
import { RightNavigation } from "@/components/RightNavigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { ScrollProvider } from "@/contexts/ScrollContext";
import "./globals.css";

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
  weight: ["200", "300", "400", "500", "600", "700"],
});

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pengu Strategy",
  description: "The Perpetual Pengu Machine",
  icons: {
    icon: [
      // URL is set at runtime below in <head> for dynamic basePath
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Abstract Fonts
const avenueMono = localFont({
  src: "../fonts/Avenue Mono.ttf",
  variable: "--font-avenue-mono",
  weight: "100, 900",
});

const randomGrotesque = localFont({
  src: "../fonts/Random Grotesque Spacious.ttf",
  variable: "--font-random-grotesque",
  weight: "400",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const prefix = process.env.NEXT_PUBLIC_GH_PAGES === 'true' ? '/strat' : '';
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={`${prefix}/favicon.ico`} sizes="any" />
        <link rel="icon" href={`${prefix}/favicon.png`} type="image/png" />
        <link rel="shortcut icon" href={`${prefix}/favicon.ico`} />
        <link rel="apple-touch-icon" href={`${prefix}/favicon.png`} />
      </head>
      <NextAbstractWalletProvider>
        <ScrollProvider>
          <body
            className={`${geistSans.variable} ${geistMono.variable} ${avenueMono.variable} ${oswald.variable} ${martianMono.variable} ${randomGrotesque.variable} antialiased`}
          >
            <Navigation />
            <MobileNavigation />
            {children}
            <RightNavigation />
          </body>
        </ScrollProvider>
      </NextAbstractWalletProvider>
    </html>
  );
}
