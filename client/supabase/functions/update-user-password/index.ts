import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Kunci sakti (Service Role) buat nembus keamanan Supabase
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { email, newPassword } = await req.json()

    if (!email || !newPassword) {
      throw new Error("Email dan Password baru wajib dikirim!")
    }

    // 1. Cari User ID berdasarkan email (siluman)
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError
    
    const userToUpdate = users.users.find(u => u.email === email)
    if (!userToUpdate) {
      throw new Error("User tidak ditemukan di sistem Auth!")
    }

    // 2. Paksa ganti password pakai Kunci Sakti
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userToUpdate.id,
      { password: newPassword }
    )

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ message: "Password berhasil diubah", data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})