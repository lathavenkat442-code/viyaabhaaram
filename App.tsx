
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StockItem, Transaction, User, TransactionType, SizeStock, StockVariant, StockHistory } from './types';
import { TRANSLATIONS, CATEGORIES, PREDEFINED_COLORS, SHIRT_SIZES } from './constants';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Accounting from './components/Accounting';
import Profile from './components/Profile';
import { supabase, isSupabaseConfigured, saveSupabaseConfig } from './supabaseClient'; // Import updated client helpers
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  User as UserIcon,
  PlusCircle,
  X,
  Camera,
  Trash2,
  Lock,
  Mail,
  User as UserSimple,
  DownloadCloud,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  UploadCloud,
  ImagePlus,
  Check,
  Phone,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  UserX,
  Palette,
  ChevronDown,
  AlertTriangle,
  Users,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  KeyRound,
  CloudUpload,
  Database,
  Settings
} from 'lucide-react';

// Unified Security Action State
type SecurityActionType = 'DELETE_STOCK' | 'CLEAR_TXNS' | 'RESET_APP';
interface SecurityAction {
  type: SecurityActionType;
  payload?: any; // ID for stock delete
}

const EXPENSE_CATEGORIES = ['Salary', 'Rent', 'Tea/Snacks', 'Transport', 'Purchase', 'Sales', 'Electricity', 'Maintenance', 'Others'];

