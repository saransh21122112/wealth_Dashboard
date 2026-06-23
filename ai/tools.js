export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_income',
      description: 'Log a new income entry (salary, freelance, bonus, rental, etc.) to the wealth dashboard.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Name or description of the income source.' },
          amount: { type: 'number', description: 'Income amount in Indian Rupees (₹).' },
          date: { type: 'string', description: 'Date received in YYYY-MM-DD. Default to today if unspecified.' },
          category: { type: 'string', enum: ['salary', 'freelance', 'bonus', 'rental', 'dividend', 'interest', 'refund', 'cashback', 'sale', 'gift', 'other'] },
          isRecurring: { type: 'boolean', description: 'True if this income arrives every month (e.g. salary).' },
          recurringDay: { type: 'number', description: 'Day of the month (1–31) this income is credited. E.g. salary on 1st → 1.' }
        },
        required: ['description', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_expense',
      description: 'Log a new expense (recurring bill/EMI or one-time spend) to the wealth dashboard.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Name or description of the expense.' },
          amount: { type: 'number', description: 'Expense amount in Indian Rupees (₹).' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD. For recurring, use first payment date.' },
          category: { type: 'string', enum: ['housing', 'groceries', 'utilities', 'transport', 'entertainment', 'insurance', 'subscription', 'lic', 'health', 'travel', 'extra', 'miscellaneous'] },
          isRecurring: { type: 'boolean', description: 'True if fixed monthly (Rent, EMI, subscription).' },
          recurringDay: { type: 'number', description: 'Day of the month (1–31) this expense is deducted. E.g. EMI on 5th → 5.' },
          endDate: { type: 'string', description: 'For EMIs/loans: date when this expense ends in YYYY-MM-DD. REQUIRED for any EMI.' }
        },
        required: ['description', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_investment',
      description: 'Log a new investment or asset (SIP, Lump-sum, Stocks, LIC policy) to the wealth dashboard.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the investment.' },
          type: { type: 'string', enum: ['sip', 'lump-sum', 'stocks', 'lic'] },
          amount: { type: 'number', description: 'Monthly SIP / premium / lump-sum amount in ₹.' },
          rate: { type: 'number', description: 'Expected annual return rate in %. Derive from duration for LIC.' },
          startDate: { type: 'string', description: 'Actual start date in YYYY-MM-DD. Never default to today if user gives a past date.' },
          endDate: { type: 'string', description: 'Maturity/end date in YYYY-MM-DD. Preferred over duration. E.g. "till 2047-05-12". REQUIRED for LIC and SIP.' },
          duration: { type: 'number', description: 'Duration in years (auto-computed from endDate when provided).' },
          compounding: { type: 'string', enum: ['12', '4', '2', '1', '0'], description: '"12"=monthly, "4"=quarterly, "2"=half-yearly, "1"=annually, "0"=simple.' },
          recurringDay: { type: 'number', description: 'Day of month (1–31) SIP is deducted. E.g. "SIP on 7th" → 7.' },
          licPolicyNum: { type: 'string', description: 'LIC policy number (optional).' },
          licSumAssured: { type: 'number', description: 'REQUIRED for LIC: total maturity/payout amount. E.g. "get 13 lakh" → 1300000.' },
          licPremiumFreq: { type: 'string', enum: ['monthly', 'quarterly', 'half-yearly', 'annually'], description: 'LIC premium frequency.' },
          licPremiumDue: { type: 'string', description: 'Next LIC premium due date in YYYY-MM-DD (optional).' }
        },
        required: ['name', 'type', 'amount', 'rate', 'startDate']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_cash_balance',
      description: 'Set the cash balance to an EXACT amount. Use ONLY when the user states the total cash they currently have (e.g. "I have ₹30,000 cash right now"). This REPLACES the previous value. Do NOT use for payments or top-ups — use adjust_cash_balance for those.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Exact total cash balance in ₹.' },
          note: { type: 'string', description: 'Short note, e.g. "wallet + savings".' }
        },
        required: ['amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'adjust_cash_balance',
      description: 'Add to or subtract from the current cash balance. Use for: cash payments made ("I paid ₹500 from cash"), cash received/withdrawn ("I withdrew ₹5000"), or saving a portion of monthly surplus to cash ("move ₹10,000 from savings to cash"). A positive delta adds; a negative delta subtracts.',
      parameters: {
        type: 'object',
        properties: {
          delta: {
            type: 'number',
            description: 'Amount to add (positive) or subtract (negative) from current cash balance in ₹. E.g. paid ₹500 cash → -500. Saved ₹10,000 to cash → +10000.'
          },
          reason: {
            type: 'string',
            description: 'Short description of why the cash changed. E.g. "paid for groceries", "ATM withdrawal", "monthly savings transfer".'
          }
        },
        required: ['delta']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_lend',
      description: 'Record money that the user has lent to someone else. This is money owed back to the user — it counts as an asset in their net worth.',
      parameters: {
        type: 'object',
        properties: {
          person: { type: 'string', description: 'Name of the person the money was lent to.' },
          amount: { type: 'number', description: 'Amount lent in ₹.' },
          date: { type: 'string', description: 'Date the money was lent in YYYY-MM-DD. Default to today if unspecified.' },
          dueDate: { type: 'string', description: 'Expected repayment date in YYYY-MM-DD (optional). E.g. "he will return next month".' },
          note: { type: 'string', description: 'Optional note or reason for the loan.' }
        },
        required: ['person', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mark_lend_returned',
      description: 'Mark a loan as returned (fully or partially). Use when the user says someone paid them back.',
      parameters: {
        type: 'object',
        properties: {
          person: { type: 'string', description: 'Name of the person who returned the money.' },
          returnedAmount: { type: 'number', description: 'Amount returned in ₹. If not specified and user says "fully returned", use the full outstanding amount.' }
        },
        required: ['person']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_borrow',
      description: 'Record money the user borrowed from someone else. This is a LIABILITY — user owes this money back. Use when user says "I borrowed X from Y", "I took a loan from Y", "Y gave me X which I need to return", "I owe X to Y" (when it\'s a personal informal loan).',
      parameters: {
        type: 'object',
        properties: {
          person: { type: 'string', description: 'Name of the person or entity who lent you the money.' },
          amount: { type: 'number', description: 'Amount borrowed in ₹.' },
          date: { type: 'string', description: 'Date borrowed in YYYY-MM-DD. Default to today.' },
          dueDate: { type: 'string', description: 'When you plan to repay, in YYYY-MM-DD (optional).' },
          note: { type: 'string', description: 'Reason or context for the loan (optional).' }
        },
        required: ['person', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mark_borrow_repaid',
      description: 'Record that the user repaid some or all of a borrowed amount. Deducts from cash if paid in cash.',
      parameters: {
        type: 'object',
        properties: {
          person: { type: 'string', description: 'Name of the person you repaid.' },
          repaidAmount: { type: 'number', description: 'Amount repaid in ₹. If user says "fully repaid", use the full outstanding amount.' },
          paidFromCash: { type: 'boolean', description: 'True if the user paid from cash/wallet. Will also deduct from cash balance.' }
        },
        required: ['person']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'close_investment',
      description: 'Mark an investment as redeemed or closed. Use when user says "I redeemed my SIP", "FD matured", "I closed my mutual fund", "I sold my stocks". Automatically adds proceeds to cash balance.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name (or partial name) of the investment to close. Matched case-insensitively.' },
          proceeds: { type: 'number', description: 'Amount received on redemption/maturity in ₹.' },
          date: { type: 'string', description: 'Date of redemption in YYYY-MM-DD. Default to today.' }
        },
        required: ['name', 'proceeds']
      }
    }
  }
];
