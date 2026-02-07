-- Seed example users for Madison88 ITSM
-- Generated on 2026-02-07T04:26:48.766Z
-- Passwords are bcrypt hashed (salt rounds: 10)

INSERT INTO users (email, password_hash, first_name, last_name, full_name, role, department, location, phone, is_active, created_at) VALUES
('adminmadison88@gmail.com', '$2a$10$9I1t7IbIQS7fqCBG7g5UYOGEZXDSCbW6Kzvs0SErqj2TQ01y6fK0i', 'Admin', 'User', 'Admin User', 'system_admin', 'IT', 'Philippines', '+63-900-000-0000', true, NOW()),
('itmadison88@gmail.com', '$2a$10$0L87itTZwJL.b4eUqdz9f.aDg.WmzfKFwaT.aCrlN6GAFl/XjI4Me', 'IT', 'Agent', 'IT Agent', 'it_agent', 'IT', 'US', '+1-555-000-0000', true, NOW()),
('manager88@gmail.com', '$2a$10$Cd208GOj6tbqaEk0BC5GwuspmrLzGaiAMVqYU/an91ky6P2LY02GK', 'IT', 'Manager', 'IT Manager', 'it_manager', 'IT', 'Indonesia', '+62-800-000-0000', true, NOW()),
('usermadison88@gmail.com', '$2a$10$AnJFse5cLoHYKt66zE8baOw8gmGWak/K4ZjPrLM7IYKh.NwfzQQeS', 'End', 'User', 'End User', 'end_user', 'HR', 'Philippines', '+63-900-111-1111', true, NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  location = EXCLUDED.location,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
