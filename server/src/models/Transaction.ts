// Transaction model for user financial activity
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

// DTO for creating a new transaction
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

// DTO for updating transaction fields (partial update)
export interface UpdateTransaction {
  description?: string;
  category?: string;
  amount?: number;
  type?: 'income' | 'expense';
}

// Model for tracking CSV upload metadata and status
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