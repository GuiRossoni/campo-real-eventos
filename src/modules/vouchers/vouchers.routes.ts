import { Router } from 'express';
import { Voucher, VoucherUsage } from '../../@types/index';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import {
  saveVouchersToDb,
  toggleVoucherActiveInDb,
  deleteVoucherFromDb,
  recordVoucherUsageInDb,
  getFullState
} from '../../config/database';

const router = Router();

// Salvar Vouchers em lote ou individual (Restrito a Coordenadores e Root)
router.post('/api/db/write-vouchers-save', requireAuth, requireRole('COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const body = req.body;
    const vouchersList: Voucher[] = Array.isArray(body.vouchers)
      ? body.vouchers
      : body.voucher
      ? [body.voucher]
      : Array.isArray(body)
      ? body
      : [];

    if (vouchersList.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum voucher fornecido para persistência.' });
    }

    // Anexa informações do criador caso ausentes
    for (const v of vouchersList) {
      if (!v.createdBy && req.user) {
        v.createdBy = req.user.id;
        v.creatorName = req.user.name;
      }
    }

    await saveVouchersToDb(vouchersList);
    return res.json({ success: true, count: vouchersList.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Erro ao salvar vouchers no banco de dados.' });
  }
});

// Alternar estado ativo/inativo do Voucher (Restrito a Coordenadores e Root)
router.post('/api/db/write-voucher-toggle', requireAuth, requireRole('COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Identificador do voucher não informado.' });
    }

    const nextState = await toggleVoucherActiveInDb(id);
    if (nextState === null) {
      return res.status(404).json({ success: false, error: 'Voucher não encontrado.' });
    }

    return res.json({ success: true, isActive: nextState });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Erro ao alterar status do voucher.' });
  }
});

// Excluir Voucher (Restrito a Coordenadores e Root)
router.post('/api/db/write-voucher-delete', requireAuth, requireRole('COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Identificador do voucher não informado.' });
    }

    await deleteVoucherFromDb(id);
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Erro ao excluir voucher.' });
  }
});

// Registrar Uso do Voucher (Usuário registrado concluindo inscrição com voucher)
router.post('/api/db/write-voucher-usage', requireAuth, async (req, res) => {
  try {
    const { code, usage } = req.body;
    if (!code || !usage) {
      return res.status(400).json({ success: false, error: 'Código e dados de uso são obrigatórios.' });
    }

    const usageRecord: VoucherUsage = {
      userId: usage.userId || req.user?.id || 'unknown',
      userEmail: usage.userEmail || req.user?.email || 'unknown',
      userName: usage.userName || req.user?.name || 'Participante',
      enrollmentId: usage.enrollmentId || `enroll_${Date.now()}`,
      usedAt: usage.usedAt || new Date().toISOString(),
      discountApplied: Number(usage.discountApplied) || 0
    };

    await recordVoucherUsageInDb(code, usageRecord);
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Erro ao registrar uso de voucher.' });
  }
});

// Listar todos os vouchers (Restrito a Coordenadores e Root)
router.get('/api/vouchers', requireAuth, requireRole('COORDENADOR', 'ROOT'), async (req, res) => {
  try {
    const state = await getFullState();
    return res.json({ success: true, data: state.vouchers || [] });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Erro ao carregar vouchers.' });
  }
});

export default router;
