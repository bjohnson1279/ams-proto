const fs = require('fs');

const content = fs.readFileSync('public/index.html', 'utf8');

const emptyStates = [
    'No General Ledger entries found',
    'No agency bill invoices found',
    'No certificates found',
    'No certificate holders found',
    'No customers found'
];

emptyStates.forEach(state => {
    if (content.includes(state)) {
        console.log(`Found empty state: ${state}`);
    } else {
        console.log(`Missing empty state: ${state}`);
    }
});
