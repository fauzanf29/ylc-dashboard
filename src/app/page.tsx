"use client";

import React, { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";

export default function Page() {
  const { data: session, status } = useSession();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);

  // === STATE UNTUK POP-UP MODAL ===
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ item: '', action: 'ambil' as 'ambil' | 'taruh', maxStock: 0 });
  const [qtyInput, setQtyInput] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCheckedIn) interval = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn]);

  const fetchInventory = async () => {
    setIsInventoryLoading(true);
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) setInventory(await res.json());
    } catch (error) { console.error(error); }
    setIsInventoryLoading(false);
  };

  useEffect(() => {
    if (session) fetchInventory();
  }, [session]);

  const formatTime = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  if (status === "loading") return <div className="min-h-screen bg-darkBg flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-burgundy"></div></div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center p-4">
        <div className="bg-cardBg p-10 rounded-3xl border border-burgundy shadow-[0_0_50px_rgba(128,0,32,0.2)] text-center max-w-sm w-full">
          <div className="bg-burgundy text-white font-bold w-16 h-16 flex items-center justify-center rounded-2xl mx-auto mb-6 text-2xl tracking-tighter">YLC</div>
          <h1 className="text-3xl font-black text-white mb-2 italic tracking-widest uppercase">Y-Club <span className="text-burgundy">HQ</span></h1>
          <button onClick={() => signIn('discord')} className="w-full bg-burgundy hover:bg-burgundyLight text-white py-4 mt-8 rounded-xl font-bold transition-all shadow-lg">LOGIN WITH DISCORD</button>
        </div>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role || 'staff'; 
  const userNamaRP = (session?.user as any)?.namaRP || session?.user?.name || 'Unknown';

  const handleAbsensi = async () => {
    const action = isCheckedIn ? 'checkout' : 'checkin';
    try {
      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaStaff: userNamaRP, action })
      });
      if (res.ok) {
        setIsCheckedIn(!isCheckedIn);
        if (action === 'checkout') setSeconds(0);
      }
    } catch (error) { alert("Error menghubungi server."); }
  };

  // BUKA POP-UP MODAL
  const openModal = (item: any, action: 'ambil' | 'taruh') => {
    setModalData({ item: item.name, action, maxStock: item.stock });
    setQtyInput(1); // Reset input ke 1
    setIsModalOpen(true);
  };

  // KIRIM TRANSAKSI KE API
  const submitTransaction = async () => {
    if (qtyInput <= 0) return alert("Jumlah minimal 1!");
    if (modalData.action === 'ambil' && qtyInput > modalData.maxStock) return alert("Stok di gudang tidak cukup!");

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemName: modalData.item, 
          action: modalData.action, 
          userName: userNamaRP,
          quantity: qtyInput 
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Update angka di layar tanpa reload
        setInventory(prev => prev.map(i => i.name === modalData.item ? { ...i, stock: data.newStock } : i));
        setIsModalOpen(false); // Tutup pop-up
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Gagal memproses transaksi!");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-darkBg text-white selection:bg-burgundy pb-20 relative">
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-6 border-b border-gray-800 bg-cardBg sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="bg-burgundy text-white font-bold p-2 rounded-lg text-sm tracking-widest">YLC</div>
          <h1 className="text-xl font-black italic tracking-wider hidden md:block">Y-CLUB <span className="text-burgundy">HQ</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-darkBg border border-gray-700 p-1.5 pr-4 rounded-full">
            <img src={session?.user?.image || ""} alt="Profile" className="w-9 h-9 rounded-full border border-burgundy shadow-sm" />
            <div className="text-left">
              <p className="text-xs font-bold uppercase leading-none">{userNamaRP}</p>
              <p className="text-[10px] text-burgundyLight font-bold italic tracking-tighter uppercase">{userRole}</p>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-8 max-w-[1400px] mx-auto space-y-8">
        
        {/* TIMER BAR */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
            {(userRole === 'staff' || userRole === 'management') && (
              <button onClick={handleAbsensi} className={`px-8 py-2.5 rounded-xl font-bold text-xs transition shadow-lg uppercase tracking-widest ${isCheckedIn ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}>
                {isCheckedIn ? 'Check Out' : 'Check In'}
              </button>
            )}
          </div>
          <div className="flex items-center bg-cardBg border border-gray-800 rounded-xl px-5 py-2.5 shadow-inner">
             <span className="text-[10px] text-gray-500 font-bold mr-4 tracking-[0.2em] uppercase">Work Timer</span>
             <span className={`font-mono text-lg font-bold ${isCheckedIn ? 'text-burgundyLight' : 'text-gray-600'}`}>{formatTime(seconds)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* INVENTORY */}
          <div className="lg:col-span-2 bg-cardBg border border-gray-800 rounded-3xl p-8 shadow-xl">
            <h3 className="text-xs text-gray-400 font-bold tracking-[0.3em] flex items-center gap-3 uppercase mb-8">
               <span className={`w-2 h-2 rounded-full ${isCheckedIn || userRole === 'management' ? 'bg-burgundy animate-pulse' : 'bg-gray-600'}`}></span> Live Inventory
            </h3>
            
            {isInventoryLoading ? (
               <p className="text-center text-gray-500 text-sm animate-pulse">Memuat brankas minuman...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventory.map((item, index) => (
                  <div key={index} className={`p-5 rounded-2xl border transition-all duration-500 ${isCheckedIn || userRole === 'management' ? 'bg-darkBg border-gray-800 hover:border-burgundy/50 group' : 'bg-darkBg/50 border-gray-900 opacity-30 grayscale pointer-events-none'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <p className="font-black italic tracking-tighter text-lg uppercase group-hover:text-burgundyLight transition-colors">{item.name}</p>
                      <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${item.stock > 0 ? 'bg-burgundy/20 text-burgundy' : 'bg-red-900/30 text-red-500 animate-pulse'}`}>
                        {item.stock} QTY
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openModal(item, 'ambil')} className="flex-1 bg-gray-800 hover:bg-gray-700 py-2.5 rounded-xl font-bold text-[10px] tracking-widest transition uppercase">- Ambil</button>
                      <button onClick={() => openModal(item, 'taruh')} className="flex-1 bg-burgundy/80 hover:bg-burgundy py-2.5 rounded-xl font-bold text-[10px] tracking-widest transition uppercase">+ Taruh</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* STAFF ANALYTICS */}
          <div className="bg-cardBg border border-gray-800 rounded-3xl p-8 shadow-xl">
            <h3 className="text-xs text-gray-400 font-bold tracking-[0.2em] mb-8 uppercase italic border-l-2 border-burgundy pl-3">Analytics</h3>
            <p className="text-[10px] text-gray-500 mb-1 tracking-tighter uppercase font-bold">Total Shift Ini</p>
            <p className="text-xl font-mono font-bold mb-8">08:45:12</p>
          </div>

        </div>
      </main>

      {/* === POP-UP MODAL TRANSAKSI === */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-cardBg border border-burgundy rounded-3xl p-8 w-full max-w-sm shadow-[0_0_50px_rgba(128,0,32,0.3)]">
            
            <h2 className="text-2xl font-black italic mb-2 uppercase tracking-widest text-center">
              {modalData.action === 'ambil' ? 'Ambil' : 'Taruh'} <span className="text-burgundyLight">{modalData.item}</span>
            </h2>
            <p className="text-center text-[10px] text-gray-400 mb-8 uppercase tracking-widest">Stok Saat Ini: <span className="text-white font-bold">{modalData.maxStock}</span></p>

            <div className="flex flex-col gap-3 mb-8">
              <label className="text-[10px] font-bold text-gray-500 tracking-widest uppercase text-center">Masukkan Jumlah</label>
              <input 
                type="number" 
                min="1" 
                max={modalData.action === 'ambil' ? modalData.maxStock : 999}
                value={qtyInput}
                onChange={(e) => setQtyInput(parseInt(e.target.value) || 0)}
                className="bg-darkBg border border-gray-700 rounded-2xl p-4 text-center text-3xl font-black focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy transition-all"
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 py-3.5 rounded-xl font-bold text-[10px] tracking-widest transition uppercase"
              >
                Batal
              </button>
              <button 
                onClick={submitTransaction}
                disabled={isSubmitting}
                className="flex-1 bg-burgundy hover:bg-burgundyLight py-3.5 rounded-xl font-bold text-[10px] tracking-widest transition shadow-lg shadow-burgundy/20 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Proses...' : 'Konfirmasi'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}