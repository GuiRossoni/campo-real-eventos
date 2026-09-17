import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import { loadFallbackDb } from '../../src/config/database';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await loadFallbackDb();
  });

  describe('Health Check Endpoint', () => {
    it('GET /api/health returns status 200 and ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication Flow', () => {
    const testEmail = `aluno.teste.${Date.now()}@camporeal.edu.br`;
    const testPassword = 'SenhaSegura@2026';
    let userToken: string;

    it('POST /api/auth/register registers a new student and returns JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Aluno Teste Integração',
          email: testEmail,
          password: testPassword,
          course: 'Engenharia de Software',
          period: '3º Período'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.user.role).toBe('PARTICIPANTE');
      expect(res.body.user.institution).toBe('Centro Universitário Campo Real');
      // Afirmação de segurança crucial: a senha NUNCA deve ser retornada
      expect(res.body.user.password).toBeUndefined();

      userToken = res.body.token;
    });

    it('POST /api/auth/register saves custom institution when provided', async () => {
      const customEmail = `aluno.custom.${Date.now()}@outro.edu.br`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Aluno de Outra Instituição',
          email: customEmail,
          password: testPassword,
          course: 'Sistemas de Informação',
          institution: 'UTFPR'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.institution).toBe('UTFPR');
    });

    it('POST /api/auth/login authenticates with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.user.password).toBeUndefined();
    });

    it('POST /api/auth/login rejects incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'SenhaCompletamenteIncorreta'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('GET /api/auth/me returns current user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.user.password).toBeUndefined();
    });

    it('GET /api/auth/me rejects requests without token with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Database State Sanitization Check', () => {
    it('GET /api/db/get-state returns state WITHOUT any user passwords', async () => {
      const res = await request(app).get('/api/db/get-state');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const users = res.body.data.users;
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      // Garante que absolutamente nenhum usuário no payload de estado exponha a senha
      for (const u of users) {
        expect(u.password).toBeUndefined();
      }

      // Garante que os usuários possuam a instituição preenchida
      const userWithInst = users.find((u: any) => u.institution);
      expect(userWithInst).toBeDefined();
    });
  });

  describe('Public Endpoints', () => {
    it('GET /api/events returns event list', async () => {
      const res = await request(app).get('/api/events');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/banners returns banner list', async () => {
      const res = await request(app).get('/api/banners');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
