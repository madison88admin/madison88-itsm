// Script to register example users for ITSM
require('dotenv').config({ path: '../.env' });
const AuthService = require('../src/services/auth.service');
const db = require('../src/config/database');

async function main() {
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
  for (const user of users) {
    try {
      await AuthService.register(user);
      console.log(`Registered: ${user.email}`);
    } catch (err) {
      if (err.message.includes('already registered')) {
        console.log(`Already exists: ${user.email}`);
      } else {
        console.error(`Error for ${user.email}:`, err.message);
      }
    }
  }
  await db.end();
}

main();
