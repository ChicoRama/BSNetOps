import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { users } = await req.json()
    const results = []

    for (const user of users) {
      try {
        // 1. Buat akun Auth (Login)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: '12345678',
          email_confirm: true 
        })

        if (authError) throw authError

        // Bikin ID BSN otomatis jika kosong
        const generatedStaffId = user.staff_id || `BSN-${Math.floor(100 + Math.random() * 900)}`

        // 2. Masukkan ke tabel public.user_roles (Sesuai kolom database aslimu!)
        const { error: dbError } = await supabaseAdmin
          .from('user_roles')
          .upsert([{
            id: authData.user.id,
            email: user.email,
            username: user.name,          // 👈 Sesuai kolom database
            nama_lengkap: user.name,      // 👈 Kita isi dua-duanya biar aman jaya
            role: (user.role || 'user').toLowerCase(),
            unit: user.unit || '',
            staff_id: generatedStaffId,
            is_suspended: false,          // 👈 Tipe data boolean yang benar
            is_first_login: true
          }], { onConflict: 'email' })

        if (dbError) throw dbError

        results.push({ email: user.email, status: 'Berhasil' })
      } catch (err) {
        results.push({ email: user.email, status: 'Gagal', error: err.message })
      }
    }

    return new Response(
      JSON.stringify({ message: "Import massal selesai", results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})