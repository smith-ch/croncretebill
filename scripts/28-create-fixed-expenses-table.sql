-- Create fixed_expenses table for recurring business expenses
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annually')),
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  last_payment DATE,
  next_payment DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own fixed expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Users can insert their own fixed expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Users can update their own fixed expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Users can delete their own fixed expenses" ON public.fixed_expenses;

-- Create policies
CREATE POLICY "Users can view their own fixed expenses" ON public.fixed_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fixed expenses" ON public.fixed_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed expenses" ON public.fixed_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed expenses" ON public.fixed_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user_id ON public.fixed_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_next_payment ON public.fixed_expenses(next_payment);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at
DROP TRIGGER IF EXISTS update_fixed_expenses_updated_at ON public.fixed_expenses;
CREATE TRIGGER update_fixed_expenses_updated_at
    BEFORE UPDATE ON public.fixed_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();