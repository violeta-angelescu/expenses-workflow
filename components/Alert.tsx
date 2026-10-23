interface AlertProps {
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
}

export function Alert({ title = "Error", children, onDismiss }: AlertProps) {
  return (
    <div role="alert" aria-live="assertive" className="mb-3 overflow-hidden rounded-md border border-red-300 bg-red-50 text-red-900">
      <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-100 px-4 py-2">
        <strong>{title}</strong>
        {onDismiss && (
          <button
            type="button"
            className="secondary"
            aria-label="Dismiss error"
            onClick={onDismiss}
          >
            ×
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        {children}
      </div>
    </div>
  );
}
