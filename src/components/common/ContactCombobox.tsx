"use client";

import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { copy } from "@/config/copy";
import type { ContactRow } from "@/lib/queries/contacts";
import { cn } from "@/lib/utils/cn";
import { normalizeText } from "@/lib/utils/normalize-text";

const MAX_RESULTS = 8;

// No hay un primitivo Radix de combobox (Select no es buscable) — este es
// un listbox accesible hecho a mano: roles combobox/listbox/option,
// navegación con flechas + Enter/Escape, aria-activedescendant.
export function ContactCombobox({
  id,
  contacts,
  value,
  onChange,
}: {
  id: string;
  contacts: ContactRow[];
  value: string | null;
  onChange: (contact: ContactRow | null) => void;
}) {
  const selected = useMemo(() => contacts.find((contact) => contact.id === value) ?? null, [contacts, value]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    if (!normalizedQuery) return contacts.slice(0, MAX_RESULTS);
    return contacts
      .filter((contact) =>
        normalizeText([contact.business_name, contact.contact_name].filter(Boolean).join(" ")).includes(
          normalizedQuery,
        ),
      )
      .slice(0, MAX_RESULTS);
  }, [contacts, query]);

  const displayValue = open ? query : (selected?.business_name ?? "");
  const activeOption = results[highlighted];

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          strokeWidth={1.5}
        />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={open && activeOption ? `${id}-option-${activeOption.id}` : undefined}
          autoComplete="off"
          value={displayValue}
          placeholder={copy.pipeline.dialog.contactPlaceholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlighted(0);
            if (selected) onChange(null);
          }}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlighted((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlighted((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const contact = results[highlighted];
              if (contact) {
                onChange(contact);
                setOpen(false);
              }
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface py-2 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-muted"
        />
        {selected ? (
          <button
            type="button"
            aria-label={copy.pipeline.dialog.contactClear}
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-sunken"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface py-1 shadow-[var(--shadow-raised)]"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">{copy.pipeline.dialog.contactNoResults}</li>
          ) : (
            results.map((contact, index) => (
              <li
                key={contact.id}
                id={`${id}-option-${contact.id}`}
                role="option"
                aria-selected={contact.id === value}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(contact);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm",
                  index === highlighted ? "bg-bg-sunken" : "",
                )}
              >
                <span className="min-w-0 truncate text-text-primary">
                  {contact.business_name}
                  {contact.contact_name ? <span className="text-text-muted"> · {contact.contact_name}</span> : null}
                </span>
                {contact.id === value ? (
                  <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-text-primary" strokeWidth={1.5} />
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
