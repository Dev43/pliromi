"use client";

import { useEffect, useState, useCallback } from "react";

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  quantity: number;
  imageUrl?: string;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    minPrice: "",
    maxPrice: "",
    quantity: "",
    imageUrl: "",
  });

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      setItems(data.inventory || []);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          description: newItem.description,
          minPrice: parseFloat(newItem.minPrice),
          maxPrice: parseFloat(newItem.maxPrice),
          quantity: parseInt(newItem.quantity) || 0,
          imageUrl: newItem.imageUrl || undefined,
        }),
      });
      setNewItem({ name: "", description: "", minPrice: "", maxPrice: "", quantity: "", imageUrl: "" });
      setShowAdd(false);
      fetchInventory();
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      fetchInventory();
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 font-medium transition-colors"
        >
          {showAdd ? "Cancel" : "+ Add Item"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addItem} className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200 space-y-2">
          <input
            type="text"
            placeholder="Product name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            type="url"
            placeholder="Image URL (optional)"
            value={newItem.imageUrl}
            onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {newItem.imageUrl && (
            <div className="w-full h-24 rounded overflow-hidden border border-gray-200 bg-gray-100">
              <img
                src={newItem.imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Min $"
              value={newItem.minPrice}
              onChange={(e) => setNewItem({ ...newItem, minPrice: e.target.value })}
              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Max $"
              value={newItem.maxPrice}
              onChange={(e) => setNewItem({ ...newItem, maxPrice: e.target.value })}
              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
            <input
              type="number"
              placeholder="Qty"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded transition-colors"
          >
            Add Product
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-4">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-400 py-8 text-sm">
          No products yet. Add your first item!
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-gray-50 rounded-lg p-3 border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-10 h-10 rounded object-cover shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                      <span className="text-sm font-bold text-emerald-300">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-800 truncate">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-xs text-red-400 hover:text-red-600 ml-2 transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-emerald-600 font-semibold">
                  ${item.maxPrice.toFixed(2)}
                </span>
                <span className="text-gray-400">
                  (min: ${item.minPrice.toFixed(2)})
                </span>
                <span className="text-gray-400">
                  Qty: {item.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
