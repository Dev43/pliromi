import Link from "next/link";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/store" className="text-xl font-bold text-emerald-600">
            Pliromi Store
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200 font-medium">
              Accepts USDC via x402
            </span>
            <a
              href="/.well-known/mcp.json"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-500 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 font-medium hover:bg-purple-100 transition-colors"
            >
              WebMCP Enabled
            </a>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-emerald-600 transition-colors"
            >
              Admin &rarr;
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
