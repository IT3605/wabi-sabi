interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-6 bottom-6 z-40 flex max-w-[360px] items-center gap-3 rounded-2xl border border-[#3a594a] bg-[#253a30] px-5 py-3.5 text-[14px] text-white shadow-[0_12px_35px_rgba(0,0,0,0.2)]"
    >
      <span className="leading-snug">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-auto shrink-0 text-[12px] font-medium text-[#d5e0d5] underline-offset-2 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Close
      </button>
    </div>
  );
}
