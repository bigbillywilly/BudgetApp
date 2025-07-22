// server/src/utils/validators.ts
import Joi from 'joi';

// UUID validation
export const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

// Date validation helpers
export const dateSchema = Joi.date().iso();
export const monthSchema = Joi.number().integer().min(1).max(12);
export const yearSchema = Joi.number().integer().min(2020).max(2030);

// Financial amount validation
export const amountSchema = Joi.number().precision(2).min(0);
export const signedAmountSchema = Joi.number().precision(2);

// Email validation
export const emailSchema = Joi.string().email().lowercase();

// Password validation with requirements
export const passwordSchema = Joi.string()
  .min(8)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
  });

// Pagination validation
export const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
};

// Query filters validation
export const dateRangeSchema = {
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional()
};

// Transaction category validation
export const categorySchema = Joi.string().valid(
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Education',
  'Income',
  'Other'
);

// Transaction type validation
export const transactionTypeSchema = Joi.string().valid('income', 'expense');

// Custom validation functions
export const validateDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};

export const validateMonthYear = (month: number, year: number): boolean => {
  const currentDate = new Date();
  const inputDate = new Date(year, month - 1, 1);
  const maxDate = new Date(currentDate.getFullYear() + 1, 11, 31);
  return inputDate <= maxDate;
};

// Sanitization helpers
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

export const sanitizeDescription = (description: string): string => {
  return sanitizeString(description).substring(0, 255);
};

export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};