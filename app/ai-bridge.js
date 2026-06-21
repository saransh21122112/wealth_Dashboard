export function setupAIBridge({ store, saveAccounts, renderAll }) {
  window.getIncome = () => (store.state.currentUser ? store.state.currentUser.income || [] : []);
  window.getExpenses = () => (store.state.currentUser ? store.state.currentUser.expenses || [] : []);
  window.getInvestments = () => (store.state.currentUser ? store.state.currentUser.investments || [] : []);
  window.calculateInvestmentValue = window.calculateInvestmentValue;

  window.addIncomeFromAI = (description, amount, date, category, isRecurring) => {
    if (!store.state.currentUser) return null;

    const newIncome = {
      id: Date.now().toString(),
      description,
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'other',
      isRecurring: Boolean(isRecurring)
    };

    store.state.currentUser.income ||= [];
    store.state.currentUser.income.push(newIncome);
    saveAccounts();
    renderAll();
    return newIncome;
  };

  window.addExpenseFromAI = (description, amount, date, category, isRecurring) => {
    if (!store.state.currentUser) return null;

    const newExpense = {
      id: Date.now().toString(),
      description,
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'miscellaneous',
      isRecurring: Boolean(isRecurring)
    };

    store.state.currentUser.expenses ||= [];
    store.state.currentUser.expenses.push(newExpense);
    saveAccounts();
    renderAll();
    return newExpense;
  };

  window.addInvestmentFromAI = (investment) => {
    if (!store.state.currentUser) return null;

    const newInvestment = {
      id: Date.now().toString(),
      name: investment.name,
      type: investment.type,
      startDate: investment.startDate || new Date().toISOString().split('T')[0],
      amount: parseFloat(investment.amount),
      rate: parseFloat(investment.rate),
      compounding: investment.compounding || '12',
      duration: parseInt(investment.duration, 10) || 10
    };

    if (investment.type === 'lic') {
      newInvestment.licPolicyNum = investment.licPolicyNum || null;
      newInvestment.licSumAssured = investment.licSumAssured ? parseFloat(investment.licSumAssured) : null;
      newInvestment.licPremiumFreq = investment.licPremiumFreq || 'annually';
      newInvestment.licPremiumDue = investment.licPremiumDue || null;
      newInvestment.compounding = '1';
    }

    store.state.currentUser.investments ||= [];
    store.state.currentUser.investments.push(newInvestment);
    saveAccounts();
    renderAll();
    return newInvestment;
  };
}