const fs = require('fs');
['src/services/certificate.service.ts', 'src/controllers/certificate.controller.ts', 'src/services/ams.service.ts'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  // Match a literal backslash followed by a backtick
  c = c.replace(/\\`/g, '`');
  fs.writeFileSync(f, c);
  console.log('Fixed', f);
});
