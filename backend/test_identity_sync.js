const AuthService = require('./src/services/auth.service');
const UserModel = require('./src/models/user.model');
const db = require('./src/config/database');

// Mocking UserModel and db
jest.mock('./src/models/user.model');
jest.mock('./src/config/database');

describe('AuthService Identity Sync Verification', () => {
    const mockAuth0User = {
        email: 'test@example.com',
        name: 'Test User New',
        sub: 'auth0|12345'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should link by AUTH0_ID even if email changed', async () => {
        const existingUser = {
            user_id: 'uuid-1',
            email: 'old@example.com',
            full_name: 'Old Name',
            auth0_id: 'auth0|12345',
            is_active: true,
            role: 'end_user'
        };

        UserModel.findByAuth0Id.mockResolvedValue(existingUser);
        UserModel.updateUser.mockResolvedValue({ ...existingUser, email: mockAuth0User.email, full_name: mockAuth0User.name });
        UserModel.updateLastLogin.mockResolvedValue();

        const result = await AuthService.loginWithAuth0(mockAuth0User);

        expect(UserModel.findByAuth0Id).toHaveBeenCalledWith('auth0|12345');
        expect(UserModel.updateUser).toHaveBeenCalledWith('uuid-1', expect.objectContaining({
            email: 'test@example.com',
            full_name: 'Test User New'
        }));
        expect(result.user.email).toBe('test@example.com');
    });

    it('should link by email and update AUTH0_ID if missing', async () => {
        const existingUser = {
            user_id: 'uuid-2',
            email: 'test@example.com',
            full_name: 'Test User',
            auth0_id: null,
            is_active: true,
            role: 'end_user'
        };

        UserModel.findByAuth0Id.mockResolvedValue(null);
        UserModel.findByEmail.mockResolvedValue(existingUser);
        UserModel.updateUser.mockResolvedValue({ ...existingUser, auth0_id: 'auth0|12345' });
        UserModel.updateLastLogin.mockResolvedValue();

        await AuthService.loginWithAuth0(mockAuth0User);

        expect(UserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
        expect(UserModel.updateUser).toHaveBeenCalledWith('uuid-2', expect.objectContaining({
            auth0_id: 'auth0|12345'
        }));
    });
});
