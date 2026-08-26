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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Server Environment Variables (URL/ServiceKey) belum diset!")
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    console.log("Payload diterima di Edge Function:", body)

    const { email, newPassword } = body

    if (!email || !newPassword) {
      throw new Error("Email dan Password baru wajib dikirim!")
    }

    const cleanEmail = email.trim().toLowerCase()

    // 🔥 CARI USER LANGSUNG BERDASARKAN EMAIL DI AUTH (TANPA BATASAN LIST)
    // Catatan: Sebagian versi supabase-js menggunakan getUserByEmail atau listUsers dengan filter.
    // Kita gunakan cara paling aman dengan mencari user via listUsers dengan parameter tambahan atau mencocokkan UUID jika ada.
    // Alternatif paling aman di Deno v2:
    const { data: userData, error: findError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Tarik sampai 1000 user pertama biar tidak terlewat
    })

    if (findError) throw findError

    const userToUpdate = userData.users.find(u => u.email?.trim().toLowerCase() === cleanEmail)

    if (!userToUpdate) {
      throw new Error(`User dengan email '${cleanEmail}' benar-benar tidak ditemukan di Auth!`)
    }

    console.log(`User ditemukan! ID: ${userToUpdate.id}, Mengupdate password...`)

    // 🔥 PAKSA UPDATE PASSWORD BERDASARKAN ID USER YANG KETEMU
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
    console.error("Error tertangkap di Edge Function:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})