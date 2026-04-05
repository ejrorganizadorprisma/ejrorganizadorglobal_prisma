import React from 'react';
import { formatPriceValue } from '../../hooks/useFormatPrice';

type ColumnFormat = 'text' | 'currency' | 'number' | 'date' | 'percent' | 'badge';

interface ReportColumn {
  key: string;
  label: string;
  format?: ColumnFormat;
  align?: 'left' | 'center' | 'right';
  badgeColors?: Record<string, string>;
}

interface ReportTableProps {
  columns: ReportColumn[];
  data: any[];
  emptyMessage?: string;
}

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function formatCell(value: any, column: ReportColumn): React.ReactNode {
  if (value === null || value === undefined) return '-';

  const format = column.format || 'text';

  switch (format) {
    case 'currency':
      return formatPriceValue(Number(value), 'PYG');

    case 'date':
      return new Date(value).toLocaleDateString('pt-BR');

    case 'percent':
      return Number(value).toFixed(1) + '%';

    case 'number':
      return Number(value).toLocaleString('pt-BR');

    case 'badge': {
      const colorClass = column.badgeColors?.[String(value)] || 'bg-gray-100 text-gray-800';
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
          {String(value)}
        </span>
      );
    }

    case 'text':
    default:
      return String(value);
  }
}

export function ReportTable({ columns, data, emptyMessage }: ReportTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-400">
        {emptyMessage || 'Nenhum dado encontrado.'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold text-gray-600 ${alignClass[col.align || 'left']}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${alignClass[col.align || 'left']}`}
                  >
                    {formatCell(row[col.key], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
