export function getMonthsBetweenDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += end.getMonth();
  const startDay = start.getDate();
  const endDay = end.getDate();
  const daysInEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  months += (endDay - startDay) / daysInEndMonth;
  return Math.max(0, months);
}

export function calculateInvestmentValue(inv) {
  const today = new Date();
  const start = new Date(inv.startDate);
  if (start > today) {
    return { principal: 0, currentValue: 0, elapsedMonths: 0 };
  }

  const elapsedMonths = getMonthsBetweenDates(inv.startDate, today);
  const elapsedYears = elapsedMonths / 12;
  const annualRate = parseFloat(inv.rate) / 100;
  const principalInput = parseFloat(inv.amount);

  let principalInvested = 0;
  let currentValue = 0;

  switch (inv.type) {
    case 'sip': {
      const monthlyRate = annualRate / 12;
      const totalInstallments = Math.floor(elapsedMonths) + 1;
      principalInvested = principalInput * totalInstallments;
      if (monthlyRate === 0) {
        currentValue = principalInvested;
      } else {
        currentValue = principalInput * ((Math.pow(1 + monthlyRate, totalInstallments) - 1) / monthlyRate) * (1 + monthlyRate);
      }
      break;
    }
    case 'lump-sum':
    case 'stocks': {
      principalInvested = principalInput;
      const frequency = parseInt(inv.compounding, 10) || 12;
      currentValue = frequency === 0
        ? principalInput * (1 + annualRate * elapsedYears)
        : principalInput * Math.pow(1 + annualRate / frequency, frequency * elapsedYears);
      break;
    }
    case 'lic': {
      let frequencyMonths = 12;
      if (inv.licPremiumFreq === 'half-yearly') frequencyMonths = 6;
      if (inv.licPremiumFreq === 'quarterly') frequencyMonths = 3;
      if (inv.licPremiumFreq === 'monthly') frequencyMonths = 1;

      const paymentsMade = Math.floor(elapsedMonths / frequencyMonths) + 1;
      principalInvested = principalInput * paymentsMade;

      for (let index = 0; index < paymentsMade; index += 1) {
        const monthsSincePayment = elapsedMonths - (index * frequencyMonths);
        const yearsSincePayment = monthsSincePayment / 12;
        currentValue += principalInput * Math.pow(1 + annualRate, yearsSincePayment);
      }
      break;
    }
  }

  return {
    principal: principalInvested,
    currentValue: Math.max(principalInvested, currentValue),
    elapsedMonths
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}