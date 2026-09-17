export type UserRole = 'PARTICIPANTE' | 'ORGANIZADOR' | 'COORDENADOR' | 'ROOT';

export interface User {
  id: string;
  name: string;
  email: string;
  ra?: string;
  course?: string;
  institution?: string;
  period?: string;
  role: UserRole;
  password?: string;
}

export type EventStatus = 'ANALISE' | 'PUBLICADO' | 'ENCERRADO' | 'CANCELADO';

export interface Event {
  id: string;
  name: string;
  description: string;
  banner: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  category: string;
  maxParticipants: number;
  status: EventStatus;
  creatorId: string;
  creatorName: string;
  isFeatured: boolean;
  price: number;
}

export interface Workshop {
  id: string;
  eventId: string;
  name: string;
  description: string;
  instructor: string;
  date: string;
  startTime: string;
  endTime: string;
  time?: string;
  maxParticipants: number;
  price: number;
  enrolledCount: number;
  hours?: number;
}

export type PaymentStatus = 'PENDENTE' | 'APROVADO' | 'CANCELADO';

export type VoucherDiscountType = 'TOTAL' | 'PORCENTAGEM';

export interface VoucherUsage {
  userId: string;
  userEmail: string;
  userName: string;
  enrollmentId: string;
  usedAt: string;
  discountApplied: number;
}

export interface Voucher {
  id: string;
  code: string; // ex.: "softweek-5gg4f6"
  prefix: string; // ex.: "softweek"
  discountType: VoucherDiscountType; // 'TOTAL' (100% / pré-venda) ou 'PORCENTAGEM'
  discountPercent?: number; // ex.: 20 (para 20%)
  applicableEventIds: string[]; // vazio ou ['ALL'] para todos os eventos, ou IDs específicos de eventos
  maxUses: number; // padrão 1 para uso único
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  creatorName: string;
  description?: string;
  usages?: VoucherUsage[];
}

export interface Enrollment {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRa?: string;
  eventId: string;
  eventName: string;
  selectedWorkshops: string[];
  totalValue: number;
  originalValue?: number;
  voucherCode?: string;
  voucherDiscount?: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRa?: string;
  eventId: string;
  workshopId?: string;
  checkedInAt: string;
  checkedInBy: string;
}

export interface Certificate {
  id: string;
  userId: string;
  userName: string;
  userRa?: string;
  eventId: string;
  eventName: string;
  hours: number;
  hash: string;
  issuedAt: string;
  coordinationSignature: string;
  workshopsDetails?: string;
}

export interface SystemLog {
  id: string;
  action: string;
  userEmail: string;
  userRole: UserRole;
  details: string;
  timestamp: string;
}

export interface HomeBanner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  linkToEventId?: string;
  isActive: boolean;
}

export type ExpenseCategory = 'INFRAESTRUTURA' | 'REFEICAO' | 'MARKETING' | 'PALESTRANTE' | 'SERVICOS' | 'PATROCINIO' | 'APORTE' | 'OUTROS';

export interface SmtpSettings {
  host: string;
  port: number;
  secure: 'TLS' | 'SSL' | 'NONE';
  user: string;
  password?: string;
  pass?: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string;
  notifyOnRegister?: boolean;
  notifyOnEnrollment?: boolean;
  notifyOnPaymentApproved?: boolean;
  notifyOnPasswordRecovery?: boolean;
  notifyPasswordRecovery?: boolean;
  notifyNewRegistration?: boolean;
  notifyEventEnrollment?: boolean;
  notifyPaymentConfirmation?: boolean;
  status?: 'working' | 'error' | 'pending' | 'untested';
  isWorking?: boolean;
  lastTestedAt?: string;
  lastTestMessage?: string;
}

export interface FinancialExpense {
  id: string;
  eventId: string;
  eventName: string;
  description: string;
  category: ExpenseCategory;
  value: number;
  type: 'DESPESA' | 'ENTRADA';
  date: string;
  createdAt: string;
}

export interface SystemSettings {
  pixKey: string;
  whatsapp: string;
  supportEmail: string;
  loginBannerImage: string;
  isSmtpWorking?: boolean;
  smtpStatus?: 'working' | 'error' | 'pending' | 'untested';
  smtpLastTestedAt?: string;
}

