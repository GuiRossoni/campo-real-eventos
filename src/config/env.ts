import path from 'path';
import dotenv from 'dotenv';

// Carrega as variáveis do .env se presente
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Configuração do Banco de Dados
  DB_HOST: process.env.DB_HOST || '',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'camporeal_eventos',
  FALLBACK_DB_PATH: path.join(process.cwd(), 'local_db_fallback.json'),

  // Segurança de JWT
  JWT_SECRET: process.env.JWT_SECRET || 'camporeal-events-super-secret-key-2026-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // Configuração do Servidor de E-mail SMTP (gerenciado no lado do servidor, nunca exposto aos clientes)
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Campo Real Eventos',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'notificacoes.eventos@camporeal.edu.br',
  SMTP_REPLY_TO: process.env.SMTP_REPLY_TO || 'suporte.eventos@camporeal.edu.br',

  // Limites de upload
  MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10)
};

if (ENV.NODE_ENV === 'production' && ENV.JWT_SECRET === 'camporeal-events-super-secret-key-2026-production') {
  console.warn('⚠️ [SEGURANÇA] JWT_SECRET padrão em uso no ambiente de produção. Configure uma chave forte em suas variáveis de ambiente.');
}
