import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { getGlobalSettings, saveGlobalSettings } from '../../config/database';

const router = Router();

// Obter configurações globais do sistema (Acesso público para que visitantes/checkout/login possam lê-las)
router.get('/api/settings', async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    return res.json({ success: true, data: settings });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Erro ao obter configurações do sistema.' });
  }
});

// Atualizar configurações globais do sistema (Restrito a Coordenadores e Root)
const handleSaveSettings = async (req: any, res: any) => {
  try {
    const { pixKey, whatsapp, supportEmail, loginBannerImage, isSmtpWorking, smtpStatus, smtpLastTestedAt } = req.body;
    const toUpdate: Record<string, any> = {};

    if (pixKey !== undefined) toUpdate.pixKey = String(pixKey);
    if (whatsapp !== undefined) toUpdate.whatsapp = String(whatsapp);
    if (supportEmail !== undefined) toUpdate.supportEmail = String(supportEmail);
    if (loginBannerImage !== undefined) toUpdate.loginBannerImage = String(loginBannerImage);
    if (isSmtpWorking !== undefined) toUpdate.isSmtpWorking = Boolean(isSmtpWorking);
    if (smtpStatus !== undefined) toUpdate.smtpStatus = String(smtpStatus);
    if (smtpLastTestedAt !== undefined) toUpdate.smtpLastTestedAt = String(smtpLastTestedAt);

    const updated = await saveGlobalSettings(toUpdate);
    return res.json({ success: true, data: updated });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Erro ao salvar configurações do sistema.' });
  }
};

router.post('/api/db/write-system-settings', requireAuth, requireRole('COORDENADOR', 'ROOT'), handleSaveSettings);
router.post('/api/settings', requireAuth, requireRole('COORDENADOR', 'ROOT'), handleSaveSettings);

export default router;
