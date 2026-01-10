require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('❌ ERRO CRÍTICO: JWT_SECRET não está definido no .env');
  console.error('Adicione JWT_SECRET no arquivo .env na raiz do projeto backend');
  process.exit(1);
}

module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: '8h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, // usa o mesmo se não tiver outro
  refreshExpiresIn: '7d'
};