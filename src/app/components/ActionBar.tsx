import React from 'react';

export default function ActionBar(props: any) {
  return (
    <div className="bg-[#0a0a0a] border border-gray-800/60 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col xl:flex-row gap-6 items-center justify-between relative overflow-hidden">
      
      {/* KIRI: PANEL ABSENSI & WAKTU */}
      <div className="flex items-center gap-4 w-full xl:w-auto relative z-10">
        <button 
          onClick={props.handleAbsensi} 
          className={`px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 w-full md:w-auto flex items-center justify-center gap-2 ${
            props.isCheckedIn 
              ? 'bg-red-950/40 text-red-500 border border-red-900/50 hover:bg-red-900/40' 
              : 'bg-green-600/20 text-green-500 border border-green-500/30 hover:bg-green-600/40 shadow-[0_0_15px_rgba(0,255,0,0.1)]'
          }`}
        >
          {props.isCheckedIn ? (
            <><span className="text-sm">🛑</span> Akhiri Shift</>
          ) : (
            <><span className="text-sm">✅</span> Mulai Shift</>
          )}
        </button>
        
        {props.isCheckedIn && (
          <div className="bg-[#111] border border-gray-800/80 px-4 py-3.5 rounded-xl flex items-center gap-3 w-full md:w-auto justify-center">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(0,255,0,0.8)]"></span>
            <span className="font-mono text-sm font-black text-gray-300 tracking-widest">{props.time}</span>
          </div>
        )}
      </div>

      {/* KANAN: DERETAN TOMBOL AKSI */}
      <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-center xl:justify-end relative z-10">
        
        {/* === TOMBOL UMUM (SEMUA ROLE BISA LIHAT) === */}
        <button 
          onClick={props.openKasir} 
          disabled={!props.isCheckedIn}
          className="bg-yellow-600/10 border border-yellow-600/30 text-yellow-500 hover:bg-yellow-600/30 hover:border-yellow-500/50 px-5 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span className="text-sm">💵</span> Rekap Penjualan
        </button>

        <button 
          onClick={props.openReimburse} 
          className="bg-blue-600/10 border border-blue-600/30 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50 px-5 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
        >
          <span className="text-sm">🧾</span> Reimburse
        </button>


        {/* === TOMBOL KHUSUS BOS (MANAGEMENT ONLY) === */}
        {props.userRole === 'management' && (
          <>
            <div className="hidden md:block w-px h-8 bg-gray-800 mx-2"></div> {/* Garis Pemisah */}

            <button 
              onClick={props.openExpense} 
              className="bg-red-600/10 border border-red-600/30 text-red-400 hover:bg-red-600/30 hover:border-red-500/50 px-5 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <span className="text-sm">📉</span> Pengeluaran
            </button>

            {/* 🔥 TOMBOL EMAS DIVIDEN 🔥 */}
            {/* 🔥 TOMBOL EMAS DIVIDEN 🔥 */}
            <button 
              onClick={props.openDividen} 
              className="bg-yellow-900/40 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500 hover:text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:shadow-[0_0_25px_rgba(234,179,8,0.6)] flex items-center gap-2 relative overflow-hidden group"
            >
              {/* Efek kilap pas di-hover */}
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine"></div>
              <span className="text-sm relative z-10">👑</span> 
              <span className="relative z-10">Dividen</span>
            </button>

            <button 
              onClick={props.sendReport} 
              disabled={props.isSending}
              className="bg-indigo-600/10 border border-indigo-600/30 text-indigo-400 hover:bg-indigo-600/30 hover:border-indigo-500/50 px-5 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <span className="text-sm">📡</span>
              {props.isSending ? 'Mengirim...' : 'Rekap Discord'}
            </button>
          </>
        )}

      </div>
    </div>
  );
}