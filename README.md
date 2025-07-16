# MoneyWise

A smart web application that helps families manage their budgets with AI-powered insights and automated expense tracking.

## What is MoneyWise?

MoneyWise transforms family budget management by automating expense tracking and providing intelligent financial insights. Access everything through your web browser - no downloads required.

**Website:** [moneywise.com](https://moneywise.com) *(coming soon)*  
**Mobile Apps:** iOS and Android versions launching in 2026

## Key Features

- **Smart Budget Creation** - Set up monthly and yearly budgets with custom categories
- **Automated Expense Tracking** - Upload bank statements (CSV) for automatic categorization
- **AI Financial Insights** - Ask "Where can we save money?" and get personalized recommendations
- **Mobile-Responsive** - Full functionality on any device through your browser
- **Family-Focused** - Designed specifically for household budget management
- **Secure & Private** - Bank-level security with no data sharing

## Getting Started

1. **Visit** [moneywise.com](https://moneywise.com)
2. **Create account** with email and password
3. **Set up budget** with income and expense categories
4. **Track expenses** manually or upload CSV files
5. **Get AI insights** about your spending patterns

## Why MoneyWise?

### **Instant Access**
- Works in any web browser (Chrome, Firefox, Safari, Edge)
- No app installation required
- Automatic updates with new features
- Access from desktop, tablet, or mobile

### **AI-Powered Intelligence**
- Natural language queries: "How much did we spend on groceries?"
- Personalized saving recommendations
- Automatic transaction categorization
- Spending pattern analysis and optimization

### **Family-Centered**
- Built for household budget management
- Multiple budget types (monthly, yearly, project-based)
- Collaborative expense tracking
- Privacy-first approach

## Technology

**Built with modern, reliable technology:**
- React + TypeScript frontend for fast, reliable performance
- Node.js + Express backend for secure API responses
- PostgreSQL database for financial data integrity
- OpenAI GPT-4 integration for intelligent insights

**Performance:** Page loads under 2 seconds, 99.9% uptime, bank-level security

## Roadmap

- **2025 July:** Core budgeting and AI insights
- **2025 July:** Advanced visualizations and mobile optimization
- **2025 August:** Enhanced AI features and data export
- **2026:** Native mobile apps for iOS and Android

## Architecture
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │            REACT APPLICATION                    │   │
│  │  (MoneyWise Frontend - TypeScript + Tailwind)  │   │
│  │                                                 │   │
│  │  • Budget Dashboard                             │   │
│  │  • Transaction Forms                            │   │
│  │  • CSV Upload Interface                         │   │
│  │  • AI Chat Interface                            │   │
│  │  • Charts & Visualizations                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS/REST API Calls
                               │ (JSON requests/responses)
                               ▼
┌─────────────────────────────────────────────────────────┐
│                   EXPRESS.JS SERVER                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │            API ENDPOINTS                        │   │
│  │  • POST /api/auth/login                         │   │
│  │  • GET  /api/budgets                            │   │
│  │  • POST /api/transactions                       │   │
│  │  • POST /api/upload/csv                         │   │
│  │  • POST /api/ai/insights                        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │           BUSINESS LOGIC                        │   │
│  │  • Authentication & JWT tokens                  │   │
│  │  • Budget calculations                          │   │
│  │  • CSV parsing & categorization                 │   │
│  │  • AI prompt engineering                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                           │
│                                                         │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │ PostgreSQL   │  │   Redis     │  │  OpenAI API    │ │
│  │   Database   │  │   Cache     │  │   (GPT-4)      │ │
│  │              │  │             │  │                │ │
│  │ • Users      │  │ • Sessions  │  │ • AI Insights  │ │
│  │ • Budgets    │  │ • API Cache │  │ • Smart        │ │
│  │ • Categories │  │ • Rate      │  │   Suggestions  │ │
│  │ • Trans-     │  │   Limiting  │  │ • Natural      │ │
│  │   actions    │  │             │  │   Language     │ │
│  │ • AI Convos  │  │             │  │   Processing   │ │
│  └──────────────┘  └─────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘

## How It Works
### How MoneyWise Works

#### User Journey Example: Adding an Expense
1. **User fills out expense form** in React interface
2. **React sends API request:** `POST /api/transactions` with expense data
3. **Express validates and processes** the transaction data
4. **PostgreSQL stores** the transaction in the database
5. **Express returns confirmation** to React
6. **React updates the UI** showing new transaction and updated budget totals

#### User Journey Example: Getting AI Insights
1. **User asks question:** "How can I reduce my grocery spending?"
2. **React sends query** to `POST /api/ai/insights`
3. **Express analyzes** user's grocery transaction history
4. **OpenAI generates** personalized recommendations
5. **Express saves conversation** and returns insights
6. **React displays AI response** in chat interface

### Technology Stack

#### Frontend (Presentation Layer)
- **React 18** - Component-based UI framework
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling for responsive design
- **Vite** - Fast development server and optimized builds
- **Zustand** - Lightweight state management
- **React Query** - Server state management and caching

#### Backend (Application Layer)
- **Node.js + Express** - Server runtime and web framework
- **TypeScript** - Type-safe server development
- **Prisma ORM** - Type-safe database operations
- **JWT Authentication** - Secure user sessions
- **Multer** - File upload handling for CSV imports
- **OpenAI Integration** - AI-powered financial insights

#### Data Layer
- **PostgreSQL** - Primary database for user and financial data
- **Redis** - Session storage and API response caching
- **OpenAI API** - Natural language processing for insights

### Database Schema

Core data entities and relationships:

```sql
Users
├── id, email, password_hash
├── family_id, created_at
└── profile information

Budgets
├── id, user_id, name
├── total_amount, period_type
└── start_date, end_date

Categories
├── id, budget_id, name
├── allocated_amount, color
└── category_type (income/expense)

Transactions
├── id, user_id, category_id
├── amount, description, date
└── source (manual/imported)

AI_Conversations
├── id, user_id, query
├── response, context
└── timestamp

## About

MoneyWise was created by Willy to solve real family budgeting challenges through modern technology and AI-powered insights. Built with professional-grade tools and security standards.

**Contact:** hello@moneywise.com
