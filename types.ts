
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface SizeStock {
  size: string;
  quantity: number;
  color?: string; // New: For Saree/Dhoti Combo
  sleeve?: string; // New: For Dhoti Combo (Full/Half)
}

export interface StockVariant {
  id: string;
  imageUrl: string;
  sizeStocks: SizeStock[];
}

export interface StockHistory {
  date: number;
  action: 'CREATED' | 'UPDATED' | 'PRICE_CHANGE' | 'STOCK_CHANGE';
  description: string;
  change?: string;
}

export interface StockItem {
  id: string;
  name: string;
  // Deprecated fields kept for migration safety, but UI will use variants
  imageUrl?: string; 
  moreImages?: string[]; 
  
  category: string;
  variants: StockVariant[]; // New: Each image has its own stock
  price: number;
  lastUpdated: number;
  history?: StockHistory[]; // New: Track price and stock changes
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  partyName?: string; // New: Customer or Dealer Name for Ledger
  description: string;
  date: number;
}

export type BackupFrequency = 'daily' | 'weekly' | 'monthly' | 'never';

export interface User {
  uid?: string; // Added for Supabase Auth ID
  email: string;
  name: string;
  mobile?: string; // Added mobile number
  isLoggedIn: boolean;
  password?: string;
  lastBackupDate?: number;
  backupFrequency?: BackupFrequency;
  backupEmail?: string;
  includePhotosInBackup?: boolean;
}

export interface AppState {
  stocks: StockItem[];
  transactions: Transaction[];
  user: User | null;
}
