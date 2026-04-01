import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useManufacturers } from '../hooks/useSuppliers';

interface ManufacturerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ManufacturerAutocomplete({
  value,
  onChange,
  placeholder = 'Selecione ou digite o fabricante...',
  className = '',
}: ManufacturerAutocompleteProps) {
  const [search, setSearch] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: allManufacturers = [], isLoading } = useManufacturers();

  // Filtrar client-side: mostra todos ao focar, filtra conforme digita
  const filtered = useMemo(() => {
    if (!isTyping || !search.trim()) return allManufacturers;
    const term = search.toLowerCase();
    return allManufacturers.filter((m) => m.toLowerCase().includes(term));
  }, [allManufacturers, search, isTyping]);

  useEffect(() => {
    setSearch(value || '');
    setIsTyping(false);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsTyping(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue);
    setShowDropdown(true);
    setIsTyping(true);
    setSelectedIndex(-1);
  };

  const handleSelectManufacturer = (manufacturer: string) => {
    setSearch(manufacturer);
    onChange(manufacturer);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') {
        setShowDropdown(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filtered[selectedIndex]) {
          handleSelectManufacturer(filtered[selectedIndex]);
        } else if (search.trim()) {
          setShowDropdown(false);
          setIsTyping(false);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    setShowDropdown(true);
    setIsTyping(false);
  };

  const isNewValue = search.trim() && !allManufacturers.some((m) => m.toLowerCase() === search.toLowerCase());

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${className} pr-8`}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setShowDropdown(!showDropdown); setIsTyping(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Carregando...
            </div>
          ) : filtered.length > 0 ? (
            <>
              {filtered.map((manufacturer, index) => (
                <div
                  key={manufacturer}
                  onClick={() => handleSelectManufacturer(manufacturer)}
                  className={`px-4 py-2 cursor-pointer text-sm ${
                    manufacturer === value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : index === selectedIndex
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {manufacturer}
                </div>
              ))}
              {isNewValue && (
                <div className="px-4 py-2 text-sm text-emerald-600 border-t border-gray-200 cursor-pointer hover:bg-emerald-50"
                  onClick={() => handleSelectManufacturer(search.trim())}
                >
                  + Criar "{search.trim()}"
                </div>
              )}
            </>
          ) : isNewValue ? (
            <div className="px-4 py-2 text-sm text-emerald-600 cursor-pointer hover:bg-emerald-50"
              onClick={() => handleSelectManufacturer(search.trim())}
            >
              + Criar "{search.trim()}"
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              Nenhum fabricante cadastrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
