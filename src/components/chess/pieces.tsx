import type { ReactNode } from "react";

const STROKE = "currentColor";

function W({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 40 40" className="h-[68%] w-[68%]" aria-hidden>
      {children}
    </svg>
  );
}

export function PieceGlyph({
  type,
  color,
}: {
  type: string;
  color: "w" | "b";
}) {
  const fill = color === "w" ? "var(--color-piece-w)" : "var(--color-piece-b)";
  const ink = color === "w" ? "var(--color-piece-w-ink)" : "var(--color-piece-b-ink)";
  return (
    <span className="pointer-events-none flex h-full w-full items-center justify-center" style={{ color: ink }}>
      <W>
        {type === "k" && (
          <>
            <path fill={fill} stroke={STROKE} strokeWidth="1.4" d="M8 34h24l-2-8c-2-8-6-12-10-12S12 18 10 26z" />
            <path fill="none" stroke={STROKE} strokeWidth="1.6" d="M20 6v10M15 9h10" />
            <circle cx="20" cy="6" r="2" fill={fill} stroke={STROKE} strokeWidth="1.2" />
          </>
        )}
        {type === "q" && (
          <>
            <path fill={fill} stroke={STROKE} strokeWidth="1.4" d="M8 34h24l-1.5-7-5 3-3.5-10-2 10-5-3z" />
            <circle cx="10" cy="14" r="2.2" fill={fill} stroke={STROKE} strokeWidth="1.2" />
            <circle cx="20" cy="10" r="2.2" fill={fill} stroke={STROKE} strokeWidth="1.2" />
            <circle cx="30" cy="14" r="2.2" fill={fill} stroke={STROKE} strokeWidth="1.2" />
          </>
        )}
        {type === "r" && (
          <path
            fill={fill}
            stroke={STROKE}
            strokeWidth="1.4"
            d="M9 34h22v-4H9zm3-4 1-12h14l1 12M11 18V10h4v3h3V10h4v3h3V10h4v8"
          />
        )}
        {type === "b" && (
          <>
            <ellipse cx="20" cy="16" rx="6" ry="8" fill={fill} stroke={STROKE} strokeWidth="1.4" />
            <path fill={fill} stroke={STROKE} strokeWidth="1.4" d="M12 34h16l-3-10h-10z" />
            <path d="M18 14h4" stroke={STROKE} strokeWidth="1.4" />
          </>
        )}
        {type === "n" && (
          <path
            fill={fill}
            stroke={STROKE}
            strokeWidth="1.4"
            strokeLinejoin="round"
            d="M9 34h21v-4s-6-3-7-10c3-1 7-4 7-9 0-4-3-7-8-7-2 0-4.5 1-6 3L9 14c2-1 4 1 4 3 0 5-4 8-4 13z"
          />
        )}
        {type === "p" && (
          <>
            <circle cx="20" cy="14" r="6" fill={fill} stroke={STROKE} strokeWidth="1.4" />
            <path fill={fill} stroke={STROKE} strokeWidth="1.4" d="M10 34h20c-1-6-4-10-10-10s-9 4-10 10z" />
          </>
        )}
      </W>
    </span>
  );
}
