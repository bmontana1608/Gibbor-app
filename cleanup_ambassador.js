require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixInconsistentUser() {
  const email = 'upz86evento@gmail.com';
  
  // 1. Find the user in Supabase Auth
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }
  
  const user = usersData.users.find(u => u.email === email);
  if (!user) {
    console.log(`User with email ${email} not found in auth.users.`);
    return;
  }
  
  console.log(`Found user: ${user.id}. Deleting...`);
  
  // 2. Delete the user
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Error deleting user:", deleteError);
    return;
  }
  
  console.log("Successfully deleted auth user. Also cleaning up any orphan perfiles...");
  
  // 3. Delete from perfiles if it exists
  await supabaseAdmin.from('perfiles').delete().eq('id', user.id);
  
  console.log("Cleanup complete. The user can now be recreated.");
}

fixInconsistentUser();
