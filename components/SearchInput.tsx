"use client";
import { useEffect, useState } from "react";

/** Debounced search box: calls onSearch once the user pauses typing. */
export function SearchInput({
  onSearch,
  placeholder = "Search…",
}: {
  onSearch: (query: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const t = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value, onSearch]);

  return (
    <input
      type="search"
      aria-label="Search expenses"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ width: "100%", marginBottom: ".75rem" }}
    />
  );
}
