import React from 'react';
import { clsx } from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T extends { _id?: string }>({ columns, data, loading, emptyMessage = 'No data found', onRowClick }: TableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(c => (
                <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5].map(i => (
              <tr key={i} className="border-b border-gray-100">
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(c => (
                <th key={c.key} className={clsx('px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">{emptyMessage}</td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row._id || i}
                  className={clsx('hover:bg-gray-50 transition-colors', onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(c => (
                    <td key={c.key} className={clsx('px-4 py-3 text-gray-700', c.className)}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
