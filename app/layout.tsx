import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Sahayata — Community Support Redistribution",
  description:
    "Request financial support or contribute to Sahayata's automated redistribution pool.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sahayata",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1f7a5c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <PWARegister />
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold text-brand-700">
              Sahayata
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
                Dashboard
              </Link>
              {user ? (
                <>
                  <Link href="/requests/new" className="text-neutral-600 hover:text-neutral-900">
                    Request support
                  </Link>
                  <Link href="/account" className="text-neutral-600 hover:text-neutral-900">
                    Account
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin/mishrin-ledger"
                      className="text-amber-700 hover:text-amber-900"
                    >
                      Admin
                    </Link>
                  )}
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/sign-in" className="text-neutral-600 hover:text-neutral-900">
                    Sign in
                  </Link>
                  <Link href="/sign-up" className="btn-primary">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
