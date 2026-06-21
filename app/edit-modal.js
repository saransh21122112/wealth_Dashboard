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

  invTypeSelect.addEventListener('change', () => {
    const isLic = invTypeSelect.value === 'lic';
    document.getElementById('editLicFields').style.display = isLic ? 'block' : 'none';
    document.getElementById('editCompoundingGroup').style.display = isLic ? 'none' : 'flex';
  });

  function populateSelect(selectEl, options, selected) {
    selectEl.innerHTML = options.map(([val, label]) =>
      `<option value="${val}" ${val === selected ? 'selected' : ''}>${label}</option>`
    ).join('');
  }

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
      document.getElementById('editInvRate').value = item.rate;
      document.getElementById('editInvCompounding').value = item.compounding || '12';
      document.getElementById('editInvDuration').value = item.duration || 10;

      const isLic = item.type === 'lic';
      document.getElementById('editLicFields').style.display = isLic ? 'block' : 'none';
      document.getElementById('editCompoundingGroup').style.display = isLic ? 'none' : 'flex';

      if (isLic) {
        document.getElementById('editLicPolicyNum').value = item.licPolicyNum || '';
        document.getElementById('editLicSumAssured').value = item.licSumAssured || '';
        document.getElementById('editLicPremiumFreq').value = item.licPremiumFreq || 'annually';
        document.getElementById('editLicPremiumDue').value = item.licPremiumDue || '';
      }
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
        const updated = {
          ...currentUser.investments[idx],
          name: document.getElementById('editInvName').value.trim(),
          type: invType,
          startDate: document.getElementById('editInvDate').value,
          amount: parseFloat(document.getElementById('editInvAmount').value),
          rate: parseFloat(document.getElementById('editInvRate').value),
          compounding: invType === 'lic' ? '1' : document.getElementById('editInvCompounding').value,
          duration: parseInt(document.getElementById('editInvDuration').value, 10) || 10
        };
        if (invType === 'lic') {
          updated.licPolicyNum = document.getElementById('editLicPolicyNum').value.trim() || null;
          updated.licSumAssured = parseFloat(document.getElementById('editLicSumAssured').value) || null;
          updated.licPremiumFreq = document.getElementById('editLicPremiumFreq').value;
          updated.licPremiumDue = document.getElementById('editLicPremiumDue').value || null;
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
