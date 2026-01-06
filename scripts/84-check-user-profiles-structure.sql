-- Ver la estructura de user_profiles
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Ver el registro actual de tu usuario
SELECT *
FROM user_profiles
WHERE email = 'smithrodriguez345@gmail.com';
