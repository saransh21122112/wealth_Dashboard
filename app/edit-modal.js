const INCOME_CATEGORIES = [
  ['salary', 'Salary / Wages'], ['freelance', 'Freelance / Contract'],
  ['bonus', 'Bonus / Commission'], ['rental', 'Rental Income'],
  ['gift', 'Gift / Inheritance'], ['other', 'Other']
];
const EXPENSE_CATEGORIES = [
  ['housing', 'Housing / Rent'], ['groceries', 'Groceries / Food'],
  ['utilities', 'Utilities / Bills'], ['entertainment', 'Entertainment'],
  ['lic', 'LIC / Insurance'], ['health', 'Health & Medical'],
  ['travel', 'Travel / Commute'], ['extra', 'Extra / Splurge'],
  ['miscellaneous', 'Miscellaneous']
];

// Bisection search: monthly SIP premium × n months → maturity value → implied annual rate
function calcImpliedRate(monthlyPremium, maturityValue, durationYears) {
  const n = durationYears * 12;
  if (!monthlyPremium || !maturityValue || !durationYears || n <= 0) return null;
  function fv(r) {
    if (r < 0.000001) return monthlyPremium * n;
    return monthlyPremium * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  }
  if (fv(0) >= maturityValue) return null;
  let lo = 0.000001, hi = 0.05;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (fv(mid) < maturityValue) lo = mid; else hi = mid;
  }
  const annual = (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100;
  return Math.round(annual * 10) / 10;
}

