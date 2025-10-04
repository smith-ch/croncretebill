-- Update existing calendar_events table to support agenda functionality
-- Add missing columns to existing table if they don't exist

-- Add priority column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calendar_events' AND column_name='priority') THEN
        ALTER TABLE calendar_events ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
    END IF;
END $$;

-- Ensure RLS is enabled on calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies for calendar_events
DROP POLICY IF EXISTS "Users can only see their own calendar events" ON calendar_events;
CREATE POLICY "Users can only see their own calendar events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own calendar events" ON calendar_events;
CREATE POLICY "Users can insert their own calendar events" ON calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calendar events" ON calendar_events;
CREATE POLICY "Users can update their own calendar events" ON calendar_events
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own calendar events" ON calendar_events;
CREATE POLICY "Users can delete their own calendar events" ON calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

-- Insert some sample agenda data for testing (optional)
-- You can remove this section if you don't want sample data
INSERT INTO calendar_events (user_id, title, description, date, start_time, end_time, location, is_all_day, recurring_pattern, status, priority)
SELECT 
  id,
  'Reunión de planificación',
  'Reunión semanal de planificación de proyectos',
  CURRENT_DATE + INTERVAL '2 days',
  '10:00:00',
  '11:00:00',
  'Oficina principal',
  false,
  'none',
  'scheduled',
  'medium'
FROM auth.users 
WHERE email IS NOT NULL
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO calendar_events (user_id, title, description, date, start_time, end_time, location, is_all_day, recurring_pattern, status, priority)
SELECT 
  id,
  'Pago de servicios',
  'Recordatorio: Pago mensual de servicios públicos',
  CURRENT_DATE + INTERVAL '5 days',
  '09:00:00',
  '09:30:00',
  '',
  true,
  'monthly',
  'scheduled',
  'high'
FROM auth.users 
WHERE email IS NOT NULL
LIMIT 1
ON CONFLICT DO NOTHING;