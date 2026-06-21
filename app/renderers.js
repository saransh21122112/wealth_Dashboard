const EDIT_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const DELETE_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

export function createRenderers({ dom, store, calculations, formatCurrency, saveAccounts, admin, openEdit, renderCalendar }) {
  const { calculateInvestmentValue } = calculations;

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
        <td style="font-weight: 500;">${expense.description}</td>
        <td><span class="category-tag tag-${expense.category}">${expense.category}</span></td>
        <td>${new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td>${expense.isRecurring ? 'Recurring' : 'Extra'}</td>
        <td style="font-weight: 600;">₹${parseFloat(expense.amount).toLocaleString('en-IN')}</td>
        <td style="display:flex;gap:0.35rem;">
          <button class="action-btn edit-exp" data-id="${expense.id}" aria-label="Edit expense">${EDIT_ICON}</button>
          <button class="action-btn delete-exp" data-id="${expense.id}" aria-label="Delete expense">${DELETE_ICON}</button>
        </td>
      `;
      dom.expensesTableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-exp').forEach((button) => {
      button.addEventListener('click', () => {
        const item = store.state.currentUser.expenses.find((e) => e.id === button.getAttribute('data-id'));
        if (item && openEdit) openEdit('expense', item);
      });
    });
    document.querySelectorAll('.delete-exp').forEach((button) => {
      button.addEventListener('click', () => {
        store.state.currentUser.expenses = store.state.currentUser.expenses.filter((expense) => expense.id !== button.getAttribute('data-id'));
        saveAccounts();
        renderAll();
      });
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
        <td>
          <div style="font-weight: 600;">${investment.name}</div>
          ${investment.licPolicyNum ? `<div style="font-size: 0.8rem; color: var(--text-muted);">Policy: #${investment.licPolicyNum}</div>` : ''}
        </td>
        <td><span class="investment-tag">${typeLabel}</span></td>
        <td>₹${Math.round(principal).toLocaleString('en-IN')}</td>
        <td>${investment.rate}%</td>
        <td>
          <div style="font-weight: 700;">₹${Math.round(currentValue).toLocaleString('en-IN')}</div>
          <div style="font-size: 0.8rem;" class="${profit >= 0 ? 'trend-up' : 'trend-down'}">
            ${profit >= 0 ? '+' : ''}${Math.round(profit).toLocaleString('en-IN')} (${returnsPct.toFixed(1)}%)
          </div>
        </td>
        <td style="display:flex;gap:0.35rem;">
          <button class="action-btn edit-inv" data-id="${investment.id}" aria-label="Edit investment">${EDIT_ICON}</button>
          <button class="action-btn delete-inv" data-id="${investment.id}" aria-label="Delete investment">${DELETE_ICON}</button>
        </td>
      `;
      dom.investmentsTableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-inv').forEach((button) => {
      button.addEventListener('click', () => {
        const item = store.state.currentUser.investments.find((i) => i.id === button.getAttribute('data-id'));
        if (item && openEdit) openEdit('investment', item);
      });
    });
    document.querySelectorAll('.delete-inv').forEach((button) => {
      button.addEventListener('click', () => {
        store.state.currentUser.investments = store.state.currentUser.investments.filter((investment) => investment.id !== button.getAttribute('data-id'));
        saveAccounts();
        renderAll();
      });
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
        <td style="font-weight: 500;">${inc.description}</td>
        <td><span class="category-tag tag-${inc.category}">${inc.category}</span></td>
        <td>${new Date(inc.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td>${inc.isRecurring ? 'Recurring' : 'Extra'}</td>
        <td style="font-weight: 600; color: var(--color-success);">+₹${parseFloat(inc.amount).toLocaleString('en-IN')}</td>
        <td style="display:flex;gap:0.35rem;">
          <button class="action-btn edit-inc" data-id="${inc.id}" aria-label="Edit income">${EDIT_ICON}</button>
          <button class="action-btn delete-inc" data-id="${inc.id}" aria-label="Delete income">${DELETE_ICON}</button>
        </td>
      `;
      dom.incomeTableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-inc').forEach((button) => {
      button.addEventListener('click', () => {
        const item = store.state.currentUser.income.find((i) => i.id === button.getAttribute('data-id'));
        if (item && openEdit) openEdit('income', item);
      });
    });
    document.querySelectorAll('.delete-inc').forEach((button) => {
      button.addEventListener('click', () => {
        store.state.currentUser.income = store.state.currentUser.income.filter((inc) => inc.id !== button.getAttribute('data-id'));
        saveAccounts();
        renderAll();
      });
    });
  }

  function renderMetrics() {
    const { currentUser } = store.state;
    if (!currentUser) return;

    let totalInvested = 0;
    let totalCurrentValue = 0;
    (currentUser.investments || []).forEach((investment) => {
      const values = calculateInvestmentValue(investment);
      totalInvested += values.principal;
      totalCurrentValue += values.currentValue;
    });

    let totalExpenses = 0;
    let totalRecurring = 0;
    (currentUser.expenses || []).forEach((expense) => {
      totalExpenses += parseFloat(expense.amount);
      if (expense.isRecurring) totalRecurring += parseFloat(expense.amount);
    });

    let totalIncome = 0;
    let recurringIncome = 0;
    (currentUser.income || []).forEach((inc) => {
      totalIncome += parseFloat(inc.amount);
      if (inc.isRecurring) recurringIncome += parseFloat(inc.amount);
    });

    const netWorth = totalIncome - totalExpenses + totalCurrentValue;
    const profit = totalCurrentValue - totalInvested;
    const absoluteReturn = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    // Monthly investment outgo (normalised to per-month)
    const monthlyInvestmentOutgo = (currentUser.investments || []).reduce((sum, inv) => {
      if (inv.type === 'sip') return sum + parseFloat(inv.amount);
      if (inv.type === 'lic') {
        const freq = inv.licPremiumFreq || 'annually';
        const divisor = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : freq === 'half-yearly' ? 6 : 12;
        return sum + parseFloat(inv.amount) / divisor;
      }
      return sum;
    }, 0);
    const leftPerMonth = recurringIncome - totalRecurring - monthlyInvestmentOutgo;

    if (dom.netWorthVal) dom.netWorthVal.textContent = formatCurrency(netWorth);
    if (dom.investmentsVal) dom.investmentsVal.textContent = formatCurrency(totalCurrentValue);
    if (dom.investmentsGrowth) {
      dom.investmentsGrowth.className = profit >= 0 ? 'trend-up' : 'trend-down';
      dom.investmentsGrowth.textContent = `${profit >= 0 ? '+' : ''}${formatCurrency(profit)} (${absoluteReturn.toFixed(1)}% abs. return)`;
    }
    if (dom.incomeVal) dom.incomeVal.textContent = formatCurrency(totalIncome);
    if (dom.recurringIncomeMeta) dom.recurringIncomeMeta.textContent = `${formatCurrency(recurringIncome)} recurring income`;
    if (dom.expensesVal) dom.expensesVal.textContent = formatCurrency(totalExpenses);
    if (dom.recurringExpensesMeta) dom.recurringExpensesMeta.textContent = `${formatCurrency(totalRecurring)} recurring expenses`;

    const leftEl = document.getElementById('leftPerMonthVal');
    const leftMeta = document.getElementById('leftPerMonthMeta');
    if (leftEl) {
      leftEl.textContent = formatCurrency(leftPerMonth);
      leftEl.style.color = leftPerMonth >= 0 ? 'var(--color-success)' : 'var(--color-error)';
    }
    if (leftMeta) leftMeta.textContent = `${formatCurrency(recurringIncome)} − ${formatCurrency(totalRecurring)} exp − ${formatCurrency(Math.round(monthlyInvestmentOutgo))} inv`;
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