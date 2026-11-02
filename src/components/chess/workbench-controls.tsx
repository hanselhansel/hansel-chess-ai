type Props = {
  onPlayWhite(): void;
  onPlayBlack(): void;
  showRetryMove: boolean;
  onRetryMove(): void;
  showRetryEngine: boolean;
  onRetryEngine(): void;
  demo: boolean;
  onToggleMode(): void;
};

/** The controls row: pure presentation booleans and callbacks only. */
export function WorkbenchControls({
  onPlayWhite,
  onPlayBlack,
  showRetryMove,
  onRetryMove,
  showRetryEngine,
  onRetryEngine,
  demo,
  onToggleMode,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-lg bg-fg px-4 py-2.5 text-sm font-medium text-bg"
        onClick={onPlayWhite}
      >
        Play White
      </button>
      <button
        type="button"
        className="rounded-lg bg-subtle px-4 py-2.5 text-sm font-medium text-fg ring-1 ring-border"
        onClick={onPlayBlack}
      >
        Play Black
      </button>
      {showRetryMove && (
        <button
          type="button"
          className="rounded-lg bg-subtle px-4 py-2.5 text-sm font-medium text-fg ring-1 ring-border"
          onClick={onRetryMove}
        >
          Retry move
        </button>
      )}
      {showRetryEngine && (
        <button
          type="button"
          className="rounded-lg bg-subtle px-4 py-2.5 text-sm font-medium text-fg ring-1 ring-border"
          onClick={onRetryEngine}
        >
          Retry engine
        </button>
      )}
      <button
        type="button"
        className="rounded-lg bg-subtle px-4 py-2.5 text-sm font-medium text-fg ring-1 ring-border"
        onClick={onToggleMode}
      >
        {demo ? "Trained net" : "Random demo"}
      </button>
    </div>
  );
}
