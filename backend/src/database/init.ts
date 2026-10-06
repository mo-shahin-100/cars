import { seedDatabase } from './seed';

try {
  seedDatabase();
  console.log('Database initialization completed.');
  process.exit(0);
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exit(1);
}
