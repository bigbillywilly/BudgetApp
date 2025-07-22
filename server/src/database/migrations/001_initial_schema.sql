-- server/src/database/migrations/001_initial_schema.sql
-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);

-- Monthly data table
CREATE TABLE monthly_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2050),
    income DECIMAL(12,2) NOT NULL CHECK (income >= 0),
    fixed_expenses DECIMAL(12,2) NOT NULL CHECK (fixed_expenses >= 0),
    savings_goal DECIMAL(12,2) NOT NULL CHECK (savings_goal >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month, year)
);

-- Create indexes for monthly data
CREATE INDEX idx_monthly_data_user_id ON monthly_data(user_id);
CREATE INDEX idx_monthly_data_year_month ON monthly_data(year, month);

-- CSV uploads tracking table
CREATE TABLE csv_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    processed_transactions INTEGER DEFAULT 0,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    error_message TEXT
);

-- Create index on csv_uploads
CREATE INDEX idx_csv_uploads_user_id ON csv_uploads(user_id);
CREATE INDEX idx_csv_uploads_status ON csv_uploads(status);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    posted_date DATE,
    card_no VARCHAR(20),
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount != 0),
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    csv_upload_id UUID REFERENCES csv_uploads(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_csv_upload ON transactions(csv_upload_id);

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant')),
    tokens_used INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for chat messages
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_data_updated_at BEFORE UPDATE ON monthly_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some predefined categories for transactions
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO transaction_categories (name, description) VALUES
('Food & Dining', 'Restaurants, groceries, food delivery'),
('Shopping', 'Retail purchases, online shopping, clothing'),
('Transportation', 'Gas, public transit, ride sharing, car maintenance'),
('Bills & Utilities', 'Electricity, water, internet, phone, insurance'),
('Entertainment', 'Movies, streaming services, games, events'),
('Healthcare', 'Medical expenses, pharmacy, dental, vision'),
('Travel', 'Hotels, flights, vacation expenses'),
('Education', 'Tuition, books, courses, training'),
('Income', 'Salary, freelance, investment returns'),
('Other', 'Miscellaneous expenses');

-- Create a view for user financial summary
CREATE VIEW user_financial_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(DISTINCT md.id) as months_tracked,
    COUNT(DISTINCT t.id) as total_transactions,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
    u.created_at as user_since
FROM users u
LEFT JOIN monthly_data md ON u.id = md.user_id
LEFT JOIN transactions t ON u.id = t.user_id
GROUP BY u.id, u.name, u.email, u.created_at;