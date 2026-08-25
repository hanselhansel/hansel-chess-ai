import { cn } from "@/lib/cn";
import { PieceGlyph } from "./pieces";

export type SquarePiece = { type: string; color: "w" | "b" } | null;

type Props = {
  board: SquarePiece[][];
  flipped: boolean;
  selected: string | null;
  legalTargets: Set<string>;
  lastFrom?: string;
  lastTo?: string;
  heatmap?: Record<string, number>;
  thinking?: boolean;
  onSquare: (alg: string) => void;
  disabled?: boolean;
};

function alg(file: number, rank: number) {
  return `${String.fromCharCode(97 + file)}${rank + 1}`;
}

export function ChessBoard({
  board,
  flipped,
  selected,
  legalTargets,
  lastFrom,
  lastTo,
  heatmap,
  thinking,
  onSquare,
  disabled,
}: Props) {
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,560px)]">
      <div
        className={cn(
          "grid aspect-square w-full grid-cols-8 overflow-hidden rounded-sm shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)] ring-1 ring-border",
          thinking && "ring-accent/40",
        )}
      >
        {ranks.map((rank) =>
          files.map((file) => {
            const sq = alg(file, rank);
            const light = (file + rank) % 2 === 1;
            const piece = board[7 - rank][file];
            const isSel = selected === sq;
            const isLast = lastFrom === sq || lastTo === sq;
            const heat = heatmap?.[sq] ?? 0;
            const isLegal = legalTargets.has(sq);
            return (
              <button
                key={sq}
                type="button"
                onClick={() => {
                  if (!disabled) onSquare(sq);
                }}
                className={cn(
                  "relative aspect-square min-h-11 min-w-11",
                  light ? "bg-board-light" : "bg-board-dark",
                  isSel && "z-10 ring-2 ring-inset ring-accent",
                )}
                aria-disabled={disabled || undefined}
                aria-label={sq}
              >
                {isLast && <span className="absolute inset-0 bg-last-move" />}
                {heat > 0.04 && (
                  <span
                    className="absolute inset-0 bg-heat"
                    style={{ opacity: 0.12 + heat * 0.45 }}
                  />
                )}
                {piece && (
                  <span className="absolute inset-0 grid place-items-center">
                    <PieceGlyph type={piece.type} color={piece.color} />
                  </span>
                )}
                {isLegal && !piece && (
                  <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-legal" />
                )}
                {isLegal && piece && (
                  <span className="absolute inset-1 rounded-sm ring-2 ring-legal/80" />
                )}
                {file === files[0] && (
                  <span className="absolute left-1 top-0.5 text-[10px] font-medium text-coord">
                    {rank + 1}
                  </span>
                )}
                {rank === ranks[ranks.length - 1] && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-medium text-coord">
                    {String.fromCharCode(97 + file)}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
