export default function Logo({ size = "default" }: { size?: "default" | "large" }) {
  const logoHeight = size === "large" ? "h-7" : "h-5";
  const textSize = size === "large" ? "text-xl" : "text-lg";

  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/denco_logo.svg" alt="DENCO" className={`${logoHeight} w-auto`} />
      <span className={`${textSize} font-light text-accent`}>Health</span>
    </div>
  );
}
