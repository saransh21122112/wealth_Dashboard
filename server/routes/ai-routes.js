const express = require('express');
const rateLimit = require('express-rate-limit');
const { createChatCompletion, hasOpenAIKey } = require('../services/openai-chat-service');
const { authMiddleware } = require('../middleware/auth');
const {
  getIncomeByUserId,
  getExpensesByUserId,
  getInvestmentsByUserId,
  getLendsByUserId,
  getBorrowsByUserId
} = require('../services/data-service');

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please slow down.' }
});

// ── Investment value calculation (mirrors calculations.js exactly) ────────────
function getMonthsBetween(startStr, endDate) {
  const start = new Date(startStr);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += end.getMonth();
  const daysInEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  months += (end.getDate() - start.getDate()) / daysInEndMonth;
  return Math.max(0, months);
}

function calcInvestmentValue(inv, today) {
  if (inv.status === 'closed') return { principal: 0, currentValue: 0 };
  const start = new Date(inv.startDate);
  if (start > today) return { principal: 0, currentValue: 0 };

  const elapsedMonths = getMonthsBetween(inv.startDate, today);
  const elapsedYears = elapsedMonths / 12;
  const annualRate = parseFloat(inv.rate || 0) / 100;
  const principalInput = parseFloat(inv.amount || 0);

  let principalInvested = 0;
  let currentValue = 0;

  if (inv.type === 'sip') {
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    const maxInstallments = Math.floor(parseFloat(inv.duration || 999) * 12);
    if (elapsedMonths < maxInstallments) {
      const n = Math.floor(elapsedMonths) + 1;
      principalInvested = principalInput * n;
      currentValue = monthlyRate < 0.000001
        ? principalInvested
        : principalInput * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate) * (1 + monthlyRate);
    } else {
      principalInvested = principalInput * maxInstallments;
      const corpusAtEnd = monthlyRate < 0.000001
        ? principalInvested
        : principalInput * ((Math.pow(1 + monthlyRate, maxInstallments) - 1) / monthlyRate) * (1 + monthlyRate);
      currentValue = corpusAtEnd * Math.pow(1 + monthlyRate, elapsedMonths - maxInstallments);
    }
  } else if (inv.type === 'lump-sum' || inv.type === 'stocks') {
    principalInvested = principalInput;
    const frequency = parseInt(inv.compounding, 10) || 12;
    let calcYears = elapsedYears;
    if (inv.endDate && today > new Date(inv.endDate)) {
      calcYears = getMonthsBetween(inv.startDate, inv.endDate) / 12;
    }
    currentValue = frequency === 0
      ? principalInput * (1 + annualRate * calcYears)
      : principalInput * Math.pow(1 + annualRate / frequency, frequency * calcYears);
  } else if (inv.type === 'lic') {
    let frequencyMonths = 12;
    if (inv.licPremiumFreq === 'monthly') frequencyMonths = 1;
    else if (inv.licPremiumFreq === 'quarterly') frequencyMonths = 3;
    else if (inv.licPremiumFreq === 'half-yearly') frequencyMonths = 6;

    const totalPolicyMonths = parseFloat(inv.duration || 0) * 12;
    const maxPeriods = Math.floor(totalPolicyMonths / frequencyMonths);

    if (elapsedMonths >= totalPolicyMonths && inv.licSumAssured) {
      return { principal: principalInput * maxPeriods, currentValue: parseFloat(inv.licSumAssured) };
    }

    const n = Math.min(Math.floor(elapsedMonths / frequencyMonths) + 1, maxPeriods);
    principalInvested = principalInput * n;
    const periodsPerYear = 12 / frequencyMonths;
    const periodRate = Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;
    currentValue = periodRate < 0.000001
      ? principalInvested
      : principalInput * ((Math.pow(1 + periodRate, n) - 1) / periodRate) * (1 + periodRate);
  }

  return { principal: principalInvested, currentValue: Math.max(principalInvested, currentValue) };
}

