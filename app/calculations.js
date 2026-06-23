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
  if (inv.status === 'closed') {
    return { principal: 0, currentValue: 0, elapsedMonths: 0, closed: true };
  }
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
      // Effective monthly rate from annual CAGR: (1 + r_annual)^(1/12) − 1
      const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
      const maxInstallments = Math.floor(parseFloat(inv.duration || 999) * 12);
      const totalInstallments = Math.min(Math.floor(elapsedMonths) + 1, maxInstallments);
      principalInvested = principalInput * totalInstallments;
      currentValue = monthlyRate === 0
        ? principalInvested
        : principalInput * ((Math.pow(1 + monthlyRate, totalInstallments) - 1) / monthlyRate) * (1 + monthlyRate);
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
      if (inv.licPremiumFreq === 'monthly') frequencyMonths = 1;
      else if (inv.licPremiumFreq === 'quarterly') frequencyMonths = 3;
      else if (inv.licPremiumFreq === 'half-yearly') frequencyMonths = 6;

      // Cap payments at policy term
      const maxPeriods = Math.floor(parseFloat(inv.duration) * 12 / frequencyMonths);
      const n = Math.min(Math.floor(elapsedMonths / frequencyMonths) + 1, maxPeriods);
      principalInvested = principalInput * n;

      // Period rate derived from the effective annual rate
      // (the annual rate was derived via monthly SIP FV bisection: annual = (1+r_monthly)^12 − 1)
      const periodsPerYear = 12 / frequencyMonths;
      const periodRate = Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;

      currentValue = periodRate < 0.000001
        ? principalInvested
        : principalInput * ((Math.pow(1 + periodRate, n) - 1) / periodRate) * (1 + periodRate);
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