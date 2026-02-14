
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { TRANSLATIONS } from '../constants';
import { TrendingUp, TrendingDown, Edit2, Eraser, Calendar, Search, ArrowUpCircle, ArrowDownCircle, XCircle } from 'lucide-react';

interface AccountingProps {
  transactions: Transaction[];
  language: 'ta' | 'en';
  onEdit: (txn: Transaction) => void;
  onClear: () => void;
}

const Accounting: React.FC<AccountingProps> = ({ transactions, language, onEdit, onClear }) => {
  const t = TRANSLATIONS[language];
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
                              txn.amount.toString().includes(query);
        return matchesType && matchesSearch;
    }).sort((a, b) => b.date - a.date); // Newest first
  }, [transactions, filterType, searchQuery]);

  // Group by Month
  const grouped = useMemo(() => {
    return filteredTransactions.reduce((acc: any, txn) => {
        const month = new Date(txn.date).toLocaleString(language, { month: 'long', year: 'numeric' });
        if (!acc[month]) acc[month] = [];
        acc[month].push(txn);
        return acc;
    }, {});
  }, [filteredTransactions, language]);

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

      {/* Controls */}
      <div className="space-y-3 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 py-2">
          {/* Search */}
          <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ta' ? 'தேடவும் (வகை, குறிப்பு...)' : 'Search (Category, Note...)'}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition"
              />
              {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <XCircle size={16} />
                  </button>
              )}
          </div>

          {/* Filters */}
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
      </div>

      {/* List */}
      <div className="space-y-6">
        {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-10 opacity-50">
                <Calendar size={48} className="mx-auto mb-2 text-gray-300"/>
                <p className="text-sm font-bold text-gray-400 tamil-font">{t.noData}</p>
                {searchQuery && <p className="text-xs text-gray-400 mt-2">{language === 'ta' ? 'தேடலுக்கு எதுவும் கிடைக்கவில்லை' : 'No results found for search'}</p>}
            </div>
        ) : (
            Object.keys(grouped).map(month => (
                <div key={month} className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-md">{month}</span>
                        <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    
                    <div className="space-y-2">
                        {grouped[month].map((txn: any) => (
                        <div key={txn.id} onClick={() => onEdit(txn)} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between active:scale-[0.99] transition cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {txn.type === 'INCOME' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-sm leading-tight">{txn.category}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                        {new Date(txn.date).toLocaleDateString(language, {day: '2-digit', month: 'short'})} • {new Date(txn.date).toLocaleTimeString(language, {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                    {txn.description && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 italic">{txn.description}</p>}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-black text-sm ${txn.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                    {txn.type === 'INCOME' ? '+' : '-'} ₹{txn.amount}
                                </p>
                                <button className="text-gray-300 hover:text-indigo-500 mt-1">
                                    <Edit2 size={12} />
                                </button>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Clear All Button (Only visible when filter is ALL and not searching) */}
      {filterType === 'ALL' && !searchQuery && transactions.length > 0 && (
          <div className="flex justify-center mt-6">
            <button 
              onClick={onClear}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition active:scale-95 border border-red-100"
            >
               <Eraser size={14} />
               <span className="text-xs font-bold tamil-font">{t.clearAll}</span>
            </button>
          </div>
      )}
    </div>
  );
};

export default Accounting;
