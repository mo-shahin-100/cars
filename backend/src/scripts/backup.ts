import path from 'path';
import fs from 'fs';
import db from '../database/db';

async function runCliBackup() {
  const backupDir = path.join(__dirname, '../../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `cli_backup_${timestamp}.db`;
  const backupFilePath = path.join(backupDir, backupFilename);

  console.log(`Starting online backup to: ${backupFilePath}...`);
  await (db as any).backup(backupFilePath);
  console.log('Online backup completed successfully!');
  process.exit(0);
}

runCliBackup().catch(err => {
  console.error('Backup error:', err);
  process.exit(1);
});
