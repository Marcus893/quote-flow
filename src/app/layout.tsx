import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/posthog-provider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuoteFlow — Professional Quotes in 60 Seconds",
  description:
    "Photo-to-professional-quote PWA for contractors. Create, send, and track quotes from your phone.",
  icons: {
    icon: { url: "/icon", type: "image/png" },
    apple: "/apple-icon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
