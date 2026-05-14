import { useState } from "react";
import {
  RefreshCw, ExternalLink, Trash2, ShoppingBag, Target,
  TrendingDown, TrendingUp, Pause, Play, BarChart2,
} from "lucide-react";
import { deleteItem, checkItemNow, updateItem } from "../api.js";
import PriceSparkline   from "./PriceSparkline.jsx";
import PriceHistoryModal from "./PriceHistoryModal.jsx";

function formatRelativeTime(dateStr) {
  if (!dateStr) return null;
  const d    = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const fmt = p => (p == null ? null : `$${p.toFixed(2)}`);

function getPriceTrend(history) {
  if (!history || history.length < 2) return null;
  const s = [...history].sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at));
  const prev = s[s.length - 2].price;
  const curr = s[s.length - 1].price;
  return curr < prev ? "down" : curr > prev ? "up" : "same";
}

const RETAILER_COLORS = {
  nordstrom: "bg-violet-50 text-violet-700",
  sephora:   "bg-pink-50 text-pink-700",
  macys:     "bg-red-50 text-red-700",
  zara:      "bg-gray-100 text-gray-700",
  amazon:    "bg-amber-50 text-amber-700",
  target:    "bg-red-50 text-red-700",
};

function retailerLabel(r) {
  if (!r) return "Store";
  if (r === "macys") return "Macy's";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

/* Minimum 44×44 pt icon button — meets iOS HIG tap target */
function IconBtn({ onClick, disabled, title, className = "", children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-colors disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export default function ItemCard({ item, onDelete, onChecked }) {
  const [checking,  setChecking]  = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [toggling,  setToggling]  = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const savingsPct =
    item.original_price && item.current_price && item.original_price > item.current_price
      ? Math.round(((item.original_price - item.current_price) / item.original_price) * 100)
      : null;

  const onSale    = item.is_on_sale || savingsPct > 0;
  const hitTarget = item.target_price != null && item.current_price != null && item.current_price <= item.target_price;
  const isPaused  = !item.is_active;
  const trend     = getPriceTrend(item.price_history);
  const hasHistory= (item.price_history?.length ?? 0) >= 2;

  const handleCheck = async () => {
    setChecking(true);
    try {
      await checkItemNow(item.id);
      setTimeout(() => { setChecking(false); onChecked(); }, 6000);
    } catch { setChecking(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove "${item.name || "this item"}" from tracking?`)) return;
    setDeleting(true);
    try {
      await deleteItem(item.id);
      onDelete(item.id);
    } catch { setDeleting(false); }
  };

  const handleTogglePause = async () => {
    setToggling(true);
    try {
      await updateItem(item.id, { is_active: isPaused });
      onChecked();
    } catch { setToggling(false); }
  };

  return (
    <>
      <div
        className={`bg-white rounded-2xl border overflow-hidden flex flex-col
          ${isPaused
            ? "border-gray-100 opacity-60"
            : hitTarget
            ? "border-green-300 ring-1 ring-green-200"
            : onSale
            ? "border-rose-200"
            : "border-gray-200"}`}
      >
        {/* ── Image ── */}
        <div className="relative overflow-hidden bg-gray-50 flex-shrink-0">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name || "Product"}
              className="w-full h-44 object-cover"
              onError={e => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div className={`w-full h-44 items-center justify-center ${item.image_url ? "hidden" : "flex"}`}>
            <ShoppingBag size={40} className="text-gray-200" />
          </div>

          {/* Sale / paused badges */}
          <div className="absolute top-2 left-2">
            {isPaused && (
              <span className="bg-gray-700/80 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                Paused
              </span>
            )}
            {!isPaused && hitTarget && (
              <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                Target Hit!
              </span>
            )}
            {!isPaused && !hitTarget && onSale && savingsPct > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                {savingsPct}% OFF
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-4 flex flex-col flex-1 gap-2">

          {/* Retailer + category */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RETAILER_COLORS[item.retailer] || "bg-gray-100 text-gray-600"}`}>
              {retailerLabel(item.retailer)}
            </span>
            <span className="text-xs text-gray-400 capitalize">{item.category}</span>
          </div>

          {/* Name */}
          <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
            {item.name || <span className="text-gray-400">Loading product info…</span>}
          </h3>

          {/* Price + trend */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.current_price != null ? (
              <>
                <span className={`text-xl font-bold ${onSale && !isPaused ? "text-rose-600" : "text-gray-900"}`}>
                  {fmt(item.current_price)}
                </span>
                {trend === "down" && <TrendingDown size={15} className="text-rose-500" />}
                {trend === "up"   && <TrendingUp   size={15} className="text-gray-400" />}
                {item.original_price && item.original_price > item.current_price && (
                  <span className="text-sm text-gray-400 line-through">{fmt(item.original_price)}</span>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-400">Price unavailable</span>
            )}
          </div>

          {/* Sparkline — tappable */}
          {hasHistory && (
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 py-1 -mx-1 px-1 rounded-lg active:bg-gray-50"
            >
              <PriceSparkline history={item.price_history} />
              <span className="text-xs text-gray-300">{item.price_history.length} checks</span>
            </button>
          )}

          {/* Target price */}
          {item.target_price != null && (
            <div className={`text-xs flex items-center gap-1 ${hitTarget ? "text-green-600 font-medium" : "text-gray-400"}`}>
              <Target size={11} />
              Target: {fmt(item.target_price)}
            </div>
          )}

          {/* Last checked */}
          {item.last_checked && (
            <p className="text-xs text-gray-300">
              Checked {formatRelativeTime(item.last_checked)}
            </p>
          )}

          {/* ── Action buttons (all 44×44 touch targets) ── */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-auto">
            {/* Refresh — takes remaining width */}
            <button
              onClick={handleCheck}
              disabled={checking || isPaused}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl border border-gray-200 text-gray-600 active:bg-gray-50 disabled:opacity-40 text-sm font-medium"
            >
              <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
              {checking ? "Checking…" : "Refresh"}
            </button>

            {hasHistory && (
              <IconBtn onClick={() => setShowHistory(true)} title="Price history" className="border-gray-200 text-gray-500 active:bg-gray-50">
                <BarChart2 size={16} />
              </IconBtn>
            )}

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open product page"
              className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-500 active:bg-gray-50"
            >
              <ExternalLink size={16} />
            </a>

            <IconBtn
              onClick={handleTogglePause}
              disabled={toggling}
              title={isPaused ? "Resume tracking" : "Pause tracking"}
              className={isPaused ? "border-green-200 text-green-600 active:bg-green-50" : "border-gray-200 text-gray-400 active:bg-gray-50"}
            >
              {isPaused ? <Play size={15} /> : <Pause size={15} />}
            </IconBtn>

            <IconBtn
              onClick={handleDelete}
              disabled={deleting}
              title="Remove from tracking"
              className="border-red-100 text-red-400 active:bg-red-50"
            >
              <Trash2 size={15} />
            </IconBtn>
          </div>
        </div>
      </div>

      {showHistory && (
        <PriceHistoryModal item={item} onClose={() => setShowHistory(false)} />
      )}
    </>
  );
}
