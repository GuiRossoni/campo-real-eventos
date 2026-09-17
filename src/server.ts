import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';

import { ENV } from './config/env';
import { initDatabase, getFullState, mysqlPool } from './config/database';
import authRouter from './modules/auth/auth.routes';
import usersRouter from './modules/users/users.routes';
import eventsRouter from './modules/events/events.routes';
import enrollmentsRouter from './modules/enrollments/enrollments.routes';
import bannersRouter from './modules/banners/banners.routes';
import logsRouter from './modules/logs/logs.routes';
import mailRouter from './modules/mail/mail.routes';
import uploadsRouter from './modules/uploads/uploads.routes';
import vouchersRouter from './modules/vouchers/vouchers.routes';
import settingsRouter from './modules/settings/settings.routes';

export const app = express();

// Confia no proxy reverso (Hostinger Passenger / Nginx / Cloudflare)
app.set('trust proxy', 1);

// Cabeçalhos de segurança com Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: ["'self'", 'https:', 'http:', 'ws:', 'wss:'],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        objectSrc: ["'none'"],
        frameSrc: ["'self'"],
        upgradeInsecureRequests: null
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Configuração de CORS
app.use(
  cors({
    origin: ENV.CORS_ORIGIN === '*' ? true : ENV.CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Limitação global de requisições da API (rate limit)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requisições a cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas requisições originadas deste endereço IP. Aguarde alguns minutos.'
  }
});

app.use('/api/', apiLimiter);

// Middlewares de processamento de JSON e URL-encoded com limites seguros
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servindo o diretório de uploads estáticos
const publicUploadsPath = path.join(process.cwd(), 'public', 'uploads');
app.use('/uploads', express.static(publicUploadsPath));

// Rota de verificação de integridade (health check)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Rota de estado sanitizado (senhas são completamente omitidas)
app.get('/api/db/get-state', async (req, res) => {
  try {
    const state = await getFullState();
    res.json({ success: true, data: state });
  } catch (e: any) {
    res.status(500).json({ success: false, error: 'Erro ao carregar estado do banco de dados.' });
  }
});

// Monta os roteadores dos módulos
app.use(authRouter);
app.use(usersRouter);
app.use(eventsRouter);
app.use(enrollmentsRouter);
app.use(bannersRouter);
app.use(logsRouter);
app.use(mailRouter);
app.use(uploadsRouter);
app.use(vouchersRouter);
app.use(settingsRouter);

// Middleware centralizado de tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 [Server Error]:', err);
  if (res.headersSent) {
    return next(err);
  }
  const isProd = ENV.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    success: false,
    error: isProd ? 'Ocorreu um erro interno no servidor.' : err.message || 'Erro interno'
  });
});

let serverInstance: any = null;

export async function startServer() {
  const PORT = process.env.PORT || ENV.PORT || 3000;

  // Inicializa o banco de dados (MySQL com fallback gracioso)
  try {
    await initDatabase();
  } catch (err) {
    console.error('Database initialization warning:', err);
  }

  // Camada de compatibilidade para arquivos estáticos e Hot Module Replacement (HMR)
  if (ENV.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  serverInstance = app.listen(PORT, () => {
    console.log(`🚀 Campo Real Eventos rodando em: http://localhost:${PORT} [Modo: ${ENV.NODE_ENV}]`);
  });

  return serverInstance;
}

// Tratamento de encerramento gracioso (graceful shutdown)
process.on('SIGTERM', async () => {
  console.log('📌 [SIGTERM] Encerrando servidor de forma graciosa...');
  if (serverInstance) serverInstance.close();
  if (mysqlPool) await mysqlPool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📌 [SIGINT] Encerrando servidor de forma graciosa...');
  if (serverInstance) serverInstance.close();
  if (mysqlPool) await mysqlPool.end();
  process.exit(0);
});

// Inicialização automática caso não esteja em ambiente de testes
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
