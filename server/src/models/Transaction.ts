// server/src/models/Transaction.ts
export interface Transaction {
  id: string;
  user_id: string;
  transaction_date: Date;
  posted_date?: Date;
  card_no?: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  csv_upload_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTransaction {
  user_id: string;
  transaction_date: Date;
  posted_date?: Date;
  card_no?: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  csv_upload_id?: string;
}

export interface UpdateTransaction {
  description?: string;
  category?: string;
  amount?: number;
  type?: 'income' | 'expense';
}

// CSV Upload tracking
export interface CSVUpload {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  processed_transactions: number;
  upload_date: Date;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
}