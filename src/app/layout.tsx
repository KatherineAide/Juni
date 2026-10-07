import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Juni — learn something new, somewhere new", template: "%s · Juni" },
  description: "Find, compare and plan short-term learning experiences abroad (1–8 weeks): languages, cooking, art, philosophy and more.",
};

export const viewport: Viewport = {
  themeColor: "#fdfaf6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
