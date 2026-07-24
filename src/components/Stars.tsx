// Static star display (server-renderable). For inputs use the radio group on
// the review form — this is display only.
export default function Stars({
  rating,
  size = "text-sm",
}: {
  rating: number;
  size?: string;
}) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-0.5 ${size}`} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          className={i <= rounded ? "text-amber-400" : i - 0.5 === rounded ? "text-amber-400/60" : "text-abyss-700"}
        >
          ★
        </span>
      ))}
    </span>
  );
}
