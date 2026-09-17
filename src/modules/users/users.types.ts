import {
  User,
  Event,
  Workshop,
  Enrollment,
  Attendance,
  Certificate,
  HomeBanner,
  SystemLog,
  FinancialExpense,
  Voucher,
  SystemSettings
} from '../../@types/index';

export interface DbState {
  users: User[];
  events: Event[];
  workshops: Workshop[];
  enrollments: Enrollment[];
  attendance: Attendance[];
  certificates: Certificate[];
  banners: HomeBanner[];
  logs: SystemLog[];
  expenses?: FinancialExpense[];
  vouchers?: Voucher[];
  settings?: SystemSettings;
}

