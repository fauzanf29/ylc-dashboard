"use client";

import React, { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";

export default function Page() {
  const { data: session, status } = useSession();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);

  // Modal Inventory & Sales State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ item: '', action: 'ambil' as 'ambil' | 'taruh', maxStock: 0 });
  const [qtyInput, setQtyInput] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false); // GEMBOK INVENTORY
  
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [salesCart, setSalesCart] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [isSalesSubmitting, setIsSalesSubmitting] = useState(false); // GEMBOK KASIR
  
  const [todaySales, setTodaySales] = useState(0);
  const [todayItems, setTodayItems] = useState<any[]>([]);

  // Management & Finance State
  const [mgmtStats, setMgmtStats] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const epoch = new Date('2026-01-24T00:00:00+07:00').getTime();
    const now = Date.now();
    const diffInDays = Math.floor((now - epoch) / (1000 * 60 * 60 * 24));
    const weekNum = Math.floor(diffInDays / 7) + 1;
    return `Minggu ${weekNum > 0 ? weekNum : 1}`;
  });

  // Reimburse & Expense State
  const [isReimburseModalOpen, setIsReimburseModalOpen] = useState(false);
  const [reimburseData, setReimburseData] = useState({ keterangan: '', jumlah: 0 });
  const [isReimburseSubmitting, setIsReimburseSubmitting] = useState(false); // GEMBOK REIMBURSE
  const [pendingReimbursements, setPendingReimbursements] = useState<any[]>([]);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({ kategori: 'Operasional', keterangan: '', jumlah: 0 });
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false); // GEMBOK EXPENSE
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  // --- CORE FUNCTIONS (FETCHING) ---

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

  const fetchPendingReimbursements = async () => {
    try {
      const res = await fetch('/api/management/reimburse');
      if (res.ok) setPendingReimbursements(await res.json());
    } catch (error) { console.error("Gagal tarik data reimburse"); }
  };

  // --- LOGIC FUNCTIONS (SUBMITTERS WITH ANTI-DOUBLE CLICK) ---

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
          localStorage.removeItem('ylc_checkInTime');
          localStorage.removeItem('ylc_todaySales');
          localStorage.removeItem('ylc_todayItems');
        } else {
          setIsCheckedIn(true);
          localStorage.setItem('ylc_checkInTime', Date.now().toString());
        }
        if (userRole === 'management') fetchMgmtStats();
      }
    } catch (error) { alert("Error menghubungi server."); }
  };

  const submitTransaction = async () => {
    if (isSubmitting || !modalData.item) return; // SATPAM
    setIsSubmitting(true); // GEMBOK
    try {
      const res = await fetch('/api/inventory', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ itemName: modalData.item, action: modalData.action, userName: userNamaRP, quantity: qtyInput }) 
      });
      const data = await res.json();
      if (res.ok) {
        setInventory(prev => prev.map(i => i.name === modalData.item ? { ...i, stock: data.newStock } : i));
        setIsModalOpen(false);
        // --- TAMBAHAN NOTIFIKASI DISINI ---
        const pesan = modalData.action === 'ambil' ? 'Withdraw Berhasil! 📦' : 'Deposit Berhasil! 📥';
        alert(`${pesan}\nItem: ${modalData.item}\nJumlah: ${qtyInput}\nSisa Stok: ${data.newStock}`);
        // ----------------------------------
        if (userRole === 'management') fetchMgmtStats();
      } else alert(data.error);
    } catch (error) { alert("Error Server!"); } 
    finally { setIsSubmitting(false); } // BUKA GEMBOK
  };

  const submitSales = async () => {
    if (isSalesSubmitting || salesCart.length === 0) return; // SATPAM
    setIsSalesSubmitting(true); // GEMBOK
    
    let totalCartSales = 0;
    let addedItems: any[] = [];

    try {
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
        }
      }

      const newTotalSales = todaySales + totalCartSales;
      setTodaySales(newTotalSales);
      localStorage.setItem('ylc_todaySales', newTotalSales.toString());
      
      setTodayItems(prev => {
        let updatedItems = [...prev];
        addedItems.forEach(cartItem => {
          const existingIndex = updatedItems.findIndex(i => i.item === cartItem.item);
          if (existingIndex >= 0) updatedItems[existingIndex].qty += cartItem.qty;
          else updatedItems.push({ item: cartItem.item, qty: cartItem.qty });
        });
        localStorage.setItem('ylc_todayItems', JSON.stringify(updatedItems));
        return updatedItems;
      });

      setIsSalesModalOpen(false);
      if (userRole === 'management') fetchMgmtStats();
      alert(`✅ Transaksi Selesai! Total: $ ${totalCartSales.toLocaleString('id-ID')}`);
    } catch (error) { alert("Gagal nyambung ke mesin API!"); } 
    finally { setIsSalesSubmitting(false); } // BUKA GEMBOK
  };

  const submitExpense = async () => {
    if (isExpenseSubmitting || expenseData.jumlah <= 0) return; // SATPAM
    setIsExpenseSubmitting(true); // GEMBOK
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
        alert("💸 Pengeluaran Tercatat!");
      } else alert(`❌ Error: ${data.error || res.statusText}`);
    } catch (error) { alert("Web gagal nyambung ke API!"); } 
    finally { setIsExpenseSubmitting(false); } // BUKA GEMBOK
  };

  const submitReimburseRequest = async () => {
    if (isReimburseSubmitting || reimburseData.jumlah <= 0 || !reimburseData.keterangan) return; // SATPAM
    setIsReimburseSubmitting(true); // GEMBOK
    try {
      const res = await fetch('/api/management/reimburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', userName: userNamaRP, ...reimburseData })
      });
      if (res.ok) {
        setIsReimburseModalOpen(false);
        setReimburseData({ keterangan: '', jumlah: 0 });
        alert("✅ Request Reimburse Terkirim!");
      } else alert("❌ Gagal mengirim request.");
    } catch (error) { alert("Error menghubungi server!"); } 
    finally { setIsReimburseSubmitting(false); } // BUKA GEMBOK
  };

  const handleReimburseAction = async (row: any, actionType: 'acc' | 'tolak') => {
    if (!confirm(`Yakin mau ${actionType.toUpperCase()} reimburse dari ${row.nama}?`)) return;
    try {
      const res = await fetch('/api/management/reimburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, rowNumber: row.rowNumber, waktu: row.waktu, minggu: row.minggu, userName: row.nama, keterangan: row.keterangan, jumlah: row.jumlah })
      });
      if (res.ok) {
        alert(`✅ Berhasil di-${actionType.toUpperCase()}`);
        fetchPendingReimbursements();
        fetchMgmtStats();
      }
    } catch (error) { alert("❌ Gagal memproses."); }
  };

  const sendWebhookReport = async () => {
    if (!mgmtStats || isSendingWebhook) return;
    if (!confirm(`Kirim rekapitulasi ${selectedWeek} ke Discord Management?`)) return;
    setIsSendingWebhook(true);
    try {
      const res = await fetch('/api/management/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: selectedWeek, stats: mgmtStats, sender: userNamaRP })
      });
      if (res.ok) alert("Laporan sukses terkirim! 🚀");
      else alert("Gagal mengirim laporan.");
    } catch (error) { alert("Error server."); } 
    finally { setIsSendingWebhook(false); }
  };

  // --- EFFECTS & HELPERS ---

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCheckedIn) {
      interval = setInterval(() => {
        const savedCheckInTime = localStorage.getItem('ylc_checkInTime');
        if (savedCheckInTime) setSeconds(Math.floor((Date.now() - parseInt(savedCheckInTime)) / 1000));
        else setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCheckedIn]);

  useEffect(() => {
    const savedCheckInTime = localStorage.getItem('ylc_checkInTime');
    if (savedCheckInTime) {
      setIsCheckedIn(true);
      setSeconds(Math.floor((Date.now() - parseInt(savedCheckInTime)) / 1000));
    }
    const savedSales = localStorage.getItem('ylc_todaySales');
    if (savedSales) setTodaySales(parseInt(savedSales));
    const savedItems = localStorage.getItem('ylc_todayItems');
    if (savedItems) setTodayItems(JSON.parse(savedItems));
  }, []);

  useEffect(() => {
    if (session) {
      fetchInventory();
      fetchMgmtStats();
      if ((session.user as any).role === 'management') fetchPendingReimbursements();
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

  if (!session) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/ylc-bg.jpeg" alt="BG" className="w-full h-full object-cover blur-sm scale-110" />
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>
        </div>
        <div className="bg-cardBg/90 backdrop-blur-lg p-10 rounded-3xl border border-burgundy shadow-[0_0_80px_rgba(128,0,32,0.4)] text-center max-w-sm w-full relative z-10">
          <div className="bg-burgundy text-white font-bold w-20 h-20 flex items-center justify-center rounded-3xl mx-auto mb-8 text-3xl tracking-tighter border-4 border-burgundyLight/30">YLC</div>
          <h1 className="text-4xl font-black text-white mb-2 italic tracking-widest uppercase">Y Luxury <span className="text-burgundyLight">Club</span></h1>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-10 border-b border-gray-800 pb-3">Management & Staff Portal</p>
          <button onClick={() => signIn('discord')} className="w-full bg-burgundy hover:bg-burgundyLight text-white py-4 mt-2 rounded-2xl font-black transition shadow-lg text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95">
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
        <div className="bg-cardBg border border-red-600 p-10 rounded-3xl">
          <h1 className="text-4xl font-black text-red-600 mb-4 uppercase italic">Access Revoked</h1>
          <p className="text-gray-400 mb-8">Discord ID tidak terdaftar.</p>
          <button onClick={() => signOut()} className="bg-red-600 px-8 py-3 rounded-xl font-bold uppercase tracking-widest">Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkBg text-white selection:bg-burgundy pb-20 relative font-sans">
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-6 border-b border-gray-800 bg-cardBg sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black italic tracking-wider">Y Luxury<span className="text-burgundy">Club</span></h1>
          {userRole === 'management' && (
            <p className="text-[10px] text-green-500 font-bold uppercase mt-1">
              Vault: $ {mgmtStats?.totalKasGlobal?.toLocaleString('id-ID') || 0}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-darkBg border border-gray-700 p-1.5 pr-4 rounded-full">
            <img src={session?.user?.image || ""} alt="Profile" className="w-9 h-9 rounded-full border border-burgundy" />
            <div className="text-left">
              <p className="text-xs font-bold uppercase leading-none">{userNamaRP}</p>
              <p className="text-[10px] text-burgundyLight font-bold italic uppercase">{userRole}</p>
            </div>
          </div>
          <button onClick={() => signOut()} className="text-gray-500 hover:text-white transition">✖</button>
        </div>
      </header>

      <main className="p-8 max-w-[1400px] mx-auto space-y-8">
          
          {/* ACTION BAR */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-3">
              {(userRole === 'staff' || userRole === 'management' || userRole === 'supervisor') && (
                <button onClick={handleAbsensi} className={`px-8 py-2.5 rounded-xl font-bold text-xs transition uppercase tracking-widest ${isCheckedIn ? 'bg-red-600' : 'bg-green-600'}`}>
                  {isCheckedIn ? 'Check Out' : 'Check In'}
                </button>
              )}
              {(isCheckedIn || userRole === 'management') && (
                <button 
                  onClick={() => { setSalesCart([]); setCurrentItem(inventory[0]?.name || ''); setCurrentQty(1); setIsSalesModalOpen(true); }} 
                  className="px-8 py-2.5 rounded-xl font-bold text-xs bg-yellow-600 hover:bg-yellow-500 text-white uppercase tracking-widest"
                >
                  $ Buka Kasir
                </button>
              )}
              {userRole === 'management' && (
                <button onClick={() => setIsExpenseModalOpen(true)} className="px-8 py-2.5 rounded-xl font-bold text-xs bg-red-800 hover:bg-red-700 text-white uppercase tracking-widest">
                  💸 Catat Pengeluaran
                </button>
              )}
              {userRole === 'management' && (
                <button onClick={sendWebhookReport} disabled={isSendingWebhook} className="px-8 py-2.5 rounded-xl font-bold text-xs bg-[#5865F2] hover:bg-[#4752C4] text-white uppercase tracking-widest">
                  {isSendingWebhook ? 'Mengirim...' : '📢 Kirim Laporan'}
                </button>
              )}
              
              {/* Tombol Ajukan Reimburse - Khusus Management atau Staff yang sudah Check In */}
              {((userRole === 'management') || (isCheckedIn && ['staff', 'supervisor'].includes(userRole))) && (
                <button 
                  onClick={() => setIsReimburseModalOpen(true)} 
                  className="px-8 py-2.5 rounded-xl font-bold text-xs transition bg-blue-600 hover:bg-blue-500 text-white uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  🧾 Ajukan Reimburse
                </button>
              )}
            </div>
            <div className="flex items-center bg-cardBg border border-gray-800 rounded-xl px-5 py-2.5">
               <span className="text-[10px] text-gray-500 font-bold mr-4 uppercase tracking-widest">Work Timer</span>
               <span className={`font-mono text-lg font-bold ${isCheckedIn ? 'text-burgundyLight' : 'text-gray-600'}`}>{formatTime(seconds)}</span>
            </div>
          </div>

          {/* MANAGEMENT PANEL */}
          {userRole === 'management' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-cardBg border border-gray-800 p-6 rounded-2xl shadow-lg">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Gross Profit (Wk)</p>
                  <p className="text-2xl font-black text-green-500">$ {mgmtStats?.finance?.bruto?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-cardBg border border-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-l-red-600">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Pengeluaran (Wk)</p>
                  <p className="text-2xl font-black text-red-500">$ {mgmtStats?.finance?.expense?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-cardBg border border-gray-800 p-6 rounded-2xl shadow-lg">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Potongan (20%)</p>
                  <p className="text-2xl font-black text-yellow-500">$ {mgmtStats?.finance?.setoran?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-cardBg border border-burgundy/30 p-6 rounded-2xl bg-gradient-to-br from-cardBg to-burgundy/5 shadow-xl">
                  <p className="text-[10px] text-burgundyLight font-bold uppercase mb-2">Net (80% - Exp)</p>
                  <p className="text-2xl font-black text-white">$ {mgmtStats?.finance?.net?.toLocaleString('id-ID') || 0}</p>
                </div>
                {/* KARTU COGS (MODAL) */}
<div className="bg-cardBg border border-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-l-orange-500">
  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Total COGS (Modal)</p>
  <p className="text-2xl font-black text-orange-500">
    {/* ✨ PAKAI .modal BUKAN .cogs atau .totalCogs */}
    $ {mgmtStats?.finance?.modal?.toLocaleString('id-ID') || 0}
  </p>
  <p className="text-[9px] text-gray-600 italic mt-1">*Beban modal dari barang laku</p>
</div>
              </div>

              {/* Leaderboard Table */}
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

              {/* --- BAGIAN YANG TADI ILANG (TOP ITEMS & LOG PENGELUARAN) --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
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
                            <span className="font-bold uppercase text-xs text-gray-300">{item.name}</span>
                            <span className="bg-burgundy/20 text-burgundyLight px-3 py-1 rounded-full text-[10px] font-black">{item.qty} Pcs</span>
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
              {/* --- BATAS BAGIAN YANG ILANG --- */}

              {/* Pending Reimburse (Khusus Management) */}
              <div className="bg-cardBg border border-blue-600/30 rounded-3xl overflow-hidden shadow-xl mt-4">
                  <div className="p-4 border-b border-gray-800 bg-blue-900/20 flex justify-between items-center">
                    <h3 className="font-black italic uppercase tracking-widest text-xs text-blue-400">🚨 Request Reimburse ({pendingReimbursements.length})</h3>
                    <button onClick={fetchPendingReimbursements} className="text-[10px] bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full font-bold uppercase">Refresh</button>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[300px]">
                    {pendingReimbursements.length === 0 ? (
                      <p className="text-center text-[10px] text-gray-500 uppercase italic my-4">Nihil Request.</p>
                    ) : (
                      <ul className="space-y-3">
                        {pendingReimbursements.map((req, idx) => (
                          <li key={idx} className="bg-darkBg border border-gray-800 p-4 rounded-xl flex justify-between items-center shadow-inner">
                            <div>
                              <p className="text-xs font-bold uppercase text-gray-200">{req.nama} <span className="text-gray-500 text-[9px] ml-2 font-mono">{req.waktu}</span></p>
                              <p className="text-[10px] text-blue-400 italic">"{req.keterangan}"</p>
                              <p className="font-black text-sm text-yellow-500">$ {req.jumlah.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleReimburseAction(req, 'acc')} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase">✔️ ACC</button>
                              <button onClick={() => handleReimburseAction(req, 'tolak')} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase">❌ Tolak</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
              </div>
            </div>
          )}

          {/* INVENTORY SECTION */}
          {(!isCheckedIn && userRole === 'staff') ? (
            <div className="bg-cardBg border border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-xl min-h-[400px]">
              <div className="w-20 h-20 bg-burgundy/10 rounded-full flex items-center justify-center mb-6 border border-burgundy/30">
                <svg className="w-10 h-10 text-burgundyLight" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <h2 className="text-2xl font-black italic uppercase mb-4">Akses Terkunci</h2>
              <p className="text-gray-400 mb-8 text-sm">Silakan <strong className="text-burgundyLight">Check In</strong> untuk akses brankas.</p>
              <button onClick={handleAbsensi} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase animate-pulse">Mulai Shift</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-cardBg border border-gray-800 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xs text-gray-400 font-bold flex items-center gap-3 uppercase mb-8">
                  <span className="w-2 h-2 rounded-full bg-burgundy animate-pulse"></span> Live Inventory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventory.map((item, index) => (
                    <div key={index} className="p-5 rounded-2xl border bg-darkBg border-gray-800 hover:border-burgundy/50 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div><p className="font-black italic text-lg uppercase">{item.name}</p><p className="text-[10px] text-gray-500">$ {item.price?.toLocaleString('id-ID')}</p></div>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${item.stock > 0 ? 'bg-burgundy/20 text-burgundy' : 'bg-red-900/30 text-red-500'}`}>{item.stock} QTY</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setModalData({ item: item.name, action: 'ambil', maxStock: item.stock }); setQtyInput(1); setIsModalOpen(true); }} className="flex-1 bg-burgundy/80 py-2.5 rounded-xl font-bold text-[10px] uppercase">Keluar</button>
                        <button onClick={() => { setModalData({ item: item.name, action: 'taruh', maxStock: item.stock }); setQtyInput(1); setIsModalOpen(true); }} className="flex-1 bg-gray-800 py-2.5 rounded-xl font-bold text-[10px] uppercase">Masuk</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Analytics */}
              <div className="bg-cardBg border border-gray-800 rounded-3xl p-8 shadow-xl flex flex-col h-full">
                <h3 className="text-xs text-gray-400 font-bold mb-6 uppercase italic border-l-2 border-yellow-600 pl-3">Kasir Analytics</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6 border-b border-gray-800 pb-6">
                  <div className="bg-darkBg p-4 rounded-2xl border border-gray-800 shadow-inner">
                    <p className="text-[9px] text-gray-500 mb-1 uppercase font-bold">Sales (Wk)</p>
                    <p className="text-lg font-black text-green-500">
                      $ {(mgmtStats?.leaderboard?.find((s: any) => s.name === userNamaRP)?.totalSales || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="bg-darkBg p-4 rounded-2xl border border-gray-800 shadow-inner">
                    <p className="text-[9px] text-gray-500 mb-1 uppercase font-bold">Shift (Wk)</p>
                    <p className="text-lg font-mono font-bold text-burgundyLight">
                      {(mgmtStats?.leaderboard?.find((s: any) => s.name === userNamaRP)?.totalHours || 0).toFixed(2)} H
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">Sales Shift Ini</p>
                  <p className="text-3xl font-black text-yellow-500 tracking-tight">$ {todaySales.toLocaleString('id-ID')}</p>
                </div>

                <div className="flex-1 min-h-[120px] mb-6">
                  <p className="text-[10px] text-gray-500 mb-3 uppercase font-bold border-b border-gray-800 pb-2">Item Terjual</p>
                  {todayItems.length === 0 ? (
                    <p className="text-[10px] text-gray-600 italic">Belum ada transaksi.</p>
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
                  <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">Durasi Shift</p>
                  <p className="text-xl font-mono font-bold tracking-widest">{formatTime(seconds)}</p>
                </div>
              </div>
            </div>
          )}

      </main>

      {/* MODAL INVENTORY (ANTI-DOUBLE CLICK) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-burgundy rounded-3xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-black italic mb-6 uppercase text-center">{modalData.action === 'ambil' ? 'Ambil' : 'Taruh'} <span className="text-burgundyLight">{modalData.item}</span></h2>
            <input type="number" value={qtyInput} onChange={(e) => setQtyInput(parseInt(e.target.value) || 0)} className="bg-darkBg border border-gray-700 rounded-xl p-4 w-full text-center text-3xl font-black mb-8 outline-none" />
            <div className="flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase transition">Batal</button>
              <button 
                onClick={submitTransaction} 
                disabled={isSubmitting}
                className={`flex-1 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-lg transition-all ${isSubmitting ? 'bg-burgundy/40 text-gray-400 cursor-not-allowed' : 'bg-burgundy text-white hover:bg-burgundyLight'}`}
              >
                {isSubmitting ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SALES (ANTI-DOUBLE CLICK) */}
      {isSalesModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-yellow-600/50 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black italic mb-4 uppercase text-center text-yellow-500">Struk Kasir</h2>
            
            <div className="flex gap-2 mb-4">
              <select value={currentItem} onChange={(e) => setCurrentItem(e.target.value)} className="bg-darkBg border border-gray-700 rounded-xl p-3 flex-1 font-bold outline-none text-xs">
                {inventory.map((item, idx) => ( <option key={idx} value={item.name}>{item.name} - $ {item.price?.toLocaleString('id-ID')}</option> ))}
              </select>
              <input type="number" value={currentQty} onChange={(e) => setCurrentQty(parseInt(e.target.value) || 0)} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-20 text-center font-black outline-none text-sm" />
              <button onClick={() => {
                  const invItem = inventory.find(i => i.name === currentItem);
                  if (invItem && currentQty > 0) {
                    setSalesCart(prev => {
                      const existing = prev.find(i => i.item === currentItem);
                      if (existing) return prev.map(i => i.item === currentItem ? { ...i, qty: i.qty + currentQty } : i);
                      return [...prev, { item: currentItem, qty: currentQty, price: invItem.price }];
                    });
                    setCurrentQty(1);
                  }
                }} className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 px-4 rounded-xl font-black text-xl">+</button>
            </div>

            <div className="bg-darkBg border border-gray-800 rounded-xl p-4 mb-4 min-h-[150px] max-h-[200px] overflow-y-auto">
              {salesCart.length === 0 ? <p className="text-center text-gray-500 text-[10px] italic mt-12 uppercase tracking-widest">Struk Kosong...</p> : (
                <ul className="space-y-3">
                  {salesCart.map((cartItem, idx) => (
                    <li key={idx} className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                      <div className="flex flex-col"><span className="font-bold text-xs uppercase text-gray-200">{cartItem.item}</span><span className="text-[10px] text-gray-500">$ {cartItem.price.toLocaleString('id-ID')} x {cartItem.qty}</span></div>
                      <div className="flex items-center gap-4"><span className="font-black text-yellow-500 text-sm">$ {(cartItem.price * cartItem.qty).toLocaleString('id-ID')}</span><button onClick={() => setSalesCart(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 text-xs font-bold">✖</button></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-between items-center mb-6 bg-yellow-600/10 p-4 rounded-xl border border-yellow-600/20">
              <span className="font-bold text-[10px] uppercase text-gray-400">Total Tagihan:</span>
              <span className="text-3xl font-black text-yellow-500">$ {salesCart.reduce((total, item) => total + (item.price * item.qty), 0).toLocaleString('id-ID')}</span>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setIsSalesModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase transition">Tutup</button>
              <button 
                onClick={submitSales} 
                disabled={isSalesSubmitting || salesCart.length === 0}
                className={`flex-1 py-3.5 rounded-xl font-bold text-[10px] uppercase transition-all shadow-lg ${isSalesSubmitting || salesCart.length === 0 ? 'bg-yellow-900/30 text-gray-600 cursor-not-allowed shadow-none' : 'bg-yellow-600 text-white hover:bg-yellow-500 shadow-yellow-600/20'}`}
              >
                {isSalesSubmitting ? 'Sabar, Lagi Diproses...' : 'Bayar Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL EXPENSE (ANTI-DOUBLE CLICK) */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-red-600/50 rounded-3xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-black italic mb-6 uppercase text-center text-red-500">Catat Pengeluaran</h2>
            <div className="space-y-4 mb-8">
              <select value={expenseData.kategori} onChange={(e) => setExpenseData({...expenseData, kategori: e.target.value})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full font-bold outline-none text-sm">
                <option value="Operasional">Operasional</option><option value="Bonus Karyawan">Bonus Karyawan</option><option value="Bahan Baku">Bahan Baku</option><option value="Lain-Lain">Lain-Lain</option>
              </select>
              <input type="text" placeholder="Keterangan" value={expenseData.keterangan} onChange={(e) => setExpenseData({...expenseData, keterangan: e.target.value})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full font-bold text-sm outline-none" />
              <input type="number" placeholder="Jumlah ($)" value={expenseData.jumlah} onChange={(e) => setExpenseData({...expenseData, jumlah: parseInt(e.target.value) || 0})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full text-center text-xl font-black outline-none" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsExpenseModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase transition">Batal</button>
              <button 
                onClick={submitExpense} 
                disabled={isExpenseSubmitting}
                className={`flex-1 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-lg transition-all ${isExpenseSubmitting ? 'bg-red-900/30 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-500'}`}
              >
                {isExpenseSubmitting ? 'Mencatat...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REIMBURSE (ANTI-DOUBLE CLICK) */}
      {isReimburseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-blue-600/50 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black italic mb-6 uppercase text-center text-blue-500">Ajukan Reimburse</h2>
            <div className="space-y-4 mb-8">
              <input type="text" placeholder="Detail Pengeluaran" value={reimburseData.keterangan} onChange={(e) => setReimburseData({...reimburseData, keterangan: e.target.value})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full font-bold text-sm outline-none" />
              <input type="number" placeholder="Nominal ($)" value={reimburseData.jumlah} onChange={(e) => setReimburseData({...reimburseData, jumlah: parseInt(e.target.value) || 0})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full text-center text-xl font-black outline-none" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsReimburseModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase transition">Batal</button>
              <button 
                onClick={submitReimburseRequest} 
                disabled={isReimburseSubmitting} 
                className={`flex-1 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-lg transition-all ${isReimburseSubmitting ? 'bg-blue-900/30 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
              >
                {isReimburseSubmitting ? 'Mengirim...' : 'Kirim Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}