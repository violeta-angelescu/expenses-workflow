import { Alert } from "@/components/Alert";

export interface PageError {
  title: string;
  message: string;
  canRetry: boolean;
}

export function PageErrorAlert({
  error,
  onDismiss,
  onRetry,
}: {
  error: PageError;
  onDismiss?: () => void;
  onRetry: () => void;
}) {
  return (
    <Alert title={error.title} onDismiss={onDismiss}>
      <span>{error.message}</span>
      {error.canRetry && (
        <button type="button" className="secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </Alert>
  );
}
