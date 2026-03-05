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
  const [salesData, setSalesData] = useState({ item: '', qty: 1 });
  const [isSalesSubmitting, setIsSalesSubmitting] = useState(false);
  const [todaySales, setTodaySales] = useState(0);

  // Management & Finance State
  const [mgmtStats, setMgmtStats] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState(`Minggu ${Math.ceil((new Date().getDate() + new Date(new Date().getFullYear(), 0, 1).getDay()) / 7)}`);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({ kategori: 'Operasional', keterangan: '', jumlah: 0 });
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);

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

  const fetchMgmtStats = async () => {
    try {
      const res = await fetch(`/api/management/stats?week=${selectedWeek}`);
      if (res.ok) setMgmtStats(await res.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (session) {
      fetchInventory();
      if ((session.user as any).role === 'management') fetchMgmtStats();
    }
  }, [session, selectedWeek]);

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
          <button onClick={() => signIn('discord')} className="w-full bg-burgundy hover:bg-burgundyLight text-white py-4 mt-8 rounded-xl font-bold transition-all shadow-lg text-sm">LOGIN WITH DISCORD</button>
        </div>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role || 'staff'; 
  const userNamaRP = (session?.user as any)?.namaRP || session?.user?.name || 'Unknown';

  const handleAbsensi = async () => {
    const action = isCheckedIn ? 'checkout' : 'checkin';
    try {
      const res = await fetch('/api/absensi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ namaStaff: userNamaRP, action }) });
      if (res.ok) {
        setIsCheckedIn(!isCheckedIn);
        if (action === 'checkout') setSeconds(0);
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
    setIsSalesSubmitting(true);
    try {
      const res = await fetch('/api/penjualan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemName: salesData.item, quantity: salesData.qty, userName: userNamaRP }) });
      const data = await res.json();
      if (res.ok) {
        setTodaySales(prev => prev + data.totalHarga);
        setIsSalesModalOpen(false);
        if (userRole === 'management') fetchMgmtStats();
        alert("Penjualan Tercatat!");
      } else alert(data.error);
    } catch (error) { alert("Error!"); }
    setIsSalesSubmitting(false);
  };

  const submitExpense = async () => {
    if (expenseData.jumlah <= 0) return alert("Jumlah minimal Rp 1");
    setIsExpenseSubmitting(true);
    try {
      const res = await fetch('/api/management/expense', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expenseData, userName: userNamaRP }) });
      if (res.ok) {
        setIsExpenseModalOpen(false);
        setExpenseData({ kategori: 'Operasional', keterangan: '', jumlah: 0 });
        fetchMgmtStats();
        alert("Pengeluaran Tercatat!");
      }
    } catch (error) { alert("Error!"); }
    setIsExpenseSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-darkBg text-white selection:bg-burgundy pb-20 relative font-sans">
      
      {/* HEADER WITH VAULT BALANCE */}
      <header className="flex justify-between items-center p-6 border-b border-gray-800 bg-cardBg sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-burgundy text-white font-bold p-2 rounded-lg text-sm tracking-widest">YLC</div>
            <div className="hidden md:block">
              <h1 className="text-xl font-black italic tracking-wider leading-none">Y-CLUB <span className="text-burgundy">HQ</span></h1>
              {userRole === 'management' && (
                <p className="text-[10px] text-green-500 font-bold tracking-tighter uppercase mt-1">
                  Vault Balance: Rp {mgmtStats?.totalKasGlobal?.toLocaleString('id-ID') || 0}
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
                <button onClick={() => { setSalesData({ item: inventory[0]?.name, qty: 1 }); setIsSalesModalOpen(true); }} className="px-8 py-2.5 rounded-xl font-bold text-xs transition bg-yellow-600 hover:bg-yellow-500 text-white uppercase tracking-widest shadow-lg">
                  $ Catat Penjualan
                </button>
              )}
              {userRole === 'management' && (
                <button onClick={() => setIsExpenseModalOpen(true)} className="px-8 py-2.5 rounded-xl font-bold text-xs transition bg-red-800 hover:bg-red-700 text-white uppercase tracking-widest shadow-lg">
                  💸 Catat Pengeluaran
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
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Total Omzet (Wk)</p>
                  <p className="text-2xl font-black text-green-500">Rp {mgmtStats?.finance?.bruto?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-cardBg border border-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-l-red-600">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Pengeluaran (Wk)</p>
                  <p className="text-2xl font-black text-red-500">Rp {mgmtStats?.finance?.expense?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-cardBg border border-gray-800 p-6 rounded-2xl shadow-lg">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Setoran (20%)</p>
                  <p className="text-2xl font-black text-yellow-500">Rp {mgmtStats?.finance?.setoran?.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-cardBg border border-burgundy/30 p-6 rounded-2xl shadow-xl bg-gradient-to-br from-cardBg to-burgundy/5">
                  <p className="text-[10px] text-burgundyLight font-bold uppercase mb-2 tracking-widest">Net (80% - Exp)</p>
                  <p className="text-2xl font-black text-white">Rp {mgmtStats?.finance?.net?.toLocaleString('id-ID') || 0}</p>
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
                          <td className="p-4 text-right font-black text-green-500">Rp {staff.totalSales.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
              <h2 className="text-2xl font-black italic uppercase mb-4 text-">Akses Terkunci</h2>
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
                        <div><p className="font-black italic text-lg uppercase group-hover:text-burgundyLight">{item.name}</p><p className="text-[10px] text-gray-500">Rp {item.price?.toLocaleString('id-ID')}</p></div>
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
              <div className="bg-cardBg border border-gray-800 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xs text-gray-400 font-bold mb-8 uppercase italic border-l-2 border-yellow-600 pl-3">Kasir Analytics</h3>
                <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">Sales Pribadi (Hari Ini)</p>
                <p className="text-3xl font-black text-yellow-500 mb-8">Rp {todaySales.toLocaleString('id-ID')}</p>
                <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">Durasi Shift</p>
                <p className="text-xl font-mono font-bold tracking-widest">{formatTime(seconds)}</p>
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
      {isSalesModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-yellow-600/50 rounded-3xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-black italic mb-6 uppercase text-center text-yellow-500">Catat Penjualan</h2>
            <div className="space-y-4 mb-8">
              <select value={salesData.item} onChange={(e) => setSalesData({...salesData, item: e.target.value})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full font-bold outline-none">
                {inventory.map((item, idx) => ( <option key={idx} value={item.name}>{item.name} - Rp {item.price?.toLocaleString('id-ID')}</option> ))}
              </select>
              <input type="number" value={salesData.qty} onChange={(e) => setSalesData({...salesData, qty: parseInt(e.target.value) || 0})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full text-center text-xl font-black outline-none" />
              <div className="bg-yellow-600/10 p-4 rounded-xl text-center"><p className="text-2xl font-black text-yellow-500">Rp {((inventory.find(i => i.name === salesData.item)?.price || 0) * salesData.qty).toLocaleString('id-ID')}</p></div>
            </div>
            <div className="flex gap-4"><button onClick={() => setIsSalesModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase">Batal</button><button onClick={submitSales} className="flex-1 bg-yellow-600 py-3.5 rounded-xl font-bold text-[10px] uppercase">Konfirmasi</button></div>
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
              <input type="number" placeholder="Jumlah (Rp)" value={expenseData.jumlah} onChange={(e) => setExpenseData({...expenseData, jumlah: parseInt(e.target.value) || 0})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full text-center text-xl font-black outline-none" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsExpenseModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase">Batal</button>
              <button onClick={submitExpense} className="flex-1 bg-red-600 py-3.5 rounded-xl font-bold text-[10px] uppercase">Konfirmasi</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}