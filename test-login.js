const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://uhladddzopyimzolwbcb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGFkZGR6b3B5aW16b2x3YmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMTI0MTQsImV4cCI6MjA0NzU4ODQxNH0.8e7tuxfT1U5C0TqyN3l-mWpXKmG4yPjWdUXSwBTp6K4'
)

async function testLogin() {
  console.log('🔐 Testing login with smithrodriguez345@gmail.com...')
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'smithrodriguez345@gmail.com',
    password: 'test'  // Usar la contraseña que estés probando
  })

  if (error) {
    console.error('❌ Error de login:', error)
    console.error('   Status:', error.status)
    console.error('   Message:', error.message)
    console.error('   Hint:', error.__isAuthError ? 'Error de autenticación' : 'Error de servidor')
  } else {
    console.log('✅ Login exitoso!')
    console.log('   User ID:', data.user.id)
    console.log('   Email:', data.user.email)
  }
}

testLogin()
