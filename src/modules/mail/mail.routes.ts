import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { mailController } from './mail.controller';
import { requireAuth, requireRole, optionalAuth } from '../auth/auth.middleware';

const router = Router();

// Limitadores de taxa antiabuso para disparos públicos de e-mail
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Muitas solicitações de recuperação de senha. Aguarde 15 minutos.' }
});

const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Muitas mensagens de suporte enviadas recentemente. Aguarde 15 minutos.' }
});

// E-mail de recuperação de senha
router.post('/api/smtp/send-recovery', recoveryLimiter, (req, res) => mailController.handleSendPasswordRecovery(req, res));
router.post('/api/auth/forgot-password', recoveryLimiter, (req, res) => mailController.handleSendPasswordRecovery(req, res));

// Persistência das configurações de SMTP no MySQL/servidor
router.get('/api/smtp/settings', requireAuth, requireRole('COORDENADOR', 'ROOT'), (req, res) => mailController.handleGetSmtpSettings(req, res));
router.post('/api/smtp/settings', requireAuth, requireRole('COORDENADOR', 'ROOT'), (req, res) => mailController.handleSaveSmtpSettings(req, res));

// Teste de conexão (estritamente restrito a coordenadores e administradores root)
router.post('/api/smtp/test', requireAuth, requireRole('COORDENADOR', 'ROOT'), (req, res) => mailController.handleTestSmtpConnection(req, res));
router.post('/api/smtp/verify', requireAuth, requireRole('COORDENADOR', 'ROOT'), (req, res) => mailController.handleTestSmtpConnection(req, res));

// Disparos de notificação (requerem contexto autenticado)
router.post('/api/smtp/send-welcome', optionalAuth, (req, res) => mailController.handleSendWelcome(req, res));
router.post('/api/smtp/send-enrollment', requireAuth, (req, res) => mailController.handleSendEnrollment(req, res));
router.post('/api/smtp/send-payment-approved', requireAuth, requireRole('ORGANIZADOR', 'COORDENADOR', 'ROOT'), (req, res) => mailController.handleSendPaymentApproved(req, res));
router.post('/api/smtp/send-support', supportLimiter, optionalAuth, (req, res) => mailController.handleSendSupportMessage(req, res));

export default router;
