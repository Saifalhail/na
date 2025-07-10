# Testing Documentation - Nutrition AI

Comprehensive testing documentation for backend and frontend components.

## 📊 Current Test Status

- **Backend Tests**: 215 total, 170 passing (79.1% pass rate)
- **Frontend Tests**: Growing test suite with comprehensive coverage
- **Test Infrastructure**: ✅ Automated monitoring and reporting

## 📁 Directory Structure

```
testing/
├── backend/           # Backend testing documentation
│   ├── TESTING_GUIDE.md      # Complete testing guide
│   ├── TESTING_ANALYSIS.md   # Test performance analysis
│   └── API_TESTS.md          # API test documentation
├── frontend/          # Frontend testing documentation
│   ├── FRONTEND_TESTING_GUIDE.md  # Frontend test setup
│   └── TEST_REQUIREMENTS.md       # Test requirements
├── integration/       # Integration testing (future)
└── reports/          # Test reports and status
    ├── TESTING_STATUS_REPORT.md      # Overall status
    ├── COMPREHENSIVE_TESTING_REPORT.md
    ├── TEST_IMPROVEMENT_REPORT.md
    ├── TEST_REPORT.md
    └── TEST_STATUS.md
```

## 🚀 Quick Start

### Backend Testing

1. **Setup Environment**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run All Tests**:
   ```bash
   python run_tests.py --coverage
   ```

3. **View Coverage Report**:
   ```bash
   python run_tests.py --coverage --html
   open htmlcov/index.html
   ```

### Frontend Testing

1. **Setup Environment**:
   ```bash
   cd frontend
   npm install
   ```

2. **Run Tests**:
   ```bash
   npm test
   ```

3. **Watch Mode**:
   ```bash
   npm run test:watch
   ```

## 📖 Testing Guides

### Backend
- **[TESTING_GUIDE.md](./backend/TESTING_GUIDE.md)** - Complete backend testing guide
- **[API_TESTS.md](./backend/API_TESTS.md)** - API endpoint testing
- **[TESTING_ANALYSIS.md](./backend/TESTING_ANALYSIS.md)** - Performance analysis

### Frontend
- **[FRONTEND_TESTING_GUIDE.md](./frontend/FRONTEND_TESTING_GUIDE.md)** - Frontend testing setup
- **[TEST_REQUIREMENTS.md](./frontend/TEST_REQUIREMENTS.md)** - Test requirements

## 📊 Test Reports

### Latest Reports
- **[TESTING_STATUS_REPORT.md](./reports/TESTING_STATUS_REPORT.md)** - Overall project status
- **[COMPREHENSIVE_TESTING_REPORT.md](./reports/COMPREHENSIVE_TESTING_REPORT.md)** - Detailed analysis
- **[TEST_IMPROVEMENT_REPORT.md](./reports/TEST_IMPROVEMENT_REPORT.md)** - Improvement tracking

### Key Metrics
- **Backend Pass Rate**: 79.1% (Target: 90%+)
- **Test Coverage**: 58% overall, 97% models
- **Error Rate**: 0% (Perfect infrastructure!)
- **Total Tests**: 215 backend, growing frontend suite

## 🎯 Testing Best Practices

### Backend
1. **Use Factories**: Factory Boy for test data generation
2. **Isolate Tests**: Each test should be independent
3. **Mock External Services**: Use mocks for API calls
4. **Performance Testing**: Monitor response times
5. **Coverage Goals**: Maintain >80% coverage

### Frontend
1. **Component Testing**: Test components in isolation
2. **Integration Testing**: Test component interactions
3. **Snapshot Testing**: Catch unexpected UI changes
4. **Accessibility Testing**: Ensure components are accessible
5. **Performance Testing**: Monitor render times

## 🛠️ Testing Tools

### Backend Stack
- **pytest**: Test framework
- **Factory Boy**: Test data generation
- **coverage.py**: Coverage reporting
- **pytest-django**: Django integration
- **pytest-xdist**: Parallel execution

### Frontend Stack
- **Jest**: Test framework
- **React Native Testing Library**: Component testing
- **jest-expo**: Expo integration
- **TypeScript**: Type checking

## 🚨 Troubleshooting

### Common Issues
1. **Import Errors**: Check PYTHONPATH and virtual environment
2. **Database Errors**: Ensure test database permissions
3. **Factory Errors**: Verify model definitions and imports
4. **Slow Tests**: Use parallel execution and proper mocking

### Getting Help
1. Check the relevant testing guide first
2. Review error logs and stack traces
3. Search existing test reports for similar issues
4. See [troubleshooting guide](../guides/TROUBLESHOOTING.md)

## 📈 Continuous Improvement

### Automated Monitoring
The project includes automated test monitoring:
```bash
python backend/test_monitor.py
```

### Weekly Goals
- **Week 1**: Implement remaining AI endpoints (+5 tests)
- **Week 2**: Performance optimization (+10 tests)
- **Week 3**: Authentication enhancement (+8 tests)
- **Target**: 90%+ pass rate

## 🎯 Contributing to Tests

1. **Follow Naming Conventions**: Use descriptive test names
2. **Write Clear Assertions**: Make test failures obvious
3. **Document Complex Tests**: Add comments for complex logic
4. **Update Coverage**: Ensure new code has tests
5. **Run Full Suite**: Test all changes before committing

---

*For detailed testing procedures, see the specific guides in each subdirectory.*