function yearsBetween(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  return Math.max(0, Math.round(((e - s) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10);
}

export function setupAIBridge({ store, saveAccounts, renderAll }) {
  window.getIncome = () => (store.state.currentUser ? store.state.currentUser.income || [] : []);
  window.getExpenses = () => (store.state.currentUser ? store.state.currentUser.expenses || [] : []);
  window.getInvestments = () => (store.state.currentUser ? store.state.currentUser.investments || [] : []);
  window.calculateInvestmentValue = window.calculateInvestmentValue;

  window.addIncomeFromAI = (description, amount, date, category, isRecurring, recurringDay) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };

    const dateStr = date || new Date().toISOString().split('T')[0];
    const day = recurringDay || new Date(dateStr).getDate();

    const newIncome = {
      id: Date.now().toString(),
      description,
      amount: parseFloat(amount),
      date: dateStr,
      category: category || 'other',
      isRecurring: Boolean(isRecurring),
      recurringDay: isRecurring ? day : null
    };

    store.state.currentUser.income ||= [];
    store.state.currentUser.income.push(newIncome);
    saveAccounts();
    renderAll();
    return newIncome;
  };

  window.addExpenseFromAI = (description, amount, date, category, isRecurring, recurringDay, endDate) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };

    // EMI/loan validation: if recurring and description suggests a finite commitment, require endDate
    const looksLikeEMI = /\b(emi|loan|instalment|installment|equated monthly)\b/i.test(description);
    if (isRecurring && looksLikeEMI && !endDate) {
      return {
        error: true,
        message: `Missing end date for "${description}". Please ask the user: When does this EMI/loan end? (e.g., "how many years / months remaining?" or "when is the last payment?")`
      };
    }

    const dateStr = date || new Date().toISOString().split('T')[0];
    const day = recurringDay || new Date(dateStr).getDate();

    const newExpense = {
      id: Date.now().toString(),
      description,
      amount: parseFloat(amount),
      date: dateStr,
      category: category || 'miscellaneous',
      isRecurring: Boolean(isRecurring),
      recurringDay: isRecurring ? day : null,
      endDate: endDate || null
    };

    store.state.currentUser.expenses ||= [];
    store.state.currentUser.expenses.push(newExpense);
    saveAccounts();
    renderAll();
    return newExpense;
  };

  window.addInvestmentFromAI = (investment) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };

    const startDate = investment.startDate || new Date().toISOString().split('T')[0];
    const endDate = investment.endDate || null;

    // Compute duration from endDate if provided
    let duration = null;
    if (endDate) {
      const computed = yearsBetween(startDate, endDate);
      if (computed > 0) duration = computed;
    }
    if (!duration && investment.duration) {
      duration = parseInt(investment.duration, 10) || null;
    }

    // ── Validation ──
    // All investment types need a duration or end date
    if (!duration) {
      return {
        error: true,
        message: `Missing duration for "${investment.name}". Please ask the user: How long does this investment run? (e.g., "till what year?" or "how many years?")`
      };
    }

    // LIC requires maturity/sum assured amount
    if (investment.type === 'lic' && !investment.licSumAssured) {
      return {
        error: true,
        message: `Missing maturity value for LIC "${investment.name}". Please ask the user: What is the total amount you will receive at maturity? (e.g., "how much will you get when the policy ends?")`
      };
    }

    const newInvestment = {
      id: Date.now().toString(),
      name: investment.name,
      type: investment.type,
      startDate,
      endDate,
      amount: parseFloat(investment.amount),
      rate: parseFloat(investment.rate),
      compounding: investment.compounding || '12',
      duration,
      recurringDay: investment.recurringDay || null
    };

    if (investment.type === 'lic') {
      newInvestment.licPolicyNum = investment.licPolicyNum || null;
      newInvestment.licSumAssured = parseFloat(investment.licSumAssured);
      newInvestment.licPremiumFreq = investment.licPremiumFreq || 'monthly';
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
