import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';

vi.mock('nodemailer', () => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'mocked-test-message-id' });
  const mockVerify = vi.fn().mockResolvedValue(true);
  return {
    default: {
      createTransport: vi.fn().mockReturnValue({
        sendMail: mockSendMail,
        verify: mockVerify,
        close: vi.fn()
      })
    },
    createTransport: vi.fn().mockReturnValue({
      sendMail: mockSendMail,
      verify: mockVerify,
      close: vi.fn()
    })
  };
});

import { app } from '../../src/server';
import { loadFallbackDb } from '../../src/config/database';
import { generateToken } from '../../src/modules/auth/auth.utils';
import { Voucher } from '../../src/@types/index';

describe('Vouchers and Global System Settings Persistence Tests', () => {
  let rootToken: string;
  let coordinatorToken: string;
  let studentToken: string;

  beforeAll(async () => {
    await loadFallbackDb();

    rootToken = generateToken({
      id: 'usr_root',
      email: 'root@camporeal.edu.br',
      name: 'Super Administrador Root',
      role: 'ROOT'
    });

    coordinatorToken = generateToken({
      id: 'usr_coord_1',
      email: 'coordenador@camporeal.edu.br',
      name: 'Prof. Coordenador',
      role: 'COORDENADOR'
    });

    studentToken = generateToken({
      id: 'usr_student_1',
      email: 'aluno@camporeal.edu.br',
      name: 'Aluno Teste',
      role: 'PARTICIPANTE'
    });
  });

  describe('Vouchers Persistence and Visibility', () => {
    const testVoucherCode = `test-softweek-${Date.now()}`;
    const testVoucher: Voucher = {
      id: `vouch_test_${Date.now()}`,
      code: testVoucherCode,
      prefix: 'softweek',
      discountType: 'TOTAL',
      applicableEventIds: ['ALL'],
      maxUses: 5,
      usedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'usr_coord_1',
      creatorName: 'Prof. Coordenador',
      description: 'Voucher de teste para persistência global'
    };

    it('denies participant from saving vouchers (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/db/write-vouchers-save')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ vouchers: [testVoucher] });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('coordinator saves vouchers persistently via /api/db/write-vouchers-save', async () => {
      const res = await request(app)
        .post('/api/db/write-vouchers-save')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ vouchers: [testVoucher] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('vouchers are visible for root and other coordinators in GET /api/db/get-state', async () => {
      const res = await request(app).get('/api/db/get-state');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vouchers).toBeDefined();

      const found = res.body.data.vouchers.find((v: any) => v.code === testVoucherCode);
      expect(found).toBeDefined();
      expect(found.code).toBe(testVoucherCode);
      expect(found.discountType).toBe('TOTAL');
      expect(found.maxUses).toBe(5);
      expect(found.isActive).toBe(true);
    });

    it('root can list vouchers via GET /api/vouchers', async () => {
      const res = await request(app)
        .get('/api/vouchers')
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((v: any) => v.code === testVoucherCode);
      expect(found).toBeDefined();
    });

    it('coordinator can toggle voucher status persistently', async () => {
      const res = await request(app)
        .post('/api/db/write-voucher-toggle')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ id: testVoucher.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isActive).toBe(false);

      // Verifica se a alteração foi refletida em get-state
      const stateRes = await request(app).get('/api/db/get-state');
      const found = stateRes.body.data.vouchers.find((v: any) => v.id === testVoucher.id);
      expect(found.isActive).toBe(false);

      // Alterna novamente para ativo
      await request(app)
        .post('/api/db/write-voucher-toggle')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ id: testVoucher.id });
    });

    it('records voucher usage when enrollment is processed', async () => {
      const usageData = {
        userId: 'usr_student_1',
        userEmail: 'aluno@camporeal.edu.br',
        userName: 'Aluno Teste',
        enrollmentId: `enroll_test_${Date.now()}`,
        discountApplied: 50
      };

      const res = await request(app)
        .post('/api/db/write-voucher-usage')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ code: testVoucherCode, usage: usageData });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verifica se a utilização foi registrada no estado
      const stateRes = await request(app).get('/api/db/get-state');
      const found = stateRes.body.data.vouchers.find((v: any) => v.code === testVoucherCode);
      expect(found.usedCount).toBe(1);
      expect(found.usages.length).toBeGreaterThanOrEqual(1);
      expect(found.usages[found.usages.length - 1].userEmail).toBe('aluno@camporeal.edu.br');
    });

    it('root can delete voucher persistently', async () => {
      const res = await request(app)
        .post('/api/db/write-voucher-delete')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ id: testVoucher.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const stateRes = await request(app).get('/api/db/get-state');
      const found = stateRes.body.data.vouchers.find((v: any) => v.id === testVoucher.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Global System Settings Persistence Tests', () => {
    it('public can fetch global system settings via GET /api/settings', async () => {
      const res = await request(app).get('/api/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.pixKey).toBeDefined();
      expect(res.body.data.whatsapp).toBeDefined();
      expect(res.body.data.supportEmail).toBeDefined();
      expect(res.body.data.loginBannerImage).toBeDefined();
    });

    it('GET /api/db/get-state includes global system settings', async () => {
      const res = await request(app).get('/api/db/get-state');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings).toBeDefined();
      expect(typeof res.body.data.settings.pixKey).toBe('string');
      expect(typeof res.body.data.settings.whatsapp).toBe('string');
    });

    it('denies participant from updating global system settings (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/db/write-system-settings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ pixKey: 'hacker@pix.com' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('coordinator updates global system settings persistently', async () => {
      const newPixKey = `pix.teste.${Date.now()}@camporeal.edu.br`;
      const newWhatsapp = '(42) 98888-7777';
      const newSupportEmail = 'suporte.global@camporeal.edu.br';

      const res = await request(app)
        .post('/api/db/write-system-settings')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          pixKey: newPixKey,
          whatsapp: newWhatsapp,
          supportEmail: newSupportEmail
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pixKey).toBe(newPixKey);
      expect(res.body.data.whatsapp).toBe(newWhatsapp);
      expect(res.body.data.supportEmail).toBe(newSupportEmail);

      // Garante que as alterações agora são globais e acessíveis entre os endpoints
      const settingsRes = await request(app).get('/api/settings');
      expect(settingsRes.body.data.pixKey).toBe(newPixKey);
      expect(settingsRes.body.data.whatsapp).toBe(newWhatsapp);
      expect(settingsRes.body.data.supportEmail).toBe(newSupportEmail);

      const stateRes = await request(app).get('/api/db/get-state');
      expect(stateRes.body.data.settings.pixKey).toBe(newPixKey);
      expect(stateRes.body.data.settings.whatsapp).toBe(newWhatsapp);
    });

    it('root can update login banner image globally', async () => {
      const customBannerUrl = 'https://images.unsplash.com/photo-custom-test-banner';

      const res = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ loginBannerImage: customBannerUrl });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.loginBannerImage).toBe(customBannerUrl);

      const settingsRes = await request(app).get('/api/settings');
      expect(settingsRes.body.data.loginBannerImage).toBe(customBannerUrl);
    });
  });

  describe('Cross-Device Global Email Dispatching Tests', () => {
    it('dispatches welcome notification using server-stored SMTP when client provides empty smtpSettings', async () => {
      const res = await request(app)
        .post('/api/smtp/send-welcome')
        .send({
          to: 'novo.aluno@camporeal.edu.br',
          userName: 'Novo Aluno Celular',
          userRole: 'PARTICIPANTE'
          // Observação: smtpSettings é omitido (simulando acesso de aluno pelo celular)
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('dispatches support message using server-stored SMTP when client provides empty smtpSettings', async () => {
      const res = await request(app)
        .post('/api/smtp/send-support')
        .send({
          fromName: 'Aluno no Celular',
          fromEmail: 'aluno.celular@camporeal.edu.br',
          subject: 'Dúvida sobre credenciamento',
          message: 'Como faço para credenciar meu workshop pelo celular?'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('processes password recovery using server-stored SMTP without client credentials', async () => {
      const res = await request(app)
        .post('/api/smtp/send-recovery')
        .send({
          to: 'aluno@camporeal.edu.br',
          userName: 'Aluno Recuperacao'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Global SMTP Server Working Boolean Indicator Tests', () => {
    it('provides isSmtpWorking boolean on public GET /api/settings', async () => {
      const res = await request(app).get('/api/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.isSmtpWorking).toBe('boolean');
      expect(typeof res.body.data.smtpStatus).toBe('string');
    });

    it('provides settings.isSmtpWorking boolean on GET /api/db/get-state', async () => {
      const res = await request(app).get('/api/db/get-state');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.settings.isSmtpWorking).toBe('boolean');
    });

    it('coordinator testing SMTP updates isWorking and status globally in system_settings', async () => {
      const testEmail = 'validacao.coordenador@camporeal.edu.br';
      const testRes = await request(app)
        .post('/api/smtp/test')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          smtpSettings: {
            host: 'smtp.camporeal.edu.br',
            port: 587,
            secure: 'TLS',
            user: 'notificacoes@camporeal.edu.br',
            pass: 'SecretPass123!',
            senderName: 'Campo Real Eventos',
            senderEmail: 'notificacoes@camporeal.edu.br'
          },
          testEmail
        });

      expect(testRes.status).toBe(200);
      expect(testRes.body.success).toBe(true);
      expect(testRes.body.isWorking).toBe(true);
      expect(testRes.body.status).toBe('working');
      expect(testRes.body.lastTestedAt).toBeDefined();

      // 1. Garante que /api/smtp/settings reflita o status de funcionamento global
      const smtpRes = await request(app)
        .get('/api/smtp/settings')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(smtpRes.status).toBe(200);
      expect(smtpRes.body.data.isWorking).toBe(true);
      expect(smtpRes.body.data.status).toBe('working');
      expect(smtpRes.body.data.lastTestedAt).toBeDefined();

      // 2. Garante que /api/settings (endpoint público global) reflita isSmtpWorking como true
      const publicSettingsRes = await request(app).get('/api/settings');
      expect(publicSettingsRes.status).toBe(200);
      expect(publicSettingsRes.body.data.isSmtpWorking).toBe(true);
      expect(publicSettingsRes.body.data.smtpStatus).toBe('working');

      // 3. Garante que /api/db/get-state reflita isSmtpWorking como true globalmente
      const stateRes = await request(app).get('/api/db/get-state');
      expect(stateRes.status).toBe(200);
      expect(stateRes.body.data.settings.isSmtpWorking).toBe(true);
    });

    it('coordinator can manually update isSmtpWorking via global settings endpoint', async () => {
      const res = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          isSmtpWorking: true,
          smtpStatus: 'working'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSmtpWorking).toBe(true);
      expect(res.body.data.smtpStatus).toBe('working');

      const checkRes = await request(app).get('/api/settings');
      expect(checkRes.body.data.isSmtpWorking).toBe(true);
    });
  });
});

