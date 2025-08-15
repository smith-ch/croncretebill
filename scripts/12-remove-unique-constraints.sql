-- Remove unique constraints from drivers and vehicles tables
-- This allows multiple users to have drivers/vehicles with same cedula/plate

-- Remove unique constraint from drivers.cedula
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_cedula_key;

-- Remove unique constraint from vehicles.plate  
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_plate_key;