// ── Guarded financial summary endpoint ────────────────────────────────────────
// Data is ALWAYS fetched fresh from the DB using the authenticated user's ID.
// The client never provides the data — preventing cross-user data injection.
router.get('/api/ai/financial-summary', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const [income, expenses, investments, lends, borrows] = await Promise.all([
      getIncomeByUserId(userId),
      getExpensesByUserId(userId),
      getInvestmentsByUserId(userId),
      getLendsByUserId(userId),
      getBorrowsByUserId(userId)
    ]);

    const cashAmount = req.user.cash_balance_amount;
    const cashBalance = (cashAmount != null && Number(cashAmount) > 0)
      ? { amount: Number(cashAmount), note: req.user.cash_balance_note ?? null, updatedAt: req.user.cash_balance_updated_at ?? null }
      : null;

    const today = new Date();
    const freqMap = { monthly: 1, quarterly: 3, 'half-yearly': 6, annually: 12 };

    const monthlyRecurringIncome = income
      .filter(i => i.isRecurring && !(i.endDate && new Date(i.endDate) < today))
      .reduce((s, i) => s + i.amount, 0);

    const monthlyRecurringExpenses = expenses
      .filter(e => e.isRecurring && !(e.endDate && new Date(e.endDate) < today))
      .reduce((s, e) => s + e.amount, 0);

    const monthlySIPOutgo = investments
      .filter(inv => inv.status !== 'closed' && !(inv.endDate && new Date(inv.endDate) < today))
      .reduce((s, inv) => {
        if (inv.type === 'sip') return s + inv.amount;
        if (inv.type === 'lic') return s + inv.amount / (freqMap[inv.licPremiumFreq] || 12);
        return s;
      }, 0);

    const outstandingLends = lends
      .filter(l => !l.returned)
      .reduce((s, l) => s + l.amount - (l.returnedAmount || 0), 0);

    const outstandingBorrows = borrows
      .filter(b => !b.repaid)
      .reduce((s, b) => s + b.amount - (b.repaidAmount || 0), 0);

    let totalCurrentValue = 0;
    let totalPrincipal = 0;
    for (const inv of investments.filter(i => i.status !== 'closed')) {
      const result = calcInvestmentValue(inv, today);
      totalCurrentValue += result.currentValue || 0;
      totalPrincipal += result.principal || 0;
    }

    const cashAmt = cashBalance?.amount || 0;
    const monthlySurplus = Math.max(0, monthlyRecurringIncome - monthlyRecurringExpenses - monthlySIPOutgo);
    const estimatedNetWorth = totalCurrentValue + cashAmt + outstandingLends - outstandingBorrows;

    return res.json({
      income,
      expenses,
      investments,
      lends,
      borrows,
      cashBalance,
      computed: {
        monthlyRecurringIncome:           Math.round(monthlyRecurringIncome),
        monthlyRecurringExpenses:         Math.round(monthlyRecurringExpenses),
        monthlySIPAndLICOutgo:            Math.round(monthlySIPOutgo),
        monthlySurplus:                   Math.round(monthlySurplus),
        totalPrincipalInvested:           Math.round(totalPrincipal),
        estimatedCurrentInvestmentValue:  Math.round(totalCurrentValue),
        outstandingLendsReceivable:       Math.round(outstandingLends),
        outstandingBorrowsPayable:        Math.round(outstandingBorrows),
        cashBalance:                      Math.round(cashAmt),
        estimatedNetWorth:                Math.round(estimatedNetWorth)
      }
    });
  } catch (error) {
    console.error('[AI] Failed to compute financial summary:', error);
    return res.status(500).json({ error: 'Failed to fetch financial summary.' });
  }
});

router.post('/api/ai/chat', authMiddleware, aiLimiter, async (req, res) => {
  if (!hasOpenAIKey()) {
    return res.status(500).json({
      error: 'Missing OPENAI_API_KEY. Set it in .env or your deployment environment before using Aurelia AI.'
    });
  }

  const { messages, tools, tool_choice: toolChoice, model } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array.' });
  }

  try {
    const completion = await createChatCompletion({ messages, tools, toolChoice, model });
    return res.json(completion);
  } catch (error) {
    const statusCode = error.status || 500;
    const internalMessage = error?.error?.message || error.message || 'Unknown OpenAI error';

    console.error(`[AI] OpenAI error ${statusCode}: ${internalMessage}`);
    console.error('[AI] Full error:', JSON.stringify(error?.error ?? error, null, 2));
    if (error.stack) console.error('[AI] Stack:', error.stack);

    const userMessage =
      statusCode === 429 ? 'Too many requests. Please wait a moment before sending another message.' :
      statusCode === 502 || statusCode === 503 ? 'AI service is temporarily unavailable. Please try again in a moment.' :
      'Something went wrong. Please try again.';

    return res.status(statusCode).json({ error: userMessage });
  }
});

module.exports = router;