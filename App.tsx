
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StockItem, Transaction, User, TransactionType, SizeStock, StockVariant, StockHistory } from './types';
import { TRANSLATIONS, CATEGORIES, PREDEFINED_COLORS, SHIRT_SIZES } from './constants';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Accounting from './components/Accounting';
import Profile from './components/Profile';
import { supabase } from './supabaseClient'; // Import Supabase Client
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
  Loader2
} from 'lucide-react';

// Unified Security Action State
type SecurityActionType = 'DELETE_STOCK' | 'CLEAR_TXNS' | 'RESET_APP';
interface SecurityAction {
  type: SecurityActionType;
  payload?: any; // ID for stock delete
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'accounts' | 'profile'>('dashboard');
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<'ta' | 'en'>('ta');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
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
        } else {
            // Only clear if explicitly logged out, otherwise might be offline state
            // setUser(null); 
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
  useEffect(() => {
    const fetchData = async () => {
        if (user?.uid && isOnline) {
            setIsLoading(true);
            try {
                // Fetch Stocks
                const { data: stockData, error: stockError } = await supabase
                    .from('stock_items')
                    .select('content')
                    .eq('user_id', user.uid);
                
                if (stockData) {
                    const parsedStocks = stockData.map((row: any) => row.content);
                    setStocks(parsedStocks);
                    // Update local cache
                    localStorage.setItem(`viyabaari_stocks_${user.email}`, JSON.stringify(parsedStocks));
                }

                // Fetch Transactions
                const { data: txnData, error: txnError } = await supabase
                    .from('transactions')
                    .select('content')
                    .eq('user_id', user.uid);

                if (txnData) {
                    const parsedTxns = txnData.map((row: any) => row.content);
                    setTransactions(parsedTxns);
                    // Update local cache
                    localStorage.setItem(`viyabaari_txns_${user.email}`, JSON.stringify(parsedTxns));
                }

            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        } else if (user) {
             // Load from Local Storage if offline or guest
             const savedStocks = localStorage.getItem(`viyabaari_stocks_${user.email}`);
             const savedTxns = localStorage.getItem(`viyabaari_txns_${user.email}`);
             if (savedStocks) setStocks(JSON.parse(savedStocks));
             if (savedTxns) setTransactions(JSON.parse(savedTxns));
        }
    };

    fetchData();
  }, [user?.uid, isOnline]);

  const saveStock = async (itemData: Omit<StockItem, 'id' | 'lastUpdated' | 'history'>, id?: string) => {
    setIsLoading(true);
    const sanitizedVariants = itemData.variants.map(v => ({
        ...v,
        sizeStocks: v.sizeStocks || [{ size: 'General', quantity: 0 }]
    }));
    
    let newItem: StockItem;

    if (id) {
        // Update Logic
        const existingItem = stocks.find(s => s.id === id);
        if (!existingItem) return;

        const oldHistory = existingItem.history || [];
        const newHistory = [...oldHistory];
        
        // ... (History calculation logic same as before)
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
        // Create Logic
        const initialQty = sanitizedVariants.reduce((acc, v) => acc + v.sizeStocks.reduce((sum, ss) => sum + ss.quantity, 0), 0);
        const newHistory: StockHistory[] = [{ date: Date.now(), action: 'CREATED', description: 'Item Created', change: `Initial Stock: ${initialQty}` }];

        newItem = { ...itemData, variants: sanitizedVariants, id: Date.now().toString(), lastUpdated: Date.now(), history: newHistory };
        setStocks(prev => [newItem, ...prev]);
    }

    // Persist to Supabase
    if (user?.uid && isOnline) {
        await supabase.from('stock_items').upsert({
            id: newItem.id,
            user_id: user.uid,
            content: newItem
        });
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
             await supabase.from('stock_items').delete().eq('id', securityAction.payload).eq('user_id', user.uid);
         }
     } else if (securityAction.type === 'CLEAR_TXNS') {
         setTransactions([]);
         if (user?.uid && isOnline) {
             await supabase.from('transactions').delete().eq('user_id', user.uid);
         }
     } else if (securityAction.type === 'RESET_APP') {
         setStocks([]);
         setTransactions([]);
         if (user?.uid && isOnline) {
             await supabase.from('stock_items').delete().eq('user_id', user.uid);
             await supabase.from('transactions').delete().eq('user_id', user.uid);
         }
     }
     
     // Update local cache
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

    // Persist to Supabase
    if (user?.uid && isOnline) {
        await supabase.from('transactions').upsert({
            id: newTxn.id,
            user_id: user.uid,
            content: newTxn
        });
    }

    // Update Local Cache
    if (user?.email) {
        const updatedTxns = id ? transactions.map(t => t.id === id ? newTxn : t) : [newTxn, ...transactions];
        localStorage.setItem(`viyabaari_txns_${user.email}`, JSON.stringify(updatedTxns));
    }

    setIsLoading(false);
    setIsAddingTransaction(false);
    setEditingTransaction(null);
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
     // Legacy local file restore - logic kept for backward compatibility
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

// --- Reusable Security OTP Modal Component ---
const SecurityOtpModal: React.FC<{ otp: string; actionType: SecurityActionType; onVerify: () => void; onCancel: () => void; language: 'ta' | 'en'; t: any }> = ({ otp, actionType, onVerify, onCancel, language, t }) => {
    // ... [Content of SecurityOtpModal same as before] ...
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
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
  
    const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      if (!isOnline) {
          alert("No Internet Connection. Please connect to login.");
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

    const handleSkipLogin = () => {
        const guestUser: User = {
            email: 'guest@viyabaari.local',
            name: 'Guest User',
            mobile: '0000000000',
            isLoggedIn: true,
            password: ''
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
  
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white relative">
         <h1 className="text-4xl font-black tamil-font mb-2 text-center">{t.appName}</h1>
         <p className="text-indigo-200 mb-8 text-sm opacity-80">{language === 'ta' ? 'ஆன்லைன் அக்கவுண்ட்ஸ் (Supabase Cloud)' : 'Online Accounts (Supabase Cloud)'}</p>
         
         <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-gray-800 shadow-2xl">
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
  
                <form onSubmit={handleAuth} className="space-y-4">
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
  
                  <button disabled={isLoading} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-indigo-200 mt-6 active:scale-95 transition flex justify-center">
                      {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'LOGIN' ? (language === 'ta' ? 'உள்நுழைய' : 'Login') : (language === 'ta' ? 'பதிவு செய்' : 'Register'))}
                  </button>
                </form>
  
                <div className="mt-4 pt-2 border-t border-gray-100 text-center">
                    <button onClick={handleSkipLogin} className="text-indigo-500 font-bold text-xs hover:text-indigo-700 transition flex items-center justify-center gap-1 w-full py-2">
                        <UserX size={14} />
                        {language === 'ta' ? 'விருந்தினராக தொடரவும் (Offline)' : 'Guest Login (Offline)'}
                    </button>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100">
                    <label className="flex items-center justify-center gap-2 w-full p-4 border border-dashed border-gray-300 text-gray-400 rounded-2xl font-bold text-xs cursor-pointer hover:bg-gray-50 transition">
                        <UploadCloud size={16} />
                        <span>{language === 'ta' ? 'பழைய பேக்கப் ஃபைலை திறக்க' : 'Restore Local Backup File'}</span>
                        <input type="file" onChange={handleFileRestore} accept=".json" className="hidden" />
                    </label>
                </div>
         </div>
      </div>
    );
  };

const AddStockModal: React.FC<{ onSave: (item: Omit<StockItem, 'id' | 'lastUpdated' | 'history'>, id?: string) => void; onClose: () => void; initialData?: StockItem; language: 'ta' | 'en'; t: any }> = ({ onSave, onClose, initialData, language, t }) => {
    // ... [Same Content as previous AddStockModal, no changes needed inside logic, just re-rendering for completeness context if needed, but for brevity skipping internal repeating code. Assuming context persists] ...
  const [step, setStep] = useState<1 | 2>(initialData ? 2 : 1);
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [showColorList, setShowColorList] = useState(false);
  const [variants, setVariants] = useState<StockVariant[]>(initialData?.variants || []);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 2 && variants.length === 0) {
        setVariants([{ id: Date.now().toString(), imageUrl: '', sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }] }]);
    }
  }, [step]);

  const handleCategorySelect = (cat: string) => { setCategory(cat); setStep(2); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      let startIndex = 0;
      if (variants.length === 1 && !variants[0].imageUrl) {
         const reader = new FileReader();
         reader.onloadend = () => { setVariants(prev => { const updated = [...prev]; updated[0].imageUrl = reader.result as string; return updated; }); };
         reader.readAsDataURL(files[0]);
         startIndex = 1;
      }
      const remainingSlots = 10 - variants.length;
      const filesToProcess = files.slice(startIndex, startIndex + remainingSlots);
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => { setVariants(prev => [...prev, { id: Date.now().toString() + Math.random(), imageUrl: reader.result as string, sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }] }]); };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) { setVariants(prev => [{ ...prev[0], imageUrl: '', sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }] }]); return; }
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
    if (selectedVariantIndex >= newVariants.length) setSelectedVariantIndex(newVariants.length - 1);
  };

  const handleVariantColorChange = (colorName: string) => {
      setVariants(prev => {
          const newVariants = [...prev];
          if (!newVariants[selectedVariantIndex]) return prev;
          const newStocks = newVariants[selectedVariantIndex].sizeStocks.map(s => ({...s, color: colorName}));
          newVariants[selectedVariantIndex].sizeStocks = newStocks;
          return newVariants;
      });
  };

  const handleSizeChange = (variantIndex: number, sizeIndex: number, field: keyof SizeStock, value: string | number) => {
    setVariants(prev => {
        const newVariants = [...prev];
        const newStocks = [...newVariants[variantIndex].sizeStocks];
        if (field === 'quantity') newStocks[sizeIndex].quantity = Number(value);
        else if (field === 'color') newStocks[sizeIndex].color = String(value);
        else if (field === 'sleeve') newStocks[sizeIndex].sleeve = String(value);
        else newStocks[sizeIndex].size = String(value);
        newVariants[variantIndex].sizeStocks = newStocks;
        return newVariants;
    });
  };

  const addSize = (variantIndex: number) => {
      setVariants(prev => {
          const newVariants = [...prev];
          if (!newVariants[variantIndex]) return prev;
          const existingColor = newVariants[variantIndex].sizeStocks[0]?.color || '';
          newVariants[variantIndex].sizeStocks.push({ size: '', quantity: 0, color: existingColor, sleeve: '' });
          return newVariants;
      });
  };

  const removeSize = (variantIndex: number, sizeIndex: number) => {
      setVariants(prev => {
          const newVariants = [...prev];
          newVariants[variantIndex].sizeStocks = newVariants[variantIndex].sizeStocks.filter((_, i) => i !== sizeIndex);
          return newVariants;
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) return;
    onSave({ name, category, price: Number(price), variants }, initialData?.id);
  };

  const currentVariant = variants[selectedVariantIndex] || variants[0];
  const currentColor = currentVariant?.sizeStocks?.[0]?.color;

  if (step === 1) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] p-6 h-[80vh] sm:h-auto overflow-y-auto shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black tamil-font">{t.selectCategoryFirst}</h2>
                 <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
              </div>
              <div className="grid grid-cols-1 gap-3 overflow-y-auto pb-4">
                 {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => handleCategorySelect(cat)} className="p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-100 rounded-2xl text-left font-bold text-gray-700 flex justify-between items-center transition">
                       {cat}
                       <ChevronRight size={18} className="text-gray-400" />
                    </button>
                 ))}
              </div>
           </div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] p-6 h-[90vh] sm:h-auto overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tamil-font">{initialData ? (language === 'ta' ? 'சரக்கு மாற்ற' : 'Edit Stock') : t.addStock}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
           <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl">
               <span className="text-xs font-black text-indigo-600 uppercase">{t.category}</span>
               <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-transparent text-sm font-bold text-gray-800 outline-none text-right w-[60%] truncate">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.itemName}</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Product Name" required />
           </div>
           <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ta' ? 'புகைப்படங்கள் (Photos)' : 'Photos'}</label>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-1">
                     <PlusCircle size={12} /> {language === 'ta' ? 'புகைப்படம் சேர்க்க' : 'Add Photo'}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
              </div>
              <div className="flex overflow-x-auto gap-2 py-2 scrollbar-hide snap-x">
                 {variants.map((variant, idx) => (
                    <div key={idx} onClick={() => setSelectedVariantIndex(idx)} className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 relative cursor-pointer transition snap-start ${selectedVariantIndex === idx ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'}`}>
                       {variant.imageUrl ? (<img src={variant.imageUrl} alt={`var-${idx}`} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300"><Camera size={24} /></div>)}
                       {variant.sizeStocks.reduce((acc,s)=>acc+s.quantity,0) > 0 && (<div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></div>)}
                       <button type="button" onClick={(e) => { e.stopPropagation(); removeVariant(idx); }} className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg"><X size={10} /></button>
                    </div>
                 ))}
              </div>
              {variants.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 relative z-20">
                     <div className="flex items-center gap-2 mb-2">
                        <Palette size={12} className="text-gray-400"/>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tamil-font">{language === 'ta' ? 'நிறத்தை தேர்ந்தெடுக்கவும்' : 'Select Color'}</p>
                     </div>
                     <button type="button" onClick={() => setShowColorList(!showColorList)} className="w-full bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between shadow-sm active:bg-gray-50 transition">
                        {currentColor ? (
                           <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: PREDEFINED_COLORS.find(c => c.name === currentColor)?.code }} />
                              <span className="font-bold text-gray-800 text-sm tamil-font">{currentColor}</span>
                           </div>
                        ) : (
                           <span className="text-gray-400 font-bold text-sm">{language === 'ta' ? 'நிறத்தை தேர்வு செய்' : 'Select a Color'}</span>
                        )}
                        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${showColorList ? 'rotate-180' : ''}`} />
                     </button>
                     {showColorList && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-50 p-2 animate-in fade-in slide-in-from-top-2">
                           {PREDEFINED_COLORS.map((c, i) => (
                               <button key={i} type="button" onClick={() => { handleVariantColorChange(c.name); setShowColorList(false); }} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                                   <div className="w-8 h-8 rounded-full border border-gray-200 shadow-sm flex-shrink-0" style={{ backgroundColor: c.code }} />
                                   <span className="font-bold text-gray-700 text-sm tamil-font flex-1 text-left">{c.name}</span>
                                   {currentColor === c.name && <Check size={16} className="text-green-500" />}
                               </button>
                           ))}
                        </div>
                     )}
                  </div>
              )}
           </div>
           
           <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex justify-between items-center mb-3">
                 <div className="flex items-center gap-2">
                     <p className="text-xs font-bold text-indigo-800 uppercase tamil-font">{language === 'ta' ? 'ஸ்டாக் விவரம்' : 'Stock Details'} <span className="text-indigo-400 ml-2">#{selectedVariantIndex + 1}</span></p>
                 </div>
                 <button type="button" onClick={() => addSize(selectedVariantIndex)} className="text-xs font-bold text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-sm"><PlusCircle size={14} className="inline mr-1" /> {language === 'ta' ? 'சேர்' : 'Add'}</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {currentVariant && currentVariant.sizeStocks && currentVariant.sizeStocks.map((ss, i) => (
                     <div key={i} className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm relative pr-8">
                        {category === 'ஆண்கள் ஆடை' && (
                           <>
                             <div className="flex-1 min-w-[90px]">
                                <select value={ss.sleeve || ''} onChange={e => handleSizeChange(selectedVariantIndex, i, 'sleeve', e.target.value)} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-200 appearance-none text-gray-900 placeholder-gray-400">
                                    <option value="" disabled>{t.sleeve}</option>
                                    <option value="Full Hand">{t.fullHand}</option>
                                    <option value="Half Hand">{t.halfHand}</option>
                                </select>
                             </div>
                             <div className="flex-1 min-w-[70px]">
                                <select value={ss.size || ''} onChange={e => handleSizeChange(selectedVariantIndex, i, 'size', e.target.value)} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-200 appearance-none text-gray-900 placeholder-gray-400">
                                    <option value="" disabled>{t.size}</option>
                                    {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                             </div>
                           </>
                        )}
                        {category !== 'ஆண்கள் ஆடை' && (
                            <div className="flex-[2]">
                                <input value={ss.size} onChange={e => handleSizeChange(selectedVariantIndex, i, 'size', e.target.value)} placeholder={language === 'ta' ? 'அளவு (Size)' : 'Size'} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-200 text-gray-900 placeholder-gray-400" />
                            </div>
                        )}
                        <div className="w-20">
                           <input type="number" value={ss.quantity} onChange={e => handleSizeChange(selectedVariantIndex, i, 'quantity', e.target.value)} placeholder="Qty" className="w-full bg-gray-50 p-2 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-200 text-center text-gray-900 placeholder-gray-400" />
                        </div>
                        {currentVariant.sizeStocks.length > 1 && (<button type="button" onClick={() => removeSize(selectedVariantIndex, i)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>)}
                     </div>
                  ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center tamil-font">{language === 'ta' ? 'மேலே உள்ள போட்டோவிற்கு மட்டும் இந்த ஸ்டாக் பொருந்தும்.' : 'This stock applies only to the selected photo above.'}</p>
           </div>
           
           <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                 <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.price}</label>
                 <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="0.00" required />
              </div>
           </div>
           <button className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 mt-4 active:scale-95 transition">{t.save}</button>
        </form>
      </div>
    </div>
  );
};

const AddTransactionModal: React.FC<{ onSave: (txn: Omit<Transaction, 'id' | 'date'>, id?: string, date?: number) => void; onClose: () => void; initialData?: Transaction; language: 'ta' | 'en'; t: any }> = ({ onSave, onClose, initialData, language, t }) => {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [partyName, setPartyName] = useState(initialData?.partyName || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    onSave({ type, amount: Number(amount), category, description, partyName: partyName.trim() }, initialData?.id, initialData?.date);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
       <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-black tamil-font">{initialData ? t.editTransaction : t.addTransaction}</h2>
             <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${type === 'INCOME' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>{t.income}</button>
                <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${type === 'EXPENSE' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>{t.expense}</button>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.partyName}</label>
                <div className="relative">
                   <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                   <input value={partyName} onChange={e => setPartyName(e.target.value)} className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="e.g. Raja, Kumar Stores" />
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.category}</label>
                <input list="txn_categories" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Category" required />
                <datalist id="txn_categories">
                   <option value="Sales" /> <option value="Purchase" /> <option value="Rent" /> <option value="Salary" /> <option value="Electricity" /> <option value="Tea & Snacks" /> <option value="Travel" />
                </datalist>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{language === 'ta' ? 'விளக்கம் (Optional)' : 'Description (Optional)'}</label>
                <input value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="..." />
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.amount}</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">₹</span>
                   <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-50 p-4 pl-10 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="0.00" required />
                </div>
             </div>
             <button className={`w-full text-white p-4 rounded-2xl font-black text-lg shadow-lg mt-4 active:scale-95 transition ${type === 'INCOME' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200'}`}>{t.save}</button>
          </form>
       </div>
    </div>
  );
};

export default App;
