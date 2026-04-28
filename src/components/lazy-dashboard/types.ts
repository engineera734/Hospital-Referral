export type Profile = {
  id: string;
  full_name: string;
  username: string;
  role: string;
  phone?: string | null;
  national_id?: string | null;
  avatar_path?: string | null;
};

export type Doctor = {
  id: string;
  full_name: string;
  card_no?: string | null;
  kareemy_account?: string | null;
  specialty?: string | null;
  phone?: string | null;
  user_id?: string | null;
  is_active?: boolean | null;
};

export type Department = { id: string; name: string; code?: string | null };

export type StaffProfile = {
  id: string;
  full_name: string;
  username: string;
  role: string;
  phone?: string | null;
  national_id?: string | null;
  is_active?: boolean | null;
  avatar_path?: string | null;
};

export type Rate = { doctor_id: string; department_id: string; amount: number };

export type Settlement = {
  doctor_id: string;
  amount: number;
  referrals_count: number;
  settled_at: string;
  settled_by?: string | null;
  note?: string | null;
};

export type Referral = {
  id: string;
  patient_name: string;
  patient_age?: number;
  diagnosis?: string | null;
  priority?: string | null;
  status: string;
  referral_code?: string | null;
  created_at?: string | null;
  referral_date?: string | null;
  arrived_at?: string | null;
  arrived_by?: string | null;
  completed_at?: string | null;
  attachment_name?: string | null;
  attachment_path?: string | null;
  doctors: { id: string; full_name: string; kareemy_account?: string | null } | null;
  departments: { id?: string; name: string } | null;
};
