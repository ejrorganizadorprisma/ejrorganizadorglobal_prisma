import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useBrandsList, useCreateBrand, Brand } from '../hooks/useBrands';

interface BrandAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  // Chamado quando uma marca é selecionada/criada — usado para sugerir a Indústria
  onSelectBrand?: (brand: Brand | null) => void;
  placeholder?: string;
  className?: string;
}

export function BrandAutocomplete({
  value,
  onChange,
  onSelectBrand,
  placeholder = 'Selecione ou cadastre a marca...',
  className = '',
}: BrandAutocompleteProps) {
  const [search, setSearch] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useBrandsList({ limit: 1000, status: 'ACTIVE' });
  const allBrands = useMemo(() => data?.data || [], [data]);
  const createBrand = useCreateBrand();

  const filtered = useMemo(() => {
    if (!isTyping || !search.trim()) return allBrands;
    const term = search.toLowerCase();
    return allBrands.filter((b) => b.name.toLowerCase().includes(term));
  }, [allBrands, search, isTyping]);

  useEffect(() => {
    setSearch(value || '');
    setIsTyping(false);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsTyping(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBrand = (brand: Brand) => {
    setSearch(brand.name);
    onChange(brand.name);
    onSelectBrand?.(brand);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setIsTyping(false);
  };

  const handleCreateBrand = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const match = allBrands.find((b) => b.name.toLowerCase() === trimmed.toLowerCase());
    if (match) {
      handleSelectBrand(match);
      return;
    }
    try {
      const created = await createBrand.mutateAsync({ name: trimmed });
      handleSelectBrand(created);
      toast.success(`Marca "${created.name}" cadastrada`);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao cadastrar marca');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue);
    setShowDropdown(true);
    setIsTyping(true);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') setShowDropdown(true);
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filtered[selectedIndex]) {
          handleSelectBrand(filtered[selectedIndex]);
        } else if (search.trim()) {
          handleCreateBrand(search.trim());
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const isNewValue = search.trim() && !allBrands.some((b) => b.name.toLowerCase() === search.toLowerCase());

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={() => { setShowDropdown(true); setIsTyping(false); }}
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
            <div className="px-4 py-3 text-sm text-gray-500">Carregando...</div>
          ) : filtered.length > 0 ? (
            <>
              {filtered.map((brand, index) => (
                <div
                  key={brand.id}
                  onClick={() => handleSelectBrand(brand)}
                  className={`px-4 py-2 cursor-pointer text-sm flex items-center justify-between ${
                    brand.name === value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : index === selectedIndex
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <span>{brand.name}</span>
                  {brand.manufacturerName && (
                    <span className="text-xs text-gray-400 ml-2">{brand.manufacturerName}</span>
                  )}
                </div>
              ))}
              {isNewValue && (
                <div
                  className="px-4 py-2 text-sm text-emerald-600 border-t border-gray-200 cursor-pointer hover:bg-emerald-50"
                  onClick={() => handleCreateBrand(search.trim())}
                >
                  + Criar "{search.trim()}"
                </div>
              )}
            </>
          ) : isNewValue ? (
            <div
              className="px-4 py-2 text-sm text-emerald-600 cursor-pointer hover:bg-emerald-50"
              onClick={() => handleCreateBrand(search.trim())}
            >
              + Criar "{search.trim()}"
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">Nenhuma marca cadastrada.</div>
          )}
        </div>
      )}
    </div>
  );
}
