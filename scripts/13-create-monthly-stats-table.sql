-- Create monthly_stats table
CREATE TABLE IF NOT EXISTS monthly_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    total_invoices INTEGER DEFAULT 0,
    total_delivery_notes INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Enable RLS
ALTER TABLE monthly_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own monthly stats" ON monthly_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly stats" ON monthly_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly stats" ON monthly_stats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly stats" ON monthly_stats
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_stats_user_date ON monthly_stats(user_id, year, month);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_monthly_stats_updated_at
    BEFORE UPDATE ON monthly_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_stats_updated_at();
