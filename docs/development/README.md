# Development Documentation - Nutrition AI

Development workflow, AI agent protocols, and contributor guidelines.

## 📁 Contents

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI agent development protocols and instructions |
| `COMMANDS.md` | Common development commands and workflows |

## 🤖 AI Agent Development

This project uses AI-powered development with specific protocols:

### Agent Instructions
- **[CLAUDE.md](./CLAUDE.md)** - Complete AI agent protocols
- Backend-first development approach
- Comprehensive testing requirements
- Security-first implementation
- Atomic commit standards

### Current Status
- **Phase 1**: Backend Foundation & Security ✅
- **Phase 2**: Backend Features & AI Integration ✅
- **Phase 3**: Backend Optimization & DevOps ✅
- **Phase 4**: Frontend Foundation & Components ✅
- **Phase 5**: Frontend Features Implementation (In Progress)

## 🛠️ Development Workflow

### Project Phases
1. **Backend-First**: Complete backend before frontend features
2. **Testing-Driven**: Write tests before implementation
3. **Security-First**: Implement security from the start
4. **Documentation-Driven**: Update docs with changes

### Git Workflow
```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: implement new feature"
git push origin feature/new-feature

# Testing
python backend/run_tests.py --coverage
npm test --watchAll=false

# Documentation
# Update relevant docs with changes
```

## 📋 Common Commands

See [COMMANDS.md](./COMMANDS.md) for frequently used development commands.

### Backend Development
```bash
# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Development
python manage.py runserver
python run_tests.py --coverage

# Database
python manage.py makemigrations
python manage.py migrate
```

### Frontend Development
```bash
# Setup
npm install

# Development
npx expo start
npm test

# Quality
npm run lint
npm run type-check
```

## 🎯 Development Standards

### Code Quality
- **Type Hints**: All Python functions
- **TypeScript**: Strict mode enabled
- **Linting**: Black, ESLint, Prettier
- **Testing**: 80%+ backend, 70%+ frontend coverage

### Commit Standards
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, etc.
- **Atomic Commits**: One feature per commit
- **Clear Messages**: Describe the "why" not the "what"

### Documentation Standards
- **API Changes**: Update Postman guide
- **New Features**: Update relevant docs
- **Breaking Changes**: Update changelog
- **Code Comments**: Explain complex logic

## 🔄 Development Lifecycle

### 1. Planning
- Review PROJECT_PLAN.md for current phase
- Check existing issues and requirements
- Plan implementation approach

### 2. Implementation
- Follow backend-first development
- Write tests before implementation
- Implement security measures
- Add comprehensive error handling

### 3. Testing
- Run full test suite
- Ensure coverage targets met
- Test API endpoints with Postman
- Validate frontend components

### 4. Documentation
- Update API documentation
- Add code comments
- Update relevant guides
- Update PROJECT_PLAN.md status

### 5. Review
- Self-review code changes
- Run quality checks
- Ensure tests pass
- Validate documentation

## 🚀 Getting Started

### For New Developers
1. **Read [CLAUDE.md](./CLAUDE.md)** - Understand project protocols
2. **Setup Environment** - Follow deployment guide
3. **Run Tests** - Ensure everything works
4. **Review Architecture** - Understand project structure
5. **Start Contributing** - Pick up tasks from PROJECT_PLAN.md

### For AI Agents
1. **Follow Protocols** - Adhere to CLAUDE.md instructions
2. **Backend First** - Complete backend before frontend
3. **Test Driven** - Write tests before implementation
4. **Document Changes** - Update docs with every commit
5. **Security Focus** - Implement security best practices

## 📊 Project Health

### Metrics to Track
- **Test Pass Rate**: Currently 79.1% (Target: 90%+)
- **Code Coverage**: 58% overall, 97% models
- **Documentation Coverage**: All major features documented
- **Security Score**: Zero critical vulnerabilities

### Quality Gates
- ✅ All tests must pass
- ✅ Coverage targets must be met
- ✅ No security vulnerabilities
- ✅ Documentation must be updated
- ✅ Code must follow style guides

## 🤝 Contributing

### Before You Start
1. Read development protocols
2. Understand current project phase
3. Check existing issues and requirements
4. Set up development environment

### While Developing
1. Follow backend-first approach
2. Write tests for all new code
3. Implement security best practices
4. Update documentation continuously

### Before Submitting
1. Run full test suite
2. Check code coverage
3. Validate documentation
4. Review security implications

---

*For specific development tasks, see the individual guides and the main PROJECT_PLAN.md*