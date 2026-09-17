import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import { generateToken } from '../../src/modules/auth/auth.utils';
import { loadFallbackDb } from '../../src/config/database';

describe('Security & Access Control Tests (RBAC)', () => {
  let studentToken: string;
  let coordinatorToken: string;

  beforeAll(async () => {
    await loadFallbackDb();

    studentToken = generateToken({
      id: 'student_sec_1',
      name: 'Aluno Segurança',
      email: 'aluno.sec@camporeal.edu.br',
      role: 'PARTICIPANTE'
    });

    coordinatorToken = generateToken({
      id: 'coord_sec_1',
      name: 'Coordenador Geral',
      email: 'coord.sec@camporeal.edu.br',
      role: 'COORDENADOR'
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('should ignore requested ROOT role on self-registration and force PARTICIPANTE', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hacker Wannabe',
          email: `escalation.${Date.now()}@teste.com`,
          password: 'SenhaForte123!',
          role: 'ROOT' // Tentativa de escalonamento de privilégio
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('PARTICIPANTE');
      expect(res.body.user.role).not.toBe('ROOT');
    });

    it('should prevent PARTICIPANTE from deleting other users', async () => {
      const res = await request(app)
        .post('/api/db/write-user-delete')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ id: 'some_other_user' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prevent non-ROOT from deleting the system ROOT user', async () => {
      const res = await request(app)
        .post('/api/db/write-user-delete')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ id: 'user_root' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('ROOT');
    });
  });

  describe('Endpoint Authorization Protection', () => {
    it('POST /api/db/write-event-save rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/db/write-event-save')
        .send({ name: 'Evento Malicioso', startDate: '2026-10-10' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/db/write-event-save rejects PARTICIPANTE with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/db/write-event-save')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Evento Malicioso', startDate: '2026-10-10' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/db/write-event-delete rejects PARTICIPANTE with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/db/write-event-delete')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ id: 'event_1' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/smtp/test rejects unauthenticated calls with 401', async () => {
      const res = await request(app)
        .post('/api/smtp/test')
        .send({ smtpSettings: { host: 'smtp.test.com' } });

      expect(res.status).toBe(401);
    });

    it('POST /api/smtp/test rejects PARTICIPANTE with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/smtp/test')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ smtpSettings: { host: 'smtp.test.com' } });

      expect(res.status).toBe(403);
    });
  });

  describe('Upload Security Checks', () => {
    it('POST /api/uploads/banner rejects unauthenticated uploads with 401', async () => {
      const res = await request(app)
        .post('/api/uploads/banner')
        .send({ filename: 'teste.png', data: 'data:image/png;base64,AAAA' });

      expect(res.status).toBe(401);
    });

    it('POST /api/uploads/banner rejects invalid image magic bytes with 400', async () => {
      // PNG falso com conteúdo de texto em vez dos bytes mágicos reais de PNG (89 50 4E 47)
      const fakeBase64 = Buffer.from('Este é um arquivo executável disfarçado').toString('base64');

      const res = await request(app)
        .post('/api/uploads/banner')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          filename: 'malicioso.png',
          mimeType: 'image/png',
          data: `data:image/png;base64,${fakeBase64}`
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('assinatura binária inválida');
    });

    it('POST /api/uploads/banner accepts valid PNG image with proper magic bytes', async () => {
      // Binário PNG 1x1 mínimo válido com cabeçalho mágico [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...]
      const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const res = await request(app)
        .post('/api/uploads/banner')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          filename: 'valid_banner.png',
          mimeType: 'image/png',
          data: `data:image/png;base64,${validPngBase64}`
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toContain('/uploads/banners/');
    });
  });
});
