/**
 * Migration: Remove Example/Dummy Seed Users
 * Date: 2026-03-02
 * Purpose: Ensure demo accounts are not present in system data
 */

DELETE FROM users
WHERE email IN (
  'adminmadison88@gmail.com',
  'itmadison88@gmail.com',
  'manager88@gmail.com',
  'usermadison88@gmail.com'
);
