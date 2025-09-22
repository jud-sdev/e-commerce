import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/providers/auth-provider";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/structured-data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "E-Commerce Platform - Premium Shopping Experience",
    template: "%s | E-Commerce Platform"
  },
  description: "Discover our premium e-commerce platform offering high-quality products with secure checkout, fast shipping, and exceptional customer service. Shop the latest trends and enjoy a seamless online shopping experience.",
  keywords: [
    "e-commerce",
    "online shopping",
    "premium products",
    "secure checkout",
    "fast shipping",
    "customer service",
    "fashion",
    "electronics",
    "home decor"
  ],
  authors: [{ name: "E-Commerce Platform Team" }],
  creator: "E-Commerce Platform",
  publisher: "E-Commerce Platform",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "E-Commerce Platform - Premium Shopping Experience",
    description: "Discover our premium e-commerce platform offering high-quality products with secure checkout and fast shipping.",
    siteName: "E-Commerce Platform",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "E-Commerce Platform - Premium Shopping Experience",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Commerce Platform - Premium Shopping Experience",
    description: "Discover our premium e-commerce platform offering high-quality products with secure checkout and fast shipping.",
    images: ["/twitter-image.jpg"],
    creator: "@ecommerceplatform",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={baseUrl} />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <OrganizationSchema
          name="E-Commerce Platform"
          url={baseUrl}
          description="Premium e-commerce platform offering high-quality products with secure checkout and fast shipping"
        />
        <WebSiteSchema
          name="E-Commerce Platform"
          url={baseUrl}
          description="Discover our premium e-commerce platform offering high-quality products with secure checkout, fast shipping, and exceptional customer service"
        />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
