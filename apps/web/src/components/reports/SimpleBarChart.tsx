interface BarChartData {
  label: string;
  value: number;
  value2?: number;
}

interface SimpleBarChartProps {
  data: BarChartData[];
  color?: string;
  color2?: string;
  formatValue?: (v: number) => string;
  height?: number;
  showLegend?: boolean;
  legend1?: string;
  legend2?: string;
}

const tailwindColors: Record<string, { bar: string; hover: string; legend: string }> = {
  blue:   { bar: 'bg-blue-400',   hover: 'hover:bg-blue-500',   legend: 'bg-blue-500' },
  green:  { bar: 'bg-green-400',  hover: 'hover:bg-green-500',  legend: 'bg-green-500' },
  red:    { bar: 'bg-red-400',    hover: 'hover:bg-red-500',    legend: 'bg-red-500' },
  purple: { bar: 'bg-purple-400', hover: 'hover:bg-purple-500', legend: 'bg-purple-500' },
  amber:  { bar: 'bg-amber-400',  hover: 'hover:bg-amber-500',  legend: 'bg-amber-500' },
  emerald:{ bar: 'bg-emerald-400',hover: 'hover:bg-emerald-500',legend: 'bg-emerald-500' },
};

const defaultFormat = (v: number) => v.toLocaleString('pt-BR');

export function SimpleBarChart({
  data,
  color = 'blue',
  color2 = 'red',
  formatValue = defaultFormat,
  height = 200,
  showLegend = false,
  legend1,
  legend2,
}: SimpleBarChartProps) {
  const hasSecondBar = data.some((d) => d.value2 !== undefined && d.value2 !== null);
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.value, d.value2 ?? 0)),
    1
  );

  const c1 = tailwindColors[color] || tailwindColors.blue;
  const c2 = tailwindColors[color2] || tailwindColors.red;

  return (
    <div>
      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 ${c1.legend} rounded`} />
            <span>{legend1 || 'Valor 1'}</span>
          </div>
          {hasSecondBar && (
            <div className="flex items-center gap-1">
              <div className={`w-3 h-3 ${c2.legend} rounded`} />
              <span>{legend2 || 'Valor 2'}</span>
            </div>
          )}
        </div>
      )}

      {/* Chart area */}
      <div
        className="flex items-end gap-px overflow-x-auto pb-8 relative"
        style={{ height: `${height}px` }}
      >
        {data.map((item, i) => {
          const h1 = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const h2 = hasSecondBar && item.value2 !== undefined
            ? (item.value2 / maxValue) * 100
            : 0;

          return (
            <div
              key={i}
              className="flex-1 min-w-[16px] flex flex-col items-center group relative"
              style={{ height: '100%' }}
            >
              {/* Bars container */}
              <div className="w-full flex items-end justify-center gap-px h-full">
                <div
                  className={`${c1.bar} ${c1.hover} rounded-t transition-colors`}
                  style={{
                    height: `${Math.max(h1, 1)}%`,
                    width: hasSecondBar ? '45%' : '70%',
                  }}
                />
                {hasSecondBar && (
                  <div
                    className={`${c2.bar} ${c2.hover} rounded-t transition-colors`}
                    style={{
                      height: `${Math.max(h2, 1)}%`,
                      width: '45%',
                    }}
                  />
                )}
              </div>

              {/* X-axis label */}
              <div
                className="absolute -bottom-1 text-[10px] text-gray-500 whitespace-nowrap origin-top-left"
                style={{ transform: 'rotate(-45deg)', transformOrigin: 'top center' }}
              >
                {item.label}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                <div className="font-medium">{item.label}</div>
                <div>{legend1 || 'Valor'}: {formatValue(item.value)}</div>
                {hasSecondBar && item.value2 !== undefined && (
                  <div>{legend2 || 'Valor 2'}: {formatValue(item.value2)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
