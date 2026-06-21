export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_income',
      description: 'Log a new income entry (salary, freelance, bonus, rental, etc.) to the wealth dashboard as a credit.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'The name or description of the income source (e.g., Monthly Salary, Freelance Project, Diwali Bonus).'
          },
          amount: {
            type: 'number',
            description: 'The income amount in Indian Rupees (₹).'
          },
          date: {
            type: 'string',
            description: 'The date the income was received in YYYY-MM-DD format. Default to today\'s date if unspecified.'
          },
          category: {
            type: 'string',
            enum: ['salary', 'freelance', 'bonus', 'rental', 'gift', 'other'],
            description: 'The category that best fits this income source.'
          },
          isRecurring: {
            type: 'boolean',
            description: 'True if this is a monthly recurring income (like a salary). False if it is a one-time or irregular income.'
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
      description: 'Log a new expense (monthly recurring or one-time/extra) to the wealth dashboard.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'The name or description of the expense item (e.g., Grocery, Rent, Movie Tickets).'
          },
          amount: {
            type: 'number',
            description: 'The cost/amount of the expense in Indian Rupees (₹).'
          },
          date: {
            type: 'string',
            description: 'The date the expense occurred in YYYY-MM-DD format. Default to today\'s date if unspecified.'
          },
          category: {
            type: 'string',
            enum: ['housing', 'groceries', 'utilities', 'entertainment', 'lic', 'health', 'travel', 'extra', 'miscellaneous'],
            description: 'The category that best fits this expense.'
          },
          isRecurring: {
            type: 'boolean',
            description: 'True if this is a monthly recurring expense (like Rent, Netflix subscription, bills). False if it is a one-time or extra expense.'
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
            description: 'The name of the investment asset (e.g. SBI Mutual Fund Nifty Index, LIC Jeevan Anand, FD HDFC).'
          },
          type: {
            type: 'string',
            enum: ['sip', 'lump-sum', 'stocks', 'lic'],
            description: 'The asset class type.'
          },
          amount: {
            type: 'number',
            description: 'The principal/SIP monthly amount or insurance premium amount in Indian Rupees (₹).'
          },
          rate: {
            type: 'number',
            description: 'The expected annual interest or returns rate in percent (%).'
          },
          startDate: {
            type: 'string',
            description: 'The start date of the investment in YYYY-MM-DD format. Default to today\'s date if unspecified.'
          },
          duration: {
            type: 'number',
            description: 'The total investment period duration in Years.'
          },
          compounding: {
            type: 'string',
            enum: ['12', '4', '2', '1', '0'],
            description: 'Compounding frequency per year: "12" for monthly, "4" for quarterly, "2" for half-yearly, "1" for annually, "0" for simple interest. Default to "12".'
          },
          licPolicyNum: {
            type: 'string',
            description: 'Optional LIC policy number.'
          },
          licSumAssured: {
            type: 'number',
            description: 'Optional sum assured amount for LIC policy.'
          },
          licPremiumFreq: {
            type: 'string',
            enum: ['annually', 'half-yearly', 'quarterly', 'monthly'],
            description: 'Optional premium frequency for LIC policies.'
          },
          licPremiumDue: {
            type: 'string',
            description: 'Optional next premium due date in YYYY-MM-DD format.'
          }
        },
        required: ['name', 'type', 'amount', 'rate', 'duration']
      }
    }
  }
];