import React from 'react';

interface KpiCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'emerald';
}

interface KpiCardsProps {
  cards: KpiCard[];
}

const colorMap = {
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-600',    value: 'text-blue-700' },
  green:   { bg: 'bg-green-100',   text: 'text-green-600',   value: 'text-green-700' },
  red:     { bg: 'bg-red-100',     text: 'text-red-600',     value: 'text-red-700' },
  purple:  { bg: 'bg-purple-100',  text: 'text-purple-600',  value: 'text-purple-700' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-600',   value: 'text-amber-700' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', value: 'text-emerald-700' },
};

export function KpiCards({ cards }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const colors = colorMap[card.color];
        return (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{card.label}</span>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}
              >
                <span className={colors.text}>{card.icon}</span>
              </div>
            </div>
            <div className={`text-2xl font-bold ${colors.value}`}>
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
