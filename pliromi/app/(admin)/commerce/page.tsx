"use client";

import { useState, useCallback } from "react";

interface Store {
  name: string;
  domain: string;
  slug?: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
  priceRange?: { minVariantPrice?: { amount: string; currencyCode: string } };
  images?: { edges?: { node?: { url: string } }[] };
  variants?: { edges?: { node?: { id: string; title: string; price?: { amount: string } } }[] };
}

interface CartLine {
  id: string;
  quantity: number;
  merchandise?: { title?: string; product?: { title: string } };
  cost?: { totalAmount?: { amount: string; currencyCode: string } };
}

interface Cart {
  id: string;
  lines?: { edges?: { node: CartLine }[] };
  cost?: { totalAmount?: { amount: string; currencyCode: string } };
}

type View = "stores" | "products" | "cart" | "checkout";

export default function CommercePage() {
  const [view, setView] = useState<View>("stores");
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutInfo, setCheckoutInfo] = useState({
    email: "", firstName: "", lastName: "",
    address: "", city: "", postalCode: "", country: "",
  });
  const [checkoutResult, setCheckoutResult] = useState<string | null>(null);

  const api = useCallback(async (url: string, opts?: RequestInit) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(url, opts);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStores = async () => {
    const data = await api("/api/commerce?action=stores");
    if (data) {
      const list = Array.isArray(data) ? data : data.stores || data.raw ? [] : [data];
      setStores(list);
      setView("stores");
    }
  };

  const searchProducts = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedStore) return;
    const data = await api(`/api/commerce?action=products&store=${selectedStore}&query=${encodeURIComponent(searchQuery)}`);
    if (data) {
      const list = Array.isArray(data) ? data : data.products || data.edges?.map((e: { node: Product }) => e.node) || [];
      setProducts(list);
      setView("products");
    }
  };

  const addToCart = async (variantId: string) => {
    const data = await api("/api/commerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cart-add",
        store: selectedStore,
        variantId,
        quantity: 1,
        cartId: cart?.id,
      }),
    });
    if (data) {
      setCart(data.cart || data);
    }
  };

  const removeFromCart = async (lineId: string) => {
    if (!cart) return;
    const data = await api("/api/commerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cart-remove",
        store: selectedStore,
        cartId: cart.id,
        lineId,
      }),
    });
    if (data) setCart(data.cart || data);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart) return;
    const data = await api("/api/commerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkout",
        store: selectedStore,
        cartId: cart.id,
        checkout: checkoutInfo,
      }),
    });
    if (data) {
      setCheckoutResult(data.raw || data.message || JSON.stringify(data));
    }
  };

  const cartLines = cart?.lines?.edges?.map((e) => e.node) || [];
  const cartTotal = cart?.cost?.totalAmount?.amount || "0";
  const cartCurrency = cart?.cost?.totalAmount?.currencyCode || "USD";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MoonPay Commerce</h1>
          <p className="text-sm text-gray-500">Browse Shopify stores and pay with crypto via Solana Pay</p>
        </div>
        <div className="flex items-center gap-2">
          {cart && cartLines.length > 0 && (
            <button
              onClick={() => setView("cart")}
              className="relative px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cart ({cartLines.length})
            </button>
          )}
          <button
            onClick={loadStores}
            disabled={loading}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Browse Stores
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-xs text-red-600 break-all">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      )}

      {/* STORES VIEW */}
      {!loading && view === "stores" && (
        <>
          {stores.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <p className="mb-2">Click "Browse Stores" to discover Shopify stores accepting crypto</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((store, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedStore(store.slug || store.domain || store.name);
                    setView("products");
                    setSearchQuery("");
                    setProducts([]);
                  }}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-left hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="text-base font-semibold text-gray-900 mb-1">{store.name}</div>
                  <div className="text-xs text-gray-400">{store.domain}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* PRODUCTS VIEW */}
      {!loading && view === "products" && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setView("stores")} className="text-sm text-gray-400 hover:text-gray-600">
              &larr; Stores
            </button>
            <span className="text-sm font-medium text-gray-700">{selectedStore}</span>
          </div>

          <form onSubmit={searchProducts} className="flex gap-2 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Search
            </button>
          </form>

          {products.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              Search for products in this store
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const imgUrl = p.images?.edges?.[0]?.node?.url;
                const price = p.priceRange?.minVariantPrice?.amount;
                const currency = p.priceRange?.minVariantPrice?.currencyCode || "USD";
                const variant = p.variants?.edges?.[0]?.node;

                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
                      {imgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgUrl} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl text-gray-200 font-bold">{p.title.charAt(0)}</span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{p.title}</h3>
                      {p.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold text-purple-600">
                          {price ? `$${parseFloat(price).toFixed(2)}` : "N/A"}
                          <span className="text-xs text-gray-400 ml-1">{currency}</span>
                        </span>
                        {variant && (
                          <button
                            onClick={() => addToCart(variant.id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* CART VIEW */}
      {!loading && view === "cart" && cart && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setView("products")} className="text-sm text-gray-400 hover:text-gray-600">
              &larr; Products
            </button>
            <span className="text-sm font-medium text-gray-700">Your Cart</span>
          </div>

          {cartLines.length === 0 ? (
            <div className="text-center text-gray-400 py-8">Cart is empty</div>
          ) : (
            <div className="space-y-3 mb-6">
              {cartLines.map((line) => (
                <div key={line.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {line.merchandise?.product?.title || "Item"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {line.merchandise?.title} &middot; Qty: {line.quantity}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-purple-600">
                      ${parseFloat(line.cost?.totalAmount?.amount || "0").toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(line.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-purple-700">Total</span>
                <span className="text-xl font-bold text-purple-700">
                  ${parseFloat(cartTotal).toFixed(2)} {cartCurrency}
                </span>
              </div>

              <button
                onClick={() => setView("checkout")}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </>
      )}

      {/* CHECKOUT VIEW */}
      {!loading && view === "checkout" && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setView("cart")} className="text-sm text-gray-400 hover:text-gray-600">
              &larr; Cart
            </button>
            <span className="text-sm font-medium text-gray-700">Checkout</span>
          </div>

          {checkoutResult ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3 text-emerald-600">&#10003;</div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Order Placed!</h2>
              <p className="text-sm text-gray-500 break-all">{checkoutResult}</p>
              <button
                onClick={() => { setCheckoutResult(null); setCart(null); setView("stores"); }}
                className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 max-w-lg">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
                <div className="text-xs text-purple-600">Total</div>
                <div className="text-xl font-bold text-purple-700">${parseFloat(cartTotal).toFixed(2)} {cartCurrency}</div>
                <div className="text-[10px] text-purple-500 mt-1">Paid via Solana Pay using OWS wallet</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="First Name" required value={checkoutInfo.firstName}
                  onChange={(e) => setCheckoutInfo({ ...checkoutInfo, firstName: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                <input type="text" placeholder="Last Name" required value={checkoutInfo.lastName}
                  onChange={(e) => setCheckoutInfo({ ...checkoutInfo, lastName: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>
              <input type="email" placeholder="Email" required value={checkoutInfo.email}
                onChange={(e) => setCheckoutInfo({ ...checkoutInfo, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              <input type="text" placeholder="Street Address" required value={checkoutInfo.address}
                onChange={(e) => setCheckoutInfo({ ...checkoutInfo, address: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              <div className="grid grid-cols-3 gap-3">
                <input type="text" placeholder="City" required value={checkoutInfo.city}
                  onChange={(e) => setCheckoutInfo({ ...checkoutInfo, city: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                <input type="text" placeholder="Postal Code" required value={checkoutInfo.postalCode}
                  onChange={(e) => setCheckoutInfo({ ...checkoutInfo, postalCode: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                <input type="text" placeholder="Country" required value={checkoutInfo.country}
                  onChange={(e) => setCheckoutInfo({ ...checkoutInfo, country: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? "Processing..." : "Pay with Crypto"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
