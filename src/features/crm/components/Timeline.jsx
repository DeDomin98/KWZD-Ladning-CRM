import React, { useState, useMemo } from 'react';
import { formatDate, formatDateTime, startOfMonth, endOfMonth, addDays } from "../../../lib/utils";

const Timeline = ({ 
  items = [], 
  dateField = 'date',
  renderItem,
  title = 'Historia',
  emptyMessage = 'Brak wpisów',
  showDateFilter = true
}) => {
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'month'

  // Presety dat
  const presets = [
    { id: 'all', label: 'Wszystko' },
    { id: 'today', label: 'Dziś' },
    { id: 'week', label: '7 dni' },
    { id: 'month', label: '30 dni' },
  ];

  const applyPreset = (presetId) => {
    const now = new Date();
    switch (presetId) {
      case 'today':
        setDateRange({ 
          from: new Date(now.setHours(0,0,0,0)), 
          to: new Date(now.setHours(23,59,59,999)) 
        });
        break;
      case 'week':
        setDateRange({ from: addDays(new Date(), -7), to: new Date() });
        break;
      case 'month':
        setDateRange({ from: addDays(new Date(), -30), to: new Date() });
        break;
      default:
        setDateRange({ from: null, to: null });
    }
    setViewMode(presetId === 'all' ? 'all' : 'filtered');
  };

  // Filtrowanie i grupowanie
  const groupedItems = useMemo(() => {
    let filtered = [...items];

    // Filtr dat
    if (dateRange.from) {
      filtered = filtered.filter(item => {
        const itemDate = item[dateField]?.seconds 
          ? new Date(item[dateField].seconds * 1000) 
          : new Date(item[dateField]);
        return itemDate >= dateRange.from;
      });
    }
    if (dateRange.to) {
      filtered = filtered.filter(item => {
        const itemDate = item[dateField]?.seconds 
          ? new Date(item[dateField].seconds * 1000) 
          : new Date(item[dateField]);
        return itemDate <= dateRange.to;
      });
    }

    // Sortuj od najnowszych
    filtered.sort((a, b) => {
      const dateA = a[dateField]?.seconds ? a[dateField].seconds * 1000 : new Date(a[dateField]).getTime();
      const dateB = b[dateField]?.seconds ? b[dateField].seconds * 1000 : new Date(b[dateField]).getTime();
      return dateB - dateA;
    });

    // Grupuj po miesiącach
    const groups = filtered.reduce((acc, item) => {
      const itemDate = item[dateField]?.seconds 
        ? new Date(item[dateField].seconds * 1000) 
        : new Date(item[dateField]);
      
      const key = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      const label = itemDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

      if (!acc[key]) {
        acc[key] = { key, label, items: [] };
      }
      acc[key].items.push(item);
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [items, dateRange, dateField]);

  const totalItems = groupedItems.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div>
      {/* Filtry dat */}
      {showDateFilter && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                (viewMode === preset.id) || (viewMode === 'all' && preset.id === 'all')
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
          
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateRange.from ? dateRange.from.toISOString().slice(0, 10) : ''}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : null })}
              className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
            />
            <span className="text-stone-400">—</span>
            <input
              type="date"
              value={dateRange.to ? dateRange.to.toISOString().slice(0, 10) : ''}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : null })}
              className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
            />
          </div>
        </div>
      )}

      {/* Licznik */}
      <div className="text-sm text-stone-500 mb-4">
        Wyświetlono: {totalItems} {totalItems === 1 ? 'wpis' : totalItems < 5 ? 'wpisy' : 'wpisów'}
      </div>

      {/* Timeline */}
      {groupedItems.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedItems.map(group => (
            <div key={group.key}>
              {/* Nagłówek miesiąca */}
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-stone-900 capitalize">{group.label}</h3>
                <div className="flex-1 h-px bg-stone-200"></div>
                <span className="text-sm text-stone-400">{group.items.length}</span>
              </div>

              {/* Items */}
              <div className="relative pl-6 md:pl-8 border-l-2 border-stone-200 space-y-6">
                {group.items.map((item, idx) => (
                  <div key={item.id || idx} className="relative">
                    {/* Dot */}
                    <div className="absolute -left-[25px] md:-left-[33px] top-1 w-3 h-3 rounded-full bg-white border-2 border-stone-300"></div>
                    
                    {/* Content */}
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Timeline;