export const TODAY_STRING = new Date().toISOString().split('T')[0];

export const DEFAULT_ACCOUNTS = [
  {
    username: 'user',
    password: 'user123',
    role: 'user',
    expenses: [
      {
        id: 'user-exp-1',
        description: 'Rent',
        amount: 18000,
        date: '2026-06-01',
        category: 'housing',
        isRecurring: true
      },
      {
        id: 'user-exp-2',
        description: 'Utilities',
        amount: 3000,
        date: '2026-06-05',
        category: 'utilities',
        isRecurring: true
      }
    ],
    investments: [
      {
        id: 'user-inv-1',
        name: 'Nifty Index',
        type: 'sip',
        startDate: '2025-01-01',
        amount: 5000,
        rate: 12,
        compounding: '12',
        duration: 10
      }
    ]
  },
  {
    username: 'john',
    password: 'john123',
    role: 'user',
    expenses: [
      {
        id: 'john-exp-1',
        description: 'Health Insurance',
        amount: 4500,
        date: '2026-06-10',
        category: 'healthcare',
        isRecurring: false
      }
    ],
    investments: [
      {
        id: 'john-inv-1',
        name: 'Fixed Deposit',
        type: 'lump-sum',
        startDate: '2024-03-01',
        amount: 50000,
        rate: 7.5,
        compounding: '12',
        duration: 5
      }
    ]
  },
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    expenses: [],
    investments: []
  }
];