-- Calendar utility functions and procedures

-- Function to get upcoming events for a user
CREATE OR REPLACE FUNCTION get_upcoming_events(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  description TEXT,
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN,
  event_type_name VARCHAR,
  event_type_color VARCHAR,
  priority VARCHAR,
  status VARCHAR,
  client_name TEXT,
  project_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.title,
    ce.description,
    ce.start_date,
    ce.end_date,
    ce.start_time,
    ce.end_time,
    ce.is_all_day,
    et.name as event_type_name,
    et.color as event_type_color,
    ce.priority,
    ce.status,
    c.name as client_name,
    p.name as project_name
  FROM calendar_events ce
  LEFT JOIN event_types et ON ce.event_type_id = et.id
  LEFT JOIN clients c ON ce.client_id = c.id
  LEFT JOIN projects p ON ce.project_id = p.id
  WHERE ce.user_id = p_user_id
    AND ce.start_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
    AND ce.status != 'cancelled'
  ORDER BY ce.start_date ASC, ce.start_time ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to get events for a specific date range
CREATE OR REPLACE FUNCTION get_events_in_range(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  description TEXT,
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN,
  event_type_name VARCHAR,
  event_type_color VARCHAR,
  event_type_icon VARCHAR,
  priority VARCHAR,
  status VARCHAR,
  client_name TEXT,
  project_name TEXT,
  invoice_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.title,
    ce.description,
    ce.start_date,
    ce.end_date,
    ce.start_time,
    ce.end_time,
    ce.is_all_day,
    et.name as event_type_name,
    et.color as event_type_color,
    et.icon as event_type_icon,
    ce.priority,
    ce.status,
    c.name as client_name,
    p.name as project_name,
    i.invoice_number
  FROM calendar_events ce
  LEFT JOIN event_types et ON ce.event_type_id = et.id
  LEFT JOIN clients c ON ce.client_id = c.id
  LEFT JOIN projects p ON ce.project_id = p.id
  LEFT JOIN invoices i ON ce.invoice_id = i.id
  WHERE ce.user_id = p_user_id
    AND ce.start_date <= p_end_date
    AND (ce.end_date >= p_start_date OR ce.end_date IS NULL)
    AND ce.status != 'cancelled'
  ORDER BY ce.start_date ASC, ce.start_time ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to create recurring expense events
CREATE OR REPLACE FUNCTION create_recurring_expense_events(
  p_user_id UUID,
  p_months_ahead INTEGER DEFAULT 12
)
RETURNS INTEGER AS $$
DECLARE
  rec RECORD;
  event_type_id UUID;
  events_created INTEGER := 0;
  current_due_date DATE;
  end_date DATE;
BEGIN
  -- Get the recurring expense event type
  SELECT id INTO event_type_id
  FROM event_types
  WHERE user_id = p_user_id AND name = 'Gasto Recurrente' AND is_system = TRUE;
  
  IF event_type_id IS NULL THEN
    RETURN 0;
  END IF;
  
  end_date := CURRENT_DATE + (p_months_ahead || ' months')::INTERVAL;
  
  -- Loop through active recurring expenses
  FOR rec IN 
    SELECT * FROM recurring_expenses 
    WHERE user_id = p_user_id AND is_active = TRUE
  LOOP
    current_due_date := rec.next_due_date;
    
    -- Create events for the next period
    WHILE current_due_date <= end_date AND (rec.end_date IS NULL OR current_due_date <= rec.end_date) LOOP
      -- Check if event already exists
      IF NOT EXISTS (
        SELECT 1 FROM calendar_events 
        WHERE user_id = p_user_id 
          AND title = 'Gasto: ' || rec.name
          AND start_date = current_due_date
      ) THEN
        INSERT INTO calendar_events (
          user_id,
          event_type_id,
          title,
          description,
          start_date,
          is_all_day,
          priority,
          reminder_minutes
        ) VALUES (
          p_user_id,
          event_type_id,
          'Gasto: ' || rec.name,
          'Gasto recurrente: ' || rec.description,
          current_due_date,
          TRUE,
          'medium',
          ARRAY[4320, 1440] -- 3 days, 1 day in minutes
        );
        
        events_created := events_created + 1;
      END IF;
      
      -- Calculate next occurrence
      CASE rec.recurrence_pattern
        WHEN 'weekly' THEN
          current_due_date := current_due_date + (rec.recurrence_interval || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
          current_due_date := current_due_date + (rec.recurrence_interval || ' months')::INTERVAL;
        WHEN 'yearly' THEN
          current_due_date := current_due_date + (rec.recurrence_interval || ' years')::INTERVAL;
        ELSE
          current_due_date := current_due_date + (rec.recurrence_interval || ' months')::INTERVAL;
      END CASE;
    END LOOP;
  END LOOP;
  
  RETURN events_created;
END;
$$ LANGUAGE plpgsql;

-- Function to get dashboard notifications
CREATE OR REPLACE FUNCTION get_dashboard_notifications(p_user_id UUID)
RETURNS TABLE (
  notification_type VARCHAR,
  title TEXT,
  message TEXT,
  count INTEGER,
  priority VARCHAR,
  action_url TEXT
) AS $$
DECLARE
  invoice_due_count INTEGER;
  overdue_invoice_count INTEGER;
  upcoming_events_count INTEGER;
  monthly_goal_progress NUMERIC;
  days_until_month_end INTEGER;
BEGIN
  -- Count invoices due this week
  SELECT COUNT(*) INTO invoice_due_count
  FROM invoices i
  WHERE i.user_id = p_user_id
    AND i.status != 'pagada'
    AND i.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7);
  
  -- Count overdue invoices
  SELECT COUNT(*) INTO overdue_invoice_count
  FROM invoices i
  WHERE i.user_id = p_user_id
    AND i.status != 'pagada'
    AND i.due_date < CURRENT_DATE;
  
  -- Count upcoming events this week
  SELECT COUNT(*) INTO upcoming_events_count
  FROM calendar_events ce
  WHERE ce.user_id = p_user_id
    AND ce.start_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7)
    AND ce.status = 'scheduled';
  
  -- Calculate days until month end
  days_until_month_end := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')) - EXTRACT(DAY FROM CURRENT_DATE);
  
  -- Return invoice due notifications
  IF invoice_due_count > 0 THEN
    RETURN QUERY SELECT 
      'invoice_due'::VARCHAR,
      'Facturas por Vencer'::TEXT,
      ('Tienes ' || invoice_due_count || ' factura' || CASE WHEN invoice_due_count > 1 THEN 's' ELSE '' END || ' por vencer esta semana')::TEXT,
      invoice_due_count,
      'high'::VARCHAR,
      '/invoices'::TEXT;
  END IF;
  
  -- Return overdue invoice notifications
  IF overdue_invoice_count > 0 THEN
    RETURN QUERY SELECT 
      'invoice_overdue'::VARCHAR,
      'Facturas Vencidas'::TEXT,
      ('Tienes ' || overdue_invoice_count || ' factura' || CASE WHEN overdue_invoice_count > 1 THEN 's vencidas' ELSE ' vencida' END)::TEXT,
      overdue_invoice_count,
      'urgent'::VARCHAR,
      '/invoices'::TEXT;
  END IF;
  
  -- Return upcoming events notifications
  IF upcoming_events_count > 0 THEN
    RETURN QUERY SELECT 
      'upcoming_events'::VARCHAR,
      'Eventos Próximos'::TEXT,
      ('Tienes ' || upcoming_events_count || ' evento' || CASE WHEN upcoming_events_count > 1 THEN 's' ELSE '' END || ' programado' || CASE WHEN upcoming_events_count > 1 THEN 's' ELSE '' END || ' esta semana')::TEXT,
      upcoming_events_count,
      'medium'::VARCHAR,
      '/agenda'::TEXT;
  END IF;
  
  -- Return month-end reminder
  IF days_until_month_end <= 5 THEN
    RETURN QUERY SELECT 
      'month_end'::VARCHAR,
      'Fin de Mes'::TEXT,
      ('Faltan ' || days_until_month_end || ' días para el cierre del mes')::TEXT,
      days_until_month_end,
      'medium'::VARCHAR,
      '/dashboard'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;
