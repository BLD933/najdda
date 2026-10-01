require('dotenv').config();
const app = require('./app');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('generate-with') || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET manquant ou trop faible (>=32 chars). Générez avec: openssl rand -hex 32');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
