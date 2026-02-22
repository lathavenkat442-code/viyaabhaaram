
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StockItem, Transaction, User, TransactionType, SizeStock, StockVariant } from './types';
import { TRANSLATIONS, CATEGORIES, PREDEFINED_COLORS, SHIRT_SIZES } from './constants';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Accounting from './components/Accounting';
import Profile from './components/Profile';
import { supabase, isSupabaseConfigured, saveSupabaseConfig } from './supabaseClient';
import { 
  LayoutDashboard, Package, ArrowLeftRight, User as UserIcon, PlusCircle, X, Camera, Trash2, Palette, ChevronDown, RefreshCw, Database, Loader2, WifiOff, CheckCircle2, AlertTriangle
} from 'lucide-react';

const EXPENSE_CATEGORIES = ['Salary', 'Rent', 'Tea/Snacks', 'Transport', 'Purchase', 'Sales', 'Electricity', 'Maintenance', 'Others'];

const Toast: React.FC<{ message: string; show: boolean; onClose: () => void; isError?: boolean }> = ({ message, show, onClose, isError }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);
    if (!show) return null;
    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-500">
            <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-md ${isError ? 'bg-red-600 border-red-500 text-white' : 'bg-green-600 border-green-500 text-white'}`}>
                {isError ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                <span className="font-bold text-sm tamil-font whitespace-nowrap">{message}</span>
            </div>
        </div>
    );
};

const DatabaseConfigModal: React.FC<{ onClose: () => void; language: 'ta' | 'en' }> = ({ onClose, language }) => {
    const [setupUrl, setSetupUrl] = useState(localStorage.getItem('viyabaari_supabase_url') || '');
    const [setupKey, setSetupKey] = useState(localStorage.getItem('viyabaari_supabase_key') || '');
    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        saveSupabaseConfig(setupUrl, setupKey);
    };
    return (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
                <div className="text-center mb-6">
                    <Database size={48} className="mx-auto text-indigo-600 mb-2"/>
                    <h2 className="text-xl font-black text-gray-800 tamil-font">{language === 'ta' ? 'கிளவுட் டேட்டாபேஸ் செட்டிங்ஸ்' : 'Setup Cloud Database'}</h2>
                </div>
                <form onSubmit={handleSaveConfig} className="space-y-4">
                    <input value={setupUrl} onChange={e => setSetupUrl(e.target.value)} className="w-full bg-gray-100 p-3 rounded-xl font-mono text-sm border outline-none" placeholder="Supabase URL" required />
                    <input value={setupKey} onChange={e => setSetupKey(e.target.value)} className="w-full bg-gray-100 p-3 rounded-xl font-mono text-sm border outline-none" placeholder="Anon Key" required />
                    <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold shadow-lg">Save & Connect</button>
                </form>
             </div>
        </div>
    );
};

const AddTransactionModal: React.FC<{ onSave: (txn: any, id?: string, date?: number) => void; onClose: () => void; initialData?: Transaction; language: 'ta' | 'en'; t: any; }> = ({ onSave, onClose, initialData, language, t }) => {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [partyName, setPartyName] = useState(initialData?.partyName || '');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-800 tamil-font">{initialData ? t.editTransaction : t.addTransaction}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ type, amount: parseFloat(amount) || 0, category, description, partyName }, initialData?.id, initialData?.date); }} className="space-y-5">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${type === 'INCOME' ? 'bg-green-500 text-white shadow-md' : 'text-gray-500'}`}>{t.income}</button>
            <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${type === 'EXPENSE' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}>{t.expense}</button>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">{t.price}</label>
            <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full text-3xl font-black p-4 bg-gray-50 rounded-2xl border-none outline-none text-gray-900" placeholder="₹ 0" autoFocus required />
          </div>
          <div className="relative">
             <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">{t.category}</label>
             <div onClick={() => setShowCategoryDropdown(!showCategoryDropdown)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold border border-gray-100 flex justify-between items-center cursor-pointer">
                <span className={category ? 'text-gray-800' : 'text-gray-400'}>{category || 'Select'}</span>
                <ChevronDown size={18} className="text-gray-400" />
             </div>
             {showCategoryDropdown && (
                <div className="absolute z-50 bottom-full mb-2 left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-2">
                    {EXPENSE_CATEGORIES.map(c => <div key={c} onClick={() => { setCategory(c); setShowCategoryDropdown(false); }} className="p-3 hover:bg-indigo-50 rounded-xl cursor-pointer font-bold text-gray-700 text-sm">{c}</div>)}
                </div>
             )}
          </div>
          <input value={partyName} onChange={e => setPartyName(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-gray-100" placeholder={t.partyName} />
          <input value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-gray-100" placeholder="..." />
          <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-[0.98] transition mt-2">{initialData ? t.update : t.save}</button>
        </form>
      </div>
    </div>
  );
};

const AddStockModal: React.FC<{ onSave: (item: any, id?: string) => void; onClose: () => void; initialData?: StockItem; language: 'ta' | 'en'; t: any; }> = ({ onSave, onClose, initialData, language, t }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [variants, setVariants] = useState<StockVariant[]>(initialData?.variants || [{ id: Date.now().toString(), imageUrl: '', sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }] }]);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<{ vIdx: number, sIdx: number, field: 'color' | 'size' | 'sleeve' } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length > 12) {
        alert(language === 'ta' ? 'அதிகபட்சம் 12 படங்கள் மட்டுமே' : 'Maximum 12 images allowed');
        return;
      }

      const readFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
      };

      const processFiles = async () => {
        const newVariants = [...variants];
        const currentTemplate = newVariants[variantIndex];
        
        // Process first file -> Updates CURRENT variant
        if (files[0].size <= 2 * 1024 * 1024) {
            newVariants[variantIndex].imageUrl = await readFile(files[0]);
        } else {
            alert(language === 'ta' ? 'படம் 2MB-க்கு குறைவாக இருக்க வேண்டும்' : 'Image must be less than 2MB');
        }

        // Process remaining files -> Create NEW variants
        for (let i = 1; i < files.length; i++) {
            if (files[i].size <= 2 * 1024 * 1024) {
                const imgUrl = await readFile(files[i]);
                newVariants.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    imageUrl: imgUrl,
                    sizeStocks: currentTemplate.sizeStocks.map(s => ({ ...s })) // Clone sizes
                });
            }
        }
        setVariants(newVariants);
      };

      processFiles();
    }
  };

  const updateSizeStock = (vIdx: number, sIdx: number, field: keyof SizeStock, value: any) => {
    const newVariants = [...variants];
    newVariants[vIdx].sizeStocks[sIdx] = { ...newVariants[vIdx].sizeStocks[sIdx], [field]: value };
    setVariants(newVariants);
    setActiveDropdown(null);
  };

  const currentVariant = variants[activeVariantIndex];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-800 tamil-font">{initialData ? t.update : t.addStock}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ name, price: parseFloat(price) || 0, category, variants }, initialData?.id); }} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-400 ml-2 mb-2 block">{t.itemName}</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full p-5 bg-gray-50 rounded-[1.5rem] font-bold outline-none border border-gray-100 focus:border-indigo-200" placeholder={t.itemName} required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-400 ml-2 mb-2 block">{t.price}</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400">₹</span>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-5 pl-10 bg-gray-50 rounded-[1.5rem] font-bold outline-none border border-gray-100 focus:border-indigo-200" placeholder="0" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-400 ml-2 mb-2 block">{t.category}</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-5 bg-gray-50 rounded-[1.5rem] font-bold outline-none border border-gray-100 appearance-none focus:border-indigo-200" required>
                  <option value="">Select</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
                   <Palette size={20} className="text-gray-700" />
                   {language === 'ta' ? 'வகைகள்' : 'Variants'}
                   <span className="text-sm font-medium text-gray-400">(Variants)</span>
                </h3>
                <button type="button" onClick={() => setVariants([...variants, { id: Date.now().toString(), imageUrl: '', sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }] }])} className="text-indigo-600 text-xs font-black bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition shadow-sm">+ {language === 'ta' ? 'புதிய வகை' : 'Add New'}</button>
             </div>
             
             <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                 {variants.map((v, idx) => (
                     <button key={v.id || idx} type="button" onClick={() => setActiveVariantIndex(idx)} className={`flex-shrink-0 w-14 h-14 rounded-2xl border-2 transition-all flex items-center justify-center ${activeVariantIndex === idx ? 'border-indigo-500 bg-white ring-4 ring-indigo-50 shadow-md scale-105' : 'border-gray-200 bg-gray-100'}`}>
                         {v.imageUrl ? <img src={v.imageUrl} className="w-full h-full object-cover rounded-xl" alt="" /> : <span className="text-xs font-black text-gray-400">#{idx + 1}</span>}
                     </button>
                 ))}
             </div>
             
             {currentVariant && (
                <div className="space-y-6 mt-4">
                   {variants.length > 1 && (
                       <div className="flex justify-end">
                           <button type="button" onClick={() => {
                               const newVariants = variants.filter((_, i) => i !== activeVariantIndex);
                               setVariants(newVariants);
                               setActiveVariantIndex(Math.max(0, activeVariantIndex - 1));
                           }} className="text-red-500 text-xs font-bold flex items-center gap-1 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition">
                               <Trash2 size={14} /> {language === 'ta' ? 'இந்த வகையை நீக்கு' : 'Delete Variant'}
                           </button>
                       </div>
                   )}
                   <div className="relative aspect-video bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden group">
                      {currentVariant.imageUrl ? (
                        <><img src={currentVariant.imageUrl} className="w-full h-full object-contain" alt="" />
                        <button type="button" onClick={() => { const v = [...variants]; v[activeVariantIndex].imageUrl = ''; setVariants(v); }} className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button></>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-50 transition">
                           <Camera size={32} className="text-gray-300 mb-2" />
                           <span className="text-sm font-bold text-gray-400">{t.photo}</span>
                           <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, activeVariantIndex)} className="hidden" />
                        </label>
                      )}
                   </div>
                   
                   <div className="space-y-4">
                      {currentVariant.sizeStocks.map((stock, sIdx) => (
                        <div key={sIdx} className="bg-white p-6 rounded-[1.8rem] border border-gray-100 shadow-sm relative space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="relative">
                                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{t.color}</label>
                                 <div onClick={() => setActiveDropdown({ vIdx: activeVariantIndex, sIdx, field: 'color' })} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold flex justify-between items-center cursor-pointer text-gray-700">
                                    {stock.color || 'Select'}
                                    <ChevronDown size={14} className="text-gray-400" />
                                 </div>
                                 {activeDropdown?.vIdx === activeVariantIndex && activeDropdown?.sIdx === sIdx && activeDropdown?.field === 'color' && (
                                    <div className="absolute z-[60] bottom-full left-0 w-full mb-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-40 overflow-y-auto p-2">
                                       {PREDEFINED_COLORS.map(c => <div key={c.name} onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'color', c.name)} className="p-3 hover:bg-indigo-50 rounded-xl text-xs font-black text-gray-700 border-b last:border-0">{c.name}</div>)}
                                    </div>
                                 )}
                              </div>
                              <div className="relative">
                                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{language === 'ta' ? 'கை வகை' : 'Sleeve'}</label>
                                 <div onClick={() => setActiveDropdown({ vIdx: activeVariantIndex, sIdx, field: 'sleeve' })} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold flex justify-between items-center cursor-pointer text-gray-700">
                                    {stock.sleeve || 'None'}
                                    <ChevronDown size={14} className="text-gray-400" />
                                 </div>
                                 {activeDropdown?.vIdx === activeVariantIndex && activeDropdown?.sIdx === sIdx && activeDropdown?.field === 'sleeve' && (
                                    <div className="absolute z-[60] bottom-full left-0 w-full mb-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2">
                                       <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'sleeve', 'Full Hand')} className="p-3 hover:bg-indigo-50 rounded-xl text-xs font-black text-gray-700 border-b">Full Hand</div>
                                       <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'sleeve', 'Half Hand')} className="p-3 hover:bg-indigo-50 rounded-xl text-xs font-black text-gray-700">Half Hand</div>
                                    </div>
                                 )}
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4">
                              <div className="relative">
                                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{t.size}</label>
                                 <div onClick={() => setActiveDropdown({ vIdx: activeVariantIndex, sIdx, field: 'size' })} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold flex justify-between items-center cursor-pointer text-gray-700">
                                    {stock.size || 'Select'}
                                    <ChevronDown size={14} className="text-gray-400" />
                                 </div>
                                 {activeDropdown?.vIdx === activeVariantIndex && activeDropdown?.sIdx === sIdx && activeDropdown?.field === 'size' && (
                                    <div className="absolute z-[60] bottom-full left-0 w-full mb-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-40 overflow-y-auto p-2">
                                       {SHIRT_SIZES.map(s => <div key={s} onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'size', s)} className="p-3 hover:bg-indigo-50 rounded-xl text-xs font-black text-gray-700 border-b last:border-0">{s}</div>)}
                                    </div>
                                 )}
                              </div>
                              <div>
                                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{language === 'ta' ? 'அளவு' : 'Quantity'}</label>
                                 <div className="flex items-center bg-gray-100 rounded-xl p-1 h-[42px]">
                                    <button type="button" onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'quantity', Math.max(0, stock.quantity - 1))} className="w-10 h-10 flex items-center justify-center font-black text-gray-400 hover:text-indigo-600 transition">-</button>
                                    <input type="number" value={stock.quantity} onChange={e => updateSizeStock(activeVariantIndex, sIdx, 'quantity', parseInt(e.target.value) || 0)} className="w-full text-center text-sm font-black bg-transparent outline-none" />
                                    <button type="button" onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'quantity', stock.quantity + 1)} className="w-10 h-10 flex items-center justify-center font-black text-gray-400 hover:text-indigo-600 transition">+</button>
                                 </div>
                              </div>
                           </div>
                           
                           <button type="button" onClick={() => { const v = [...variants]; v[activeVariantIndex].sizeStocks = v[activeVariantIndex].sizeStocks.filter((_, i) => i !== sIdx); setVariants(v); }} className="absolute -top-2 -right-2 p-1.5 bg-white border border-gray-100 text-gray-300 hover:text-red-500 rounded-full shadow-sm transition"><X size={14}/></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => { const v = [...variants]; v[activeVariantIndex].sizeStocks.push({ size: 'General', quantity: 0, color: '', sleeve: '' }); setVariants(v); }} className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-500 font-black text-xs hover:bg-indigo-50 transition">+ {language === 'ta' ? 'புதிய ஆப்ஷன் சேர்க்க' : 'Add Stock Option'}</button>
                   </div>
                </div>
             )}
          </div>
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-100 active:scale-[0.98] transition text-lg">{initialData ? t.update : t.save}</button>
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
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showDatabaseConfig, setShowDatabaseConfig] = useState(false);
  const [toast, setToast] = useState<{ msg: string, show: boolean, isError?: boolean }>({ msg: '', show: false });
  const [isAppLoading, setIsAppLoading] = useState(true);

  const getEmailKey = (email: string) => (email || 'guest').toLowerCase().replace(/[^a-z0-9]/g, '_');

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    const savedLang = localStorage.getItem('viyabaari_lang');
    if (savedLang === 'ta' || savedLang === 'en') setLanguage(savedLang);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ 
          uid: session.user.id, 
          email: session.user.email || '', 
          name: session.user.user_metadata.full_name || session.user.user_metadata.name || 'User', 
          avatar: session.user.user_metadata.avatar_url,
          isLoggedIn: true 
        });
      } else {
        const savedUser = localStorage.getItem('viyabaari_active_user');
        if (savedUser) { try { setUser(JSON.parse(savedUser)); } catch(e) { localStorage.removeItem('viyabaari_active_user'); } }
      }
      setIsAppLoading(false);
    });
  }, []);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (!user) return;
    const emailKey = getEmailKey(user.email);
    
    // Immediate Local Load
    try {
        const localS = localStorage.getItem(`viyabaari_stocks_${emailKey}`);
        const localT = localStorage.getItem(`viyabaari_txns_${emailKey}`);
        if (localS) setStocks(JSON.parse(localS));
        if (localT) setTransactions(JSON.parse(localT));
    } catch (e) { console.error("Local load failed"); }

    if (user.uid && isOnline && isSupabaseConfigured) {
      if (isManualRefresh) setIsSyncing(true);
      try {
        // Force Fetch Stocks
        const { data: sData, error: sError } = await supabase.from('stock_items').select('*').eq('user_id', user.uid).order('last_updated', { ascending: false });
        if (sError) console.error("Fetch stocks error:", sError);
        if (sData) {
          const freshS = sData.map((r: any) => {
              try { return typeof r.content === 'string' ? JSON.parse(r.content) : r.content; } catch(e) { return null; }
          }).filter(Boolean);
          setStocks(freshS);
          try { localStorage.setItem(`viyabaari_stocks_${emailKey}`, JSON.stringify(freshS)); } catch(e) {}
        }

        // Force Fetch Transactions
        const { data: tData, error: tError } = await supabase.from('transactions').select('*').eq('user_id', user.uid);
        if (tError) console.error("Fetch txns error:", tError);
        if (tData) {
          const freshT = tData.map((r: any) => {
              try { return typeof r.content === 'string' ? JSON.parse(r.content) : r.content; } catch(e) { return null; }
          }).filter(Boolean);
          freshT.sort((a: any, b: any) => (b.date || 0) - (a.date || 0));
          setTransactions(freshT);
          try { localStorage.setItem(`viyabaari_txns_${emailKey}`, JSON.stringify(freshT)); } catch(e) {}
        }
      } catch (e) { console.error("Cloud fetch failed", e); }
      finally { if (isManualRefresh) setIsSyncing(false); }
    }
  }, [user, isOnline]);

  useEffect(() => { if (user) fetchData(); }, [user?.uid, fetchData]);

  const saveStock = async (itemData: any, id?: string) => {
    if (!user) return;
    setIsLoading(true);
    const emailKey = getEmailKey(user.email);
    try {
        const newItem = { ...itemData, id: id || Date.now().toString(), lastUpdated: Date.now() };
        
        // Immediate Optimistic Update
        setStocks(prev => {
          const updated = id ? prev.map(s => s.id === id ? newItem : s) : [newItem, ...prev];
          try { localStorage.setItem(`viyabaari_stocks_${emailKey}`, JSON.stringify(updated)); } catch(e) { console.warn("LocalStorage quota exceeded"); }
          return updated;
        });

        if (user.uid && isOnline && isSupabaseConfigured) {
          // Use .select() to ensure confirmed save
          const { data, error } = await supabase.from('stock_items')
            .upsert({ id: newItem.id, user_id: user.uid, content: newItem, last_updated: newItem.lastUpdated })
            .select();
          
          if (error) throw error;
          
          // Double verify state with returned data if it's different
          if (data && data[0] && data[0].content) {
            try {
              const confirmedItem = typeof data[0].content === 'string' ? JSON.parse(data[0].content) : data[0].content;
              if (confirmedItem && confirmedItem.id) {
                setStocks(prev => prev.map(s => s.id === confirmedItem.id ? confirmedItem : s));
              }
            } catch (e) {
              console.error("Error parsing confirmed item", e);
            }
          }
        }
        
        setIsAddingStock(false); 
        setEditingStock(null);
        setToast({ msg: language === 'ta' ? 'சரக்கு சேமிக்கப்பட்டது!' : 'Stock Saved!', show: true });
    } catch (err) { 
        console.error("Save stock failed:", err);
        setToast({ msg: 'Error saving stock', show: true, isError: true }); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const saveTransaction = async (txnData: any, id?: string, date?: number) => {
    if (!user) return;
    setIsLoading(true);
    const emailKey = getEmailKey(user.email);
    try {
        const newTxn = { ...txnData, id: id || Date.now().toString(), date: date || Date.now() };
        
        // Immediate UI Update
        setTransactions(prev => {
          const updated = id ? prev.map(t => t.id === id ? newTxn : t) : [newTxn, ...prev];
          try { localStorage.setItem(`viyabaari_txns_${emailKey}`, JSON.stringify(updated)); } catch(e) { console.warn("LocalStorage quota exceeded"); }
          return updated;
        });

        if (user.uid && isOnline && isSupabaseConfigured) {
          const { data, error } = await supabase.from('transactions')
            .upsert({ id: newTxn.id, user_id: user.uid, content: newTxn })
            .select();
          
          if (error) throw error;

          if (data && data[0] && data[0].content) {
             try {
               const confirmedTxn = typeof data[0].content === 'string' ? JSON.parse(data[0].content) : data[0].content;
               if (confirmedTxn && confirmedTxn.id) {
                 setTransactions(prev => prev.map(t => t.id === confirmedTxn.id ? confirmedTxn : t));
               }
             } catch (e) {
               console.error("Error parsing confirmed txn", e);
             }
          }
        }
        
        setIsAddingTransaction(false); 
        setEditingTransaction(null);
        setToast({ msg: language === 'ta' ? 'கணக்கு சேமிக்கப்பட்டது!' : 'Entry Saved!', show: true });
    } catch (err) { 
        console.error("Save transaction failed:", err);
        setToast({ msg: 'Error saving transaction', show: true, isError: true }); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const handleDeleteStock = async (id: string) => {
    const confirmMsg = language === 'ta' 
        ? 'இதை நீக்க "DELETE" என டைப் செய்யவும்:' 
        : 'Type "DELETE" to confirm deletion:';
    
    const input = window.prompt(confirmMsg);
    if (input !== 'DELETE') {
        if (input !== null) alert(language === 'ta' ? 'தவறான குறியீடு' : 'Incorrect confirmation');
        return false;
    }
    
    if (!user) return false;
    setIsLoading(true);
    const emailKey = getEmailKey(user.email);
    try {
        setStocks(prev => {
            const updated = prev.filter(s => s.id !== id);
            try { localStorage.setItem(`viyabaari_stocks_${emailKey}`, JSON.stringify(updated)); } catch(e) {}
            return updated;
        });

        if (user.uid && isOnline && isSupabaseConfigured) {
            await supabase.from('stock_items').delete().eq('id', id).eq('user_id', user.uid);
        }
        setToast({ msg: language === 'ta' ? 'பொருள் நீக்கப்பட்டது!' : 'Item Deleted!', show: true });
        return true;
    } catch (err) {
        console.error("Delete stock failed:", err);
        setToast({ msg: 'Error deleting stock', show: true, isError: true });
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  const handleClearTransactions = async () => {
    if (!user) return;
    const emailKey = getEmailKey(user.email);
    setTransactions([]);
    try { localStorage.setItem(`viyabaari_txns_${emailKey}`, '[]'); } catch(e) {}
    if (user.uid && isOnline && isSupabaseConfigured) {
       await supabase.from('transactions').delete().eq('user_id', user.uid);
    }
    setToast({ msg: language === 'ta' ? 'அனைத்தும் அழிக்கப்பட்டது' : 'Cleared all', show: true });
  };

  const t = TRANSLATIONS[language];
  
  if (isAppLoading) {
      return (
          <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center text-white">
              <Loader2 size={48} className="animate-spin mb-4" />
              <h1 className="text-2xl font-black tamil-font animate-pulse">Viyabaari Loading...</h1>
          </div>
      );
  }

  if (!user) return <AuthScreen onLogin={u => { setUser(u); localStorage.setItem('viyabaari_active_user', JSON.stringify(u)); window.location.reload(); }} language={language} t={t} isOnline={isOnline} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col shadow-xl">
      <Toast message={toast.msg} show={toast.show} isError={toast.isError} onClose={() => setToast({ ...toast, show: false })} />
      <header className="bg-indigo-600 text-white p-4 sticky top-0 z-10 shadow-md flex flex-wrap gap-2 justify-between items-center">
        <div className="flex items-center gap-2"><h1 className="text-xl font-bold tamil-font truncate">{t.appName}</h1></div>
        <div className="flex gap-3 items-center">
            {isOnline && user.uid && <button onClick={() => fetchData(true)} className={`p-2 bg-white/10 hover:bg-white/20 rounded-full transition ${isSyncing ? 'animate-spin' : ''}`}><RefreshCw size={20} /></button>}
            <button onClick={() => { setEditingStock(null); setIsAddingStock(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><PlusCircle size={20}/></button>
            <button onClick={() => { setEditingTransaction(null); setIsAddingTransaction(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><ArrowLeftRight size={20}/></button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'dashboard' && <Dashboard stocks={stocks} transactions={transactions} language={language} user={user} onSetupServer={() => setShowDatabaseConfig(true)} />}
        {activeTab === 'stock' && <Inventory stocks={stocks} onDelete={handleDeleteStock} onEdit={s => { setEditingStock(s); setIsAddingStock(true); }} language={language} />}
        {activeTab === 'accounts' && <Accounting transactions={transactions} language={language} onEdit={t => { setEditingTransaction(t); setIsAddingTransaction(true); }} onClear={handleClearTransactions} />}
        {activeTab === 'profile' && <Profile user={user} updateUser={setUser} stocks={stocks} transactions={transactions} onLogout={async () => { 
            await supabase.auth.signOut(); 
            setUser(null); 
            localStorage.removeItem('viyabaari_active_user'); 
            // Clear any other session data if needed
            sessionStorage.clear();
            // Force reload to clear any in-memory state
            window.location.reload(); 
        }} onRestore={d => {}} language={language} onLanguageChange={(l) => { setLanguage(l); localStorage.setItem('viyabaari_lang', l); }} onClearTransactions={handleClearTransactions} onResetApp={() => {}} onSetupServer={() => setShowDatabaseConfig(true)} />}
      </main>
      {showDatabaseConfig && <DatabaseConfigModal onClose={() => setShowDatabaseConfig(false)} language={language} />}
      {isAddingStock && <AddStockModal onSave={saveStock} onClose={() => setIsAddingStock(false)} initialData={editingStock || undefined} language={language} t={t} />}
      {isAddingTransaction && <AddTransactionModal onSave={saveTransaction} onClose={() => setIsAddingTransaction(false)} initialData={editingTransaction || undefined} language={language} t={t} />}
      <nav className="bg-indigo-600 border-t border-indigo-500 fixed bottom-0 w-full max-w-md flex justify-around p-3 z-10 text-white">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center transition ${activeTab === 'dashboard' ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-80'}`}><LayoutDashboard size={24} /><span className="text-[10px] tamil-font mt-1">{t.dashboard}</span></button>
        <button onClick={() => setActiveTab('stock')} className={`flex flex-col items-center transition ${activeTab === 'stock' ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-80'}`}><Package size={24} /><span className="text-[10px] tamil-font mt-1">{t.stock}</span></button>
        <button onClick={() => setActiveTab('accounts')} className={`flex flex-col items-center transition ${activeTab === 'accounts' ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-80'}`}><ArrowLeftRight size={24} /><span className="text-[10px] tamil-font mt-1">{t.accounts}</span></button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center transition ${activeTab === 'profile' ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-80'}`}><UserIcon size={24} /><span className="text-[10px] tamil-font mt-1">{t.profile}</span></button>
      </nav>
      {isLoading && <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[110] backdrop-blur-[1px]"><div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300"><Loader2 className="animate-spin text-indigo-600" size={40}/><p className="font-black text-gray-800 tamil-font">சேமிக்கப்படுகிறது...</p></div></div>}
    </div>
  );
};

const AuthScreen: React.FC<{ onLogin: (u: User) => void; language: 'ta' | 'en'; t: any; isOnline: boolean }> = ({ onLogin, language, t, isOnline }) => {
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
        if (mode === 'REGISTER') {
           const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
           if (error) throw error;
           alert(language === 'ta' ? 'பதிவு வெற்றி! இப்போது லாகின் செய்யவும்.' : 'Success! Please login.');
           setMode('LOGIN');
        } else if (mode === 'LOGIN') {
           const { data, error } = await supabase.auth.signInWithPassword({ email, password });
           if (error) throw error;
           if (data.user) onLogin({ uid: data.user.id, email: data.user.email || '', name: data.user.user_metadata.full_name || data.user.user_metadata.name || 'User', avatar: data.user.user_metadata.avatar_url, isLoggedIn: true });
        } else {
           const { error } = await supabase.auth.resetPasswordForEmail(email);
           if (error) throw error;
           alert(t.resetLinkSent);
           setMode('LOGIN');
        }
      } catch (err: any) { alert(err.message); }
      finally { setIsLoading(false); }
    };
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white">
         <h1 className="text-4xl font-black tamil-font mb-8">Viyabaari</h1>
         <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-gray-800 shadow-2xl">
                <div className="flex gap-4 mb-6 bg-gray-100 p-1 rounded-2xl">
                    <button onClick={() => setMode('LOGIN')} className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${mode === 'LOGIN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Login</button>
                    <button onClick={() => setMode('REGISTER')} className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${mode === 'REGISTER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Sign Up</button>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                  {mode === 'REGISTER' && <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border focus:border-indigo-200" placeholder="Name" required />}
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border focus:border-indigo-200" placeholder="Email" required />
                  {mode !== 'FORGOT' && <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border focus:border-indigo-200" placeholder="Password" required />}
                  <button disabled={isLoading} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition">{isLoading ? <Loader2 className="animate-spin mx-auto"/> : mode === 'LOGIN' ? 'Login' : mode === 'REGISTER' ? 'Sign Up' : 'Send Reset Link'}</button>
                </form>
                
                {mode === 'LOGIN' && (
                   <div className="mt-4 text-center">
                       <button onClick={() => setMode('FORGOT')} className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition">Forgot Password?</button>
                   </div>
                )}
                
                {mode === 'FORGOT' && (
                   <div className="mt-4 text-center">
                       <button onClick={() => setMode('LOGIN')} className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition">Back to Login</button>
                   </div>
                )}

                <div className="mt-6 text-center border-t pt-4">
                    <button onClick={() => onLogin({ email: 'guest@viyabaari.local', name: 'Guest', isLoggedIn: true })} className="text-indigo-600 font-bold text-sm hover:underline w-full">Guest Mode (Offline)</button>
                </div>
         </div>
      </div>
    );
};

export default App;
