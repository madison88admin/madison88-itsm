/**
 * Check User Activity System Setup
 * Verifies database table and migration status
 */

const fs = require('fs');
const path = require('path');

console.log('\n📋 USER ACTIVITY SYSTEM VERIFICATION\n');
console.log('=' .repeat(50));

// Check 1: Migration file exists
const migrationFile = path.join(__dirname, '../database/migrations/2026-02-24_user_activity_logs.sql');
if (fs.existsSync(migrationFile)) {
  console.log('\n✓ Migration file exists:');
  console.log(`  ${migrationFile}`);
  
  const content = fs.readFileSync(migrationFile, 'utf8');
  const hasTable = content.includes('CREATE TABLE IF NOT EXISTS user_activity_logs');
  const hasViews = content.includes('CREATE OR REPLACE VIEW');
  const hasIndexes = content.includes('CREATE INDEX');
  
  console.log(`  - Table definition: ${hasTable ? '✓' : '✗'}`);
  console.log(`  - Views: ${hasViews ? '✓' : '✗'}`);
  console.log(`  - Indexes: ${hasIndexes ? '✓' : '✗'}`);
} else {
  console.log('\n✗ Migration file not found!');
}

// Check 2: Service file
const serviceFile = path.join(__dirname, './src/services/user-activity.service.js');
if (fs.existsSync(serviceFile)) {
  console.log('\n✓ Service file exists:');
  console.log(`  ${serviceFile}`);
  const content = fs.readFileSync(serviceFile, 'utf8');
  const methods = ['logLogin', 'logLogout', 'getActiveUsers', 'getAllActivityLogs'];
  methods.forEach(m => {
    const has = content.includes(`async ${m}`);
    console.log(`  - Method ${m}: ${has ? '✓' : '✗'}`);
  });
} else {
  console.log('\n✗ Service file not found!');
}

// Check 3: Controller file
const controllerFile = path.join(__dirname, './src/controllers/user-activity.controller.js');
if (fs.existsSync(controllerFile)) {
  console.log('\n✓ Controller file exists:');
  console.log(`  ${controllerFile}`);
  const content = fs.readFileSync(controllerFile, 'utf8');
  const endpoints = ['getActiveUsers', 'getActivityLogs', 'getActivityStats'];
  endpoints.forEach(e => {
    const has = content.includes(`async ${e}`);
    console.log(`  - Endpoint ${e}: ${has ? '✓' : '✗'}`);
  });
} else {
  console.log('\n✗ Controller file not found!');
}

// Check 4: Routes file
const routesFile = path.join(__dirname, './src/routes/user-activity.routes.js');
if (fs.existsSync(routesFile)) {
  console.log('\n✓ Routes file exists:');
  console.log(`  ${routesFile}`);
  const content = fs.readFileSync(routesFile, 'utf8');
  const routes = ['/active-users', '/activity-logs', '/activity-stats'];
  routes.forEach(r => {
    const has = content.includes(r);
    console.log(`  - Route ${r}: ${has ? '✓' : '✗'}`);
  });
} else {
  console.log('\n✗ Routes file not found!');
}

// Check 5: Auth integration
const authFile = path.join(__dirname, './src/controllers/auth.controller.js');
if (fs.existsSync(authFile)) {
  console.log('\n✓ Auth integration:');
  const content = fs.readFileSync(authFile, 'utf8');
  const loginLogging = content.includes('UserActivityService.logLogin');
  const logoutLogging = content.includes('UserActivityService.logLogout');
  console.log(`  - Login logging: ${loginLogging ? '✓' : '✗'}`);
  console.log(`  - Logout logging: ${logoutLogging ? '✓' : '✗'}`);
} else {
  console.log('\n✗ Auth controller not found!');
}

// Check 6: App.js registration
const appFile = path.join(__dirname, './src/app.js');
if (fs.existsSync(appFile)) {
  console.log('\n✓ App.js registration:');
  const content = fs.readFileSync(appFile, 'utf8');
  const routeRegistered = content.includes("require('./routes/user-activity.routes')");
  console.log(`  - Routes registered: ${routeRegistered ? '✓' : '✗'}`);
} else {
  console.log('\n✗ App.js not found!');
}

// Check 7: Frontend integration
const frontendFile = path.join(__dirname, '../frontend/src/pages/AdminUsersPage.jsx');
if (fs.existsSync(frontendFile)) {
  console.log('\n✓ Frontend integration:');
  const content = fs.readFileSync(frontendFile, 'utf8');
  const activeUsersCall = content.includes('/admin/active-users');
  const activityDisplay = content.includes('isActive');
  console.log(`  - Active users API call: ${activeUsersCall ? '✓' : '✗'}`);
  console.log(`  - Activity display: ${activityDisplay ? '✓' : '✗'}`);
} else {
  console.log('\n✗ AdminUsersPage.jsx not found!');
}

console.log('\n' + '='.repeat(50));
console.log('\n📌 NEXT STEPS:');
console.log('1. Run migrations: npm run migrate');
console.log('2. Start backend:  npm start');
console.log('3. Login to app and check User Management page');
console.log('4. Verify "Currently Active" counter updates in real-time');
console.log('\n');
