
import React, { useState, useEffect } from 'react';
import { StockItem, Transaction, User } from '../types';
import { TRANSLATIONS } from '../constants';
import { TrendingUp, TrendingDown, Package, Sparkles, Lightbulb, Database, ChevronRight } from 'lucide-react';
import { getBusinessInsights } from '../services/geminiService';
import { isSupabaseConfigured } from '../supabaseClient';

const Dashboard: React.FC<{ stocks: StockItem[]; transactions: Transaction[]; language: 'ta' | 'en'; user: User; onSetupServer: () => void }> = ({ stocks, transactions, language, user, onSetupServer }) => {
  const [tips, setTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  
  const hasApiKey = (() => {
    try { return typeof process !== 'undefined' && process.env && !!process.env.API_KEY; } catch { return false; }
  })();

  const t = TRANSLATIONS[language];

  const totalIncome = transactions.filter(t => t?.type === 'INCOME').reduce((acc, curr) => acc + (curr?.amount || 0), 0);
  const totalExpense = transactions.filter(t => t?.type === 'EXPENSE').reduce((acc, curr) => acc + (curr?.amount || 0), 0);
  
  const totalStockValue = stocks.reduce((acc, curr) => {
    const itemQty = curr?.variants ? curr.variants.reduce((vAcc, variant) => {
        return vAcc + (variant?.sizeStocks?.reduce((sAcc, s) => sAcc + (s?.quantity || 0), 0) || 0);
    }, 0) : 0;
    return acc + ((curr?.price || 0) * itemQty);
  }, 0);

  useEffect(() => {
    const fetchTips = async () => {
      setLoadingTips(true);
      const newTips = await getBusinessInsights(stocks, transactions);
      setTips(newTips || []);
      setLoadingTips(false);
    };
    const timer = setTimeout(fetchTips, 500);
    return () => clearTimeout(timer);
  }, [stocks.length, transactions.length]); 

  const isGuestOrOffline = !isSupabaseConfigured || user?.email?.includes('guest') || !user?.uid;

  return (
    <div className="p-4 space-y-6 pb-6">
      {isGuestOrOffline && (
        <div onClick={onSetupServer} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-sm">
            <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Database size={20} /></div>
                <div>
                    <h3 className="font-bold text-amber-900 text-sm tamil-font">{language === 'ta' ? 'ஆன்லைன் அக்கவுண்ட் இணைக்க' : 'Connect Cloud Database'}</h3>
                    <p className="text-[10px] text-amber-600 font-medium">{language === 'ta' ? 'தரவுகளை ஆன்லைனில் சேமிக்க கிளிக் செய்யவும்' : 'Sync data online'}</p>
                </div>
            </div>
            <ChevronRight size={18} className="text-amber-400" />
        </div>
      )}

      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-lg">
        <p className="text-indigo-100 text-sm tamil-font">{t.totalBalance}</p>
        <h2 className="text-4xl font-bold mt-1">₹{(totalIncome - totalExpense).toLocaleString()}</h2>
        <div className="flex gap-4 mt-6">
          <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-300" /><span className="text-xs text-indigo-100 tamil-font">{t.income}</span>
            </div>
            <p className="font-semibold">₹{totalIncome.toLocaleString()}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className="text-red-300" /><span className="text-xs text-indigo-100 tamil-font">{t.expense}</span>
            </div>
            <p className="font-semibold">₹{totalExpense.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-xl"><Package className="text-orange-600" size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 tamil-font">{language === 'ta' ? 'மொத்த சரக்கு மதிப்பு' : 'Total Stock Value'}</p>
            <p className="text-xl font-bold">₹{totalStockValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 font-medium">{stocks.length} {language === 'ta' ? 'பொருட்கள்' : 'Items'}</p>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
        <div className="flex items-center gap-2 mb-4">
          {hasApiKey ? <Sparkles className="text-indigo-600" size={18} /> : <Lightbulb className="text-amber-500" size={18} />}
          <h3 className="font-bold text-indigo-900 tamil-font">{language === 'ta' ? 'AI ஆலோசனை' : 'Business Insights'}</h3>
        </div>
        {loadingTips ? (
          <div className="animate-pulse space-y-2"><div className="h-4 bg-indigo-200 rounded w-3/4"></div></div>
        ) : (
          <ul className="space-y-3">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-indigo-800 tamil-font bg-white/50 p-2 rounded-lg">
                <span className="font-bold text-indigo-400">#</span>{tip}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-bold text-gray-800 mb-4 tamil-font">{language === 'ta' ? 'சமீபத்திய வரவு செலவு' : 'Recent Transactions'}</h3>
        <div className="space-y-3">
          {transactions.slice(0, 5).map(txn => (
            <div key={txn?.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border-l-4" style={{ borderLeftColor: txn?.type === 'INCOME' ? '#10b981' : '#ef4444' }}>
              <div>
                <p className="font-medium text-gray-800">{txn?.description || txn?.category}</p>
                <p className="text-[10px] text-gray-400">{txn?.date ? new Date(txn.date).toLocaleDateString(language) : ''}</p>
              </div>
              <p className={`font-bold ${txn?.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                {txn?.type === 'INCOME' ? '+' : '-'} ₹{txn?.amount || 0}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
