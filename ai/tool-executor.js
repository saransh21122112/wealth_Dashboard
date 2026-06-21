export function executeToolCall(toolCall, appendSystemStatus) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  if (name === 'add_income') {
    if (!window.addIncomeFromAI) {
      return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    }
    const result = window.addIncomeFromAI(
      args.description, args.amount, args.date,
      args.category, args.isRecurring, args.recurringDay
    );
    if (result?.error) {
      return { name, content: JSON.stringify({ status: 'error', message: result.message }) };
    }
    const dayNote = result.recurringDay ? ` (day ${result.recurringDay} every month)` : '';
    appendSystemStatus(`💰 Logged Income: <strong>${result.description}</strong> +₹${result.amount.toLocaleString('en-IN')}${dayNote}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Income added.' }) };
  }

  if (name === 'add_expense') {
    if (!window.addExpenseFromAI) {
      return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    }
    const result = window.addExpenseFromAI(
      args.description, args.amount, args.date,
      args.category, args.isRecurring, args.recurringDay, args.endDate
    );
    if (result?.error) {
      return { name, content: JSON.stringify({ status: 'error', message: result.message }) };
    }
    const dayNote = result.recurringDay ? ` (day ${result.recurringDay})` : '';
    const endNote = result.endDate ? ` till ${result.endDate}` : '';
    appendSystemStatus(`💸 Logged Expense: <strong>${result.description}</strong> ₹${result.amount.toLocaleString('en-IN')}${dayNote}${endNote}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Expense added.' }) };
  }

  if (name === 'add_investment') {
    if (!window.addInvestmentFromAI) {
      return { name, content: JSON.stringify({ status: 'error', message: 'Dashboard API unavailable.' }) };
    }
    const result = window.addInvestmentFromAI(args);
    if (result?.error) {
      return { name, content: JSON.stringify({ status: 'error', message: result.message }) };
    }
    const typeLabel = result.type === 'lic' ? 'LIC Policy' : result.type === 'sip' ? 'SIP' : 'Investment';
    const endNote = result.endDate ? ` till ${result.endDate}` : `(${result.duration}yr)`;
    const dayNote = result.recurringDay ? ` on day ${result.recurringDay}` : '';
    appendSystemStatus(`📈 Logged ${typeLabel}: <strong>${result.name}</strong> ₹${result.amount.toLocaleString('en-IN')}${dayNote} ${endNote}`);
    return { name, content: JSON.stringify({ status: 'success', message: 'Investment added.' }) };
  }

  return { name, content: JSON.stringify({ status: 'error', message: `Unsupported tool: ${name}` }) };
}
