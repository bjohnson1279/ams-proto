const fs = require('fs');
['src/services/certificate.service.ts', 'src/controllers/certificate.controller.ts', 'src/services/ams.service.ts'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  // Replace `\${` with `${`
  c = c.split('\\${').join('${');
  fs.writeFileSync(f, c);
  console.log('Fixed', f);
});
