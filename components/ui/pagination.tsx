import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="Pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />;
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-row items-center gap-2", className)} {...props} />;
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li {...props} />;
}

function PaginationPrevious(props: React.ComponentProps<typeof Button>) {
  return <Button variant="outline" {...props}>Previous</Button>;
}

function PaginationNext(props: React.ComponentProps<typeof Button>) {
  return <Button {...props}>Next</Button>;
}

export { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious };
