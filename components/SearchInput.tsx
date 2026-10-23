"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Debounced search box. Emits onSearch only after the user pauses typing,
 * skips the initial mount, and never re-fires for an unchanged trimmed value.
 */
export function SearchInput({
  onSearch,
  delay = 300,
  placeholder = "Search…",
}: {
  onSearch: (query: string) => void;
  delay?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const last = useRef("");
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === last.current) return;
    const t = setTimeout(() => {
      last.current = trimmed;
      onSearchRef.current(trimmed);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="form-row">
      <input
        type="search"
        aria-label="Search expenses"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button type="button" className="secondary" onClick={() => setValue("")}>
          Clear
        </button>
      )}
    </div>
  );
}
