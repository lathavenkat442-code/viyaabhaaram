
import { GoogleGenAI, Type } from "@google/genai";
import { StockItem, Transaction } from "../types";

const FALLBACK_TIPS = [
  "அதிகம் விற்பனையாகும் பொருட்களைக் கண்டறிந்து இருப்பு வைக்கவும்.",
  "தேவையற்ற செலவுகளைக் குறைத்து லாபத்தை அதிகரிக்கவும்.",
  "வாடிக்கையாளர் விருப்பங்களை அறிந்து கொள்முதல் செய்யவும்.",
  "கடன் கொடுப்பதைக் குறைத்து ரொக்கப் பணப் புழக்கத்தை அதிகரிக்கவும்.",
  "பண்டிகை காலங்களில் சிறப்புச் சலுகைகளை வழங்கலாம்.",
  "தினசரி வரவு செலவு கணக்கை தவறாமல் எழுதவும்.",
  "பழைய சரக்குகளை தள்ளுபடியில் விற்று பணமாக்கவும்.",
  "அவசர தேவைக்கு எப்போதும் சிறு தொகை கையில் இருக்கட்டும்."
];

const getRandomTips = (count: number) => {
  const shuffled = [...FALLBACK_TIPS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const getBusinessInsights = async (stocks: StockItem[], transactions: Transaction[]) => {
  // Return fallbacks if no API key is set
  if (!import.meta.env.VITE_API_KEY) {
     return getRandomTips(3);
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  // Optimize payload: Convert to simple strings to avoid complex JSON nesting issues and reduce token count
  const stockSummary = stocks.slice(0, 10).map(s => { 
    const qty = s.variants 
      ? s.variants.reduce((acc, v) => acc + v.sizeStocks.reduce((sum, ss) => sum + ss.quantity, 0), 0)
      : 0;
    return `${s.name}: ${qty}`;
  }).join(', ');
  
  const txnSummary = transactions.slice(-10).map(t => 
    `${t.type} ${t.amount} for ${t.category}`
  ).join(', ');

  // Simplified Prompt
  const prompt = `
    As a business analyst, provide 3 short, actionable tips in Tamil based on this data.
    Stocks: [${stockSummary}]
    Transactions: [${txnSummary}]
    
    Focus on inventory management and cash flow.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["tips"],
        },
      }
    });

    const data = JSON.parse(response.text || '{"tips": []}');
    return data.tips.length > 0 ? data.tips : getRandomTips(3);

  } catch (error: any) {
    // Gracefully handle quota limits (429) or Server Errors (500)
    if (error?.status === 429 || error?.message?.includes('429')) {
       console.warn("Gemini API Quota Exceeded. Switching to offline tips.");
    } else {
       console.error("AI Analysis failed:", error);
    }
    // Return fallback tips so the UI doesn't break
    return getRandomTips(3);
  }
};
