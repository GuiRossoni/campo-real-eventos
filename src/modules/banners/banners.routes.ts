import { Router } from 'express';
import { isUsingMySQL, mysqlPool, fallbackDb, saveFallbackDb } from '../../config/database';
import { HomeBanner } from '../../@types/index';
import { requireAuth, requireRole } from '../auth/auth.middleware';

const router = Router();

// GET público de banners
router.get('/api/banners', async (req, res) => {
  try {
    if (isUsingMySQL && mysqlPool) {
      const [rows]: any = await mysqlPool.query('SELECT * FROM home_banners WHERE isActive = 1');
      const banners = rows.map((b: any) => ({
        ...b,
        isActive: !!b.isActive,
        linkToEventId: b.linkToEventId || undefined
      }));
      return res.json({ success: true, data: banners });
    }
    return res.json({ success: true, data: fallbackDb.banners.filter(b => b.isActive) });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Salvar Banner (Restrito a Coordenadores e Root)
router.post('/api/db/write-banner-save', requireAuth, requireRole('COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const banner: HomeBanner = req.body;
    if (!banner.id || !banner.imageUrl || !banner.title) {
      return res.status(400).json({ success: false, error: 'Identificador, imagem e título do banner são obrigatórios.' });
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query(
        'INSERT INTO home_banners (id, imageUrl, title, subtitle, linkToEventId, isActive) VALUES (?, ?, ?, ?, ?, ?)',
        [banner.id, banner.imageUrl, banner.title, banner.subtitle, banner.linkToEventId || null, banner.isActive ? 1 : 0]
      );
    } else {
      fallbackDb.banners.push(banner);
      saveFallbackDb();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Alternar estado do Banner (Restrito a Coordenadores e Root)
router.post('/api/db/write-banner-toggle', requireAuth, requireRole('COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Identificador do banner é obrigatório.' });
    }

    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query('UPDATE home_banners SET isActive = NOT isActive WHERE id = ?', [id]);
    } else {
      const idx = fallbackDb.banners.findIndex(b => b.id === id);
      if (idx !== -1) {
        fallbackDb.banners[idx].isActive = !fallbackDb.banners[idx].isActive;
        saveFallbackDb();
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
