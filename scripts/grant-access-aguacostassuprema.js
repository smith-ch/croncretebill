const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://uhladddzopyimzolwbcb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGFkZGR6b3B5aW16b2x3YmNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzkwMDI1NiwiZXhwIjoyMDY5NDc2MjU2fQ.mw77YTe5II6IYAdT-yC39IjQpNer0HeEhdfhtk6DGPE';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchAllUsers() {
    try {
        let allUsers = [];
        let page = 1;

        // Supabase admin.listUsers does pagination up to 50 max? Let's check.
        while (true) {
            const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
            if (error) throw error;
            if (!data || !data.users || data.users.length === 0) break;

            allUsers = allUsers.concat(data.users);
            if (data.users.length < 1000) break;
            page++;
        }

        const targetUser = allUsers.find(u => u.email === 'aguacostassuprema@gmail.com');
        if (targetUser) {
            console.log('Target found! ID:', targetUser.id);
            fs.writeFileSync('target_user.json', JSON.stringify(targetUser, null, 2), 'utf-8');
        } else {
            console.log('Target NOT found in', allUsers.length, 'users');
            // maybe search without s
            const similar = allUsers.filter(u => u.email && u.email.includes('agua'));
            console.log('Similar:', similar.map(u => u.email));
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

fetchAllUsers();
