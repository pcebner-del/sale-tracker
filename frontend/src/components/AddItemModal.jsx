import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { addItem } from "../api.js";

const CATEGORIES = ["shoes", "accessories", "makeup", "clothing", "other"];

const RETAILER_MAP = {
  "nordstrom.com": "Nordstrom",
  "sephora.com":   "Sephora",
  "macys.com":     "Macy's",
  "zara.com":      "Zara",
  "amazon.com":    "Amazon",
  "target.com":    "Target",
};

function detectRetailer(url) {
  if (!url) return null;
  const lower = url.toLowerCase();
  for (const [domain, name] of Object.entries(RETAILER_MAP)) {
    if (lower.includes(domain)) return name;
  }
  return null;
}

export default function AddItemModal({ onClose, onAdded }) {
  const [url,         setUrl]         = useState("");
  const [category,   setCategory]    = useState("clothing");
  const [targetPrice, setTargetPrice] = useState("");
  const [loading,    setLoading]     = useState(false);
  const [error,      setError]       = useState("");

  const retailer = detectRetailer(url);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const item = await addItem({
        url: url.trim(),
        category,
        target_price: targetPrice ? parseFloat(targetPrice) : null,
      });
      onAdded(item);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    /* Sheet slides up from bottom on mobile, centered dialog on larger screens */
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-xl pb-safe">

        {/* Drag handle (visual only, mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:pt-6">
          <h2 className="text-lg font-semibold text-gray-900">Track an Item</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product URL
            </label>
            <div className="relative">
              <input
                type="url"
                inputMode="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Paste a product link here…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-28 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                required
                autoFocus
              />
              {retailer && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium pointer-events-none">
                  {retailer}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Nordstrom, Sephora, Macy's, Zara, Amazon, Target, and more
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 text-gray-900"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c} className="capitalize">
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Target price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Price{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base select-none pointer-events-none">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                placeholder="Notify me when below this price"
                className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Leave empty to get notified on any price drop
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3.5">
              {error}
            </div>
          )}

          {loading && (
            <p className="text-center text-xs text-gray-400">
              Fetching product info — this can take up to 15 seconds…
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 border border-gray-200 rounded-xl text-sm text-gray-600 active:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex-1 h-12 bg-rose-500 active:bg-rose-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Fetching…</>
                : "Track Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
