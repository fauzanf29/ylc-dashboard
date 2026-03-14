"use client";

import React from 'react';

export default function ValuasiGudang({ inventory }: { inventory: any[] }) {
  // 1. Kalkulasi Matematika dari Sisa Stok
  const valuasi = inventory?.reduce((acc, item) => {
    const qty = item.stock || 0;
    const hargaJual = item.price || 0;
    const hargaModal = item.modal || 0;

    const kotorItem = qty * hargaJual;
    const modalItem = qty * hargaModal;

    acc.totalKotor += kotorItem;
    acc.totalModal += modalItem;
    return acc;
  }, { totalKotor: 0, totalModal: 0 });

  // 2. Potongan & Keuntungan Bersih Global
  const potonganSetoran = valuasi.totalKotor * 0.2;
  const bersih = valuasi.totalKotor - potonganSetoran - valuasi.totalModal;

  // 3. Filter cuma barang yang masih ada sisa stoknya aja
  const stokTersisa = inventory?.filter((item: any) => (item.stock || 0) > 0) || [];

  return (
    <div className="bg-cardBg border border-gray-800 rounded-3xl overflow-hidden shadow-2xl mt-8">
      {/* HEADER */}
      <div className="p-6 border-b border-gray-800 bg-darkBg/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-black italic uppercase tracking-widest text-sm text-green-500 flex items-center gap-2">
            💎 Estimasi Valuasi Gudang
          </h3>
          <p className="text-[10px] text-gray-500 uppercase mt-1">Potensi pendapatan jika semua sisa stok laku terjual</p>
        </div>
        <div className="bg-green-900/20 border border-green-800/50 px-4 py-1.5 rounded-full">
          <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
            Total {stokTersisa.length} Jenis Item Tersisa
          </p>
        </div>
      </div>

      {/* TAMPILAN ANGKA GLOBAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-800">
        <div className="p-5 bg-black/20">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Kotor (Potensi)</p>
          <p className="text-xl font-black text-gray-200">$ {valuasi.totalKotor.toLocaleString('id-ID')}</p>
        </div>
        <div className="p-5 bg-orange-900/10">
          <p className="text-[9px] text-orange-400 font-bold uppercase tracking-widest mb-1">Beban Modal (-)</p>
          <p className="text-xl font-black text-orange-400">-$ {valuasi.totalModal.toLocaleString('id-ID')}</p>
        </div>
        <div className="p-5 bg-red-900/10">
          <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest mb-1">Setoran 20% (-)</p>
          <p className="text-xl font-black text-red-400">-$ {potonganSetoran.toLocaleString('id-ID')}</p>
        </div>
        <div className="p-5 bg-green-900/20 relative overflow-hidden flex flex-col justify-center">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-500/10 rounded-full blur-xl pointer-events-none"></div>
          <p className="text-[9px] text-green-400 font-bold uppercase tracking-widest mb-1 relative z-10">Estimasi Bersih (Hak Klub)</p>
          <p className="text-2xl font-black text-green-400 relative z-10">$ {bersih.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* RINCIAN ASET MENGENDAP */}
      <div className="p-6 border-t border-gray-800 bg-black/40">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Rincian Barang Mengendap</p>
        
        {stokTersisa.length === 0 ? (
          <p className="text-sm text-gray-600 font-bold italic">Gudang kosong melompong, Bos!</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {stokTersisa.map((item: any, idx: number) => {
              const kotor = item.stock * (item.price || 0);
              const modal = item.stock * (item.modal || 0);
              const setor = kotor * 0.2;
              const profitBersih = kotor - setor - modal;

              return (
                <div key={idx} className="bg-darkBg border border-gray-700/50 pr-4 pl-3 py-2 rounded-xl flex items-center gap-3 hover:border-gray-500 transition-colors group">
                  <div>
                    <span className="text-gray-300 font-black text-xs uppercase tracking-wide block">{item.name}</span>
                    <span className="text-[8px] text-green-500/70 font-bold uppercase tracking-widest group-hover:text-green-400 transition-colors">
                      +$ {profitBersih.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <span className="bg-blue-900/20 text-blue-400 border border-blue-800/30 px-2 py-1 rounded text-xs font-black shadow-inner">
                    {item.stock}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KETERANGAN PROYEKSI KAS (BARU) */}
      <div className="p-5 bg-blue-950/30 border-t border-blue-900/50 flex items-start gap-4">
        <div className="text-2xl mt-1 animate-bounce">💡</div>
        <div>
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Proyeksi Kas Brankas</p>
          <p className="text-xs text-blue-200/80 leading-relaxed font-medium">
            Jika seluruh sisa barang di atas laku terjual, maka Kas Brankas (setelah dipotong pengembalian uang modal restock dan setoran wajib 20%) akan mendapat <strong className="text-green-400">suntikan dana bersih tambahan sebesar $ {bersih.toLocaleString('id-ID')}</strong>.
          </p>
        </div>
      </div>

    </div>
  );
}