const AddTransactionModal: React.FC<{
  onSave: (txn: Omit<Transaction, 'id' | 'date'>, id?: string, date?: number) => void;
  onClose: () => void;
  initialData?: Transaction;
  language: 'ta' | 'en';
  t: any;
}> = ({ onSave, onClose, initialData, language, t }) => {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [partyName, setPartyName] = useState(initialData?.partyName || '');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    
    onSave({
      type,
      amount: parseFloat(amount),
      category,
      description,
      partyName
    }, initialData?.id, initialData?.date);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-800 tamil-font">
            {initialData ? t.editTransaction : t.addTransaction}
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${type === 'INCOME' ? 'bg-green-500 text-white shadow-md' : 'text-gray-500'}`}
            >
              {t.income}
            </button>
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${type === 'EXPENSE' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}
            >
              {t.expense}
            </button>
          </div>

          <div>
             <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">{t.amount}</label>
             <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full text-3xl font-black p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-100 text-gray-900"
                placeholder="₹ 0"
                autoFocus
                required
             />
          </div>

          <div className="relative" ref={dropdownRef}>
             <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">{t.category}</label>
             <div className="relative">
                <input
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    onFocus={() => setShowCategoryDropdown(true)}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 placeholder-gray-400"
                    placeholder={language === 'ta' ? 'உதா: தேநீர், போக்குவரத்து' : 'Ex: Tea, Transport'}
                    required
                />
                <button 
                  type="button" 
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-2"
                >
                    <ChevronDown size={20} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>
             </div>
             
             {showCategoryDropdown && (
                 <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                     {EXPENSE_CATEGORIES.map(c => (
                         <div 
                           key={c}
                           onClick={() => { setCategory(c); setShowCategoryDropdown(false); }}
                           className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 font-bold text-gray-700 text-sm"
                         >
                             {c}
                         </div>
                     ))}
                 </div>
             )}
          </div>

          <div>
             <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">{t.partyName}</label>
             <input
                value={partyName}
                onChange={e => setPartyName(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 placeholder-gray-400"
                placeholder={language === 'ta' ? 'வாடிக்கையாளர் / வியாபாரி பெயர்' : 'Customer / Dealer Name'}
             />
          </div>
          
          <div>
             <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">{language === 'ta' ? 'விளக்கம் (விருப்பினால்)' : 'Description (Optional)'}</label>
             <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 placeholder-gray-400"
                placeholder="..."
             />
          </div>

          <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition mt-2">
            {initialData ? t.update : t.save}
          </button>
        </form>
      </div>
    </div>
  );
};

const AddStockModal: React.FC<{
  onSave: (item: any, id?: string) => void;
  onClose: () => void;
  initialData?: StockItem;
  language: 'ta' | 'en';
  t: any;
}> = ({ onSave, onClose, initialData, language, t }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [price, setPrice] = useState(initialData?.price.toString() || '');
  
  // Custom Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<{ vIdx: number, sIdx: number, field: 'color' | 'size' | 'sleeve' } | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Ref for clicking outside main category dropdown
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Variants State
  const [variants, setVariants] = useState<StockVariant[]>(() => {
    if (initialData?.variants && initialData.variants.length > 0) {
      return initialData.variants;
    }
    // Migration for old data or new item
    if (initialData?.imageUrl) {
       return [{
           id: Date.now().toString(),
           imageUrl: initialData.imageUrl,
           sizeStocks: [{ size: 'General', quantity: 0 }]
       }];
    }
    return [{ id: Date.now().toString(), imageUrl: '', sizeStocks: [] }];
  });

  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        // Close Active Variant Dropdown
        if (activeDropdown) {
             setActiveDropdown(null);
        }
        // Close Category Dropdown
        if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
            setShowCategoryDropdown(false);
        }
    };
    
    // Add listener only if a dropdown is open to avoid unnecessary checks
    if (activeDropdown || showCategoryDropdown) {
        window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeDropdown, showCategoryDropdown]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newVariants = [...variants];
        newVariants[variantIndex].imageUrl = reader.result as string;
        setVariants(newVariants);
      };
      reader.readAsDataURL(file);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { id: Date.now().toString(), imageUrl: '', sizeStocks: [] }]);
    setActiveVariantIndex(variants.length);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
    setActiveVariantIndex(Math.max(0, index - 1));
  };

  const addSizeStock = (variantIndex: number) => {
    const newVariants = [...variants];
    newVariants[variantIndex].sizeStocks.push({ size: 'General', quantity: 0 });
    setVariants(newVariants);
  };

  const updateSizeStock = (variantIndex: number, stockIndex: number, field: keyof SizeStock, value: any) => {
    const newVariants = [...variants];
    newVariants[variantIndex].sizeStocks[stockIndex] = {
      ...newVariants[variantIndex].sizeStocks[stockIndex],
      [field]: value
    };
    setVariants(newVariants);
  };
  
  const removeSizeStock = (variantIndex: number, stockIndex: number) => {
      const newVariants = [...variants];
      newVariants[variantIndex].sizeStocks = newVariants[variantIndex].sizeStocks.filter((_, i) => i !== stockIndex);
      setVariants(newVariants);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) return;
    
    // Clean up empty stocks
    const cleanedVariants = variants.map(v => ({
        ...v,
        sizeStocks: v.sizeStocks.filter(s => s.quantity > 0 || s.size !== 'General')
    })).filter(v => v.imageUrl || v.sizeStocks.length > 0);

    // If no variants, add a dummy one if needed, but validation above handles it.
    if (cleanedVariants.length === 0) {
        // Allow creating item without variants? Maybe just minimal info
        cleanedVariants.push({ id: Date.now().toString(), imageUrl: '', sizeStocks: [] });
    }

    onSave({
      name,
      category,
      price: parseFloat(price),
      variants: cleanedVariants
    }, initialData?.id);
  };

  const currentVariant = variants[activeVariantIndex];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
         <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-800 tamil-font">
            {initialData ? t.update : t.addStock}
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           {/* Basic Info */}
           <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                 <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">{t.itemName}</label>
                 <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 placeholder-gray-400"
                    placeholder={t.itemName}
                    required
                 />
              </div>
              <div>
                 <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">{t.price}</label>
                 <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 placeholder-gray-400"
                    placeholder="₹ 0"
                    required
                 />
              </div>
              <div ref={categoryDropdownRef} className="relative">
                 <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">{t.category}</label>
                 <div className="relative">
                    <input
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        onFocus={() => setShowCategoryDropdown(true)}
                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 placeholder-gray-400"
                        placeholder="Select"
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-2"
                    >
                        <ChevronDown size={20} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                 </div>
                 
                 {showCategoryDropdown && (
                     <div className="absolute z-50 top-full right-0 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {CATEGORIES.map(c => (
                            <div 
                              key={c}
                              onClick={() => { setCategory(c); setShowCategoryDropdown(false); }}
                              className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 font-bold text-gray-700 text-sm"
                            >
                                {c}
                            </div>
                        ))}
                     </div>
                 )}
              </div>
           </div>

           {/* Variants Section */}
           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                 <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                     <Palette size={16} /> 
                     {language === 'ta' ? 'வகைகள் (Variants)' : 'Variants'}
                 </h3>
                 <button type="button" onClick={addVariant} className="text-indigo-600 text-xs font-black bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                     + {language === 'ta' ? 'புதிய வகை' : 'Add New'}
                 </button>
              </div>

              {/* Variant Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                  {variants.map((v, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => setActiveVariantIndex(idx)}
                        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border-2 transition relative overflow-hidden ${activeVariantIndex === idx ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200 bg-white'}`}
                      >
                          {v.imageUrl ? (
                              <img src={v.imageUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                              <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                          )}
                          {variants.length > 1 && activeVariantIndex === idx && (
                             <div onClick={(e) => { e.stopPropagation(); removeVariant(idx); }} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg cursor-pointer z-10">
                                 <X size={10} />
                             </div>
                          )}
                      </button>
                  ))}
              </div>

              {/* Active Variant Editor */}
              {currentVariant && (
                  <div className="space-y-4 animate-in fade-in">
                      {/* Image Upload */}
                      <div className="relative aspect-video bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden group">
                          {currentVariant.imageUrl ? (
                              <>
                                <img src={currentVariant.imageUrl} className="w-full h-full object-contain" alt="" />
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const newVariants = [...variants];
                                        newVariants[activeVariantIndex].imageUrl = '';
                                        setVariants(newVariants);
                                    }}
                                    className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm"
                                >
                                    <Trash2 size={16} />
                                </button>
                              </>
                          ) : (
                              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-50">
                                  <Camera size={24} className="text-gray-300 mb-2" />
                                  <span className="text-xs font-bold text-gray-400">{t.photo}</span>
                                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, activeVariantIndex)} className="hidden" />
                              </label>
                          )}
                      </div>

                      {/* Stock Entries */}
                      <div className="space-y-2">
                          {currentVariant.sizeStocks.map((stock, sIdx) => (
                              <div key={sIdx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm space-y-2 relative">
                                  <button type="button" onClick={() => removeSizeStock(activeVariantIndex, sIdx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
                                      <X size={16} />
                                  </button>
                                  <div className="grid grid-cols-2 gap-2 pr-6">
                                      {/* Color Input (Custom Dropdown) */}
                                      <div className="relative">
                                          <label className="text-[10px] font-bold text-gray-400 uppercase">{t.color}</label>
                                          <div 
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer text-gray-900"
                                            onClick={(e) => { e.stopPropagation(); setActiveDropdown({ vIdx: activeVariantIndex, sIdx, field: 'color' }); }}
                                          >
                                              <span className={stock.color ? 'text-gray-900' : 'text-gray-400'}>{stock.color || 'Select'}</span>
                                              <ChevronDown size={12} className="text-gray-400"/>
                                          </div>
                                          
                                          {activeDropdown?.field === 'color' && activeDropdown.vIdx === activeVariantIndex && activeDropdown.sIdx === sIdx && (
                                              <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                  {PREDEFINED_COLORS.map(c => (
                                                      <div 
                                                        key={c.name}
                                                        onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'color', c.name)}
                                                        className="flex items-center gap-2 p-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                      >
                                                          <div className="w-4 h-4 rounded-full border border-gray-200" style={{background: c.code}}></div>
                                                          <span className="text-xs font-bold text-gray-700">{c.name}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}
                                      </div>

                                      {/* Sleeve Select (Custom Dropdown) */}
                                      <div className="relative">
                                          <label className="text-[10px] font-bold text-gray-400 uppercase">{t.sleeve}</label>
                                          <div 
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer text-gray-900"
                                            onClick={(e) => { e.stopPropagation(); setActiveDropdown({ vIdx: activeVariantIndex, sIdx, field: 'sleeve' }); }}
                                          >
                                              <span className={stock.sleeve ? 'text-gray-900' : 'text-gray-400'}>{stock.sleeve || 'None'}</span>
                                              <ChevronDown size={12} className="text-gray-400"/>
                                          </div>

                                          {activeDropdown?.field === 'sleeve' && activeDropdown.vIdx === activeVariantIndex && activeDropdown.sIdx === sIdx && (
                                              <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                                                   <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'sleeve', 'Full Hand')} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 text-xs font-bold text-gray-700">{t.fullHand}</div>
                                                   <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'sleeve', 'Half Hand')} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 text-xs font-bold text-gray-700">{t.halfHand}</div>
                                                   <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'sleeve', '')} className="p-3 hover:bg-indigo-50 cursor-pointer text-xs font-bold text-red-400">None</div>
                                              </div>
                                          )}
                                      </div>

                                      {/* Size Input (Custom Dropdown) */}
                                      <div className="relative">
                                          <label className="text-[10px] font-bold text-gray-400 uppercase">{t.size}</label>
                                          <div 
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer text-gray-900"
                                            onClick={(e) => { e.stopPropagation(); setActiveDropdown({ vIdx: activeVariantIndex, sIdx, field: 'size' }); }}
                                          >
                                              <span className={stock.size ? 'text-gray-900' : 'text-gray-400'}>{stock.size || 'Select'}</span>
                                              <ChevronDown size={12} className="text-gray-400"/>
                                          </div>

                                          {activeDropdown?.field === 'size' && activeDropdown.vIdx === activeVariantIndex && activeDropdown.sIdx === sIdx && (
                                              <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                  {SHIRT_SIZES.map(s => (
                                                      <div 
                                                        key={s}
                                                        onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'size', s)}
                                                        className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 text-xs font-bold text-gray-700"
                                                      >
                                                          {s}
                                                      </div>
                                                  ))}
                                                  <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'size', 'S')} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 text-xs font-bold text-gray-700">S</div>
                                                  <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'size', 'M')} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 text-xs font-bold text-gray-700">M</div>
                                                  <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'size', 'L')} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 text-xs font-bold text-gray-700">L</div>
                                                  <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'size', 'XL')} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 text-xs font-bold text-gray-700">XL</div>
                                                  <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'size', 'XXL')} className="p-3 hover:bg-indigo-50 cursor-pointer text-xs font-bold text-gray-700">XXL</div>
                                              </div>
                                          )}
                                      </div>

                                      {/* Quantity Input */}
                                      <div>
                                          <label className="text-[10px] font-bold text-gray-400 uppercase">{t.quantity}</label>
                                          <div className="flex items-center">
                                              <button type="button" onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'quantity', Math.max(0, stock.quantity - 1))} className="w-8 h-8 bg-gray-100 rounded-l-lg flex items-center justify-center font-bold text-gray-500">-</button>
                                              <input 
                                                  type="number" 
                                                  value={stock.quantity}
                                                  onChange={(e) => updateSizeStock(activeVariantIndex, sIdx, 'quantity', parseInt(e.target.value) || 0)}
                                                  className="w-full h-8 text-center bg-white border-y border-gray-100 text-sm font-black outline-none text-gray-900"
                                              />
                                              <button type="button" onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'quantity', stock.quantity + 1)} className="w-8 h-8 bg-gray-100 rounded-r-lg flex items-center justify-center font-bold text-gray-500">+</button>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}

                          <button type="button" onClick={() => addSizeStock(activeVariantIndex)} className="w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 font-bold text-xs hover:bg-indigo-50 transition">
                              + {language === 'ta' ? 'அளவு/நிறம் சேர்க்க' : 'Add Size/Color'}
                          </button>
                      </div>
                  </div>
              )}
           </div>

           <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition">
              {initialData ? t.update : t.save}
           </button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'accounts' | 'profile'>('dashboard');
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<'ta' | 'en'>('ta');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Stock States
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);
  
  // Transaction States
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Security / OTP Modal State
  const [securityAction, setSecurityAction] = useState<SecurityAction | null>(null);
  const [securityOtp, setSecurityOtp] = useState<string>('');
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    });
    
    // Online/Offline Listeners
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    
    const savedLang = localStorage.getItem('viyabaari_lang');
    if (savedLang === 'ta' || savedLang === 'en') {
      setLanguage(savedLang);
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
            uid: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata.name || 'User',
            mobile: session.user.user_metadata.mobile || '',
            isLoggedIn: true
        });
      } else {
        // Fallback to local storage user if no supabase session (Offline mode or legacy)
        const savedUser = localStorage.getItem('viyabaari_active_user');
        if (savedUser) {
           setUser(JSON.parse(savedUser));
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            setUser({
                uid: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata.name || 'User',
                mobile: session.user.user_metadata.mobile || '',
                isLoggedIn: true
            });
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  // --- DATA SYNC (Supabase) ---
  const fetchData = useCallback(async (isManualRefresh = false) => {
      if (!user) return;
      
      let fetchedFromOnline = false;

      if (user.uid && navigator.onLine) {
          if (isManualRefresh) setIsSyncing(true);
          try {
              // Fetch Stocks
              const { data: stockData, error: stockError } = await supabase
                  .from('stock_items')
                  .select('content')
                  .eq('user_id', user.uid);
              
              if (stockError) {
                  console.error("Supabase Error (Stock):", stockError.message);
                  if (isManualRefresh) alert(`Sync Error: ${stockError.message}. Check SQL Tables.`);
              } else if (stockData) {
                  // If we have local stocks but server returns empty array, it might mean 
                  // tables were just created or data was lost. 
                  // Don't overwrite local if server is empty unless we are sure.
                  // Current Logic: Server is truth. 
                  // Improvement: If server is empty and local has data, offer to 'Push'.
                  
                  const parsedStocks = stockData.map((row: any) => row.content);
                  parsedStocks.sort((a: StockItem, b: StockItem) => b.lastUpdated - a.lastUpdated);
                  setStocks(parsedStocks);
                  localStorage.setItem(`viyabaari_stocks_${user.email}`, JSON.stringify(parsedStocks));
                  fetchedFromOnline = true;
              }

              // Fetch Transactions
              const { data: txnData, error: txnError } = await supabase
                  .from('transactions')
                  .select('content')
                  .eq('user_id', user.uid);

              if (txnError) {
                   console.error("Supabase Error (Txn):", txnError.message);
              } else if (txnData) {
                  const parsedTxns = txnData.map((row: any) => row.content);
                  parsedTxns.sort((a: Transaction, b: Transaction) => b.date - a.date);
                  setTransactions(parsedTxns);
                  localStorage.setItem(`viyabaari_txns_${user.email}`, JSON.stringify(parsedTxns));
                  fetchedFromOnline = true;
              }

          } catch (err) {
              console.error('Error fetching data:', err);
          } finally {
              if (isManualRefresh) {
                  setTimeout(() => setIsSyncing(false), 500); 
              }
          }
      } 
      
      // Fallback: If offline OR if online fetch failed (empty/error) AND we haven't successfully fetched
      if (!fetchedFromOnline) {
           const savedStocks = localStorage.getItem(`viyabaari_stocks_${user.email}`);
           const savedTxns = localStorage.getItem(`viyabaari_txns_${user.email}`);
           if (savedStocks) setStocks(JSON.parse(savedStocks));
           if (savedTxns) setTransactions(JSON.parse(savedTxns));
           if (isManualRefresh) setIsSyncing(false);
      }
  }, [user]);

  // Initial Fetch & Realtime Subscription
  useEffect(() => {
    fetchData();

    if (user?.uid && isOnline) {
        // Subscribe to real-time changes
        const channel = supabase.channel('db-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'stock_items',
              filter: `user_id=eq.${user.uid}`
            },
            (payload) => {
              console.log('Stock updated remotely', payload);
              fetchData();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'transactions',
              filter: `user_id=eq.${user.uid}`
            },
            (payload) => {
              console.log('Transaction updated remotely', payload);
              fetchData();
            }
          )
          .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
  }, [fetchData, user?.uid, isOnline]);

  const saveStock = async (itemData: Omit<StockItem, 'id' | 'lastUpdated' | 'history'>, id?: string) => {
    setIsLoading(true);
    const sanitizedVariants = itemData.variants.map(v => ({
        ...v,
        sizeStocks: v.sizeStocks || [{ size: 'General', quantity: 0 }]
    }));
    
    let newItem: StockItem;

    if (id) {
        const existingItem = stocks.find(s => s.id === id);
        if (!existingItem) { setIsLoading(false); return; }

        const oldHistory = existingItem.history || [];
        const newHistory = [...oldHistory];
        
        const oldPrice = existingItem.price;
        const newPrice = itemData.price;
        const oldQty = existingItem.variants ? existingItem.variants.reduce((acc, v) => acc + v.sizeStocks.reduce((sum, ss) => sum + ss.quantity, 0), 0) : 0;
        const newQty = sanitizedVariants.reduce((acc, v) => acc + v.sizeStocks.reduce((sum, ss) => sum + ss.quantity, 0), 0);
        let actionAdded = false;

        if (oldPrice !== newPrice) {
            newHistory.unshift({ date: Date.now(), action: 'PRICE_CHANGE', description: 'Price Updated', change: `₹${oldPrice} ➔ ₹${newPrice}` });
            actionAdded = true;
        }
        if (oldQty !== newQty) {
            const diff = newQty - oldQty;
            const sign = diff > 0 ? '+' : '';
            newHistory.unshift({ date: Date.now(), action: 'STOCK_CHANGE', description: 'Stock Quantity Updated', change: `${oldQty} ➔ ${newQty} (${sign}${diff})` });
            actionAdded = true;
        }
        if (!actionAdded && (existingItem.name !== itemData.name || existingItem.category !== itemData.category)) {
            newHistory.unshift({ date: Date.now(), action: 'UPDATED', description: 'Item Details Updated' });
        }

        newItem = { ...itemData, variants: sanitizedVariants, id, lastUpdated: Date.now(), history: newHistory };
        setStocks(prev => prev.map(s => s.id === id ? newItem : s));

    } else {
        const initialQty = sanitizedVariants.reduce((acc, v) => acc + v.sizeStocks.reduce((sum, ss) => sum + ss.quantity, 0), 0);
        const newHistory: StockHistory[] = [{ date: Date.now(), action: 'CREATED', description: 'Item Created', change: `Initial Stock: ${initialQty}` }];

        newItem = { ...itemData, variants: sanitizedVariants, id: Date.now().toString(), lastUpdated: Date.now(), history: newHistory };
        setStocks(prev => [newItem, ...prev]);
    }

    // Persist to Supabase
    if (user?.uid && isOnline) {
        const { error } = await supabase.from('stock_items').upsert({
            id: newItem.id,
            user_id: user.uid,
            content: newItem,
            last_updated: newItem.lastUpdated // Ensure this column exists in DB or ignore
        });
        if (error) {
            console.error("Sync Error:", error);
            alert(`ஆன்லைன் சேமிப்பு தோல்வி (Save Failed): ${error.message}.\n\nதீர்வு: Supabase Dashboard -> SQL Editor சென்று Tables உருவாக்கவும்.`);
        }
    }
    
    // Update Local Cache
    if (user?.email) {
        const updatedStocks = id ? stocks.map(s => s.id === id ? newItem : s) : [newItem, ...stocks];
        localStorage.setItem(`viyabaari_stocks_${user.email}`, JSON.stringify(updatedStocks));
    }

    setIsLoading(false);
    setIsAddingStock(false);
    setEditingStock(null);
  };

  const initiateDeleteStock = (id: string) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setSecurityOtp(otp);
    setSecurityAction({ type: 'DELETE_STOCK', payload: id });
  };

  const initiateClearTransactions = () => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setSecurityOtp(otp);
    setSecurityAction({ type: 'CLEAR_TXNS' });
  };

  const initiateResetApp = () => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setSecurityOtp(otp);
    setSecurityAction({ type: 'RESET_APP' });
  };

  const executeSecurityAction = async () => {
     if (!securityAction) return;
     setIsLoading(true);
     
     if (securityAction.type === 'DELETE_STOCK') {
         setStocks(prev => prev.filter(s => s.id !== securityAction.payload));
         if (user?.uid && isOnline) {
             const { error } = await supabase.from('stock_items').delete().eq('id', securityAction.payload).eq('user_id', user.uid);
             if (error) alert(`Delete Failed: ${error.message}`);
         }
     } else if (securityAction.type === 'CLEAR_TXNS') {
         setTransactions([]);
         if (user?.uid && isOnline) {
             const { error } = await supabase.from('transactions').delete().eq('user_id', user.uid);
             if (error) alert(`Delete Failed: ${error.message}`);
         }
     } else if (securityAction.type === 'RESET_APP') {
         setStocks([]);
         setTransactions([]);
         if (user?.uid && isOnline) {
             await supabase.from('stock_items').delete().eq('user_id', user.uid);
             await supabase.from('transactions').delete().eq('user_id', user.uid);
         }
     }
     
     if (user?.email) {
         if (securityAction.type === 'DELETE_STOCK') {
             const updated = stocks.filter(s => s.id !== securityAction.payload);
             localStorage.setItem(`viyabaari_stocks_${user.email}`, JSON.stringify(updated));
         } else if (securityAction.type === 'CLEAR_TXNS') {
             localStorage.setItem(`viyabaari_txns_${user.email}`, JSON.stringify([]));
         } else {
             localStorage.removeItem(`viyabaari_stocks_${user.email}`);
             localStorage.removeItem(`viyabaari_txns_${user.email}`);
         }
     }
     
     setIsLoading(false);
     setSecurityAction(null);
     setSecurityOtp('');
  };

  const saveTransaction = async (txnData: Omit<Transaction, 'id' | 'date'>, id?: string, date?: number) => {
    setIsLoading(true);
    let newTxn: Transaction;

    if (id && date) {
        newTxn = { ...txnData, id, date };
        setTransactions(prev => prev.map(t => t.id === id ? newTxn : t));
    } else {
        newTxn = { ...txnData, id: Date.now().toString(), date: Date.now() };
        setTransactions(prev => [newTxn, ...prev]);
    }

    if (user?.uid && isOnline) {
        const { error } = await supabase.from('transactions').upsert({
            id: newTxn.id,
            user_id: user.uid,
            content: newTxn,
            date: newTxn.date
        });
        if (error) {
            console.error("Sync Error:", error);
            alert(`ஆன்லைன் சேமிப்பு தோல்வி (Save Failed): ${error.message}. SQL Tables சரிபார்க்கவும்.`);
        }
    }

    if (user?.email) {
        const updatedTxns = id ? transactions.map(t => t.id === id ? newTxn : t) : [newTxn, ...transactions];
        localStorage.setItem(`viyabaari_txns_${user.email}`, JSON.stringify(updatedTxns));
    }

    setIsLoading(false);
    setIsAddingTransaction(false);
    setEditingTransaction(null);
  };
  
  // Manual Sync Up Function (Push Local to Server)
  const handleManualPush = async () => {
      if(!user?.uid || !isOnline) {
          alert(language === 'ta' ? 'இணைய இணைப்பு தேவை' : 'Online connection required');
          return;
      }
      setIsSyncing(true);
      
      // Push Stocks
      for(const s of stocks) {
          await supabase.from('stock_items').upsert({
              id: s.id,
              user_id: user.uid,
              content: s,
              last_updated: s.lastUpdated
          });
      }
      
      // Push Transactions
      for(const t of transactions) {
          await supabase.from('transactions').upsert({
              id: t.id,
              user_id: user.uid,
              content: t,
              date: t.date
          });
      }
      
      setIsSyncing(false);
      alert(language === 'ta' ? 'டேட்டா ஆன்லைனில் வெற்றிகரமாக ஏற்றப்பட்டது!' : 'Data synced to server successfully!');
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('viyabaari_active_user', JSON.stringify(u));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('viyabaari_active_user', JSON.stringify(updatedUser));
  };

  const handleLogout = async () => {
    if (isOnline) await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('viyabaari_active_user');
    setActiveTab('dashboard');
  };

  const toggleLanguage = (lang: 'ta' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('viyabaari_lang', lang);
  };

  const handleRestoreData = (data: any) => {
    if (data && data.user && Array.isArray(data.stocks)) {
      handleLogin(data.user);
      setStocks(data.stocks);
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      alert(language === 'ta' ? 'தரவு வெற்றிகரமாக மீட்டெடுக்கப்பட்டது! (Local)' : 'Data restored successfully! (Local)');
    } else {
      alert(language === 'ta' ? 'தவறான கோப்பு (Invalid File)' : 'Invalid backup file structure');
    }
  };

  const lowStockCount = useMemo(() => {
    return stocks.filter(s => s.variants?.some(v => v.sizeStocks?.some(ss => ss.quantity < 5))).length;
  }, [stocks]);

  const t = TRANSLATIONS[language];

  if (!user) {
    return <AuthScreen onLogin={handleLogin} onRestore={handleRestoreData} language={language} t={t} isOnline={isOnline} />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col shadow-xl">
      {/* ... (Existing Installation Banner) ... */}
      {showInstallBanner && (
        <div className="bg-indigo-700 text-white p-4 flex items-center justify-between sticky top-0 z-50 animate-in slide-in-from-top duration-300">
           <div className="flex items-center gap-3">
              <DownloadCloud className="text-indigo-200" />
              <div>
                 <p className="text-sm font-bold tamil-font">{language === 'ta' ? 'Viyabaari App-ஐ இன்ஸ்டால் செய்ய' : 'Install Viyabaari App'}</p>
                 <p className="text-[10px] opacity-80">{language === 'ta' ? 'முழு அனுபவத்தைப் பெறுங்கள்' : 'Get the full experience'}</p>
              </div>
           </div>
           <div className="flex gap-2">
              <button onClick={handleInstallClick} className="bg-white text-indigo-700 px-4 py-2 rounded-xl text-xs font-black tamil-font shadow-lg">இன்ஸ்டால்</button>
              <button onClick={() => setShowInstallBanner(false)} className="p-2 opacity-50"><X size={16}/></button>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 sticky top-0 z-10 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
           <h1 className="text-xl font-bold tamil-font">{t.appName}</h1>
           {!isOnline && <WifiOff size={14} className="opacity-70" />}
        </div>
        
        {isLoading ? (
            <Loader2 size={20} className="animate-spin text-white opacity-80" />
        ) : (
            <div className="flex gap-4">
                {/* Manual Sync Button */}
                {isOnline && user.uid && (
                    <button 
                        onClick={() => fetchData(true)} 
                        className={`hover:bg-indigo-500 p-1 rounded-full transition ${isSyncing ? 'animate-spin' : ''}`}
                        title={language === 'ta' ? 'Refresh' : 'Sync Now'}
                    >
                        <RefreshCw size={22} />
                    </button>
                )}
                
                {/* Manual Push Button (Only if items exist locally but may be missing on server) */}
                {isOnline && user.uid && (stocks.length > 0 || transactions.length > 0) && (
                     <button 
                        onClick={handleManualPush}
                        className="hover:bg-indigo-500 p-1 rounded-full transition"
                        title={language === 'ta' ? 'ஆன்லைனில் ஏற்று (Push)' : 'Push to Server'}
                     >
                         <CloudUpload size={22} />
                     </button>
                )}
                
                <button onClick={() => { setEditingStock(null); setIsAddingStock(true); }} className="hover:bg-indigo-500 p-1 rounded-full transition">
                <PlusCircle size={22} />
                </button>
                <button onClick={() => { setEditingTransaction(null); setIsAddingTransaction(true); }} className="hover:bg-indigo-500 p-1 rounded-full transition">
                <ArrowLeftRight size={22} />
                </button>
            </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'dashboard' && <Dashboard stocks={stocks} transactions={transactions} language={language} />}
        {activeTab === 'stock' && <Inventory stocks={stocks} onDelete={initiateDeleteStock} onEdit={(item) => { setEditingStock(item); setIsAddingStock(true); }} language={language} />}
        {activeTab === 'accounts' && 
            <Accounting 
                transactions={transactions} 
                language={language} 
                onEdit={(txn) => { setEditingTransaction(txn); setIsAddingTransaction(true); }}
                onClear={initiateClearTransactions}
            />
        }
        {activeTab === 'profile' && 
          <Profile 
            user={user} 
            updateUser={handleUpdateUser} 
            stocks={stocks} 
            transactions={transactions} 
            onLogout={handleLogout} 
            onRestore={handleRestoreData} 
            language={language} 
            onLanguageChange={toggleLanguage}
            onClearTransactions={initiateClearTransactions}
            onResetApp={initiateResetApp}
          />
        }
      </main>

      {/* Security Action OTP Modal */}
      {securityAction && (
          <SecurityOtpModal 
             otp={securityOtp}
             actionType={securityAction.type}
             onVerify={executeSecurityAction}
             onCancel={() => { setSecurityAction(null); setSecurityOtp(''); }}
             language={language}
             t={t}
          />
      )}

      {/* Modals */}
      {isAddingStock && <AddStockModal onSave={saveStock} onClose={() => { setIsAddingStock(false); setEditingStock(null); }} initialData={editingStock || undefined} language={language} t={t} />}
      {isAddingTransaction && (
          <AddTransactionModal 
            onSave={saveTransaction} 
            onClose={() => { setIsAddingTransaction(false); setEditingTransaction(null); }} 
            initialData={editingTransaction || undefined}
            language={language} 
            t={t} 
          />
      )}

      {/* Nav */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full max-w-md flex justify-around p-3 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
          <LayoutDashboard size={24} />
          <span className="text-[10px] tamil-font mt-1">{t.dashboard}</span>
        </button>
        <button onClick={() => setActiveTab('stock')} className={`flex flex-col items-center relative ${activeTab === 'stock' ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
          <Package size={24} />
          {lowStockCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-bounce">{lowStockCount}</span>}
          <span className="text-[10px] tamil-font mt-1">{t.stock}</span>
        </button>
        <button onClick={() => setActiveTab('accounts')} className={`flex flex-col items-center ${activeTab === 'accounts' ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
          <ArrowLeftRight size={24} />
          <span className="text-[10px] tamil-font mt-1">{t.accounts}</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
          <UserIcon size={24} />
          <span className="text-[10px] tamil-font mt-1">{t.profile}</span>
        </button>
      </nav>
    </div>
  );
};

// ... [Keep SecurityOtpModal and AuthScreen exactly as they were, no changes needed inside them for this fix] ...
const SecurityOtpModal: React.FC<{ otp: string; actionType: SecurityActionType; onVerify: () => void; onCancel: () => void; language: 'ta' | 'en'; t: any }> = ({ otp, actionType, onVerify, onCancel, language, t }) => {
    // ... [Content of SecurityOtpModal] ...
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input === otp) {
            onVerify();
        } else {
            setError(true);
            setTimeout(() => setError(false), 2000);
        }
    };

    let title = '';
    let message = '';
    let confirmText = '';
    
    if (actionType === 'DELETE_STOCK') {
        title = language === 'ta' ? 'சரக்கை நீக்க' : 'Delete Stock';
        message = language === 'ta' ? 'இந்த பொருளை நீக்க விரும்புகிறீர்களா?' : 'Are you sure you want to delete this stock?';
        confirmText = language === 'ta' ? 'நீக்குக' : 'Delete';
    } else if (actionType === 'CLEAR_TXNS') {
        title = language === 'ta' ? 'கணக்குகளை அழிக்க' : 'Clear All Transactions';
        message = language === 'ta' ? 'எல்லா வரவு செலவு கணக்குகளையும் அழிக்கவா?' : 'Delete all income/expense entries?';
        confirmText = language === 'ta' ? 'அழிக்கவும்' : 'Clear All';
    } else if (actionType === 'RESET_APP') {
        title = language === 'ta' ? 'செயலியை ரீசெட் செய்ய' : 'Factory Reset';
        message = language === 'ta' ? 'எல்லா தரவுகளையும் (சரக்கு & கணக்கு) அழிக்கவா?' : 'Delete ALL data (Stocks & Transactions)?';
        confirmText = language === 'ta' ? 'ரீசெட் செய்' : 'Reset Now';
    }

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 text-red-600 rounded-full">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 tamil-font">{title}</h3>
                    </div>
                    <button onClick={onCancel} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={16} /></button>
                 </div>
                 
                 <p className="text-sm text-gray-500 mb-6 font-medium tamil-font">{message}</p>
                 
                 <div className="bg-slate-100 p-4 rounded-xl text-center mb-6 border border-slate-200">
                     <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">{language === 'ta' ? 'கீழே உள்ள OTP ஐ டைப் செய்யவும்' : 'Type the OTP below'}</p>
                     <p className="text-3xl font-black text-slate-800 tracking-[0.2em]">{otp}</p>
                 </div>

                 <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                         <input 
                            type="number" 
                            value={input} 
                            onChange={e => setInput(e.target.value)}
                            placeholder="OTP"
                            className={`w-full p-4 text-center text-xl font-bold rounded-xl border-2 outline-none transition text-gray-900 ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-indigo-500'}`}
                            autoFocus
                         />
                         {error && <p className="text-xs text-red-500 text-center mt-2 font-bold">{t.invalidOtp}</p>}
                     </div>

                     <div className="flex gap-3 pt-2">
                         <button type="button" onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">{t.cancel}</button>
                         <button type="submit" className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200">{confirmText}</button>
                     </div>
                 </form>
             </div>
        </div>
    );
};

// --- AUTH SCREEN (UPDATED for Supabase) ---
const AuthScreen: React.FC<{ onLogin: (u: User) => void; onRestore: (d: any) => void; language: 'ta' | 'en'; t: any; isOnline: boolean }> = ({ onLogin, onRestore, language, t, isOnline }) => {
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Manual Config State
    const [showSetup, setShowSetup] = useState(false);
    const [setupUrl, setSetupUrl] = useState('');
    const [setupKey, setSetupKey] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      if (!isOnline) {
          alert("No Internet Connection. Please connect to login.");
          setIsLoading(false);
          return;
      }
      
      if (!isSupabaseConfigured) {
          // If trying to login but not configured, show setup
          setShowSetup(true);
          setIsLoading(false);
          return;
      }

      try {
        if (mode === 'REGISTER') {
             const { data, error } = await supabase.auth.signUp({
                 email,
                 password,
                 options: {
                     data: { name, mobile }
                 }
             });
             if (error) throw error;
             alert(language === 'ta' ? 'பதிவு வெற்றி! இப்போது உள்நுழையலாம்.' : 'Registration success! Please login.');
             setMode('LOGIN');
        } else {
             const { data, error } = await supabase.auth.signInWithPassword({
                 email,
                 password
             });
             if (error) throw error;
             
             if (data.user) {
                 const loggedInUser: User = {
                     uid: data.user.id,
                     email: data.user.email || '',
                     name: data.user.user_metadata.name || 'User',
                     mobile: data.user.user_metadata.mobile || '',
                     isLoggedIn: true
                 };
                 onLogin(loggedInUser);
             }
        }
      } catch (err: any) {
          alert(err.message || t.loginFailed);
      } finally {
          setIsLoading(false);
      }
    };
    
    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        saveSupabaseConfig(setupUrl, setupKey);
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!isOnline) {
             alert("No Internet Connection.");
             setIsLoading(false);
             return;
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.href,
            });
            if (error) throw error;
            alert(t.resetLinkSent);
            setMode('LOGIN');
        } catch (err: any) {
             alert(err.message || "Failed to send reset link");
        } finally {
             setIsLoading(false);
        }
    };

    const handleSkipLogin = () => {
        const guestUser: User = {
            email: 'guest@viyabaari.local',
            name: 'Guest User',
            mobile: '0000000000',
            isLoggedIn: true,
            // Password field removed for security
        };
        onLogin(guestUser);
    };
  
    const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            onRestore(data);
          } catch (err) {
            alert("Error parsing backup file");
          }
        };
        reader.readAsText(file);
      }
      e.target.value = '';
    };
  
    if (showSetup || !isSupabaseConfigured) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
                <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-gray-800 shadow-2xl">
                    <div className="text-center mb-6">
                        <Database size={48} className="mx-auto text-indigo-600 mb-2"/>
                        <h2 className="text-xl font-black text-gray-800 tamil-font">
                            {language === 'ta' ? 'கிளவுட் டேட்டாபேஸ் செட்டிங்ஸ்' : 'Setup Cloud Database'}
                        </h2>
                        <p className="text-xs text-gray-500 tamil-font">
                            {language === 'ta' ? 'ஆன்லைன் சிங்க் வசதியை பெற Supabase விவரங்களை உள்ளிடவும்.' : 'Enter Supabase Credentials to enable online sync.'}
                        </p>
                    </div>
                    
                    <form onSubmit={handleSaveConfig} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Supabase URL</label>
                            <input 
                                value={setupUrl} 
                                onChange={e => setSetupUrl(e.target.value)} 
                                className="w-full bg-gray-100 p-3 rounded-xl font-mono text-sm border focus:border-indigo-500 outline-none" 
                                placeholder="https://xyz.supabase.co"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Anon Key</label>
                            <input 
                                value={setupKey} 
                                onChange={e => setSetupKey(e.target.value)} 
                                className="w-full bg-gray-100 p-3 rounded-xl font-mono text-sm border focus:border-indigo-500 outline-none" 
                                placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                                required
                            />
                        </div>
                        
                        <button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 tamil-font">
                            {language === 'ta' ? 'சேமித்து இணைக்க' : 'Save & Connect'}
                        </button>
                    </form>
                    
                    <button onClick={() => setShowSetup(false)} className="w-full mt-4 text-gray-400 text-xs hover:text-gray-600 tamil-font">
                        {language === 'ta' ? 'தவிர் / விருந்தினர் முறைக்கு திரும்ப' : 'Skip / Back to Guest Mode'}
                    </button>
                </div>
            </div>
        );
    }
  
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white relative">
         <h1 className="text-4xl font-black tamil-font mb-2 text-center">{t.appName}</h1>
         <p className="text-indigo-200 mb-8 text-sm opacity-80">{language === 'ta' ? 'ஆன்லைன் அக்கவுண்ட்ஸ் (Supabase Cloud)' : 'Online Accounts (Supabase Cloud)'}</p>
         
         <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-gray-800 shadow-2xl">
              { !isSupabaseConfigured && (
                  <div className="bg-amber-50 text-amber-700 p-3 rounded-xl mb-4 text-xs font-bold text-center border border-amber-100 flex items-center justify-center gap-2 cursor-pointer hover:bg-amber-100" onClick={() => setShowSetup(true)}>
                    <WifiOff size={16} />
                    <span className="tamil-font">{language === 'ta' ? 'ஆன்லைன் டேட்டாபேஸ் அமைக்க இங்கே கிளிக் செய்யவும்' : 'Click to Setup Online Database'}</span>
                  </div>
              )}

              {/* Mode Toggle (Hide in Forgot Password) */}
              {mode !== 'FORGOT_PASSWORD' && (
                  <div className="flex gap-4 mb-8 bg-gray-100 p-1 rounded-2xl">
                      <button onClick={() => setMode('LOGIN')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${mode === 'LOGIN' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400'}`}>
                      <div className="flex items-center justify-center gap-2">
                          <LogIn size={16}/> {language === 'ta' ? 'உள்நுழைய' : 'Login'}
                      </div>
                      </button>
                      <button onClick={() => setMode('REGISTER')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${mode === 'REGISTER' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400'}`}>
                      <div className="flex items-center justify-center gap-2">
                          <UserPlus size={16}/> {language === 'ta' ? 'பதிவு செய்ய' : 'Sign Up'}
                      </div>
                      </button>
                  </div>
              )}
              
              {mode === 'FORGOT_PASSWORD' && (
                  <div className="mb-6 text-center">
                      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                          <KeyRound size={32} />
                      </div>
                      <h3 className="text-xl font-black text-gray-800 tamil-font">{t.resetPassword}</h3>
                  </div>
              )}
  
                <form onSubmit={mode === 'FORGOT_PASSWORD' ? handleForgotPassword : handleAuth} className="space-y-4">
                  {mode === 'REGISTER' && (
                      <>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{language === 'ta' ? 'பெயர்' : 'Name'}</label>
                          <div className="relative">
                              <UserSimple className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition" required />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t.mobile}</label>
                          <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                              <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition" required />
                          </div>
                      </div>
                      </>
                  )}
                  
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                      <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition" required />
                      </div>
                  </div>
                  
                  {mode !== 'FORGOT_PASSWORD' && (
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{language === 'ta' ? 'கடவுச்சொல்' : 'Password'}</label>
                        <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 p-4 pl-12 pr-12 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                        </div>
                    </div>
                  )}
                  
                  {/* Forgot Password Link */}
                  {mode === 'LOGIN' && (
                      <div className="text-right">
                          <button type="button" onClick={() => setMode('FORGOT_PASSWORD')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 tamil-font">
                              {t.forgotPassword}
                          </button>
                      </div>
                  )}
  
                  <button disabled={isLoading} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-indigo-200 mt-6 active:scale-95 transition flex justify-center hover:bg-indigo-700">
                      {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'LOGIN' ? (language === 'ta' ? 'உள்நுழைய' : 'Login') : mode === 'REGISTER' ? (language === 'ta' ? 'பதிவு செய்' : 'Register') : t.sendResetLink)}
                  </button>

                  {/* Back to Login for Forgot Password Mode */}
                  {mode === 'FORGOT_PASSWORD' && (
                      <button type="button" onClick={() => setMode('LOGIN')} className="w-full p-4 text-gray-500 font-bold text-sm hover:text-gray-700">
                          {t.backToLogin}
                      </button>
                  )}
                </form>
  
                {mode !== 'FORGOT_PASSWORD' && (
                    <>
                        <div className="mt-4 pt-2 border-t border-gray-100 text-center">
                            <button onClick={handleSkipLogin} className="bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition flex items-center justify-center gap-2 w-full py-3">
                                <UserX size={16} />
                                {language === 'ta' ? 'விருந்தினராக தொடரவும் (Offline)' : 'Guest Login (Offline Mode)'}
                            </button>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100">
                            <label className="flex items-center justify-center gap-2 w-full p-4 border border-dashed border-gray-300 text-gray-400 rounded-2xl font-bold text-xs cursor-pointer hover:bg-gray-50 transition">
                                <UploadCloud size={16} />
                                <span>{language === 'ta' ? 'பழைய பேக்கப் ஃபைலை திறக்க' : 'Restore Local Backup File'}</span>
                                <input type="file" onChange={handleFileRestore} accept=".json" className="hidden" />
                            </label>
                        </div>
                        <div className="mt-2 text-center">
                            <button onClick={() => setShowSetup(true)} className="text-[10px] text-gray-300 hover:text-indigo-500 font-bold uppercase tracking-widest transition">
                                <Settings size={12} className="inline mr-1" /> 
                                {language === 'ta' ? 'டேட்டாபேஸ் அமைக்க (Database Setup)' : 'Configure Database'}
                            </button>
                        </div>
                    </>
                )}
         </div>
      </div>
    );
  };

export default App;
