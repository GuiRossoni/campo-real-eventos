import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';

const router = Router();

// Listagem de usuários (acessível apenas para perfis com privilégios)
router.get('/api/users', requireAuth, requireRole('COORDENADOR', 'ROOT', 'ORGANIZADOR'), (req, res) => usersController.handleGetUsers(req, res));

// Modificação de usuário (usuários podem atualizar seus próprios dados, perfis com privilégios podem atualizar outros)
router.post('/api/db/write-user-update', requireAuth, (req, res) => usersController.handleUpdateUser(req, res));

// Exclusão de usuário (estritamente restrito a coordenadores e administradores root)
router.post('/api/db/write-user-delete', requireAuth, requireRole('COORDENADOR', 'ROOT'), (req, res) => usersController.handleDeleteUser(req, res));

export default router;
