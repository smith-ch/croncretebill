-- Calendar/Agenda System Database Schema
-- This script creates the necessary tables for the calendar/agenda functionality

-- Event types for categorizing calendar events
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- Hex color code
  icon VARCHAR(50) DEFAULT 'calendar',
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- System-defined types (invoice due, expense reminder)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

-- Main calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL,
  
  -- Event details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  
  -- Date and time
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT FALSE,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'yearly'
  recurrence_interval INTEGER DEFAULT 1, -- Every X days/weeks/months
  recurrence_end_date DATE,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE, -- For recurring event instances
  
  -- Related entities
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  
  -- Status and priority
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'postponed'
  priority VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Notifications
  reminder_minutes INTEGER[], -- Array of minutes before event to remind
  notification_sent BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (start_date <= end_date OR end_date IS NULL),
  CHECK (start_time <= end_time OR end_time IS NULL OR is_all_day = TRUE)
);

-- Recurring expense templates
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  
  -- Expense details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  category VARCHAR(100),
  
  -- Recurrence settings
  recurrence_pattern VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'weekly', 'monthly', 'yearly'
  recurrence_interval INTEGER DEFAULT 1,
  day_of_month INTEGER, -- For monthly: which day (1-31)
  day_of_week INTEGER, -- For weekly: which day (0=Sunday, 6=Saturday)
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  auto_create_expense BOOLEAN DEFAULT FALSE, -- Automatically create expense records
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar notification preferences
CREATE TABLE IF NOT EXISTS calendar_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification types
  invoice_due_days INTEGER[] DEFAULT ARRAY[7, 3, 1], -- Days before invoice due to notify
  expense_reminder_days INTEGER[] DEFAULT ARRAY[3, 1], -- Days before recurring expense due
  meeting_reminder_minutes INTEGER[] DEFAULT ARRAY[60, 15], -- Minutes before meetings
  
  -- Delivery preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  dashboard_notifications BOOLEAN DEFAULT TRUE,
  weekly_summary_email BOOLEAN DEFAULT TRUE,
  weekly_summary_day INTEGER DEFAULT 1, -- 1=Monday, 7=Sunday
  
  -- Monthly goal notifications
  monthly_goal_reminder BOOLEAN DEFAULT TRUE,
  monthly_goal_reminder_days INTEGER DEFAULT 5, -- Days before month end
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range ON calendar_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client ON calendar_events(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON calendar_events(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_invoice ON calendar_events(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_recurring ON calendar_events(is_recurring, parent_event_id);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_active ON recurring_expenses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON recurring_expenses(next_due_date) WHERE is_active = TRUE;

-- Insert default event types
INSERT INTO event_types (user_id, name, color, icon, description, is_system)
SELECT 
  auth.uid(),
  'Vencimiento de Factura',
  '#EF4444',
  'receipt',
  'Fecha de vencimiento de facturas',
  TRUE
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO event_types (user_id, name, color, icon, description, is_system)
SELECT 
  auth.uid(),
  'Gasto Recurrente',
  '#F59E0B',
  'credit-card',
  'Recordatorio de gastos recurrentes',
  TRUE
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO event_types (user_id, name, color, icon, description, is_system)
SELECT 
  auth.uid(),
  'Reunión con Cliente',
  '#10B981',
  'users',
  'Reuniones programadas con clientes',
  TRUE
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO event_types (user_id, name, color, icon, description, is_system)
SELECT 
  auth.uid(),
  'Cierre Contable',
  '#8B5CF6',
  'calculator',
  'Cierre contable mensual',
  TRUE
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

-- Insert default notification preferences for existing users
INSERT INTO calendar_notifications (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Functions for automatic event creation

-- Function to create invoice due date events
CREATE OR REPLACE FUNCTION create_invoice_due_event()
RETURNS TRIGGER AS $$
DECLARE
  event_type_id UUID;
BEGIN
  -- Get the invoice due event type
  SELECT id INTO event_type_id
  FROM event_types
  WHERE user_id = NEW.user_id AND name = 'Vencimiento de Factura' AND is_system = TRUE;
  
  -- Create calendar event for invoice due date
  IF NEW.due_date IS NOT NULL AND event_type_id IS NOT NULL THEN
    INSERT INTO calendar_events (
      user_id,
      event_type_id,
      title,
      description,
      start_date,
      is_all_day,
      invoice_id,
      priority,
      reminder_minutes
    ) VALUES (
      NEW.user_id,
      event_type_id,
      'Vencimiento: Factura ' || NEW.invoice_number,
      'Fecha de vencimiento de la factura ' || NEW.invoice_number,
      NEW.due_date,
      TRUE,
      NEW.id,
      'high',
      ARRAY[10080, 4320, 1440] -- 7 days, 3 days, 1 day in minutes
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice due dates
DROP TRIGGER IF EXISTS trigger_create_invoice_due_event ON invoices;
CREATE TRIGGER trigger_create_invoice_due_event
  AFTER INSERT OR UPDATE OF due_date ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION create_invoice_due_event();

-- Function to update recurring expense next due date
CREATE OR REPLACE FUNCTION update_recurring_expense_next_due()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate next due date based on recurrence pattern
  CASE NEW.recurrence_pattern
    WHEN 'weekly' THEN
      NEW.next_due_date := NEW.start_date + (NEW.recurrence_interval || ' weeks')::INTERVAL;
    WHEN 'monthly' THEN
      NEW.next_due_date := NEW.start_date + (NEW.recurrence_interval || ' months')::INTERVAL;
    WHEN 'yearly' THEN
      NEW.next_due_date := NEW.start_date + (NEW.recurrence_interval || ' years')::INTERVAL;
    ELSE
      NEW.next_due_date := NEW.start_date + (NEW.recurrence_interval || ' months')::INTERVAL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for recurring expenses
DROP TRIGGER IF EXISTS trigger_update_recurring_expense_next_due ON recurring_expenses;
CREATE TRIGGER trigger_update_recurring_expense_next_due
  BEFORE INSERT OR UPDATE ON recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_expense_next_due();
