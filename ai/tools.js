export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_income',
      description: 'Log a new income entry (salary, freelance, bonus, rental, etc.) to the wealth dashboard.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Name or description of the income source (e.g., Monthly Salary, Freelance Project, Diwali Bonus).'
          },
          amount: {
            type: 'number',
            description: 'Income amount in Indian Rupees (₹).'
          },
          date: {
            type: 'string',
            description: 'Date the income was received in YYYY-MM-DD format. Default to today if unspecified.'
          },
          category: {
            type: 'string',
            enum: ['salary', 'freelance', 'bonus', 'rental', 'gift', 'other'],
            description: 'Category that best fits this income source.'
          },
          isRecurring: {
            type: 'boolean',
            description: 'True if this income arrives every month (e.g., salary). False if one-time or irregular.'
          },
          recurringDay: {
            type: 'number',
            description: 'For recurring income: the day of the month it is credited (1–31). For example, salary credited on the 1st → 1, on the 5th → 5. Capture this whenever the user mentions a specific date pattern like "on the 1st" or "every 5th".'
          }
        },
        required: ['description', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_expense',
      description: 'Log a new expense (monthly recurring bill/EMI or one-time extra spend) to the wealth dashboard.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Name or description of the expense (e.g., House Rent, Bike EMI, Netflix, Groceries).'
          },
          amount: {
            type: 'number',
            description: 'Expense amount in Indian Rupees (₹).'
          },
          date: {
            type: 'string',
            description: 'Date the expense occurred in YYYY-MM-DD format. For recurring expenses, use the first payment date or when it started.'
          },
          category: {
            type: 'string',
            enum: ['housing', 'groceries', 'utilities', 'entertainment', 'lic', 'health', 'travel', 'extra', 'miscellaneous'],
            description: 'Category that best fits this expense.'
          },
          isRecurring: {
            type: 'boolean',
            description: 'True if this is a fixed monthly expense (Rent, EMI, subscription). False if one-time or irregular.'
          },
          recurringDay: {
            type: 'number',
            description: 'For recurring expenses: the day of the month it is deducted (1–31). For example, rent paid on 1st → 1, EMI deducted on 5th → 5. Always capture this for EMIs and regular bills when the user mentions a specific date.'
          },
          endDate: {
            type: 'string',
            description: 'For EMIs or time-limited expenses: the date when this expense ends in YYYY-MM-DD format. For example, "bike EMI for 3 years from April 2024" → endDate: "2027-04-01". Always capture this for EMIs.'
          }
        },
        required: ['description', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_investment',
      description: 'Log a new asset or investment (SIP, Lump-sum, Stocks, LIC policy) to the wealth dashboard.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the investment (e.g., SBI Mutual Fund Nifty Index, LIC Jeevan Anand, HDFC FD).'
          },
          type: {
            type: 'string',
            enum: ['sip', 'lump-sum', 'stocks', 'lic'],
            description: 'The investment type.'
          },
          amount: {
            type: 'number',
            description: 'Monthly SIP / premium amount, or lump-sum invested amount, in Rupees (₹).'
          },
          rate: {
            type: 'number',
            description: 'Expected annual return rate in percent (%). For LIC: derive from duration using the rules in the prompt. For SIP: 12%. For FD: 7%. For Stocks: 11%.'
          },
          startDate: {
            type: 'string',
            description: 'The exact date this investment started in YYYY-MM-DD format. Use the actual start date the user mentions — never default to today if a past date is given.'
          },
          endDate: {
            type: 'string',
            description: 'The maturity or end date of the investment in YYYY-MM-DD format. For LIC: the policy end/maturity date the user mentions (e.g., "till 12-05-2047" → "2047-05-12"). For SIP: when the user plans to stop. Always prefer capturing endDate over asking for duration, since users naturally say "till 2047" not "25 years".'
          },
          duration: {
            type: 'number',
            description: 'Total investment period in years. Computed automatically from startDate and endDate when both are provided. Otherwise use the number the user states.'
          },
          compounding: {
            type: 'string',
            enum: ['12', '4', '2', '1', '0'],
            description: 'Compounding frequency per year: "12"=monthly, "4"=quarterly, "2"=half-yearly, "1"=annually, "0"=simple interest. Default "12" for SIP/FD/stocks.'
          },
          recurringDay: {
            type: 'number',
            description: 'For SIPs: the day of month the amount is deducted (1–31). For example, "SIP deducted on 7th of every month" → 7. Capture this whenever the user mentions a specific deduction date for their SIP.'
          },
          licPolicyNum: {
            type: 'string',
            description: 'LIC policy number (optional).'
          },
          licSumAssured: {
            type: 'number',
            description: 'REQUIRED for LIC: the total maturity/payout amount the user will receive at the end of the policy (e.g., "I will get 13 lakh" → 1300000, "will get 76 lakhs" → 7600000).'
          },
          licPremiumFreq: {
            type: 'string',
            enum: ['monthly', 'quarterly', 'half-yearly', 'annually'],
            description: 'LIC premium payment frequency. Derive from what the user says: "every month" → "monthly", "every year" → "annually". Default "monthly" if they quote a monthly amount.'
          },
          licPremiumDue: {
            type: 'string',
            description: 'Next LIC premium due date in YYYY-MM-DD format (optional).'
          }
        },
        required: ['name', 'type', 'amount', 'rate', 'startDate']
      }
    }
  }
];
