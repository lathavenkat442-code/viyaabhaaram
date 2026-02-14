
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StockItem, Transaction, User, TransactionType, SizeStock, StockVariant } from './types';
import { TRANSLATIONS, CATEGORIES, PREDEFINED_COLORS, SHIRT_SIZES } from './constants';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Accounting from './components/Accounting';
import Profile from './components/Profile';
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
  AlertTriangle
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
    
    const savedLang = localStorage.getItem('viyabaari_lang');
    if (savedLang === 'ta' || savedLang === 'en') {
      setLanguage(savedLang);
    }
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

  useEffect(() => {
    const savedUser = localStorage.getItem('viyabaari_active_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      try {
        const savedStocks = localStorage.getItem(`viyabaari_stocks_${user.email}`);
        const savedTxns = localStorage.getItem(`viyabaari_txns_${user.email}`);
        
        let parsedStocks: StockItem[] = savedStocks ? JSON.parse(savedStocks) : [];
        
        // MIGRATION: Convert old structure to new Variants structure
        parsedStocks = parsedStocks.map(s => {
          if (!s.variants || s.variants.length === 0) {
             const variants: StockVariant[] = [];
             if (s.imageUrl) {
               variants.push({
                 id: Date.now().toString() + 'main',
                 imageUrl: s.imageUrl,
                 sizeStocks: (s as any).sizeStocks || []
               });
             }
             if (s.moreImages) {
               s.moreImages.forEach((img, idx) => {
                 variants.push({
                   id: Date.now().toString() + idx,
                   imageUrl: img,
                   sizeStocks: [] 
                 });
               });
             }
             if (variants.length === 0) {
                variants.push({
                  id: Date.now().toString(),
                  imageUrl: '',
                  sizeStocks: (s as any).sizeStocks || [{ size: 'General', quantity: 0 }]
                });
             }
             return { ...s, variants };
          }
          const safeVariants = s.variants.map(v => ({
             ...v,
             sizeStocks: v.sizeStocks || [{ size: 'General', quantity: 0 }]
          }));
          return { ...s, variants: safeVariants };
        });

        setStocks(parsedStocks);
        setTransactions(savedTxns ? JSON.parse(savedTxns) : []);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(`viyabaari_stocks_${user.email}`, JSON.stringify(stocks));
      } catch (e) {
        console.error("LocalStorage Save Failed (Stocks)", e);
        if ((e as any).name === 'QuotaExceededError') {
           alert(language === 'ta' ? 'மெமரி நிரம்பிவிட்டது. சில படங்களை நீக்கவும்.' : 'Storage full. Please delete some items or photos.');
        }
      }
    }
  }, [stocks, user, language]);

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(`viyabaari_txns_${user.email}`, JSON.stringify(transactions));
      } catch (e) {
        console.error("LocalStorage Save Failed (Txns)", e);
      }
    }
  }, [transactions, user]);

  const saveStock = (itemData: Omit<StockItem, 'id' | 'lastUpdated'>, id?: string) => {
    const sanitizedVariants = itemData.variants.map(v => ({
        ...v,
        sizeStocks: v.sizeStocks || [{ size: 'General', quantity: 0 }]
    }));
    const sanitizedItemData = { ...itemData, variants: sanitizedVariants };

    if (id) {
      setStocks(prev => prev.map(s => s.id === id ? { ...sanitizedItemData, id, lastUpdated: Date.now() } : s));
    } else {
      const newItem: StockItem = {
        ...sanitizedItemData,
        id: Date.now().toString(),
        lastUpdated: Date.now(),
      };
      setStocks(prev => [newItem, ...prev]);
    }
    setIsAddingStock(false);
    setEditingStock(null);
  };

  // Triggered from Inventory Component
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

  const executeSecurityAction = () => {
     if (!securityAction) return;
     
     if (securityAction.type === 'DELETE_STOCK') {
         setStocks(prev => prev.filter(s => s.id !== securityAction.payload));
     } else if (securityAction.type === 'CLEAR_TXNS') {
         setTransactions([]);
     } else if (securityAction.type === 'RESET_APP') {
         setStocks([]);
         setTransactions([]);
     }
     
     setSecurityAction(null);
     setSecurityOtp('');
  };

  const saveTransaction = (txnData: Omit<Transaction, 'id' | 'date'>, id?: string, date?: number) => {
    if (id && date) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...txnData, id, date } : t));
    } else {
        const newTxn: Transaction = { ...txnData, id: Date.now().toString(), date: Date.now() };
        setTransactions(prev => [newTxn, ...prev]);
    }
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
    
    const users = JSON.parse(localStorage.getItem('viyabaari_users') || '[]');
    const newUsers = users.map((u: any) => u.email === updatedUser.email ? updatedUser : u);
    localStorage.setItem('viyabaari_users', JSON.stringify(newUsers));
  };

  const handleLogout = () => {
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
      const users = JSON.parse(localStorage.getItem('viyabaari_users') || '[]');
      const userExists = users.some((u: any) => u.email === data.user.email);
      if (!userExists) {
        users.push(data.user);
        localStorage.setItem('viyabaari_users', JSON.stringify(users));
      }
      
      const importedTransactions = Array.isArray(data.transactions) ? data.transactions : [];

      localStorage.setItem(`viyabaari_stocks_${data.user.email}`, JSON.stringify(data.stocks));
      localStorage.setItem(`viyabaari_txns_${data.user.email}`, JSON.stringify(importedTransactions));
      
      handleLogin(data.user);
      setStocks(data.stocks);
      setTransactions(importedTransactions);
      alert(language === 'ta' ? 'தரவு வெற்றிகரமாக மீட்டெடுக்கப்பட்டது!' : 'Data restored successfully!');
    } else {
      alert(language === 'ta' ? 'தவறான கோப்பு (Invalid File)' : 'Invalid backup file structure');
    }
  };

  const lowStockCount = useMemo(() => {
    return stocks.filter(s => s.variants?.some(v => v.sizeStocks?.some(ss => ss.quantity < 5))).length;
  }, [stocks]);

  const t = TRANSLATIONS[language];

  if (!user) {
    return <AuthScreen onLogin={handleLogin} onRestore={handleRestoreData} language={language} t={t} />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col shadow-xl">
      {/* ... (Existing Installation Banner and Header) ... */}
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

      <header className="bg-indigo-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold tamil-font">{t.appName}</h1>
          <div className="flex gap-4">
            <button onClick={() => { setEditingStock(null); setIsAddingStock(true); }} className="hover:bg-indigo-500 p-1 rounded-full transition">
              <PlusCircle size={22} />
            </button>
            <button onClick={() => { setEditingTransaction(null); setIsAddingTransaction(true); }} className="hover:bg-indigo-500 p-1 rounded-full transition">
              <ArrowLeftRight size={22} />
            </button>
          </div>
        </div>
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

const AuthScreen: React.FC<{ onLogin: (u: User) => void; onRestore: (d: any) => void; language: 'ta' | 'en'; t: any }> = ({ onLogin, onRestore, language, t }) => {
    // ... [Content of AuthScreen] ...
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [step, setStep] = useState<'INPUT' | 'OTP'>('INPUT');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [loginId, setLoginId] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [inputOtp, setInputOtp] = useState('');
    const [otpNotification, setOtpNotification] = useState<string | null>(null);
    const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  
    const handleRegisterAttempt = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !email || !password || !mobile) return;
      const users = JSON.parse(localStorage.getItem('viyabaari_users') || '[]');
      if (users.find((u: any) => u.email === email)) {
          alert(language === 'ta' ? 'இந்த பயனர் ஏற்கனவே உள்ளார்' : 'User already exists');
          return;
      }
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(otp);
      setOtpNotification(otp); // This shows the green box in UI
      setStep('OTP');
      
      // Removed the alert() call which was causing issues
    };
  
    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputOtp === generatedOtp) {
            const newUser: User = { email, name, mobile, isLoggedIn: true, password };
            const users = JSON.parse(localStorage.getItem('viyabaari_users') || '[]');
            users.push(newUser);
            localStorage.setItem('viyabaari_users', JSON.stringify(users));
            onLogin(newUser);
        } else {
            alert(t.invalidOtp);
        }
    };
    
    const handleCancelOtp = () => {
        setStep('INPUT');
        setOtpNotification(null);
        setInputOtp('');
    };
  
    const handleLoginAttempt = (e: React.FormEvent) => {
        e.preventDefault();
        const users = JSON.parse(localStorage.getItem('viyabaari_users') || '[]');
        const user = users.find((u: any) => (u.email === loginId || u.mobile === loginId) && u.password === password);
        if (user) {
          onLogin({ ...user, isLoggedIn: true });
        } else {
          const userExists = users.some((u: any) => u.email === loginId || u.mobile === loginId);
          if (!userExists) {
              setShowNotFoundModal(true);
          } else {
              alert(t.loginFailed);
          }
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
  
    const switchToRegister = () => {
        setShowNotFoundModal(false);
        setMode('REGISTER');
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
      // Reset input value so same file can be selected again
      e.target.value = '';
    };
  
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white relative">
         <h1 className="text-4xl font-black tamil-font mb-2 text-center">{t.appName}</h1>
         <p className="text-indigo-200 mb-8 text-sm opacity-80">{t.syncNotice}</p>
         
         <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-gray-800 shadow-2xl">
            {step === 'INPUT' && (
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
  
            {step === 'INPUT' ? (
                <form onSubmit={mode === 'REGISTER' ? handleRegisterAttempt : handleLoginAttempt} className="space-y-4">
                  {mode === 'REGISTER' ? (
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
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                          <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition" required />
                          </div>
                      </div>
                      </>
                  ) : (
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t.emailOrMobile}</label>
                          <div className="relative">
                              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                              <input 
                                  type="text" 
                                  value={loginId} 
                                  onChange={e => setLoginId(e.target.value)} 
                                  className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition" 
                                  required 
                              />
                          </div>
                      </div>
                  )}
                  
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
  
                  <button className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-indigo-200 mt-6 active:scale-95 transition">
                      {mode === 'LOGIN' ? (language === 'ta' ? 'உள்நுழைய' : 'Login') : t.sendOtp}
                  </button>
                </form>
            ) : (
               <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-right">
                   <div className="text-center">
                      <ShieldCheck size={48} className="mx-auto text-indigo-500 mb-2" />
                      <h3 className="font-bold text-lg text-gray-800">{t.otp}</h3>
                      <p className="text-xs text-gray-400">Sent to {mobile} / {email}</p>
                   </div>
                   
                   {otpNotification && (
                      <div className="bg-green-100 border border-green-200 text-green-800 p-3 rounded-xl mb-4 text-center animate-pulse">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-1">{language === 'ta' ? 'உங்கள் OTP குறியீடு' : 'Your OTP Code'}</p>
                          <p className="text-3xl font-black tracking-[0.2em]">{otpNotification}</p>
                          <p className="text-[9px] text-green-500 mt-1">(Simulated for Demo)</p>
                      </div>
                   )}
                   
                   <div className="space-y-1">
                      <input type="number" value={inputOtp} onChange={e => setInputOtp(e.target.value)} className="w-full bg-gray-50 p-4 text-center rounded-2xl font-black text-2xl tracking-widest text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 transition" placeholder="####" autoFocus required />
                   </div>
  
                   <button className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition">
                       {t.verify}
                   </button>
                   <button type="button" onClick={handleCancelOtp} className="w-full text-gray-400 text-xs font-bold hover:text-gray-600 p-2">
                      {t.cancel}
                   </button>
               </form>
            )}
  
            {step === 'INPUT' && (
              <>
                <div className="mt-4 pt-2 border-t border-gray-100 text-center">
                    <button onClick={handleSkipLogin} className="text-indigo-500 font-bold text-xs hover:text-indigo-700 transition flex items-center justify-center gap-1 w-full py-2">
                        <UserX size={14} />
                        {t.skipLogin}
                    </button>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100">
                    <label className="flex items-center justify-center gap-2 w-full p-4 border border-dashed border-gray-300 text-gray-400 rounded-2xl font-bold text-xs cursor-pointer hover:bg-gray-50 transition">
                        <UploadCloud size={16} />
                        <span>{language === 'ta' ? 'பேக்கப் ஃபைலை மீட்டெடுக்க' : 'Restore from Backup File'}</span>
                        <input type="file" onChange={handleFileRestore} accept=".json" className="hidden" />
                    </label>
                </div>
              </>
            )}
         </div>
  
         {showNotFoundModal && (
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm z-50 animate-in fade-in">
                 <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm text-center shadow-2xl">
                     <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                         <AlertCircle size={32} />
                     </div>
                     <h3 className="text-xl font-black text-gray-800 mb-2 tamil-font">{t.accountNotFound}</h3>
                     <p className="text-gray-500 text-sm mb-6 tamil-font">{t.createAsk}</p>
                     <div className="flex gap-3">
                         <button onClick={() => setShowNotFoundModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">{t.no}</button>
                         <button onClick={switchToRegister} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition">{t.yes}</button>
                     </div>
                 </div>
             </div>
         )}
      </div>
    );
  };

const AddStockModal: React.FC<{ onSave: (item: Omit<StockItem, 'id' | 'lastUpdated'>, id?: string) => void; onClose: () => void; initialData?: StockItem; language: 'ta' | 'en'; t: any }> = ({ onSave, onClose, initialData, language, t }) => {
  const [step, setStep] = useState<1 | 2>(initialData ? 2 : 1);
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [showColorList, setShowColorList] = useState(false);
  
  // Variants State
  const [variants, setVariants] = useState<StockVariant[]>(initialData?.variants || []);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with one empty variant if none exist (only in step 2 if new)
  useEffect(() => {
    if (step === 2 && variants.length === 0) {
        // Initial setup for specific categories might look different, but structure is same
        setVariants([{ id: Date.now().toString(), imageUrl: '', sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }] }]);
    }
  }, [step]);

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    setStep(2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      
      const newVariants: StockVariant[] = [];
      
      // If the current first variant is empty (no image), replace it with the first file
      let startIndex = 0;
      if (variants.length === 1 && !variants[0].imageUrl) {
         const reader = new FileReader();
         reader.onloadend = () => {
             setVariants(prev => {
                 const updated = [...prev];
                 updated[0].imageUrl = reader.result as string;
                 return updated;
             });
         };
         reader.readAsDataURL(files[0]);
         startIndex = 1;
      }
      
      const remainingSlots = 10 - variants.length;
      const filesToProcess = files.slice(startIndex, startIndex + remainingSlots);

      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setVariants(prev => [...prev, {
                id: Date.now().toString() + Math.random(),
                imageUrl: reader.result as string,
                sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }]
            }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
        // Just clear the image if it's the last one
        setVariants(prev => [{ ...prev[0], imageUrl: '', sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }] }]);
        return;
    }
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
    if (selectedVariantIndex >= newVariants.length) {
        setSelectedVariantIndex(newVariants.length - 1);
    }
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
        if (field === 'quantity') {
            newStocks[sizeIndex].quantity = Number(value);
        } else if (field === 'color') {
            newStocks[sizeIndex].color = String(value);
        } else if (field === 'sleeve') {
            newStocks[sizeIndex].sleeve = String(value);
        } else {
            newStocks[sizeIndex].size = String(value);
        }
        newVariants[variantIndex].sizeStocks = newStocks;
        return newVariants;
    });
  };

  const addSize = (variantIndex: number) => {
      setVariants(prev => {
          const newVariants = [...prev];
          if (!newVariants[variantIndex]) return prev;
          // Inherit color from the first item if it exists, to keep consistency
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

  // Render Category Selection Step
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
                    <button 
                       key={cat} 
                       onClick={() => handleCategorySelect(cat)}
                       className="p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-100 rounded-2xl text-left font-bold text-gray-700 flex justify-between items-center transition"
                    >
                       {cat}
                       <ChevronRight size={18} className="text-gray-400" />
                    </button>
                 ))}
              </div>
           </div>
        </div>
    );
  }

  // Render Details Form Step
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] p-6 h-[90vh] sm:h-auto overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tamil-font">{initialData ? (language === 'ta' ? 'சரக்கு மாற்ற' : 'Edit Stock') : t.addStock}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
           {/* Header Info */}
           <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl">
               <span className="text-xs font-black text-indigo-600 uppercase">{t.category}</span>
               <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-800 outline-none text-right w-[60%] truncate"
               >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
           </div>

           <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.itemName}</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Product Name" required />
           </div>

           {/* Image Carousel Selection */}
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
                    <div 
                        key={idx} 
                        onClick={() => setSelectedVariantIndex(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 relative cursor-pointer transition snap-start ${selectedVariantIndex === idx ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'}`}
                    >
                       {variant.imageUrl ? (
                           <img src={variant.imageUrl} alt={`var-${idx}`} className="w-full h-full object-cover" />
                       ) : (
                           <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                               <Camera size={24} />
                           </div>
                       )}
                       {variant.sizeStocks.reduce((acc,s)=>acc+s.quantity,0) > 0 && (
                           <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                       )}
                       <button type="button" onClick={(e) => { e.stopPropagation(); removeVariant(idx); }} className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg">
                          <X size={10} />
                       </button>
                    </div>
                 ))}
              </div>

              {/* Color Selection Palette - Modified to Dropdown */}
              {variants.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 relative z-20">
                     <div className="flex items-center gap-2 mb-2">
                        <Palette size={12} className="text-gray-400"/>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tamil-font">{language === 'ta' ? 'நிறத்தை தேர்ந்தெடுக்கவும்' : 'Select Color'}</p>
                     </div>
                     
                     <button 
                        type="button" 
                        onClick={() => setShowColorList(!showColorList)}
                        className="w-full bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between shadow-sm active:bg-gray-50 transition"
                     >
                        {currentColor ? (
                           <div className="flex items-center gap-3">
                              <div 
                                className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                                style={{ 
                                    backgroundColor: PREDEFINED_COLORS.find(c => c.name === currentColor)?.code 
                                }}
                              />
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
                               <button
                                   key={i}
                                   type="button"
                                   onClick={() => { handleVariantColorChange(c.name); setShowColorList(false); }}
                                   className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                               >
                                   <div 
                                      className="w-8 h-8 rounded-full border border-gray-200 shadow-sm flex-shrink-0"
                                      style={{ backgroundColor: c.code }}
                                   />
                                   <span className="font-bold text-gray-700 text-sm tamil-font flex-1 text-left">{c.name}</span>
                                   {currentColor === c.name && <Check size={16} className="text-green-500" />}
                               </button>
                           ))}
                        </div>
                     )}
                  </div>
              )}
           </div>
           
           {/* Dynamic Stock Entry for Selected Variant */}
           <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex justify-between items-center mb-3">
                 <div className="flex items-center gap-2">
                     <p className="text-xs font-bold text-indigo-800 uppercase tamil-font">
                        {language === 'ta' ? 'ஸ்டாக் விவரம்' : 'Stock Details'} 
                        <span className="text-indigo-400 ml-2">#{selectedVariantIndex + 1}</span>
                     </p>
                 </div>
                 <button type="button" onClick={() => addSize(selectedVariantIndex)} className="text-xs font-bold text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">
                    <PlusCircle size={14} className="inline mr-1" /> {language === 'ta' ? 'சேர்' : 'Add'}
                 </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {currentVariant && currentVariant.sizeStocks && currentVariant.sizeStocks.map((ss, i) => (
                     <div key={i} className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm relative pr-8">
                        
                        {/* Logic for Men's Wear (Mapped from old Dhoti Shirt Combo) */}
                        {category === 'ஆண்கள் ஆடை' && (
                           <>
                             {/* Sleeve Selection */}
                             <div className="flex-1 min-w-[90px]">
                                <select value={ss.sleeve || ''} onChange={e => handleSizeChange(selectedVariantIndex, i, 'sleeve', e.target.value)} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-200 appearance-none text-gray-900 placeholder-gray-400">
                                    <option value="" disabled>{t.sleeve}</option>
                                    <option value="Full Hand">{t.fullHand}</option>
                                    <option value="Half Hand">{t.halfHand}</option>
                                </select>
                             </div>
                             {/* Shirt Size Dropdown */}
                             <div className="flex-1 min-w-[70px]">
                                <select value={ss.size || ''} onChange={e => handleSizeChange(selectedVariantIndex, i, 'size', e.target.value)} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-200 appearance-none text-gray-900 placeholder-gray-400">
                                    <option value="" disabled>{t.size}</option>
                                    {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                             </div>
                           </>
                        )}

                        {/* Default Logic for others (Women's Wear, Tops) */}
                        {category !== 'ஆண்கள் ஆடை' && (
                            <div className="flex-[2]">
                                <input value={ss.size} onChange={e => handleSizeChange(selectedVariantIndex, i, 'size', e.target.value)} placeholder={language === 'ta' ? 'அளவு (Size)' : 'Size'} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-200 text-gray-900 placeholder-gray-400" />
                            </div>
                        )}

                        {/* Quantity (Common for all) */}
                        <div className="w-20">
                           <input type="number" value={ss.quantity} onChange={e => handleSizeChange(selectedVariantIndex, i, 'quantity', e.target.value)} placeholder="Qty" className="w-full bg-gray-50 p-2 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-200 text-center text-gray-900 placeholder-gray-400" />
                        </div>

                        {/* Remove Row Button */}
                        {currentVariant.sizeStocks.length > 1 && (
                            <button type="button" onClick={() => removeSize(selectedVariantIndex, i)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                                <Trash2 size={14}/>
                            </button>
                        )}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    onSave({ 
        type, 
        amount: Number(amount), 
        category, 
        description 
    }, initialData?.id, initialData?.date);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
       <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-black tamil-font">{initialData ? t.editTransaction : t.addTransaction}</h2>
             <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             {/* Type Toggle */}
             <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${type === 'INCOME' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>
                   {t.income}
                </button>
                <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${type === 'EXPENSE' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>
                   {t.expense}
                </button>
             </div>

             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.category}</label>
                <input list="txn_categories" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Category" required />
                <datalist id="txn_categories">
                   <option value="Sales" />
                   <option value="Purchase" />
                   <option value="Rent" />
                   <option value="Salary" />
                   <option value="Electricity" />
                   <option value="Tea & Snacks" />
                   <option value="Travel" />
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

             <button className={`w-full text-white p-4 rounded-2xl font-black text-lg shadow-lg mt-4 active:scale-95 transition ${type === 'INCOME' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200'}`}>
                {t.save}
             </button>
          </form>
       </div>
    </div>
  );
};

export default App;
