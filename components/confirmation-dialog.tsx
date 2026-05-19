"use client";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 6 18 18" strokeLinecap="round" />
      <path d="M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-12 w-12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3.75 21 19.5H3L12 3.75Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4.5" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirming = false,
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!open) {
    return null;
  }

  const confirmClassName =
    tone === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : "bg-slate-900 text-white hover:bg-slate-800";

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/35 px-4">
      <div className="relative w-full max-w-[760px] rounded-[16px] bg-white px-6 py-8 shadow-[0_30px_90px_rgba(15,23,42,0.24)] sm:px-10 sm:py-10">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close popup"
        >
          <CloseIcon />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={tone === "danger" ? "text-rose-500" : "text-slate-900"}>
            <WarningIcon />
          </div>
          <p className="mt-5 text-lg font-medium text-slate-900">{title}</p>
          <p className="mt-3 max-w-[560px] text-base leading-7 text-slate-600">{description}</p>

          <div className="mt-8 flex w-full max-w-[520px] flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className={`inline-flex flex-1 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${confirmClassName}`}
            >
              {isConfirming ? "Deleting..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
