
import React, { useState } from 'react';
import { User, StockItem, Transaction, BackupFrequency } from '../types';
import { LogOut, ShieldCheck, Download, FileSpreadsheet, HardDriveDownload, Globe, CheckCircle2, UploadCloud, Save, Cloud, Calendar, History, Settings, ToggleLeft, ToggleRight, Image, UserCircle2, X, AlertTriangle, Eraser, Trash2 } from 'lucide-react';

interface ProfileProps {
  user: User;
  updateUser: (u: User) => void;
  stocks: StockItem[];
  transactions: Transaction[];
  onLogout: () => void;
  onRestore: (data: any) => void;
  language: 'ta' | 'en';
  onLanguageChange: (lang: 'ta' | 'en') => void;
  onClearTransactions: () => void;
  onResetApp: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, updateUser, stocks, transactions, onLogout, onRestore, language, onLanguageChange, onClearTransactions, onResetApp }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [tempAccountInput, setTempAccountInput] = useState('');

  const downloadFile = (content: string, filename: string, type: string) => {
    try {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        console.error("Download failed:", e);
        alert(language === 'ta' ? 'பதிவிறக்கம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.' : 'Download failed. Please try again.');
    }
  };

  const exportStocks = () => {
    let csvContent = "ID,Name,Category,VariantID,Size,Quantity,Price,LastUpdated\n";
    stocks.forEach(item => {
      // Handle variants
      if (item.variants) {
          item.variants.forEach((variant, vIdx) => {
              variant.sizeStocks.forEach(ss => {
                  csvContent += `${item.id},"${item.name}",${item.category},"${vIdx + 1}","${ss.size}",${ss.quantity},${item.price},${new Date(item.lastUpdated).toISOString()}\n`;
              });
          });
      } else {
        // Fallback for old structure just in case
        csvContent += `${item.id},"${item.name}",${item.category},"Main","General",0,${item.price},${new Date(item.lastUpdated).toISOString()}\n`;
      }
    });
    downloadFile(csvContent, `Viyabaari_Stocks_${user.name}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportTransactions = () => {
    let csvContent = "ID,Date,Type,Amount,Category,Description\n";
    transactions.forEach(txn => {
      csvContent += `${txn.id},${new Date(txn.date).toISOString()},${txn.type},${txn.amount},${txn.category},"${txn.description}"\n`;
    });
    downloadFile(csvContent, `Viyabaari_Accounts_${user.name}.csv`, 'text/csv;charset=utf-8;');
  };

  const performBackup = () => {
    setIsBackingUp(true);
    
    // Use requestAnimationFrame to ensure UI updates before heavy JSON operation
    requestAnimationFrame(() => {
        setTimeout(() => {
          try {
              // Check if photos should be included
              const includePhotos = user.includePhotosInBackup !== false; // Default to true if undefined
              
              const stocksToSave = includePhotos 
                ? stocks 
                : stocks.map(s => ({ 
                    ...s, 
                    variants: s.variants.map(v => ({...v, imageUrl: ''})) 
                  })); // Remove images from variants if disabled

              const backup = {
                user: { ...user, backupEmail: user.backupEmail || user.email },
                stocks: stocksToSave,
                transactions,
                timestamp: Date.now(),
                backupType: 'full'
              };
              
              const backupAccount = user.backupEmail || user.email;
              const jsonString = JSON.stringify(backup, null, 2);
              
              downloadFile(jsonString, `Viyabaari_Backup_${backupAccount}_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
              
              // Update last backup time
              updateUser({
                ...user,
                lastBackupDate: Date.now()
              });
          } catch (e) {
              console.error("Backup generation failed:", e);
              alert(language === 'ta' ? 'பேக்கப் உருவாக்குவதில் பிழை ஏற்பட்டது. புகைப்படங்கள் இல்லாமல் முயற்சிக்கவும்.' : 'Error creating backup. Try disabling photos.');
          } finally {
              setIsBackingUp(false);
          }
        }, 500); // Small delay to show "Backing up..." state
    });
  };

  const updateFrequency = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUser({
      ...user,
      backupFrequency: e.target.value as BackupFrequency
    });
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

  const formatLastBackup = (timestamp?: number) => {
    if (!timestamp) return language === 'ta' ? 'இன்னும் இல்லை' : 'Never';
    return new Date(timestamp).toLocaleString(language, {
       hour: 'numeric', minute: 'numeric', day: 'numeric', month: 'short'
    });
  };

  // Calculate approximate backup size
  const currentStocksSize = user.includePhotosInBackup !== false ? stocks : stocks.map(s => ({
      ...s, 
      variants: s.variants.map(v => ({...v, imageUrl: ''}))
  }));
  const dataSize = JSON.stringify({ user, stocks: currentStocksSize, transactions }).length;
  const sizeString = dataSize > 1024 * 1024 ? `${(dataSize / (1024 * 1024)).toFixed(2)} MB` : dataSize > 1024 ? `${(dataSize / 1024).toFixed(2)} KB` : `${dataSize} Bytes`;

  return (
    <div className="p-4 space-y-6 pb-28">
      {/* User Profile Header */}
      <div className="bg-white rounded-[2.5rem] p-8 text-center shadow-lg relative overflow-hidden border border-indigo-50">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <ShieldCheck size={140} className="text-indigo-900" />
        </div>
        <div className="relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full mx-auto flex items-center justify-center text-white mb-4 shadow-2xl border-4 border-white">
             <span className="text-3xl font-black">{user.name[0].toUpperCase()}</span>
          </div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">{user.name}</h2>
          <p className="text-sm text-indigo-400 font-bold mb-4">{user.email}</p>
          <div className="flex justify-center">
             <div className="px-4 py-2 bg-green-500 text-white rounded-full text-[10px] font-black flex items-center gap-2 shadow-lg shadow-green-100">
                <CheckCircle2 size={14}/> {language === 'ta' ? 'கணக்கு பாதுகாப்பானது' : 'Account Secured'}
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Language Selection */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <Globe size={22} className="text-indigo-600" />
            <h3 className="font-black text-lg tamil-font text-gray-800">
              {language === 'ta' ? 'மொழியை மாற்றவும்' : 'Change Language'}
            </h3>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => onLanguageChange('ta')} 
              className={`flex-1 py-4 rounded-xl font-black transition-all ${language === 'ta' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              தமிழ்
            </button>
            <button 
              onClick={() => onLanguageChange('en')} 
              className={`flex-1 py-4 rounded-xl font-black transition-all ${language === 'en' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              English
            </button>
          </div>
        </div>

        {/* WhatsApp Style Backup Section */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-md border border-gray-100 space-y-6">
           <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
             <div className="bg-green-100 p-2 rounded-xl text-green-600">
                <Cloud size={24} />
             </div>
             <div>
               <h3 className="font-black text-xl tamil-font text-gray-800">
                 {language === 'ta' ? 'தரவு பாதுகாப்பு' : 'Data Backup'}
               </h3>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Backup & Restore</p>
             </div>
           </div>

           <div className="space-y-2">
              <div className="flex items-start gap-3">
                 <History size={16} className="text-gray-400 mt-1" />
                 <div>
                    <p className="text-xs text-gray-500 font-bold tamil-font">{language === 'ta' ? 'கடைசியாக சேமித்தது:' : 'Last Backup:'}</p>
                    <p className="text-sm font-black text-gray-800">{formatLastBackup(user.lastBackupDate)}</p>
                 </div>
              </div>
              <div className="flex items-start gap-3">
                 <div className="w-4"></div>
                 <div>
                    <p className="text-xs text-gray-500 font-bold tamil-font">{language === 'ta' ? 'மொத்த அளவு:' : 'Total Size:'}</p>
                    <p className="text-sm font-black text-gray-800">{sizeString}</p>
                 </div>
              </div>
           </div>

           <button 
             onClick={performBackup} 
             disabled={isBackingUp}
             className="w-full bg-[#25D366] text-white p-4 rounded-2xl font-black text-sm shadow-lg shadow-green-100 hover:bg-[#20bd5a] transition active:scale-95 flex justify-center items-center gap-2"
           >
              {isBackingUp ? (
                 <span className="animate-pulse">{language === 'ta' ? 'ஏற்றப்படுகிறது...' : 'Backing up...'}</span>
              ) : (
                 <>{language === 'ta' ? 'பேக்கப் (BACK UP)' : 'BACK UP'}</>
              )}
           </button>

           <div className="pt-2 space-y-4">
              {/* Account Selection (Clickable) */}
              <button onClick={() => setShowAccountModal(true)} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl w-full hover:bg-gray-100 transition text-left">
                 <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                       <img src="https://cdn-icons-png.flaticon.com/512/300/300221.png" className="w-5 h-5 opacity-80" alt="Google" />
                    </div>
                    <div>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{language === 'ta' ? 'கணக்கு' : 'Google Account'}</p>
                       <p className="text-xs font-black text-gray-700">{user.backupEmail || user.email}</p>
                    </div>
                 </div>
                 <Settings size={16} className="text-gray-400" />
              </button>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                 <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-gray-400" />
                    <div>
                       <p className="text-xs font-black text-gray-700 tamil-font">{language === 'ta' ? 'பேக்கப் நினைவூட்டல்' : 'Back up frequency'}</p>
                    </div>
                 </div>
                 <select 
                    value={user.backupFrequency || 'weekly'} 
                    onChange={updateFrequency}
                    className="bg-transparent text-xs font-bold text-indigo-600 outline-none cursor-pointer text-right"
                 >
                    <option value="daily">{language === 'ta' ? 'தினசரி' : 'Daily'}</option>
                    <option value="weekly">{language === 'ta' ? 'வாரம் ஒருமுறை' : 'Weekly'}</option>
                    <option value="monthly">{language === 'ta' ? 'மாதம் ஒருமுறை' : 'Monthly'}</option>
                    <option value="never">{language === 'ta' ? 'வேண்டாம்' : 'Never'}</option>
                 </select>
              </div>

              {/* Include Photos Toggle */}
              <button 
                 onClick={() => updateUser({...user, includePhotosInBackup: user.includePhotosInBackup === false ? true : false})}
                 className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl w-full"
              >
                  <div className="flex items-center gap-3">
                      <Image size={18} className="text-gray-400" />
                      <div>
                         <p className="text-xs font-black text-gray-700 tamil-font">{language === 'ta' ? 'படங்களை சேர்க்கவும்' : 'Include Photos'}</p>
                         <p className="text-[10px] text-gray-400 font-bold">{language === 'ta' ? 'மொத்த அளவு அதிகரிக்கும்' : 'Increases backup size'}</p>
                      </div>
                  </div>
                  <div className={`transition-colors ${user.includePhotosInBackup !== false ? 'text-green-500' : 'text-gray-300'}`}>
                      {user.includePhotosInBackup !== false ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </div>
              </button>
              
              <div className="border-t border-gray-100 pt-4">
                 <label className="flex items-center justify-center gap-2 w-full p-4 border border-indigo-100 text-indigo-600 rounded-2xl font-bold text-xs cursor-pointer hover:bg-indigo-50 transition">
                    <UploadCloud size={16} />
                    <span>{language === 'ta' ? 'பேக்கப் ஃபைலை மீட்டெடுக்க (Restore)' : 'Restore from Backup File'}</span>
                    <input type="file" onChange={handleFileRestore} accept=".json" className="hidden" />
                 </label>
              </div>
           </div>
        </div>

        {/* Export Excel Reports */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100 space-y-4">
          <div className="flex items-center gap-3 px-1 border-b border-gray-100 pb-3">
             <HardDriveDownload size={22} className="text-gray-400" />
             <h3 className="font-bold text-gray-600 tamil-font">Excel Reports</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={exportStocks} 
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-colors group"
            >
              <div className="bg-white p-3 rounded-xl shadow-sm text-indigo-600 group-hover:text-indigo-700">
                 <FileSpreadsheet size={20} />
              </div>
              <span className="font-bold text-gray-700 text-sm">
                {language === 'ta' ? 'சரக்கு பட்டியல் (Excel)' : 'Inventory Stock (Excel)'}
              </span>
            </button>
            
            <button 
              onClick={exportTransactions} 
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-green-50 transition-colors group"
            >
              <div className="bg-white p-3 rounded-xl shadow-sm text-green-600 group-hover:text-green-700">
                 <Download size={20} />
              </div>
              <span className="font-bold text-gray-700 text-sm">
                {language === 'ta' ? 'வரவு செலவு (Excel)' : 'Account Ledger (Excel)'}
              </span>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-[2.5rem] p-6 shadow-sm border border-red-100 space-y-4">
           <div className="flex items-center gap-3 px-1 border-b border-red-200/50 pb-3">
             <div className="bg-red-100 p-2 rounded-xl text-red-600">
                <AlertTriangle size={20} />
             </div>
             <h3 className="font-black text-lg tamil-font text-red-800">
               {language === 'ta' ? 'கவனிக்கவும்' : 'Danger Zone'}
             </h3>
           </div>
           
           <button 
             onClick={() => {
                if(window.confirm(language === 'ta' ? 'நிச்சயமாக அனைத்து கணக்குகளையும் அழிக்கவா?' : 'Are you sure you want to clear all transactions?')) {
                    onClearTransactions();
                }
             }}
             className="w-full bg-white p-4 rounded-2xl font-bold text-red-500 shadow-sm border border-red-100 hover:bg-red-50 transition flex items-center justify-between"
           >
              <span className="text-xs tamil-font">{language === 'ta' ? 'கணக்குகளை மட்டும் அழிக்க' : 'Clear Transactions Only'}</span>
              <Eraser size={16} />
           </button>

           <button 
             onClick={() => {
                if(window.confirm(language === 'ta' ? 'நிச்சயமாக எல்லாவற்றையும் அழிக்கவா? இதை மாற்ற முடியாது.' : 'Factory Reset? This cannot be undone.')) {
                    onResetApp();
                }
             }}
             className="w-full bg-red-600 p-4 rounded-2xl font-black text-white shadow-lg shadow-red-200 hover:bg-red-700 transition flex items-center justify-between"
           >
              <span className="text-xs tamil-font">{language === 'ta' ? 'மொத்தமாக அழிக்க (Reset App)' : 'Factory Reset App'}</span>
              <Trash2 size={16} />
           </button>
        </div>

        {/* Logout Button */}
        <button 
          onClick={onLogout} 
          className="w-full bg-red-50 p-6 rounded-[1.5rem] shadow-sm flex items-center justify-center gap-4 text-red-600 font-black border border-red-100 hover:bg-red-100 transition active:scale-[0.98]"
        >
          <LogOut size={24} />
          <span className="uppercase tracking-widest text-sm">{language === 'ta' ? 'வெளியேறவும்' : 'Logout'}</span>
        </button>
      </div>

      {/* Account Selection Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="font-black text-lg text-gray-800 tamil-font">{language === 'ta' ? 'கணக்கை தேர்வு செய்க' : 'Choose an Account'}</h3>
                 <button onClick={() => setShowAccountModal(false)} className="p-2 bg-gray-100 rounded-full"><X size={16}/></button>
              </div>
              
              <div className="space-y-2">
                 {/* Default Account */}
                 <button onClick={() => { updateUser({...user, backupEmail: user.email}); setShowAccountModal(false); }} className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 transition ${!user.backupEmail || user.backupEmail === user.email ? 'border-green-500 bg-green-50' : 'border-transparent bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">{user.email[0].toUpperCase()}</div>
                    <div className="text-left">
                       <p className="font-bold text-sm text-gray-900">{user.email}</p>
                       <p className="text-[10px] text-gray-500">Device Account</p>
                    </div>
                    {(!user.backupEmail || user.backupEmail === user.email) && <CheckCircle2 size={20} className="ml-auto text-green-500" />}
                 </button>

                 {/* Selected Custom Account (if any) */}
                 {user.backupEmail && user.backupEmail !== user.email && (
                    <button onClick={() => setShowAccountModal(false)} className="flex items-center gap-3 w-full p-4 rounded-xl border-2 border-green-500 bg-green-50">
                       <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">{user.backupEmail[0].toUpperCase()}</div>
                       <div className="text-left">
                          <p className="font-bold text-sm text-gray-900">{user.backupEmail}</p>
                          <p className="text-[10px] text-gray-500">Backup Account</p>
                       </div>
                       <CheckCircle2 size={20} className="ml-auto text-green-500" />
                    </button>
                 )}

                 <div className="border-t pt-4 mt-2">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">{language === 'ta' ? 'வேறு கணக்கை சேர்க்க' : 'Add another account'}</p>
                    <div className="flex gap-2">
                       <input 
                         value={tempAccountInput}
                         onChange={(e) => setTempAccountInput(e.target.value)}
                         placeholder="email@example.com"
                         className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400"
                       />
                       <button 
                         onClick={() => { 
                           if(tempAccountInput) {
                             updateUser({...user, backupEmail: tempAccountInput}); 
                             setTempAccountInput('');
                             setShowAccountModal(false); 
                           }
                         }} 
                         className="bg-indigo-600 text-white px-4 rounded-xl font-bold text-sm"
                       >
                         {language === 'ta' ? 'சேர்' : 'Add'}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
