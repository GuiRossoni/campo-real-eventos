import { Router } from 'express';
import { isUsingMySQL, mysqlPool, fallbackDb, saveFallbackDb } from '../../config/database';
import { Enrollment, Attendance, Certificate } from '../../@types/index';
import { requireAuth, requireRole } from '../auth/auth.middleware';

const router = Router();

// Salvar Inscrição (Requer autenticação)
router.post('/api/db/write-enrollment-save', requireAuth, async (req, res) => {
  try {
    const enrollment: Enrollment = req.body;
    if (!enrollment.id || !enrollment.eventId) {
      return res.status(400).json({ success: false, error: 'Identificador e evento são obrigatórios para inscrição.' });
    }

    // Garante que a inscrição seja atribuída ao usuário autenticado, a menos que um coordenador esteja inscrevendo alguém
    if (req.user && req.user.role === 'PARTICIPANTE') {
      enrollment.userId = req.user.id;
      enrollment.userEmail = req.user.email;
      enrollment.userName = req.user.name;
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query(
        'INSERT INTO enrollments (id, userId, userEmail, userName, userRa, eventId, eventName, selectedWorkshops, totalValue, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          enrollment.id,
          enrollment.userId,
          enrollment.userEmail,
          enrollment.userName,
          enrollment.userRa || null,
          enrollment.eventId,
          enrollment.eventName,
          JSON.stringify(enrollment.selectedWorkshops || []),
          enrollment.totalValue || 0,
          enrollment.status || 'PENDENTE',
          enrollment.createdAt || new Date().toISOString()
        ]
      );
    } else {
      const idx = fallbackDb.enrollments.findIndex(e => e.id === enrollment.id);
      if (idx !== -1) {
        fallbackDb.enrollments[idx] = enrollment;
      } else {
        fallbackDb.enrollments.push(enrollment);
      }
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Atualizar Status da Inscrição (Restrito a Coordenadores, Organizadores e Root)
router.post('/api/db/write-enrollment-status', requireAuth, requireRole('ORGANIZADOR', 'COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'Identificador e status da inscrição são obrigatórios.' });
    }

    const ALLOWED_STATUSES = ['PENDENTE', 'APROVADO', 'CANCELADO'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status de inscrição inválido.' });
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query('UPDATE enrollments SET status = ? WHERE id = ?', [status, id]);
    } else {
      const idx = fallbackDb.enrollments.findIndex(e => e.id === id);
      if (idx !== -1) {
        fallbackDb.enrollments[idx].status = status;
        saveFallbackDb();
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Incrementar Contagem de Inscritos no Workshop
router.post('/api/db/write-workshop-increment', requireAuth, async (req, res) => {
  try {
    const { workshopIds } = req.body;
    if (!Array.isArray(workshopIds)) {
      return res.status(400).json({ success: false, error: 'Lista de identificadores de oficina inválida.' });
    }

    if (isUsingMySQL && mysqlPool) {
      for (const wId of workshopIds) {
        await mysqlPool.query('UPDATE workshops SET enrolledCount = enrolledCount + 1 WHERE id = ?', [wId]);
      }
    } else {
      fallbackDb.workshops = fallbackDb.workshops.map(w => {
        if (workshopIds.includes(w.id)) {
          return { ...w, enrolledCount: (w.enrolledCount || 0) + 1 };
        }
        return w;
      });
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Salvar Registro de Presença (Restrito a Organizadores, Coordenadores e Root)
router.post('/api/db/write-attendance-save', requireAuth, requireRole('ORGANIZADOR', 'COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const att: Attendance = req.body;
    if (!att.id || !att.userId || !att.eventId) {
      return res.status(400).json({ success: false, error: 'Dados obrigatórios de presença incompletos.' });
    }

    if (req.user) {
      att.checkedInBy = req.user.name;
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query(
        'INSERT INTO attendance (id, userId, userName, userEmail, userRa, eventId, workshopId, checkedInAt, checkedInBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [att.id, att.userId, att.userName, att.userEmail, att.userRa || null, att.eventId, att.workshopId || null, att.checkedInAt || new Date().toISOString(), att.checkedInBy]
      );
    } else {
      fallbackDb.attendance.push(att);
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Remover Registro de Presença (Restrito a Coordenadores e Root)
router.post('/api/db/write-attendance-remove', requireAuth, requireRole('COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Identificador de presença é obrigatório.' });
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query('DELETE FROM attendance WHERE id = ?', [id]);
    } else {
      fallbackDb.attendance = fallbackDb.attendance.filter(a => a.id !== id);
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Salvar Registro de Certificado (Restrito a Coordenadores e Root)
router.post('/api/db/write-certificate-save', requireAuth, requireRole('COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const cert: Certificate = req.body;
    if (!cert.id || !cert.userId || !cert.eventId || !cert.hash) {
      return res.status(400).json({ success: false, error: 'Dados obrigatórios do certificado incompletos.' });
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query(
        'INSERT INTO certificates (id, userId, userName, userRa, eventId, eventName, hours, hash, issuedAt, coordinationSignature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [cert.id, cert.userId, cert.userName, cert.userRa || null, cert.eventId, cert.eventName, cert.hours || 0, cert.hash, cert.issuedAt || new Date().toISOString(), cert.coordinationSignature || 'Coordenação Geral']
      );
    } else {
      fallbackDb.certificates.push(cert);
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
