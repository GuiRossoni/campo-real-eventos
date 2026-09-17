import mysql from 'mysql2/promise';
import fs from 'fs';
import { ENV } from './env';
import { DbState } from '../modules/users/users.types';
import { Voucher, VoucherUsage, SystemSettings } from '../@types/index';
import { hashPassword } from '../modules/auth/auth.utils';
import {
  SEEDED_USERS,
  SEEDED_EVENTS,
  SEEDED_WORKSHOPS,
  SEEDED_ENROLLMENTS,
  SEEDED_ATTENDANCE,
  SEEDED_BANNERS,
  SEEDED_LOGS,
  SEEDED_EXPENSES,
  SEEDED_VOUCHERS
} from '../data/seedData';

export let mysqlPool: mysql.Pool | null = null;
export let isUsingMySQL = false;

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  pixKey: 'financeiro@camporeal.edu.br',
  whatsapp: '(42) 99999-9999',
  supportEmail: 'softweek@aeg.dev.br',
  loginBannerImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200',
  isSmtpWorking: false,
  smtpStatus: 'untested'
};

// Cache em memória para fallback
export let fallbackDb: DbState = {
  users: [...SEEDED_USERS],
  events: [...SEEDED_EVENTS],
  workshops: [...SEEDED_WORKSHOPS],
  enrollments: [...SEEDED_ENROLLMENTS],
  attendance: [...SEEDED_ATTENDANCE],
  certificates: [],
  banners: [...SEEDED_BANNERS],
  logs: [...SEEDED_LOGS],
  expenses: [...SEEDED_EXPENSES],
  vouchers: [...SEEDED_VOUCHERS],
  settings: { ...DEFAULT_SYSTEM_SETTINGS }
};

// Alternador para teste de modos offline
export function setMySQLState(active: boolean) {
  isUsingMySQL = active;
}

export async function loadFallbackDb() {
  try {
    let parsed: any = null;
    if (fs.existsSync(ENV.FALLBACK_DB_PATH)) {
      try {
        const data = fs.readFileSync(ENV.FALLBACK_DB_PATH, 'utf-8');
        parsed = JSON.parse(data);
      } catch (parseErr: any) {
        console.warn('⚠️ [Config Database] Arquivo local_db_fallback.json corrompido ou malformado. Restaurando com dados padrão:', parseErr.message);
      }
    }

    if (parsed) {
      fallbackDb = {
        users: parsed.users || [...SEEDED_USERS],
        events: parsed.events || [],
        workshops: parsed.workshops || [],
        enrollments: parsed.enrollments || [],
        attendance: parsed.attendance || [],
        certificates: parsed.certificates || [],
        banners: parsed.banners || [...SEEDED_BANNERS],
        logs: parsed.logs || [],
        expenses: parsed.expenses || [...SEEDED_EXPENSES],
        vouchers: parsed.vouchers || [...SEEDED_VOUCHERS],
        settings: parsed.settings ? { ...DEFAULT_SYSTEM_SETTINGS, ...parsed.settings } : { ...DEFAULT_SYSTEM_SETTINGS }
      };
    } else {
      // Inicializa com usuários padrão do seed
      fallbackDb = {
        users: [...SEEDED_USERS],
        events: [...SEEDED_EVENTS],
        workshops: [...SEEDED_WORKSHOPS],
        enrollments: [...SEEDED_ENROLLMENTS],
        attendance: [...SEEDED_ATTENDANCE],
        certificates: [],
        banners: [...SEEDED_BANNERS],
        logs: [...SEEDED_LOGS],
        expenses: [...SEEDED_EXPENSES],
        vouchers: [...SEEDED_VOUCHERS],
        settings: { ...DEFAULT_SYSTEM_SETTINGS }
      };
    }


    // Garante que todos os usuários de fallback tenham senhas com hash seguro
    for (const u of fallbackDb.users) {
      if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        u.password = await hashPassword(u.password);
      }
    }

    saveFallbackDb();
  } catch (error) {
    console.error('⚠️ [Config Database] Erro ao ler banco de dados local:', error);
  }
}

export function saveFallbackDb() {
  try {
    fs.writeFileSync(ENV.FALLBACK_DB_PATH, JSON.stringify(fallbackDb, null, 2), 'utf-8');
  } catch (error) {
    console.error('⚠️ [Config Database] Erro ao salvar banco de dados local:', error);
  }
}

