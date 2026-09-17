import { User, Event, Workshop, Enrollment, Attendance, HomeBanner, SystemLog, FinancialExpense, Voucher } from '../types';

export const SEEDED_USERS: User[] = [];

export const SEEDED_EVENTS: Event[] = [];

export const SEEDED_WORKSHOPS: Workshop[] = [];

export const SEEDED_ENROLLMENTS: Enrollment[] = [];

export const SEEDED_ATTENDANCE: Attendance[] = [];

export const SEEDED_BANNERS: HomeBanner[] = [
  {
    id: 'banner_institucional',
    imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=1200',
    title: 'Campo Real Eventos',
    subtitle: 'Portal Institucional para Gestão de Eventos, Congressos e Atividades Acadêmicas',
    isActive: true
  }
];

export const SEEDED_LOGS: SystemLog[] = [];

export const SEEDED_EXPENSES: FinancialExpense[] = [];

export const SEEDED_VOUCHERS: Voucher[] = [];
