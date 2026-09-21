

import { prisma } from '../prisma.js';

const defaultBanks = [
  // Commercial Banks
  { name: 'Access Bank', code: '044', type: 'COMMERCIAL' },
  { name: 'Citibank Nigeria', code: '023', type: 'COMMERCIAL' },
  { name: 'Ecobank Nigeria', code: '050', type: 'COMMERCIAL' },
  { name: 'Fidelity Bank', code: '070', type: 'COMMERCIAL' },
  { name: 'First Bank of Nigeria', code: '011', type: 'COMMERCIAL' },
  { name: 'First City Monument Bank (FCMB)', code: '214', type: 'COMMERCIAL' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', type: 'COMMERCIAL' },
  { name: 'Heritage Bank', code: '030', type: 'COMMERCIAL' },
  { name: 'Keystone Bank', code: '082', type: 'COMMERCIAL' },
  { name: 'Optimus Bank', code: '107', type: 'COMMERCIAL' },
  { name: 'Polaris Bank', code: '076', type: 'COMMERCIAL' },
  { name: 'PremiumTrust Bank', code: '105', type: 'COMMERCIAL' },
  { name: 'Providus Bank', code: '101', type: 'COMMERCIAL' },
  { name: 'Stanbic IBTC Bank', code: '215', type: 'COMMERCIAL' },
  { name: 'Standard Chartered Bank', code: '022', type: 'COMMERCIAL' },
  { name: 'Sterling Bank', code: '232', type: 'COMMERCIAL' },
  { name: 'SunTrust Bank', code: '100', type: 'COMMERCIAL' },
  { name: 'Union Bank of Nigeria', code: '032', type: 'COMMERCIAL' },
  { name: 'United Bank for Africa (UBA)', code: '033', type: 'COMMERCIAL' },
  { name: 'Unity Bank', code: '215', type: 'COMMERCIAL' },
  { name: 'Wema Bank', code: '035', type: 'COMMERCIAL' },
  { name: 'Zenith Bank', code: '057', type: 'COMMERCIAL' },

  // Microfinance Banks
  { name: 'Moniepoint Microfinance Bank', code: '50515', type: 'MICROFINANCE' },
  { name: 'OPay Digital Services (MFB)', code: '999992', type: 'MICROFINANCE' },
  { name: 'PalmPay (MFB)', code: '999991', type: 'MICROFINANCE' },
  { name: 'Kuda Microfinance Bank', code: '090267', type: 'MICROFINANCE' },
  { name: 'Carbon Microfinance Bank', code: '090551', type: 'MICROFINANCE' },
  { name: 'VFD Microfinance Bank', code: '090110', type: 'MICROFINANCE' },
  { name: 'FairMoney Microfinance Bank', code: '090552', type: 'MICROFINANCE' },
  { name: 'Rubies Microfinance Bank', code: '090175', type: 'MICROFINANCE' },
  { name: 'Mainland Microfinance Bank', code: '090325', type: 'MICROFINANCE' },

  // Mortgage Banks
  { name: 'Abbey Mortgage Bank', code: '070010', type: 'MORTGAGE' },
  { name: 'Gateway Mortgage Bank', code: '070009', type: 'MORTGAGE' },
  { name: 'Imperial Homes Mortgage Bank', code: '070016', type: 'MORTGAGE' },
  { name: 'TrustBond Mortgage Bank', code: '070007', type: 'MORTGAGE' },
  { name: 'Lagos Building Investment Company (LBIC)', code: '070012', type: 'MORTGAGE' },
];

export async function prepopulateBanks() {
  try {
    const existingCount = await prisma.bank.count();
    if (existingCount > 0) {
      console.log(`[setupBanks] Database already has ${existingCount} banks populated.`);
      return;
    }

    console.log(`[setupBanks] Prepopulating ${defaultBanks.length} default Nigerian banks...`);
    for (const bank of defaultBanks) {
      await prisma.bank.upsert({
        where: { name: bank.name },
        update: {},
        create: bank,
      });
    }
    console.log('[setupBanks] Prepopulation complete.');
  } catch (error) {
    console.error('[setupBanks] Error prepopulating banks:', error);
  }
}
