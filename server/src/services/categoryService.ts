// server/src/services/categoryService.ts
import { Pool } from 'pg';
import { db } from '../database/connection';
import { logInfo, logError } from '../utils/logger';

export interface TransactionCategory {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_at: Date;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  is_default?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
}

export interface CategoryStats {
  categoryName: string;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  lastUsed: Date | null;
}

export interface CategoryUsage {
  category: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

// Category service for CRUD, analytics, and auto-categorization
class CategoryService {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  async getAllCategories(): Promise<TransactionCategory[]> {
    try {
      const result = await this.pool.query(`
        SELECT id, name, description, is_default, created_at
        FROM transaction_categories
        ORDER BY is_default DESC, name ASC
      `);
      return result.rows;
    } catch (error) {
      logError('Failed to get all categories', error);
      throw error;
    }
  }

  async getDefaultCategories(): Promise<TransactionCategory[]> {
    try {
      const result = await this.pool.query(`
        SELECT id, name, description, is_default, created_at
        FROM transaction_categories
        WHERE is_default = true
        ORDER BY name ASC
      `);
      return result.rows;
    } catch (error) {
      logError('Failed to get default categories', error);
      throw error;
    }
  }

  async getCategoryById(categoryId: string): Promise<TransactionCategory | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, name, description, is_default, created_at FROM transaction_categories WHERE id = $1',
        [categoryId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logError('Failed to get category by ID', error);
      throw error;
    }
  }

