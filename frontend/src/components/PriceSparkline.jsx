export default function PriceSparkline({ history, width = 108, height = 36 }) {
  const sorted = [...(history || [])]
    .sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at));

  if (sorted.length < 2) return null;

  const prices = sorted.map(h => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || min * 0.01 || 1;

  const pad = 4;
  const W = width - pad * 2;
  const H = height - pad * 2;

  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * W;
    const y = pad + H - ((p - min) / range) * H;
    return [+x.toFixed(1), +y.toFixed(1)];
  });

  const pathD = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt[0]} ${pt[1]}`).join(" ");
  const isDown = prices[prices.length - 1] < prices[0];
  const color = isDown ? "#f43f5e" : "#9ca3af";
  const [lx, ly] = pts[pts.length - 1];

  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}
