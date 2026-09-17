import { Request, Response } from 'express';
import { authService } from './auth.service';

export class AuthController {
  async handleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: 'O e-mail é obrigatório.' });
        return;
      }
      const result = await authService.login(email, password);
      res.json({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (e: any) {
      res.status(401).json({ success: false, error: e.message || 'Falha na autenticação.' });
    }
  }

  async handleRegister(req: Request, res: Response): Promise<void> {
    try {
      // O autocadastro comum só pode criar o perfil 'PARTICIPANTE'
      // Apenas usuários autenticados como ROOT ou COORDENADOR podem criar usuários com outros perfis
      let requestedRole = req.body.role || 'PARTICIPANTE';
      if (requestedRole !== 'PARTICIPANTE') {
        const callerRole = req.user?.role;
        if (callerRole !== 'ROOT' && callerRole !== 'COORDENADOR') {
          requestedRole = 'PARTICIPANTE';
        }
      }

      const result = await authService.register({
        ...req.body,
        role: requestedRole
      });

      res.status(201).json({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message || 'Erro ao cadastrar usuário.' });
    }
  }

  async handleGetMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Não autenticado.' });
        return;
      }
      const user = await authService.getMe(req.user.id);
      res.json({ success: true, user });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  }

  async handleResetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        res.status(400).json({ success: false, error: 'E-mail, código de verificação e nova senha são obrigatórios.' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ success: false, error: 'A nova senha deve possuir no mínimo 6 caracteres.' });
        return;
      }
      const updatedUser = await authService.verifyAndResetPassword(email, code, newPassword);
      res.json({ success: true, message: 'Senha redefinida com sucesso!', user: updatedUser });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}

export const authController = new AuthController();
