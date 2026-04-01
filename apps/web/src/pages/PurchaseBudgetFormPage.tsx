import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  usePurchaseBudget,
  useCreatePurchaseBudget,
  useUpdatePurchaseBudget,
  useAddBudgetItem,
  useDeleteBudgetItem,
  useAddQuote,
  useDeleteQuote,
  useSelectQuote,
  useSubmitBudget,
} from '../hooks/usePurchaseBudgets';
import { useProducts, useProductManufacturers } from '../hooks/useProducts';
import { useSuppliers } from '../hooks/useSuppliers';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { generatePurchaseBudgetPdf, generatePurchaseBudgetFullPdf } from '../services/purchaseBudgetPdf';
import { api } from '../lib/api';
import { formatPriceValue } from '../hooks/useFormatPrice';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { toast } from 'sonner';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Check, Send, Save,
  ArrowLeft, Package, Search, DollarSign, ShoppingCart, Globe, X, Filter, AlertTriangle, FileText, Printer,
} from 'lucide-react';
import type { PurchaseBudgetItem, Currency } from '@ejr/shared-types';
import { DemandAnalysisPanel } from '../components/DemandAnalysisPanel';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa', color: 'bg-gray-100 text-gray-700' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'HIGH', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'URGENT', label: 'Urgente', color: 'bg-red-100 text-red-700' },
];

