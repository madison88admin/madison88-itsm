jest.mock('../../models/user.model', () => ({
  findById: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const UserModel = require('../../models/user.model');
const { authenticate, authorize } = require('../auth.middleware');

const response = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authentication and authorization behavior', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects requests without a bearer token', async () => {
    const req = { headers: {}, query: {} };
    const res = response();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Missing token' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects tokens with an invalid user id format before querying the database', async () => {
    const token = jwt.sign({ user_id: 'not-a-uuid' }, process.env.JWT_SECRET || 'changeme');
    const req = { headers: { authorization: `Bearer ${token}` }, query: {} };
    const res = response();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid user ID format' }));
    expect(UserModel.findById).not.toHaveBeenCalled();
  });

  test('authenticates an active user with a valid JWT', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const token = jwt.sign({ user_id: userId }, process.env.JWT_SECRET || 'changeme');
    const user = { user_id: userId, role: 'end_user', is_active: true };
    UserModel.findById.mockResolvedValue(user);
    const req = { headers: { authorization: `Bearer ${token}` }, query: {} };
    const res = response();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user).toEqual(user);
    expect(UserModel.findById).toHaveBeenCalledWith(userId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('allows system admins through every role guard', () => {
    const req = { user: { role: 'system_admin' } };
    const res = response();
    const next = jest.fn();

    authorize(['it_agent'])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('blocks users outside the allowed roles', () => {
    const req = { user: { role: 'end_user' } };
    const res = response();
    const next = jest.fn();

    authorize(['it_agent', 'it_manager'])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
