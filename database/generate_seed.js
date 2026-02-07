// Generate SQL seed file with bcrypt hashed passwords
const fs = require('fs');
const path = require('path');
const bcrypt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'bcryptjs'));

async function generateSeedSQL() {
  const users = [
    {
      email: 'adminmadison88@gmail.com',
      first_name: 'Admin',
      last_name: 'User',
      full_name: 'Admin User',
      password: 'admin123',
      role: 'system_admin',
      department: 'IT',
      location: 'Philippines',
      phone: '+63-900-000-0000',
    },
    {
      email: 'itmadison88@gmail.com',
      first_name: 'IT',
      last_name: 'Agent',
      full_name: 'IT Agent',
      password: 'it123',
      role: 'it_agent',
      department: 'IT',
      location: 'US',
      phone: '+1-555-000-0000',
    },
    {
      email: 'manager88@gmail.com',
      first_name: 'IT',
      last_name: 'Manager',
      full_name: 'IT Manager',
      password: 'manager123',
      role: 'it_manager',
      department: 'IT',
      location: 'Indonesia',
      phone: '+62-800-000-0000',
    },
    {
      email: 'usermadison88@gmail.com',
      first_name: 'End',
      last_name: 'User',
      full_name: 'End User',
      password: 'user123',
      role: 'end_user',
      department: 'HR',
      location: 'Philippines',
      phone: '+63-900-111-1111',
    },
  ];

  let sql = `-- Seed example users for Madison88 ITSM
-- Generated on ${new Date().toISOString()}
-- Passwords are bcrypt hashed (salt rounds: 10)

INSERT INTO users (email, password_hash, first_name, last_name, full_name, role, department, location, phone, is_active, created_at) VALUES\n`;

  const values = [];
  
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    values.push(`('${user.email}', '${hashedPassword}', '${user.first_name}', '${user.last_name}', '${user.full_name}', '${user.role}', '${user.department}', '${user.location}', '${user.phone}', true, NOW())`);
  }

  sql += values.join(',\n');
  sql += '\nON CONFLICT (email) DO UPDATE SET\n';
  sql += '  password_hash = EXCLUDED.password_hash,\n';
  sql += '  first_name = EXCLUDED.first_name,\n';
  sql += '  last_name = EXCLUDED.last_name,\n';
  sql += '  full_name = EXCLUDED.full_name,\n';
  sql += '  role = EXCLUDED.role,\n';
  sql += '  department = EXCLUDED.department,\n';
  sql += '  location = EXCLUDED.location,\n';
  sql += '  phone = EXCLUDED.phone,\n';
  sql += '  is_active = EXCLUDED.is_active,\n';
  sql += '  updated_at = NOW();\n';

  const outputPath = path.join(__dirname, 'seed_users.sql');
  fs.writeFileSync(outputPath, sql);
  console.log(`SQL seed file generated: ${outputPath}`);
  console.log('\nYou can now upload this file to Supabase SQL Editor');
}

generateSeedSQL().catch(console.error);
