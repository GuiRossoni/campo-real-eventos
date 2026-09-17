import { Router } from 'express';
import { isUsingMySQL, mysqlPool, fallbackDb, saveFallbackDb } from '../../config/database';
import { Event, Workshop } from '../../@types/index';
import { requireAuth, requireRole, optionalAuth } from '../auth/auth.middleware';

const router = Router();

const ALLOWED_EVENT_FIELDS = [
  'name',
  'description',
  'banner',
  'location',
  'startDate',
  'endDate',
  'startTime',
  'endTime',
  'category',
  'maxParticipants',
  'status',
  'isFeatured',
  'price'
];

// GET público de eventos
router.get('/api/events', async (req, res) => {
  try {
    if (isUsingMySQL && mysqlPool) {
      const [rows]: any = await mysqlPool.query('SELECT * FROM events');
      const events = rows.map((e: any) => ({
        ...e,
        isFeatured: !!e.isFeatured,
        price: Number(e.price)
      }));
      return res.json({ success: true, data: events });
    }
    return res.json({ success: true, data: fallbackDb.events });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Salvar Evento (Restrito a Organizadores, Coordenadores e Root)
router.post('/api/db/write-event-save', requireAuth, requireRole('ORGANIZADOR', 'COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const event: Event = req.body;
    if (!event.name || !event.startDate) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios do evento não preenchidos.' });
    }

    // Vincula o criador do evento ao usuário autenticado caso não definido
    if (!event.creatorId && req.user) {
      event.creatorId = req.user.id;
      event.creatorName = req.user.name;
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query(
        'INSERT INTO events (id, name, description, banner, location, startDate, endDate, startTime, endTime, category, maxParticipants, status, creatorId, creatorName, isFeatured, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          event.id,
          event.name,
          event.description,
          event.banner,
          event.location,
          event.startDate,
          event.endDate,
          event.startTime,
          event.endTime,
          event.category,
          event.maxParticipants,
          event.status,
          event.creatorId,
          event.creatorName,
          event.isFeatured ? 1 : 0,
          event.price
        ]
      );
    } else {
      fallbackDb.events.unshift(event);
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Atualizar Evento (Restrito a Organizadores, Coordenadores e Root com lista de campos permitidos)
router.post('/api/db/write-event-update', requireAuth, requireRole('ORGANIZADOR', 'COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const { id, updatedFields } = req.body;
    if (!id || !updatedFields) {
      return res.status(400).json({ success: false, error: 'Identificador do evento e campos para atualização são obrigatórios.' });
    }

    let result: Event;
    const safeKeys = Object.keys(updatedFields).filter(key => ALLOWED_EVENT_FIELDS.includes(key));
    
    if (isUsingMySQL && mysqlPool) {
      if (safeKeys.length > 0) {
        const queryStr = `UPDATE events SET ${safeKeys.map(k => `\`${k}\` = ?`).join(', ')} WHERE id = ?`;
        const values = safeKeys.map(k => {
          const val = (updatedFields as any)[k];
          if (k === 'isFeatured') return val ? 1 : 0;
          return val;
        }).concat(id);
        await mysqlPool.query(queryStr, values);
      }
      const [rows]: any = await mysqlPool.query('SELECT * FROM events WHERE id = ?', [id]);
      result = rows[0];
    } else {
      const idx = fallbackDb.events.findIndex(e => e.id === id);
      if (idx !== -1) {
        const safeUpdates: any = {};
        for (const k of safeKeys) {
          safeUpdates[k] = (updatedFields as any)[k];
        }
        fallbackDb.events[idx] = { ...fallbackDb.events[idx], ...safeUpdates };
        saveFallbackDb();
        result = fallbackDb.events[idx];
      } else {
        throw new Error('Evento não encontrado');
      }
    }
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Excluir Evento (Restrito a Coordenadores e Root)
router.post('/api/db/write-event-delete', requireAuth, requireRole('COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Identificador do evento é obrigatório.' });
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query('DELETE FROM certificates WHERE eventId = ?', [id]);
      await mysqlPool.query('DELETE FROM attendance WHERE eventId = ?', [id]);
      await mysqlPool.query('DELETE FROM enrollments WHERE eventId = ?', [id]);
      await mysqlPool.query('UPDATE home_banners SET linkToEventId = NULL WHERE linkToEventId = ?', [id]);
      await mysqlPool.query('DELETE FROM workshops WHERE eventId = ?', [id]);
      await mysqlPool.query('DELETE FROM events WHERE id = ?', [id]);
    } else {
      fallbackDb.events = fallbackDb.events.filter(e => e.id !== id);
      fallbackDb.workshops = fallbackDb.workshops.filter(w => w.eventId !== id);
      fallbackDb.enrollments = fallbackDb.enrollments.filter(en => en.eventId !== id);
      fallbackDb.attendance = fallbackDb.attendance.filter(a => a.eventId !== id);
      fallbackDb.certificates = fallbackDb.certificates.filter(c => c.eventId !== id);
      fallbackDb.banners = fallbackDb.banners.map(b => b.linkToEventId === id ? { ...b, linkToEventId: undefined } : b);
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    console.error('Error deleting event on backend:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Salvar Workshop (Restrito a Organizadores, Coordenadores e Root)
router.post('/api/db/write-workshop-save', requireAuth, requireRole('ORGANIZADOR', 'COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const workshop: Workshop = req.body;
    if (!workshop.id || !workshop.eventId || !workshop.name) {
      return res.status(400).json({ success: false, error: 'Identificador, evento e nome da oficina são obrigatórios.' });
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query(
        'INSERT INTO workshops (id, eventId, name, description, instructor, date, time, maxParticipants, price, enrolledCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          workshop.id,
          workshop.eventId,
          workshop.name,
          workshop.description,
          workshop.instructor,
          workshop.date,
          workshop.time || `${workshop.startTime} - ${workshop.endTime}`,
          workshop.maxParticipants,
          workshop.price,
          workshop.enrolledCount || 0
        ]
      );
    } else {
      fallbackDb.workshops.push(workshop);
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Excluir Workshop (Restrito a Organizadores, Coordenadores e Root)
router.post('/api/db/write-workshop-delete', requireAuth, requireRole('ORGANIZADOR', 'COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Identificador da oficina é obrigatório.' });
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query('DELETE FROM workshops WHERE id = ?', [id]);
    } else {
      fallbackDb.workshops = fallbackDb.workshops.filter(w => w.id !== id);
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
