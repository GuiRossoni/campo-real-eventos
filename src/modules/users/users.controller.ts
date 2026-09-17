import { Request, Response } from 'express';
import { usersService } from './users.service';

export class UsersController {
  async handleGetUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await usersService.getAllUsers();
      res.json({ success: true, data: users });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async handleUpdateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id, updatedFields } = req.body;
      if (!id || !updatedFields) {
        res.status(400).json({ success: false, error: 'Identificador do usuário e campos de atualização são obrigatórios.' });
        return;
      }

      const caller = req.user;
      // Verificação de autorização: o usuário pode atualizar seu próprio perfil, mas apenas COORDENADOR ou ROOT podem atualizar outros usuários
      if (caller && caller.id !== id && caller.role !== 'ROOT' && caller.role !== 'COORDENADOR') {
        res.status(403).json({ success: false, error: 'Você não tem permissão para alterar os dados de outro usuário.' });
        return;
      }

      // Verificação de segurança: apenas ROOT ou COORDENADOR podem alterar papéis/perfis
      const fields = { ...updatedFields };
      if (fields.role && (!caller || (caller.role !== 'ROOT' && caller.role !== 'COORDENADOR'))) {
        delete fields.role;
      }

      // O perfil ROOT não pode ser retirado por quem não for ROOT
      if (fields.role && fields.role === 'ROOT' && caller?.role !== 'ROOT') {
        res.status(403).json({ success: false, error: 'Apenas um administrador ROOT pode conceder este perfil.' });
        return;
      }

      const updated = await usersService.updateUser(id, fields);
      res.json({ success: true, data: updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async handleDeleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.body;
      if (!id) {
        res.status(400).json({ success: false, error: 'Identificador do usuário é obrigatório.' });
        return;
      }

      // Impede a exclusão acidental ou maliciosa do usuário ROOT
      const targetUser = await usersService.getUserById(id);
      if (targetUser && targetUser.role === 'ROOT') {
        res.status(403).json({ success: false, error: 'O usuário ROOT principal do sistema não pode ser excluído.' });
        return;
      }

      await usersService.deleteUser(id);
      res.json({ success: true, message: 'Usuário excluído com sucesso.' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}

export const usersController = new UsersController();
