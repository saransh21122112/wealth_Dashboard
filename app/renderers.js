const EDIT_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const DELETE_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

export function createRenderers({ dom, store, calculations, formatCurrency, saveAccounts, admin, openEdit, renderCalendar }) {
  const { calculateInvestmentValue } = calculations;

  // ── Event delegation: one stable listener on document.body ──
  function setupEventDelegation() {
    document.body.addEventListener('click', (e) => {
      const u = store.state.currentUser; if (!u) return;

      // Expenses
      const editExpBtn = e.target.closest('.edit-exp');
      const deleteExpBtn = e.target.closest('.delete-exp');
      if (editExpBtn) {
        const item = (u.expenses || []).find(ex => String(ex.id) === String(editExpBtn.dataset.id));
        if (item && openEdit) openEdit('expense', item);
      } else if (deleteExpBtn) {
        u.expenses = (u.expenses || []).filter(ex => String(ex.id) !== String(deleteExpBtn.dataset.id));
        saveAccounts(); renderAll();
      }

      // Investments
      const editInvBtn = e.target.closest('.edit-inv');
      const deleteInvBtn = e.target.closest('.delete-inv');
      if (editInvBtn) {
        const item = (u.investments || []).find(i => String(i.id) === String(editInvBtn.dataset.id));
        if (item && openEdit) openEdit('investment', item);
      } else if (deleteInvBtn) {
        u.investments = (u.investments || []).filter(i => String(i.id) !== String(deleteInvBtn.dataset.id));
        saveAccounts(); renderAll();
      }

      // Income
      const editIncBtn = e.target.closest('.edit-inc');
      const deleteIncBtn = e.target.closest('.delete-inc');
      if (editIncBtn) {
        const item = (u.income || []).find(i => String(i.id) === String(editIncBtn.dataset.id));
        if (item && openEdit) openEdit('income', item);
      } else if (deleteIncBtn) {
        u.income = (u.income || []).filter(i => String(i.id) !== String(deleteIncBtn.dataset.id));
        saveAccounts(); renderAll();
      }

      // Lends
      const lendReturnBtn = e.target.closest('.lend-return-btn');
      const deleteLendBtn = e.target.closest('.delete-lend');
      if (lendReturnBtn) {
        const lend = (u.lends || []).find(l => String(l.id) === String(lendReturnBtn.dataset.id));
        if (!lend) return;
        const remaining = lend.amount - (lend.returnedAmount || 0);
        const input = prompt(`How much did ${lend.person} return? (Outstanding: ₹${remaining.toLocaleString('en-IN')})\nLeave blank for full amount.`);
        if (input === null) return;
        const paid = input.trim() === '' ? remaining : parseFloat(input);
        if (isNaN(paid) || paid <= 0) return;
        lend.returnedAmount = (lend.returnedAmount || 0) + Math.min(paid, remaining);
        if (lend.returnedAmount >= lend.amount) lend.returned = true;
        saveAccounts(); renderAll();
      } else if (deleteLendBtn) {
        u.lends = (u.lends || []).filter(l => String(l.id) !== String(deleteLendBtn.dataset.id));
        saveAccounts(); renderAll();
      }

      // Borrows
      const borrowRepayBtn = e.target.closest('.borrow-repay-btn');
      const deleteBorrowBtn = e.target.closest('.delete-borrow');
      if (borrowRepayBtn) {
        const borrow = (u.borrows || []).find(b => String(b.id) === String(borrowRepayBtn.dataset.id));
        if (!borrow) return;
        const remaining = borrow.amount - (borrow.repaidAmount || 0);
        const input = prompt(`How much did you repay to ${borrow.person}? (Outstanding: ₹${remaining.toLocaleString('en-IN')})\nLeave blank for full amount.`);
        if (input === null) return;
        const paid = input.trim() === '' ? remaining : parseFloat(input);
        if (isNaN(paid) || paid <= 0) return;
        borrow.repaidAmount = (borrow.repaidAmount || 0) + Math.min(paid, remaining);
        if (borrow.repaidAmount >= borrow.amount) borrow.repaid = true;
        saveAccounts(); renderAll();
      } else if (deleteBorrowBtn) {
        u.borrows = (u.borrows || []).filter(b => String(b.id) !== String(deleteBorrowBtn.dataset.id));
        saveAccounts(); renderAll();
      }
    });
  }
  setupEventDelegation();

  function renderExpenses() {
    const { currentUser } = store.state;
    if (!dom.expensesTableBody || !currentUser) return;

    const filter = dom.expenseFilter.value;
    dom.expensesTableBody.innerHTML = '';
    const filteredExpenses = (currentUser.expenses || []).filter((expense) => {
      if (filter === 'recurring') return expense.isRecurring;
      if (filter === 'onetime') return !expense.isRecurring;
      return true;
    });

    if (filteredExpenses.length === 0) {
      dom.expensesTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <div class="empty-icon">💸</div>
            No expenses logged yet.
          </td>
        </tr>
      `;
      return;
    }

    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    filteredExpenses.forEach((expense) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-label=""><span>${expense.description}</span></td>
        <td data-label="Category"><span class="category-tag tag-${expense.category}"><span class="cat-text">${expense.category}</span></span></td>
        <td data-label="Date"><span style="white-space:nowrap">${new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></td>
        <td data-label="Type"><span class="${expense.isRecurring ? 'type-recurring' : 'type-extra'}">${expense.isRecurring ? 'Recurring' : 'Extra'}</span></td>
        <td data-label="Amount" class="expense-amt">₹${parseFloat(expense.amount).toLocaleString('en-IN')}</td>
        <td data-label="" class="action-cell">
          <button class="action-btn edit-exp" data-id="${expense.id}" aria-label="Edit expense">${EDIT_ICON}</button>
          <button class="action-btn delete-exp" data-id="${expense.id}" aria-label="Delete expense">${DELETE_ICON}</button>
        </td>
      `;
      dom.expensesTableBody.appendChild(row);
    });

  }

  function renderInvestments() {
    const { currentUser } = store.state;
    if (!dom.investmentsTableBody || !currentUser) return;
    dom.investmentsTableBody.innerHTML = '';

    const investments = currentUser.investments || [];
    if (investments.length === 0) {
      dom.investmentsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <div class="empty-icon">📈</div>
            No investments logged yet.
          </td>
        </tr>
      `;
      return;
    }

    investments.sort((a, b) => a.name.localeCompare(b.name));
    investments.forEach((investment) => {
      const { principal, currentValue } = calculateInvestmentValue(investment);
      const profit = currentValue - principal;
      const returnsPct = principal > 0 ? (profit / principal) * 100 : 0;
      const typeLabel = investment.type === 'lic' ? 'LIC Policy' : investment.type === 'sip' ? 'Monthly SIP' : investment.type === 'stocks' ? 'Stocks' : 'Mutual Fund';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-label="">
          <div style="font-weight: 600;">${investment.name}</div>
          ${investment.licPolicyNum ? `<div style="font-size: 0.8rem; color: var(--text-muted);">Policy: #${investment.licPolicyNum}</div>` : ''}
        </td>
        <td data-label="Type"><span class="investment-tag">${typeLabel}</span></td>
        <td data-label="Invested">₹${Math.round(principal).toLocaleString('en-IN')}</td>
        <td data-label="Rate">${investment.rate}%</td>
        <td data-label="Current Value" style="display:flex;flex-direction:column;align-items:flex-end;">
          <div class="investment-amt">₹${Math.round(currentValue).toLocaleString('en-IN')}</div>
          <div style="font-size: 0.8rem;" class="${profit >= 0 ? 'trend-up' : 'trend-down'}">
            ${profit >= 0 ? '+' : ''}${Math.round(profit).toLocaleString('en-IN')} (${returnsPct.toFixed(1)}%)
          </div>
        </td>
        <td data-label="" class="action-cell">
          <button class="action-btn edit-inv" data-id="${investment.id}" aria-label="Edit investment">${EDIT_ICON}</button>
          <button class="action-btn delete-inv" data-id="${investment.id}" aria-label="Delete investment">${DELETE_ICON}</button>
        </td>
      `;
      dom.investmentsTableBody.appendChild(row);
    });

  }

  function renderIncome() {
    const { currentUser } = store.state;
    if (!dom.incomeTableBody || !currentUser) return;

    const filter = dom.incomeFilter?.value || 'all';
    dom.incomeTableBody.innerHTML = '';
    const filtered = (currentUser.income || []).filter((inc) => {
      if (filter === 'recurring') return inc.isRecurring;
      if (filter === 'onetime') return !inc.isRecurring;
      return true;
    });

    if (filtered.length === 0) {
      dom.incomeTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <div class="empty-icon">💰</div>
            No income logged yet.
          </td>
        </tr>
      `;
      return;
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    filtered.forEach((inc) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-label=""><span>${inc.description}</span></td>
        <td data-label="Category"><span class="category-tag tag-${inc.category}"><span class="cat-text">${inc.category}</span></span></td>
        <td data-label="Date"><span style="white-space:nowrap">${new Date(inc.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></td>
        <td data-label="Type"><span class="${inc.isRecurring ? 'type-recurring' : 'type-extra'}">${inc.isRecurring ? 'Recurring' : 'Extra'}</span></td>
        <td data-label="Amount" class="income-amt">+₹${parseFloat(inc.amount).toLocaleString('en-IN')}</td>
        <td data-label="" class="action-cell">
          <button class="action-btn edit-inc" data-id="${inc.id}" aria-label="Edit income">${EDIT_ICON}</button>
          <button class="action-btn delete-inc" data-id="${inc.id}" aria-label="Delete income">${DELETE_ICON}</button>
        </td>
      `;
      dom.incomeTableBody.appendChild(row);
    });

  }

  function renderMetrics() {
    const { currentUser } = store.state;
    if (!currentUser) return;

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // ── Investments ──────────────────────────────────────────────────────
    let totalInvested = 0;
    let totalCurrentValue = 0;
    (currentUser.investments || []).forEach((inv) => {
      const v = calculateInvestmentValue(inv);
      totalInvested += v.principal;
      totalCurrentValue += v.currentValue;
    });

    // ── Expenses ─────────────────────────────────────────────────────────
    let totalExpenses = 0;
    // Only count recurring expenses that haven't expired
    let totalRecurring = 0;
    // One-time expenses logged this calendar month
    let oneTimeExpensesThisMonth = 0;
    (currentUser.expenses || []).forEach((e) => {
      const amt = parseFloat(e.amount);
      totalExpenses += amt;
      if (e.isRecurring) {
        // Exclude EMIs/subscriptions whose term has ended
        const expired = e.endDate && new Date(e.endDate) < today;
        if (!expired) totalRecurring += amt;
      } else {
        if (new Date(e.date) >= monthStart) oneTimeExpensesThisMonth += amt;
      }
    });

    // ── Income ───────────────────────────────────────────────────────────
    let totalIncome = 0;
    let recurringIncome = 0;
    let oneTimeIncomeThisMonth = 0;
    (currentUser.income || []).forEach((i) => {
      const amt = parseFloat(i.amount);
      totalIncome += amt;
      if (i.isRecurring) recurringIncome += amt;
      else if (new Date(i.date) >= monthStart) oneTimeIncomeThisMonth += amt;
    });

    // ── Receivables & Liabilities ────────────────────────────────────────
    const cashBalance = currentUser.cashBalance?.amount || 0;
    const totalOutstandingLends = (currentUser.lends || [])
      .filter(l => !l.returned)
      .reduce((s, l) => s + (parseFloat(l.amount) - (parseFloat(l.returnedAmount) || 0)), 0);
    const totalOutstandingBorrows = (currentUser.borrows || [])
      .filter(b => !b.repaid)
      .reduce((s, b) => s + (parseFloat(b.amount) - (parseFloat(b.repaidAmount) || 0)), 0);

    // ── Monthly Cash Flow ─────────────────────────────────────────────────
    // Only count active SIP/LIC outgo (skip investments whose term has ended)
    let monthlyInvestmentOutgo = 0;
    (currentUser.investments || []).forEach((inv) => {
      if (inv.status === 'closed') return;
      const ended = inv.endDate && new Date(inv.endDate) < today;
      if (ended) return; // contribution period over
      if (inv.type === 'sip') {
        monthlyInvestmentOutgo += parseFloat(inv.amount);
      } else if (inv.type === 'lic') {
        const freq = inv.licPremiumFreq || 'annually';
        const divisor = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : freq === 'half-yearly' ? 6 : 12;
        monthlyInvestmentOutgo += parseFloat(inv.amount) / divisor;
      }
    });

    // Lump-sum/stocks investments deployed this month are a one-time cash outgo
    const lumpSumDeployedThisMonth = (currentUser.investments || [])
      .filter(inv => (inv.type === 'lump-sum' || inv.type === 'stocks') && new Date(inv.startDate) >= monthStart)
      .reduce((s, inv) => s + parseFloat(inv.amount), 0);

    // Monthly cash flow = recurring income + one-time income this month
    //                   − recurring fixed expenses − monthly investment contributions
    //                   − one-time expenses this month − lump-sum investments this month
    const leftPerMonth = recurringIncome + oneTimeIncomeThisMonth
      - totalRecurring - monthlyInvestmentOutgo
      - oneTimeExpensesThisMonth - lumpSumDeployedThisMonth;

    // ── Net Worth (Balance Sheet) ─────────────────────────────────────────
    // Assets − Liabilities: what you own today, not what you generate.
    // Cash flow (leftPerMonth) is a separate metric — do NOT mix into net worth.
    const netWorth = totalCurrentValue + cashBalance + totalOutstandingLends - totalOutstandingBorrows;

    // ── Financial Health Ratios ───────────────────────────────────────────
    // Savings rate = what % of income goes toward savings + investments
    const monthlySaved = leftPerMonth + monthlyInvestmentOutgo; // cash left + what went to investments
    const savingsRate = recurringIncome > 0 ? (monthlySaved / recurringIncome) * 100 : 0;
    // Emergency fund = how many months of expenses covered by liquid cash
    const monthlyExpenseBase = totalRecurring + (oneTimeExpensesThisMonth / Math.max(1, today.getDate()) * 30);
    const emergencyMonths = monthlyExpenseBase > 0 ? cashBalance / monthlyExpenseBase : 0;

    // ── Render ────────────────────────────────────────────────────────────
    const profit = totalCurrentValue - totalInvested;
    const absoluteReturn = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    if (dom.netWorthVal) dom.netWorthVal.textContent = formatCurrency(netWorth);
    const netWorthMeta = document.getElementById('netWorthMeta');
    if (netWorthMeta) {
      const parts = [`${formatCurrency(totalCurrentValue)} investments`];
      if (cashBalance > 0) parts.push(`${formatCurrency(cashBalance)} cash`);
      if (totalOutstandingLends > 0) parts.push(`${formatCurrency(totalOutstandingLends)} receivable`);
      if (totalOutstandingBorrows > 0) parts.push(`−${formatCurrency(totalOutstandingBorrows)} owed`);
      netWorthMeta.textContent = parts.join(' + ');
    }
    if (dom.investmentsVal) dom.investmentsVal.textContent = formatCurrency(totalCurrentValue);

    // Cash card
    const cashCard = document.getElementById('cashCard');
    const cashVal = document.getElementById('cashVal');
    const cashMeta = document.getElementById('cashMeta');
    if (cashCard) {
      if (cashBalance > 0) {
        cashCard.style.display = '';
        if (cashVal) cashVal.textContent = formatCurrency(cashBalance);
        if (cashMeta) {
          const cb = currentUser.cashBalance;
          const noteStr = cb.note ? ` · ${cb.note}` : '';
          const dateStr = cb.updatedAt
            ? `Updated ${new Date(cb.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
            : 'Updated today';
          const efNote = emergencyMonths > 0
            ? ` · ${emergencyMonths.toFixed(1)} months emergency runway`
            : '';
          cashMeta.textContent = `${dateStr}${noteStr}${efNote}`;
        }
      } else {
        cashCard.style.display = 'none';
      }
    }

    if (dom.investmentsGrowth) {
      dom.investmentsGrowth.className = profit >= 0 ? 'trend-up' : 'trend-down';
      dom.investmentsGrowth.textContent = `${profit >= 0 ? '+' : ''}${formatCurrency(profit)} (${absoluteReturn.toFixed(1)}% abs. return)`;
    }
    if (dom.incomeVal) dom.incomeVal.textContent = formatCurrency(totalIncome);
    if (dom.recurringIncomeMeta) dom.recurringIncomeMeta.textContent = `${formatCurrency(recurringIncome)} recurring · ${formatCurrency(oneTimeIncomeThisMonth > 0 ? oneTimeIncomeThisMonth : totalIncome - recurringIncome)} one-time`;
    if (dom.expensesVal) dom.expensesVal.textContent = formatCurrency(totalExpenses);
    if (dom.recurringExpensesMeta) dom.recurringExpensesMeta.textContent = `${formatCurrency(totalRecurring)} fixed monthly · ${formatCurrency(oneTimeExpensesThisMonth)} this month`;

    const leftEl = document.getElementById('leftPerMonthVal');
    const leftMeta = document.getElementById('leftPerMonthMeta');
    if (leftEl) {
      leftEl.textContent = formatCurrency(leftPerMonth);
      leftEl.style.color = leftPerMonth >= 0 ? 'var(--color-success)' : 'var(--color-error)';
    }
    if (leftMeta) {
      const srStr = savingsRate > 0 ? ` · ${savingsRate.toFixed(0)}% savings rate` : '';
      let parts = [`${formatCurrency(recurringIncome)} income`];
      parts.push(`−${formatCurrency(totalRecurring)} fixed`);
      parts.push(`−${formatCurrency(Math.round(monthlyInvestmentOutgo))} investments`);
      if (oneTimeExpensesThisMonth > 0) parts.push(`−${formatCurrency(Math.round(oneTimeExpensesThisMonth))} extra`);
      if (lumpSumDeployedThisMonth > 0) parts.push(`−${formatCurrency(lumpSumDeployedThisMonth)} deployed`);
      if (oneTimeIncomeThisMonth > 0) parts.push(`+${formatCurrency(Math.round(oneTimeIncomeThisMonth))} extra income`);
      leftMeta.textContent = parts.join(' ') + srStr;
    }
  }

  function renderLends() {
    const { currentUser } = store.state;
    const section = document.getElementById('lendsSection');
    const tbody = document.getElementById('lendsTableBody');
    const badge = document.getElementById('lendsOutstandingBadge');
    if (!section || !tbody || !currentUser) return;

    const lends = (currentUser.lends || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const outstanding = lends.filter(l => !l.returned);

    if (lends.length === 0) { section.style.display = 'none'; return; }
    section.style.display = '';

    const totalOut = outstanding.reduce((s, l) => s + (l.amount - (l.returnedAmount || 0)), 0);
    if (badge) badge.textContent = `${formatCurrency(totalOut)} outstanding`;

    tbody.innerHTML = '';
    lends.forEach(lend => {
      const outstanding = lend.amount - (lend.returnedAmount || 0);
      const isOverdue = lend.dueDate && !lend.returned && new Date(lend.dueDate) < new Date();
      const dueDateStr = lend.dueDate
        ? new Date(lend.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      const lentDateStr = new Date(lend.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      const row = document.createElement('tr');
      if (lend.returned) row.style.opacity = '0.5';
      row.innerHTML = `
        <td data-label="">
          <div style="font-weight:600;">${lend.person}</div>
          ${lend.note ? `<div style="font-size:0.78rem;color:var(--text-muted);">${lend.note}</div>` : ''}
        </td>
        <td data-label="Amount" style="font-weight:600;">₹${parseFloat(lend.amount).toLocaleString('en-IN')}</td>
        <td data-label="Lent">${lentDateStr}</td>
        <td data-label="Due" style="color:${isOverdue ? 'var(--color-error)' : 'inherit'};">
          ${dueDateStr}${isOverdue ? ' <span style="font-size:0.7rem;font-weight:700;">OVERDUE</span>' : ''}
        </td>
        <td data-label="Outstanding" style="font-weight:700;color:${lend.returned ? 'var(--color-success)' : 'var(--color-maroon)'};">
          ${lend.returned ? 'Returned ✓' : formatCurrency(outstanding)}
        </td>
        <td data-label="Status">
          ${lend.returned
            ? '<span class="category-tag" style="background:rgba(46,125,50,0.1);color:var(--color-success);">Settled</span>'
            : lend.returnedAmount > 0
              ? `<span class="category-tag tag-housing">Partial (₹${lend.returnedAmount.toLocaleString('en-IN')})</span>`
              : '<span class="category-tag tag-miscellaneous">Pending</span>'}
        </td>
        <td data-label="" class="action-cell">
          ${!lend.returned ? `<button class="action-btn lend-return-btn" data-id="${lend.id}" title="Mark as returned" style="color:var(--color-success);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>` : ''}
          <button class="action-btn delete-lend" data-id="${lend.id}" title="Delete" aria-label="Delete lend">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  function renderBorrows() {
    const { currentUser } = store.state;
    const section = document.getElementById('borrowsSection');
    const tbody = document.getElementById('borrowsTableBody');
    const badge = document.getElementById('borrowsOutstandingBadge');
    if (!section || !tbody || !currentUser) return;

    const borrows = (currentUser.borrows || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const outstanding = borrows.filter(b => !b.repaid);

    if (borrows.length === 0) { section.style.display = 'none'; return; }
    section.style.display = '';

    const totalOwed = outstanding.reduce((s, b) => s + (b.amount - (b.repaidAmount || 0)), 0);
    if (badge) badge.textContent = `${formatCurrency(totalOwed)} outstanding`;

    tbody.innerHTML = '';
    borrows.forEach(borrow => {
      const remaining = borrow.amount - (borrow.repaidAmount || 0);
      const isOverdue = borrow.dueDate && !borrow.repaid && new Date(borrow.dueDate) < new Date();
      const dueDateStr = borrow.dueDate
        ? new Date(borrow.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      const borrowDateStr = new Date(borrow.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      const row = document.createElement('tr');
      if (borrow.repaid) row.style.opacity = '0.5';
      row.innerHTML = `
        <td data-label="">
          <div style="font-weight:600;">${borrow.person}</div>
          ${borrow.note ? `<div style="font-size:0.78rem;color:var(--text-muted);">${borrow.note}</div>` : ''}
        </td>
        <td data-label="Amount" style="font-weight:600;">₹${parseFloat(borrow.amount).toLocaleString('en-IN')}</td>
        <td data-label="Borrowed">${borrowDateStr}</td>
        <td data-label="Due" style="color:${isOverdue ? 'var(--color-error)' : 'inherit'};">
          ${dueDateStr}${isOverdue ? ' <span style="font-size:0.7rem;font-weight:700;">OVERDUE</span>' : ''}
        </td>
        <td data-label="Remaining" style="font-weight:700;color:${borrow.repaid ? 'var(--color-success)' : 'var(--color-error)'};">
          ${borrow.repaid ? 'Repaid ✓' : formatCurrency(remaining)}
        </td>
        <td data-label="Status">
          ${borrow.repaid
            ? '<span class="category-tag" style="background:rgba(46,125,50,0.1);color:var(--color-success);">Settled</span>'
            : borrow.repaidAmount > 0
              ? `<span class="category-tag tag-housing">Partial (₹${borrow.repaidAmount.toLocaleString('en-IN')})</span>`
              : '<span class="category-tag tag-extra">Pending</span>'}
        </td>
        <td data-label="" class="action-cell">
          ${!borrow.repaid ? `<button class="action-btn borrow-repay-btn" data-id="${borrow.id}" title="Mark as repaid" style="color:var(--color-success);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>` : ''}
          <button class="action-btn delete-borrow" data-id="${borrow.id}" title="Delete" aria-label="Delete borrow">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  function renderLICAlerts() {
    const { currentUser } = store.state;
    if (!dom.licAlertBanner || !dom.licAlertList || !currentUser) return;

    dom.licAlertList.innerHTML = '';
    const today = new Date();
    const upcomingLICs = [];
    (currentUser.investments || []).forEach((investment) => {
      if (investment.type === 'lic' && investment.licPremiumDue) {
        const dueDate = new Date(investment.licPremiumDue);
        const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 30) {
          upcomingLICs.push({
            name: investment.name,
            premium: investment.amount,
            dueDateStr: dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            daysLeft
          });
        }
      }
    });

    if (upcomingLICs.length === 0) {
      dom.licAlertBanner.style.display = 'none';
      return;
    }

    dom.licAlertBanner.style.display = 'flex';
    upcomingLICs.sort((a, b) => a.daysLeft - b.daysLeft).forEach((lic) => {
      const item = document.createElement('li');
      item.className = 'alert-list-item';
      item.innerHTML = `
        <span><strong>${lic.name}</strong> - Premium due on ${lic.dueDateStr}</span>
        <span style="font-weight: 600; color: var(--color-maroon);">₹${parseFloat(lic.premium).toLocaleString('en-IN')} (${lic.daysLeft === 0 ? 'Today' : lic.daysLeft === 1 ? '1 day left' : `${lic.daysLeft} days left`})</span>
      `;
      dom.licAlertList.appendChild(item);
    });
  }

  function renderAll() {
    renderExpenses();
    renderIncome();
    renderInvestments();
    renderLends();
    renderBorrows();
    renderMetrics();
    renderLICAlerts();

    if (store.state.currentUser && store.state.currentUser.role === 'admin') {
      admin.renderAdminDashboard();
    }

    if (renderCalendar) renderCalendar();

    if (window.updateDashboardCharts) {
      window.updateDashboardCharts();
    }
  }

  return {
    renderExpenses,
    renderIncome,
    renderInvestments,
    renderMetrics,
    renderLICAlerts,
    renderAll
  };
}