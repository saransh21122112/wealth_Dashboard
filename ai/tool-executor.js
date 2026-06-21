export function executeToolCall(toolCall, appendSystemStatus) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  if (name === 'add_income') {
    if (!window.addIncomeFromAI) {
      return {
        name,
        content: JSON.stringify({ status: 'error', message: 'Dashboard insertion API unavailable.' })
      };
    }

    const added = window.addIncomeFromAI(args.description, args.amount, args.date, args.category, args.isRecurring);
    appendSystemStatus(`💰 Logged Income: <strong>${added.description}</strong> of +₹${added.amount.toLocaleString('en-IN')}`);

    return {
      name,
      content: JSON.stringify({ status: 'success', message: 'Income added to dashboard successfully.' })
    };
  }

  if (name === 'add_expense') {
    if (!window.addExpenseFromAI) {
      return {
        name,
        content: JSON.stringify({ status: 'error', message: 'Dashboard insertion API unavailable.' })
      };
    }

    const added = window.addExpenseFromAI(args.description, args.amount, args.date, args.category, args.isRecurring);
    appendSystemStatus(`💸 Logged Expense: <strong>${added.description}</strong> of ₹${added.amount.toLocaleString('en-IN')}`);

    return {
      name,
      content: JSON.stringify({ status: 'success', message: 'Expense added to dashboard successfully.' })
    };
  }

  if (name === 'add_investment') {
    if (!window.addInvestmentFromAI) {
      return {
        name,
        content: JSON.stringify({ status: 'error', message: 'Dashboard insertion API unavailable.' })
      };
    }

    const added = window.addInvestmentFromAI(args);
    const typeLabel = added.type === 'lic' ? 'LIC Policy' : added.type === 'sip' ? 'SIP' : 'Investment';
    appendSystemStatus(`📈 Logged ${typeLabel}: <strong>${added.name}</strong> of ₹${added.amount.toLocaleString('en-IN')}`);

    return {
      name,
      content: JSON.stringify({ status: 'success', message: 'Investment added to dashboard successfully.' })
    };
  }

  return {
    name,
    content: JSON.stringify({ status: 'error', message: `Unsupported tool: ${name}` })
  };
}