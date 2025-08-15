-- Add missing columns to delivery_notes table
ALTER TABLE delivery_notes 
ADD COLUMN IF NOT EXISTS plant_manager TEXT,
ADD COLUMN IF NOT EXISTS resistance TEXT,
ADD COLUMN IF NOT EXISTS slump TEXT,
ADD COLUMN IF NOT EXISTS trip_number TEXT DEFAULT '1',
ADD COLUMN IF NOT EXISTS direct_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fiber BOOLEAN DEFAULT false;

-- Update existing records to have default values
UPDATE delivery_notes 
SET 
  plant_manager = COALESCE(plant_manager, ''),
  resistance = COALESCE(resistance, ''),
  slump = COALESCE(slump, ''),
  trip_number = COALESCE(trip_number, '1'),
  direct_delivery = COALESCE(direct_delivery, false),
  fiber = COALESCE(fiber, false)
WHERE plant_manager IS NULL 
   OR resistance IS NULL 
   OR slump IS NULL 
   OR trip_number IS NULL 
   OR direct_delivery IS NULL 
   OR fiber IS NULL;
