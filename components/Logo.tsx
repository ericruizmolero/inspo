/** The product mark. It stands in for the name everywhere in the UI; the name lives in alt text. */
export default function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="criterio.design"
      width={size}
      height={size}
      className={`logo ${className}`}
      draggable={false}
    />
  );
}
