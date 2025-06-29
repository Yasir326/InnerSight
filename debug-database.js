const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

function debugLog(...args) {
  if (process.env.DEBUG) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseTrigger() {
  debugLog('🔍 Testing database trigger and profile creation...\n');

  try {
    // Test 1: Check if profiles table exists and is accessible
    debugLog('1️⃣ Testing profiles table access...');
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError);
    } else {
      debugLog('✅ Profiles table accessible');
    }

    // Test 2: Check if we can manually insert a profile (to test RLS policies)
    debugLog('\n2️⃣ Testing manual profile insertion...');
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
    const { data: insertTest, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        name: 'Test User'
      })
      .select();

    if (insertError) {
      console.error('❌ Manual profile insert error:', insertError);
      debugLog('This suggests RLS policies might be blocking the trigger');
    } else {
      debugLog('✅ Manual profile insert successful');
      // Clean up test data
      await supabase.from('profiles').delete().eq('user_id', testUserId);
    }

    // Test 3: Check if the trigger function exists
    debugLog('\n3️⃣ Checking if trigger function exists...');
    const { data: functionCheck, error: functionError } = await supabase
      .rpc('handle_new_user'); // This will fail but tell us if function exists

    if (functionError) {
      if (functionError.message.includes('function handle_new_user() does not exist')) {
        console.error('❌ Trigger function does not exist in database');
        debugLog('You need to run the database migration to create the trigger');
      } else {
        debugLog('✅ Trigger function exists (expected error calling it directly)');
      }
    }

    // Test 4: Try a test signup to see the actual error
    debugLog('\n4️⃣ Testing actual signup...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123',
      options: {
        data: {
          name: 'Test User'
        }
      }
    });

    if (signupError) {
      console.error('❌ Signup error:', signupError);
    } else {
      debugLog('✅ Signup successful');
      debugLog('User ID:', signupData.user?.id);
      
      // Check if profile was created
      if (signupData.user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', signupData.user.id);
        
        if (profileError) {
          console.error('❌ Profile check error:', profileError);
        } else if (profileData && profileData.length > 0) {
          debugLog('✅ Profile created successfully:', profileData[0]);
        } else {
          console.error('❌ No profile found - trigger failed');
        }
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testDatabaseTrigger(); 