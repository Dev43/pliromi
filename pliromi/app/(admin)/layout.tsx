"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/team", label: "Manage Team" },
  { href: "/fund", label: "Fund Addresses" },
  { href: "/debit-card", label: "Debit Cards" },
  { href: "/commerce", label: "Shop" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-emerald-600">
              Pliromi
            </Link>
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname === item.href
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/store"
            className="text-sm text-gray-500 hover:text-emerald-600 transition-colors"
          >
            View Storefront &rarr;
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2 text-xs text-gray-400">
          <span>Powered by</span>
          <a href="https://openwallet.sh" target="_blank" rel="noopener noreferrer" className="transition-opacity opacity-40 hover:opacity-70">
            <img src="/ows-logo.svg" alt="OWS" className="h-5 inline-block" />
          </a>
          <span className="text-gray-300">·</span>
          <a href="https://xmtp.org" target="_blank" rel="noopener noreferrer" className="transition-opacity opacity-40 hover:opacity-70">
            <img src="/xmtp_logo.png" alt="XMTP" className="h-5 inline-block" />
          </a>
          <span className="text-gray-300">·</span>
          <a href="https://moonpay.com" target="_blank" rel="noopener noreferrer" className="transition-opacity opacity-40 hover:opacity-70">
            <img src="/moonpay_logo.png" alt="MoonPay" className="h-5 inline-block" />
          </a>
        </div>
      </footer>
    </div>
  );
}
