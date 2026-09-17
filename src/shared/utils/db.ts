import { User, Event, Workshop, Enrollment, Attendance, HomeBanner, SystemLog, Certificate, PaymentStatus, FinancialExpense, SmtpSettings, Voucher, VoucherDiscountType } from '../../types';
import {
  SEEDED_USERS,
  SEEDED_EVENTS,
  SEEDED_WORKSHOPS,
  SEEDED_ENROLLMENTS,
  SEEDED_ATTENDANCE,
  SEEDED_BANNERS,
  SEEDED_LOGS,
  SEEDED_EXPENSES,
  SEEDED_VOUCHERS
} from '../../data/seedData';

// Chaves do banco de dados no localStorage
const KEYS = {
  USERS: 'cre_users',
  EVENTS: 'cre_events',
  WORKSHOPS: 'cre_workshops',
  ENROLLMENTS: 'cre_enrollments',
  ATTENDANCE: 'cre_attendance',
  BANNERS: 'cre_banners',
  LOGS: 'cre_logs',
  CERTIFICATES: 'cre_certificates',
  CURRENT_USER: 'cre_current_user',
  EXPENSES: 'cre_expenses',
  VOUCHERS: 'cre_vouchers',
  AUTH_TOKEN: 'cre_auth_token'
};

// Leitura e escrita genéricas no localStorage
function read<T>(key: string, defaultData: T): T {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultData;
  }
}

function write<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Envio assíncrono via API para sincronização com o backend Node MySQL (transporta token JWT Bearer quando disponível)
function apiPost(endpoint: string, body: any): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(KEYS.AUTH_TOKEN) : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  }).then(async res => {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn(`[MySQL Sync Warning] Falha no endpoint ${endpoint}:`, data?.error || res.statusText);
    }
    return data;
  }).catch(err => {
    console.warn(`[MySQL Sync Warning] Não foi possível sincronizar o endpoint ${endpoint}:`, err.message);
    return null;
  });
}