export function setupEditModal({ store, saveAccounts, renderAll }) {
  const modal = document.getElementById('editModal');
  if (!modal) return { openEdit: () => {} };

  const form = document.getElementById('editModalForm');
  const closeBtn = document.getElementById('editModalClose');
  const cancelBtn = document.getElementById('editModalCancelBtn');
  const invTypeSelect = document.getElementById('editInvType');

  function close() { modal.style.display = 'none'; }
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  function populateSelect(selectEl, options, selected) {
    selectEl.innerHTML = options.map(([val, label]) =>
      `<option value="${val}" ${val === selected ? 'selected' : ''}>${label}</option>`
    ).join('');
  }

  // Update the LIC rate field (auto-calculate and pre-fill, user can still edit)
  function updateLICRate() {
    const amount = parseFloat(document.getElementById('editInvAmount').value);
    const maturity = parseFloat(document.getElementById('editLicSumAssured').value);
    const duration = parseInt(document.getElementById('editInvDuration').value, 10);
    const rateInput = document.getElementById('editInvRateLic');
    const hint = document.getElementById('editLicRateHint');
    const tag = document.getElementById('editLicRateTag');

    const rate = calcImpliedRate(amount, maturity, duration);
    if (rate !== null) {
      rateInput.value = rate;
      rateInput.style.color = 'var(--color-success)';
      if (hint) hint.textContent = `₹${amount.toLocaleString('en-IN')}/mo × ${duration}yr → ₹${Math.round(maturity).toLocaleString('en-IN')}`;
      if (tag) { tag.textContent = 'auto'; tag.style.color = 'var(--color-success)'; }
    } else {
      rateInput.style.color = '';
      if (hint) hint.textContent = 'Enter maturity value & duration above';
      if (tag) { tag.textContent = 'manual'; tag.style.color = 'var(--text-muted)'; }
    }
  }

  function switchInvType(type) {
    const isLic = type === 'lic';
    document.getElementById('editLicFields').style.display = isLic ? 'block' : 'none';
    document.getElementById('editRateManualGroup').style.display = isLic ? 'none' : 'block';
    if (isLic) updateLICRate();
  }

  invTypeSelect.addEventListener('change', () => switchInvType(invTypeSelect.value));

  ['editInvAmount', 'editLicSumAssured', 'editInvDuration'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      if (invTypeSelect.value === 'lic') updateLICRate();
    });
  });

  function openEdit(type, item) {
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemType').value = type;

    const commonFields = document.getElementById('editCommonFields');
    const investmentFields = document.getElementById('editInvestmentFields');

    if (type === 'income' || type === 'expense') {
      commonFields.style.display = 'block';
      investmentFields.style.display = 'none';
      document.getElementById('editModalTitle').textContent = type === 'income' ? 'Edit Income' : 'Edit Expense';
      populateSelect(
        document.getElementById('editCategory'),
        type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES,
        item.category
      );
      document.getElementById('editDescription').value = item.description;
      document.getElementById('editAmount').value = item.amount;
      document.getElementById('editDate').value = item.date;
      document.getElementById('editIsRecurring').checked = item.isRecurring;
    } else {
      commonFields.style.display = 'none';
      investmentFields.style.display = 'block';
      document.getElementById('editModalTitle').textContent = 'Edit Investment';

      invTypeSelect.value = item.type;
      document.getElementById('editInvName').value = item.name;
      document.getElementById('editInvDate').value = item.startDate;
      document.getElementById('editInvAmount').value = item.amount;
      document.getElementById('editInvDuration').value = item.duration || 10;
      document.getElementById('editInvCompounding').value = item.compounding || '12';

      if (item.type === 'lic') {
        document.getElementById('editInvRateLic').value = item.rate || '';
        document.getElementById('editLicSumAssured').value = item.licSumAssured || '';
        document.getElementById('editLicPolicyNum').value = item.licPolicyNum || '';
        document.getElementById('editLicPremiumFreq').value = item.licPremiumFreq || 'monthly';
        document.getElementById('editLicPremiumDue').value = item.licPremiumDue || '';
      } else {
        document.getElementById('editInvRateManual').value = item.rate || '';
      }

      switchInvType(item.type);
    }

    modal.style.display = 'flex';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    const type = document.getElementById('editItemType').value;
    const { currentUser } = store.state;
    if (!currentUser) return;

    if (type === 'income') {
      const idx = currentUser.income.findIndex((i) => i.id === id);
      if (idx !== -1) {
        currentUser.income[idx] = {
          ...currentUser.income[idx],
          description: document.getElementById('editDescription').value.trim(),
          amount: parseFloat(document.getElementById('editAmount').value),
          date: document.getElementById('editDate').value,
          category: document.getElementById('editCategory').value,
          isRecurring: document.getElementById('editIsRecurring').checked
        };
      }
    } else if (type === 'expense') {
      const idx = currentUser.expenses.findIndex((ex) => ex.id === id);
      if (idx !== -1) {
        currentUser.expenses[idx] = {
          ...currentUser.expenses[idx],
          description: document.getElementById('editDescription').value.trim(),
          amount: parseFloat(document.getElementById('editAmount').value),
          date: document.getElementById('editDate').value,
          category: document.getElementById('editCategory').value,
          isRecurring: document.getElementById('editIsRecurring').checked
        };
      }
    } else {
      const idx = currentUser.investments.findIndex((i) => i.id === id);
      if (idx !== -1) {
        const invType = invTypeSelect.value;
        const isLic = invType === 'lic';
        const rateVal = isLic
          ? parseFloat(document.getElementById('editInvRateLic').value) || 0
          : parseFloat(document.getElementById('editInvRateManual').value) || 0;

        const updated = {
          ...currentUser.investments[idx],
          name: document.getElementById('editInvName').value.trim(),
          type: invType,
          startDate: document.getElementById('editInvDate').value,
          amount: parseFloat(document.getElementById('editInvAmount').value),
          duration: parseInt(document.getElementById('editInvDuration').value, 10) || 10,
          rate: rateVal,
          compounding: isLic ? '1' : document.getElementById('editInvCompounding').value
        };

        if (isLic) {
          const maturity = parseFloat(document.getElementById('editLicSumAssured').value) || null;
          updated.licSumAssured = maturity;
          updated.licPolicyNum = document.getElementById('editLicPolicyNum').value.trim() || null;
          updated.licPremiumFreq = document.getElementById('editLicPremiumFreq').value;
          updated.licPremiumDue = document.getElementById('editLicPremiumDue').value || null;
          // Recalculate if maturity & duration known and rate not manually overridden
          const implied = calcImpliedRate(updated.amount, maturity, updated.duration);
          if (implied !== null && rateVal === 0) updated.rate = implied;
        }

        currentUser.investments[idx] = updated;
      }
    }

    saveAccounts();
    renderAll();
    close();
  });

  return { openEdit };
}