  async getCategoryByName(name: string): Promise<TransactionCategory | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, name, description, is_default, created_at FROM transaction_categories WHERE LOWER(name) = LOWER($1)',
        [name]
      );
      return result.rows[0] || null;
    } catch (error) {
      logError('Failed to get category by name', error);
      throw error;
    }
  }

  async createCategory(categoryData: CreateCategoryData): Promise<TransactionCategory> {
    try {
      const existing = await this.getCategoryByName(categoryData.name);
      if (existing) {
        throw new Error('Category with this name already exists');
      }
      const result = await this.pool.query(`
        INSERT INTO transaction_categories (name, description, is_default)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, is_default, created_at
      `, [
        categoryData.name.trim(),
        categoryData.description?.trim() || null,
        categoryData.is_default || false
      ]);
      const category = result.rows[0];
      logInfo('Category created', { categoryId: category.id, name: category.name });
      return category;
    } catch (error) {
      logError('Failed to create category', error);
      throw error;
    }
  }

  async updateCategory(categoryId: string, updateData: UpdateCategoryData): Promise<TransactionCategory> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.name) {
        const existing = await this.getCategoryByName(updateData.name);
        if (existing && existing.id !== categoryId) {
          throw new Error('Category with this name already exists');
        }
        fields.push(`name = $${paramCount}`);
        values.push(updateData.name.trim());
        paramCount++;
      }

      if (updateData.description !== undefined) {
        fields.push(`description = $${paramCount}`);
        values.push(updateData.description?.trim() || null);
        paramCount++;
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(categoryId);

      const result = await this.pool.query(`
        UPDATE transaction_categories
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, name, description, is_default, created_at
      `, values);

      if (result.rows.length === 0) {
        throw new Error('Category not found');
      }

      const category = result.rows[0];
      logInfo('Category updated', { categoryId, name: category.name });
      return category;
    } catch (error) {
      logError('Failed to update category', error);
      throw error;
    }
  }

  async deleteCategory(categoryId: string, replacementCategoryId?: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const categoryResult = await client.query(
        'SELECT id, name, is_default FROM transaction_categories WHERE id = $1',
        [categoryId]
      );
      if (categoryResult.rows.length === 0) {
        throw new Error('Category not found');
      }
      const category = categoryResult.rows[0];
      if (category.is_default && !replacementCategoryId) {
        throw new Error('Cannot delete default category without providing a replacement category');
      }
      const transactionCount = await client.query(
        'SELECT COUNT(*) as count FROM transactions WHERE category = $1',
        [category.name]
      );
      const count = parseInt(transactionCount.rows[0].count);

      if (count > 0) {
        if (!replacementCategoryId) {
          throw new Error(`Cannot delete category '${category.name}' because it is used by ${count} transactions. Provide a replacement category.`);
        }
        const replacementResult = await client.query(
          'SELECT id, name FROM transaction_categories WHERE id = $1',
          [replacementCategoryId]
        );
        if (replacementResult.rows.length === 0) {
          throw new Error('Replacement category not found');
        }
        const replacementCategory = replacementResult.rows[0];
        await client.query(
          'UPDATE transactions SET category = $1 WHERE category = $2',
          [replacementCategory.name, category.name]
        );
        logInfo('Updated transactions with replacement category', {
          oldCategory: category.name,
          newCategory: replacementCategory.name,
          transactionCount: count
        });
      }

      await client.query('DELETE FROM transaction_categories WHERE id = $1', [categoryId]);
      await client.query('COMMIT');
      logInfo('Category deleted', { 
        categoryId, 
        categoryName: category.name, 
        affectedTransactions: count 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Failed to delete category', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getCategoryStats(userId: string, startDate?: Date, endDate?: Date): Promise<CategoryStats[]> {
    try {
      let query = `
        SELECT 
          t.category as category_name,
          COUNT(t.id) as transaction_count,
          SUM(t.amount) as total_amount,
          AVG(t.amount) as average_amount,
          MAX(t.transaction_date) as last_used
        FROM transactions t
        WHERE t.user_id = $1
      `;
      const params = [userId];
      let paramCount = 2;

      if (startDate) {
        query += ` AND t.transaction_date >= $${paramCount}`;
        params.push(startDate.toISOString().slice(0, 10));
        paramCount++;
      }
      if (endDate) {
        query += ` AND t.transaction_date <= $${paramCount}`;
        params.push(endDate.toISOString().slice(0, 10));
        paramCount++;
      }
      query += `
        GROUP BY t.category
        ORDER BY total_amount DESC
      `;
      const result = await this.pool.query(query, params);
      return result.rows.map(row => ({
        categoryName: row.category_name,
        transactionCount: parseInt(row.transaction_count),
        totalAmount: parseFloat(row.total_amount),
        averageAmount: parseFloat(row.average_amount),
        lastUsed: row.last_used
      }));
    } catch (error) {
      logError('Failed to get category stats', error);
      throw error;
    }
  }

  async getCategoryUsage(userId: string, startDate?: Date, endDate?: Date): Promise<CategoryUsage[]> {
    try {
      const stats = await this.getCategoryStats(userId, startDate, endDate);
      const totalAmount = stats.reduce((sum, stat) => sum + stat.totalAmount, 0);
      return stats.map(stat => ({
        category: stat.categoryName,
        count: stat.transactionCount,
        totalAmount: stat.totalAmount,
        percentage: totalAmount > 0 ? (stat.totalAmount / totalAmount) * 100 : 0
      }));
    } catch (error) {
      logError('Failed to get category usage', error);
      throw error;
    }
  }

  // Simple keyword-based auto-categorization for transactions
  async categorizeTransaction(description: string, amount?: number): Promise<string> {
    try {
      const desc = description.toLowerCase();
      const categories = await this.getAllCategories();
      const categoryRules = {
        'Food & Dining': [
          'restaurant', 'food', 'pizza', 'burger', 'coffee', 'cafe', 'diner',
          'mcdonald', 'burger king', 'starbucks', 'subway', 'taco bell',
          'grocery', 'safeway', 'walmart grocery', 'whole foods', 'trader joe',
          'doordash', 'uber eats', 'grubhub', 'postmates'
        ],
        'Transportation': [
          'gas', 'fuel', 'chevron', 'shell', 'exxon', 'bp', 'texaco',
          'uber', 'lyft', 'taxi', 'bus', 'train', 'metro', 'transit',
          'parking', 'toll', 'car wash', 'auto', 'mechanic'
        ],
        'Bills & Utilities': [
          'electric', 'electricity', 'pge', 'water', 'sewer', 'trash',
          'internet', 'wifi', 'comcast', 'verizon', 'at&t', 'phone',
          'cell', 'mobile', 'insurance', 'rent', 'mortgage', 'utility'
        ],
        'Entertainment': [
          'netflix', 'hulu', 'disney', 'spotify', 'apple music', 'youtube',
          'movie', 'theater', 'cinema', 'game', 'steam', 'xbox', 'playstation',
          'concert', 'show', 'ticket', 'entertainment'
        ],
        'Shopping': [
          'amazon', 'target', 'walmart', 'costco', 'home depot', 'lowes',
          'store', 'retail', 'shopping', 'mall', 'outlet', 'ebay'
        ],
        'Healthcare': [
          'pharmacy', 'cvs', 'walgreens', 'medical', 'doctor', 'dr.',
          'hospital', 'clinic', 'dentist', 'dental', 'health', 'medicine'
        ],
        'Travel': [
          'hotel', 'motel', 'airbnb', 'flight', 'airline', 'airport',
          'rental car', 'hertz', 'avis', 'travel', 'vacation'
        ],
        'Education': [
          'school', 'university', 'college', 'tuition', 'book', 'textbook',
          'course', 'class', 'education', 'learning'
        ]
      };

      if (amount && amount > 0) {
        const incomeKeywords = ['salary', 'paycheck', 'deposit', 'income', 'pay', 'wage'];
        if (incomeKeywords.some(keyword => desc.includes(keyword))) {
          return 'Income';
        }
      }

      for (const [categoryName, keywords] of Object.entries(categoryRules)) {
        if (keywords.some(keyword => desc.includes(keyword))) {
          return categoryName;
        }
      }

      return 'Other';
    } catch (error) {
      logError('Failed to categorize transaction', error);
      return 'Other';
    }
  }

  async getMostUsedCategories(userId: string, limit: number = 10): Promise<CategoryUsage[]> {
    try {
      const result = await this.pool.query(`
        SELECT 
          category,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM transactions 
        WHERE user_id = $1 
        GROUP BY category 
        ORDER BY count DESC, total_amount DESC 
        LIMIT $2
      `, [userId, limit]);

      const totalTransactions = await this.pool.query(
        'SELECT COUNT(*) as total FROM transactions WHERE user_id = $1',
        [userId]
      );
      const total = parseInt(totalTransactions.rows[0].total);

      return result.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        totalAmount: parseFloat(row.total_amount),
        percentage: total > 0 ? (parseInt(row.count) / total) * 100 : 0
      }));
    } catch (error) {
      logError('Failed to get most used categories', error);
      throw error;
    }
  }

  async suggestCategoriesForUser(userId: string): Promise<string[]> {
    try {
      const mostUsed = await this.getMostUsedCategories(userId, 5);
      const allCategories = await this.getDefaultCategories();
      const usedCategoryNames = mostUsed.map(c => c.category);
      const unusedCategories = allCategories
        .filter(cat => !usedCategoryNames.includes(cat.name))
        .map(cat => cat.name);
      return [...usedCategoryNames, ...unusedCategories.slice(0, 5)];
    } catch (error) {
      logError('Failed to suggest categories', error);
      throw error;
    }
  }

  // Merge two categories and update all related transactions
  async mergeCategories(sourceCategoryId: string, targetCategoryId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const sourceResult = await client.query(
        'SELECT id, name FROM transaction_categories WHERE id = $1',
        [sourceCategoryId]
      );
      const targetResult = await client.query(
        'SELECT id, name FROM transaction_categories WHERE id = $1',
        [targetCategoryId]
      );
      if (sourceResult.rows.length === 0 || targetResult.rows.length === 0) {
        throw new Error('One or both categories not found');
      }
      const sourceCategory = sourceResult.rows[0];
      const targetCategory = targetResult.rows[0];

      // Update all transactions from source to target category
      const updateResult = await client.query(
        'UPDATE transactions SET category = $1 WHERE category = $2',
        [targetCategory.name, sourceCategory.name]
      );

      // Delete the source category
      await client.query('DELETE FROM transaction_categories WHERE id = $1', [sourceCategoryId]);
      await client.query('COMMIT');

      logInfo('Categories merged', {
        sourceCategory: sourceCategory.name,
        targetCategory: targetCategory.name,
        transactionsUpdated: updateResult.rowCount
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logError('Failed to merge categories', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export const categoryService = new CategoryService();