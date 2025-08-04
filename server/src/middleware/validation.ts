// server/src/middleware/validation.ts
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Middleware: validates request body against provided Joi schema
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false, // Collect all validation errors
      stripUnknown: true // Remove fields not defined in schema
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

// Auth validation schemas for registration, login, and password flows
export const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
  })
};

// Financial data validation schemas for monthly budget management
export const financialSchemas = {
  monthlyData: Joi.object({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2020).max(2030).required(),
    income: Joi.number().min(0).precision(2).required(),
    fixedExpenses: Joi.number().min(0).precision(2).required(),
    savingsGoal: Joi.number().min(0).precision(2).required()
  }),

  updateMonthlyData: Joi.object({
    income: Joi.number().min(0).precision(2).optional(),
    fixedExpenses: Joi.number().min(0).precision(2).optional(),
    savingsGoal: Joi.number().min(0).precision(2).optional()
  })
};

// Transaction validation schema for creation endpoint
export const transactionSchemas = {
  createTransaction: Joi.object({
    date: Joi.date().required(),
    description: Joi.string().min(1).max(255).required(),
    category: Joi.string().valid(
      'Food & Dining',
      'Shopping',
      'Transportation',
      'Bills & Utilities',
      'Entertainment',
      'Healthcare',
      'Travel',
      'Education',
      'Other'
    ).required(),
    amount: Joi.number().not(0).precision(2).required(),
    type: Joi.string().valid('income', 'expense').required()
  })
};

// Chat validation schema for message sending
export const chatSchemas = {
  sendMessage: Joi.object({
    message: Joi.string().min(1).max(1000).required().messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 1000 characters'
    })
  })
};

// File upload validation middleware for CSV uploads
export const fileValidation = {
  validateCSV: (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Enforce CSV file type
    if (req.file.mimetype !== 'text/csv' && !req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({
        success: false,
        message: 'Only CSV files are allowed'
      });
    }

    // Enforce 5MB file size limit
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size cannot exceed 5MB'
      });
    }

    next();
  }
};