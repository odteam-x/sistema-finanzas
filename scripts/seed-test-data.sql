-- =============================================================================
-- Datos de prueba para el usuario de scripts/test-env.mjs
--
-- Sustituye el user_id de abajo por el que imprime:
--   node scripts/test-env.mjs sembrar
--
-- NO CORRER CONTRA LA CUENTA REAL. Solo contra el usuario de prueba.
--
-- Cada pieza está elegida para llevar una pantalla a su caso interesante, no
-- para que la app "se vea llena":
--   · 3 cuentas    → el umbral del carrusel de Balance, que apila hasta 3
--   · 22 gastos    → el anillo de presupuesto entra en la zona ámbar (80%)
--   · 12 cuotas    → el colapso de Deudas, con una vencida y una próxima
--   · 2 suscripciones a 2 y 9 días → los tres niveles de urgencia del Inicio
--
-- EL LEDGER ES LA FUENTE DE VERDAD, y hay que respetarlo también al sembrar.
-- La primera vez que se sembró sin los movimientos espejo, el saldo del Inicio
-- salía en cero y parecía un fallo de la app: no lo era, la base estaba
-- incoherente. Los espejos van al final y replican lo que hace addExpense():
-- un retiro con source_ref_id apuntando al gasto.
-- =============================================================================

do $$
declare
  u uuid := 'PON-AQUI-EL-USER-ID';
  efectivo uuid; banco uuid; ahorro uuid; d1 uuid;
  hoy date := current_date;
begin
  insert into salary_settings(user_id, pay_day_1, pay_day_2, default_amount, frequency, payment_method)
    values (u, 5, 20, 32000, 'dias_fijos', 'banco') on conflict (user_id) do nothing;

  insert into savings_accounts(user_id,name,type,currency,is_default)
    values (u,'Efectivo','efectivo','DOP',true) returning id into efectivo;
  insert into savings_accounts(user_id,name,type,currency)
    values (u,'Banco Popular','banco','DOP') returning id into banco;
  insert into savings_accounts(user_id,name,type,currency)
    values (u,'Ahorro','ahorro','DOP') returning id into ahorro;

  insert into savings_movements(user_id,account_id,kind,amount,date,note,source)
    values (u,efectivo,'deposito',12500,hoy-20,'Saldo inicial','manual'),
           (u,banco,'deposito',48750,hoy-20,'Saldo inicial','manual'),
           (u,ahorro,'deposito',103400,hoy-20,'Saldo inicial','manual');

  insert into tags(user_id,name,color)
    values (u,'Comida','expense'),(u,'Transporte','info'),(u,'Casa','warning');

  -- kind='quincena', no 'sueldo': el check de la tabla solo admite
  -- 'quincena' | 'extra'.
  insert into salaries(user_id,amount,pay_date,account_id,kind,confirmed)
    values (u,32000,hoy-16,banco,'quincena',true),
           (u,32000,hoy-1, banco,'quincena',true);

  -- expenses.source solo admite NULL o 'debt_payment': un gasto manual va sin
  -- source. Es el movimiento espejo el que lleva source='manual'.
  insert into expenses(user_id,date,amount,account_id,note)
    select u, hoy - (n % 12), 380 + (n*37) % 900, efectivo, 'Gasto de prueba ' || n
    from generate_series(1,22) n;

  insert into debts(user_id,name,total_amount,acquired_date,payment_type,
                    installments_count,installment_amount,frequency,status,kind)
    values (u,'Nevera',36000,hoy-90,'cuotas',12,3000,'mensual','parcial','credito')
    returning id into d1;
  -- Las dos primeras pagadas: deja una vencida y una próxima sin pagar, que es
  -- justo lo que el colapso de cuotas tiene que destacar.
  insert into debt_installments(user_id,debt_id,seq,due_date,amount,paid)
    select u, d1, n, hoy - 60 + (n-1)*30, 3000, n <= 2 from generate_series(1,12) n;

  insert into subscriptions(user_id,name,amount,frequency,next_charge_date,account_id,active)
    values (u,'Netflix',649,'mensual',hoy+2,banco,true),
           (u,'Spotify',299,'mensual',hoy+9,banco,true);

  -- ESPEJOS EN EL LEDGER. Sin esto los saldos no cuadran y las pantallas
  -- mienten. `not exists` los hace repetibles sin duplicar.
  insert into savings_movements(user_id,account_id,kind,amount,date,note,source,source_ref_id)
    select e.user_id, e.account_id, 'retiro', e.amount, e.date,
           'Gasto: ' || coalesce(e.note,''), 'manual', e.id
    from expenses e
    where e.user_id = u and e.deleted_at is null
      and not exists (select 1 from savings_movements m where m.source_ref_id = e.id);

  insert into savings_movements(user_id,account_id,kind,amount,date,note,source,source_ref_id)
    select s.user_id, s.account_id, 'deposito', s.amount, s.pay_date,
           'Quincena', 'salary', s.id
    from salaries s
    where s.user_id = u and s.deleted_at is null and s.confirmed
      and not exists (select 1 from savings_movements m where m.source_ref_id = s.id);
end $$;
