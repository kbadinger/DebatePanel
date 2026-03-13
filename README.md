# DebatePanel

A multi-AI debate platform where 25+ AI models from 13 providers argue different sides of any topic, scored by an AI judge.

## Repository Structure

This is the parent repository. The application code lives in the [`debate-panel/`](debate-panel/) submodule.

```
DebatePanel/
├── debate-panel/       # Main application (Next.js)
├── debate-processor/   # Background processor service
├── start-local.sh      # Start all services locally
└── test-local.sh       # Start and test locally
```

## Quick Start

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/kbadinger/DebatePanel.git
cd DebatePanel

# Setup the app
cd debate-panel
npm install
cp .env.example .env.local
# Edit .env.local with your API keys

# Database
npx prisma migrate dev

# Run
npm run dev
```

Or use the local start script:

```bash
./start-local.sh
```

See [`debate-panel/README.md`](debate-panel/README.md) for full setup instructions, supported providers, and documentation.

## License

[MIT](LICENSE)
