export function executeToolCall(toolCall, appendSystemStatus) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  if (name === 'add_income') {
    if (!window.addIncomeFromAI) return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    const r = window.addIncomeFromAI(args.description, args.amount, args.date, args.category, args.isRecurring, args.recurringDay);
    if (r?.error) return { name, content: JSON.stringify({ status: 'error', message: r.message }) };
    const dayNote = r.recurringDay ? ` · day ${r.recurringDay} every month` : '';
    appendSystemStatus(`💰 Income logged: <strong>${r.description}</strong> +₹${r.amount.toLocaleString('en-IN')}${dayNote}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Income added.' }) };
  }

  if (name === 'add_expense') {
    if (!window.addExpenseFromAI) return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    const r = window.addExpenseFromAI(args.description, args.amount, args.date, args.category, args.isRecurring, args.recurringDay, args.endDate);
    if (r?.error) return { name, content: JSON.stringify({ status: 'error', message: r.message }) };
    const dayNote = r.recurringDay ? ` · day ${r.recurringDay}` : '';
    const endNote = r.endDate ? ` till ${r.endDate}` : '';
    appendSystemStatus(`💸 Expense logged: <strong>${r.description}</strong> ₹${r.amount.toLocaleString('en-IN')}${dayNote}${endNote}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Expense added.' }) };
  }

  if (name === 'add_investment') {
    if (!window.addInvestmentFromAI) return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    const r = window.addInvestmentFromAI(args);
    if (r?.error) return { name, content: JSON.stringify({ status: 'error', message: r.message }) };
    const typeLabel = r.type === 'lic' ? 'LIC Policy' : r.type === 'sip' ? 'SIP' : 'Investment';
    const endNote = r.endDate ? ` till ${r.endDate}` : r.duration ? ` (${r.duration}yr)` : '';
    const dayNote = r.recurringDay ? ` · day ${r.recurringDay}` : '';
    appendSystemStatus(`📈 ${typeLabel} logged: <strong>${r.name}</strong> ₹${r.amount.toLocaleString('en-IN')}${dayNote}${endNote}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Investment added.' }) };
  }

  if (name === 'set_cash_balance') {
    if (!window.setCashBalanceFromAI) return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    const r = window.setCashBalanceFromAI(args.amount, args.note);
    if (r?.error) return { name, content: JSON.stringify({ status: 'error', message: r.message }) };
    const noteStr = r.note ? ` (${r.note})` : '';
    appendSystemStatus(`💵 Cash set to: <strong>₹${r.amount.toLocaleString('en-IN')}</strong>${noteStr}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Cash balance set.' }) };
  }

  if (name === 'adjust_cash_balance') {
    if (!window.adjustCashBalanceFromAI) return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    const r = window.adjustCashBalanceFromAI(args.delta, args.reason);
    if (r?.error) return { name, content: JSON.stringify({ status: 'error', message: r.message }) };
    const sign = r.delta >= 0 ? '+' : '−';
    const abs = Math.abs(r.delta).toLocaleString('en-IN');
    const reasonStr = r.reason ? ` · ${r.reason}` : '';
    appendSystemStatus(`💵 Cash ${r.delta >= 0 ? 'added' : 'spent'}: <strong>${sign}₹${abs}</strong> → ₹${r.amount.toLocaleString('en-IN')}${reasonStr}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Cash adjusted.' }) };
  }

  if (name === 'add_lend') {
    if (!window.addLendFromAI) return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    const r = window.addLendFromAI(args.person, args.amount, args.date, args.dueDate, args.note);
    if (r?.error) return { name, content: JSON.stringify({ status: 'error', message: r.message }) };
    const dueNote = r.dueDate ? ` · due ${r.dueDate}` : '';
    appendSystemStatus(`🤝 Lend logged: <strong>₹${r.amount.toLocaleString('en-IN')} to ${r.person}</strong>${dueNote}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Loan recorded.' }) };
  }

  if (name === 'mark_lend_returned') {
    if (!window.markLendReturnedFromAI) return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    const r = window.markLendReturnedFromAI(args.person, args.returnedAmount);
    if (r?.error) return { name, content: JSON.stringify({ status: 'error', message: r.message }) };
    const status = r.returned ? 'Fully returned ✓' : `Partial return (₹${r.returnedAmount.toLocaleString('en-IN')} of ₹${r.amount.toLocaleString('en-IN')})`;
    appendSystemStatus(`✅ ${r.person} returned ₹${r.paidNow.toLocaleString('en-IN')} · ${status}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Loan updated.' }) };
  }

  return { name, content: JSON.stringify({ status: 'error', message: `Unsupported tool: ${name}` }) };
}
