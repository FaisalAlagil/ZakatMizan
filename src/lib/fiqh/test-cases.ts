import type { Asset, Liability, Madhhab, Transaction } from '@/lib/types'

export type HackathonTestCase = {
  id: string
  title: string
  subtitle: string
  category: string
  description: string
  assets: Asset[]
  liabilities: Liability[]
  transactions: Transaction[]
  hawlStartDate: string
  dippedBelowNisab: boolean
  keyTakeaway: string
}

export const HACKATHON_TEST_CASES: Record<string, HackathonTestCase> = {
  case1: {
    id: 'case1',
    title: 'Test Case 1: Salaried Professional & Screened Equities',
    subtitle: 'Halal salary, cash savings, gold jewelry, and deductible short-term debts',
    category: 'Standard Professional',
    description:
      'A software engineer earning an annual salary from a permissible tech company, holding cash savings, gold jewelry, Shariah-screened equities, and short-term credit card/car debts.',
    assets: [
      { id: 'tc1-cash', kind: 'cash', label: 'Chequing & Savings Cash', amount: 12000, currency: 'CAD' },
      { id: 'tc1-gold', kind: 'personal_jewelry', label: 'Personal Gold Jewelry', amount: 45 },
      { id: 'tc1-stocks', kind: 'investment', label: 'Shariah-Screened Equities (SPUS)', amount: 8000, currency: 'CAD' },
    ],
    liabilities: [
      { id: 'tc1-debt', label: 'Car loan instalments due this year', amount: 2500, dueWithinYear: 2500, currency: 'CAD' },
    ],
    transactions: [
      {
        id: 'tc1-salary',
        date: '2025-06-15',
        description: 'Tech Corp Payroll Salary',
        amount: 65000,
        currency: 'CAD',
        verdict: 'HALAL',
        sourceType: 'employment',
        basis: 'Wages from permissible technology work are lawful.',
        classifiedBy: 'rule',
      },
      {
        id: 'tc1-div',
        date: '2025-09-20',
        description: 'SPUS Halal ETF Quarterly Dividend',
        amount: 320,
        currency: 'CAD',
        verdict: 'HALAL',
        sourceType: 'investment',
        basis: 'Screened Shariah-compliant fund dividends are permissible earnings.',
        classifiedBy: 'rule',
      },
    ],
    hawlStartDate: '2025-01-01',
    dippedBelowNisab: false,
    keyTakeaway:
      'Demonstrates clean separation between annual income and zakatable wealth. Shows school-specific differences in gold jewelry (zakatable in Hanafi, exempt in majority) and debt deductions.',
  },

  case2: {
    id: 'case2',
    title: 'Test Case 2: Mixed Income, Dividend Purification & Bank Interest',
    subtitle: 'Freelancing, conventional index dividend (mixed), and interest (riba) disposal',
    category: 'Mixed Income & Purification',
    description:
      'A freelance consultant receiving client fees, dividend payouts from a conventional S&P 500 index fund (requiring 5% purification), and automated bank chequing interest.',
    assets: [
      { id: 'tc2-cash', kind: 'cash', label: 'Bank Chequing Balance', amount: 9500, currency: 'CAD' },
      { id: 'tc2-inventory', kind: 'business_inventory', label: 'Freelance Design Asset Stock', amount: 4000, currency: 'CAD', traderType: 'mudir' },
    ],
    liabilities: [
      { id: 'tc2-debt', label: 'Freelance equipment lease due this year', amount: 1000, dueWithinYear: 1000, currency: 'CAD' },
    ],
    transactions: [
      {
        id: 'tc2-freelance',
        date: '2025-04-10',
        description: 'UI/UX Design Client Invoices',
        amount: 15000,
        currency: 'CAD',
        verdict: 'HALAL',
        sourceType: 'business',
        basis: 'Proceeds of permissible design services are lawful trade.',
        classifiedBy: 'rule',
      },
      {
        id: 'tc2-etf',
        date: '2025-07-15',
        description: 'Vanguard S&P 500 Index Dividend',
        amount: 1200,
        currency: 'CAD',
        verdict: 'MIXED',
        sourceType: 'investment',
        haramRatio: 0.05,
        haramRatioIsEstimate: false,
        mixedTreatment: 'disposed',
        basis: 'Conventional broad-market funds contain non-compliant revenue. 5% ($60 CAD) must be separated and purified.',
        classifiedBy: 'rule',
      },
      {
        id: 'tc2-interest',
        date: '2025-11-30',
        description: 'Bank High-Interest Savings Account APY Return',
        amount: 350,
        currency: 'CAD',
        verdict: 'HARAM',
        sourceType: 'interest',
        basis: 'Fixed return on bank balances is riba. 100% ($350 CAD) is excluded from zakat and must be given away in charity.',
        classifiedBy: 'rule',
      },
    ],
    hawlStartDate: '2025-01-01',
    dippedBelowNisab: false,
    keyTakeaway:
      'Highlights the exact hackathon rule: $410 CAD total purification ($350 riba + $60 mixed portion) is separated from halal wealth. Removing haram income does NOT count as paying zakat.',
  },

  case3: {
    id: 'case3',
    title: 'Test Case 3: Merchant & Trade Inventory with Hawl Continuity & Debt',
    subtitle: 'Trade goods for resale, expected receivables, broken hawl dip, and debt treatment',
    category: 'Commercial & Edge Cases',
    description:
      'A small retail merchant holding retail stock for sale, expecting a receivable repayment, with significant debt obligations and a wealth dip below Nisab mid-year.',
    assets: [
      { id: 'tc3-cash', kind: 'cash', label: 'Commercial Operating Cash', amount: 6000, currency: 'CAD' },
      { id: 'tc3-stock', kind: 'business_inventory', label: 'Merchandise Inventory for Resale', amount: 18000, currency: 'CAD', traderType: 'mudir' },
      { id: 'tc3-rec', kind: 'receivable', label: 'Expected Client Invoice Payment', amount: 3000, currency: 'CAD' },
    ],
    liabilities: [
      { id: 'tc3-debt', label: 'Commercial Supplier Balance & Operating Debt', amount: 5000, dueWithinYear: 5000, currency: 'CAD' },
    ],
    transactions: [
      {
        id: 'tc3-sales',
        date: '2025-05-12',
        description: 'Retail Store Halal Goods Sales',
        amount: 40000,
        currency: 'CAD',
        verdict: 'HALAL',
        sourceType: 'business',
        basis: 'Proceeds of permissible retail commerce are lawful.',
        classifiedBy: 'rule',
      },
    ],
    hawlStartDate: '2025-01-01',
    dippedBelowNisab: true,
    keyTakeaway:
      'Demonstrates the critical difference in holding period (Hawl): Hanafi ignores mid-year dips as long as Nisab is held at year endpoints, while Maliki, Shafi\'i, and Hanbali reset the Hawl upon dipping.',
  },
}
