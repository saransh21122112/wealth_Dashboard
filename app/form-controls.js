export function setupFormControls(dom) {
  if (dom.invTypeSelect) {
    dom.invTypeSelect.addEventListener('change', () => {
      const type = dom.invTypeSelect.value;
      if (type === 'lic') {
        dom.licFields.classList.add('active');
        dom.invAmountLabel.textContent = 'Premium Amount (₹)';
        dom.compoundingFrequencyGroup.style.display = 'none';
        return;
      }

      dom.licFields.classList.remove('active');
      dom.compoundingFrequencyGroup.style.display = 'grid';
      dom.invAmountLabel.textContent = type === 'sip' ? 'Monthly SIP Amount (₹)' : 'Principal Amount (₹)';
    });
  }

  if (dom.expIsRecurring) {
    dom.expIsRecurring.addEventListener('change', () => {
      dom.expToggleLabel.textContent = dom.expIsRecurring.checked ? 'Monthly Recurring Expense' : 'One-time / Extra Expense';
    });
  }
}

export function resetInvestmentFormUI(dom) {
  if (dom.licFields) dom.licFields.classList.remove('active');
  if (dom.compoundingFrequencyGroup) dom.compoundingFrequencyGroup.style.display = 'grid';
  if (dom.invAmountLabel) dom.invAmountLabel.textContent = 'Monthly SIP Amount (₹)';
}

export function resetExpenseFormUI(dom) {
  if (dom.expToggleLabel) dom.expToggleLabel.textContent = 'One-time / Extra Expense';
}