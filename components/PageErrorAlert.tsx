import { Alert } from "@/components/Alert";
import { Button } from "@/components/ui/button";

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
        <Button type="button" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Alert>
  );
}
