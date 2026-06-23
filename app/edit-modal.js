const INCOME_CATEGORIES = [
  ['salary', 'Salary / Wages'], ['freelance', 'Freelance / Contract'],
  ['bonus', 'Bonus / Commission'], ['rental', 'Rental Income'],
  ['dividend', 'Dividend'], ['interest', 'Interest Income'],
  ['refund', 'Tax / IT Refund'], ['cashback', 'Cashback'],
  ['sale', 'Sale of Asset'], ['gift', 'Gift / Inheritance'], ['other', 'Other']
];
const EXPENSE_CATEGORIES = [
  ['housing', 'Housing / Rent'], ['groceries', 'Groceries / Food'],
  ['utilities', 'Utilities / Bills'], ['transport', 'Transport / Commute'],
  ['entertainment', 'Entertainment / Dining'], ['insurance', 'Insurance Premium'],
  ['subscription', 'Subscription / Recharge'], ['health', 'Health & Medical'],
  ['lic', 'LIC Premium (Expense)'], ['travel', 'Travel'],
  ['extra', 'Extra / Splurge'], ['miscellaneous', 'Miscellaneous']
];

const FREQ_MONTHS = { monthly: 1, quarterly: 3, 'half-yearly': 6, annually: 12 };

// Bisection search: premium × SIP FV(period rate, n periods) = maturityValue → effective annual rate
function calcImpliedRate(premium, maturityValue, durationYears, frequencyMonths) {
  const fm = frequencyMonths || 1;
  const periodsPerYear = 12 / fm;
  const n = Math.round(durationYears * periodsPerYear);
  if (!premium || !maturityValue || !durationYears || n <= 0) return null;
  function fv(r) {
    if (r < 0.000001) return premium * n;
    return premium * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  }
  if (fv(0) >= maturityValue) return null;
  let lo = 0.000001, hi = 0.5 / periodsPerYear;
  for (let i = 0; i < 400; i++) {
    const mid = (lo + hi) / 2;
    if (fv(mid) < maturityValue) lo = mid; else hi = mid;
  }
  const periodRate = (lo + hi) / 2;
  const annual = (Math.pow(1 + periodRate, periodsPerYear) - 1) * 100;
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

  const FREQ_LABELS = { monthly: '/mo', quarterly: '/qtr', 'half-yearly': '/half-yr', annually: '/yr' };

  function updateLICRate() {
    const amount = parseFloat(document.getElementById('editInvAmount').value);
    const maturity = parseFloat(document.getElementById('editLicSumAssured').value);
    const duration = parseInt(document.getElementById('editInvDuration').value, 10);
    const freqVal = document.getElementById('editLicPremiumFreq')?.value || 'monthly';
    const frequencyMonths = FREQ_MONTHS[freqVal] || 1;
    const rateInput = document.getElementById('editInvRateLic');
    const hint = document.getElementById('editLicRateHint');
    const tag = document.getElementById('editLicRateTag');

    const rate = calcImpliedRate(amount, maturity, duration, frequencyMonths);
    if (rate !== null) {
      rateInput.value = rate;
      rateInput.style.color = 'var(--color-success)';
      const freqLabel = FREQ_LABELS[freqVal] || '/mo';
      if (hint) hint.textContent = `₹${amount.toLocaleString('en-IN')}${freqLabel} × ${duration}yr → ₹${Math.round(maturity).toLocaleString('en-IN')}`;
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
  document.getElementById('editLicPremiumFreq')?.addEventListener('change', () => {
    if (invTypeSelect.value === 'lic') updateLICRate();
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
          // Always recalculate with correct frequency — user can still override via the rate field
          const freqMonths = FREQ_MONTHS[updated.licPremiumFreq] || 12;
          const implied = calcImpliedRate(updated.amount, maturity, updated.duration, freqMonths);
          if (implied !== null) updated.rate = implied;
          // If user manually changed rate field, use that instead
          if (rateVal > 0) updated.rate = rateVal;
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
