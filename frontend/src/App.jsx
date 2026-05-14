import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Settings, Tag, Plus, SlidersHorizontal } from "lucide-react";
import { fetchItems, checkAll } from "./api.js";
import AddItemModal from "./components/AddItemModal.jsx";
import ItemCard from "./components/ItemCard.jsx";
import SettingsModal from "./components/SettingsModal.jsx";

const CATEGORIES = ["all", "shoes", "accessories", "makeup", "clothing", "other"];

const SORT_OPTIONS = [
  { value: "newest",    label: "Newest" },
  { value: "discount",  label: "Biggest discount" },
  { value: "price-low", label: "Price: low → high" },
  { value: "price-high",label: "Price: high → low" },
  { value: "name",      label: "Name A–Z" },
];

function sortItems(items, sort) {
  const arr = [...items];
  switch (sort) {
    case "discount":  return arr.sort((a, b) => (b.sale_percentage || 0) - (a.sale_percentage || 0));
    case "price-low": return arr.sort((a, b) => (a.current_price ?? Infinity) - (b.current_price ?? Infinity));
    case "price-high":return arr.sort((a, b) => (b.current_price ?? 0) - (a.current_price ?? 0));
    case "name":      return arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    default:          return arr;
  }
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize whitespace-nowrap flex-shrink-0
        ${active
          ? "bg-rose-500 text-white"
          : "bg-white text-gray-600 active:bg-gray-100 border border-gray-200"}`}
    >
      {label}
    </button>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
        <Tag size={28} className="text-rose-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">No items tracked yet</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-xs leading-relaxed">
        Paste a product URL from Nordstrom, Sephora, Macy's, Zara, Amazon, or Target to start tracking.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-3 bg-rose-500 active:bg-rose-600 text-white rounded-xl text-sm font-medium"
      >
        Track your first item
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
        <div className="h-4 bg-gray-100 rounded w-3/5" />
        <div className="h-9 bg-gray-100 rounded w-2/5" />
      </div>
    </div>
  );
}

export default function App() {
  const [items,       setItems]       = useState([]);
  const [category,   setCategory]    = useState("all");
  const [onSaleOnly, setOnSaleOnly]  = useState(false);
  const [sort,       setSort]        = useState("newest");
  const [loading,    setLoading]     = useState(true);
  const [checking,   setChecking]    = useState(false);
  const [showAdd,    setShowAdd]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loadItems = async () => {
    try {
      const data = await fetchItems(category);
      setItems(data);
    } catch (err) {
      console.error("Failed to load items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadItems();
  }, [category]);

  const handleCheckAll = async () => {
    setChecking(true);
    try {
      await checkAll();
      setTimeout(() => { loadItems(); setChecking(false); }, 8000);
    } catch {
      setChecking(false);
    }
  };

  const handleItemAdded   = item => { setItems(prev => [item, ...prev]); setShowAdd(false); };
  const handleItemDeleted = id   => setItems(prev => prev.filter(i => i.id !== id));

  const displayedItems = useMemo(() => {
    const list = onSaleOnly ? items.filter(i => i.is_on_sale) : items;
    return sortItems(list, sort);
  }, [items, onSaleOnly, sort]);

  const saleCount   = items.filter(i => i.is_on_sale && i.is_active).length;
  const pausedCount = items.filter(i => !i.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 pt-safe">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-rose-500 flex-shrink-0" />
            <span className="font-bold text-gray-900 text-lg">Sale Tracker</span>
            {saleCount > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {saleCount} on sale
              </span>
            )}
            {pausedCount > 0 && (
              <span className="bg-gray-200 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
                {pausedCount} paused
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleCheckAll}
              disabled={checking}
              className="p-3 rounded-xl text-gray-500 active:bg-gray-100 disabled:opacity-50"
              title="Check all prices now"
            >
              <RefreshCw size={19} className={checking ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 rounded-xl text-gray-500 active:bg-gray-100"
              title="Settings"
            >
              <Settings size={19} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">

        {/* ── Filter row ── */}
        <div className="mb-5 space-y-3">
          {/* Category pills — horizontally scrollable */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {CATEGORIES.map(cat => (
              <CategoryPill
                key={cat}
                label={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
              />
            ))}
            <button
              onClick={() => setOnSaleOnly(v => !v)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors
                ${onSaleOnly
                  ? "bg-rose-500 text-white"
                  : "bg-white text-rose-500 active:bg-rose-50 border border-rose-200"}`}
            >
              On sale
            </button>
          </div>

          {/* Sort row */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <SlidersHorizontal size={14} className="flex-shrink-0" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="text-sm bg-transparent border-none focus:outline-none cursor-pointer flex-1 text-gray-600 py-1"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayedItems.length === 0 ? (
          items.length === 0 ? (
            <EmptyState onAdd={() => setShowAdd(true)} />
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-gray-400 text-sm">No items match this filter.</p>
              <button
                onClick={() => { setOnSaleOnly(false); setCategory("all"); }}
                className="mt-3 text-sm text-rose-500 font-medium py-2 px-4"
              >
                Clear filters
              </button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayedItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={handleItemDeleted}
                onChecked={loadItems}
              />
            ))}
          </div>
        )}

        {/* Bottom spacer so FAB doesn't overlap last card */}
        <div className="h-24 pb-safe" />
      </main>

      {/* ── FAB — fixed above home indicator ── */}
      <button
        onClick={() => setShowAdd(true)}
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        className="fixed right-5 w-14 h-14 bg-rose-500 active:bg-rose-600 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-transform"
        title="Track a new item"
      >
        <Plus size={24} />
      </button>

      {showAdd && (
        <AddItemModal onClose={() => setShowAdd(false)} onAdded={handleItemAdded} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
