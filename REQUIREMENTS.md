# Gestion de Préstamos

Esta aplicación sirve para gestionar las actividades relacionadas con prestamos de dinero. Estos se financian con inversiones y se dan a personas que normalmente trabajan en entidades las cuales hacen descuestos por nómina, en otros pocos escenarios hay préstamos personales.

Características:

- Es una WebApp que puede ser usada desde cualquier browser en Desktop, Smarphone o Tablet.
- Los usuarios podran registrarse en la aplicación usando SSO, pero su acceso y permiso estará sujeto a aprobación.
- El sistema va a tener dos roles: ADMIN y PRESTAMISTA.

## Módulos

- Administración
  - Usuarios
  - Entidades
- Préstamos
  - Clientes
  - Préstamos
  - Pagos
  - Certificaciones
- Inversiones
  - Inversionistas
  - Inversiones
  - Liquidación y pago

### Administración - Usuarios

Roles: ADMIN

Descripción: Los usuarios ADMIN pueden aprobar o rechazar solicitudes de registro y login, además de asignar o remover el rol de PRESTAMISTA y otros en el futuro. El sistema debe ofrecer una UI para este fin.

### Administración - Entidades

Roles: ADMIN

Descripción: Gestionar las Entidades que son empresas donde trabajan los Prestatarios y que se encargan de realizar los descuentos de nómina de las cuotas pactadas en un préstamo, además de reportar los descuentos hechos a sus trabajadores.
Las entidades tienen los siguientes campos:

- Id: Que puede ser el NIT o cuaquier texto de hasta 20 caracteres, debe ser único por cada entidad.
- Nombre: El nombre de la entidad.
- Dirección: Opcional
- Contacto: Opcional
- Numero de contacto: Opcional.

### Préstamos - Clientes

Roles: PRESTAMISTA

Descripción: Un prestamista puede registrar sus propios clientes con los siguientes datos:

- Documento de identidad (Valor único)
- Nombres y apellidos
- Dirección
- Telefono
- Entidad donde labora

### Préstamos - Préstamos

Roles: PRESTAMISTA

Descripción: Crear préstamos, ver sus detalles, actualizar información de los mismos, adeás debe guardar un archivo (imagen o PDF) que se tome con la cámara del teléfono. Un préstamos debe tener la siguiente información:

- Tipo (PERSONAL, LIBRANZA)
- Número (En caso de ser LIBRANZA, de lo contrario uno generado de con el formato PP##### donde ##### es un numero consecutivo con ceros a la izquierda)
- Prestamista
- Fecha
- Capital
- Tasa de interés
- Cuotas
- Valor de la cuota
- Fecha de Inicio
- Estado (ACTIVA, ANULADA, PAGADA)
- foto (Path o URL donde del archivo de soporte del préstamo como de una libranza, una transferencia, etc)

### Préstamos - Pagos

Cada préstamo puede tener varios pagos hasta completar el total a pagar, cada vez que un pago es agregado se de totalizar en el préstamo en un campo total pagado.

Los datos de la tabla de pagos son:

- Libranza
- Fecha
- Valor
- Tipo (EFECTIVO, TRANSFERENCIA, BULK)
- foto (Path o URL donde del archivo de soporte del préstamo como de una libranza, una transferencia, etc)
-

Los pagos pueden ser ingresados de forma individual, es decir yendo al Préstamo mismo y agregandolo por medio de un biton. En bulk, donde se debe contar con una opción en el menú izquierdo. Se debe guardar esta información del bulk en su propia tabla:

- Entidad
- Fecha
- Consignado en:
- Valor total
- archivo (path o url de un archivo que se pueda cargar)

Los pagos en este caso se ingresan en la ventana de bulk y se almacenan en la misma tabla de pagos pero con tipo BULK

### Préstamos - Certificaciones

Pendiente

### Inversiones - Inversionistas

Pendiente

### Inversiones - Inversiones

Pendiente

### Inversiones - Liquidación y pago

Pendiente

## Arquitectura

### Stack tecnológico

| Capa           | Tecnología                            | Justificación                                                              |
| -------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| Frontend / SSR | Next.js 14+ (App Router) + TypeScript | App responsive, SSR cuando conviene, Server Actions para lógica de negocio |
| UI             | Tailwind CSS + shadcn/ui              | Componentes accesibles, diseño consistente, sin costo                      |
| Auth           | Supabase Auth (Google SSO)            | OAuth con Google, manejo de sesiones, flujo de aprobación manual           |
| Base de datos  | Supabase (PostgreSQL)                 | Datos relacionales, Row Level Security, capa gratuita suficiente           |
| Almacenamiento | Supabase Storage                      | Fotos y PDFs de soporte de préstamos                                       |
| Deployment     | Vercel                                | Integración nativa con Next.js, capa gratuita, CI/CD automático            |

### Costos estimados

Capa gratuita cubre el 100% de la operación esperada:

- **Supabase Free:** 500 MB base de datos, 1 GB storage, 50.000 usuarios activos/mes
- **Vercel Free:** 100 GB bandwidth, deploys ilimitados

**Costo mensual estimado: $0**

### Lógica de negocio

Toda la lógica de negocio reside en **Server Actions de Next.js**. No se usan triggers ni funciones en la base de datos. La BD solo contiene tablas, relaciones e índices.

Responsabilidades por capa:

- **Server Actions:** validaciones, cálculo de cuotas e intereses, generación de número consecutivo PP#####, subida de archivos a Storage, aprobación/rechazo de usuarios, cambios de estado de préstamos.
- **Supabase RLS (Row Level Security):** un `PRESTAMISTA` solo puede ver y operar sus propios clientes y préstamos. Un `ADMIN` tiene acceso total.
- **Supabase Storage:** almacena los archivos de soporte (foto o PDF) de cada préstamo.

### Estructura del proyecto

```
gestion-prestamos/
├── app/
│   ├── (auth)/
│   │   ├── login/             → Página de login con Google SSO
│   │   └── pending/           → Pantalla de aprobación pendiente
│   ├── (admin)/
│   │   ├── usuarios/          → Aprobar/rechazar usuarios, asignar roles
│   │   └── entidades/         → CRUD de entidades
│   └── (prestamista)/
│       ├── clientes/          → CRUD de clientes
│       └── prestamos/         → CRUD de préstamos y carga de soporte
├── components/                → Componentes UI reutilizables
├── lib/
│   └── supabase/              → Cliente Supabase y helpers de consulta
├── actions/                   → Server Actions (lógica de negocio)
└── types/                     → Tipos TypeScript generados desde Supabase
```

### Roles y acceso

| Módulo                        | ADMIN | PRESTAMISTA           |
| ----------------------------- | ----- | --------------------- |
| Gestión de usuarios           | ✅    | ❌                    |
| Entidades                     | ✅    | ❌                    |
| Clientes                      | ❌    | ✅ (solo los propios) |
| Préstamos                     | ❌    | ✅ (solo los propios) |
| Pagos _(pendiente)_           | ❌    | ✅                    |
| Certificaciones _(pendiente)_ | ❌    | ✅                    |
| Inversiones _(pendiente)_     | ✅    | ❌                    |

### Responsive

La aplicación es una WebApp responsive que funciona en desktop, tablet y smartphone:

- **Desktop:** sidebar fija, layout en columnas.
- **Tablet:** sidebar fija, grids de 2 columnas.
- **Mobile:** sidebar como drawer lateral (hamburger), modales como bottom sheets, formularios en una columna, teclado numérico en campos de número, acceso directo a cámara en carga de archivos.