// Mecanismo do Banco de Dados com Sincronização em Tempo Real com MySQL
export const DB = {
  // Inicialização
  init(): void {
    const CLEAN_SCHEMA_VERSION = 'v4_single_root_deletable';
    if (typeof window !== 'undefined' && localStorage.getItem('cre_schema_clean') !== CLEAN_SCHEMA_VERSION) {
      localStorage.removeItem(KEYS.USERS);
      localStorage.removeItem(KEYS.EVENTS);
      localStorage.removeItem(KEYS.WORKSHOPS);
      localStorage.removeItem(KEYS.ENROLLMENTS);
      localStorage.removeItem(KEYS.ATTENDANCE);
      localStorage.removeItem(KEYS.BANNERS);
      localStorage.removeItem(KEYS.LOGS);
      localStorage.removeItem(KEYS.EXPENSES);
      localStorage.removeItem(KEYS.VOUCHERS);
      localStorage.removeItem(KEYS.CURRENT_USER);
      localStorage.setItem('cre_schema_clean', CLEAN_SCHEMA_VERSION);
    }

    read<User[]>(KEYS.USERS, SEEDED_USERS);
    read<Event[]>(KEYS.EVENTS, SEEDED_EVENTS);
    read<Workshop[]>(KEYS.WORKSHOPS, SEEDED_WORKSHOPS);

    // Remove duplicatas e higieniza o armazenamento inicial
    const existingEnrollments = read<Enrollment[]>(KEYS.ENROLLMENTS, SEEDED_ENROLLMENTS);
    const uniqueEnrollments = Array.from(new Map(existingEnrollments.map(e => [e.id, e])).values());
    if (uniqueEnrollments.length !== existingEnrollments.length) {
      write(KEYS.ENROLLMENTS, uniqueEnrollments);
    }

    read<Attendance[]>(KEYS.ATTENDANCE, SEEDED_ATTENDANCE);
    read<HomeBanner[]>(KEYS.BANNERS, SEEDED_BANNERS);
    read<SystemLog[]>(KEYS.LOGS, SEEDED_LOGS);
    read<Certificate[]>(KEYS.CERTIFICATES, []);
    read<FinancialExpense[]>(KEYS.EXPENSES, SEEDED_EXPENSES);
    read<Voucher[]>(KEYS.VOUCHERS, SEEDED_VOUCHERS);
  },

  // Executa consulta completa de download do backend para sincronizar o cache local
  async syncWithBackend(onSuccess?: () => void): Promise<void> {
    try {
      const response = await fetch('/api/db/get-state');
      const json = await response.json();
      if (json && json.success && json.data) {
        const d = json.data;
        
        // Sincroniza com o localStorage do navegador removendo duplicatas
        write(KEYS.USERS, d.users ? Array.from(new Map(d.users.map((u: any) => [u.id, u])).values()) : []);
        write(KEYS.EVENTS, d.events ? Array.from(new Map(d.events.map((e: any) => [e.id, e])).values()) : []);
        write(KEYS.WORKSHOPS, d.workshops ? Array.from(new Map(d.workshops.map((w: any) => [w.id, w])).values()) : []);
        write(KEYS.ENROLLMENTS, d.enrollments ? Array.from(new Map(d.enrollments.map((en: any) => [en.id, en])).values()) : []);
        write(KEYS.ATTENDANCE, d.attendance ? Array.from(new Map(d.attendance.map((a: any) => [a.id, a])).values()) : []);
        write(KEYS.BANNERS, d.banners ? Array.from(new Map(d.banners.map((b: any) => [b.id, b])).values()) : []);
        write(KEYS.LOGS, d.logs || []);
        if (d.vouchers) {
          write(KEYS.VOUCHERS, Array.from(new Map(d.vouchers.map((v: any) => [v.id, v])).values()));
        }
        if (d.certificates) {
          write(KEYS.CERTIFICATES, Array.from(new Map(d.certificates.map((c: any) => [c.id, c])).values()));
        }
        
        // Sincroniza despesas defensivamente (usa dados locais caso o backend ainda não as suporte)
        if (d.expenses) {
          write(KEYS.EXPENSES, d.expenses);
        }

        // Sincroniza configurações globais do sistema (Pix, WhatsApp, E-mail de Suporte, Banner de Login, status SMTP)
        if (d.settings) {
          if (d.settings.pixKey) localStorage.setItem('cre_pix_key', d.settings.pixKey);
          if (d.settings.whatsapp) localStorage.setItem('cre_whatsapp', d.settings.whatsapp);
          if (d.settings.supportEmail) localStorage.setItem('cre_support_email', d.settings.supportEmail);
          if (d.settings.loginBannerImage) localStorage.setItem('cre_login_banner_image', d.settings.loginBannerImage);
          if (d.settings.isSmtpWorking !== undefined) {
            const curSmtp = this.getSmtpSettings();
            const syncedSmtp: SmtpSettings = {
              ...curSmtp,
              isWorking: d.settings.isSmtpWorking,
              status: d.settings.smtpStatus || (d.settings.isSmtpWorking ? 'working' : curSmtp.status),
              lastTestedAt: d.settings.smtpLastTestedAt || curSmtp.lastTestedAt
            };
            write('cre_smtp_settings', syncedSmtp);
          }
        }

        // Sincroniza detalhes do perfil do usuário ativo caso haja alguém conectado
        const curUser = this.getCurrentUser();
        if (curUser) {
          const matchedUser = (d.users as User[]).find(u => u.id === curUser.id);
          if (matchedUser) {
            this.setCurrentUser(matchedUser);
          }
        }
        
        console.log('⚡ [MySQL Full-Sync] Cache local sincronizado com tabelas MySQL do servidor!');
        if (onSuccess) onSuccess();
      }
    } catch (e: any) {
      console.warn('⚠️ [MySQL Sync] Servidor inacessível para sincronização total. Operando no modo local cache.', e.message);
    }
  },

  // Logs do Sistema
  addLog(action: string, email: string, role: string, details: string): void {
    const logs = read<SystemLog[]>(KEYS.LOGS, []);
    const newLog: SystemLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      userEmail: email,
      userRole: role as any,
      details,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog); // Insere novos logs no início
    write(KEYS.LOGS, logs);

    // Sincroniza com o MySQL
    apiPost('/api/db/write-log', newLog);
  },

  getLogs(): SystemLog[] {
    return read<SystemLog[]>(KEYS.LOGS, []);
  },

  // Sessão do Usuário Atual
  getCurrentUser(): User | null {
    const u = localStorage.getItem(KEYS.CURRENT_USER);
    if (!u) return null;
    try {
      const parsed = JSON.parse(u) as any;
      if (parsed) {
        if (parsed.role === 'ALUNO') {
          parsed.role = 'PARTICIPANTE';
          localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(parsed));
        } else if (parsed.role === 'PROFESSOR') {
          parsed.role = 'ORGANIZADOR';
          localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(parsed));
        }
      }
      return parsed as User;
    } catch {
      return null;
    }
  },

  getAuthToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem(KEYS.AUTH_TOKEN) : null;
  },

  setAuthToken(token: string | null): void {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(KEYS.AUTH_TOKEN, token);
      } else {
        localStorage.removeItem(KEYS.AUTH_TOKEN);
      }
    }
  },

  setCurrentUser(user: User | null): void {
    if (user) {
      if ((user as any).role === 'ALUNO') user.role = 'PARTICIPANTE';
      if ((user as any).role === 'PROFESSOR') user.role = 'ORGANIZADOR';
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
      localStorage.removeItem(KEYS.AUTH_TOKEN);
    }
  },

  async login(email: string, password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'E-mail ou senha incorretos.' };
      }
      if (data.token) {
        this.setAuthToken(data.token);
      }
      this.setCurrentUser(data.user);
      this.addLog('USER_LOGIN', data.user.email, data.user.role, `Usuário efetuou login via Portal: ${data.user.name}`);
      return { success: true, user: data.user };
    } catch (err: any) {
      // Fallback local caso a rede esteja desconectada
      const users = this.getUsers();
      const match = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (match) {
        this.setCurrentUser(match);
        return { success: true, user: match };
      }
      return { success: false, error: 'Falha na comunicação com o servidor de autenticação.' };
    }
  },

  // Tabela de Usuários
  getUsers(): User[] {
    const users = read<User[]>(KEYS.USERS, SEEDED_USERS);
    let updated = false;

    // Migra quaisquer papéis legados
    users.forEach(u => {
      if ((u as any).role === 'ALUNO') {
        u.role = 'PARTICIPANTE';
        updated = true;
      } else if ((u as any).role === 'PROFESSOR') {
        u.role = 'ORGANIZADOR';
        updated = true;
      }
    });

    if (updated) {
      write(KEYS.USERS, users);
    }
    return users;
  },

  updateUser(id: string, updatedFields: Partial<User>, actor?: User): User {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuário não encontrado');
    
    const targetUser = users[idx];
    const effectiveActor = actor || this.getCurrentUser();

    // Regra de Segurança: Apenas o próprio usuário ROOT pode atribuir ou editar o nível ROOT
    if (updatedFields.role && updatedFields.role !== targetUser.role) {
      if (updatedFields.role === 'ROOT' || targetUser.role === 'ROOT') {
        if (!effectiveActor || effectiveActor.role !== 'ROOT') {
          throw new Error('Apenas o usuário com nível ROOT tem permissão para atribuir ou editar o cargo ROOT.');
        }
      }
    }

    // Se estiver atualizando email, verificar duplicação
    if (updatedFields.email) {
      const normalizedEmail = updatedFields.email.toLowerCase().trim();
      const duplicate = users.find(u => u.id !== id && u.email.toLowerCase().trim() === normalizedEmail);
      if (duplicate) {
        throw new Error('Este endereço de e-mail já está sendo utilizado por outro usuário.');
      }
      updatedFields.email = normalizedEmail;
    }

    users[idx] = { ...users[idx], ...updatedFields };
    write(KEYS.USERS, users);
    
    // Se estiver atualizando o usuário conectado no momento, atualiza a sessão ativa
    const cur = this.getCurrentUser();
    if (cur && cur.id === id) {
      const safeCur = { ...users[idx] };
      delete safeCur.password;
      this.setCurrentUser(safeCur);
    }

    // Sincroniza com o MySQL
    apiPost('/api/db/write-user-update', { id, updatedFields });

    return users[idx];
  },

  deleteUser(id: string, actor: User): void {
    const users = this.getUsers();
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) throw new Error('Usuário não encontrado.');

    if (actor.role !== 'ROOT' && actor.role !== 'COORDENADOR') {
      throw new Error('Apenas Administradores com nível ROOT ou Coordenadores podem excluir usuários.');
    }

    // Coordenador não pode excluir ROOT ou outros COORDENADORES
    if (actor.role === 'COORDENADOR' && (targetUser.role === 'ROOT' || targetUser.role === 'COORDENADOR')) {
      throw new Error('Coordenadores não têm permissão para excluir contas de Administrador ROOT ou de outros Coordenadores.');
    }

    const updatedUsers = users.filter(u => u.id !== id);
    write(KEYS.USERS, updatedUsers);

    // Se estiver excluindo o próprio usuário, limpa a sessão ativa
    if (actor.id === id) {
      this.setCurrentUser(null);
    }

    this.addLog(
      'USER_DELETE',
      actor.email,
      actor.role,
      `Exclusão definitiva de usuário: ${targetUser.name} (${targetUser.email}) - Cargo: ${targetUser.role}`
    );

    // Sincroniza com o MySQL/backend
    apiPost('/api/db/write-user-delete', { id });
  },

  registerUser(user: Omit<User, 'id'> & { password?: string }): User {
    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      throw new Error('E-mail já cadastrado no sistema.');
    }
    const newUser: User = {
      ...user,
      institution: user.institution?.trim() || 'Centro Universitário Campo Real',
      id: `user_${Date.now()}`
    };
    users.push(newUser);
    write(KEYS.USERS, users);
    
    this.addLog(
      'USER_REGISTER',
      user.email,
      user.role,
      `Novo usuário registrado: ${user.name} como ${user.role}`
    );

    // Sincroniza com o backend e captura o token
    apiPost('/api/auth/register', newUser).then(data => {
      if (data && data.token && !this.getAuthToken()) {
        this.setAuthToken(data.token);
      }
      if (data && data.user) {
        const curUsers = this.getUsers();
        const uIdx = curUsers.findIndex(u => u.id === newUser.id || u.email.toLowerCase() === newUser.email.toLowerCase());
        if (uIdx !== -1) {
          curUsers[uIdx] = { ...curUsers[uIdx], ...data.user };
          write(KEYS.USERS, curUsers);
        }
        const cur = this.getCurrentUser();
        if (cur && (cur.id === newUser.id || cur.email.toLowerCase() === newUser.email.toLowerCase())) {
          this.setCurrentUser({ ...cur, ...data.user });
        }
      }
    });

    // Despacha automaticamente o e-mail de boas-vindas / registro via SMTP configurado
    this.sendWelcomeNotification(newUser).catch(err => {
      console.warn('[SMTP Dispatch Notice] Não foi possível despachar e-mail de boas-vindas:', err?.message);
    });

    return newUser;
  },

  // Tabela de Eventos
  getEvents(): Event[] {
    return read<Event[]>(KEYS.EVENTS, SEEDED_EVENTS);
  },

  saveEvent(event: Omit<Event, 'id' | 'status' | 'creatorId' | 'creatorName'>, creator: User): Event {
    const events = this.getEvents();
    const newEvent: Event = {
      ...event,
      id: `event_${Date.now()}`,
      status: (creator.role === 'COORDENADOR' || creator.role === 'ROOT') ? 'PUBLICADO' : 'ANALISE', // Coordenador/Root publica automaticamente
      creatorId: creator.id,
      creatorName: creator.name,
      isFeatured: false
    };
    events.unshift(newEvent);
    write(KEYS.EVENTS, events);
    
    this.addLog(
      'CREATE_EVENT',
      creator.email,
      creator.role,
      `Criou o evento "${event.name}" (Status: ${newEvent.status})`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-event-save', newEvent);

    return newEvent;
  },

  updateEvent(id: string, updatedFields: Partial<Event>, actor: User): Event {
    const events = this.getEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Evento não encontrado');
    
    // Verificação de permissões
    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT' && events[idx].creatorId !== actor.id) {
      throw new Error('Apenas o criador deste evento ou o coordenador/root podem editá-lo.');
    }

    events[idx] = { ...events[idx], ...updatedFields };
    write(KEYS.EVENTS, events);

    this.addLog(
      'UPDATE_EVENT',
      actor.email,
      actor.role,
      `Editou o evento "${events[idx].name}". Mudanças aplicadas.`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-event-update', { id, updatedFields });

    return events[idx];
  },

  approveEvent(id: string, approve: boolean, actor: User): Event {
    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT') throw new Error('Apenas o coordenador ou root podem aprovar eventos.');
    const events = this.getEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Evento não encontrado');

    events[idx].status = approve ? 'PUBLICADO' : 'CANCELADO';
    write(KEYS.EVENTS, events);

    this.addLog(
      approve ? 'APPROVE_EVENT' : 'REJECT_EVENT',
      actor.email,
      actor.role,
      `Coordenador ${approve ? 'aprovou' : 'reprovou'} o evento "${events[idx].name}"`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-event-update', { id, updatedFields: { status: events[idx].status } });

    return events[idx];
  },

  deleteEvent(id: string, actor: User): void {
    const events = this.getEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Evento não encontrado');

    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT' && events[idx].creatorId !== actor.id) {
      throw new Error('Apenas o criador deste evento ou o coordenador/root podem remover eventos.');
    }

    const filtered = events.filter(e => e.id !== id);
    write(KEYS.EVENTS, filtered);

    // Limpa registros filhos associados no localStorage
    const workshops = this.getWorkshops();
    const filteredWorkshops = workshops.filter(w => w.eventId !== id);
    write(KEYS.WORKSHOPS, filteredWorkshops);

    const enrollments = read<Enrollment[]>(KEYS.ENROLLMENTS, SEEDED_ENROLLMENTS);
    const filteredEnrollments = enrollments.filter(en => en.eventId !== id);
    write(KEYS.ENROLLMENTS, filteredEnrollments);

    const attendance = read<Attendance[]>(KEYS.ATTENDANCE, SEEDED_ATTENDANCE);
    const filteredAttendance = attendance.filter(a => a.eventId !== id);
    write(KEYS.ATTENDANCE, filteredAttendance);

    const certificates = read<Certificate[]>(KEYS.CERTIFICATES, []);
    const filteredCertificates = certificates.filter(c => c.eventId !== id);
    write(KEYS.CERTIFICATES, filteredCertificates);

    const banners = read<HomeBanner[]>(KEYS.BANNERS, SEEDED_BANNERS);
    const updatedBanners = banners.map(b => b.linkToEventId === id ? { ...b, linkToEventId: undefined } : b);
    write(KEYS.BANNERS, updatedBanners);

    this.addLog(
      'DELETE_EVENT',
      actor.email,
      actor.role,
      `Removeu o evento de ID: ${id} e título: "${events[idx].name}"`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-event-delete', { id });
  },

  // Tabela de Workshops / Minicursos
  getWorkshops(eventId?: string): Workshop[] {
    const all = read<Workshop[]>(KEYS.WORKSHOPS, SEEDED_WORKSHOPS);
    if (eventId) {
      return all.filter(w => w.eventId === eventId);
    }
    return all;
  },

  saveWorkshop(workshop: Omit<Workshop, 'id' | 'enrolledCount'>, actor: User): Workshop {
    const events = this.getEvents();
    const parentEvent = events.find(e => e.id === workshop.eventId);
    if (!parentEvent) {
      throw new Error('Evento associado não encontrado para o workshop.');
    }

    const isCreator = parentEvent.creatorId === actor.id;
    const isCoordinatorOrRoot = actor.role === 'COORDENADOR' || actor.role === 'ROOT';

    if (!isCreator && !isCoordinatorOrRoot) {
      throw new Error('Apenas o criador do evento ou a coordenação/root podem adicionar workshops.');
    }

    if (parentEvent.status === 'ENCERRADO') {
      throw new Error('Não é possível adicionar workshops a um evento que já está ENCERRADO.');
    }

    const workshops = this.getWorkshops();
    const newWs: Workshop = {
      ...workshop,
      id: `ws_${Date.now()}`,
      enrolledCount: 0
    };
    workshops.push(newWs);
    write(KEYS.WORKSHOPS, workshops);

    this.addLog(
      'CREATE_WORKSHOP',
      actor.email,
      actor.role,
      `Criou o workshop "${workshop.name}" para o evento de ID ${workshop.eventId}`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-workshop-save', newWs);

    return newWs;
  },

  updateWorkshop(id: string, updatedFields: Partial<Workshop>, actor: User): Workshop {
    const workshops = this.getWorkshops();
    const idx = workshops.findIndex(w => w.id === id);
    if (idx === -1) throw new Error('Workshop não encontrado');

    const updated = {
      ...workshops[idx],
      ...updatedFields
    };
    workshops[idx] = updated;
    write(KEYS.WORKSHOPS, workshops);

    this.addLog(
      'UPDATE_WORKSHOP',
      actor.email,
      actor.role,
      `Editou o workshop "${updated.name}"`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-workshop-save', updated);

    return updated;
  },

  deleteWorkshop(id: string, actor: User): void {
    const workshops = this.getWorkshops();
    const ws = workshops.find(w => w.id === id);
    const filtered = workshops.filter(w => w.id !== id);
    write(KEYS.WORKSHOPS, filtered);

    this.addLog(
      'DELETE_WORKSHOP',
      actor.email,
      actor.role,
      `Removeu o workshop "${ws?.name || id}"`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-workshop-delete', { id });
  },

  // Tabela de Inscrições
  getEnrollments(userId?: string): Enrollment[] {
    const all = read<Enrollment[]>(KEYS.ENROLLMENTS, SEEDED_ENROLLMENTS);
    // Garante a remoção de duplicatas por ID
    const uniqueMap = new Map<string, Enrollment>();
    all.forEach(item => {
      if (item && item.id) {
        uniqueMap.set(item.id, item);
      }
    });
    const unique = Array.from(uniqueMap.values());
    if (userId) {
      return unique.filter(e => e.userId === userId);
    }
    return unique;
  },

  createEnrollment(params: {
    userId: string;
    eventId: string;
    selectedWorkshops: string[];
    paymentOption: 'CREDITO' | 'PIX' | 'GRATUITO';
    voucherCode?: string;
  }): Enrollment {
    const users = this.getUsers();
    const events = this.getEvents();
    const workshops = this.getWorkshops();

    const user = users.find(u => u.id === params.userId);
    const event = events.find(e => e.id === params.eventId);
    if (!user || !event) throw new Error('Usuário ou Evento inválido');

    // Verificação de segurança: apenas uma inscrição por evento
    const existing = this.getEnrollments(params.userId).find(en => en.eventId === params.eventId && en.status !== 'CANCELADO');
    if (existing) {
      throw new Error('Você já possui uma inscrição ativa neste evento principal.');
    }

    // Verificação de capacidade de vagas do evento
    const activeEnrollmentsForEvent = this.getEnrollments().filter(e => e.eventId === params.eventId && e.status === 'APROVADO');
    if (activeEnrollmentsForEvent.length >= event.maxParticipants) {
      throw new Error('Desculpe, o limite de vagas para este evento foi atingido.');
    }

    // Verifica e calcula valores adicionais dos workshops
    let grossTotal = event.price;
    const selectedWsObjects: Workshop[] = [];

    params.selectedWorkshops.forEach(wsId => {
      const ws = workshops.find(w => w.id === wsId);
      if (ws) {
        if (ws.enrolledCount >= ws.maxParticipants) {
          throw new Error(`Desculpe, o workshop "${ws.name}" não possui mais vagas.`);
        }
        selectedWsObjects.push(ws);
        grossTotal += ws.price;
      }
    });

    let originalValue = grossTotal;
    let totalValue = grossTotal;
    let voucherDiscount = 0;
    let appliedVoucher: Voucher | null = null;

    // Aplica voucher/cupom de desconto caso informado
    if (params.voucherCode && params.voucherCode.trim()) {
      const validation = this.validateVoucher(params.voucherCode.trim(), event.id, grossTotal);
      if (!validation.valid || !validation.voucher) {
        throw new Error(validation.message || 'Voucher inválido ou não aplicável.');
      }
      appliedVoucher = validation.voucher;
      voucherDiscount = validation.discountAmount;
      totalValue = validation.finalTotal;
    }

    const enrollmentId = `enroll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Cria o objeto de inscrição
    const newEnrollment: Enrollment = {
      id: enrollmentId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRa: user.ra,
      eventId: event.id,
      eventName: event.name,
      selectedWorkshops: params.selectedWorkshops,
      totalValue,
      originalValue: appliedVoucher ? originalValue : undefined,
      voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
      voucherDiscount: appliedVoucher ? voucherDiscount : undefined,
      status: totalValue <= 0 ? 'APROVADO' : 'PENDENTE', // Eventos gratuitos ou com voucher de 100% são pré-aprovados!
      createdAt: new Date().toISOString()
    };

    const allEnroll = this.getEnrollments();
    const existingIndex = allEnroll.findIndex(e => e.id === newEnrollment.id);
    if (existingIndex >= 0) {
      allEnroll[existingIndex] = newEnrollment;
    } else {
      allEnroll.push(newEnrollment);
    }
    write(KEYS.ENROLLMENTS, allEnroll);

    // Registra o uso do voucher
    if (appliedVoucher) {
      this.applyVoucherUsage(appliedVoucher.code, {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        enrollmentId: newEnrollment.id,
        discountApplied: voucherDiscount
      });
    }

    // Incrementa contadores de inscritos dos workshops se aprovado imediatamente
    if (newEnrollment.status === 'APROVADO') {
      this.applyEnrollmentCapacityIncreases(params.selectedWorkshops);
    }

    const logDetails = appliedVoucher 
      ? `Criou inscrição no evento "${event.name}" com voucher ${appliedVoucher.code} (Desconto: R$ ${voucherDiscount.toFixed(2)}, Total Final: R$ ${totalValue.toFixed(2)})`
      : `Criou inscrição no evento "${event.name}" com valor total R$ ${totalValue.toFixed(2)}`;

    this.addLog(
      'CHECKOUT_CONFIRMED',
      user.email,
      user.role,
      logDetails
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-enrollment-save', newEnrollment);

    // Despacha automaticamente o e-mail de notificação de inscrição via SMTP configurado
    this.sendEnrollmentNotification(newEnrollment).catch(err => {
      console.warn('[SMTP Dispatch Notice] Não foi possível despachar e-mail de inscrição:', err?.message);
    });

    return newEnrollment;
  },

  applyEnrollmentCapacityIncreases(workshopIds: string[]): void {
    const workshops = read<Workshop[]>(KEYS.WORKSHOPS, []);
    const updated = workshops.map(w => {
      if (workshopIds.includes(w.id)) {
        return { ...w, enrolledCount: w.enrolledCount + 1 };
      }
      return w;
    });
    write(KEYS.WORKSHOPS, updated);

    // Sincroniza com o MySQL
    apiPost('/api/db/write-workshop-increment', { workshopIds });
  },

  updateEnrollmentStatus(id: string, status: PaymentStatus, actor: User): Enrollment {
    const all = this.getEnrollments();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Inscrição não encontrada');

    const oldStatus = all[idx].status;
    all[idx].status = status;
    write(KEYS.ENROLLMENTS, all);

    // Se o pagamento for aprovado, incrementa os contadores dos workshops caso ainda não tenham sido contabilizados
    if (status === 'APROVADO' && oldStatus !== 'APROVADO') {
      this.applyEnrollmentCapacityIncreases(all[idx].selectedWorkshops);
    }

    this.addLog(
      'UPDATE_PAYMENT',
      actor.email,
      actor.role,
      `Alterou pagamento da inscrição ${id} para ${status}`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-enrollment-status', { id, status });

    // Despacha automaticamente o e-mail de pagamento aprovado caso transicione para APROVADO
    if (status === 'APROVADO' && oldStatus !== 'APROVADO') {
      this.sendPaymentApprovedNotification(all[idx]).catch(err => {
        console.warn('[SMTP Dispatch Notice] Não foi possível despachar e-mail de pagamento aprovado:', err?.message);
      });
    }

    return all[idx];
  },

  updateEnrollmentWorkshops(enrollmentId: string, newWorkshopIds: string[]): Enrollment {
    const allEnroll = this.getEnrollments();
    const idx = allEnroll.findIndex(e => e.id === enrollmentId);
    if (idx === -1) throw new Error('Inscrição não encontrada');

    const enrollment = allEnroll[idx];
    const oldWorkshops = enrollment.selectedWorkshops || [];

    // Calcula adições e remoções de workshops
    const added = newWorkshopIds.filter(id => !oldWorkshops.includes(id));
    const removed = oldWorkshops.filter(id => !newWorkshopIds.includes(id));

    // Verifica capacidade de vagas para os adicionados
    const workshops = this.getWorkshops();
    added.forEach(wsId => {
      const ws = workshops.find(w => w.id === wsId);
      if (ws && ws.enrolledCount >= ws.maxParticipants) {
        throw new Error(`Desculpe, o workshop "${ws.name}" não possui mais vagas.`);
      }
    });

    // Atualiza os contadores de inscritos ativos dos workshops
    const updatedWorkshops = workshops.map(w => {
      let enrolledCount = w.enrolledCount;
      if (added.includes(w.id)) {
        enrolledCount = enrolledCount + 1;
      }
      if (removed.includes(w.id)) {
        enrolledCount = Math.max(0, enrolledCount - 1);
      }
      return { ...w, enrolledCount };
    });
    write(KEYS.WORKSHOPS, updatedWorkshops);

    // Recalcula o valor total
    const event = this.getEvents().find(e => e.id === enrollment.eventId);
    let totalValue = event ? event.price : 0;
    newWorkshopIds.forEach(wsId => {
      const ws = updatedWorkshops.find(w => w.id === wsId);
      if (ws) {
        totalValue += ws.price;
      }
    });

    // Salva a inscrição modificada
    enrollment.selectedWorkshops = newWorkshopIds;
    enrollment.totalValue = totalValue;

    if (totalValue === 0) {
      enrollment.status = 'APROVADO';
    }

    allEnroll[idx] = enrollment;
    write(KEYS.ENROLLMENTS, allEnroll);

    this.addLog(
      'UPDATE_ENROLLMENT_WORKSHOPS',
      enrollment.userEmail,
      'PARTICIPANTE',
      `Atualizou workshops da Semana Acadêmica "${enrollment.eventName}"`
    );

    // Sincroniza com a API
    apiPost('/api/db/write-enrollment-save', enrollment);
    apiPost('/api/db/write-workshop-increment', { workshopIds: added });

    return enrollment;
  },

  // Presença (Check-in)
  getAttendance(eventId?: string, workshopId?: string): Attendance[] {
    const all = read<Attendance[]>(KEYS.ATTENDANCE, SEEDED_ATTENDANCE);
    let res = all;
    if (eventId) {
      res = res.filter(a => a.eventId === eventId);
    }
    if (workshopId) {
      res = res.filter(a => a.workshopId === workshopId);
    }
    return res;
  },

  registerAttendance(userId: string, eventId: string, workshopId?: string, checkedInByActor?: User): Attendance {
    const all = this.getAttendance();
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('Participante não encontrado para check-in.');

    // Proteção contra duplicidade de check-in
    const exists = all.some(a => a.userId === userId && a.eventId === eventId && a.workshopId === workshopId);
    if (exists) {
      throw new Error(`Check-in já realizado anteriormente para este ${workshopId ? 'Workshop' : 'Evento'}.`);
    }

    const newAtt: Attendance = {
      id: `att_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRa: user.ra,
      eventId,
      workshopId,
      checkedInAt: new Date().toISOString(),
      checkedInBy: checkedInByActor ? checkedInByActor.name : 'QR Code Scanner'
    };

    all.push(newAtt);
    write(KEYS.ATTENDANCE, all);

    // Registra este check-in nos logs
    this.addLog(
      'CHECK_IN',
      user.email,
      user.role,
      `Check-in de presença realizado para ${workshopId ? 'Workshop' : 'Evento Geral'} por ${newAtt.checkedInBy}`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-attendance-save', newAtt);

    // Gera o certificado automaticamente se o check-in geral ocorrer e a inscrição estiver aprovada
    if (!workshopId) {
      this.autoGenerateCertificate(user, eventId);
    }

    return newAtt;
  },

  removeAttendance(id: string, actor: User): void {
    const all = read<Attendance[]>(KEYS.ATTENDANCE, []);
    const filtered = all.filter(a => a.id !== id);
    write(KEYS.ATTENDANCE, filtered);

    this.addLog(
      'REMOVE_CHECK_IN',
      actor.email,
      actor.role,
      `Presença de ID ${id} removida por ${actor.name} (${actor.role}).`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-attendance-remove', { id });
  },

  // Certificados (Verificáveis por Código Hash e QR Code)
  getCertificates(userId?: string): Certificate[] {
    const all = read<Certificate[]>(KEYS.CERTIFICATES, []);
    if (userId) {
      return all.filter(c => c.userId === userId);
    }
    return all;
  },

  autoGenerateCertificate(user: User, eventId: string): Certificate | null {
    const certs = this.getCertificates();
    // Verifica se o certificado já existe
    const exists = certs.find(c => c.userId === user.id && c.eventId === eventId);
    if (exists) return exists;

    const events = this.getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) return null;

    // Calcula a carga horária acadêmica calculada
    let hours = 0;
    let workshopsDetails = "";

    if (event.category === 'SEMANA ACADÊMICA') {
      // Obter presenças do usuário neste evento
      const atts = this.getAttendance(eventId).filter(a => a.userId === user.id && a.workshopId !== undefined);
      const wsIds = atts.map(a => a.workshopId);
      const wsObjList = this.getWorkshops(eventId).filter(w => wsIds.includes(w.id));

      if (wsObjList.length > 0) {
        // Concede horas totais da Semana Acadêmica com workshops concluídos
        hours = 20;
        const details = wsObjList.map(w => `• ${w.name} (${w.startTime && w.endTime ? `${w.startTime} às ${w.endTime}` : w.time || ''})`).join('\n');
        workshopsDetails = `Workshops Integrados Concluintes:\n${details}`;
      } else {
        // Carga padrão caso apenas check-in geral do portão ocorra sem oficinas
        hours = 20;
        workshopsDetails = "Participação em palestras gerais de Semana Acadêmica.";
      }
    } else {
      const baseHours = 4; // mínimo
      const categoryBonus = event.category === 'CONGRESSO' ? 30 : 6;
      hours = baseHours + categoryBonus;
    }

    // Código hash aleatório verificável
    const randHash = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();

    const newCert: Certificate = {
      id: `cert_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userRa: user.ra,
      eventId,
      eventName: event.name,
      hours,
      hash: `CRE-${randHash}`,
      issuedAt: new Date().toISOString(),
      coordinationSignature: 'Prof. Roberto de Almeida — Coordenador Geral',
      workshopsDetails
    };

    certs.push(newCert);
    write(KEYS.CERTIFICATES, certs);

    this.addLog(
      'CERTIFICATE_ISSUED',
      user.email,
      user.role,
      `Certificado de participação emitido automaticamente para ${user.name} em "${event.name}"`
    );

    // Sincroniza com o MySQL
    apiPost('/api/db/write-certificate-save', newCert);

    return newCert;
  },

  // Controle de Banners da Interface
  getBanners(): HomeBanner[] {
    return read<HomeBanner[]>(KEYS.BANNERS, SEEDED_BANNERS);
  },

  saveBanner(banner: Omit<HomeBanner, 'id'>, actor: User): HomeBanner {
    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT') throw new Error('Permissão negada');
    const banners = this.getBanners();
    const newB: HomeBanner = {
      ...banner,
      id: `banner_${Date.now()}`
    };
    banners.push(newB);
    write(KEYS.BANNERS, banners);

    // Sincroniza com o MySQL
    apiPost('/api/db/write-banner-save', newB);

    return newB;
  },

  toggleBanner(id: string, actor: User): void {
    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT') throw new Error('Permissão negada');
    const banners = this.getBanners();
    const idx = banners.findIndex(b => b.id === id);
    if (idx !== -1) {
      const nextState = !banners[idx].isActive;
      banners[idx].isActive = nextState;
      
      // Ao definir este banner como ativo, desativa todos os outros banners
      if (nextState) {
        banners.forEach(b => {
          if (b.id !== id) {
            b.isActive = false;
          }
        });
      }
      
      write(KEYS.BANNERS, banners);

      // Sincroniza com o MySQL
      apiPost('/api/db/write-banner-toggle', { id });
    }
  },

  // Gestão Financeira e de Despesas
  getExpenses(eventId?: string): FinancialExpense[] {
    const all = read<FinancialExpense[]>(KEYS.EXPENSES, SEEDED_EXPENSES);
    if (eventId) {
      return all.filter(e => e.eventId === eventId);
    }
    return all;
  },

  saveExpense(expense: Omit<FinancialExpense, 'id' | 'createdAt'>, actor: User): FinancialExpense {
    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT') {
      throw new Error('Apenas o coordenador ou root podem cadastrar despesas.');
    }
    const expenses = this.getExpenses();
    const newExp: FinancialExpense = {
      ...expense,
      id: `exp_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    expenses.unshift(newExp);
    write(KEYS.EXPENSES, expenses);

    this.addLog(
      'CREATE_EXPENSE',
      actor.email,
      actor.role,
      `Registrou ${expense.type === 'ENTRADA' ? 'entrada/patrocínio' : 'despesa/gasto'} de R$ ${expense.value.toFixed(2)} para o evento "${expense.eventName}": "${expense.description}"`
    );

    // Sincroniza com o MySQL caso haja suporte no backend, caso contrário mantém fallback seguro em apiPost
    apiPost('/api/db/write-expense-save', newExp);

    return newExp;
  },

  deleteExpense(id: string, actor: User): void {
    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT') {
      throw new Error('Apenas o coordenador ou root podem apagar despesas.');
    }
    const expenses = this.getExpenses();
    const target = expenses.find(e => e.id === id);
    if (!target) throw new Error('Despesa não encontrada');

    const filtered = expenses.filter(e => e.id !== id);
    write(KEYS.EXPENSES, filtered);

    this.addLog(
      'DELETE_EXPENSE',
      actor.email,
      actor.role,
      `Removeu despesa "${target.description}" de R$ ${target.value.toFixed(2)} do evento "${target.eventName}"`
    );

    apiPost('/api/db/write-expense-delete', { id });
  },

  getPixKey(): string {
    return localStorage.getItem('cre_pix_key') || 'financeiro@camporeal.edu.br';
  },

  setPixKey(key: string, actor?: User): void {
    const cleanKey = key.trim();
    localStorage.setItem('cre_pix_key', cleanKey);
    apiPost('/api/db/write-system-settings', { pixKey: cleanKey });
    if (actor) {
      this.addLog(
        'PIX_KEY_UPDATED',
        actor.email,
        actor.role,
        `Atualizou a chave Pix receptora do sistema para: "${cleanKey}"`
      );
    }
  },

  getWhatsapp(): string {
    return localStorage.getItem('cre_whatsapp') || '(42) 99999-9999';
  },

  setWhatsapp(number: string, actor?: User): void {
    const cleanNumber = number.trim();
    localStorage.setItem('cre_whatsapp', cleanNumber);
    apiPost('/api/db/write-system-settings', { whatsapp: cleanNumber });
    if (actor) {
      this.addLog(
        'WHATSAPP_UPDATED',
        actor.email,
        actor.role,
        `Atualizou o número de WhatsApp institucional para: "${cleanNumber}"`
      );
    }
  },

  getSupportEmail(): string {
    return localStorage.getItem('cre_support_email') || 'softweek@aeg.dev.br';
  },

  setSupportEmail(email: string, actor?: User): void {
    const trimmed = email.trim();
    localStorage.setItem('cre_support_email', trimmed);
    apiPost('/api/db/write-system-settings', { supportEmail: trimmed });
    if (actor) {
      this.addLog(
        'SUPPORT_EMAIL_UPDATED',
        actor.email,
        actor.role,
        `Atualizou o e-mail de destino dos formulários de suporte para: "${trimmed}"`
      );
    }
  },

  getLoginBannerImage(): string {
    return localStorage.getItem('cre_login_banner_image') || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200';
  },

  setLoginBannerImage(imageUrl: string, actor?: User): void {
    const trimmed = imageUrl.trim();
    localStorage.setItem('cre_login_banner_image', trimmed);
    apiPost('/api/db/write-system-settings', { loginBannerImage: trimmed });
    if (actor) {
      this.addLog(
        'LOGIN_BANNER_UPDATED',
        actor.email,
        actor.role,
        `Atualizou a imagem de banner da tela inicial de login`
      );
    }
  },

  saveSystemSettings(settings: { pixKey?: string; whatsapp?: string; supportEmail?: string; loginBannerImage?: string }, actor?: User): void {
    if (settings.pixKey !== undefined) localStorage.setItem('cre_pix_key', settings.pixKey.trim());
    if (settings.whatsapp !== undefined) localStorage.setItem('cre_whatsapp', settings.whatsapp.trim());
    if (settings.supportEmail !== undefined) localStorage.setItem('cre_support_email', settings.supportEmail.trim());
    if (settings.loginBannerImage !== undefined) localStorage.setItem('cre_login_banner_image', settings.loginBannerImage.trim());

    apiPost('/api/db/write-system-settings', settings);

    if (actor) {
      this.addLog(
        'SYSTEM_SETTINGS_UPDATED',
        actor.email,
        actor.role,
        `Atualizou as configurações globais do sistema (Recebimento, Suporte ou Banner de Login).`
      );
    }
  },

  async sendSupportMessage(params: {
    fromName: string;
    fromEmail: string;
    subject: string;
    message: string;
  }): Promise<{ success: boolean; message: string }> {
    const supportEmail = this.getSupportEmail();
    const smtpSettings = this.getSmtpSettings();

    try {
      const response = await fetch('/api/smtp/send-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: params.fromName,
          fromEmail: params.fromEmail,
          subject: params.subject,
          message: params.message,
          supportEmail,
          smtpSettings
        })
      });

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.warn('Erro ao despachar formulário de suporte:', err?.message);
      return {
        success: true,
        message: `Mensagem registrada para a equipe de suporte (${supportEmail}).`
      };
    }
  },

  getSmtpSettings(): SmtpSettings {
    const defaultSettings: SmtpSettings = {
      host: 'smtp.hostinger.com',
      port: 465,
      secure: 'SSL',
      user: '',
      password: '',
      pass: '',
      senderName: 'Campo Real Eventos',
      senderEmail: '',
      replyTo: '',
      notifyOnRegister: true,
      notifyOnEnrollment: true,
      notifyOnPaymentApproved: true,
      notifyOnPasswordRecovery: true,
      status: 'untested',
      isWorking: false
    };
    return read<SmtpSettings>('cre_smtp_settings', defaultSettings);
  },

  isSmtpWorking(): boolean {
    const settings = this.getSmtpSettings();
    return settings.isWorking === true || settings.status === 'working';
  },

  async fetchSmtpSettings(): Promise<SmtpSettings> {
    try {
      const token = this.getAuthToken();
      const res = await fetch('/api/smtp/settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const current = this.getSmtpSettings();
        const merged: SmtpSettings = {
          ...current,
          ...data.data,
          status: data.data.status || (data.data.isWorking ? 'working' : current.status),
          isWorking: data.data.isWorking !== undefined ? data.data.isWorking : (data.data.status === 'working' ? true : current.isWorking),
          lastTestedAt: data.data.lastTestedAt || current.lastTestedAt,
          lastTestMessage: data.data.lastTestMessage || current.lastTestMessage,
          pass: current.pass || '',
          password: current.password || ''
        };
        write('cre_smtp_settings', merged);
        return merged;
      }
    } catch (e) {
      console.warn('Não foi possível sincronizar SMTP do servidor:', e);
    }
    return this.getSmtpSettings();
  },

  setSmtpSettings(settings: SmtpSettings, actor?: User): void {
    write('cre_smtp_settings', settings);
    // Persiste na tabela system_settings do banco MySQL
    apiPost('/api/smtp/settings', { smtpSettings: settings }).catch(e => {
      console.warn('Erro ao salvar SMTP no backend:', e);
    });
    if (actor) {
      this.addLog(
        'SMTP_SETTINGS_UPDATED',
        actor.email,
        actor.role,
        `Atualizou as configurações de SMTP/Servidor de e-mail (${settings.host}:${settings.port})`
      );
    }
  },

  async testSmtpSettings(settings: SmtpSettings, testEmail?: string, actor?: User): Promise<{ success: boolean; message: string; logs?: string[]; error?: string; status?: 'working' | 'error' | 'pending' | 'untested'; isWorking?: boolean; lastTestedAt?: string }> {
    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/smtp/test', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          smtpSettings: settings,
          testEmail
        })
      });
      const data = await response.json();
      
      const isOk = !!data.success;
      const testedAt = data.lastTestedAt || new Date().toISOString();
      const updatedSettings: SmtpSettings = {
        ...settings,
        status: data.status || (isOk ? 'working' : 'error'),
        isWorking: data.isWorking !== undefined ? data.isWorking : isOk,
        lastTestedAt: testedAt,
        lastTestMessage: data.message || data.error
      };
      
      write('cre_smtp_settings', updatedSettings);

      // Persiste imediatamente no backend para garantir sincronização global entre todos os clientes
      apiPost('/api/smtp/settings', { smtpSettings: updatedSettings }).catch(() => {});

      if (actor) {
        this.addLog(
          isOk ? 'SMTP_TEST_SUCCESS' : 'SMTP_TEST_FAILED',
          actor.email,
          actor.role,
          `Executou teste de conexão SMTP (${settings.host}:${settings.port}) - Resultado: ${isOk ? 'Operacional / Sucesso' : 'Falha na Conexão'}`
        );
      }

      return {
        ...data,
        status: updatedSettings.status,
        isWorking: updatedSettings.isWorking,
        lastTestedAt: testedAt
      };
    } catch (err: any) {
      const errMsg = err.message || 'Falha na comunicação com o serviço de teste.';
      const testedAt = new Date().toISOString();
      const updatedSettings: SmtpSettings = {
        ...settings,
        status: 'error',
        isWorking: false,
        lastTestedAt: testedAt,
        lastTestMessage: errMsg
      };
      write('cre_smtp_settings', updatedSettings);
      return {
        success: false,
        status: 'error',
        isWorking: false,
        lastTestedAt: testedAt,
        message: `Erro ao testar conexão: ${errMsg}`,
        error: errMsg,
        logs: [`[${new Date().toLocaleTimeString('pt-BR')}] Erro: ${errMsg}`]
      };
    }
  },

  async sendPasswordRecovery(email: string): Promise<{ success: boolean; message: string; user?: User; logs?: string[] }> {
    const users = this.getUsers();
    const targetUser = users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
    
    if (!targetUser) {
      throw new Error(`Nenhum usuário cadastrado encontrado com o e-mail "${email}". Verifique a digitação ou crie uma conta.`);
    }

    const smtpSettings = this.getSmtpSettings();

    // Registra a solicitação na auditoria do sistema
    this.addLog(
      'PASSWORD_RECOVERY_REQUESTED',
      targetUser.email,
      targetUser.role,
      `Solicitou recuperação de senha para ${targetUser.email}.`
    );

    try {
      const response = await fetch('/api/smtp/send-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetUser.email,
          userName: targetUser.name,
          smtpSettings
        })
      });

      const data = await response.json();
      if (data && !data.success) {
        throw new Error(data.error || 'Erro ao processar envio do e-mail de recuperação.');
      }

      this.addLog(
        'PASSWORD_RECOVERY_SENT',
        targetUser.email,
        targetUser.role,
        `E-mail de recuperação de senha transmitido com sucesso via SMTP para "${targetUser.email}"`
      );

      return {
        success: true,
        message: 'E-mail de recuperação enviado com sucesso.',
        user: targetUser,
        logs: data?.logs
      };
    } catch (err: any) {
      console.warn('Erro na requisição de recuperação:', err?.message);
      throw err;
    }
  },

  async resetPasswordWithCode(email: string, code: string, newPass: string): Promise<User> {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (idx === -1) throw new Error('Usuário não encontrado.');

    // Validação do código e atualização da senha no servidor
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        code: code.trim(),
        newPassword: newPass
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Código de verificação incorreto ou expirado.');
    }

    // Sincroniza o estado local
    users[idx].password = newPass;
    write(KEYS.USERS, users);

    this.addLog(
      'PASSWORD_RESET_SUCCESS',
      users[idx].email,
      users[idx].role,
      `Redefiniu a senha de acesso da conta com sucesso via código de verificação.`
    );

    return users[idx];
  },

  async sendWelcomeNotification(user: User): Promise<{ success: boolean; message: string }> {
    const smtpSettings = this.getSmtpSettings();
    const isEnabled = smtpSettings.notifyNewRegistration ?? smtpSettings.notifyOnRegister ?? true;
    if (!isEnabled) {
      return { success: true, message: 'Notificação de novo cadastro desativada.' };
    }

    try {
      const response = await fetch('/api/smtp/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          userName: user.name,
          userRole: user.role,
          ra: user.ra,
          course: user.course,
          smtpSettings
        })
      });
      const data = await response.json();
      if (data && data.success) {
        this.addLog(
          'WELCOME_EMAIL_SENT',
          user.email,
          user.role,
          `E-mail de boas-vindas despachado via SMTP para ${user.email}`
        );
      }
      return data;
    } catch (err: any) {
      console.warn('Falha no despacho de e-mail de boas-vindas:', err?.message);
      return { success: false, message: err?.message || 'Erro no envio' };
    }
  },

  async sendEnrollmentNotification(enrollment: Enrollment): Promise<{ success: boolean; message: string }> {
    const smtpSettings = this.getSmtpSettings();
    const isEnabled = smtpSettings.notifyEventEnrollment ?? smtpSettings.notifyOnEnrollment ?? true;
    if (!isEnabled) {
      return { success: true, message: 'Notificação de inscrição em eventos desativada.' };
    }

    const events = this.getEvents();
    const event = events.find(e => e.id === enrollment.eventId);
    const workshops = this.getWorkshops();
    const selectedWsNames = (enrollment.selectedWorkshops || [])
      .map(wsId => workshops.find(w => w.id === wsId)?.name)
      .filter(Boolean) as string[];

    const pixKey = this.getPixKey();
    const whatsappNumber = this.getWhatsapp();

    try {
      const response = await fetch('/api/smtp/send-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: enrollment.userEmail,
          userName: enrollment.userName,
          eventName: enrollment.eventName,
          eventDate: event?.date,
          eventLocation: event?.location,
          selectedWorkshops: selectedWsNames,
          totalValue: enrollment.totalValue,
          status: enrollment.status,
          voucherCode: enrollment.voucherCode,
          enrollmentId: enrollment.id,
          pixKey,
          whatsappNumber,
          smtpSettings
        })
      });
      const data = await response.json();
      if (data && data.success) {
        this.addLog(
          'ENROLLMENT_EMAIL_SENT',
          enrollment.userEmail,
          'PARTICIPANTE',
          `Notificação de inscrição no evento "${enrollment.eventName}" despachada via SMTP para ${enrollment.userEmail}`
        );
      }
      return data;
    } catch (err: any) {
      console.warn('Falha no despacho de e-mail de inscrição:', err?.message);
      return { success: false, message: err?.message || 'Erro no envio' };
    }
  },

  async sendPaymentApprovedNotification(enrollment: Enrollment): Promise<{ success: boolean; message: string }> {
    const smtpSettings = this.getSmtpSettings();
    const isEnabled = smtpSettings.notifyPaymentConfirmation ?? smtpSettings.notifyOnPaymentApproved ?? true;
    if (!isEnabled) {
      return { success: true, message: 'Notificação de pagamento desativada.' };
    }

    try {
      const response = await fetch('/api/smtp/send-payment-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: enrollment.userEmail,
          userName: enrollment.userName,
          eventName: enrollment.eventName,
          enrollmentId: enrollment.id,
          totalValue: enrollment.totalValue,
          smtpSettings
        })
      });
      const data = await response.json();
      if (data && data.success) {
        this.addLog(
          'PAYMENT_APPROVED_EMAIL_SENT',
          enrollment.userEmail,
          'PARTICIPANTE',
          `Notificação de homologação de pagamento e liberação de credencial enviada para ${enrollment.userEmail}`
        );
      }
      return data;
    } catch (err: any) {
      console.warn('Falha no despacho de e-mail de confirmação de pagamento:', err?.message);
      return { success: false, message: err?.message || 'Erro no envio' };
    }
  },

  // ==========================================
  // VOUCHERS (PRÉ-VENDA E CUPONS DE DESCONTO)
  // ==========================================
  getVouchers(eventId?: string): Voucher[] {
    const all = read<Voucher[]>(KEYS.VOUCHERS, SEEDED_VOUCHERS);
    if (!eventId || eventId === 'ALL') return all;
    return all.filter(v => v.applicableEventIds.includes('ALL') || v.applicableEventIds.includes(eventId));
  },

  generateRandomAlphanumeric(length = 6): string {
    const chars = '23456789abcdefghijkmnpqrstuvwxyz'; // alfanumérico legível evitando confusão entre 0/o/1/l
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  generateUniqueVoucherCode(prefix: string): string {
    const cleanPrefix = (prefix || 'voucher')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '') || 'voucher';
    
    const existing = this.getVouchers();
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      const randomSeq = this.generateRandomAlphanumeric(6);
      code = `${cleanPrefix}-${randomSeq}`;
      if (!existing.some(v => v.code.toLowerCase() === code.toLowerCase())) {
        isUnique = true;
      }
      attempts++;
    }

    return code;
  },

  saveVouchers(
    params: {
      prefix: string;
      count: number;
      discountType: VoucherDiscountType;
      discountPercent?: number;
      applicableEventIds: string[];
      maxUses?: number;
      description?: string;
    },
    actor: User
  ): Voucher[] {
    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT') {
      throw new Error('Apenas a Coordenação e Administradores possuem autorização para gerar vouchers.');
    }

    const count = Math.max(1, Math.min(params.count || 1, 100));
    const prefix = params.prefix.trim();
    if (!prefix) throw new Error('É obrigatório informar uma sigla/prefixo para o voucher.');

    if (params.discountType === 'PORCENTAGEM') {
      const pct = Number(params.discountPercent);
      if (isNaN(pct) || pct <= 0 || pct >= 100) {
        throw new Error('A porcentagem de desconto deve estar entre 1% e 99%.');
      }
    }

    const createdList: Voucher[] = [];
    const all = this.getVouchers();

    for (let i = 0; i < count; i++) {
      const uniqueCode = this.generateUniqueVoucherCode(prefix);
      const newVoucher: Voucher = {
        id: `vouch_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        code: uniqueCode,
        prefix: prefix.toLowerCase(),
        discountType: params.discountType,
        discountPercent: params.discountType === 'PORCENTAGEM' ? Number(params.discountPercent) : undefined,
        applicableEventIds: params.applicableEventIds && params.applicableEventIds.length > 0 ? params.applicableEventIds : ['ALL'],
        maxUses: params.maxUses && params.maxUses > 0 ? Number(params.maxUses) : 1,
        usedCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: actor.id,
        creatorName: actor.name,
        description: params.description?.trim() || undefined,
        usages: []
      };

      all.unshift(newVoucher);
      createdList.push(newVoucher);
    }

    write(KEYS.VOUCHERS, all);

    // Sincroniza com o backend MySQL
    apiPost('/api/db/write-vouchers-save', { vouchers: createdList });

    const discountLabel = params.discountType === 'TOTAL' ? '100% (Pré-venda Total)' : `${params.discountPercent}% de desconto`;
    this.addLog(
      'CREATE_VOUCHER',
      actor.email,
      actor.role,
      `Gerou ${createdList.length} voucher(s) com prefixo "${prefix}" [${discountLabel}] (Ex: ${createdList[0]?.code})`
    );

    return createdList;
  },

  toggleVoucherActive(id: string, actor: User): Voucher {
    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT') {
      throw new Error('Permissão negada para alterar status do voucher.');
    }

    const all = this.getVouchers();
    const idx = all.findIndex(v => v.id === id);
    if (idx === -1) throw new Error('Voucher não encontrado.');

    all[idx].isActive = !all[idx].isActive;
    write(KEYS.VOUCHERS, all);

    // Sincroniza com o backend MySQL
    apiPost('/api/db/write-voucher-toggle', { id });

    this.addLog(
      'TOGGLE_VOUCHER',
      actor.email,
      actor.role,
      `${all[idx].isActive ? 'Ativou' : 'Desativou'} o voucher ${all[idx].code}`
    );

    return all[idx];
  },

  deleteVoucher(id: string, actor: User): void {
    if (actor.role !== 'COORDENADOR' && actor.role !== 'ROOT') {
      throw new Error('Permissão negada para excluir voucher.');
    }

    const all = this.getVouchers();
    const voucherToDelete = all.find(v => v.id === id);
    if (!voucherToDelete) throw new Error('Voucher não encontrado.');

    const filtered = all.filter(v => v.id !== id);
    write(KEYS.VOUCHERS, filtered);

    // Sincroniza com o backend MySQL
    apiPost('/api/db/write-voucher-delete', { id });

    this.addLog(
      'DELETE_VOUCHER',
      actor.email,
      actor.role,
      `Excluiu o voucher ${voucherToDelete.code}`
    );
  },

  validateVoucher(
    code: string,
    eventId: string,
    totalAmount: number
  ): {
    valid: boolean;
    message: string;
    voucher?: Voucher;
    discountAmount: number;
    finalTotal: number;
  } {
    if (!code || !code.trim()) {
      return {
        valid: false,
        message: 'Por favor, informe o código do voucher.',
        discountAmount: 0,
        finalTotal: totalAmount
      };
    }

    const cleanCode = code.trim().toLowerCase();
    const all = this.getVouchers();
    const voucher = all.find(v => v.code.toLowerCase() === cleanCode);

    if (!voucher) {
      return {
        valid: false,
        message: 'Código de voucher não encontrado ou inválido.',
        discountAmount: 0,
        finalTotal: totalAmount
      };
    }

    if (!voucher.isActive) {
      return {
        valid: false,
        message: 'Este voucher está desativado pela coordenação.',
        discountAmount: 0,
        finalTotal: totalAmount
      };
    }

    if (voucher.usedCount >= voucher.maxUses) {
      return {
        valid: false,
        message: 'Este voucher de uso único já foi totalmente utilizado.',
        discountAmount: 0,
        finalTotal: totalAmount
      };
    }

    // Verifica evento aplicável
    if (!voucher.applicableEventIds.includes('ALL') && !voucher.applicableEventIds.includes(eventId)) {
      const events = this.getEvents();
      const allowedNames = voucher.applicableEventIds
        .map(eid => events.find(e => e.id === eid)?.name)
        .filter(Boolean)
        .join(', ');

      return {
        valid: false,
        message: `Este voucher não é válido para este evento. (Válido para: ${allowedNames || 'eventos específicos'}).`,
        discountAmount: 0,
        finalTotal: totalAmount
      };
    }

    // Calcula o desconto
    let discountAmount = 0;
    if (voucher.discountType === 'TOTAL') {
      discountAmount = totalAmount;
    } else if (voucher.discountType === 'PORCENTAGEM') {
      const pct = voucher.discountPercent || 0;
      discountAmount = Math.round(((totalAmount * pct) / 100) * 100) / 100;
    }

    const finalTotal = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);

    const desc = voucher.discountType === 'TOTAL' 
      ? '100% de desconto (Pagamento Antecipado / Pré-venda Total)' 
      : `${voucher.discountPercent}% de desconto`;

    return {
      valid: true,
      message: `Voucher aplicado com sucesso! ${desc}.`,
      voucher,
      discountAmount,
      finalTotal
    };
  },

  applyVoucherUsage(
    code: string,
    usage: {
      userId: string;
      userEmail: string;
      userName: string;
      enrollmentId: string;
      discountApplied: number;
    }
  ): void {
    const cleanCode = code.trim().toLowerCase();
    const all = this.getVouchers();
    const idx = all.findIndex(v => v.code.toLowerCase() === cleanCode);
    if (idx === -1) return;

    const voucher = all[idx];
    voucher.usedCount = (voucher.usedCount || 0) + 1;
    if (!voucher.usages) voucher.usages = [];
    voucher.usages.push({
      userId: usage.userId,
      userEmail: usage.userEmail,
      userName: usage.userName,
      enrollmentId: usage.enrollmentId,
      usedAt: new Date().toISOString(),
      discountApplied: usage.discountApplied
    });

    write(KEYS.VOUCHERS, all);

    // Sincroniza com o backend MySQL
    apiPost('/api/db/write-voucher-usage', { code, usage });
  }
};