export function PurchaseBudgetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  // Product search state
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSelectedIndex, setProductSelectedIndex] = useState(-1);
  const [analysisProductId, setAnalysisProductId] = useState<string | undefined>();
  const [productConfirmed, setProductConfirmed] = useState(false); // produto confirmado (selecionado do dropdown ou Enter)
  const productSearchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [manufacturerFilter, setManufacturerFilter] = useState('');

  const { data: budget, isLoading: loadingBudget } = usePurchaseBudget(id);
  const { data: manufacturersList } = useProductManufacturers();
  const { data: productsData, isLoading: loadingProducts } = useProducts({
    page: 1,
    limit: 20,
    search: debouncedSearch || undefined,
    manufacturer: manufacturerFilter || undefined,
    sortBy: 'stock_urgency',
  });
  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const { data: documentSettings } = useDefaultDocumentSettings();
  const { data: systemSettings } = useSystemSettings();

  const createBudget = useCreatePurchaseBudget();
  const updateBudget = useUpdatePurchaseBudget();
  const addItem = useAddBudgetItem();
  const deleteItem = useDeleteBudgetItem();
  const addQuote = useAddQuote();
  const deleteQuote = useDeleteQuote();
  const selectQuote = useSelectQuote();
  const submitBudget = useSubmitBudget();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [department, setDepartment] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showGeneralData, setShowGeneralData] = useState(!isEditing);

  // Custos Adicionais
  const [additionalCosts, setAdditionalCosts] = useState<Array<{ id: string; name: string; percentage: number }>>([]);
  const [showAdditionalCosts, setShowAdditionalCosts] = useState(false);
  const [newCostName, setNewCostName] = useState('');
  const [newCostPercentage, setNewCostPercentage] = useState('');

  // Sugestões editáveis de custos adicionais (persistidas no localStorage)
  const DEFAULT_COST_SUGGESTIONS = ['Frete', 'Seguro', 'Impostos', 'Cambio', 'Comissao'];
  const [costSuggestions, setCostSuggestions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ejr_cost_suggestions');
      return saved ? JSON.parse(saved) : DEFAULT_COST_SUGGESTIONS;
    } catch { return DEFAULT_COST_SUGGESTIONS; }
  });
  const [newSuggestion, setNewSuggestion] = useState('');
  const [editingSuggestions, setEditingSuggestions] = useState(false);

  const saveSuggestions = (list: string[]) => {
    setCostSuggestions(list);
    localStorage.setItem('ejr_cost_suggestions', JSON.stringify(list));
  };

  // New item form
  const [newItemProductId, setNewItemProductId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');

  // Preço inline direto na linha do item (fluxo rápido)
  const [inlinePrice, setInlinePrice] = useState<Record<string, string>>({});
  const [savingInline, setSavingInline] = useState<Record<string, boolean>>({});

  // New quote form per item (painel expandido — fluxo avançado multi-cotação)
  const [quoteForm, setQuoteForm] = useState<Record<string, {
    supplierId: string;
    unitPrice: string;
    leadTimeDays: string;
    paymentTerms: string;
    notes: string;
  }>>({});

  // Câmbio — taxas do PRÓPRIO orçamento (editáveis pelo usuário)
  // Internamente: rate1 = 1 BRL = X PYG (ex: 1210), rate2 = 1 USD = X PYG (ex: 6800)
  // UI: quando moeda=PYG, mostra "₲1.000 = R$ ___" (formato intuitivo paraguaio)
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'PYG'>('BRL');
  const [rate1, setRate1] = useState(0); // interno: 1 BRL = X PYG
  const [rate2, setRate2] = useState(0); // interno: 1 USD = X PYG
  const [rate1Input, setRate1Input] = useState(''); // string para input livre
  const [rate2Input, setRate2Input] = useState('');
  const [rate3, setRate3] = useState(0); // interno: 1 USD = X BRL
  const [rate3Input, setRate3Input] = useState('');
  const [showRatesPanel, setShowRatesPanel] = useState(true);

  const symbolOf: Record<string, string> = { BRL: 'R$', USD: 'US$', PYG: '₲' };
  const othersMap: Record<string, ['BRL' | 'USD' | 'PYG', 'BRL' | 'USD' | 'PYG']> = {
    BRL: ['USD', 'PYG'],
    USD: ['BRL', 'PYG'],
    PYG: ['BRL', 'USD'],
  };
  const [other1, other2] = othersMap[currency];
  const hasRates = rate1 > 0 && rate2 > 0 && rate3 > 0;
  const currencySymbol = symbolOf[currency];
  const isPygMode = currency === 'PYG';

  // Taxas DIRETAS entre cada par de moedas (uma única multiplicação, sem intermediários)
  // rate1 = 1 BRL = X PYG, rate2 = 1 USD = X PYG
  const directRates = useMemo(() => {
    if (rate1 <= 0 || rate2 <= 0 || rate3 <= 0) return null;
    return {
      BRL_PYG: rate1,            // 1 BRL = 1210 PYG
      PYG_BRL: 1 / rate1,        // 1 PYG = 0.000826 BRL
      USD_PYG: rate2,            // 1 USD = 6800 PYG
      PYG_USD: 1 / rate2,        // 1 PYG = 0.000147 USD
      USD_BRL: rate3,            // 1 USD = 5.62 BRL (direto!)
      BRL_USD: 1 / rate3,        // 1 BRL = 0.178 USD (direto!)
    };
  }, [rate1, rate2, rate3]);

  // Conversão direta: amount na moeda "from" → amount na moeda "to"
  const convertDirect = (amount: number, from: string, to: string): number => {
    if (from === to || !directRates) return amount;
    const key = `${from}_${to}` as keyof typeof directRates;
    return amount * directRates[key];
  };

  const handleRate1Change = (val: string) => {
    setRate1Input(val);
    const n = parseFloat(val.replace(',', '.')) || 0;
    if (isPygMode) {
      setRate1(n > 0 ? Math.round((1000 / n) * 100) / 100 : 0);
    } else {
      setRate1(n);
    }
  };
  const handleRate2Change = (val: string) => {
    setRate2Input(val);
    const n = parseFloat(val.replace(',', '.')) || 0;
    if (isPygMode) {
      setRate2(n > 0 ? Math.round((1000 / n) * 100) / 100 : 0);
    } else {
      setRate2(n);
    }
  };
  const handleRate3Change = (val: string) => {
    setRate3Input(val);
    const n = parseFloat(val.replace(',', '.')) || 0;
    setRate3(n);
  };

  // Setar taxas internas E sincronizar o display input
  const setRatesFromInternal = (r1: number, r2: number, r3: number) => {
    setRate1(r1);
    setRate2(r2);
    setRate3(r3);
    if (isPygMode) {
      setRate1Input(r1 > 0 ? (1000 / r1).toFixed(2) : '');
      setRate2Input(r2 > 0 ? (1000 / r2).toFixed(4) : '');
    } else {
      setRate1Input(r1 ? String(r1) : '');
      setRate2Input(r2 ? String(r2) : '');
    }
    setRate3Input(r3 ? String(r3) : '');
  };

  // Aplicar taxas sugeridas do sistema (botão manual)
  const applySystemRates = () => {
    if (systemSettings) {
      const r1 = systemSettings.exchangeRateBrlToPyg || 0;
      const r2 = systemSettings.exchangeRateUsdToPyg || 0;
      const r3 = r1 > 0 && r2 > 0 ? Math.round((r2 / r1) * 10000) / 10000 : 0;
      setRatesFromInternal(r1, r2, r3);
      toast.success('Taxas do sistema aplicadas. Edite se necessário.');
    }
  };

  const handleCurrencyChange = (c: 'BRL' | 'USD' | 'PYG') => {
    setCurrency(c);
    // Reconverter os inputs para o novo formato da moeda
    const newIsPyg = c === 'PYG';
    if (newIsPyg) {
      setRate1Input(rate1 > 0 ? (1000 / rate1).toFixed(2) : '');
      setRate2Input(rate2 > 0 ? (1000 / rate2).toFixed(4) : '');
    } else {
      setRate1Input(rate1 ? String(rate1) : '');
      setRate2Input(rate2 ? String(rate2) : '');
    }
    // rate3Input não muda com currency mode — é sempre "1 USD = X BRL"
    setRate3Input(rate3 ? String(rate3) : '');
    // Limpar preços não-salvos nas cotações para evitar interpretar valor na moeda errada
    setQuoteForm((prev) => {
      const cleaned: typeof prev = {};
      for (const key in prev) {
        cleaned[key] = { ...prev[key], unitPrice: '' };
      }
      return cleaned;
    });
  };

  // Formatters usando formatPriceValue centralizado
  const fmtBRL = (cents: number) => formatPriceValue(cents, 'BRL');
  const fmtUSD = (cents: number) => formatPriceValue(cents, 'USD');
  const fmtPYG = (value: number) => formatPriceValue(value, 'PYG');
  const fmtAmount = (amount: number, cur: string) => {
    if (cur === 'PYG') return fmtPYG(Math.round(amount));
    if (cur === 'USD') return fmtUSD(Math.round(amount * 100));
    return fmtBRL(Math.round(amount * 100));
  };

  // Converter BRL centavos → valor em qualquer moeda (conversão DIRETA, 1 multiplicação)
  const brlCentsToAmount = (centsBRL: number, target: string): number => {
    const brl = centsBRL / 100;
    return convertDirect(brl, 'BRL', target);
  };

  // Converte BRL centavos para a moeda principal de exibição (arredondado)
  const toPrimaryAmount = (centsBRL: number): number => {
    const amount = brlCentsToAmount(centsBRL, currency);
    if (currency === 'PYG') return Math.round(amount);
    return Math.round(amount * 100) / 100;
  };

  // Preço principal na moeda de referência
  const displayPrice = (centsBRL: number) => {
    if (!hasRates) return fmtBRL(centsBRL);
    return fmtAmount(toPrimaryAmount(centsBRL), currency);
  };

  // Conversão DIRETA: parte do valor na moeda principal, converte para cada moeda secundária.
  // Nunca passa por BRL intermediário — usa taxas diretas entre pares de moedas.
  const secondaryFromPrimary = (primaryAmount: number): string | null => {
    if (!hasRates) return null;
    const toSecondary = (cur: string) => convertDirect(primaryAmount, currency, cur);
    return `${fmtAmount(toSecondary(other1), other1)} · ${fmtAmount(toSecondary(other2), other2)}`;
  };

  // As 2 moedas secundárias (para preço unitário)
  const secondaryPrices = (centsBRL: number): string | null => {
    return secondaryFromPrimary(toPrimaryAmount(centsBRL));
  };

  // Subtotal com arredondamento correto: arredonda o preço unitário na moeda principal,
  // depois multiplica pela quantidade. Evita erros de ponto flutuante.
  const primaryItemSubtotal = (unitPriceCents: number, quantity: number): number => {
    const unitInPrimary = toPrimaryAmount(unitPriceCents);
    return unitInPrimary * quantity;
  };

  const displayItemSubtotal = (unitPriceCents: number, quantity: number) => {
    if (!hasRates) return fmtBRL(unitPriceCents * quantity);
    return fmtAmount(primaryItemSubtotal(unitPriceCents, quantity), currency);
  };

  const secondaryItemSubtotals = (unitPriceCents: number, quantity: number): string | null => {
    return secondaryFromPrimary(primaryItemSubtotal(unitPriceCents, quantity));
  };

  // Calcula custos adicionais diretamente na moeda de exibição (sem passar por BRL)
  // Sempre inclui o valor em Guaraní, mesmo quando a moeda principal é BRL ou USD
  const calcPygWithCosts = (unitPriceCents: number): number => {
    const brl = unitPriceCents / 100;
    const pyg = hasRates ? brl * (directRates?.BRL_PYG || 0) : 0;
    return Math.round(pyg * (1 + totalAdditionalPercentage / 100));
  };

  const displayUnitWithCosts = (unitPriceCents: number): string => {
    const pygValue = calcPygWithCosts(unitPriceCents);
    if (currency === 'PYG') return fmtPYG(pygValue);
    // Moeda principal + Guaraní
    const unitInPrimary = toPrimaryAmount(unitPriceCents);
    const withCosts = unitInPrimary * (1 + totalAdditionalPercentage / 100);
    return `${fmtAmount(withCosts, currency)} · ${fmtPYG(pygValue)}`;
  };

  const displaySubtotalWithCosts = (unitPriceCents: number, quantity: number): string => {
    const pygUnit = calcPygWithCosts(unitPriceCents);
    const pygTotal = pygUnit * quantity;
    if (currency === 'PYG') return fmtPYG(pygTotal);
    // Moeda principal + Guaraní
    const unitInPrimary = toPrimaryAmount(unitPriceCents);
    const unitWithCosts = unitInPrimary * (1 + totalAdditionalPercentage / 100);
    const rounded = Math.round(unitWithCosts * 100) * quantity / 100;
    return `${fmtAmount(rounded, currency)} · ${fmtPYG(pygTotal)}`;
  };

  // Input na moeda de referência → centavos BRL para storage (conversão DIRETA)
  // Para BRL: arredonda a inteiro (centavos exatos).
  // Para PYG/USD: armazena com precisão decimal (coluna numeric(15,4))
  // para evitar perda na conversão ida-e-volta.
  const inputToBrlCents = (val: string): number => {
    const n = parseFloat(val) || 0;
    if (currency === 'BRL') return Math.round(n * 100);
    if (!directRates) return 0;
    const brl = convertDirect(n, currency, 'BRL');
    // Armazena centavos com 4 casas decimais (numeric(15,4) no banco)
    // Ex: PYG 15000 / 1210 = 12.3967 BRL → 1239.6694 centavos (não arredonda a inteiro)
    return Math.round(brl * 1000000) / 10000;
  };

  // Centavos BRL → valor para exibir no input (na moeda de referência)
  const brlCentsToInputVal = (centsBRL: number) => {
    const amount = brlCentsToAmount(centsBRL, currency);
    if (currency === 'PYG') return Math.round(amount).toString();
    return amount.toFixed(2);
  };

  const products = productsData?.data || [];
  const suppliers = suppliersData?.data || [];
  const filteredProducts = products;

  useEffect(() => {
    if (budget) {
      setTitle(budget.title);
      setDescription(budget.description || '');
      setJustification(budget.justification || '');
      setPriority(budget.priority);
      setDepartment(budget.department || '');
      setSupplierId(budget.supplierId || '');
      setSelectedManufacturers(budget.manufacturers || []);
      if (budget.manufacturers?.length) setManufacturerFilter(budget.manufacturers[0]);
      setPaymentTerms(budget.paymentTerms || '');
      setLeadTimeDays(budget.leadTimeDays ? String(budget.leadTimeDays) : '');
      const budgetCurrency = (budget.currency || 'BRL') as 'BRL' | 'USD' | 'PYG';
      setCurrency(budgetCurrency);
      // Carregar taxas salvas no próprio orçamento
      const r1 = budget.exchangeRate1 ?? 0;
      const r2 = budget.exchangeRate2 ?? 0;
      setRate1(r1);
      setRate2(r2);
      // Sincronizar inputs conforme formato da moeda
      if (budgetCurrency === 'PYG') {
        setRate1Input(r1 > 0 ? (1000 / r1).toFixed(2) : '');
        setRate2Input(r2 > 0 ? (1000 / r2).toFixed(4) : '');
      } else {
        setRate1Input(r1 ? String(r1) : '');
        setRate2Input(r2 ? String(r2) : '');
      }
      const r3 = budget.exchangeRate3 ?? 0;
      setRate3(r3);
      setRate3Input(r3 ? String(r3) : '');
      setShowRatesPanel(!(r1 > 0 && r2 > 0 && r3 > 0));
      setAdditionalCosts(budget.additionalCosts || []);
    }
  }, [budget]);

  // Close product dropdown on outside click + cleanup debounce
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const items: PurchaseBudgetItem[] = budget?.items || [];

  const totalAdditionalPercentage = useMemo(() => {
    return additionalCosts.reduce((sum, cost) => sum + cost.percentage, 0);
  }, [additionalCosts]);

  const getUnitPriceWithCosts = (unitPriceCents: number): number => {
    return Math.round(unitPriceCents * (1 + totalAdditionalPercentage / 100));
  };

  // Calculate totals from items with selected quotes
  // Calcula em BRL cents (para storage) e também na moeda de exibição (com arredondamento correto por item)
  const totals = useMemo(() => {
    let itemCount = items.length;
    let subtotal = 0;
    let displaySubtotal = 0;
    let pygSubtotal = 0;
    let quotedItems = 0;

    const roundUnitForDisplay = (unitPriceCents: number, cur: string): number => {
      if (!directRates || cur === 'BRL') return unitPriceCents / 100;
      const brl = unitPriceCents / 100;
      const key = `BRL_${cur}` as keyof typeof directRates;
      const unitAmount = brl * directRates[key];
      if (cur === 'PYG') return Math.round(unitAmount);
      return Math.round(unitAmount * 100) / 100;
    };

    items.forEach((item) => {
      if (item.selectedQuoteId && item.quotes) {
        const selectedQuote = item.quotes.find((q) => q.id === item.selectedQuoteId);
        if (selectedQuote) {
          subtotal += Math.round(selectedQuote.unitPrice * item.quantity);
          displaySubtotal += roundUnitForDisplay(selectedQuote.unitPrice, currency) * item.quantity;
          // Sempre calcular subtotal em PYG (para exibir no rodapé quando moeda é BRL/USD)
          const pygUnit = directRates
            ? Math.round((selectedQuote.unitPrice / 100) * (directRates.BRL_PYG || 0))
            : 0;
          pygSubtotal += pygUnit * item.quantity;
          quotedItems++;
        }
      }
    });

    const totalWithCosts = Math.round(subtotal * (1 + totalAdditionalPercentage / 100));
    const displayTotalWithCosts = currency === 'PYG'
      ? Math.round(displaySubtotal * (1 + totalAdditionalPercentage / 100))
      : displaySubtotal * (1 + totalAdditionalPercentage / 100);
    const pygTotalWithCosts = Math.round(pygSubtotal * (1 + totalAdditionalPercentage / 100));
    return { itemCount, subtotal, totalWithCosts, quotedItems, displaySubtotal, displayTotalWithCosts, pygSubtotal, pygTotalWithCosts };
  }, [items, totalAdditionalPercentage, directRates, currency]);

  // --- Handlers ---

  const handleProductSelect = (product: any) => {
    setNewItemProductId(product.id);
    setNewItemName(product.name);
    setProductSearch(product.name);
    // Não atualizar debouncedSearch — não precisa buscar de novo após selecionar
    setShowProductDropdown(false);
    setProductSelectedIndex(-1);
    setProductConfirmed(true);
    setAnalysisProductId(product.id);
  };

  const handleSuggestedQuantity = useCallback((qty: number) => {
    if (qty > 0) setNewItemQty(String(qty));
  }, []);

  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProductDropdown) {
      if (e.key === 'ArrowDown') setShowProductDropdown(true);
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setProductSelectedIndex((prev) => prev < filteredProducts.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setProductSelectedIndex((prev) => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (productSelectedIndex >= 0 && filteredProducts[productSelectedIndex]) {
          handleProductSelect(filteredProducts[productSelectedIndex]);
        } else if (productSearch.trim()) {
          setNewItemProductId('');
          setNewItemName(productSearch.trim());
          setShowProductDropdown(false);
          setProductConfirmed(true);
        }
        break;
      case 'Escape':
        setShowProductDropdown(false);
        setProductSelectedIndex(-1);
        break;
    }
  };

  const handleAddCost = () => {
    const name = newCostName.trim();
    const percentage = parseFloat(newCostPercentage);
    if (!name) { toast.error('Informe o nome do custo.'); return; }
    if (isNaN(percentage) || percentage <= 0) { toast.error('Informe um percentual válido.'); return; }
    const costId = `cost-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setAdditionalCosts(prev => [...prev, { id: costId, name, percentage }]);
    setNewCostName('');
    setNewCostPercentage('');
  };

  const handleRemoveCost = (costId: string) => {
    setAdditionalCosts(prev => prev.filter(c => c.id !== costId));
  };

  const handleGeneratePdf = () => {
    if (!budget) return;
    const pdfSettings = documentSettings ? {
      companyLogo: documentSettings.companyLogo || undefined,
      companyName: documentSettings.companyName || undefined,
      footerText: documentSettings.footerText || undefined,
      footerAddress: documentSettings.footerAddress || undefined,
      footerPhone: documentSettings.footerPhone || undefined,
      footerEmail: documentSettings.footerEmail || undefined,
      footerWebsite: documentSettings.footerWebsite || undefined,
      primaryColor: documentSettings.primaryColor || undefined,
      secondaryColor: documentSettings.secondaryColor || undefined,
    } : undefined;
    generatePurchaseBudgetPdf(budget, pdfSettings, false, currency as Currency);
  };

  const handleGenerateFullPdf = () => {
    if (!budget) return;
    const pdfSettings = documentSettings ? {
      companyLogo: documentSettings.companyLogo || undefined,
      companyName: documentSettings.companyName || undefined,
      footerText: documentSettings.footerText || undefined,
      footerAddress: documentSettings.footerAddress || undefined,
      footerPhone: documentSettings.footerPhone || undefined,
      footerEmail: documentSettings.footerEmail || undefined,
      footerWebsite: documentSettings.footerWebsite || undefined,
      primaryColor: documentSettings.primaryColor || undefined,
      secondaryColor: documentSettings.secondaryColor || undefined,
    } : undefined;
    generatePurchaseBudgetFullPdf(budget, pdfSettings, false, currency as Currency);
  };

  const handleGeneratePdfPrint = () => {
    if (!budget) return;
    const pdfSettings = documentSettings ? {
      companyLogo: documentSettings.companyLogo || undefined,
      companyName: documentSettings.companyName || undefined,
      footerText: documentSettings.footerText || undefined,
      footerAddress: documentSettings.footerAddress || undefined,
      footerPhone: documentSettings.footerPhone || undefined,
      footerEmail: documentSettings.footerEmail || undefined,
      footerWebsite: documentSettings.footerWebsite || undefined,
      primaryColor: documentSettings.primaryColor || undefined,
      secondaryColor: documentSettings.secondaryColor || undefined,
    } : undefined;
    generatePurchaseBudgetPdf(budget, pdfSettings, true, currency as Currency);
  };

  const handleGenerateFullPdfPrint = () => {
    if (!budget) return;
    const pdfSettings = documentSettings ? {
      companyLogo: documentSettings.companyLogo || undefined,
      companyName: documentSettings.companyName || undefined,
      footerText: documentSettings.footerText || undefined,
      footerAddress: documentSettings.footerAddress || undefined,
      footerPhone: documentSettings.footerPhone || undefined,
      footerEmail: documentSettings.footerEmail || undefined,
      footerWebsite: documentSettings.footerWebsite || undefined,
      primaryColor: documentSettings.primaryColor || undefined,
      secondaryColor: documentSettings.secondaryColor || undefined,
    } : undefined;
    generatePurchaseBudgetFullPdf(budget, pdfSettings, true, currency as Currency);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Informe o título do orçamento de compra.');
      return;
    }
    try {
      if (isEditing) {
        await updateBudget.mutateAsync({
          id: id!,
          data: { title, description, justification, priority: priority as any, department, supplierId: supplierId || undefined, manufacturers: selectedManufacturers, paymentTerms: paymentTerms || undefined, leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : undefined, currency, exchangeRate1: rate1, exchangeRate2: rate2, exchangeRate3: rate3, additionalCosts },
        });
        toast.success('Salvo!');
      } else {
        const created = await createBudget.mutateAsync({
          title, description, justification, priority: priority as any, department, supplierId: supplierId || undefined, manufacturers: selectedManufacturers, paymentTerms: paymentTerms || undefined, leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : undefined, currency, exchangeRate1: rate1, exchangeRate2: rate2, exchangeRate3: rate3, additionalCosts,
        });
        toast.success('Orçamento de compra criado!');
        navigate(`/purchase-budgets/${created.id}/edit`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar.');
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    if (!window.confirm('Enviar para aprovação? Não será possível editar após o envio.')) return;
    try {
      await submitBudget.mutateAsync(id);
      toast.success('Enviado para aprovação!');
      navigate(`/purchase-budgets/${id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao enviar.');
    }
  };

  const handleAddItem = async () => {
    if (!id) return;
    const name = newItemName || products.find((p: any) => p.id === newItemProductId)?.name;
    if (!name) {
      toast.error('Busque e selecione um produto.');
      return;
    }
    try {
      await addItem.mutateAsync({
        budgetId: id,
        data: {
          productId: newItemProductId || undefined,
          productName: name,
          quantity: parseInt(newItemQty) || 1,
        },
      });
      setNewItemProductId('');
      setNewItemName('');
      setNewItemQty('1');
      setProductSearch('');
      setDebouncedSearch('');
      setProductConfirmed(false);
      setAnalysisProductId(undefined);
      searchInputRef.current?.focus();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao adicionar.');
    }
  };

  // Fluxo rápido: digita preço na linha → Enter → cria cotação + auto-seleciona
  const handleInlineQuote = async (itemId: string) => {
    const price = inlinePrice[itemId];
    if (!price || parseFloat(price) <= 0) return;
    if (!supplierId) {
      toast.error('Selecione um fornecedor no topo para inserir preços.');
      return;
    }
    setSavingInline((prev) => ({ ...prev, [itemId]: true }));
    try {
      const newQuote = await addQuote.mutateAsync({
        itemId,
        data: {
          supplierId,
          unitPrice: inputToBrlCents(price),
        },
      });
      await selectQuote.mutateAsync({ itemId, quoteId: newQuote.id });
      setInlinePrice((prev) => ({ ...prev, [itemId]: '' }));
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar preço.');
    } finally {
      setSavingInline((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Remover este item?')) return;
    try {
      await deleteItem.mutateAsync(itemId);
    } catch {
      toast.error('Erro ao remover item.');
    }
  };

  const handleAddQuote = async (itemId: string) => {
    const form = quoteForm[itemId];
    if (!form?.supplierId || !form?.unitPrice) {
      toast.error('Informe fornecedor e preço.');
      return;
    }
    try {
      await addQuote.mutateAsync({
        itemId,
        data: {
          supplierId: form.supplierId,
          unitPrice: inputToBrlCents(form.unitPrice),
          leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : undefined,
          paymentTerms: form.paymentTerms || undefined,
          notes: form.notes || undefined,
        },
      });
      setQuoteForm((prev) => ({
        ...prev,
        [itemId]: { supplierId: supplierId || '', unitPrice: '', leadTimeDays: '', paymentTerms: '', notes: '' },
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao adicionar cotação.');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      await deleteQuote.mutateAsync(quoteId);
    } catch {
      toast.error('Erro ao remover cotação.');
    }
  };

  const handleSelectQuote = async (itemId: string, quoteId: string) => {
    try {
      await selectQuote.mutateAsync({ itemId, quoteId });
    } catch {
      toast.error('Erro ao selecionar cotação.');
    }
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Busca último preço do produto com o fornecedor e preenche no form
  const fetchLastPrice = async (itemId: string, productId: string | undefined, supplierIdVal: string) => {
    if (!productId || !supplierIdVal) return;
    try {
      const { data: resp } = await api.get('/purchase-budgets/last-price', {
        params: { productId, supplierId: supplierIdVal },
      });
      if (resp.data?.unitPrice) {
        const displayVal = brlCentsToInputVal(resp.data.unitPrice);
        setQuoteForm((prev) => {
          // Só preenche se o campo ainda estiver vazio
          if (prev[itemId] && !prev[itemId].unitPrice) {
            return { ...prev, [itemId]: { ...prev[itemId], unitPrice: displayVal } };
          }
          return prev;
        });
      }
    } catch {
      // silently ignore
    }
  };

  const initQuoteForm = (itemId: string) => {
    if (!quoteForm[itemId]) {
      const selectedSupplier = supplierId || '';
      setQuoteForm((prev) => ({
        ...prev,
        [itemId]: { supplierId: selectedSupplier, unitPrice: '', leadTimeDays: '', paymentTerms: '', notes: '' },
      }));
      // Buscar último preço se temos produto e fornecedor
      const item = items.find((i) => i.id === itemId);
      if (item?.productId && selectedSupplier) {
        fetchLastPrice(itemId, item.productId, selectedSupplier);
      }
    }
  };

  // --- Loading ---
  if (isEditing && loadingBudget) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const selectedPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchase-budgets')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              {isEditing ? budget?.budgetNumber || 'Editar' : 'Novo Orçamento de Compra'}
            </h1>
            {isEditing && budget?.title && (
              <p className="text-sm text-gray-500">{budget.title}</p>
            )}
          </div>
          {isEditing && (
            <span className="ml-2 px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 uppercase">
              {budget?.status || 'DRAFT'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={createBudget.isPending || updateBudget.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {isEditing ? 'Salvar' : 'Criar'}
          </button>
          {isEditing && items.length > 0 && (
            <>
              <button
                onClick={handleGeneratePdf}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-l-lg hover:bg-blue-700 text-sm font-medium"
              >
                <FileText className="w-4 h-4" />
                PDF Cotacao
              </button>
              <button
                onClick={handleGeneratePdfPrint}
                className="flex items-center gap-1 px-2 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 text-sm border-l border-blue-700"
                title="Versao para impressao"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={handleGenerateFullPdf}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-l-lg hover:bg-gray-700 text-sm font-medium"
              >
                <FileText className="w-4 h-4" />
                PDF Completo
              </button>
              <button
                onClick={handleGenerateFullPdfPrint}
                className="flex items-center gap-1 px-2 py-2 bg-gray-500 text-white rounded-r-lg hover:bg-gray-600 text-sm border-l border-gray-700"
                title="Versao para impressao"
              >
                <Printer className="w-4 h-4" />
              </button>
            </>
          )}
          {isEditing && items.length > 0 && budget?.status === 'DRAFT' && (
            <button
              onClick={handleSubmit}
              disabled={submitBudget.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              Enviar p/ Aprovação
            </button>
          )}
        </div>
      </div>

      {/* ===== DADOS GERAIS - Compacto ===== */}
      <div className="bg-white rounded-lg shadow-sm border mb-4">
        <button
          onClick={() => setShowGeneralData(!showGeneralData)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">Dados Gerais</span>
            {title && !showGeneralData && (
              <span className="text-sm text-gray-500">— {title}</span>
            )}
            {selectedPriority && !showGeneralData && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${selectedPriority.color}`}>
                {selectedPriority.label}
              </span>
            )}
          </div>
          {showGeneralData ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showGeneralData && (
          <div className="px-4 pb-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Título *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Compra de componentes eletrônicos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
                <div className="flex gap-1">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPriority(opt.value)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                        priority === opt.value
                          ? opt.color + ' border-current ring-1 ring-current'
                          : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Departamento</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fornecedor</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Selecione após comparar cotações...</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fabricante(s)</label>
                <div className="relative">
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !selectedManufacturers.includes(val)) {
                        const updated = [...selectedManufacturers, val];
                        setSelectedManufacturers(updated);
                        if (updated.length === 1) setManufacturerFilter(val);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Adicionar fabricante...</option>
                    {(manufacturersList || []).filter((m: string) => !selectedManufacturers.includes(m)).map((m: string) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {selectedManufacturers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedManufacturers.map((m) => (
                      <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {m}
                        <button
                          onClick={() => {
                            const updated = selectedManufacturers.filter((x) => x !== m);
                            setSelectedManufacturers(updated);
                            if (manufacturerFilter === m) setManufacturerFilter(updated[0] || '');
                          }}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cond. Pagamento</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Ex: 30/60/90 dias"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prazo Entrega (dias)</label>
                <input
                  type="number"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  placeholder="Ex: 15"
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Justificativa</label>
                <input
                  type="text"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Motivo da compra..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== CÂMBIO DO ORÇAMENTO ===== */}
      <div className="bg-white rounded-lg shadow-sm border mb-4">
        <button
          onClick={() => setShowRatesPanel(!showRatesPanel)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-gray-900">Câmbio do Orçamento</span>
            {!showRatesPanel && (
              <>
                <span className={`text-xs px-2 py-0.5 rounded-full ${hasRates ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'}`}>
                  {currencySymbol}
                </span>
                {hasRates ? (
                  <span className="text-xs text-gray-400">
                    {isPygMode
                      ? `₲ 1.000 = R$ ${(1000 / rate1).toFixed(2)} · ₲ 1.000 = US$ ${(1000 / rate2).toFixed(4)} · 1 US$ = R$ ${rate3}`
                      : `1 BRL = ${rate1} PYG · 1 USD = ${rate2} PYG · 1 USD = ${rate3} BRL`}
                  </span>
                ) : (
                  <span className="text-xs text-orange-500">Informe as taxas de câmbio</span>
                )}
              </>
            )}
          </div>
          {showRatesPanel ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showRatesPanel && (
          <div className="px-4 pb-4 border-t">
            {/* Moeda de referência */}
            <div className="mt-4 mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Moeda de referência</label>
              <div className="flex gap-1">
                {(['BRL', 'USD', 'PYG'] as const).map((c) => {
                  const labels: Record<string, string> = { BRL: 'R$ Real', USD: 'US$ Dólar', PYG: '₲ Guarani' };
                  return (
                    <button
                      key={c}
                      onClick={() => handleCurrencyChange(c)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                        currency === c
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300'
                          : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {labels[c]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botão para sugerir taxas do sistema */}
            {systemSettings && (systemSettings.exchangeRateBrlToPyg > 0 || systemSettings.exchangeRateUsdToPyg > 0) && (
              <div className="mb-3">
                <button
                  onClick={applySystemRates}
                  className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Usar taxas do sistema ({isPygMode
                    ? `₲ 1.000 = R$ ${systemSettings.exchangeRateBrlToPyg > 0 ? (1000 / systemSettings.exchangeRateBrlToPyg).toFixed(2) : '?'} · ₲ 1.000 = US$ ${systemSettings.exchangeRateUsdToPyg > 0 ? (1000 / systemSettings.exchangeRateUsdToPyg).toFixed(4) : '?'} · 1 US$ = R$ ${systemSettings.exchangeRateBrlToPyg > 0 && systemSettings.exchangeRateUsdToPyg > 0 ? (systemSettings.exchangeRateUsdToPyg / systemSettings.exchangeRateBrlToPyg).toFixed(2) : '?'}`
                    : `1 BRL = ${systemSettings.exchangeRateBrlToPyg} PYG · 1 USD = ${systemSettings.exchangeRateUsdToPyg} PYG · 1 USD = ${systemSettings.exchangeRateBrlToPyg > 0 && systemSettings.exchangeRateUsdToPyg > 0 ? (systemSettings.exchangeRateUsdToPyg / systemSettings.exchangeRateBrlToPyg).toFixed(2) : '?'} BRL`})
                </button>
              </div>
            )}

            {/* 3 campos de taxa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {isPygMode ? '₲ 1.000 =' : '1 R$ BRL ='}
                </label>
                <div className="flex items-center gap-2">
                  {isPygMode && <span className="text-sm font-medium text-gray-500 whitespace-nowrap">R$</span>}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rate1Input}
                    onChange={(e) => handleRate1Change(e.target.value)}
                    placeholder={isPygMode ? 'ex: 0,83' : 'ex: 1210'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  {!isPygMode && <span className="text-sm font-medium text-gray-500 whitespace-nowrap">₲ PYG</span>}
                </div>
                {isPygMode && rate1 > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">= 1 BRL = {rate1.toFixed(2)} PYG</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {isPygMode ? '₲ 1.000 =' : '1 US$ USD ='}
                </label>
                <div className="flex items-center gap-2">
                  {isPygMode && <span className="text-sm font-medium text-gray-500 whitespace-nowrap">US$</span>}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rate2Input}
                    onChange={(e) => handleRate2Change(e.target.value)}
                    placeholder={isPygMode ? 'ex: 0,1471' : 'ex: 6800'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  {!isPygMode && <span className="text-sm font-medium text-gray-500 whitespace-nowrap">₲ PYG</span>}
                </div>
                {isPygMode && rate2 > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">= 1 USD = {rate2.toFixed(2)} PYG</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  1 US$ USD =
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rate3Input}
                    onChange={(e) => handleRate3Change(e.target.value)}
                    placeholder="ex: 5,62"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-500 whitespace-nowrap">R$ BRL</span>
                </div>
              </div>
            </div>

            {!hasRates && (
              <p className="mt-2 text-xs text-orange-600">
                Informe as taxas de câmbio para habilitar conversões entre moedas.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Custos Adicionais */}
      <div className="bg-white rounded-lg shadow-sm border mb-4">
        <button
          onClick={() => setShowAdditionalCosts(!showAdditionalCosts)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-gray-900">Custos Adicionais</span>
            {!showAdditionalCosts && additionalCosts.length > 0 && (
              <>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {additionalCosts.length} custo{additionalCosts.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-amber-600 font-semibold">+{totalAdditionalPercentage.toFixed(1)}%</span>
              </>
            )}
            {!showAdditionalCosts && additionalCosts.length === 0 && (
              <span className="text-xs text-gray-400">Nenhum custo adicional</span>
            )}
          </div>
          {showAdditionalCosts ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showAdditionalCosts && (
          <div className="px-4 pb-4 border-t">
            {/* Existing cost chips */}
            {additionalCosts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 mb-3">
                {additionalCosts.map((cost) => (
                  <div key={cost.id} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm">
                    <span className="font-medium text-amber-800">{cost.name}</span>
                    <span className="text-amber-600">{cost.percentage}%</span>
                    <button onClick={() => handleRemoveCost(cost.id)} className="ml-1 text-amber-400 hover:text-red-500 transition-colors" title="Remover">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Summary bar */}
            {additionalCosts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                <span className="text-sm text-amber-700">
                  Total custos adicionais: <strong>+{totalAdditionalPercentage.toFixed(1)}%</strong>
                </span>
              </div>
            )}

            {/* Preset quick-add buttons */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 mt-3">
              <span className="text-xs text-gray-500 mr-1">Sugestoes:</span>
              {costSuggestions.map((preset) => (
                <div key={preset} className="group relative inline-flex">
                  <button
                    onClick={() => {
                      if (editingSuggestions) return;
                      if (additionalCosts.some(c => c.name.toLowerCase() === preset.toLowerCase())) {
                        toast.info(`"${preset}" ja foi adicionado.`);
                        return;
                      }
                      setNewCostName(preset);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors border ${
                      editingSuggestions
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-100 hover:text-amber-700'
                    }`}
                  >
                    {editingSuggestions ? '' : '+ '}{preset}
                  </button>
                  {editingSuggestions && (
                    <button
                      onClick={() => saveSuggestions(costSuggestions.filter(s => s !== preset))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-600"
                      title={`Remover "${preset}"`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
              {editingSuggestions && (
                <div className="flex items-center gap-1 ml-1">
                  <input
                    type="text"
                    value={newSuggestion}
                    onChange={(e) => setNewSuggestion(e.target.value)}
                    placeholder="Nova..."
                    className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-full focus:ring-amber-500 focus:border-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSuggestion.trim()) {
                        if (costSuggestions.some(s => s.toLowerCase() === newSuggestion.trim().toLowerCase())) {
                          toast.info('Sugestao ja existe.');
                          return;
                        }
                        saveSuggestions([...costSuggestions, newSuggestion.trim()]);
                        setNewSuggestion('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newSuggestion.trim()) {
                        if (costSuggestions.some(s => s.toLowerCase() === newSuggestion.trim().toLowerCase())) {
                          toast.info('Sugestao ja existe.');
                          return;
                        }
                        saveSuggestions([...costSuggestions, newSuggestion.trim()]);
                        setNewSuggestion('');
                      }
                    }}
                    className="p-1 text-green-600 hover:bg-green-50 rounded-full"
                    title="Adicionar sugestao"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <button
                onClick={() => { setEditingSuggestions(!editingSuggestions); setNewSuggestion(''); }}
                className={`ml-1 px-2 py-1 text-xs rounded-full transition-colors border ${
                  editingSuggestions
                    ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                }`}
                title={editingSuggestions ? 'Concluir edição' : 'Editar sugestões'}
              >
                {editingSuggestions ? 'OK' : 'Editar'}
              </button>
            </div>

            {/* Add new cost form */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCostName}
                onChange={(e) => setNewCostName(e.target.value)}
                placeholder="Nome do custo (ex: Frete)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCost()}
              />
              <div className="relative w-28">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newCostPercentage}
                  onChange={(e) => setNewCostPercentage(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 pr-7 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCost()}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              <button
                onClick={handleAddCost}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 whitespace-nowrap transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== ITENS - Area principal ===== */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Filtros de fabricante e fornecedor */}
          <div className="px-4 pt-3 pb-2 border-b bg-white flex items-center gap-3 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {manufacturersList && manufacturersList.length > 0 && (
              <select
                value={manufacturerFilter}
                onChange={(e) => setManufacturerFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[36px] cursor-pointer"
              >
                <option value="">Todos os fabricantes</option>
                {manufacturersList.map((m: string) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[36px] cursor-pointer"
            >
              <option value="">Todos os fornecedores</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {(manufacturerFilter || supplierId) && (
              <button
                onClick={() => { setManufacturerFilter(''); setSupplierId(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Barra de adicionar item */}
          <div className="p-4 border-b bg-gray-50/50">
            <div className="flex items-center gap-3">
              {/* Busca de produto */}
              <div className="flex-1 relative" ref={productSearchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProductSearch(val);
                      // Ao digitar, desfaz a seleção anterior
                      setNewItemProductId('');
                      setNewItemName('');
                      setProductConfirmed(false);
                      setShowProductDropdown(true);
                      setProductSelectedIndex(-1);
                      setAnalysisProductId(undefined);
                      // Debounce: só dispara busca API após 300ms sem digitar
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      debounceRef.current = setTimeout(() => {
                        setDebouncedSearch(val.trim());
                      }, 300);
                    }}
                    onFocus={() => {
                      // Só reabre dropdown se NÃO tem produto confirmado
                      if (!productConfirmed) setShowProductDropdown(true);
                    }}
                    onKeyDown={handleProductSearchKeyDown}
                    placeholder="Buscar produto por nome, SKU..."
                    className="w-full pl-9 pr-20 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="off"
                  />
                  {productConfirmed && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      {newItemProductId ? <Package className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      {newItemProductId ? 'Vinculado' : 'Manual'}
                    </span>
                  )}
                </div>

                {/* Dropdown de resultados */}
                {showProductDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto">
                    {loadingProducts ? (
                      <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                        Buscando...
                      </div>
                    ) : filteredProducts.length > 0 ? (
                      <>
                        {filteredProducts.map((p: any, index: number) => {
                          const isZeroStock = typeof p.currentStock === 'number' && p.currentStock <= 0;
                          const isLowStock = typeof p.currentStock === 'number' && typeof p.minimumStock === 'number' && p.currentStock > 0 && p.currentStock <= p.minimumStock;
                          return (
                          <div
                            key={p.id}
                            onClick={() => handleProductSelect(p)}
                            className={`px-3 py-2.5 cursor-pointer text-sm flex items-center justify-between border-b border-gray-50 last:border-0 ${
                              index === productSelectedIndex
                                ? 'bg-blue-50 text-blue-900'
                                : isZeroStock
                                ? 'bg-red-50/40 hover:bg-red-50'
                                : isLowStock
                                ? 'bg-amber-50/40 hover:bg-amber-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isZeroStock ? (
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                              ) : isLowStock ? (
                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              ) : (
                                <Package className="w-4 h-4 text-gray-300 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <span className="font-medium">{p.name}</span>
                                {p.code && <span className="ml-2 text-xs text-gray-400">({p.code})</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs flex-shrink-0 ml-2">
                              {p.manufacturer && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{p.manufacturer}</span>}
                              {typeof p.currentStock === 'number' && (
                                <span className={`font-medium px-1.5 py-0.5 rounded ${
                                  isZeroStock ? 'bg-red-100 text-red-700' :
                                  isLowStock ? 'bg-amber-100 text-amber-700' :
                                  'bg-green-50 text-green-600'
                                }`}>
                                  {p.currentStock}{typeof p.minimumStock === 'number' ? `/${p.minimumStock}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          );
                        })}
                        {productSearch.trim() && !filteredProducts.some((p: any) => p.name.toLowerCase() === productSearch.toLowerCase()) && (
                          <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t">
                            <kbd className="bg-gray-200 px-1 rounded text-[10px]">Enter</kbd> para usar "{productSearch}" como item manual
                          </div>
                        )}
                      </>
                    ) : productSearch.trim() ? (
                      <div className="px-4 py-3 text-sm text-gray-400">
                        Nenhum produto encontrado. <kbd className="bg-gray-200 px-1 rounded text-[10px]">Enter</kbd> para usar nome manual.
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-400">Digite para buscar...</div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantidade */}
              <div className="w-24">
                <input
                  type="text"
                  inputMode="numeric"
                  value={newItemQty}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setNewItemQty(v);
                  }}
                  onBlur={() => {
                    if (!newItemQty || parseInt(newItemQty) < 1) setNewItemQty('1');
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-center"
                  placeholder="Qtd"
                />
              </div>

              {/* Botão adicionar */}
              <button
                onClick={handleAddItem}
                disabled={addItem.isPending || !productConfirmed || !newItemName}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-40 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {/* Painel de Análise de Demanda ABC */}
            {analysisProductId && (
              <div className="mt-3">
                <DemandAnalysisPanel
                  productId={analysisProductId}
                  onSuggestedQuantity={handleSuggestedQuantity}
                  onClose={() => setAnalysisProductId(undefined)}
                />
              </div>
            )}
          </div>

          {/* Lista de itens */}
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum item adicionado ainda.</p>
              <p className="text-xs mt-1">Use a busca acima para adicionar produtos.</p>
            </div>
          ) : (
            <>
              {/* Cabeçalho */}
              <div className="overflow-x-auto">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase bg-gray-50 border-b min-w-[600px]">
                <div className="col-span-4">Produto</div>
                <div className="col-span-1 text-center">Qtd</div>
                <div className="col-span-3 text-center">Preço Unit. {currencySymbol}</div>
                <div className="col-span-3 text-right">Subtotal</div>
                <div className="col-span-1 text-right"></div>
              </div>

              {/* Itens com preço inline */}
              <div className="divide-y divide-gray-100 min-w-[600px]">
                {items.map((item, idx) => {
                  const selectedQuote = item.selectedQuoteId && item.quotes
                    ? item.quotes.find((q) => q.id === item.selectedQuoteId)
                    : null;
                  const subtotalCents = selectedQuote ? Math.round(selectedQuote.unitPrice * item.quantity) : 0;
                  const isExpanded = expandedItems.has(item.id);
                  const quoteCount = item.quotes?.length || 0;
                  const isSaving = savingInline[item.id];

                  return (
                    <div key={item.id}>
                      {/* Linha do item — preço inline direto */}
                      <div className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'} transition-colors`}>
                        <div className="col-span-4 flex items-center gap-2 min-w-0">
                          <span className="text-xs text-gray-400 w-5 shrink-0">{idx + 1}.</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                            {quoteCount > 1 && (
                              <span className="text-[10px] text-blue-500">{quoteCount} cotações</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className="text-sm font-medium">{item.quantity}</span>
                        </div>

                        {/* PREÇO INLINE — digita e Enter para salvar */}
                        <div className="col-span-3" onClick={(e) => e.stopPropagation()}>
                          {selectedQuote && !inlinePrice[item.id] ? (
                            /* Tem preço — mostra valor, clica para editar */
                            <div
                              className="text-right cursor-pointer group"
                              onClick={() => setInlinePrice((prev) => ({ ...prev, [item.id]: brlCentsToInputVal(selectedQuote.unitPrice) }))}
                              title="Clique para editar"
                            >
                              <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                                {displayPrice(selectedQuote.unitPrice)}
                              </span>
                              {secondaryPrices(selectedQuote.unitPrice) && (
                                <p className="text-[10px] text-gray-400">{secondaryPrices(selectedQuote.unitPrice)}</p>
                              )}
                              {totalAdditionalPercentage > 0 && (
                                <p className="text-[10px] text-green-600">c/ custos: <span className="font-bold">{displayUnitWithCosts(selectedQuote.unitPrice)}</span></p>
                              )}
                            </div>
                          ) : (
                            /* Sem preço ou editando — input direto */
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400 shrink-0">{currencySymbol}</span>
                              <input
                                type="number"
                                step={currency === 'PYG' ? '1' : '0.01'}
                                value={inlinePrice[item.id] || ''}
                                onChange={(e) => setInlinePrice((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineQuote(item.id);
                                  if (e.key === 'Escape') setInlinePrice((prev) => ({ ...prev, [item.id]: '' }));
                                }}
                                placeholder="Preço"
                                disabled={isSaving}
                                autoFocus={!!selectedQuote}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                              />
                              {inlinePrice[item.id] && (
                                <button
                                  onClick={() => handleInlineQuote(item.id)}
                                  disabled={isSaving}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded shrink-0"
                                  title="Salvar (Enter)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Subtotal */}
                        <div className="col-span-3 text-right">
                          {subtotalCents > 0 && selectedQuote ? (
                            <div>
                              <span className="text-sm font-semibold text-gray-900">{displayItemSubtotal(selectedQuote.unitPrice, item.quantity)}</span>
                              {secondaryItemSubtotals(selectedQuote.unitPrice, item.quantity) && (
                                <p className="text-[10px] text-gray-400">{secondaryItemSubtotals(selectedQuote.unitPrice, item.quantity)}</p>
                              )}
                              {totalAdditionalPercentage > 0 && (
                                <p className="text-[10px] text-green-600">c/ custos: <span className="font-bold">{displaySubtotalWithCosts(selectedQuote.unitPrice, item.quantity)}</span></p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="col-span-1 flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { toggleExpand(item.id); initQuoteForm(item.id); }}
                            className={`p-1 rounded text-xs ${isExpanded ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                            title="Comparar cotações"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-red-400 hover:bg-red-50 rounded"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Painel expandido — comparação multi-cotação (uso avançado) */}
                      {isExpanded && (
                        <div className="px-4 pb-3 bg-gray-50/50 border-t border-gray-100">
                          <div className="ml-7">
                            {item.quotes && item.quotes.length > 0 && (
                              <div className="mt-2 mb-2">
                                {item.quotes.map((quote) => {
                                  const isSelected = quote.id === item.selectedQuoteId;
                                  return (
                                    <div key={quote.id} className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-white'}`}>
                                      <div className="flex items-center gap-2 min-w-0">
                                        {isSelected && <Check className="w-3 h-3 text-green-600 shrink-0" />}
                                        <span className={`truncate ${isSelected ? 'font-medium text-green-800' : 'text-gray-600'}`}>{quote.supplierName || '-'}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-medium">{displayPrice(quote.unitPrice)}</span>
                                        {secondaryPrices(quote.unitPrice) && (
                                          <span className="text-[10px] text-gray-400">{secondaryPrices(quote.unitPrice)}</span>
                                        )}
                                        {!isSelected && (
                                          <button
                                            onClick={() => handleSelectQuote(item.id, quote.id)}
                                            className="p-0.5 text-green-600 hover:bg-green-100 rounded text-xs"
                                            title="Selecionar"
                                          >
                                            <Check className="w-3 h-3" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteQuote(quote.id)}
                                          className="p-0.5 text-red-400 hover:bg-red-50 rounded"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Adicionar cotação de outro fornecedor */}
                            <div className="flex items-center gap-2 pt-2 border-t border-dashed border-gray-200">
                              <select
                                value={quoteForm[item.id]?.supplierId || ''}
                                onChange={(e) => {
                                  const sid = e.target.value;
                                  setQuoteForm((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], supplierId: sid, unitPrice: '' },
                                  }));
                                  if (sid && item.productId) fetchLastPrice(item.id, item.productId, sid);
                                }}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="">Outro fornecedor...</option>
                                {suppliers.map((s: any) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                step={currency === 'PYG' ? '1' : '0.01'}
                                placeholder={currencySymbol}
                                value={quoteForm[item.id]?.unitPrice || ''}
                                onChange={(e) => setQuoteForm((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], unitPrice: e.target.value },
                                }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddQuote(item.id)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs text-right"
                              />
                              <button
                                onClick={() => handleAddQuote(item.id)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 whitespace-nowrap"
                              >
                                + Cotação
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>

              {/* ===== RODAPE COM TOTAIS ===== */}
              <div className="border-t-2 border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'itens'}
                    {totals.quotedItems < totals.itemCount && (
                      <span className="text-orange-500 ml-2">({totals.itemCount - totals.quotedItems} sem cotação)</span>
                    )}
                  </span>
                  <div className="text-right">
                    {totalAdditionalPercentage > 0 && (
                      <>
                        <div className="text-xs text-gray-400">
                          Subtotal: {fmtAmount(totals.displaySubtotal, currency)}
                          {currency !== 'PYG' && totals.pygSubtotal > 0 && (
                            <span className="ml-1 text-[10px]">({fmtPYG(totals.pygSubtotal)})</span>
                          )}
                          {secondaryFromPrimary(totals.displaySubtotal) && (
                            <span className="ml-1 text-[10px]">({secondaryFromPrimary(totals.displaySubtotal)})</span>
                          )}
                        </div>
                        <div className="text-xs text-amber-600">
                          Custos Adic. (+{totalAdditionalPercentage.toFixed(1)}%): +{fmtAmount(totals.displayTotalWithCosts - totals.displaySubtotal, currency)}
                          {currency !== 'PYG' && totals.pygTotalWithCosts > 0 && (
                            <span className="ml-1">(+{fmtPYG(totals.pygTotalWithCosts - totals.pygSubtotal)})</span>
                          )}
                        </div>
                      </>
                    )}
                    <div className="text-lg font-bold text-gray-900">
                      {fmtAmount(totals.displayTotalWithCosts, currency)}
                      {currency !== 'PYG' && totals.pygTotalWithCosts > 0 && (
                        <span className="text-sm font-bold text-gray-700 ml-2">· {fmtPYG(totals.pygTotalWithCosts)}</span>
                      )}
                    </div>
                    {totals.displayTotalWithCosts > 0 && secondaryFromPrimary(totals.displayTotalWithCosts) && (
                      <p className="text-xs text-gray-500">{secondaryFromPrimary(totals.displayTotalWithCosts)}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Se não está editando, mostrar apenas o form de dados gerais aberto */}
      {!isEditing && !showGeneralData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Preencha o título e clique em <strong>Criar</strong> para começar a adicionar itens.
        </div>
      )}
    </div>
  );
}
