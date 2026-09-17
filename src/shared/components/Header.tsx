import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { LogIn, LogOut, UserCheck, ShieldAlert, BookOpen, User as UserIcon, Edit3, Save, X, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import Logo from './Logo';
import { DB } from '../utils/db';
import { THEME } from '../styles/designSystem';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onQuickCreateEvent?: () => void;
  onProfileUpdated?: () => void;
  onLogoClick?: () => void;
}

export default function Header({
  currentUser,
  onLogout,
  onOpenAuth,
  searchQuery,
  setSearchQuery,
  onQuickCreateEvent,
  onProfileUpdated,
  onLogoClick
}: HeaderProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estado persistente do tema claro/escuro (padrão: dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('campus_theme') as 'light' | 'dark';
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  // Aplica gatilho reativo da classe dark no elemento raiz
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('campus_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('campus_theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Estado local dos campos de perfil
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [editPeriod, setEditPeriod] = useState('');
  const [editRa, setEditRa] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);

  const openProfile = () => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditEmail(currentUser.email);
      setEditCourse(currentUser.course || '');
      setEditInstitution(currentUser.institution || '');
      setEditPeriod(currentUser.period || '');
      setEditRa(currentUser.ra || '');
      setEditPassword('');
      setEditConfirmPassword('');
      setShowEditPassword(false);
      setShowEditConfirmPassword(false);
      setIsEditing(false);
      setShowProfile(true);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!editName.trim()) {
      alert('O nome completo é obrigatório.');
      return;
    }

    if (!editEmail.trim()) {
      alert('O endereço de e-mail é obrigatório.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      alert('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (editPassword) {
      if (editPassword.length < 6) {
        alert('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (editPassword !== editConfirmPassword) {
        alert('A confirmação de senha não coincide com a nova senha.');
        return;
      }
    }

    try {
      const updatePayload: any = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        course: editCourse.trim() || undefined,
        institution: editInstitution.trim() || undefined,
        period: editPeriod.trim() || undefined,
        ra: editRa.trim() || undefined
      };

      if (editPassword) {
        updatePayload.password = editPassword;
      }

      DB.updateUser(currentUser.id, updatePayload);
      setIsEditing(false);
      setShowProfile(false);
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar perfil.');
    }
  };

  return (
    <header className={THEME.header.navbar}>
      
      {/* Identidade visual e logotipo */}
      <div onClick={onLogoClick} className={THEME.header.logoWrapper}>
        <Logo variant="full" className="w-28 sm:w-36 md:w-44 h-8 sm:h-9 md:h-11 object-contain transition-all" />
      </div>

      {/* Ações de autenticação e preferências */}
      <div className={THEME.header.actionsWrapper}>

        {/* Botão de alternância de tema */}
        <button 
          type="button"
          onClick={toggleTheme}
          className="p-2 sm:p-2.5 text-gray-500 hover:text-blue-600 dark:hover:text-yellow-400 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-full cursor-pointer transition-all flex items-center justify-center shrink-0 shadow-3xs"
          title={theme === 'dark' ? 'Ativar Tema Claro' : 'Ativar Tema Escuro'}
          aria-label="Alternar tema claro e escuro"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />}
        </button>

        {/* Perfil do usuário / Login */}
        {currentUser ? (
          <div className={THEME.header.realUserWrapper}>
            <button 
              type="button"
              onClick={openProfile}
              className={THEME.header.realUserBtn}
              title="Ver Perfil"
            >
              <div className={THEME.header.realUserMeta}>
                <span className="text-gray-800 dark:text-zinc-100 text-xs font-semibold leading-tight max-w-[150px] truncate group-hover:text-blue-600 transition-colors">{currentUser.name}</span>
                <span className={`text-[10px] uppercase font-mono tracking-wider font-bold text-right block ${
                  currentUser.role === 'ROOT' ? 'text-purple-600 dark:text-purple-400' :
                  currentUser.role === 'ORGANIZADOR' ? 'text-indigo-600 dark:text-indigo-400' :
                  currentUser.role === 'COORDENADOR' ? 'text-amber-600 dark:text-amber-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <div className={`${THEME.header.realUserAvatar} ${
                currentUser.role === 'ROOT' ? 'bg-purple-100 dark:bg-purple-950/60' :
                currentUser.role === 'ORGANIZADOR' ? 'bg-indigo-100 dark:bg-indigo-950/60' :
                currentUser.role === 'COORDENADOR' ? 'bg-amber-100 dark:bg-amber-950/60' :
                'bg-blue-100 dark:bg-blue-950/60'
              }`}>
                <div className={`${THEME.header.realUserInitials} ${
                  currentUser.role === 'ROOT' ? 'text-purple-600 border-purple-200 dark:bg-zinc-800 dark:border-purple-800 dark:text-purple-300' :
                  currentUser.role === 'ORGANIZADOR' ? 'text-indigo-600 border-indigo-200 dark:bg-zinc-800 dark:border-indigo-800 dark:text-indigo-300' :
                  currentUser.role === 'COORDENADOR' ? 'text-amber-600 border-amber-200 dark:bg-zinc-800 dark:border-amber-800 dark:text-amber-300' :
                  'text-blue-600 border-blue-200 dark:bg-zinc-800 dark:border-blue-800 dark:text-blue-300'
                }`}>
                  {currentUser.name.charAt(0)}
                </div>
              </div>
            </button>
            <button 
              type="button"
              onClick={onLogout}
              className={THEME.header.logoutBtn}
              title="Sair da Conta"
              aria-label="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            type="button"
            onClick={onOpenAuth}
            className={THEME.header.loginBtn}
          >
            <LogIn className="w-3.5 h-3.5" />
            Acesso
          </button>
        )}

      </div>

      {/* Modal de detalhes e edição do perfil de usuário */}
      {showProfile && currentUser && (
        <div className={THEME.profileModal.backdrop}>
          <div className={THEME.profileModal.card}>
            
            {/* Cabeçalho do modal */}
            <div className={THEME.profileModal.header}>
              <div className="flex items-center gap-3">
                <div className={`${THEME.profileModal.avatar} ${
                  currentUser.role === 'ROOT' ? 'bg-purple-100 text-purple-600' :
                  currentUser.role === 'ORGANIZADOR' ? 'bg-indigo-100 text-indigo-600' :
                  currentUser.role === 'COORDENADOR' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className={THEME.profileModal.metaTitle}>
                    {isEditing ? 'Editar Perfil' : 'Detalhes do Perfil'}
                  </h3>
                  <span className={`${THEME.profileModal.metaBadge} ${
                    currentUser.role === 'ROOT'
                      ? 'bg-purple-50 text-purple-600 border-purple-200'
                      : currentUser.role === 'ORGANIZADOR'
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      : currentUser.role === 'COORDENADOR'
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-blue-50 text-blue-600 border-gray-200'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowProfile(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do modal */}
            <div className={THEME.profileModal.body}>
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div>
                    <label className={THEME.input.label}>Nome Completo</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className={THEME.input.text}
                      required
                    />
                  </div>
                  <div>
                    <label className={THEME.input.label}>E-mail</label>
                    <input 
                      type="email" 
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className={THEME.input.text}
                      required
                    />
                  </div>
                  <div>
                    <label className={THEME.input.label}>Registro Acadêmico (RA)</label>
                    <input 
                      type="text" 
                      value={editRa}
                      onChange={e => setEditRa(e.target.value)}
                      placeholder="Ex: 202611888"
                      className={THEME.input.text}
                    />
                  </div>
                  <div>
                    <label className={THEME.input.label}>Instituição</label>
                    <input 
                      type="text" 
                      value={editInstitution}
                      onChange={e => setEditInstitution(e.target.value)}
                      className={THEME.input.text}
                      placeholder="Ex: USP, UNICAMP, Campo Real, etc."
                    />
                  </div>
                  <div>
                    <label className={THEME.input.label}>Curso</label>
                    <input 
                      type="text" 
                      value={editCourse}
                      onChange={e => setEditCourse(e.target.value)}
                      placeholder="Ex: Engenharia de Software"
                      className={THEME.input.text}
                    />
                  </div>
                  <div>
                    <label className={THEME.input.label}>Período / Ano</label>
                    <input 
                      type="text" 
                      value={editPeriod}
                      onChange={e => setEditPeriod(e.target.value)}
                      placeholder="Ex: 5º Período"
                      className={THEME.input.text}
                    />
                  </div>

                  {/* Seção de alteração de senha */}
                  <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 flex flex-col gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
                        Alterar Senha
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-400 block">
                        Deixe os campos abaixo em branco caso não queira alterar sua senha atual.
                      </span>
                    </div>

                    <div>
                      <label className={THEME.input.label}>Nova Senha</label>
                      <div className="relative">
                        <input 
                          type={showEditPassword ? 'text' : 'password'}
                          value={editPassword}
                          onChange={e => setEditPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className={THEME.input.text + " pr-10 font-mono"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={THEME.input.label}>Confirmar Nova Senha</label>
                      <div className="relative">
                        <input 
                          type={showEditConfirmPassword ? 'text' : 'password'}
                          value={editConfirmPassword}
                          onChange={e => setEditConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          className={THEME.input.text + " pr-10 font-mono"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {showEditConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-3 justify-end mt-4 border-t border-gray-100 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      className={THEME.button.secondary + " py-2 px-4"}
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      className={THEME.button.primary + " py-2 px-4"}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-5 text-xs font-semibold">
                  <div className={THEME.profileModal.infoCard}>
                    <div className="col-span-2">
                      <span className={THEME.profileModal.infoLabel}>E-mail</span>
                      <span className={THEME.profileModal.infoValue}>{currentUser.email}</span>
                    </div>
                    <div>
                      <span className={THEME.profileModal.infoLabel}>Registro Acadêmico (RA)</span>
                      <span className={THEME.profileModal.infoValue}>{currentUser.ra || '—'}</span>
                    </div>
                    <div>
                      <span className={THEME.profileModal.infoLabel}>Instituição</span>
                      <span className={THEME.profileModal.infoValue}>{currentUser.institution || '—'}</span>
                    </div>
                    <div>
                      <span className={THEME.profileModal.infoLabel}>Curso</span>
                      <span className={THEME.profileModal.infoValue}>{currentUser.course || '—'}</span>
                    </div>
                    <div>
                      <span className={THEME.profileModal.infoLabel}>Período / Ano</span>
                      <span className={THEME.profileModal.infoValue}>{currentUser.period || '—'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 justify-end mt-2 pt-2 border-t border-gray-100">
                    <button 
                      onClick={() => {
                        setShowProfile(false);
                        onLogout();
                      }}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da Conta</span>
                    </button>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className={THEME.button.primary + " py-2 px-4 !font-sans"}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Perfil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
