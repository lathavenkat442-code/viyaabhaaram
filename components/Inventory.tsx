
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StockItem, StockVariant } from '../types';
import { Search, Trash2, Filter, Edit2, Package, AlertTriangle, Share2, X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

// --- Stock Detail Full Screen Modal ---
const StockDetailView: React.FC<{ item: StockItem; onClose: () => void; onEdit: () => void; onDelete: () => void; onShare: () => void; language: 'ta' | 'en' }> = ({ item, onClose, onEdit, onDelete, onShare, language }) => {
    const [activeSlide, setActiveSlide] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync scroll with active slide state
    const handleScroll = () => {
        if (scrollRef.current) {
            const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
            setActiveSlide(index);
        }
    };

    const variants = item.variants || [];
    const totalQty = variants.reduce((acc, v) => acc + v.sizeStocks.reduce((sum, s) => sum + s.quantity, 0), 0);

    const getSleeveLabel = (sleeve: string) => {
        if (sleeve === 'Full Hand') return language === 'ta' ? 'முழுக்கை' : 'Full Hand';
        if (sleeve === 'Half Hand') return language === 'ta' ? 'அரைக்கை' : 'Half Hand';
        return sleeve;
    };

    const currentVariant = variants[activeSlide];

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-20 border-b border-gray-100">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition">
                    <ChevronLeft size={28} className="text-gray-700" />
                </button>
                <h2 className="font-black text-lg text-gray-800 truncate max-w-[60%] text-center">{item.name}</h2>
                <div className="flex gap-2">
                    <button onClick={onShare} className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"><Share2 size={20} /></button>
                    <button onClick={onEdit} className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"><Edit2 size={20} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-24">
                {/* Large Image Carousel */}
                <div className="relative w-full aspect-square bg-slate-50">
                    <div 
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full h-full"
                    >
                        {variants.length > 0 ? (
                            variants.map((v, idx) => (
                                <div key={idx} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-4">
                                    {v.imageUrl ? (
                                        <img src={v.imageUrl} alt="" className="w-full h-full object-contain drop-shadow-sm" />
                                    ) : (
                                        <Package size={64} className="text-gray-300" />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package size={64} />
                            </div>
                        )}
                    </div>
                    {/* Pagination Dots */}
                    {variants.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            {variants.map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === activeSlide ? 'bg-white scale-125' : 'bg-white/50'}`} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
                                    {item.category}
                                </span>
                                <h1 className="text-2xl font-black text-gray-900 leading-tight">{item.name}</h1>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-gray-900">₹{item.price}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-xs text-gray-400 font-bold uppercase">{language === 'ta' ? 'மொத்த இருப்பு' : 'Total Stock'}</p>
                             <p className="text-2xl font-black text-indigo-600">{totalQty}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-xs text-gray-400 font-bold uppercase">{language === 'ta' ? 'கடைசியாக அப்டேட்' : 'Last Updated'}</p>
                             <p className="text-sm font-bold text-gray-700 mt-1">
                                {new Date(item.lastUpdated).toLocaleDateString()}
                             </p>
                        </div>
                    </div>

                    {/* Detailed Stock Breakdown - Only for Active Slide */}
                    <div>
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Package size={18} className="text-indigo-600"/> 
                            {language === 'ta' ? 'ஸ்டாக் விவரங்கள்' : 'Stock Details'}
                            <span className="text-xs text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md">
                                #{activeSlide + 1}
                            </span>
                        </h3>
                        
                        <div className="space-y-4">
                            {currentVariant && (
                                <div className="border border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-200 rounded-2xl p-4 flex gap-4 transition-all animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-20 h-20 bg-white rounded-xl border border-gray-100 flex-shrink-0 overflow-hidden shadow-sm">
                                        {currentVariant.imageUrl ? (
                                            <img src={currentVariant.imageUrl} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-gray-300"/></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col gap-2">
                                            {currentVariant.sizeStocks.length > 0 ? currentVariant.sizeStocks.map((ss, sIdx) => (
                                                <div key={sIdx} className="bg-white border border-gray-200 px-3 py-3 rounded-xl text-sm font-bold text-gray-700 shadow-sm flex items-center justify-between">
                                                    <div className="flex gap-2 items-center flex-wrap">
                                                        {ss.color && (
                                                            <span className="text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded text-xs">{ss.color}</span>
                                                        )}
                                                        
                                                        {ss.sleeve && (
                                                            <>
                                                                <span className="text-gray-300">•</span>
                                                                <span className="text-gray-700 font-black">{getSleeveLabel(ss.sleeve)}</span>
                                                            </>
                                                        )}
                                                        
                                                        {(ss.size && ss.size !== 'General') && (
                                                            <>
                                                                <span className="text-gray-300">•</span>
                                                                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs">{ss.size}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="bg-gray-900 text-white px-3 py-1 rounded-lg text-xs">
                                                        Qty: {ss.quantity}
                                                    </div>
                                                </div>
                                            )) : (
                                                <span className="text-xs text-red-400 font-bold italic">Out of Stock</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 w-full p-4 bg-white border-t border-gray-100 flex gap-3">
                 <button onClick={onDelete} className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition flex items-center justify-center gap-2">
                    <Trash2 size={18} /> {language === 'ta' ? 'நீக்குக' : 'Delete'}
                 </button>
                 <button onClick={onClose} className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition">
                    {language === 'ta' ? 'மூடுக' : 'Close'}
                 </button>
            </div>
        </div>
    );
};

const InventoryCard: React.FC<{ item: StockItem; onClick: () => void; onDelete: () => void; onEdit: () => void; onShare: () => void; language: 'ta' | 'en' }> = ({ item, onClick, onDelete, onEdit, onShare, language }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Use IntersectionObserver for robust active slide detection on mobile
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-index'));
                        if (!isNaN(index)) {
                            setCurrentImageIndex(index);
                        }
                    }
                });
            },
            {
                root: container,
                threshold: 0.6 // Trigger when 60% of the item is visible
            }
        );

        const children = container.querySelectorAll('[data-index]');
        children.forEach(child => observer.observe(child));

        return () => observer.disconnect();
    }, [item.variants]);

    const variants = item.variants || [];
    const activeVariant: StockVariant | undefined = variants[currentImageIndex] || variants[0];
    
    // Total calculation
    const totalQty = variants.reduce((acc, v) => acc + v.sizeStocks.reduce((sum, s) => sum + s.quantity, 0), 0);
    const isLow = variants.some(v => v.sizeStocks.some(ss => ss.quantity < 5));

    const getSleeveShort = (sleeve: string) => {
        if (sleeve === 'Full Hand') return language === 'ta' ? 'முழு' : 'Full';
        if (sleeve === 'Half Hand') return language === 'ta' ? 'அரை' : 'Half';
        return '';
    };

    return (
        <div 
            onClick={onClick}
            className={`bg-white rounded-[2rem] shadow-sm overflow-hidden border-2 flex flex-col transition-transform active:scale-[0.98] cursor-pointer ${isLow ? 'border-red-100 ring-2 ring-red-50' : 'border-transparent'}`}
        >
            {/* Image Box - Horizontal Scroll like Flipkart */}
            <div className="relative h-48 bg-slate-50 group">
                <div 
                    ref={scrollRef}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full w-full"
                    onClick={(e) => e.stopPropagation()} // Allow swipe without triggering card click immediately if needed, though usually card click is fine.
                >
                    {variants.length > 0 ? (
                        variants.map((v, idx) => (
                            <div 
                                key={v.id || idx} 
                                data-index={idx}
                                className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center p-2 relative"
                                onClick={onClick} // Ensure clicking image opens modal
                            >
                                {v.imageUrl ? (
                                    <img src={v.imageUrl} alt={`${item.name} ${idx}`} className="w-full h-full object-contain rounded-xl" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Package size={32} />
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package size={32} />
                        </div>
                    )}
                </div>
                
                {variants.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-black/10 px-2 py-1 rounded-full backdrop-blur-[2px]">
                        {variants.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50'}`}></div>
                        ))}
                    </div>
                )}
                
                {isLow && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white p-1 rounded-full shadow-lg z-10 animate-pulse">
                        <AlertTriangle size={12} />
                    </div>
                )}
                
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                    <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="bg-white/90 backdrop-blur-sm p-2 rounded-xl text-blue-500 shadow-sm border border-gray-100 hover:bg-blue-50 transition"><Share2 size={16} /></button>
                </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
                <div className="mb-2">
                    <h4 className="font-black text-gray-800 text-sm leading-tight truncate">{item.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.category}</p>
                </div>

                {/* Size-wise stock breakdown for ACTIVE VARIANT */}
                <div className="bg-slate-50 p-2 rounded-xl mb-3 min-h-[60px] flex flex-col justify-center transition-all duration-300">
                    <p className="text-[9px] text-gray-400 font-bold mb-1 uppercase text-center flex items-center justify-center gap-1">
                        {language === 'ta' ? 'ஸ்டாக் விவரம்' : 'Stock info'}
                        <span className="bg-gray-200 text-gray-600 px-1 rounded text-[8px]">#{currentImageIndex + 1}</span>
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center">
                        {activeVariant && activeVariant.sizeStocks.length > 0 ? (
                            activeVariant.sizeStocks.map((ss, i) => (
                                <div key={i} className={`text-[9px] font-black px-2 py-1 rounded-lg flex gap-1 border shadow-sm ${ss.quantity < 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-slate-700 border-slate-200'}`}>
                                    {/* Show color if exists, else size */}
                                    {ss.color ? (
                                        <>
                                            <span>{ss.color}</span>
                                            
                                            {/* Sleeve Info (Shortened) */}
                                            {ss.sleeve && (
                                                <span className="text-indigo-500 text-[8px] mx-0.5">
                                                    ({getSleeveShort(ss.sleeve)})
                                                </span>
                                            )}

                                            {ss.size && ss.size !== 'General' && <span className="text-gray-400 text-[8px]"> {ss.size}</span>}
                                            <span className="text-gray-300">|</span>
                                        </>
                                    ) : (
                                        <span>{ss.size}:</span>
                                    )}
                                    <span>{ss.quantity}</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-[10px] text-gray-400 italic font-medium py-1">-- No Stock --</span>
                        )}
                    </div>
                </div>
                
                <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-black uppercase">{language === 'ta' ? 'மொத்தம்' : 'Total'}</span>
                        <span className={`font-black text-lg leading-none ${isLow ? 'text-red-500' : 'text-indigo-600'}`}>{totalQty}</span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">₹{item.price}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const Inventory: React.FC<{ stocks: StockItem[]; onDelete: (id: string) => void; onEdit: (item: StockItem) => void; language: 'ta' | 'en' }> = ({ stocks, onDelete, onEdit, language }) => {
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [viewingItem, setViewingItem] = useState<StockItem | null>(null);
  const t = TRANSLATIONS[language];

  const filtered = useMemo(() => {
    let result = stocks.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    if (filterLowStock) {
      result = result.filter(s => s.variants.some(v => v.sizeStocks.some(ss => ss.quantity < 5)));
    }
    return result;
  }, [stocks, search, filterLowStock]);

  const handleShare = async (item: StockItem) => {
    try {
      const totalQty = item.variants.reduce((acc, v) => acc + v.sizeStocks.reduce((s, ss) => s + ss.quantity, 0), 0);
      
      // Construct detailed text with ALL variants
      let detailsText = "";
      item.variants.forEach((v, idx) => {
          // Enhaced text for sharing colors/sleeves
          const stocksText = v.sizeStocks.map(ss => {
              if (ss.color) return `${ss.color} ${ss.sleeve ? '('+ss.sleeve+')' : ''} ${ss.size && ss.size !== 'General' ? '['+ss.size+']' : ''}: ${ss.quantity}`;
              return `${ss.size}: ${ss.quantity}`;
          }).join(', ');
          detailsText += `\n📸 Model ${idx + 1}: ${stocksText || 'No Stock'}`;
      });

      const text = language === 'ta' 
        ? `🛍️ *${item.name}*\n💰 விலை: ₹${item.price}\n📦 வகை: ${item.category}\n\n📊 *ஸ்டாக் விவரம்:*${detailsText}\n\n🔢 மொத்த இருப்பு: ${totalQty}`
        : `🛍️ *${item.name}*\n💰 Price: ₹${item.price}\n📦 Category: ${item.category}\n\n📊 *Stock Details:*${detailsText}\n\n🔢 Total Stock: ${totalQty}`;

      const shareData: any = {
        title: item.name,
        text: text,
      };

      // Collect ALL images
      const files: File[] = [];
      const validVariants = item.variants.filter(v => v.imageUrl && v.imageUrl.startsWith('data:'));

      // Process images (Limit to 10 to avoid browser crash/limit issues)
      const maxImages = Math.min(validVariants.length, 10);
      
      for (let i = 0; i < maxImages; i++) {
          try {
              const res = await fetch(validVariants[i].imageUrl);
              const blob = await res.blob();
              // Clean filename
              const filename = `${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${i+1}.png`;
              files.push(new File([blob], filename, { type: blob.type }));
          } catch (e) {
              console.error(`Failed to process image ${i}`, e);
          }
      }

      if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
        shareData.files = files;
      }

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert(language === 'ta' ? 'ஷேர் செய்யும் வசதி உங்கள் மொபைலில் இல்லை.' : 'Sharing not supported on this device.');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      alert(language === 'ta' ? 'ஷேர் செய்ய முடியவில்லை. குறைவான படங்களை முயற்சிக்கவும்.' : 'Could not share. Try with fewer images.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md pb-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={language === 'ta' ? 'சரக்கு தேடவும்...' : 'Search items...'} className="w-full pl-11 p-4 bg-white border border-gray-200 rounded-2xl outline-none shadow-sm focus:border-indigo-400 text-slate-900" />
        </div>
        <button onClick={() => setFilterLowStock(!filterLowStock)} className={`p-4 rounded-2xl border transition-all ${filterLowStock ? 'bg-red-500 text-white border-red-500 shadow-lg' : 'bg-white text-gray-500 border-gray-200'}`}>
          <Filter size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(item => (
            <InventoryCard 
                key={item.id} 
                item={item} 
                onClick={() => setViewingItem(item)}
                onDelete={() => onDelete(item.id)} 
                onEdit={() => onEdit(item)}
                onShare={() => handleShare(item)}
                language={language}
            />
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 mx-2">
           <Package size={60} className="mx-auto mb-4 text-gray-200" />
           <p className="tamil-font text-gray-400 font-bold">{language === 'ta' ? 'சரக்கு ஏதும் இல்லை' : 'No items matching your search'}</p>
        </div>
      )}

      {/* Full Screen Detail Modal */}
      {viewingItem && (
          <StockDetailView 
             item={viewingItem} 
             onClose={() => setViewingItem(null)}
             onEdit={() => { setViewingItem(null); onEdit(viewingItem); }}
             onDelete={() => { setViewingItem(null); onDelete(viewingItem.id); }}
             onShare={() => handleShare(viewingItem)}
             language={language}
          />
      )}
    </div>
  );
};

export default Inventory;
