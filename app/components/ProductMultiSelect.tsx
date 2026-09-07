'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export type ProductSelectOption = {
  id: string;
  name: string;
  category: string;
};

type Props = {
  products: ProductSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  maxSelected?: number;
  placeholder?: string;
};

export default function ProductMultiSelect({
  products,
  selectedIds,
  onChange,
  disabled = false,
  maxSelected = 20,
  placeholder = 'Vyberte produkty',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedProducts = products.filter((product) => selectedSet.has(product.id));
  const filteredProducts = products.filter((product) => {
    const needle = query.trim().toLocaleLowerCase('cs-CZ');
    return !needle || `${product.name} ${product.category}`.toLocaleLowerCase('cs-CZ').includes(needle);
  });

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }
    if (selectedIds.length < maxSelected) onChange([...selectedIds, id]);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-900 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className={selectedProducts.length ? 'font-medium' : 'text-slate-500'}>
          {selectedProducts.length ? `Vybráno produktů: ${selectedProducts.length}` : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {selectedProducts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedProducts.map((product) => (
            <span key={product.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
              <span className="truncate">{product.name}</span>
              <button type="button" onClick={() => toggle(product.id)} className="rounded-full p-0.5 hover:bg-blue-100" aria-label={`Odebrat ${product.name}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-[70] mt-2 w-full min-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Hledat produkt nebo kategorii…"
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {filteredProducts.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-slate-500">Žádný produkt nebyl nalezen.</p>
            ) : filteredProducts.map((product) => {
              const selected = selectedSet.has(product.id);
              const limitReached = !selected && selectedIds.length >= maxSelected;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggle(product.id)}
                  disabled={limitReached}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selected && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{product.name}</span>
                    <span className="block text-xs text-slate-500">{product.category}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>{selectedIds.length}/{maxSelected} vybráno</span>
            <button type="button" onClick={() => setOpen(false)} className="font-semibold text-blue-700 hover:underline">Hotovo</button>
          </div>
        </div>
      )}
    </div>
  );
}
