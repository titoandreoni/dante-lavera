-- Dante Lavera - Control de Gastos
-- Schema completo para Supabase
-- Ejecutar en el SQL Editor de Supabase

-- ============================================
-- Table: movements (Movimientos)
-- ============================================
CREATE TABLE IF NOT EXISTS movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('gasto', 'ingreso', 'ahorro')),
  amount numeric NOT NULL CHECK (amount > 0),
  category text CHECK (
    category IS NULL OR
    category IN ('comida', 'vivienda', 'servicios', 'entretenimiento', 'deudas', 'salud', 'transporte', 'otros')
  ),
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS movements_date_idx ON movements (date DESC);
CREATE INDEX IF NOT EXISTS movements_user_idx ON movements (user_name);
CREATE INDEX IF NOT EXISTS movements_type_idx ON movements (type);
CREATE INDEX IF NOT EXISTS movements_category_idx ON movements (category);

-- ============================================
-- Table: fixed_expenses (Gastos Fijos)
-- ============================================
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  category text NOT NULL DEFAULT 'servicios' CHECK (
    category IN ('comida', 'vivienda', 'servicios', 'entretenimiento', 'deudas', 'salud', 'transporte', 'otros')
  ),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Index for active expenses
CREATE INDEX IF NOT EXISTS fixed_expenses_active_idx ON fixed_expenses (active);

-- ============================================
-- Table: installments (Cuotas)
-- ============================================
CREATE TABLE IF NOT EXISTS installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  installments_count integer NOT NULL CHECK (installments_count >= 1),
  current_installment integer DEFAULT 1,
  monthly_amount numeric GENERATED ALWAYS AS (total_amount / installments_count) STORED,
  start_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

-- For a personal app used by a couple with the anon key,
-- allow all operations for the anon role.
-- In production you could restrict by user_name or add authentication.

-- movements: allow all for anon
CREATE POLICY IF NOT EXISTS "Allow all for anon on movements"
  ON movements FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- fixed_expenses: allow all for anon
CREATE POLICY IF NOT EXISTS "Allow all for anon on fixed_expenses"
  ON fixed_expenses FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- installments: allow all for anon
CREATE POLICY IF NOT EXISTS "Allow all for anon on installments"
  ON installments FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Sample data (optional - remove if not needed)
-- ============================================
-- INSERT INTO movements (user_name, type, amount, category, description, date)
-- VALUES
--   ('Tito', 'ingreso', 150000, NULL, 'Sueldo mayo', '2026-05-01'),
--   ('Tito', 'gasto', 8500, 'comida', 'Super La Anónima', '2026-05-03'),
--   ('Pareja', 'gasto', 12000, 'vivienda', 'Expensas mayo', '2026-05-05'),
--   ('Pareja', 'ingreso', 130000, NULL, 'Sueldo mayo', '2026-05-01'),
--   ('Tito', 'gasto', 4200, 'transporte', 'Nafta', '2026-05-08'),
--   ('Pareja', 'gasto', 2800, 'comida', 'Delivery', '2026-05-10');
