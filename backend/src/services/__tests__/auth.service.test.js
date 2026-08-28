jest.mock('../../models/user.model', () => ({
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateLastLogin: jest.fn(),
}));

jest.mock('../notification.service', () => ({
  sendWelcomeNotice: jest.fn().mockResolvedValue(undefined),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../../models/user.model');
const NotificationService = require('../notification.service');
const AuthService = require('../auth.service');

describe('AuthService behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers an end user and hashes the password', async () => {
    UserModel.findByEmail.mockResolvedValue(null);
    UserModel.create.mockResolvedValue({
      user_id: 'user-1',
      email: 'user@example.com',
      role: 'end_user',
    });

    const result = await AuthService.register({
      email: 'user@example.com',
      name: 'Test User',
      password: 'Password123!',
      role: 'end_user',
    });

    expect(UserModel.create).toHaveBeenCalledTimes(1);
    const createPayload = UserModel.create.mock.calls[0][0];
    expect(createPayload.email).toBe('user@example.com');
    expect(createPayload.passwordHash).not.toBe('Password123!');
    await expect(bcrypt.compare('Password123!', createPayload.passwordHash)).resolves.toBe(true);
    expect(result.role).toBe('end_user');
    expect(NotificationService.sendWelcomeNotice).toHaveBeenCalled();
  });

  test('rejects duplicate email registration', async () => {
    UserModel.findByEmail.mockResolvedValue({ user_id: 'existing' });

    await expect(AuthService.register({
      email: 'existing@example.com',
      name: 'Existing User',
      password: 'Password123!',
    })).rejects.toThrow('Email already registered');

    expect(UserModel.create).not.toHaveBeenCalled();
  });

  test('logs in with valid credentials and returns a verifiable JWT', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    UserModel.findByEmail.mockResolvedValue({
      user_id: 'user-1',
      email: 'user@example.com',
      role: 'end_user',
      is_active: true,
      password_hash: passwordHash,
    });

    const result = await AuthService.login({
      email: 'user@example.com',
      password: 'Password123!',
    });

    expect(result.token).toEqual(expect.any(String));
    expect(jwt.verify(result.token, process.env.JWT_SECRET || 'changeme')).toMatchObject({
      user_id: 'user-1',
      email: 'user@example.com',
      role: 'end_user',
    });
    expect(UserModel.updateLastLogin).toHaveBeenCalledWith('user-1');
  });

  test('rejects inactive users and invalid passwords', async () => {
    UserModel.findByEmail.mockResolvedValue({
      user_id: 'user-1',
      email: 'user@example.com',
      is_active: false,
      password_hash: await bcrypt.hash('Password123!', 10),
    });
    await expect(AuthService.login({ email: 'user@example.com', password: 'Password123!' }))
      .rejects.toThrow('Account is inactive');

    UserModel.findByEmail.mockResolvedValue({
      user_id: 'user-1',
      email: 'user@example.com',
      is_active: true,
      password_hash: await bcrypt.hash('Password123!', 10),
    });
    await expect(AuthService.login({ email: 'user@example.com', password: 'WrongPassword!' }))
      .rejects.toThrow('Invalid email or password');
  });
});
