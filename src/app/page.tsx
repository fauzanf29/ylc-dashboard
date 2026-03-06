"use client";

import React, { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";

export default function Page() {
  const { data: session, status } = useSession();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);

  // Modal Inventory & Sales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ item: '', action: 'ambil' as 'ambil' | 'taruh', maxStock: 0 });
  const [qtyInput, setQtyInput] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [salesCart, setSalesCart] = useState<any[]>([]); // Untuk nyimpen keranjang belanja
  const [currentItem, setCurrentItem] = useState('');    // Barang yang lagi dipilih
  const [currentQty, setCurrentQty] = useState(1);       // Jumlah barang yang lagi diketik
  const [isSalesSubmitting, setIsSalesSubmitting] = useState(false);
  const [todaySales, setTodaySales] = useState(0);
  const [todayItems, setTodayItems] = useState<any[]>([]); // Menyimpan daftar barang laku

  // Management & Finance State
  const [mgmtStats, setMgmtStats] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Patokan awal: Sabtu, 24 Januari 2026 (Awal Week 1)
    const epoch = new Date('2026-01-24T00:00:00+07:00').getTime();
    const now = Date.now();
    const diffInDays = Math.floor((now - epoch) / (1000 * 60 * 60 * 24));
    const weekNum = Math.floor(diffInDays / 7) + 1;
    return `Minggu ${weekNum > 0 ? weekNum : 1}`;
  });
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({ kategori: 'Operasional', keterangan: '', jumlah: 0 });
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  const sendWebhookReport = async () => {
    if (!mgmtStats) return alert("Data masih kosong!");
    if (!confirm(`Kirim rekapitulasi ${selectedWeek} ke Discord Management?`)) return;
    
    setIsSendingWebhook(true);
    try {
      const res = await fetch('/api/management/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          week: selectedWeek, 
          stats: mgmtStats,
          sender: userNamaRP 
        })
      });
      if (res.ok) alert("Laporan sukses terkirim ke Discord! 🚀");
      else alert("Gagal mengirim laporan.");
    } catch (error) {
      alert("Error menghubungi server.");
    }
    setIsSendingWebhook(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCheckedIn) {
      interval = setInterval(() => {
        const savedCheckInTime = localStorage.getItem('ylc_checkInTime');
        if (savedCheckInTime) {
          // Selalu akurat menghitung selisih waktu sekarang dengan waktu check-in
          setSeconds(Math.floor((Date.now() - parseInt(savedCheckInTime)) / 1000));
        } else {
           setSeconds(prev => prev + 1);
          }
        }, 1000);
      }
      return () => clearInterval(interval);
    }, [isCheckedIn]);

  useEffect(() => {
    const savedCheckInTime = localStorage.getItem('ylc_checkInTime');
    if (savedCheckInTime) {
      setIsCheckedIn(true);
      // Lanjut hitung detik dari waktu dia check-in sebelumnya
      const elapsedSeconds = Math.floor((Date.now() - parseInt(savedCheckInTime)) / 1000);
      setSeconds(elapsedSeconds);
    }

    const savedSales = localStorage.getItem('ylc_todaySales');
    if (savedSales) setTodaySales(parseInt(savedSales));

    const savedItems = localStorage.getItem('ylc_todayItems');
    if (savedItems) setTodayItems(JSON.parse(savedItems));
  }, []);

  const fetchInventory = async () => {
    setIsInventoryLoading(true);
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) setInventory(await res.json());
    } catch (error) { console.error(error); }
    setIsInventoryLoading(false);
  };

  const fetchMgmtStats = async () => {
    try {
      const res = await fetch(`/api/management/stats?week=${selectedWeek}`);
      if (res.ok) setMgmtStats(await res.json());
    } catch (error) { console.error(error); }
  };
  
  useEffect(() => {
    if (session) {
      fetchInventory();
      // Sekarang kita izinkan SEMUA role untuk menarik data ini
      // Biar staf bisa memfilter namanya sendiri dari daftar Leaderboard
      fetchMgmtStats(); 
    }
  }, [session, selectedWeek]);


  const formatTime = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const userRole = (session?.user as any)?.role || 'unauthorized'; 
  const userNamaRP = (session?.user as any)?.namaRP || 'Unknown Personnel';

  if (status === "loading") return <div className="min-h-screen bg-darkBg flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-burgundy"></div></div>;

  // JIKA BELUM LOGIN (LANDING PAGE)
  if (!session) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/ylc-bg.jpeg" 
            alt="Y Luxury Club Background" 
            className="w-full h-full object-cover blur-sm scale-110" 
          />
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>
        </div>

        <div className="bg-cardBg/90 backdrop-blur-lg p-10 rounded-3xl border border-burgundy shadow-[0_0_80px_rgba(128,0,32,0.4)] text-center max-w-sm w-full relative z-10 transition-all duration-1000 animate-in fade-in slide-in-from-bottom-12">
          <div className="bg-burgundy text-white font-bold w-20 h-20 flex items-center justify-center rounded-3xl mx-auto mb-8 text-3xl tracking-tighter shadow-xl border-4 border-burgundyLight/30">
            YLC
          </div>
          <h1 className="text-4xl font-black text-white mb-2 italic tracking-widest uppercase text-shadow-lg">
            Y Luxury <span className="text-burgundyLight">Club</span>
          </h1>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-10 border-b border-gray-800 pb-3">
            Management & Staff Portal
          </p>
          <button 
            onClick={() => signIn('discord')} 
            className="w-full bg-burgundy hover:bg-burgundyLight text-white py-4 mt-2 rounded-2xl font-black transition-all duration-300 shadow-lg text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-burgundy/30"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.372.292a.077.077 0 0 1-.006.128 12.51 12.51 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.955 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/></svg>
            LOGIN WITH DISCORD
          </button>
          <p className="text-[10px] text-gray-500 mt-12 uppercase tracking-widest font-mono">Powered by Y Luxury Club © Los Santos 2026</p>
        </div>
      </div>
    );
  }

  if (userRole === 'unauthorized') {
    return (
      <div className="min-h-screen bg-darkBg text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-cardBg border border-red-600 p-10 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.2)]">
          <h1 className="text-4xl font-black text-red-600 mb-4 uppercase italic">Access Revoked</h1>
          <p className="text-gray-400 mb-8">Discord ID Anda tidak terdaftar di database Y Luxury Club.<br/>Silakan hubungi Management untuk pendaftaran.</p>
          <button onClick={() => signOut()} className="bg-red-600 px-8 py-3 rounded-xl font-bold uppercase tracking-widest">Logout</button>
        </div>
      </div>
    );
  }

  // INI FUNGSI ABSENSI YANG SUDAH DIPERBAIKI
  const handleAbsensi = async () => {
    const action = isCheckedIn ? 'checkout' : 'checkin';
    try {
      const res = await fetch('/api/absensi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ namaStaff: userNamaRP, action }) });
      if (res.ok) {
        if (action === 'checkout') {
          setIsCheckedIn(false);
          setSeconds(0);
          setTodaySales(0);
          setTodayItems([]);
          
          // Hapus semua ingatan di browser saat Check Out
          localStorage.removeItem('ylc_checkInTime');
          localStorage.removeItem('ylc_todaySales');
          localStorage.removeItem('ylc_todayItems');
        } else {
          setIsCheckedIn(true);
          // Set memori waktu masuk
          localStorage.setItem('ylc_checkInTime', Date.now().toString());
        }
        
        if (userRole === 'management') fetchMgmtStats();
      }
    } catch (error) { alert("Error menghubungi server."); }
  };

  const submitTransaction = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemName: modalData.item, action: modalData.action, userName: userNamaRP, quantity: qtyInput }) });
      const data = await res.json();
      if (res.ok) {
        setInventory(prev => prev.map(i => i.name === modalData.item ? { ...i, stock: data.newStock } : i));
        setIsModalOpen(false);
        if (userRole === 'management') fetchMgmtStats();
      } else alert(data.error);
    } catch (error) { alert("Error!"); }
    setIsSubmitting(false);
  };

  const submitSales = async () => {
    if (salesCart.length === 0) return alert("Struk masih kosong, Bos!");
    setIsSalesSubmitting(true);
    
    let totalCartSales = 0;
    let addedItems: any[] = [];

    try {
      // Mesin ini akan ngirim data ke Google Sheets satu per satu dari keranjang
      for (const item of salesCart) {
        const res = await fetch('/api/penjualan', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ itemName: item.item, quantity: item.qty, userName: userNamaRP }) 
        });
        
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          totalCartSales += data.totalHarga;
          addedItems.push({ item: item.item, qty: item.qty });
        } else {
          alert(`❌ Gagal mencatat ${item.item}: ${data.error}`);
        }
      }

      // Update State & LocalStorage untuk Total Sales Sekaligus
      const newTotalSales = todaySales + totalCartSales;
      setTodaySales(newTotalSales);
      localStorage.setItem('ylc_todaySales', newTotalSales.toString());
      
      // Update State & LocalStorage untuk Item Terjual
      setTodayItems(prev => {
        let updatedItems = [...prev];
        addedItems.forEach(cartItem => {
          const existingIndex = updatedItems.findIndex(i => i.item === cartItem.item);
          if (existingIndex >= 0) {
            updatedItems[existingIndex].qty += cartItem.qty;
          } else {
            updatedItems.push({ item: cartItem.item, qty: cartItem.qty });
          }
        });
        localStorage.setItem('ylc_todayItems', JSON.stringify(updatedItems));
        return updatedItems;
      });

      setIsSalesModalOpen(false);
      if (userRole === 'management') fetchMgmtStats();
      alert(`✅ Transaksi Selesai! Total: $ ${totalCartSales.toLocaleString('id-ID')}`);
      
    } catch (error) { 
      alert("❌ Web gagal nyambung ke mesin API!"); 
    }
    
    setIsSalesSubmitting(false);
  };


  const submitExpense = async () => {
    if (expenseData.jumlah <= 0) return alert("Jumlah minimal $ 1");
    
    // Nyalakan status loading
    setIsExpenseSubmitting(true);
    
    try {
      const res = await fetch('/api/management/expenses', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...expenseData, userName: userNamaRP }) 
      });
      
      const data = await res.json().catch(() => ({})); 
      
      if (res.ok) {
        setIsExpenseModalOpen(false);
        setExpenseData({ kategori: 'Operasional', keterangan: '', jumlah: 0 });
        if (userRole === 'management') fetchMgmtStats();
        alert("💸 Pengeluaran Tercatat di Brankas!");
      } else {
        // Kalau Gagal, Munculkan Alert!
        alert(`❌ Server Menolak! Alasan: ${data.error || res.statusText}`);
      }
    } catch (error) { 
      alert("❌ Web gagal nyambung ke mesin API!"); 
    }
    
    // Matikan status loading
    setIsExpenseSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-darkBg text-white selection:bg-burgundy pb-20 relative font-sans">
      
      {/* HEADER WITH VAULT BALANCE */}
      <header className="flex justify-between items-center p-6 border-b border-gray-800 bg-cardBg sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-burgundy text-white font-bold p-2 rounded-lg text-sm tracking-widest"></div>
            <div className="hidden md:block">
              <h1 className="text-xl font-black italic tracking-wider leading-none">Y Luxury<span className="text-burgundy">Club</span></h1>
              {userRole === 'management' && (
                <p className="text-[10px] text-green-500 font-bold tracking-tighter uppercase mt-1">
                  Vault Balance: $ {mgmtStats?.totalKasGlobal?.toLocaleString('id-ID') || 0}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-darkBg border border-gray-700 p-1.5 pr-4 rounded-full">
            <img src={session?.user?.image || ""} alt="Profile" className="w-9 h-9 rounded-full border border-burgundy shadow-sm" />
            <div className="text-left">
              <p className="text-xs font-bold uppercase leading-none">{userNamaRP}</p>
              <p className="text-[10px] text-burgundyLight font-bold italic tracking-tighter uppercase">{userRole}</p>
            </div>
          </div>
          <button onClick={() => signOut()} className="text-gray-500 hover:text-white transition">✖</button>
        </div>
      </header>

      <main className="p-8 max-w-[1400px] mx-auto space-y-8">
        <> {/* WRAPPER START */}

          {/* ACTION BAR */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-3">
              {(userRole === 'staff' || userRole === 'management') && (
                <button onClick={handleAbsensi} className={`px-8 py-2.5 rounded-xl font-bold text-xs transition shadow-lg uppercase tracking-widest ${isCheckedIn ? 'bg-red-600' : 'bg-green-600'}`}>
                  {isCheckedIn ? 'Check Out' : 'Check In'}
                </button>
              )}
              {(isCheckedIn || userRole === 'management') && (
                <button 
                  onClick={() => { 
                    setSalesCart([]); // Kosongkan keranjang
                    setCurrentItem(inventory[0]?.name || ''); 
                    setCurrentQty(1); 
                    setIsSalesModalOpen(true); 
                  }} 
                  className="px-8 py-2.5 rounded-xl font-bold text-xs transition bg-yellow-600 hover:bg-yellow-500 text-white uppercase tracking-widest shadow-lg"
                >
                  $ Buka Kasir
                </button>
              )}
              {userRole === 'management' && (
                <button onClick={() => setIsExpenseModalOpen(true)} className="px-8 py-2.5 rounded-xl font-bold text-xs transition bg-red-800 hover:bg-red-700 text-white uppercase tracking-widest shadow-lg">
                  💸 Catat Pengeluaran
                </button>
              )}
              {userRole === 'management' && (
                <button 
                  onClick={sendWebhookReport} 
                  disabled={isSendingWebhook}
                  className="px-8 py-2.5 rounded-xl font-bold text-xs transition bg-[#5865F2] hover:bg-[#4752C4] text-white uppercase tracking-widest shadow-lg shadow-[#5865F2]/20 flex items-center gap-2"
                >
                  {isSendingWebhook ? 'Mengirim...' : '📢 Kirim Laporan'}
                </button>
              )}
            </div>
            <div className="flex items-center bg-cardBg border border-gray-800 rounded-xl px-5 py-2.5 shadow-inner">
               <span className="text-[10px] text-gray-500 font-bold mr-4 tracking-[0.2em] uppercase">Work Timer</span>
               <span className={`font-mono text-lg font-bold ${isCheckedIn ? 'text-burgundyLight' : 'text-gray-600'}`}>{formatTime(seconds)}</span>
            </div>
          </div>

          {/* MANAGEMENT PANEL */}
          {userRole === 'management' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-cardBg border border-gray-800 p-6 rounded-2xl shadow-lg">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Gross Profit (Wk)</p>
                  <p className="text-2xl font-black text-green-500">$ {mgmtStats?.finance?.bruto?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-cardBg border border-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-l-red-600">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Pengeluaran (Wk)</p>
                  <p className="text-2xl font-black text-red-500">$ {mgmtStats?.finance?.expense?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-cardBg border border-gray-800 p-6 rounded-2xl shadow-lg">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Potongan (20%)</p>
                  <p className="text-2xl font-black text-yellow-500">$ {mgmtStats?.finance?.setoran?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-cardBg border border-burgundy/30 p-6 rounded-2xl shadow-xl bg-gradient-to-br from-cardBg to-burgundy/5">
                  <p className="text-[10px] text-burgundyLight font-bold uppercase mb-2 tracking-widest">Net (80% - Exp)</p>
                  <p className="text-2xl font-black text-white">$ {mgmtStats?.finance?.net?.toLocaleString('id-ID') || 0}</p>
                </div>
              </div>

              <div className="bg-cardBg border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-darkBg/50">
                  <h3 className="font-black italic uppercase tracking-widest text-sm">Staff Leaderboard</h3>
                  <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="bg-darkBg border border-gray-700 rounded-lg px-4 py-2 text-xs font-bold text-burgundyLight outline-none">
                    {[...Array(52)].map((_, i) => ( <option key={i} value={`Minggu ${i + 1}`}>Minggu {i + 1}</option> ))}
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="text-[10px] text-gray-500 uppercase border-b border-gray-800"><th className="p-4">Rank</th><th className="p-4">Nama Staff</th><th className="p-4 text-center">Durasi Kerja</th><th className="p-4 text-right">Penjualan</th></tr></thead>
                    <tbody className="text-sm">
                      {mgmtStats?.leaderboard.map((staff: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-900/50 hover:bg-white/5 transition-colors">
                          <td className="p-4">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}</td>
                          <td className="p-4 font-bold uppercase">{staff.name}</td>
                          <td className="p-4 text-center font-mono text-burgundyLight">{staff.totalHours.toFixed(2)} Jam</td>
                          <td className="p-4 text-right font-black text-green-500">$ {staff.totalSales.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tabel Item Terjual */}
                <div className="bg-cardBg border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-gray-800 bg-darkBg/50">
                    <h3 className="font-black italic uppercase tracking-widest text-xs text-green-500">Top Items (Minggu Ini)</h3>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[300px]">
                    <ul className="space-y-3">
                      {!mgmtStats?.itemSales?.length ? (
                        <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest my-4">Belum ada penjualan</p>
                      ) : (
                        mgmtStats.itemSales.map((item: any, idx: number) => (
                          <li key={idx} className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                            <span className="font-bold uppercase text-xs">{item.name}</span>
                            <span className="bg-burgundy/20 text-burgundyLight px-3 py-1 rounded-full text-[10px] font-black">{item.qty} Pcs Terjual</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>

                {/* Tabel Log Pengeluaran */}
                <div className="bg-cardBg border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-gray-800 bg-darkBg/50">
                    <h3 className="font-black italic uppercase tracking-widest text-xs text-red-500">Log Pengeluaran</h3>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[300px]">
                    <ul className="space-y-4">
                      {!mgmtStats?.expensesList?.length ? (
                        <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest my-4">Nihil Pengeluaran</p>
                      ) : (
                        mgmtStats.expensesList.map((exp: any, idx: number) => (
                          <li key={idx} className="border-b border-gray-800/50 pb-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-xs uppercase text-red-400">{exp.kategori}</span>
                              <span className="font-black text-xs text-red-500">- $ {exp.amount.toLocaleString('id-ID')}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 italic mb-1">{exp.keterangan}</p>
                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Oleh: {exp.pic}</p>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* INVENTORY SECTION */}
          {(!isCheckedIn && userRole === 'staff') ? (
            <div className="bg-cardBg border border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-xl min-h-[400px]">
              <div className="w-20 h-20 bg-burgundy/10 rounded-full flex items-center justify-center mb-6 border border-burgundy/30 shadow-[0_0_30px_rgba(128,0,32,0.2)]">
                <svg className="w-10 h-10 text-burgundyLight" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <h2 className="text-2xl font-black italic uppercase mb-4">Akses Terkunci</h2>
              <p className="text-gray-400 mb-8 text-sm">Silakan <strong className="text-burgundyLight">Check In</strong> untuk membuka brankas.</p>
              <button onClick={handleAbsensi} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-widest animate-pulse">Mulai Shift</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-cardBg border border-gray-800 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xs text-gray-400 font-bold tracking-[0.3em] flex items-center gap-3 uppercase mb-8">
                  <span className="w-2 h-2 rounded-full bg-burgundy animate-pulse"></span> Live Inventory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventory.map((item, index) => (
                    <div key={index} className="p-5 rounded-2xl border bg-darkBg border-gray-800 hover:border-burgundy/50 group transition-all duration-500">
                      <div className="flex justify-between items-start mb-4">
                        <div><p className="font-black italic text-lg uppercase group-hover:text-burgundyLight">{item.name}</p><p className="text-[10px] text-gray-500">$ {item.price?.toLocaleString('id-ID')}</p></div>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${item.stock > 0 ? 'bg-burgundy/20 text-burgundy' : 'bg-red-900/30 text-red-500'}`}>{item.stock} QTY</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setModalData({ item: item.name, action: 'ambil', maxStock: item.stock }); setQtyInput(1); setIsModalOpen(true); }} className="flex-1 bg-burgundy/80 py-2.5 rounded-xl font-bold text-[10px] uppercase">Withdraw</button>
                        <button onClick={() => { setModalData({ item: item.name, action: 'taruh', maxStock: item.stock }); setQtyInput(1); setIsModalOpen(true); }} className="flex-1 bg-gray-800 py-2.5 rounded-xl font-bold text-[10px] uppercase">Deposit</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-cardBg border border-gray-800 rounded-3xl p-8 shadow-xl flex flex-col h-full">
                <h3 className="text-xs text-gray-400 font-bold mb-6 uppercase italic border-l-2 border-yellow-600 pl-3 tracking-widest">Kasir Analytics</h3>
                {/* --- TAMBAHAN BARU: STATISTIK MINGGUAN STAFF --- */}
                <div className="grid grid-cols-2 gap-4 mb-6 border-b border-gray-800 pb-6">
                  <div className="bg-darkBg p-4 rounded-2xl border border-gray-800 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/10 rounded-bl-full"></div>
                    <p className="text-[9px] text-gray-500 mb-1 uppercase font-bold tracking-widest">Sales (Week Ini)</p>
                    <p className="text-lg font-black text-green-500">
                      $ {(mgmtStats?.leaderboard?.find((s: any) => s.name === userNamaRP)?.totalSales || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="bg-darkBg p-4 rounded-2xl border border-gray-800 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-burgundy/20 rounded-bl-full"></div>
                    <p className="text-[9px] text-gray-500 mb-1 uppercase font-bold tracking-widest">Kerja (Week Ini)</p>
                    <p className="text-lg font-mono font-bold text-burgundyLight">
                      {(mgmtStats?.leaderboard?.find((s: any) => s.name === userNamaRP)?.totalHours || 0).toFixed(2)} Jam
                    </p>
                  </div>
                </div>
                {/* ----------------------------------------------- */}
                <div className="mb-6">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold tracking-tighter">Sales Pribadi (Shift Ini)</p>
                  <p className="text-3xl font-black text-yellow-500 tracking-tight">$ {todaySales.toLocaleString('id-ID')}</p>
                </div>

                {/* --- DAFTAR BARANG YANG LAKU --- */}
                <div className="flex-1 min-h-[120px] mb-6">
                  <p className="text-[10px] text-gray-500 mb-3 uppercase font-bold tracking-tighter border-b border-gray-800 pb-2">Item Terjual</p>
                  {todayItems.length === 0 ? (
                    <p className="text-[10px] text-gray-600 italic">Belum ada penjualan di shift ini.</p>
                  ) : (
                    <ul className="space-y-2 overflow-y-auto max-h-[150px] pr-2">
                      {todayItems.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center border-b border-gray-800/50 pb-1">
                          <span className="font-bold text-xs text-gray-300 uppercase">{item.item}</span>
                          <span className="font-mono text-xs text-yellow-500 font-black">x{item.qty}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-gray-800">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold tracking-tighter">Durasi Shift</p>
                  <p className="text-xl font-mono font-bold tracking-widest">{formatTime(seconds)}</p>
                </div>
              </div>
            </div>
          )}

        </> {/* WRAPPER END */}
      </main>

      {/* MODAL INVENTORY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-burgundy rounded-3xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-black italic mb-6 uppercase text-center tracking-widest">{modalData.action === 'ambil' ? 'Ambil' : 'Taruh'} <span className="text-burgundyLight">{modalData.item}</span></h2>
            <input type="number" value={qtyInput} onChange={(e) => setQtyInput(parseInt(e.target.value) || 0)} className="bg-darkBg border border-gray-700 rounded-xl p-4 w-full text-center text-3xl font-black mb-8 focus:border-burgundy outline-none" />
            <div className="flex gap-4"><button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase">Batal</button><button onClick={submitTransaction} className="flex-1 bg-burgundy py-3.5 rounded-xl font-bold text-[10px] uppercase">Konfirmasi</button></div>
          </div>
        </div>
      )}

      {/* MODAL SALES */}
      {/* MODAL SALES (SISTEM KERANJANG/STRUK) */}
      {isSalesModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-yellow-600/50 rounded-3xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(202,138,4,0.15)]">
            <h2 className="text-xl font-black italic mb-4 uppercase text-center text-yellow-500">Struk Kasir</h2>
            
            {/* Area Pilih Barang */}
            <div className="flex gap-2 mb-4">
              <select value={currentItem} onChange={(e) => setCurrentItem(e.target.value)} className="bg-darkBg border border-gray-700 rounded-xl p-3 flex-1 font-bold outline-none text-xs">
                {inventory.map((item, idx) => ( <option key={idx} value={item.name}>{item.name} - $ {item.price?.toLocaleString('id-ID')}</option> ))}
              </select>
              <input type="number" value={currentQty} onChange={(e) => setCurrentQty(parseInt(e.target.value) || 0)} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-20 text-center font-black outline-none text-sm" />
              <button 
                onClick={() => {
                  const invItem = inventory.find(i => i.name === currentItem);
                  if (invItem && currentQty > 0) {
                    setSalesCart(prev => {
                      const existing = prev.find(i => i.item === currentItem);
                      if (existing) return prev.map(i => i.item === currentItem ? { ...i, qty: i.qty + currentQty } : i);
                      return [...prev, { item: currentItem, qty: currentQty, price: invItem.price }];
                    });
                    setCurrentQty(1); // Reset angka jadi 1 lagi setelah ditambah
                  }
                }} 
                className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 px-4 rounded-xl font-black text-xl transition-colors"
                title="Tambah ke Struk"
              >
                +
              </button>
            </div>

            {/* List Keranjang Belanja */}
            <div className="bg-darkBg border border-gray-800 rounded-xl p-4 mb-4 min-h-[150px] max-h-[200px] overflow-y-auto">
              {salesCart.length === 0 ? (
                <p className="text-center text-gray-500 text-[10px] uppercase tracking-widest italic mt-12">Struk masih kosong...</p>
              ) : (
                <ul className="space-y-3">
                  {salesCart.map((cartItem, idx) => (
                    <li key={idx} className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-xs uppercase text-gray-200">{cartItem.item}</span>
                        <span className="text-[10px] text-gray-500">$ {cartItem.price.toLocaleString('id-ID')} x {cartItem.qty}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-yellow-500 text-sm">$ {(cartItem.price * cartItem.qty).toLocaleString('id-ID')}</span>
                        <button onClick={() => setSalesCart(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-400 text-xs font-bold" title="Hapus Barang">✖</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Total Tagihan */}
            <div className="flex justify-between items-center mb-6 bg-yellow-600/10 p-4 rounded-xl border border-yellow-600/20">
              <span className="font-bold text-[10px] uppercase text-gray-400 tracking-widest">Total Tagihan:</span>
              <span className="text-3xl font-black text-yellow-500">$ {salesCart.reduce((total, item) => total + (item.price * item.qty), 0).toLocaleString('id-ID')}</span>
            </div>

            {/* Tombol Bawah */}
            <div className="flex gap-4">
              <button onClick={() => setIsSalesModalOpen(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-3.5 rounded-xl font-bold text-[10px] uppercase transition-colors">Tutup</button>
              <button 
                onClick={submitSales} 
                disabled={isSalesSubmitting || salesCart.length === 0}
                className={`flex-1 py-3.5 rounded-xl font-bold text-[10px] uppercase transition-all shadow-lg ${isSalesSubmitting || salesCart.length === 0 ? 'bg-yellow-900/30 text-gray-600 cursor-not-allowed shadow-none' : 'bg-yellow-600 text-white hover:bg-yellow-500 shadow-yellow-600/20'}`}
              >
                {isSalesSubmitting ? 'Memproses...' : 'Bayar Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL EXPENSE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-red-600/50 rounded-3xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-black italic mb-6 uppercase text-center text-red-500 tracking-widest">Catat Pengeluaran</h2>
            <div className="space-y-4 mb-8">
              <select value={expenseData.kategori} onChange={(e) => setExpenseData({...expenseData, kategori: e.target.value})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full font-bold outline-none">
                <option value="Operasional">Operasional</option>
                <option value="Bonus Karyawan">Bonus Karyawan</option>
                <option value="Bahan Baku">Bahan Baku</option>
              </select>
              <input type="text" placeholder="Keterangan" value={expenseData.keterangan} onChange={(e) => setExpenseData({...expenseData, keterangan: e.target.value})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full font-bold text-sm outline-none" />
              <input type="number" placeholder="Jumlah ($)" value={expenseData.jumlah} onChange={(e) => setExpenseData({...expenseData, jumlah: parseInt(e.target.value) || 0})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full text-center text-xl font-black outline-none" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsExpenseModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase">Batal</button>
              <button 
                onClick={submitExpense} 
                disabled={isExpenseSubmitting}
                className={`flex-1 py-3.5 rounded-xl font-bold text-[10px] uppercase transition-all ${isExpenseSubmitting ? 'bg-red-900 text-gray-400 cursor-wait' : 'bg-red-600 text-white hover:bg-red-500'}`}
              >
                {isExpenseSubmitting ? 'Mencatat...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}