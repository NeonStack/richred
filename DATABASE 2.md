
-- CHECKKKKKKKKKKKKKKKKKKKKKKKKKKK
CREATE TABLE admin_permissions (
  id bigint primary key generated always as identity,
  admin_id uuid NULL,
  route_path text NOT NULL,
  is_permitted boolean NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_permissions_admin_id_route_path_key UNIQUE (admin_id, route_path),
  CONSTRAINT admin_permissions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON admin_permissions(admin_id);

--CHECK
CREATE TABLE courses (
  id bigint primary key generated always as identity,
  course_code text NOT NULL,
  description text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT courses_course_code_key UNIQUE (course_code)
);
CREATE INDEX IF NOT EXISTS idx_courses_course_code ON courses(course_code);

--CHECK
CREATE TABLE measurement_types (
  id bigint primary key generated always as identity,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT measurement_types_name_key UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS idx_measurement_types_name ON measurement_types(name);

--CHECK
CREATE TABLE orders (
  id bigint primary key generated always as identity,
  student_id integer NULL,
  uniform_type text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  employee_id uuid NULL,
  total_amount numeric(10,2) NOT NULL,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  balance numeric GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_date timestamp with time zone NULL,
  payment_status text NOT NULL DEFAULT 'not paid',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  order_measurements jsonb NULL,
  completed_at timestamp with time zone NULL,
  payment_updated_by text NULL,
  assigned_by text NULL,
  receipt_hash text NULL,
  receipt_data jsonb NULL,
  CONSTRAINT orders_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES profiles(id),
  CONSTRAINT orders_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('not paid', 'partial', 'fully paid')),
  CONSTRAINT orders_status_check CHECK (status IN ('pending', 'in progress', 'completed')),
  CONSTRAINT orders_uniform_type_check CHECK (uniform_type IN ('upper', 'lower', 'both'))
);
CREATE INDEX IF NOT EXISTS idx_orders_receipt_hash ON orders(receipt_hash);

-- CHECKKKKKKKKKKKKKKKKKKKKKK
CREATE TABLE profiles (
  id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL,
  contact_number text NULL,
  address text NULL,
  position text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_role_check CHECK (role IN ('superadmin', 'admin', 'employee'))
);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

--CHECK
CREATE TABLE students (
  id bigint primary key generated always as identity,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender text NOT NULL,
  course_id integer NULL,
  contact_number text NULL,
  address text NULL,
  measurements jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT students_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id),
  CONSTRAINT students_gender_check CHECK (gender IN ('male', 'female'))
);
CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);

--CHECK
CREATE TABLE uniform_configuration (
  id bigint primary key generated always as identity,
  gender text NOT NULL,
  course_id integer NULL,
  wear_type text NOT NULL,
  measurement_specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  base_price numeric(10,2) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uniform_configuration_course_id_gender_wear_type_key UNIQUE (course_id, gender, wear_type),
  CONSTRAINT uniform_configuration_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id),
  CONSTRAINT uniform_configuration_gender_check CHECK (gender IN ('male', 'female', 'unisex')),
  CONSTRAINT uniform_configuration_wear_type_check CHECK (wear_type IN ('upper', 'lower'))
);
CREATE INDEX IF NOT EXISTS idx_uniform_config_course ON uniform_configuration(course_id);
CREATE INDEX IF NOT EXISTS idx_uniform_config_wear_type ON uniform_configuration(wear_type);