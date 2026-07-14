export default function FlagIcon({ codigo, size = 18, style, ...props }) {
  if (!codigo || codigo.length !== 2) return null;
  return (
    <span
      className={`fi fi-${codigo.toLowerCase()}`}
      style={{ fontSize: size, lineHeight: 1, borderRadius: 3, ...style }}
      {...props}
    />
  );
}
