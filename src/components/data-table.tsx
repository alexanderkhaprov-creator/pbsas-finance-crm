"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Edit, Plus, Search, Trash2, Upload } from "lucide-react";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type Filter<T> = {
  key: string;
  label: string;
  options: string[];
  getValue: (row: T) => string;
};

type DataTableProps<T extends { id: string }> = {
  rows: T[];
  columns: Column<T>[];
  filters?: Filter<T>[];
  searchPlaceholder: string;
  addLabel?: string;
  getSearchText: (row: T) => string;
  receiptUpload?: boolean;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  filters = [],
  searchPlaceholder,
  addLabel = "Add record",
  getSearchText,
  receiptUpload = false,
  onAdd,
  onEdit,
  onDelete
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const rowsWithoutIds = rows.filter((row) => !row.id);
    if (rowsWithoutIds.length > 0) {
      console.warn("DataTable received rows without a non-empty id. Check record creation and localStorage sanitization.", rowsWithoutIds);
    }

    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();
    rows.forEach((row) => {
      if (!row.id) return;
      if (seenIds.has(row.id)) {
        duplicateIds.add(row.id);
        return;
      }
      seenIds.add(row.id);
    });

    if (duplicateIds.size > 0) {
      console.warn("DataTable received duplicate row ids. Check record creation and localStorage sanitization.", Array.from(duplicateIds));
    }
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = normalizedQuery ? getSearchText(row).toLowerCase().includes(normalizedQuery) : true;
      const matchesFilters = filters.every((filter) => {
        const value = filterValues[filter.key];
        return value ? filter.getValue(row) === value : true;
      });
      return matchesSearch && matchesFilters;
    });
  }, [filterValues, filters, getSearchText, query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="rounded border border-black/10 bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-steel" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-steel/70"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            value={query}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <select
              className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink"
              key={filter.key}
              onChange={(event) => {
                setFilterValues((current) => ({ ...current, [filter.key]: event.target.value }));
                setPage(1);
              }}
              value={filterValues[filter.key] ?? ""}
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
          {onAdd ? (
            <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              {addLabel}
            </button>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
            <tr>
              {columns.map((column) => (
                <th className="whitespace-nowrap px-4 py-3 font-semibold" key={column.key}>
                  {column.header}
                </th>
              ))}
              {onEdit || onDelete || receiptUpload ? <th className="whitespace-nowrap px-4 py-3 font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {paginatedRows.map((row) => (
              <tr className="align-top hover:bg-[#fafaf8]" key={row.id}>
                {columns.map((column) => (
                  <td className="max-w-[260px] px-4 py-4 text-steel" key={column.key}>
                    {column.render(row)}
                  </td>
                ))}
                {onEdit || onDelete || receiptUpload ? (
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      {onEdit ? (
                        <button className="rounded border border-black/10 p-2 text-steel hover:border-gold hover:text-ink" onClick={() => onEdit(row)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                      ) : null}
                      {receiptUpload ? (
                        <button className="rounded border border-black/10 p-2 text-steel hover:border-gold hover:text-ink" title="Upload receipt placeholder">
                          <Upload className="h-4 w-4" />
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          className="rounded border border-black/10 p-2 text-steel hover:border-red-300 hover:text-red-700"
                          onClick={() => onDelete(row)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-black/10 px-4 py-3 text-sm text-steel sm:flex-row sm:items-center sm:justify-between">
        <span>Showing {paginatedRows.length} of {filteredRows.length} filtered records</span>
        <div className="flex items-center gap-2">
          <button className="rounded border border-black/10 px-3 py-2 font-semibold disabled:opacity-40" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="rounded border border-black/10 px-3 py-2 font-semibold disabled:opacity-40" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}
