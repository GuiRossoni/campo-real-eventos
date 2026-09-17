import { Router } from 'express';
import { isUsingMySQL, mysqlPool, fallbackDb, saveFallbackDb } from '../../config/database';
import { SystemLog } from '../../@types/index';
import { optionalAuth } from '../auth/auth.middleware';

const router = Router();

// Adicionar Log do Sistema
router.post('/api/db/write-log', optionalAuth, async (req, res) => {
  try {
    const log: SystemLog = req.body;
    if (!log.action) {
      return res.status(400).json({ success: false, error: 'Ação do log é obrigatória.' });
    }

    const newLog: SystemLog = {
      id: log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: log.action.slice(0, 100),
      userEmail: req.user?.email || log.userEmail || 'sistema@camporeal.edu.br',
      userRole: req.user?.role || log.userRole || 'PARTICIPANTE',
      details: String(log.details || '').slice(0, 1000),
      timestamp: log.timestamp || new Date().toISOString()
    };

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query(
        'INSERT INTO system_logs (id, action, userEmail, userRole, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [newLog.id, newLog.action, newLog.userEmail, newLog.userRole, newLog.details, newLog.timestamp]
      );
    } else {
      fallbackDb.logs.unshift(newLog);
      // Mantém apenas os últimos 1000 logs no fallback
      if (fallbackDb.logs.length > 1000) {
        fallbackDb.logs = fallbackDb.logs.slice(0, 1000);
      }
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
