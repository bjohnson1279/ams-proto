import app from './app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AMS Prototype Engine running on port ${PORT}`);
});
