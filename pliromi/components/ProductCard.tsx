"use client";

import { useState } from "react";
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

export default function ProductCard({ product }: { product: Product }) {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div className="h-48 bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-5xl font-bold text-emerald-200">
              {product.name.charAt(0).toUpperCase()}
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

      {showPayment && (
        <PaymentModal
          product={product}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
}
