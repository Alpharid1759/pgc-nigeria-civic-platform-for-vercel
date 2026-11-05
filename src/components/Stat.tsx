export default function Stat({ value, label }: { value: number | null; label: string }) {
  const display = value === null ? "Unavailable" : new Intl.NumberFormat("en-NG").format(value);
  return (
    <div className="stat">
      <div className="stat__value">{display}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}
