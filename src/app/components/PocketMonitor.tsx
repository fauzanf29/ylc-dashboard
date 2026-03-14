"use client";

import React, { useEffect, useState } from 'react';

interface PocketMonitorProps {
  userName?: string; 
}

export default function PocketMonitor({ userName }: PocketMonitorProps) {
  const [activePockets, setActivePockets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State baru buat nyimpen nama petinggi HANYA SEKALI
  const [petinggiNames, setPetinggiNames] = useState<string[]>([]);

  // ==========================================
  // 🚨 DAFTAR JABATAN VIP (SEKARANG BEBAS HURUF BESAR/KECIL)
  // ==========================================
  const vipRoles = ["management", "bos", "manager", "owner", "wakil"]; 

  // ==========================================
  // 1. TARIK DATA JABATAN (JALAN 1 KALI SAJA PAS WEB DIBUKA)
  // ==========================================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const usersData = await res.json();
          
          // Paksa semua tulisan di vipRoles jadi HURUF BESAR
          const vipRolesUpper = vipRoles.map(r => r.toUpperCase());

          const names = usersData
            .filter((user: any) => vipRolesUpper.includes((user.Role || "").toString().trim().toUpperCase()))
            .map((user: any) => (user.Nama_RP || "").toString().trim().toUpperCase());
            
          setPetinggiNames(names);
        }
      } catch (e) {
        console.error("Gagal load data VIP");
      }
    };
    
    // Tarik data VIP hanya kalau yang buka ini Bos/SPV (Radar Utama)
    if (!userName) fetchUsers();
  }, [userName]);

  // ==========================================
  // 2. TARIK DATA RADAR (YANG DI-LOOP)
  // ==========================================
  const fetchPockets = async () => {
    setIsLoading(true);
    try {
      const resMutasi = await fetch('/api/mutasi', { cache: 'no-store' });
      if (resMutasi.ok) {
        let mutasiData = await resMutasi.json();

        // Mode Staf: Lihat sendiri
        if (userName) {
          mutasiData = mutasiData.filter((p: any) => p.nama === userName);
        } 
        // Mode SPV: Sembunyikan VIP
        else {
          mutasiData = mutasiData.filter((p: any) => {
            const namaStafDiMutasi = (p.nama || "").toString().trim().toUpperCase();
            return !petinggiNames.includes(namaStafDiMutasi);
          });
        }
        
        setActivePockets(mutasiData);
      }
    } catch (e) {
      console.error("Gagal narik radar:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 3. AUTO REFRESH (HEMAT KUOTA 60 DETIK)
  // ==========================================
  useEffect(() => {
    fetchPockets();
    const interval = setInterval(fetchPockets, 60000); 
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, petinggiNames]);

  // LOGIKA TAMPILAN
  const groupedPockets = activePockets.reduce((acc: any, curr: any) => {
    if (!acc[curr.nama]) {
      acc[curr.nama] = { nama: curr.nama, waktu: curr.waktu, items: [] };
    }
    acc[curr.nama].items.push({
      item: curr.item, ambil: curr.ambil, terjual: curr.terjual, sisa: curr.sisa
    });
    return acc;
  }, {});

  const displayPockets = Object.values(groupedPockets);

  if (userName && displayPockets.length === 0) return null; 

  return (
    <div className="bg-cardBg border border-gray-800 rounded-3xl overflow-hidden shadow-2xl mt-8">
      {/* HEADER RADAR */}
      <div className="p-6 border-b border-gray-800 bg-darkBg/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <h3 className="font-black italic uppercase tracking-widest text-sm text-red-500">
            {userName ? '🎒 BARANG DI KANTONG PRIBADI' : '🚨 LIVE POCKET RADAR'}
          </h3>
        </div>
        <button 
          onClick={fetchPockets} 
          disabled={isLoading} 
          className="text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-full transition-all disabled:opacity-50"
        >
          {isLoading ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

      <div className="p-6">
        {displayPockets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">✅ Semua Kantong Staf Kosong</p>
            <p className="text-[10px] text-gray-600 mt-1">Tidak ada staf yang beredar membawa barang klub.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPockets.map((person: any, index: number) => (
              <div key={index} className="bg-darkBg border border-red-900/40 p-5 rounded-2xl relative flex flex-col h-full overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-bl-[100px] pointer-events-none"></div>
                
                <div className="relative z-10 border-b border-red-900/30 pb-3 mb-3 flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-red-400 uppercase text-base tracking-wide">{person.nama}</h4>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Waktu: {person.waktu}</p>
                  </div>
                  <span className="bg-red-950 text-red-400 border border-red-800/50 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">Keliling</span>
                </div>
                
                <div className="relative z-10 space-y-2 flex-grow">
                  {person.items.map((it: any, idx: number) => (
                    <div key={idx} className="bg-red-950/20 border border-red-900/30 p-2.5 rounded-xl flex justify-between items-center hover:bg-red-900/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="text-lg grayscale opacity-80">📦</div>
                        <div>
                          <p className="text-xs font-bold text-gray-200">{it.item}</p>
                          <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">
                            Bawa: <span className="text-gray-300">{it.ambil}</span> &bull; Laku: <span className="text-green-500/80">{it.terjual}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right pl-2 border-l border-red-900/30">
                        <p className="text-[8px] text-red-500/70 font-bold uppercase tracking-widest mb-0.5">Sisa</p>
                        <p className="font-black text-red-500 text-sm leading-none">{it.sisa}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}