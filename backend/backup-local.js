require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function backupDatabase() {
  const backupDir = path.join(__dirname, 'backups');
  
  // Criar pasta backups se não existir
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const date = new Date().toISOString().split('T')[0];
  const backupFile = path.join(backupDir, `backup_${date}.sql`);
  
  const command = `pg_dump "${process.env.DATABASE_URL}" > "${backupFile}"`;

  console.log('🔄 Iniciando backup do banco de dados...');

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Erro ao fazer backup:', error.message);
      return;
    }

    if (stderr) {
      console.log('⚠️ Avisos:', stderr);
    }

    console.log(`✅ Backup criado com sucesso: ${backupFile}`);
    console.log(`📦 Tamanho: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
  });
}

backupDatabase();