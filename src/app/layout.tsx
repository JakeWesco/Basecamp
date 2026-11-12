import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { fraunces, frauncesExt } from "./fonts";
import { ToastProvider } from "@/components/ui/toast";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Basecamp", template: "%s · Basecamp" },
  description: "From first enquiry to trophy on the wall: one link for your whole client journey.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [GeistSans.variable, GeistMono.variable, fraunces.variable, frauncesExt.variable];
  return (
    // The theme script sets data-theme before React loads, so the attribute
    // can differ from the server HTML on purpose.
    <html lang="en" className={`${fonts.join(" ")} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
