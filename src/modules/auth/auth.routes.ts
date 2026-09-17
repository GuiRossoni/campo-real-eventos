import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './auth.controller';
import { requireAuth, optionalAuth } from './auth.middleware';

const router = Router();

// Limitação de taxa para rotas sensíveis de autenticação (prevenção contra força bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // Limita cada IP a 30 tentativas de login/registro por janela de tempo
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas tentativas de autenticação a partir deste endereço. Por favor, aguarde 15 minutos antes de tentar novamente.'
  }
});

// Rotas de autenticação
router.post('/api/auth/login', authLimiter, (req, res) => authController.handleLogin(req, res));
router.post('/api/auth/register', authLimiter, optionalAuth, (req, res) => authController.handleRegister(req, res));
router.get('/api/auth/me', requireAuth, (req, res) => authController.handleGetMe(req, res));
router.post('/api/auth/reset-password', authLimiter, (req, res) => authController.handleResetPassword(req, res));

// Alias de compatibilidade retroativa para chamadas legadas do cliente
router.post('/api/db/write-user-register', authLimiter, optionalAuth, (req, res) => authController.handleRegister(req, res));

export default router;
