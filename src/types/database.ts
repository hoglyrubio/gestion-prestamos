// Tipos generados manualmente — reemplazar con `supabase gen types` cuando el proyecto esté conectado

export type Role = "ADMIN" | "PRESTAMISTA"
export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED"
export type LoanType = "PERSONAL" | "LIBRANZA"
export type LoanStatus = "ACTIVA" | "ANULADA" | "PAGADA"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role | null
  status: UserStatus
  created_at: string
}

export interface Entidad {
  id: string
  nombre: string
  direccion: string | null
  contacto: string | null
  numero_contacto: string | null
  created_at: string
}

export interface Cliente {
  id: string
  prestamista_id: string
  documento: string
  nombre: string
  direccion: string
  telefono: string
  entidad_id: string
  created_at: string
  entidad?: Entidad
}

export interface Prestamo {
  id: string
  prestamista_id: string
  cliente_id: string
  tipo: LoanType
  numero: string
  fecha: string
  capital: number
  tasa_interes: number
  cuotas: number
  valor_cuota: number
  fecha_inicio: string
  estado: LoanStatus
  foto_url: string | null
  created_at: string
  cliente?: Cliente
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, "created_at"> & { role?: Role | null }
        Update: Partial<Omit<Profile, "id" | "created_at">>
        Relationships: []
      }
      entidades: {
        Row: Entidad
        Insert: Omit<Entidad, "id" | "created_at">
        Update: Partial<Omit<Entidad, "id" | "created_at">>
        Relationships: []
      }
      clientes: {
        Row: Cliente
        Insert: Omit<Cliente, "id" | "created_at" | "entidad">
        Update: Partial<Omit<Cliente, "id" | "created_at" | "entidad">>
        Relationships: []
      }
      prestamos: {
        Row: Prestamo
        Insert: Omit<Prestamo, "id" | "created_at" | "cliente">
        Update: Partial<Omit<Prestamo, "id" | "created_at" | "cliente">>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
