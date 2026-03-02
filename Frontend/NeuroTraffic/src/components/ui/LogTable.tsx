import React from 'react';

export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T;
  cell?: (item: T) => React.ReactNode;
}

interface LogTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
}

export function LogTable<T>({ data, columns, isLoading }: LogTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full h-48 border-2 border-brand-gray flex items-center justify-center font-mono text-brand-white/60 animate-pulse">
        [FETCHING_RECORDS...]
      </div>
    );
  }

  if (!data || data.length === 0) {
     return (
        <div className="w-full flex p-4 border-2 border-brand-gray bg-brand-black text-brand-white/60 font-mono uppercase text-sm justify-center">
            NO_DATA_AVAILABLE
        </div>
     );
  }

  return (
    <div className="w-full border-2 border-brand-gray bg-brand-black overflow-x-auto relative">
      <table className="w-full text-left font-mono text-sm whitespace-nowrap">
        <thead className="bg-brand-darkgray sticky top-0 z-10 border-b-2 border-brand-gray">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-4 py-3 font-semibold uppercase tracking-wider text-brand-white">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-gray/50">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-brand-gray/30 transition-colors">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-4 py-3 text-brand-white/90">
                  {col.cell ? col.cell(row) : (row[col.accessorKey] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
