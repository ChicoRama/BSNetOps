import React, { useState, useMemo } from 'react';
import { Mail, MessageCircle } from 'lucide-react';

export default function Bantuan() {
  const [openFaq, setOpenFaq] = useState(1);
  const [query, setQuery] = useState('');

  const faqs = [
    {
      id: 1,
      category: 'Permintaan',
      q: 'Bagaimana cara mengajukan permintaan aset/barang?',
      a: "Masuk ke Dashboard akun Anda, pilih menu 'Aset', tentukan perangkat yang ingin diminta, lalu isi formulir 'Ajukan Permintaan'. Permintaan Anda akan dikirim ke Manager untuk persetujuan."
    },
    {
      id: 2,
      category: 'Approval',
      q: 'Berapa lama proses persetujuan (approval) permintaan?',
      a: 'Proses persetujuan oleh Manager dan Admin IT Operations biasanya memakan waktu maksimal 1x24 jam kerja.'
    },
    {
      id: 3,
      category: 'Teknis',
      q: 'Apa yang harus dilakukan jika perangkat mengalami masalah teknis?',
      a: "Segera laporkan kendala atau hubungi Helpdesk IT Operations melalui nomor ekstensi internal atau kontak yang tersedia."
    },
    {
      id: 4,
      category: 'Sign Up/Register',
      q: 'Bagaimana cara mendaftar akun?',
      a: 'Kunjungi halaman utama web/aplikasi, klik tombol "Sign Up". Atau saat masuk di tombol "Sign In", klik "Daftar Sekarang".'
    },
    {
      id: 5,
      category: 'Sign In/Login',
      q: 'Bagaimana cara masuk ke akun?',
      a: 'Kunjungi halaman utama web/aplikasi, klik tombol "Sign In" dan masukkan kredensial akun Anda (username/email dan password).'
    }
  ];

  const filteredFaqs = useMemo(() => {
    return faqs.filter((f) => {
      const matchQuery =
        query.trim() === '' ||
        f.q.toLowerCase().includes(query.toLowerCase()) ||
        f.a.toLowerCase().includes(query.toLowerCase());
      return matchQuery;
    });
  }, [query]);

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-300/40 p-8 md:p-14">
      
      <div className="mb-10 max-w-xl mx-auto">
        <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#00664b] focus-within:ring-4 focus-within:ring-[#00664b]/10 transition-all">
          <svg className="w-5 h-5 text-slate-400 shrink-0 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik kendala Anda di sini (misal: pengembalian barang)..."
            className="bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 w-full font-medium"
          />
        </div>
      </div>

      <div className="space-y-12">
        
        {/* Kontak IT Support */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 pb-2 mb-4 border-b-2 border-[#00664b]/15">
            Kontak Darurat (IT Support)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a 
              href="mailto:inventory.bsn@gmail.com"
              className="group p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-start gap-4 cursor-pointer"
            >
              <div className="p-3 bg-emerald-50 text-[#00664b] rounded-xl group-hover:bg-[#00664b] group-hover:text-white transition-colors shrink-0">
                <Mail size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-sm group-hover:text-[#00664b] transition-colors">
                  Email Support
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">inventory.bsn@gmail.com</p>
              </div>
            </a>

            <a 
              href="https://wa.me/6285157778659"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-start gap-4 cursor-pointer"
            >
              <div className="p-3 bg-emerald-50 text-[#00664b] rounded-xl group-hover:bg-[#00664b] group-hover:text-white transition-colors shrink-0">
                <MessageCircle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-sm group-hover:text-[#00664b] transition-colors">
                  WhatsApp Support
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">+62 851-5777-8659</p>
              </div>
            </a>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 mb-6 border-b-2 border-[#00664b]/15">
            <h2 className="text-lg font-bold text-slate-900">
              Pertanyaan Sering Diajukan
            </h2>
          </div>

          <div className="divide-y divide-slate-200/60 bg-white rounded-2xl border border-slate-200/80 px-2 shadow-sm">
            {filteredFaqs.length === 0 && (
              <p className="text-sm font-medium text-slate-400 py-8 text-center">
                Pertanyaan tidak ditemukan. Coba gunakan kata kunci lain.
              </p>
            )}

            {filteredFaqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div key={faq.id} className="py-2">
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex justify-between items-center text-left gap-4 p-4 group rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      {/* Bulatan hijau #00664b seragam */}
                      <span className="w-2 h-2 rounded-full shrink-0 shadow-sm bg-[#00664b]" />
                      <span className="font-bold text-slate-700 text-sm group-hover:text-[#00664b] transition-colors">
                        {faq.q}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full border text-xs font-black transition-all duration-300 ${
                        isOpen
                          ? 'bg-[#00664b] border-[#00664b] text-white rotate-180 shadow-md'
                          : 'border-slate-300 text-slate-400 group-hover:border-[#00664b] group-hover:text-[#00664b]'
                      }`}
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-in-out px-4 ${
                      isOpen ? 'grid-rows-[1fr] opacity-100 pb-4' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm leading-relaxed text-slate-600 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/60">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}