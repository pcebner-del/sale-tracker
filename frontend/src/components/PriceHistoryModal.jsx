import { X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

function formatDate(dateStr) {
  const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md px-3 py-2 text-sm">
      <p className="text-gray-400 text-xs mb-1">{row.date}</p>
      <p className="font-semibold text-gray-900">${row.price.toFixed(2)}</p>
      {row.is_on_sale && <p className="text-xs text-rose-500 mt-0.5">On sale</p>}
    </div>
  );
}

export default function PriceHistoryModal({ item, onClose }) {
  const sorted = [...(item.price_history || [])].sort(
    (a, b) => new Date(a.checked_at) - new Date(b.checked_at)
  );

  const data = sorted.map(h => ({
    date: formatDate(h.checked_at),
    price: h.price,
    is_on_sale: h.is_on_sale,
  }));

  const prices  = data.map(d => d.price);
  const minY    = prices.length ? Math.min(...prices) * 0.94 : 0;
  const maxY    = prices.length ? Math.max(...prices) * 1.06 : 100;
  const lowest  = prices.length ? Math.min(...prices)         : null;
  const latest  = prices.length ? prices[prices.length - 1]   : null;
  const changePct = prices.length >= 2
    ? (((prices[0] - latest) / prices[0]) * 100).toFixed(0)
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Sheet: full-height on mobile (up to 92dvh), dialog on desktop */}
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl shadow-xl max-h-[92dvh] flex flex-col pb-safe">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="pr-4 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 line-clamp-2">
              {item.name || "Price History"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{item.retailer}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {data.length < 2 ? (
            <p className="text-sm text-gray-400 text-center py-12">
              Not enough data yet — check back after the next price check.
            </p>
          ) : (
            <>
              {/* Stats */}
              <div className="flex gap-6 mb-5">
                {latest != null && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Current</p>
                    <p className="text-xl font-bold text-gray-900">${latest.toFixed(2)}</p>
                  </div>
                )}
                {lowest != null && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Lowest seen</p>
                    <p className="text-xl font-bold text-rose-600">${lowest.toFixed(2)}</p>
                  </div>
                )}
                {changePct !== null && parseFloat(changePct) !== 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Change</p>
                    <p className={`text-xl font-bold ${parseFloat(changePct) > 0 ? "text-green-600" : "text-gray-400"}`}>
                      {parseFloat(changePct) > 0 ? "−" : "+"}{Math.abs(parseFloat(changePct))}%
                    </p>
                  </div>
                )}
              </div>

              {/* Chart */}
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[minY, maxY]}
                    tickFormatter={v => `$${v.toFixed(0)}`}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {item.target_price != null && (
                    <ReferenceLine
                      y={item.target_price}
                      stroke="#16a34a"
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Target $${item.target_price.toFixed(2)}`,
                        position: "insideTopRight",
                        fill: "#16a34a",
                        fontSize: 10,
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f43f5e", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#f43f5e", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Table */}
              <div className="mt-5 border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Price</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...data].reverse().map((row, i) => (
                      <tr key={i} className="active:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{row.date}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          ${row.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.is_on_sale && (
                            <span className="text-xs bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full">
                              Sale
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
