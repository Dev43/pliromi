"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import PaymentModal from "./PaymentModal";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

// Simple hash to derive consistent numbers from a product name
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Pick two HSL colors from the hash for a gradient
function gradientFromName(name: string): { from: string; to: string; accent: string } {
  const h = hashName(name);
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h % 60)) % 360;
  return {
    from: `hsl(${hue1}, 65%, 55%)`,
    to: `hsl(${hue2}, 55%, 40%)`,
    accent: `hsl(${hue1}, 70%, 85%)`,
  };
}

// SVG pattern overlay keyed to the product name
function PlaceholderPattern({ name }: { name: string }) {
  const h = hashName(name);
  const variant = h % 3;

  // All patterns use white at low opacity for a subtle texture
  if (variant === 0) {
    // Diagonal lines
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`diag-${name}`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="16" stroke="white" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#diag-${name})`} />
      </svg>
    );
  }
  if (variant === 1) {
    // Dots
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.10]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`dots-${name}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="2" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${name})`} />
      </svg>
    );
  }
  // Crosses
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={`cross-${name}`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="1.5" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#cross-${name})`} />
    </svg>
  );
}

// Small decorative icon in the corner to hint at the product category
function CornerIcon() {
  return (
    <svg
      className="absolute top-3 right-3 w-5 h-5 text-white/20"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M6 5v1H4.667a1.75 1.75 0 00-1.743 1.598l-.826 9.5A1.75 1.75 0 003.84 19H16.16a1.75 1.75 0 001.743-1.902l-.826-9.5A1.75 1.75 0 0015.333 6H14V5a4 4 0 00-8 0zm4-2.5A2.5 2.5 0 007.5 5v1h5V5A2.5 2.5 0 0010 2.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const [showPayment, setShowPayment] = useState(false);

  const gradient = useMemo(() => gradientFromName(product.name), [product.name]);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
        <div className="h-48 relative flex items-center justify-center">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
            >
              <PlaceholderPattern name={product.name} />
              <CornerIcon />
              <span
                className="relative z-10 text-6xl font-black text-white/90 select-none"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
              >
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <Link href={`/store/product/${product.id}`} className="text-lg font-medium text-gray-900 hover:text-emerald-600 transition-colors">
            {product.name}
          </Link>
          {product.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-4">
            <div>
              <span className="text-xl font-bold text-emerald-600">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-xs text-gray-400 ml-1">USDC</span>
            </div>
            <button
              onClick={() => setShowPayment(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Buy Now
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {product.quantity} in stock
          </div>
        </div>
      </div>

      {/* WebMCP declarative form — lets browser AI agents discover and invoke purchase */}
      <form
        toolname={`buy_${product.name.toLowerCase().replace(/\s+/g, "_")}`}
        tooldescription={`Purchase ${product.name} for $${product.price.toFixed(2)} USDC via x402 protocol. ${product.description || ""} (${product.quantity} in stock)`}
        toolautosubmit=""
        action={`/api/x402/${product.id}`}
        method="GET"
        className="hidden"
        onSubmit={(e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const evt = e as any;
          if (evt.agentInvoked) {
            e.preventDefault();
            const url = `${window.location.origin}/api/x402/${product.id}`;
            evt.respondWith?.(
              Promise.resolve(
                JSON.stringify({
                  product: product.name,
                  price: product.price,
                  x402Url: url,
                  owsPayCommand: `ows pay request --wallet <your-wallet> --no-passphrase "${url}"`,
                  chains: ["base", "ethereum", "polygon", "arbitrum"],
                })
              )
            );
          }
        }}
      >
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="chain" value="base" toolparamdescription="Blockchain to pay on: base, ethereum, polygon, or arbitrum" />
      </form>

      {showPayment && (
        <PaymentModal
          product={product}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
}
