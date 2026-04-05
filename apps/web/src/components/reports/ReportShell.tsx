import React from 'react';
import { FileDown, Calendar } from 'lucide-react';
import { subDays, startOfYear, format } from 'date-fns';

interface ReportTab {
  id: string;
  label: string;
}

interface ReportShellProps {
  title: string;
  icon: React.ReactNode;
  tabs: ReportTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
  onExportPdf?: () => void;
  children: React.ReactNode;
}

const DATE_FORMAT = 'yyyy-MM-dd';

interface Preset {
  label: string;
  days: number | 'year' | 'all';
}

const presets: Preset[] = [
  { label: '7d',   days: 7 },
  { label: '30d',  days: 30 },
  { label: '90d',  days: 90 },
  { label: 'Ano',  days: 'year' },
  { label: 'Todos', days: 'all' },
];

export function ReportShell({
  title,
  icon,
  tabs,
  activeTab,
  onTabChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onExportPdf,
  children,
}: ReportShellProps) {
  const handlePreset = (preset: Preset) => {
    const today = new Date();

    if (preset.days === 'all') {
      onStartDateChange('');
      onEndDateChange('');
      return;
    }

    const end = format(today, DATE_FORMAT);
    onEndDateChange(end);

    if (preset.days === 'year') {
      onStartDateChange(format(startOfYear(today), DATE_FORMAT));
    } else {
      onStartDateChange(format(subDays(today, preset.days), DATE_FORMAT));
    }
  };

  return (
    <div className="container mx-auto px-4 lg:px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-blue-600">{icon}</span>
          <h1 className="text-2xl lg:text-3xl font-bold">{title}</h1>
        </div>
        {onExportPdf && (
          <button
            onClick={onExportPdf}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </button>
        )}
      </div>

      {/* Date filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Calendar className="w-4 h-4 text-gray-400 hidden sm:block" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">ate</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-gray-100 transition-colors text-gray-600"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-6 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
