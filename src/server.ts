import app from './app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 AMS Prototype Engine running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API Endpoints: http://localhost:${PORT}/api/v1/customers`);
  console.log(`📄 ACORD Dec Page: http://localhost:${PORT}/api/v1/policies/POL-CA-2026-001/dec-page`);
  console.log(`🔄 Legacy Import: POST http://localhost:${PORT}/api/v1/integration/import`);
  console.log(`=======================================================`);
});