export async function initDatabase() {
  await loadFallbackDb();
  
  if (!ENV.DB_HOST) {
    console.log('🟡 Variável DB_HOST não configurada. Operando no modo de persistência local (JSON).');
    return;
  }

  try {
    console.log(`🟡 Tentando conectar ao MySQL em: ${ENV.DB_HOST}:${ENV.DB_PORT} (Usuário: ${ENV.DB_USER})...`);
    
    // Tenta garantir que o banco de dados exista (desenvolvimento local); na hospedagem compartilhada da Hostinger, o banco já é pré-criado
    try {
      const initPool = mysql.createPool({
        host: ENV.DB_HOST,
        port: ENV.DB_PORT,
        user: ENV.DB_USER,
        password: ENV.DB_PASSWORD,
        connectTimeout: 4000,
        connectionLimit: 1
      });
      await initPool.query(`CREATE DATABASE IF NOT EXISTS \`${ENV.DB_NAME}\`;`);
      await initPool.end();
    } catch {
      // Ignora com segurança: provedores gerenciados como a Hostinger bloqueiam privilégios de CREATE DATABASE
    }

    // Reconecta com pool customizado do banco de dados
    mysqlPool = mysql.createPool({
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      user: ENV.DB_USER,
      password: ENV.DB_PASSWORD,
      database: ENV.DB_NAME,
      connectTimeout: 5000,
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    await createMySQLTablesAndSeeds();
    isUsingMySQL = true;
    console.log('🟢 MYSQL CONECTADO E PRONTO COM SUCESSO! Banco de dados oficial sincronizado.');
  } catch (error: any) {
    console.log('🔴 Erro de conexão com o banco MySQL ou credenciais incorretas.');
    console.log(`Detecção técnica: ${error.message}`);
    console.log('📌 O servidor continuará em execução usando o banco persistido do local_db_fallback.json!');
  }
}

async function createMySQLTablesAndSeeds() {
  if (!mysqlPool) return;

  const connection = await mysqlPool.getConnection();
  try {
    // 1. Usuários
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        ra VARCHAR(50) NULL,
        course VARCHAR(150) NULL,
        period VARCHAR(50) NULL,
        institution VARCHAR(255) NULL,
        role VARCHAR(50) NOT NULL,
        password VARCHAR(255) NULL
      );
    `);

    // Garante que a coluna institution exista em users
    try {
      await connection.query('ALTER TABLE users ADD COLUMN institution VARCHAR(255) NULL');
    } catch {}

    // 2. Eventos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        banner LONGTEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        startDate VARCHAR(50) NOT NULL,
        endDate VARCHAR(50) NOT NULL,
        startTime VARCHAR(20) NOT NULL,
        endTime VARCHAR(20) NOT NULL,
        category VARCHAR(100) NOT NULL,
        maxParticipants INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        creatorId VARCHAR(100) NOT NULL,
        creatorName VARCHAR(255) NOT NULL,
        isFeatured BOOLEAN NOT NULL DEFAULT 0,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00
      );
    `);

    // Garante que a coluna banner em events suporte texto longo
    try {
      await connection.query('ALTER TABLE events MODIFY banner LONGTEXT NOT NULL');
    } catch {}

    // 3. Workshops / Minicursos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS workshops (
        id VARCHAR(100) PRIMARY KEY,
        eventId VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        instructor VARCHAR(255) NOT NULL,
        date VARCHAR(50) NOT NULL,
        time VARCHAR(20) NOT NULL,
        maxParticipants INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        enrolledCount INT NOT NULL DEFAULT 0
      );
    `);

    // 4. Inscrições
    await connection.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id VARCHAR(100) PRIMARY KEY,
        userId VARCHAR(100) NOT NULL,
        userEmail VARCHAR(150) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        userRa VARCHAR(50) NULL,
        eventId VARCHAR(100) NOT NULL,
        eventName VARCHAR(255) NOT NULL,
        selectedWorkshops TEXT NOT NULL,
        totalValue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(50) NOT NULL,
        createdAt VARCHAR(50) NOT NULL
      );
    `);

    // 5. Presença
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(100) PRIMARY KEY,
        userId VARCHAR(100) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        userEmail VARCHAR(150) NOT NULL,
        userRa VARCHAR(50) NULL,
        eventId VARCHAR(100) NOT NULL,
        workshopId VARCHAR(100) NULL,
        checkedInAt VARCHAR(50) NOT NULL,
        checkedInBy VARCHAR(255) NOT NULL
      );
    `);

    // 6. Certificados
    await connection.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id VARCHAR(100) PRIMARY KEY,
        userId VARCHAR(100) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        userRa VARCHAR(50) NULL,
        eventId VARCHAR(100) NOT NULL,
        eventName VARCHAR(255) NOT NULL,
        hours INT NOT NULL,
        hash VARCHAR(100) NOT NULL,
        issuedAt VARCHAR(50) NOT NULL,
        coordinationSignature VARCHAR(255) NOT NULL
      );
    `);

    // 7. Logs do sistema
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id VARCHAR(100) PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        userEmail VARCHAR(150) NOT NULL,
        userRole VARCHAR(50) NOT NULL,
        details TEXT NOT NULL,
        timestamp VARCHAR(50) NOT NULL
      );
    `);

    // 8. Banners
    await connection.query(`
      CREATE TABLE IF NOT EXISTS home_banners (
        id VARCHAR(100) PRIMARY KEY,
        imageUrl LONGTEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) NOT NULL,
        linkToEventId VARCHAR(100) NULL,
        isActive BOOLEAN NOT NULL DEFAULT 1
      );
    `);

    // 9. Despesas e Movimentações Financeiras
    await connection.query(`
      CREATE TABLE IF NOT EXISTS financial_expenses (
        id VARCHAR(100) PRIMARY KEY,
        eventId VARCHAR(100) NOT NULL,
        eventName VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        type VARCHAR(50) NOT NULL,
        date VARCHAR(50) NOT NULL,
        createdAt VARCHAR(50) NOT NULL
      );
    `);

    // 10. Cupons / Vouchers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        prefix VARCHAR(100) NOT NULL,
        discountType VARCHAR(50) NOT NULL,
        discountPercent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        applicableEventIds TEXT NOT NULL,
        maxUses INT NOT NULL DEFAULT 1,
        usedCount INT NOT NULL DEFAULT 0,
        isActive BOOLEAN NOT NULL DEFAULT 1,
        createdAt VARCHAR(50) NOT NULL,
        createdBy VARCHAR(100) NOT NULL,
        creatorName VARCHAR(255) NOT NULL,
        description TEXT NULL,
        usages LONGTEXT NULL
      );
    `);

    // 11. Configurações do Sistema (persistência chave-valor de configurações)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value LONGTEXT NOT NULL,
        updated_at VARCHAR(50) NOT NULL
      );
    `);

    // Popula Usuários com hash de senha seguro
    for (const u of SEEDED_USERS) {
      const [existing]: any = await connection.query('SELECT id FROM users WHERE id = ? OR email = ?', [u.id, u.email]);
      if (existing.length === 0) {
        let passwordToStore = u.password || 'Admin@CampoReal2026!';
        if (!passwordToStore.startsWith('$2a$') && !passwordToStore.startsWith('$2b$')) {
          passwordToStore = await hashPassword(passwordToStore);
        }
        await connection.query(
          'INSERT INTO users (id, name, email, ra, course, period, institution, role, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [u.id, u.name, u.email, u.ra || null, u.course || null, u.period || null, u.institution || 'Centro Universitário Campo Real', u.role, passwordToStore]
        );
      }
    }

    // Garante que o super administrador root tenha a instituição atualizada caso esteja ausente
    try {
      await connection.query(
        "UPDATE users SET institution = 'Centro Universitário Campo Real' WHERE institution IS NULL OR institution = ''"
      );
    } catch {}

    // Popula Eventos
    for (const e of SEEDED_EVENTS) {
      const [existing]: any = await connection.query('SELECT id FROM events WHERE id = ?', [e.id]);
      if (existing.length === 0) {
        await connection.query(
          'INSERT INTO events (id, name, description, banner, location, startDate, endDate, startTime, endTime, category, maxParticipants, status, creatorId, creatorName, isFeatured, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [e.id, e.name, e.description, e.banner, e.location, e.startDate, e.endDate, e.startTime, e.endTime, e.category, e.maxParticipants, e.status, e.creatorId, e.creatorName, e.isFeatured ? 1 : 0, e.price || 0]
        );
      }
    }

    // Popula Workshops
    for (const w of SEEDED_WORKSHOPS) {
      const [existing]: any = await connection.query('SELECT id FROM workshops WHERE id = ?', [w.id]);
      if (existing.length === 0) {
        await connection.query(
          'INSERT INTO workshops (id, eventId, name, description, instructor, date, time, maxParticipants, price, enrolledCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [w.id, w.eventId, w.name, w.description, w.instructor, w.date, w.time || '', w.maxParticipants, w.price || 0, w.enrolledCount || 0]
        );
      }
    }

    // Popula Banners da Página Inicial
    for (const b of SEEDED_BANNERS) {
      const [existing]: any = await connection.query('SELECT id FROM home_banners WHERE id = ?', [b.id]);
      if (existing.length === 0) {
        await connection.query(
          'INSERT INTO home_banners (id, imageUrl, title, subtitle, linkToEventId, isActive) VALUES (?, ?, ?, ?, ?, ?)',
          [b.id, b.imageUrl, b.title, b.subtitle, b.linkToEventId || null, b.isActive ? 1 : 0]
        );
      }
    }

    console.log('🎉 [Config Database] Tabelas relacionais criadas com sucesso!');
  } finally {
    connection.release();
  }
}

/**
 * Retorna o estado do banco de dados com sanitização rigorosa de usuários (SENHAS NUNCA SÃO RETORNADAS)
 */
export async function getFullState(): Promise<DbState> {
  const settings = await getGlobalSettings();

  if (!isUsingMySQL || !mysqlPool) {
    return {
      ...fallbackDb,
      users: fallbackDb.users.map(u => {
        const { password, ...safeUser } = u;
        return safeUser;
      }),
      settings
    };
  }

  const connection = await mysqlPool.getConnection();
  try {
    // Omite explicitamente a coluna de senha do SELECT (inclui instituição)
    const [users]: any = await connection.query('SELECT id, name, email, ra, course, period, institution, role FROM users');
    const [events]: any = await connection.query('SELECT * FROM events');
    const [workshops]: any = await connection.query('SELECT * FROM workshops');
    const [enrollments]: any = await connection.query('SELECT * FROM enrollments');
    const [attendance]: any = await connection.query('SELECT * FROM attendance');
    const [certificates]: any = await connection.query('SELECT * FROM certificates');
    const [banners]: any = await connection.query('SELECT * FROM home_banners');
    const [logs]: any = await connection.query('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 200');
    
    let expenses: any[] = [];
    try {
      const [expRows]: any = await connection.query('SELECT * FROM financial_expenses');
      expenses = expRows;
    } catch {}

    const parseJsonSafe = (val: any, fallback: any) => {
      if (!val) return fallback;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch { return fallback; }
    };

    let vouchers: any[] = [];
    try {
      const [vRows]: any = await connection.query('SELECT * FROM vouchers');
      vouchers = vRows.map((v: any) => ({
        ...v,
        isActive: !!v.isActive,
        discountPercent: v.discountPercent !== null && v.discountPercent !== undefined ? Number(v.discountPercent) : undefined,
        applicableEventIds: parseJsonSafe(v.applicableEventIds, ['ALL']),
        usages: parseJsonSafe(v.usages, [])
      }));
    } catch {}

    return {
      users: users.map((u: any) => ({
        ...u,
        ra: u.ra || undefined,
        course: u.course || undefined,
        period: u.period || undefined,
        institution: u.institution || undefined
      })),
      events: events.map((e: any) => ({ ...e, isFeatured: !!e.isFeatured, price: Number(e.price) })),
      workshops: workshops.map((w: any) => ({ ...w, price: Number(w.price), enrolledCount: Number(w.enrolledCount) })),
      enrollments: enrollments.map((en: any) => ({ 
        ...en, 
        userRa: en.userRa || undefined, 
        totalValue: Number(en.totalValue),
        selectedWorkshops: parseJsonSafe(en.selectedWorkshops, [])
      })),
      attendance: attendance.map((a: any) => ({ ...a, userRa: a.userRa || undefined, workshopId: a.workshopId || undefined })),
      certificates: certificates.map((c: any) => ({ ...c, userRa: c.userRa || undefined, hours: Number(c.hours) })),
      banners: banners.map((b: any) => ({ ...b, isActive: !!b.isActive, linkToEventId: b.linkToEventId || undefined })),
      logs: logs.map((l: any) => ({ ...l })),
      expenses: expenses.map((ex: any) => ({ ...ex, value: Number(ex.value) })),
      vouchers,
      settings
    };
  } catch (error) {
    console.error('MySQL query state error, defaulting to fallbackDb:', error);
    return {
      ...fallbackDb,
      users: fallbackDb.users.map(u => {
        const { password, ...safeUser } = u;
        return safeUser;
      }),
      settings
    };
  } finally {
    connection.release();
  }
}

export async function getSystemSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  if (isUsingMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', [key]);
      if (rows.length > 0) {
        return JSON.parse(rows[0].setting_value);
      }
    } catch (e) {
      console.error(`Erro ao buscar setting ${key} do MySQL:`, e);
    }
  }
  const fallback = (fallbackDb as any).settings?.[key];
  return fallback !== undefined ? fallback : defaultValue;
}

export async function saveSystemSetting(key: string, value: any): Promise<void> {
  const jsonVal = JSON.stringify(value);
  const now = new Date().toISOString();
  if (isUsingMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = ?',
        [key, jsonVal, now, jsonVal, now]
      );
    } catch (e) {
      console.error(`Erro ao salvar setting ${key} no MySQL:`, e);
    }
  }
  if (!(fallbackDb as any).settings) {
    (fallbackDb as any).settings = {};
  }
  (fallbackDb as any).settings[key] = value;
  saveFallbackDb();
}

/**
 * Operações globais de configurações do sistema (chave Pix, WhatsApp, e-mail de suporte, banner de login)
 */
export async function getGlobalSettings(): Promise<SystemSettings> {
  const pixKey = await getSystemSetting<string>('pix_key', DEFAULT_SYSTEM_SETTINGS.pixKey);
  const whatsapp = await getSystemSetting<string>('whatsapp', DEFAULT_SYSTEM_SETTINGS.whatsapp);
  const supportEmail = await getSystemSetting<string>('support_email', DEFAULT_SYSTEM_SETTINGS.supportEmail);
  const loginBannerImage = await getSystemSetting<string>('login_banner_image', DEFAULT_SYSTEM_SETTINGS.loginBannerImage);
  const smtpSettings = await getSystemSetting<any>('smtp_settings');

  const isSmtpWorking = Boolean(
    smtpSettings?.isWorking === true ||
    smtpSettings?.status === 'working'
  );
  const host = smtpSettings?.host || ENV.SMTP_HOST;
  const user = smtpSettings?.user || ENV.SMTP_USER;
  const smtpStatus = smtpSettings?.status || (isSmtpWorking ? 'working' : (host && user ? 'pending' : 'untested'));

  return {
    pixKey: pixKey || DEFAULT_SYSTEM_SETTINGS.pixKey,
    whatsapp: whatsapp || DEFAULT_SYSTEM_SETTINGS.whatsapp,
    supportEmail: supportEmail || DEFAULT_SYSTEM_SETTINGS.supportEmail,
    loginBannerImage: loginBannerImage || DEFAULT_SYSTEM_SETTINGS.loginBannerImage,
    isSmtpWorking,
    smtpStatus,
    smtpLastTestedAt: smtpSettings?.lastTestedAt
  };
}

export async function saveGlobalSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  if (settings.pixKey !== undefined) {
    await saveSystemSetting('pix_key', settings.pixKey.trim());
  }
  if (settings.whatsapp !== undefined) {
    await saveSystemSetting('whatsapp', settings.whatsapp.trim());
  }
  if (settings.supportEmail !== undefined) {
    await saveSystemSetting('support_email', settings.supportEmail.trim());
  }
  if (settings.loginBannerImage !== undefined) {
    await saveSystemSetting('login_banner_image', settings.loginBannerImage.trim());
  }
  if (settings.isSmtpWorking !== undefined || settings.smtpStatus !== undefined) {
    const currentSmtp = (await getSystemSetting<any>('smtp_settings')) || {};
    const isWorking = settings.isSmtpWorking !== undefined ? settings.isSmtpWorking : (settings.smtpStatus === 'working');
    const status = settings.smtpStatus || (isWorking ? 'working' : 'error');
    await saveSystemSetting('smtp_settings', {
      ...currentSmtp,
      isWorking,
      status,
      lastTestedAt: settings.smtpLastTestedAt || currentSmtp.lastTestedAt || new Date().toISOString()
    });
  }
  return await getGlobalSettings();
}

/**
 * Operações de persistência de vouchers (MySQL + cache de fallback)
 */
export async function saveVouchersToDb(vouchersList: Voucher[]): Promise<void> {
  if (!vouchersList || vouchersList.length === 0) return;

  if (isUsingMySQL && mysqlPool) {
    const connection = await mysqlPool.getConnection();
    try {
      for (const v of vouchersList) {
        const applicableJson = JSON.stringify(v.applicableEventIds || ['ALL']);
        const usagesJson = JSON.stringify(v.usages || []);
        const discountPct = v.discountPercent !== undefined && v.discountPercent !== null ? Number(v.discountPercent) : 0;
        
        await connection.query(
          `INSERT INTO vouchers (
            id, code, prefix, discountType, discountPercent, applicableEventIds,
            maxUses, usedCount, isActive, createdAt, createdBy, creatorName, description, usages
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            prefix = VALUES(prefix),
            discountType = VALUES(discountType),
            discountPercent = VALUES(discountPercent),
            applicableEventIds = VALUES(applicableEventIds),
            maxUses = VALUES(maxUses),
            usedCount = VALUES(usedCount),
            isActive = VALUES(isActive),
            description = VALUES(description),
            usages = VALUES(usages)`,
          [
            v.id,
            v.code,
            v.prefix,
            v.discountType,
            discountPct,
            applicableJson,
            v.maxUses ?? 1,
            v.usedCount ?? 0,
            v.isActive ? 1 : 0,
            v.createdAt || new Date().toISOString(),
            v.createdBy,
            v.creatorName,
            v.description || null,
            usagesJson
          ]
        );
      }
    } finally {
      connection.release();
    }
  }

  // Sincroniza o cache de fallback
  if (!fallbackDb.vouchers) fallbackDb.vouchers = [];
  for (const v of vouchersList) {
    const idx = fallbackDb.vouchers.findIndex(item => item.id === v.id || item.code.toLowerCase() === v.code.toLowerCase());
    if (idx !== -1) {
      fallbackDb.vouchers[idx] = { ...fallbackDb.vouchers[idx], ...v };
    } else {
      fallbackDb.vouchers.unshift(v);
    }
  }
  saveFallbackDb();
}

export async function toggleVoucherActiveInDb(id: string): Promise<boolean | null> {
  let nextState: boolean | null = null;
  if (isUsingMySQL && mysqlPool) {
    const [rows]: any = await mysqlPool.query('SELECT isActive FROM vouchers WHERE id = ?', [id]);
    if (rows.length > 0) {
      nextState = !rows[0].isActive;
      await mysqlPool.query('UPDATE vouchers SET isActive = ? WHERE id = ?', [nextState ? 1 : 0, id]);
    }
  }

  const idx = fallbackDb.vouchers?.findIndex(v => v.id === id) ?? -1;
  if (idx !== -1 && fallbackDb.vouchers) {
    if (nextState === null) {
      nextState = !fallbackDb.vouchers[idx].isActive;
    }
    fallbackDb.vouchers[idx].isActive = nextState;
    saveFallbackDb();
  }

  return nextState;
}

export async function deleteVoucherFromDb(id: string): Promise<boolean> {
  if (isUsingMySQL && mysqlPool) {
    await mysqlPool.query('DELETE FROM vouchers WHERE id = ?', [id]);
  }

  if (fallbackDb.vouchers) {
    fallbackDb.vouchers = fallbackDb.vouchers.filter(v => v.id !== id);
    saveFallbackDb();
  }

  return true;
}

export async function recordVoucherUsageInDb(code: string, usage: VoucherUsage): Promise<boolean> {
  const cleanCode = code.trim().toLowerCase();

  if (isUsingMySQL && mysqlPool) {
    const [rows]: any = await mysqlPool.query('SELECT * FROM vouchers WHERE LOWER(code) = ?', [cleanCode]);
    if (rows.length > 0) {
      const v = rows[0];
      const currentUsages: VoucherUsage[] = typeof v.usages === 'string' ? JSON.parse(v.usages || '[]') : (v.usages || []);
      currentUsages.push(usage);
      const newUsedCount = (v.usedCount || 0) + 1;
      await mysqlPool.query('UPDATE vouchers SET usedCount = ?, usages = ? WHERE id = ?', [
        newUsedCount,
        JSON.stringify(currentUsages),
        v.id
      ]);
    }
  }

  if (fallbackDb.vouchers) {
    const idx = fallbackDb.vouchers.findIndex(v => v.code.toLowerCase() === cleanCode);
    if (idx !== -1) {
      const target = fallbackDb.vouchers[idx];
      target.usedCount = (target.usedCount || 0) + 1;
      if (!target.usages) target.usages = [];
      target.usages.push(usage);
      saveFallbackDb();
    }
  }

  return true;
}

