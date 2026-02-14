
import React, { useState, useEffect } from 'react';
import { StockItem, Transaction } from '../types';
import { TRANSLATIONS } from '../constants';
import { TrendingUp, TrendingDown, Package, Sparkles } from 'lucide-react';
import { getBusinessInsights } from '../services/geminiService';

const Dashboard: React.FC<{ stocks: StockItem[]; transactions: Transaction[]; language: 'ta' | 'en' }> = ({ stocks, transactions, language }) => {
  const [tips, setTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);

  const t = TRANSLATIONS[language];

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalStockValue = stocks.reduce((acc, curr) => {
    // Calculate total quantity across all variants
    const itemQty = curr.variants ? curr.variants.reduce((vAcc, variant) => {
        return vAcc + variant.sizeStocks.reduce((sAcc, s) => sAcc + s.quantity, 0);
    }, 0) : 0;
    
    return acc + (curr.price * itemQty);
  }, 0);

  useEffect(() => {
    const fetchTips = async () => {
      // 1. Check Cache first to save API quota
      const CACHE_KEY = 'viyabaari_ai_tips';
      const cachedData = localStorage.getItem(CACHE_KEY);
      
      if (cachedData) {
        try {
          const { tips: cachedTips, timestamp } = JSON.parse(cachedData);
          const FOUR_HOURS = 4 * 60 * 60 * 1000;
          
          // Use cache if it's fresh (less than 4 hours old)
          if (Date.now() - timestamp < FOUR_HOURS && cachedTips.length > 0) {
            setTips(cachedTips);
            return;
          }
        } catch (e) {
          localStorage.removeItem(CACHE_KEY);
        }
      }

      // 2. If cache expired or missing, fetch from API
      setLoadingTips(true);
      const newTips = await getBusinessInsights(stocks, transactions);
      setTips(newTips);
      
      // 3. Update Cache
      if (newTips && newTips.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          tips: newTips,
          timestamp: Date.now()
        }));
      }
      setLoadingTips(false);
    };

    // Only fetch if there is data to analyze
    if (stocks.length > 0 || transactions.length > 0) {
      // Use a timeout to debounce slightly on mount
      const timer = setTimeout(fetchTips, 500);
      return () => clearTimeout(timer);
    }
  }, [stocks.length, transactions.length]); // Only re-run if number of items changes to minimize calls

  return (
    <div className="p-4 space-y-6">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-lg">
        <p className="text-indigo-100 text-sm tamil-font">{t.totalBalance}</p>
        <h2 className="text-4xl font-bold mt-1">₹{(totalIncome - totalExpense).toLocaleString()}</h2>
        
        <div className="flex gap-4 mt-6">
          <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-300" />
              <span className="text-xs text-indigo-100 tamil-font">{t.income}</span>
            </div>
            <p className="font-semibold">₹{totalIncome.toLocaleString()}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className="text-red-300" />
              <span className="text-xs text-indigo-100 tamil-font">{t.expense}</span>
            </div>
            <p className="font-semibold">₹{totalExpense.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-xl">
            <Package className="text-orange-600" size={24} />
          </div>
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
          <Sparkles className="text-indigo-600" size={18} />
          <h3 className="font-bold text-indigo-900 tamil-font">{language === 'ta' ? 'AI ஆலோசனை' : 'AI Business Insights'}</h3>
        </div>
        {loadingTips ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-indigo-200 rounded w-3/4"></div>
            <div className="h-4 bg-indigo-200 rounded w-1/2"></div>
          </div>
        ) : (
          <ul className="space-y-3">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-indigo-800 tamil-font bg-white/50 p-2 rounded-lg">
                <span className="font-bold text-indigo-400">#</span>
                {tip}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-bold text-gray-800 mb-4 tamil-font">{language === 'ta' ? 'சமீபத்திய வரவு செலவு' : 'Recent Transactions'}</h3>
        <div className="space-y-3">
          {transactions.slice(0, 5).map(txn => (
            <div key={txn.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border-l-4" style={{ borderLeftColor: txn.type === 'INCOME' ? '#10b981' : '#ef4444' }}>
              <div>
                <p className="font-medium text-gray-800">{txn.description || txn.category}</p>
                <p className="text-[10px] text-gray-400">{new Date(txn.date).toLocaleDateString(language)}</p>
              </div>
              <p className={`font-bold ${txn.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                {txn.type === 'INCOME' ? '+' : '-'} ₹{txn.amount}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
