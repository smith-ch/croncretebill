-- Create agenda_events table for agenda functionality
-- This table stores events, reminders, and tasks created in the agenda

CREATE TABLE IF NOT EXISTS public.agenda_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('invoice', 'expense', 'payment', 'reminder', 'task')),
  amount DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can insert their own agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can update their own agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can delete their own agenda events" ON public.agenda_events;

-- Create policies
CREATE POLICY "Users can view their own agenda events" ON public.agenda_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agenda events" ON public.agenda_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agenda events" ON public.agenda_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agenda events" ON public.agenda_events
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agenda_events_user_id ON public.agenda_events(user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_events_due_date ON public.agenda_events(due_date);
CREATE INDEX IF NOT EXISTS idx_agenda_events_status ON public.agenda_events(status);
CREATE INDEX IF NOT EXISTS idx_agenda_events_type ON public.agenda_events(type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agenda_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at
DROP TRIGGER IF EXISTS update_agenda_events_updated_at ON public.agenda_events;
CREATE TRIGGER update_agenda_events_updated_at
    BEFORE UPDATE ON public.agenda_events
    FOR EACH ROW
    EXECUTE FUNCTION update_agenda_events_updated_at();