# MoneyWise

A full-stack personal finance tracking application built with React, TypeScript, and Node.js. MoneyWise helps users manage their monthly budgets, track expenses through CSV uploads, and get AI-powered financial advice.

![MoneyWise Dashboard](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=MoneyWise+Dashboard+Screenshot)

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

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/moneywise.git
cd moneywise
```

### 2. Install Client Dependencies
```bash
cd client
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
Navigate to `http://localhost:5173`

## Project Structure

```
moneywise/
├── client/                          # React Frontend Application
│   ├── src/
│   │   ├── components/              # Reusable UI Components
│   │   │   ├── common/              # Shared components
│   │   │   ├── dashboard/           # Dashboard-specific components
│   │   │   ├── history/             # Historical data components
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

## 🧪 Testing

```bash
# Run frontend tests
cd client
npm test

# Run backend tests (when implemented)
cd server
npm test
```

## Roadmap

### Phase 1 - Core Features (Current)
- [x] Basic financial tracking
- [x] CSV upload and parsing
- [x] Historical data view
- [x] Local data persistence
- [x] Responsive design

### Phase 2 - Backend Integration (In Progress)
- [ ] User authentication system
- [ ] PostgreSQL database setup
- [ ] RESTful API endpoints
- [ ] Data migration from localStorage
- [ ] Enhanced security features

### Phase 3 - Advanced Features
- [ ] Real AI integration (OpenAI/Anthropic)
- [ ] Advanced analytics and insights
- [ ] Goal tracking and notifications
- [ ] Export functionality
- [ ] Multi-currency support

### Phase 4 - Production
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Cloud deployment
- [ ] Performance optimization
- [ ] Comprehensive testing suite

## Contributing

This is a learning project developed for internship purposes. While not currently accepting contributions, feedback and suggestions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Me**
- GitHub: [@yourusername](https://github.com/bigbillywiwlly)

## Acknowledgments

- Built as part of my software engineering learning journey
- Inspired by modern fintech applications
- Thanks to the open-source community for the amazing tools and libraries

## Support

If you have any questions about this project, feel free to reach out or open an issue!

---

**MoneyWise** - Making personal finance management simple and intelligent.