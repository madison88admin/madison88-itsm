describe('database schema isolation', () => {
  test('configures PostgreSQL search_path with m88_itsm before public', () => {
    jest.resetModules();
    const mockPool = jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      query: jest.fn().mockResolvedValue({ rows: [{ schema: 'm88_itsm' }] }),
      end: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ schema: 'm88_itsm' }] }),
        release: jest.fn(),
      }),
    }));
    jest.mock('pg', () => ({ Pool: mockPool }));
    jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
    process.env.DB_SCHEMA = 'm88_itsm';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/postgres';

    require('../database');

    expect(mockPool).toHaveBeenCalledWith(expect.objectContaining({
      options: '-c search_path=m88_itsm,public',
    }));
  });

  test('rejects unsafe schema identifiers', () => {
    jest.resetModules();
    jest.mock('pg', () => ({ Pool: jest.fn() }));
    jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
    process.env.DB_SCHEMA = 'm88_itsm; DROP SCHEMA public';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/postgres';

    expect(() => require('../database')).toThrow('DB_SCHEMA must be a valid PostgreSQL schema identifier');
    delete process.env.DB_SCHEMA;
  });
});
