import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function PaginationControls({
  hasPrevious,
  hasNext,
  busy,
  onPrevious,
  onNext,
}: {
  hasPrevious: boolean;
  hasNext: boolean;
  busy: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (!hasPrevious && !hasNext) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
        <PaginationPrevious
          type="button"
          disabled={!hasPrevious || busy}
          onClick={onPrevious}
        />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            type="button"
            disabled={!hasNext || busy}
            onClick={onNext}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
