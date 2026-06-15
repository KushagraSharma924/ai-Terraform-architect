import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * Auth E2E Test Suite
 *
 * Requires a running Postgres + Redis instance.
 * Set DATABASE_URL and REDIS_URL environment variables before running.
 *
 * Run: npm run test:e2e
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test1234!';
  const testFullName = 'Test User';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Register ────────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword, fullName: testFullName })
        .expect(201);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.message).toContain('Verification email sent');
      // Never return password hash
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject duplicate email with 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword, fullName: testFullName })
        .expect(409);

      expect(res.body.error).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject weak password with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'other@example.com', password: 'weak', fullName: 'Other User' })
        .expect(400);
    });
  });

  // ─── Login (before verification) ─────────────────────────────────────────────

  describe('POST /auth/login - unverified', () => {
    it('should return 403 EMAIL_NOT_VERIFIED if email not yet verified', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(403);

      expect(res.body.error).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  // ─── Refresh / Logout (with pre-seeded verified user via direct DB) ───────────
  // Note: Full flow tested after manual email verify; below is basic auth flow

  describe('POST /auth/refresh', () => {
    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token-value' })
        .expect(401);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should always return 200 (no email enumeration)', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should return 400 for invalid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(res.body.error).toBe('INVALID_OR_EXPIRED_TOKEN');
    });
  });

  describe('GET /auth/me - unauthenticated', () => {
    it('should return 401', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('POST /auth/internal/validate-token', () => {
    it('should return { valid: false } with wrong API key', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/internal/validate-token')
        .set('x-internal-api-key', 'wrong-key')
        .send({ token: 'any-token' })
        .expect(200);

      expect(res.body.valid).toBe(false);
    });
  });
});
