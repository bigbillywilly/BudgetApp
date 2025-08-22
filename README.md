# MoneyWise

A full-stack personal finance tracking application built with React, TypeScript, and Node.js. MoneyWise helps users manage their monthly budgets, track expenses through CSV uploads, and get AI-powered financial advice.

https://budget-app-orpin-nu.vercel.app/

## Features

### Financial Management
- **Monthly Budget Tracking** - Set income, fixed expenses, and savings goals
- **Real-time Calculations** - Automatically calculate available spending money
- **Historical Data** - View and analyze previous months' financial data
- **Data Persistence** - Secure local storage with migration path to cloud database

### Expense Analysis
- **CSV Import** - Upload bank statements and credit card exports
- **Smart Categorization** - Automatic transaction categorization using AI
- **Spending Breakdown** - Visual representation of spending by category
- **Transaction History** - Detailed view of all imported transactions

### AI Financial Advisor
- **Personalized Advice** - Get financial recommendations based on your data
- **Interactive Chat** - Ask questions about budgeting, investing, and saving
- **Quick Questions** - Pre-built prompts for common financial topics
- **Chat History** - Access previous conversations and advice

### Architecture & Technical Features
- **Clean Architecture** - Separation of concerns with service layer pattern
- **TypeScript** - Full type safety across frontend and backend
- **Responsive Design** - Mobile-first design with Tailwind CSS
- **Component-Based** - Reusable React components with modern hooks
- **API-Ready** - Backend-ready architecture with easy migration path

## Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful SVG icons
- **Papa Parse** - Robust CSV parsing library
- **Vite** - Fast build tool and development server

### Backend (In Development)
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe backend development
- **PostgreSQL** - Relational database for user data
- **Redis** - Caching and session management
- **JWT** - Secure authentication
- **Multer** - File upload handling

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Git** - Version control
- **Docker** - Containerization (coming soon)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

## Project Structure

```
BudgetApp/
├── client/                          # React Frontend Application
│   ├── src/
│   │   ├── components/              # Reusable UI Components
│   │   │   ├── common/              # Shared components
│   │   │   ├── dashboard/           # Dashboard-specific components
│   │   │   └── chat/                # AI chat components
│   │   ├── services/                # API and data services
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── utils/                   # Helper functions
│   │   ├── types/                   # TypeScript type definitions
│   │   └── pages/                   # Main page components
│   └── package.json
├── server/                          # Node.js Backend API
│   ├── src/
│   │   ├── controllers/             # Route handlers
│   │   ├── services/                # Business logic
│   │   ├── models/                  # Database models
│   │   ├── routes/                  # API routes
│   │   ├── middleware/              # Custom middleware
│   │   ├── database/                # Database configuration
│   │   └── utils/                   # Backend utilities
│   └── package.json
├── shared/                          # Shared types and utilities
└── docs/                           # Documentation
```

## Usage

### Dashboard
1. Enter your monthly income in the first card
2. Add your fixed expenses (rent, utilities, etc.)
3. Set your savings goal
4. View your available spending money automatically calculated

### CSV Upload
1. Click "Upload Expenses" on the dashboard
2. Select a CSV file from your bank or credit card
3. Watch as transactions are automatically categorized
4. View spending breakdown by category

### Previous Months
1. Click "Previous Months" in the navigation
2. Select a month from the dropdown
3. View historical financial data and patterns
4. Compare spending across different months

### AI Advisor
1. Navigate to the "AI Advisor" tab
2. Ask questions about your finances
3. Use quick question buttons for common topics
4. Get personalized advice based on your spending patterns

## Author

**Me**
- GitHub: [@bigbillywilly](https://github.com/bigbillywilly)

## Acknowledgments

- Built as part of my software engineering learning journey
- Inspired by modern fintech applications

## Support

If you have any questions about this project, feel free to reach out or open an issue!

---

**MoneyWise** - Making personal finance management simple and intelligent.
