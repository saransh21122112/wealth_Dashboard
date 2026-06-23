function yearsBetween(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  return Math.max(0, Math.round(((e - s) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10);
}

export function setupAIBridge({ store, saveAccounts, renderAll }) {
  window.getIncome = () => (store.state.currentUser?.income || []);
  window.getExpenses = () => (store.state.currentUser?.expenses || []);
  window.getInvestments = () => (store.state.currentUser?.investments || []);
  window.getLends = () => (store.state.currentUser?.lends || []);
  window.getBorrows = () => (store.state.currentUser?.borrows || []);
  window.getCashBalance = () => (store.state.currentUser?.cashBalance || null);

  // ── Income ──────────────────────────────────────────────────────────
  window.addIncomeFromAI = (description, amount, date, category, isRecurring, recurringDay) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    const dateStr = date || new Date().toISOString().split('T')[0];
    const day = recurringDay || new Date(dateStr).getDate();
    const entry = {
      id: Date.now().toString(),
      description, amount: parseFloat(amount), date: dateStr,
      category: category || 'other',
      isRecurring: Boolean(isRecurring),
      recurringDay: isRecurring ? day : null
    };
    store.state.currentUser.income ||= [];
    store.state.currentUser.income.push(entry);
    saveAccounts(); renderAll();
    return entry;
  };

  // ── Expense ─────────────────────────────────────────────────────────
  window.addExpenseFromAI = (description, amount, date, category, isRecurring, recurringDay, endDate) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    const looksLikeEMI = /\b(emi|loan|instalment|installment|equated monthly)\b/i.test(description);
    if (isRecurring && looksLikeEMI && !endDate) {
      return { error: true, message: `Missing end date for "${description}". Ask the user: when does this EMI end?` };
    }
    const dateStr = date || new Date().toISOString().split('T')[0];
    const day = recurringDay || new Date(dateStr).getDate();
    const entry = {
      id: Date.now().toString(),
      description, amount: parseFloat(amount), date: dateStr,
      category: category || 'miscellaneous',
      isRecurring: Boolean(isRecurring),
      recurringDay: isRecurring ? day : null,
      endDate: endDate || null
    };
    store.state.currentUser.expenses ||= [];
    store.state.currentUser.expenses.push(entry);
    saveAccounts(); renderAll();
    return entry;
  };

  // ── Investment ──────────────────────────────────────────────────────
  window.addInvestmentFromAI = (investment) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    const startDate = investment.startDate || new Date().toISOString().split('T')[0];
    const endDate = investment.endDate || null;
    let duration = null;
    if (endDate) { const c = yearsBetween(startDate, endDate); if (c > 0) duration = c; }
    if (!duration && investment.duration) duration = parseInt(investment.duration, 10) || null;
    if (!duration) {
      return { error: true, message: `Missing duration for "${investment.name}". Ask: how long does this investment run?` };
    }
    if (investment.type === 'lic' && !investment.licSumAssured) {
      return { error: true, message: `Missing maturity value for LIC "${investment.name}". Ask: what amount will you receive at maturity?` };
    }
    const entry = {
      id: Date.now().toString(),
      name: investment.name, type: investment.type,
      startDate, endDate, amount: parseFloat(investment.amount),
      rate: parseFloat(investment.rate),
      compounding: investment.compounding || '12',
      duration, recurringDay: investment.recurringDay || null
    };
    if (investment.type === 'lic') {
      entry.licPolicyNum = investment.licPolicyNum || null;
      entry.licSumAssured = parseFloat(investment.licSumAssured);
      entry.licPremiumFreq = investment.licPremiumFreq || 'monthly';
      entry.licPremiumDue = investment.licPremiumDue || null;
      entry.compounding = '1';
    }
    store.state.currentUser.investments ||= [];
    store.state.currentUser.investments.push(entry);
    saveAccounts(); renderAll();
    return entry;
  };

  // ── Cash Balance ─────────────────────────────────────────────────────
  window.setCashBalanceFromAI = (amount, note) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    store.state.currentUser.cashBalance = {
      amount: parseFloat(amount),
      note: note || null,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    saveAccounts(); renderAll();
    return store.state.currentUser.cashBalance;
  };

  window.adjustCashBalanceFromAI = (delta, reason) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    const current = store.state.currentUser.cashBalance?.amount || 0;
    const newAmount = Math.max(0, current + parseFloat(delta));
    store.state.currentUser.cashBalance = {
      amount: newAmount,
      note: reason || store.state.currentUser.cashBalance?.note || null,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    saveAccounts(); renderAll();
    return { ...store.state.currentUser.cashBalance, previous: current, delta: parseFloat(delta) };
  };

  // ── Investment Close / Redemption ────────────────────────────────────
  window.closeInvestmentFromAI = (name, proceeds, date) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    const investments = store.state.currentUser.investments || [];
    const match = investments
      .filter(i => i.status !== 'closed')
      .find(i => i.name.toLowerCase().includes(name.toLowerCase()));
    if (!match) return { error: true, message: `No active investment found matching "${name}".` };
    match.status = 'closed';
    match.closedAt = date || new Date().toISOString().split('T')[0];
    match.closedProceeds = parseFloat(proceeds) || 0;
    if (match.closedProceeds > 0) {
      const current = store.state.currentUser.cashBalance?.amount || 0;
      store.state.currentUser.cashBalance = {
        amount: current + match.closedProceeds,
        note: store.state.currentUser.cashBalance?.note || null,
        updatedAt: match.closedAt
      };
    }
    saveAccounts(); renderAll();
    return { name: match.name, closedAt: match.closedAt, proceeds: match.closedProceeds };
  };

  // ── Lend ────────────────────────────────────────────────────────────
  window.addLendFromAI = (person, amount, date, dueDate, note) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    if (!person) return { error: true, message: 'Missing person name. Ask who the money was lent to.' };
    const entry = {
      id: Date.now().toString(),
      person: person.trim(),
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      dueDate: dueDate || null,
      note: note || null,
      returned: false,
      returnedAmount: 0
    };
    store.state.currentUser.lends ||= [];
    store.state.currentUser.lends.push(entry);
    saveAccounts(); renderAll();
    return entry;
  };

  // ── Borrow ───────────────────────────────────────────────────────────
  window.addBorrowFromAI = (person, amount, date, dueDate, note) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    if (!person) return { error: true, message: 'Missing person name. Ask who you borrowed from.' };
    const entry = {
      id: Date.now().toString(),
      person: person.trim(),
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      dueDate: dueDate || null,
      note: note || null,
      repaid: false,
      repaidAmount: 0
    };
    store.state.currentUser.borrows ||= [];
    store.state.currentUser.borrows.push(entry);
    saveAccounts(); renderAll();
    return entry;
  };

  window.markBorrowRepaidFromAI = (person, repaidAmount, paidFromCash) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    const borrows = store.state.currentUser.borrows || [];
    const outstanding = borrows
      .filter(b => !b.repaid && b.person.toLowerCase() === person.toLowerCase())
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (outstanding.length === 0) return { error: true, message: `No outstanding borrow found for "${person}".` };
    const borrow = outstanding[0];
    const remaining = borrow.amount - borrow.repaidAmount;
    const paid = repaidAmount != null ? Math.min(parseFloat(repaidAmount), remaining) : remaining;
    borrow.repaidAmount += paid;
    if (borrow.repaidAmount >= borrow.amount) borrow.repaid = true;
    if (paidFromCash) {
      const current = store.state.currentUser.cashBalance?.amount || 0;
      store.state.currentUser.cashBalance = {
        amount: Math.max(0, current - paid),
        note: store.state.currentUser.cashBalance?.note || null,
        updatedAt: new Date().toISOString().split('T')[0]
      };
    }
    saveAccounts(); renderAll();
    return { ...borrow, paidNow: paid };
  };

  window.markLendReturnedFromAI = (person, returnedAmount) => {
    if (!store.state.currentUser) return { error: true, message: 'Not logged in.' };
    const lends = store.state.currentUser.lends || [];
    // Find outstanding lend matching person (most recent if multiple)
    const outstanding = lends
      .filter(l => !l.returned && l.person.toLowerCase() === person.toLowerCase())
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (outstanding.length === 0) {
      return { error: true, message: `No outstanding loan found for "${person}". Check the name and try again.` };
    }
    const lend = outstanding[0];
    const remaining = lend.amount - lend.returnedAmount;
    const paid = returnedAmount != null ? Math.min(parseFloat(returnedAmount), remaining) : remaining;
    lend.returnedAmount += paid;
    if (lend.returnedAmount >= lend.amount) lend.returned = true;
    saveAccounts(); renderAll();
    return { ...lend, paidNow: paid };
  };
}
