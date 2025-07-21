import Papa from 'papaparse';

export interface Transaction {
  id: string;
  transactionDate: string;
  postedDate: string;
  cardNumber: string;
  description: string;
  originalCategory: string; // Bank's category
  aiCategory: string; // Our AI-determined category
  amount: number;
  type: 'debit' | 'credit';
}

export interface ProcessedCSV {
  transactions: Transaction[];
  summary: {
    totalDebits: number;
    totalCredits: number;
    netAmount: number;
    transactionCount: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  categoryBreakdown: {
    ai: Record<string, { total: number; count: number }>;
    original: Record<string, { total: number; count: number }>;
  };
  insights: string[];
}

export class CSVProcessingService {
  private aiCategorizeTransaction(description: string, originalCategory: string): string {
    const desc = description.toLowerCase();
    
    // Enhanced categorization with more specific patterns
    const categoryPatterns = {
      'Food & Dining': [
        'restaurant', 'cafe', 'coffee', 'food', 'dining', 'pizza', 'burger',
        'starbucks', 'mcdonald', 'subway', 'chipotle', 'domino', 'kfc',
        'taco bell', 'wendy', 'chick-fil-a', 'panera', 'dunkin',
        'grubhub', 'doordash', 'uber eats', 'postmates', 'seamless'
      ],
      'Groceries': [
        'grocery', 'supermarket', 'walmart', 'target', 'costco', 'kroger',
        'safeway', 'publix', 'whole foods', 'trader joe', 'aldi',
        'food lion', 'harris teeter', 'giant', 'stop shop'
      ],
      'Transportation': [
        'gas', 'fuel', 'exxon', 'shell', 'bp', 'chevron', 'mobil',
        'uber', 'lyft', 'taxi', 'cab', 'parking', 'metro', 'bus',
        'train', 'airline', 'flight', 'car rental', 'hertz', 'enterprise'
      ],
      'Shopping': [
        'amazon', 'ebay', 'apple store', 'best buy', 'home depot',
        'lowes', 'macys', 'nordstrom', 'gap', 'old navy', 'kohls',
        'tj maxx', 'marshalls', 'walmart', 'target', 'cvs', 'walgreens'
      ],
      'Bills & Utilities': [
        'electric', 'electricity', 'water', 'gas company', 'internet',
        'phone', 'cell', 'verizon', 'att', 'tmobile', 'sprint',
        'comcast', 'xfinity', 'spectrum', 'cox', 'utility', 'power',
        'insurance', 'mortgage', 'rent'
      ],
      'Entertainment': [
        'movie', 'cinema', 'theater', 'netflix', 'spotify', 'hulu',
        'disney', 'amazon prime', 'youtube', 'game', 'steam',
        'playstation', 'xbox', 'nintendo', 'concert', 'ticket'
      ],
      'Health & Medical': [
        'pharmacy', 'cvs', 'walgreens', 'rite aid', 'doctor', 'medical',
        'hospital', 'clinic', 'dentist', 'dental', 'vision', 'health',
        'prescription', 'medicine', 'gym', 'fitness', 'yoga'
      ],
      'Financial Services': [
        'bank', 'atm', 'fee', 'interest', 'transfer', 'payment',
        'credit card', 'loan', 'mortgage', 'investment'
      ],
      'Subscription Services': [
        'subscription', 'monthly', 'netflix', 'spotify', 'adobe',
        'microsoft', 'google', 'dropbox', 'icloud', 'membership'
      ]
    };

    // First, try to match against our AI patterns
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some(pattern => desc.includes(pattern))) {
        return category;
      }
    }

    // If no AI match, try to improve the bank's category
    const bankCategory = originalCategory.toLowerCase();
    
    // Map common bank categories to our categories
    const bankCategoryMap: Record<string, string> = {
      'restaurants': 'Food & Dining',
      'gas stations': 'Transportation',
      'grocery stores': 'Groceries',
      'department stores': 'Shopping',
      'online purchases': 'Shopping',
      'utilities': 'Bills & Utilities',
      'entertainment': 'Entertainment',
      'healthcare': 'Health & Medical',
      'automotive': 'Transportation',
      'travel': 'Transportation',
      'services': 'Services',
      'fees': 'Financial Services'
    };

    // Check if bank category maps to our categories
    for (const [bankCat, ourCat] of Object.entries(bankCategoryMap)) {
      if (bankCategory.includes(bankCat)) {
        return ourCat;
      }
    }

