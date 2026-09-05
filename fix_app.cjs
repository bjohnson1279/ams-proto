const fs = require('fs');

let content = fs.readFileSync('src/app.ts', 'utf8');

// Replace the cors conflict manually
const corsReplacement = `// 🛡️ Sentinel: Restrict CORS origin to prevent unauthorized cross-origin requests
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));`;

content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\s*app\.use\(cors\(\{[\s\S]*?\}\)\);\s*>>>>>>> origin\/main/m, corsReplacement);

fs.writeFileSync('src/app.ts', content);


let accContent = fs.readFileSync('src/services/accounting.service.ts', 'utf8');

const accReplacement = `  public getFinancialSummary(): FinancialSummary {
    let totalDebits = 0;
    let totalCredits = 0;

    const trialBalance = this.accounts.map(acct => {
      let debitBalance = 0;
      let creditBalance = 0;

      if (acct.normalBalance === 'Debit') {
        debitBalance = Math.max(0, acct.currentBalance);
        creditBalance = acct.currentBalance < 0 ? Math.abs(acct.currentBalance) : 0;
      } else {
        creditBalance = Math.max(0, acct.currentBalance);
        debitBalance = acct.currentBalance < 0 ? Math.abs(acct.currentBalance) : 0;
      }

      totalDebits += debitBalance;
      totalCredits += creditBalance;

      return {
        accountNumber: acct.accountNumber,
        accountName: acct.accountName,
        category: acct.category,
        debitBalance: Math.round(debitBalance * 100) / 100,
        creditBalance: Math.round(creditBalance * 100) / 100
      };
    });

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    // ⚡ Bolt: Replaced multiple distinct .find() lookups with a single for...of loop to prevent redundant O(N) array scans.
    // Preserves .find() behavior by breaking early when all targets are matched.
    let arAcct, apAcct, opCashAcct, trustCashAcct, revAcct;
    let foundCount = 0;
    for (const acct of this.accounts) {
      if (!arAcct && acct.accountNumber === '1200') { arAcct = acct; foundCount++; }
      else if (!apAcct && acct.accountNumber === '2000') { apAcct = acct; foundCount++; }
      else if (!opCashAcct && acct.accountNumber === '1000') { opCashAcct = acct; foundCount++; }
      else if (!trustCashAcct && acct.accountNumber === '1010') { trustCashAcct = acct; foundCount++; }
      else if (!revAcct && acct.accountNumber === '4000') { revAcct = acct; foundCount++; }

      if (foundCount === 5) break;
    }

    return {
      trialBalance,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      isBalanced,
      metrics: {
        totalAccountsReceivable: arAcct ? arAcct.currentBalance : 0,
        totalCarrierPayables: apAcct ? apAcct.currentBalance : 0,
        operatingCashBalance: opCashAcct ? opCashAcct.currentBalance : 0,
        trustCashBalance: trustCashAcct ? trustCashAcct.currentBalance : 0,
        ytdCommissionRevenue: revAcct ? revAcct.currentBalance : 0
      }
    };
  }`;

accContent = accContent.replace(/<<<<<<< HEAD[\s\S]*?=======\s*public async getFinancialSummary\(tenantId: string\): Promise<FinancialSummary> \{\s*return this\.repos\.accounting\.getFinancialSummary\(tenantId\);\s*>>>>>>> origin\/main/m, accReplacement);

fs.writeFileSync('src/services/accounting.service.ts', accContent);
