export type Weekday = '1'|'2'|'3'|'4'|'5'|'6'|'7'  // lun=1 … dom=7

export interface WeeklyBlock {
  start: string; // "HH:MM" 24h (hora local CL al momento de definir template)
  end:   string; // "HH:MM"
}

export type WeeklyTemplate = Partial<Record<Weekday, WeeklyBlock[]>>;

export interface DoctorProfileV1 {
  uid: string;                 // asignado por Auth
  role: 'medico';
  firstName: string;
  lastName: string;
  fullName: string;            // `${firstName} ${lastName}`
  email: string;
  specialty: string;
  defaultSlotMins: number;     // típico: 30
  weeklyTemplate: WeeklyTemplate;
  phone?: string | null;
  room?: string | null;
  tz: 'America/Santiago';
  active: boolean;
  createdAt?: any;             // serverTimestamp
  updatedAt?: any;             // serverTimestamp
}

export interface CreateDoctorPayload {
  email: string;
  password: string;            // temporal o definitivo
  firstName: string;
  lastName: string;
  specialty: string;
  defaultSlotMins?: number;    // por defecto 30
  weeklyTemplate?: WeeklyTemplate; // si no viene, L–V 09-13 / 14-18
  phone?: string;
  room?: string;
}