    // Default to 'Other' if no match found
    return 'Other';
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private generateInsights(transactions: Transaction[], summary: ProcessedCSV['summary']): string[] {
    const insights: string[] = [];
    
    // Spending insights
    if (summary.totalDebits > 0) {
      const avgTransaction = summary.totalDebits / transactions.filter(t => t.type === 'debit').length;
      insights.push(`Your average transaction amount is $${avgTransaction.toFixed(2)}`);
    }

    // Category insights
    const topSpendingCategory = Object.entries(
      transactions
        .filter(t => t.type === 'debit')
        .reduce((acc, t) => {
          acc[t.aiCategory] = (acc[t.aiCategory] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => b - a)[0];

    if (topSpendingCategory) {
      insights.push(`Your highest spending category is ${topSpendingCategory[0]} at $${topSpendingCategory[1].toFixed(2)}`);
    }

    // Frequency insights
    const foodTransactions = transactions.filter(t => 
      t.aiCategory === 'Food & Dining' && t.type === 'debit'
    ).length;
    
    if (foodTransactions > 0) {
      insights.push(`You made ${foodTransactions} dining transactions this period`);
    }

    // Date range insight
    insights.push(`Transaction period: ${summary.dateRange.start} to ${summary.dateRange.end}`);

    return insights;
  }

  async processCSV(csvContent: string): Promise<ProcessedCSV> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          // Normalize header names to handle variations
          const normalized = header.trim().toLowerCase();
          const headerMap: Record<string, string> = {
            'transaction date': 'Transaction Date',
            'posted date': 'Posted Date', 
            'card no.': 'Card No.',
            'card no': 'Card No.',
            'description': 'Description',
            'category': 'Category',
            'debit': 'Debit',
            'credit': 'Credit'
          };
          return headerMap[normalized] || header;
        },
        complete: (results) => {
          try {
            const transactions: Transaction[] = [];
            let totalDebits = 0;
            let totalCredits = 0;
            const dates: string[] = [];

            results.data.forEach((row: any, index: number) => {
              const debitAmount = parseFloat(row.Debit || row.debit || 0);
              const creditAmount = parseFloat(row.Credit || row.credit || 0);
              
              // Skip rows with no monetary value
              if (debitAmount === 0 && creditAmount === 0) return;

              const transactionDate = this.formatDate(row['Transaction Date'] || row['transaction date'] || '');
              const postedDate = this.formatDate(row['Posted Date'] || row['posted date'] || '');
              const description = row.Description || row.description || 'Unknown Transaction';
              const originalCategory = row.Category || row.category || 'Uncategorized';
              const cardNumber = (row['Card No.'] || row['card no'] || '').toString();

              dates.push(transactionDate);

              if (debitAmount > 0) {
                transactions.push({
                  id: `debit_${index}`,
                  transactionDate,
                  postedDate,
                  cardNumber,
                  description,
                  originalCategory,
                  aiCategory: this.aiCategorizeTransaction(description, originalCategory),
                  amount: debitAmount,
                  type: 'debit'
                });
                totalDebits += debitAmount;
              }

              if (creditAmount > 0) {
                transactions.push({
                  id: `credit_${index}`,
                  transactionDate,
                  postedDate,
                  cardNumber,
                  description,
                  originalCategory,
                  aiCategory: 'Income/Refund',
                  amount: creditAmount,
                  type: 'credit'
                });
                totalCredits += creditAmount;
              }
            });

            // Calculate category breakdowns
            const aiCategoryBreakdown: Record<string, { total: number; count: number }> = {};
            const originalCategoryBreakdown: Record<string, { total: number; count: number }> = {};

            transactions.forEach(transaction => {
              // AI category breakdown
              if (!aiCategoryBreakdown[transaction.aiCategory]) {
                aiCategoryBreakdown[transaction.aiCategory] = { total: 0, count: 0 };
              }
              aiCategoryBreakdown[transaction.aiCategory].total += transaction.amount;
              aiCategoryBreakdown[transaction.aiCategory].count += 1;

              // Original category breakdown
              if (!originalCategoryBreakdown[transaction.originalCategory]) {
                originalCategoryBreakdown[transaction.originalCategory] = { total: 0, count: 0 };
              }
              originalCategoryBreakdown[transaction.originalCategory].total += transaction.amount;
              originalCategoryBreakdown[transaction.originalCategory].count += 1;
            });

            // Sort dates to get range
            dates.sort();
            const dateRange = {
              start: dates[0] || '',
              end: dates[dates.length - 1] || ''
            };

            const summary = {
              totalDebits,
              totalCredits,
              netAmount: totalCredits - totalDebits,
              transactionCount: transactions.length,
              dateRange
            };

            const processedData: ProcessedCSV = {
              transactions,
              summary,
              categoryBreakdown: {
                ai: aiCategoryBreakdown,
                original: originalCategoryBreakdown
              },
              insights: this.generateInsights(transactions, summary)
            };

            resolve(processedData);
          } catch (error) {
            reject(new Error(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        },
        error: (error: { message: any; }) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  }

  // Helper method to get spending by category for charts
  getSpendingByCategory(transactions: Transaction[]): Record<string, number> {
    return transactions
      .filter(t => t.type === 'debit')
      .reduce((acc, transaction) => {
        acc[transaction.aiCategory] = (acc[transaction.aiCategory] || 0) + transaction.amount;
        return acc;
      }, {} as Record<string, number>);
  }

  // Helper method to compare AI vs Bank categorization accuracy
  getCategoryComparison(transactions: Transaction[]): {
    improved: number;
    unchanged: number;
    total: number;
  } {
    let improved = 0;
    let unchanged = 0;

    transactions.forEach(t => {
      if (t.aiCategory !== t.originalCategory && t.aiCategory !== 'Other') {
        improved++;
      } else {
        unchanged++;
      }
    });

    return {
      improved,
      unchanged,
      total: transactions.length
    };
  }
}

export const csvProcessingService = new CSVProcessingService();