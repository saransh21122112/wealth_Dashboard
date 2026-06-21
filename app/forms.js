import { resetExpenseFormUI, resetInvestmentFormUI } from './form-controls.js';

export function setupForms({ dom, store, todayStr, saveAccounts, renderAll }) {
  if (dom.expenseFilter) {
    dom.expenseFilter.addEventListener('change', renderAll);
  }

  if (dom.expenseForm) {
    dom.expenseForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!store.state.currentUser) return;

      const description = document.getElementById('expDescription').value.trim();
      const amount = parseFloat(document.getElementById('expAmount').value);
      const date = document.getElementById('expDate').value;
      const category = document.getElementById('expCategory').value;
      const isRecurring = document.getElementById('expIsRecurring').checked;

      if (!description || Number.isNaN(amount) || !date) return;

      store.state.currentUser.expenses ||= [];
      store.state.currentUser.expenses.push({
        id: Date.now().toString(),
        description,
        amount,
        date,
        category,
        isRecurring
      });

      saveAccounts();
      dom.expenseForm.reset();
      document.getElementById('expDate').value = todayStr;
      resetExpenseFormUI(dom);
      renderAll();
    });
  }

  if (dom.investmentForm) {
    dom.investmentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!store.state.currentUser) return;

      const type = document.getElementById('invType').value;
      const newInvestment = {
        id: Date.now().toString(),
        name: document.getElementById('invName').value.trim(),
        type,
        startDate: document.getElementById('invDate').value,
        amount: parseFloat(document.getElementById('invAmount').value),
        rate: parseFloat(document.getElementById('invRate').value),
        compounding: document.getElementById('invCompounding').value,
        duration: parseInt(document.getElementById('invDuration').value, 10) || 10
      };

      if (!newInvestment.name || !newInvestment.startDate || Number.isNaN(newInvestment.amount) || Number.isNaN(newInvestment.rate)) {
        return;
      }

      if (type === 'lic') {
        newInvestment.licPolicyNum = document.getElementById('licPolicyNum').value.trim() || null;
        newInvestment.licSumAssured = parseFloat(document.getElementById('licSumAssured').value) || null;
        newInvestment.licPremiumFreq = document.getElementById('licPremiumFreq').value;
        newInvestment.licPremiumDue = document.getElementById('licPremiumDue').value || null;
        newInvestment.compounding = '1';
      }

      store.state.currentUser.investments ||= [];
      store.state.currentUser.investments.push(newInvestment);
      saveAccounts();

      dom.investmentForm.reset();
      document.getElementById('invDate').value = todayStr;
      resetInvestmentFormUI(dom);
      renderAll();
    });
  }
}