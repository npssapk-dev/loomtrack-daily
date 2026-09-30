
CREATE TABLE public.app_settings (id int PRIMARY KEY DEFAULT 1 CHECK (id=1), business_name text NOT NULL DEFAULT 'My Powerloom Unit', currency text NOT NULL DEFAULT '₹', updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.machines (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, code text NOT NULL UNIQUE, default_rate numeric(12,2) NOT NULL DEFAULT 0 CHECK (default_rate>=0), unit text NOT NULL DEFAULT 'm', active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.employees (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, phone text, join_date date, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, phone text, address text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.production_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), production_date date NOT NULL DEFAULT current_date, machine_id uuid NOT NULL REFERENCES public.machines(id), product_id uuid NOT NULL REFERENCES public.products(id), employee_id uuid NOT NULL REFERENCES public.employees(id), quantity numeric(12,2) NOT NULL CHECK (quantity>0), piece_rate numeric(12,2) NOT NULL CHECK (piece_rate>=0), calculated_wage numeric(14,2) NOT NULL, remarks text, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.production_entries(production_date);
CREATE TABLE public.expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), expense_date date NOT NULL DEFAULT current_date, expense_type text NOT NULL CHECK (expense_type IN ('employee','general')), category text NOT NULL, employee_id uuid REFERENCES public.employees(id), amount numeric(14,2) NOT NULL CHECK (amount>0), payment_method text, remarks text, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expense_employee_rule CHECK ((expense_type='employee' AND employee_id IS NOT NULL) OR (expense_type='general' AND employee_id IS NULL)));
CREATE INDEX ON public.expenses(expense_date);
CREATE TABLE public.deliveries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), delivery_date date NOT NULL DEFAULT current_date, customer_id uuid NOT NULL REFERENCES public.customers(id), product_id uuid NOT NULL REFERENCES public.products(id), delivered_qty numeric(12,2) NOT NULL CHECK (delivered_qty>=0), approved_qty numeric(12,2) NOT NULL DEFAULT 0 CHECK (approved_qty>=0), rejected_qty numeric(12,2) NOT NULL DEFAULT 0 CHECK (rejected_qty>=0), rate numeric(12,2) NOT NULL CHECK (rate>=0), bill_amount numeric(14,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Delivered','Partially Approved','Approved','Rejected','Paid')), remarks text, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qty_rule CHECK (approved_qty + rejected_qty <= delivered_qty));
CREATE INDEX ON public.deliveries(delivery_date);
CREATE TABLE public.income_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), income_date date NOT NULL DEFAULT current_date, income_type text NOT NULL CHECK (income_type IN ('Sales','Other Income')), customer_id uuid REFERENCES public.customers(id), delivery_id uuid REFERENCES public.deliveries(id) ON DELETE SET NULL, amount numeric(14,2) NOT NULL CHECK (amount>0), payment_method text, reference text, remarks text, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.income_entries(income_date);

DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['app_settings','machines','products','employees','customers','production_entries','expenses','deliveries','income_entries'] LOOP
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('CREATE POLICY "Signed-in users manage %s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
END LOOP; END $$;

-- Seed
INSERT INTO public.app_settings(id, business_name) VALUES (1, 'Sri Lakshmi Weaving Mills');
INSERT INTO public.machines(name) VALUES ('Loom 01'),('Loom 02'),('Loom 03'),('Loom 04'),('Loom 05'),('Loom 06');
INSERT INTO public.machines(name, active) VALUES ('Loom 07', false);
INSERT INTO public.products(name, code, default_rate, unit) VALUES
 ('Cotton Shirting 40s','CS40',4.50,'m'),('Poplin 60s','PP60',5.25,'m'),('Grey Sheeting','GS01',3.80,'m'),('Lungi Cloth','LG02',6.00,'m'),('Towel Fabric','TW01',7.50,'m');
INSERT INTO public.employees(name, phone, join_date) VALUES
 ('Murugan K','9843012345','2022-03-10'),('Selvi R','9842198765','2021-07-01'),('Rajesh P','9790011223','2023-01-15'),('Kavitha S','9677554433','2022-11-20'),('Arun M','9500112233','2024-02-05'),('Lakshmi V','9443322110','2020-06-12');
INSERT INTO public.employees(name, phone, join_date, active) VALUES ('Ganesh T','9360099887','2019-04-01', false);
INSERT INTO public.customers(name, phone, address) VALUES
 ('Ramesh Textiles','9842211000','Erode'),('Kumar Fabrics','9443300112','Tiruppur'),('Sri Balaji Traders','9790088776','Salem'),('Annai Garments','9600344556','Coimbatore');

-- production: each active employee on a loom each of the last 30 days (incl. today)
INSERT INTO public.production_entries(production_date, machine_id, product_id, employee_id, quantity, piece_rate, calculated_wage)
SELECT d::date, m.id, p.id, e.id, q, p.default_rate, round(q*p.default_rate,2)
FROM generate_series(current_date - 29, current_date, interval '1 day') d
JOIN (SELECT id, row_number() OVER (ORDER BY name) rn FROM public.employees WHERE active) e ON true
JOIN (SELECT id, row_number() OVER (ORDER BY name) rn FROM public.machines WHERE active) m ON m.rn = e.rn
JOIN (SELECT id, default_rate, row_number() OVER (ORDER BY code) rn FROM public.products) p ON p.rn = ((e.rn + extract(day from d)::int) % 5) + 1
CROSS JOIN LATERAL (SELECT (60 + floor(random()*50))::numeric AS q) qq
WHERE extract(dow from d) <> 0 OR d::date = current_date;

-- weekly salary payments + some advances
INSERT INTO public.expenses(expense_date, expense_type, category, employee_id, amount, payment_method)
SELECT d::date, 'employee', 'Salary Payment', e.id, 1800, 'Cash'
FROM generate_series(current_date - 28, current_date - 1, interval '7 day') d, public.employees e WHERE e.active;
INSERT INTO public.expenses(expense_date, expense_type, category, employee_id, amount, payment_method, remarks)
SELECT current_date - 10, 'employee', 'Advance', id, 1000, 'Cash', 'Festival advance' FROM public.employees WHERE name IN ('Murugan K','Rajesh P');
INSERT INTO public.expenses(expense_date, expense_type, category, employee_id, amount, payment_method)
SELECT current_date - 4, 'employee', 'Medical', id, 500, 'UPI' FROM public.employees WHERE name='Selvi R';
INSERT INTO public.expenses(expense_date, expense_type, category, amount, payment_method, remarks) VALUES
 (current_date - 25,'general','Rent',15000,'Bank Transfer','Shed rent'),
 (current_date - 20,'general','Electricity',18500,'UPI','EB bill'),
 (current_date - 15,'general','Bank EMI',12000,'Bank Transfer','Loom loan'),
 (current_date - 8,'general','Repairs',3200,'Cash','Shuttle & pick repair'),
 (current_date - 3,'general','Transport',1800,'Cash','Delivery to Tiruppur'),
 (current_date,'general','Food',650,'Cash','Tea & snacks');

INSERT INTO public.deliveries(delivery_date, customer_id, product_id, delivered_qty, approved_qty, rejected_qty, rate, bill_amount, status, remarks)
SELECT current_date - x.off, c.id, p.id, x.dq, x.aq, x.rq, x.rate, x.aq*x.rate, x.st, NULL
FROM (VALUES
 (26,'Ramesh Textiles','CS40',1200,1180,20,38,'Paid'),
 (21,'Kumar Fabrics','PP60',900,900,0,46,'Paid'),
 (16,'Sri Balaji Traders','GS01',1500,1420,80,30,'Paid'),
 (11,'Annai Garments','TW01',600,560,40,62,'Approved'),
 (6,'Ramesh Textiles','LG02',800,700,0,52,'Partially Approved'),
 (2,'Kumar Fabrics','CS40',1000,0,0,38,'Delivered'),
 (0,'Sri Balaji Traders','PP60',500,0,0,46,'Draft')
) AS x(off,cust,code,dq,aq,rq,rate,st)
JOIN public.customers c ON c.name=x.cust JOIN public.products p ON p.code=x.code;

INSERT INTO public.income_entries(income_date, income_type, customer_id, delivery_id, amount, payment_method, reference)
SELECT d.delivery_date + 2, 'Sales', d.customer_id, d.id, d.bill_amount, 'Bank Transfer', 'Delivery payment'
FROM public.deliveries d WHERE d.status='Paid';
INSERT INTO public.income_entries(income_date, income_type, amount, payment_method, reference, remarks) VALUES
 (current_date - 12,'Other Income',4500,'Cash','Waste yarn sale','Sold waste yarn'),
 (current_date,'Other Income',1200,'UPI','Job work','Small job work');
INSERT INTO public.income_entries(income_date, income_type, customer_id, amount, payment_method, reference)
SELECT current_date, 'Sales', id, 15000, 'UPI', 'Part payment' FROM public.customers WHERE name='Annai Garments';
