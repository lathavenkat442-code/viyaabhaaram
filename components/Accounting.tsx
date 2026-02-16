
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { TRANSLATIONS } from '../constants';
import { TrendingUp, TrendingDown, Edit2, Eraser, Calendar, Search, ArrowUpCircle, ArrowDownCircle, XCircle, Users, ChevronRight, User } from 'lucide-react';

interface AccountingProps {
  transactions: Transaction[];
  language: 'ta' | 'en';
  onEdit: (txn: Transaction) => void;
  onClear: () => void;
}

const Accounting: React.FC<AccountingProps> = ({ transactions, language, onEdit, onClear }) => {
  const t = TRANSLATIONS[language];
  const [viewMode, setViewMode] = useState<'LIST' | 'LEDGER'>('LIST');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate Summary (Based on ALL transactions to show true status)
  const summary = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
    const exp = transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
    return { income: inc, expense: exp, balance: inc - exp };
  }, [transactions]);

  // Filter Transactions for List View
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
        const matchesType = filterType === 'ALL' || txn.type === filterType;
        const query = searchQuery.toLowerCase();
        const matchesSearch = txn.category.toLowerCase().includes(query) || 
                              txn.description?.toLowerCase().includes(query) ||
                              txn.partyName?.toLowerCase().includes(query) ||
                              txn.amount.toString().includes(query);
        return matchesType && matchesSearch;
    }).sort((a, b) => b.date - a.date); // Newest first
  }, [transactions, filterType, searchQuery]);

  // Group by Month (For List View)
  const groupedByMonth = useMemo(() => {
    return filteredTransactions.reduce((acc: any, txn) => {
        const month = new Date(txn.date).toLocaleString(language, { month: 'long', year: 'numeric' });
        if (!acc[month]) acc[month] = [];
        acc[month].push(txn);
        return acc;
    }, {});
  }, [filteredTransactions, language]);

  // Group by Party (For Ledger View)
  const groupedByParty = useMemo(() => {
      // Get all unique party names
      const partyMap: Record<string, { income: number, expense: number, txns: Transaction[] }> = {};
      
      transactions.forEach(txn => {
          if (!txn.partyName) return;
          const name = txn.partyName.trim();
          if (!partyMap[name]) partyMap[name] = { income: 0, expense: 0, txns: [] };
          
          if (txn.type === 'INCOME') partyMap[name].income += txn.amount;
          else partyMap[name].expense += txn.amount;
          
          partyMap[name].txns.push(txn);
      });

      // Convert to array and filter by search
      return Object.entries(partyMap)
        .map(([name, data]) => ({
            name,
            income: data.income,
            expense: data.expense,
            balance: data.income - data.expense,
            txns: data.txns
        }))
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b.txns[b.txns.length-1].date - a.txns[a.txns.length-1].date); // Sort by recent activity
  }, [transactions, searchQuery]);

  const handlePartyClick = (partyName: string) => {
      setSearchQuery(partyName);
      setViewMode('LIST');
      setFilterType('ALL');
  };

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Summary Header */}
      <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-200">
         <div className="flex justify-between items-start mb-4">
             <div>
                 <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">{t.totalBalance}</p>
                 <h2 className="text-3xl font-black">₹{summary.balance.toLocaleString()}</h2>
             </div>
             <div className="bg-indigo-500/30 p-2 rounded-xl backdrop-blur-sm">
                 <Calendar size={20} className="text-indigo-100" />
             </div>
         </div>
         <div className="flex gap-4">
             <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm flex items-center gap-3">
                 <div className="bg-green-400/20 p-2 rounded-lg text-green-300">
                     <TrendingUp size={16} />
                 </div>
                 <div>
                     <p className="text-[10px] text-indigo-200 font-bold uppercase">{t.income}</p>
                     <p className="font-bold text-sm">₹{summary.income.toLocaleString()}</p>
                 </div>
             </div>
             <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm flex items-center gap-3">
                 <div className="bg-red-400/20 p-2 rounded-lg text-red-300">
                     <TrendingDown size={16} />
                 </div>
                 <div>
                     <p className="text-[10px] text-indigo-200 font-bold uppercase">{t.expense}</p>
                     <p className="font-bold text-sm">₹{summary.expense.toLocaleString()}</p>
                 </div>
             </div>
         </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
          <button 
             onClick={() => setViewMode('LIST')}
             className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition ${viewMode === 'LIST' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
              <Calendar size={16} /> {t.transactions}
          </button>
          <button 
             onClick={() => setViewMode('LEDGER')}
             className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition ${viewMode === 'LEDGER' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
              <Users size={16} /> {t.ledger}
          </button>
      </div>

      {/* Controls */}
      <div className="space-y-3 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 py-2">
          {/* Search */}
          <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={viewMode === 'LIST' ? (language === 'ta' ? 'தேடவும் (வகை, குறிப்பு, பெயர்...)' : 'Search...') : (language === 'ta' ? 'பெயர் தேடவும்...' : 'Search Name...')}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition"
              />
              {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <XCircle size={16} />
                  </button>
              )}
          </div>

          {/* Filters (Only for List View) */}
          {viewMode === 'LIST' && (
            <div className="flex bg-gray-200 p-1 rounded-xl">
                <button 
                    onClick={() => setFilterType('ALL')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'ALL' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {language === 'ta' ? 'எல்லாம்' : 'All'}
                </button>
                <button 
                    onClick={() => setFilterType('INCOME')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'INCOME' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {t.income}
                </button>
                <button 
                    onClick={() => setFilterType('EXPENSE')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'EXPENSE' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {t.expense}
                </button>
            </div>
          )}
      </div>

      {/* Content */}
      {viewMode === 'LIST' ? (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            {Object.keys(groupedByMonth).length === 0 ? (
                <div className="text-center py-10 opacity-50">
                    <Calendar size={48} className="mx-auto mb-2 text-gray-300"/>
                    <p className="text-sm font-bold text-gray-400 tamil-font">{t.noData}</p>
                </div>
            ) : (
                Object.keys(groupedByMonth).map(month => (
                    <div key={month} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-md">{month}</span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                        </div>
                        
                        <div className="space-y-2">
                            {groupedByMonth[month].map((txn: any) => (
                            <div key={txn.id} onClick={() => onEdit(txn)} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between active:scale-[0.99] transition cursor-pointer relative overflow-hidden">
                                {txn.partyName && <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-50 text-[9px] font-bold text-indigo-400 rounded-bl-lg">{txn.partyName}</div>}
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {txn.type === 'INCOME' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm leading-tight">{txn.category}</p>
                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                            {new Date(txn.date).toLocaleDateString(language, {day: '2-digit', month: 'short'})}
                                        </p>
                                        {txn.description && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 italic">{txn.description}</p>}
                                    </div>
                                </div>
                                <div className="text-right pt-2">
                                    <p className={`font-black text-sm ${txn.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                        {txn.type === 'INCOME' ? '+' : '-'} ₹{txn.amount}
                                    </p>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
            
            {/* Clear All Button */}
            {!searchQuery && transactions.length > 0 && (
                <div className="flex justify-center mt-6">
                    <button onClick={onClear} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition border border-red-100">
                    <Eraser size={14} /> <span className="text-xs font-bold tamil-font">{t.clearAll}</span>
                    </button>
                </div>
            )}
          </div>
      ) : (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             {groupedByParty.length === 0 ? (
                 <div className="text-center py-10 opacity-50">
                    <Users size={48} className="mx-auto mb-2 text-gray-300"/>
                    <p className="text-sm font-bold text-gray-400 tamil-font">{language === 'ta' ? 'பெயர்கள் இல்லை' : 'No parties found'}</p>
                 </div>
             ) : (
                 groupedByParty.map((party, idx) => (
                    <div key={idx} onClick={() => handlePartyClick(party.name)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition cursor-pointer flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${party.balance > 0 ? 'bg-green-100 text-green-600' : party.balance < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                 {party.name.charAt(0).toUpperCase()}
                             </div>
                             <div>
                                 <h3 className="font-bold text-gray-800 text-base">{party.name}</h3>
                                 <p className="text-[10px] text-gray-400 font-bold">{party.txns.length} {language === 'ta' ? 'பரிவர்த்தனைகள்' : 'Entries'}</p>
                             </div>
                         </div>
                         <div className="text-right">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                 {party.balance > 0 ? t.netBalance : party.balance < 0 ? t.netBalance : 'Settled'}
                             </p>
                             <p className={`text-lg font-black ${party.balance > 0 ? 'text-green-600' : party.balance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                 {party.balance > 0 ? '+' : ''} ₹{party.balance.toLocaleString()}
                             </p>
                         </div>
                         <ChevronRight size={16} className="text-gray-300 ml-2" />
                    </div>
                 ))
             )}
             <p className="text-[10px] text-center text-gray-400 p-4 tamil-font">
                 {language === 'ta' 
                    ? 'பெயரை கிளிக் செய்து விவரங்களை பார்க்கலாம்.' 
                    : 'Tap a name to see transaction history.'}
             </p>
          </div>
      )}
    </div>
  );
};

export default Accounting;
