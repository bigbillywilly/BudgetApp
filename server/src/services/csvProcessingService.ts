import Papa from 'papaparse';

export interface Transaction {
  id: string;
  transactionDate: string;
  postedDate: string;
  cardNumber: string;
  description: string;
  originalCategory: string;
  aiCategory: string;
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

// CSV processing service for parsing, categorization, and analytics
export class CSVProcessingService {
  // Use CSV category first, then AI as fallback
  private categorizeTransaction(description: string, originalCategory: string): string {
    // Define your hardcoded categories
    const validCategories = [
      'Grocery', 'Health', 'Wifi / Utilities', 'Household', 'Laundry',
      'Rideshare', 'Travel', 'Dining', 'Drinks/Dessert', 'Alcohol',
      'Fashion', 'Beauty', 'Gym', 'Entertainment', 'Subscription',
      'Credit', 'Income', 'Merchandise', 'Gifts', 'Other'
    ];

    // If CSV has a category and it's one of your valid categories, use it directly
    if (originalCategory && originalCategory.trim() && originalCategory !== 'Uncategorized') {
      const category = originalCategory.trim();
      
      // Check if it's already a valid category
      if (validCategories.includes(category)) {
        return category;
      }
      
      // Map some common variations to your standard names
      const categoryMappings: Record<string, string> = {
        'Restaurants': 'Dining',
        'Gas Stations': 'Travel',
        'Grocery Stores': 'Grocery',
        'Department Stores': 'Merchandise',
        'Online Purchases': 'Merchandise',
        'Utilities': 'Wifi / Utilities',
        'Healthcare': 'Health',
        'Automotive': 'Travel',
        'Services': 'Other',
        'Fees': 'Credit'
      };

      // If there's a mapping, use it
      if (categoryMappings[category]) {
        return categoryMappings[category];
      }
      
      // If CSV category is not in your hardcoded list, fall through to AI categorization
    }

    // Only use AI categorization as fallback when CSV category is missing/invalid
    const desc = description.toLowerCase();
    
    // MUFG salary detection for income
    if (desc.includes('mufg') || desc.includes('salary') || desc.includes('paycheck')) {
      return 'Income';
    }

    // Basic fallback categorization
    const basicCategories = {
      'Dining': ['restaurant', 'cafe', 'food', 'pizza', 'burger', 'starbucks', 'mcdonald'],
      'Grocery': ['grocery', 'supermarket', 'safeway', 'whole foods', 'trader joe'],
      'Travel': ['gas', 'fuel', 'uber', 'lyft', 'airline', 'hotel'],
      'Merchandise': ['amazon', 'target', 'walmart', 'store', 'shopping'],
      'Health': ['pharmacy', 'cvs', 'walgreens', 'doctor', 'medical'],
      'Entertainment': ['netflix', 'spotify', 'movie', 'theater'],
      'Wifi / Utilities': ['internet', 'phone', 'electric', 'water', 'utility'],
      'Credit': ['payment', 'transfer', 'fee']
    };

    for (const [category, keywords] of Object.entries(basicCategories)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }

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

  // Generate insights based on transaction summary and category breakdowns
  private generateInsights(transactions: Transaction[], summary: ProcessedCSV['summary']): string[] {
    const insights: string[] = [];

    if (summary.totalDebits > 0) {
      const avgTransaction = summary.totalDebits / transactions.filter(t => t.type === 'debit').length;
      insights.push(`Your average transaction amount is $${avgTransaction.toFixed(2)}`);
    }

    const topSpendingCategory = Object.entries(
      transactions
        .filter(t => t.type === 'debit')
        .reduce((acc, t) => {
          acc[t.aiCategory] = (acc[t.aiCategory] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>)
    ).sort(([, a], [, b]) => b - a)[0];

    if (topSpendingCategory) {
      insights.push(`Your highest spending category is ${topSpendingCategory[0]} at $${topSpendingCategory[1].toFixed(2)}`);
    }

    const diningTransactions = transactions.filter(t =>
      t.aiCategory === 'Dining' && t.type === 'debit'
    ).length;

    if (diningTransactions > 0) {
      insights.push(`You made ${diningTransactions} dining transactions this period`);
    }

    insights.push(`Transaction period: ${summary.dateRange.start} to ${summary.dateRange.end}`);

    return insights;
  }

  // Parse CSV, categorize, summarize, and generate insights
  async processCSV(csvContent: string): Promise<ProcessedCSV> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
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
                  aiCategory: this.categorizeTransaction(description, originalCategory),
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
                  aiCategory: 'Income',
                  amount: creditAmount,
                  type: 'credit'
                });
                totalCredits += creditAmount;
              }
            });

            const aiCategoryBreakdown: Record<string, { total: number; count: number }> = {};
            const originalCategoryBreakdown: Record<string, { total: number; count: number }> = {};

            transactions.forEach(transaction => {
              if (!aiCategoryBreakdown[transaction.aiCategory]) {
                aiCategoryBreakdown[transaction.aiCategory] = { total: 0, count: 0 };
              }
              aiCategoryBreakdown[transaction.aiCategory].total += transaction.amount;
              aiCategoryBreakdown[transaction.aiCategory].count += 1;

              if (!originalCategoryBreakdown[transaction.originalCategory]) {
                originalCategoryBreakdown[transaction.originalCategory] = { total: 0, count: 0 };
              }
              originalCategoryBreakdown[transaction.originalCategory].total += transaction.amount;
              originalCategoryBreakdown[transaction.originalCategory].count += 1;
            });

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

  // Aggregate spending by AI category for charting
  getSpendingByCategory(transactions: Transaction[]): Record<string, number> {
    return transactions
      .filter(t => t.type === 'debit')
      .reduce((acc, transaction) => {
        acc[transaction.aiCategory] = (acc[transaction.aiCategory] || 0) + transaction.amount;
        return acc;
      }, {} as Record<string, number>);
  }

  // Compare AI vs Bank categorization accuracy
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