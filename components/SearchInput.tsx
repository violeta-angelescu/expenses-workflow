"use client";
import { useEffect, useRef, useState } from "react";

/** Debounced search box: calls onSearch once the user pauses typing. */
export function SearchInput({
  onSearch,
  placeholder = "Search…",
}: {
  onSearch: (query: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  // Keep the latest callback without re-running the debounce when its identity changes.
  const onSearchRef = useRef(onSearch);
  const lastSent = useRef("");

  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    const t = setTimeout(() => {
      const query = value.trim();
      if (query === lastSent.current) return;
      lastSent.current = query;
      onSearchRef.current(query);
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

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
