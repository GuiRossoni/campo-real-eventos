import { Request, Response } from 'express';
import { mailService } from './mail.service';
import { recoveryStore } from '../auth/auth.service';

export class MailController {
  async handleSendPasswordRecovery(req: Request, res: Response): Promise<void> {
    try {
      const { to, userName, smtpSettings, resetLink } = req.body;
      if (!to) {
        res.status(400).json({ success: false, error: 'E-mail de destino é obrigatório.' });
        return;
      }
      // Gera o código de forma segura no servidor
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      // Armazena em memória por 15 minutos
      recoveryStore.set(to.toLowerCase().trim(), {
        code,
        expiresAt: Date.now() + 15 * 60 * 1000
      });

      const result = await mailService.sendPasswordRecoveryEmail({
        to,
        userName: userName || 'Usuário',
        smtpSettings: smtpSettings || {},
        recoveryCode: code,
        resetLink
      });

      // NÃO expõe o recoveryCode para o frontend
      res.json({
        success: result.success,
        message: 'E-mail de recuperação enviado com sucesso.',
        logs: result.logs
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async handleGetSmtpSettings(req: Request, res: Response): Promise<void> {
    try {
      const data = await mailService.getPublicSettings();
      res.json({ success: true, data });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async handleSaveSmtpSettings(req: Request, res: Response): Promise<void> {
    try {
      const { smtpSettings } = req.body;
      if (!smtpSettings) {
        res.status(400).json({ success: false, error: 'Configurações de SMTP não fornecidas.' });
        return;
      }
      const saved = await mailService.saveStoredSettings(smtpSettings);
      const { password, pass, ...publicData } = saved;
      res.json({
        success: true,
        data: publicData,
        message: 'Configurações de SMTP salvas com sucesso no banco de dados!'
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async handleTestSmtpConnection(req: Request, res: Response): Promise<void> {
    try {
      const { smtpSettings, testEmail } = req.body;
      if (!smtpSettings) {
        res.status(400).json({ success: false, error: 'Configurações de SMTP não fornecidas.' });
        return;
      }
      const result = await mailService.testSmtpConnection({
        smtpSettings,
        testEmail
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async handleSendWelcome(req: Request, res: Response): Promise<void> {
    try {
      const { to, userName, userRole, ra, course, smtpSettings } = req.body;
      if (!to) {
        res.status(400).json({ success: false, error: 'E-mail de destino é obrigatório.' });
        return;
      }
      const result = await mailService.sendWelcomeEmail({
        to,
        userName: userName || 'Novo Usuário',
        userRole,
        ra,
        course,
        smtpSettings: smtpSettings || {}
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async handleSendEnrollment(req: Request, res: Response): Promise<void> {
    try {
      const {
        to,
        userName,
        eventName,
        eventDate,
        eventLocation,
        selectedWorkshops,
        totalValue,
        status,
        voucherCode,
        enrollmentId,
        pixKey,
        whatsappNumber,
        smtpSettings
      } = req.body;

      if (!to || !eventName) {
        res.status(400).json({ success: false, error: 'E-mail e evento são obrigatórios.' });
        return;
      }

      const result = await mailService.sendEnrollmentNotificationEmail({
        to,
        userName: userName || 'Participante',
        eventName,
        eventDate,
        eventLocation,
        selectedWorkshops: selectedWorkshops || [],
        totalValue: Number(totalValue) || 0,
        status: status || 'PENDENTE',
        voucherCode,
        enrollmentId: enrollmentId || `enroll_${Date.now()}`,
        pixKey,
        whatsappNumber,
        smtpSettings: smtpSettings || {}
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async handleSendPaymentApproved(req: Request, res: Response): Promise<void> {
    try {
      const { to, userName, eventName, enrollmentId, totalValue, smtpSettings } = req.body;
      if (!to || !enrollmentId) {
        res.status(400).json({ success: false, error: 'E-mail e inscrição são obrigatórios.' });
        return;
      }

      const result = await mailService.sendPaymentApprovedEmail({
        to,
        userName: userName || 'Participante',
        eventName: eventName || 'Evento',
        enrollmentId,
        totalValue: Number(totalValue) || 0,
        smtpSettings: smtpSettings || {}
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async handleSendSupportMessage(req: Request, res: Response): Promise<void> {
    try {
      const { fromName, fromEmail, subject, message, supportEmail, smtpSettings } = req.body;
      if (!fromName || !fromEmail || !message) {
        res.status(400).json({ success: false, error: 'Nome, e-mail e mensagem são obrigatórios.' });
        return;
      }

      const result = await mailService.sendSupportMessageEmail({
        fromName,
        fromEmail,
        subject: subject || 'Dúvida Geral',
        message,
        supportEmail: supportEmail || 'softweek@aeg.dev.br',
        smtpSettings: smtpSettings || {}
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}

export const mailController = new MailController();
