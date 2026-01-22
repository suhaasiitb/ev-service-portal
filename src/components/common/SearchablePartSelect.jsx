import { useEffect, useMemo, useRef, useState } from "react";

export default function SearchablePartSelect({
  parts,
  value,
  onChange,
  placeholder = "Search part…",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const selectedPart = parts.find((p) => p.id === value);

  const filteredParts = useMemo(() => {
    if (!query) return parts;
    const q = query.toLowerCase();
    return parts.filter(
      (p) =>
        p.part_name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }, [parts, query]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      {/* Input */}
      <input
        type="text"
        value={
          open
            ? query
            : selectedPart
            ? `${selectedPart.part_name} (${selectedPart.sku})`
            : ""
        }
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-lg">
          {filteredParts.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">
              No matching parts
            </div>
          ) : (
            filteredParts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onChange(p.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-800 text-slate-100"
              >
                {p.part_name}{" "}
                <span className="text-slate-400">({p.sku})</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
