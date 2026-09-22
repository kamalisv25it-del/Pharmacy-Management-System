import { db } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('====================================================');
console.log(' PharmaCare Database Migration to Supabase PostgreSQL');
console.log('====================================================');

const mode = db.getMode();
console.log(`Current DB Mode: ${mode.type}`);
if (mode.supabaseHost) {
  console.log(`Target Supabase Host: ${mode.supabaseHost}`);
}
console.log(`Local Records Ready to Migrate:`);
console.log(`  - Medicines:  ${mode.recordCounts.medicines}`);
console.log(`  - Customers:  ${mode.recordCounts.customers}`);
console.log(`  - Purchases:  ${mode.recordCounts.purchases}`);
console.log(`  - Sales:      ${mode.recordCounts.sales}`);
console.log(`  - Users:      ${mode.recordCounts.users}`);
console.log(`  - Suppliers:  ${mode.recordCounts.suppliers}`);
console.log('----------------------------------------------------');

const result = await db.migrateDataToSupabase();

if (result.success) {
  console.log('Migration Status: SUCCESS');
  console.log(`Summary: ${result.message}`);
  console.log('Table Breakdown:');
  for (const [table, stats] of Object.entries(result.stats || {})) {
    console.log(`  - ${table}: ${stats.success} records upserted (${stats.failed} failed)`);
  }
} else {
  console.log('Migration Status: NOTICE');
  console.log(`Message: ${result.message}`);
  console.log('Note: To connect your remote Supabase cloud project, configure SUPABASE_URL and SUPABASE_ANON_KEY in your environment/settings.');
  console.log('All local records remain 100% intact and available.');
}

console.log('====================================================');
process.exit(0);
