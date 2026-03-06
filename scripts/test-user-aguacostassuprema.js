const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://uhladddzopyimzolwbcb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGFkZGR6b3B5aW16b2x3YmNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzkwMDI1NiwiZXhwIjoyMDY5NDc2MjU2fQ.mw77YTe5II6IYAdT-yC39IjQpNer0HeEhdfhtk6DGPE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const allEmails = authUsers?.users?.map(u => u.email) || [];
    fs.writeFileSync('output3.json', JSON.stringify(allEmails, null, 2), 'utf-8');
}

checkUser();
