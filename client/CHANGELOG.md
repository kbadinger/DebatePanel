# Changelog

All notable changes to DebatePanel will be documented in this file.

## [2.0.0] - 2025-08-09

### 🎮 Game Winner Features
- Added comprehensive winner determination system
- Implemented scoring system (0-100) across multiple dimensions
- Created beautiful winner display UI with trophy announcements
- Added performance leaderboard with badges
- Integrated victory criteria into judge analysis
- Database schema updated with winner and scoring tables

### 🤖 Model Updates (August 2025)
- **OpenAI**: Added GPT-5 series (Regular, Mini, Nano)
- **OpenAI**: Added o3 series (Pro, Mini, Deep Research)
- **OpenAI**: Updated o1 series (Pro, Mini)
- **Anthropic**: Updated to Claude 4.1 series (Opus, Sonnet, Haiku)
- **Google**: Added Gemini 2.0 Flash experimental
- **Mistral**: Added Mistral Saba and latest versions
- **X.AI**: Updated to Grok Beta and Grok 2

### 🛠️ Technical Improvements
- Created model discovery scripts for all providers
- Added `fetch-all-models.js` script for checking latest models
- Updated pricing configuration for all new models
- Improved judge analysis to extract winner and scores
- Enhanced database schema with DebateScore model

### 📚 Documentation
- Created comprehensive FEATURES.md
- Added detailed SETUP_GUIDE.md
- Updated README with latest features
- Added model update instructions

## [1.5.0] - 2025-07-31

### Features
- Interactive debate mode with human participation
- Real-time participant tracking
- Human input panel for debate contributions

## [1.4.0] - 2025-07-22

### Features
- Admin user system with unlimited access
- Admin panel at `/admin` route
- User management capabilities
- Credit management for admin users

## [1.3.0] - 2025-07-21

### Features
- Token tracking and usage analytics
- Cost calculation with platform markup
- Judge analysis with nuanced verdicts
- Orchestrator for managing debate flow

## [1.2.0] - 2025-07-16

### Features
- Subscription system (Free, Starter, Pro, Teams)
- Stripe payment integration
- Credit-based usage tracking
- Authentication with NextAuth.js

## [1.1.0] - 2025-07-16

### Features
- Database persistence with PostgreSQL
- Prisma ORM integration
- Debate history tracking
- User accounts and sessions

## [1.0.0] - 2025-07-01

### Initial Release
- Multi-model AI debates
- Support for OpenAI, Anthropic, Google models
- Real-time streaming responses
- Three debate formats (free-form, structured, devils-advocate)
- Convergence detection
- Basic UI with Tailwind CSS