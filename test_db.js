require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('daily_dispatches').select('id, dispatch_date, status, dispatch_status, created_at, driver_id');
  console.log(JSON.stringify(data, null, 2));
}
run();
