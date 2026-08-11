import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// 🔥 Wajib ada untuk menghindari error CORS dari React
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 🔥 Handle preflight request (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ambil data dari frontend (EditUser.jsx)
    const { oldEmail, newEmail } = await req.json()

    if (!oldEmail || !newEmail) {
      throw new Error("oldEmail dan newEmail wajib diisi!")
    }

    // 🔥 Buat client Supabase KHUSUS ADMIN (Pakai Service Role Key)
    // Jangan pakai anon key, karena anon key tidak punya izin ganti email user lain
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Cari user ID berdasarkan oldEmail
    const { data: { users }, error: fetchError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (fetchError) throw fetchError

    const userToUpdate = users.find((u) => u.email === oldEmail)

    if (!userToUpdate) {
      throw new Error(`User dengan email ${oldEmail} tidak ditemukan di sistem Autentikasi.`)
    }

    // 2. Update email user tersebut
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userToUpdate.id,
      { email: newEmail }
    )

    if (updateError) throw updateError

    // Sukses! Kembalikan respon 200 OK ke frontend
    return new Response(
      JSON.stringify({ message: "Email berhasil diupdate!", user: updatedUser }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    // Tangkap error dan kembalikan pesan error ke frontend (Ini mencegah non-2xx tanpa alasan jelas)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})