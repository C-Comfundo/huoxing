const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('--- fetching profile ---');
  const { data: profile, error } = await supabase.from('profiles').select('*').limit(1).single();
  console.log('Current profile:', profile, error);
  if (!profile) return;
  console.log('--- upserting ---');
  const updateData = { id: profile.id, display_name: '疯丫梨23A', updated_at: new Date().toISOString() };
  const { error: upsertError } = await supabase.from('profiles').upsert(updateData);
  console.log('Upsert error:', upsertError);
  console.log('--- fetching profile again ---');
  const { data: profileAfter, error: err2 } = await supabase.from('profiles').select('*').eq('id', profile.id).single();
  console.log('After update:', profileAfter, err2);
}
run();
