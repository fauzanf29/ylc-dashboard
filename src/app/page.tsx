"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";

// --- IMPORT SEMUA KOMPONEN ---
import { LoadingScreen, LoginScreen, UnauthorizedScreen } from './components/AuthScreens';
import Header from './components/Header';
import ActionBar from './components/ActionBar';
import Leaderboard from './components/Leaderboard';
import StockBalance from './components/StockBalance';
import LogsPanel from './components/LogsPanel';
import RestockForm from './components/RestockForm';
import ReimbursePanel from './components/ReimbursePanel';
import StaffPanel from './components/StaffPanel';
import AllModals from './components/AllModals';
import FinanceAudit from './components/FinanceAudit';
import PocketMonitor from './components/PocketMonitor';
import ValuasiGudang from './components/ValuasiGudang';
import TabbedDashboard from './components/TabbedDashboard';

export default function Page() {
  // ==========================================
  // 1. STATE & DATA (OTAK APLIKASI)
  // ==========================================
  const { data: session, status } = useSession();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [mgmtStats, setMgmtStats] = useState<any>(null);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ item: '', action: 'ambil' as 'ambil' | 'taruh', maxStock: 0 });
  const [qtyInput, setQtyInput] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [salesCart, setSalesCart] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [isSalesSubmitting, setIsSalesSubmitting] = useState(false);
  
  const [todaySales, setTodaySales] = useState(0);
  const [todayItems, setTodayItems] = useState<any[]>([]);

  // Finance & Management States
const [selectedWeek, setSelectedWeek] = useState(() => {
    // Patokan awal: Jumat pertama (23 Jan 2026) jam 19:00 WIB
    const startDate = new Date('2026-01-23T19:00:00+07:00').getTime();
    const now = Date.now();
    
    // 1 Minggu dalam milidetik (7 hari * 24 jam * 60 menit * 60 detik * 1000 ms)
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    
    // Hitung selisihnya
    const diffInMs = now - startDate;
    
    // Math.floor memastikan angka minggu baru naik TEPAT setelah lewat jam 19:00
    const weekNumber = Math.floor(diffInMs / msPerWeek) + 1;
    
    return `Minggu ${weekNumber > 0 ? weekNumber : 1}`;
  });

  const [isReimburseModalOpen, setIsReimburseModalOpen] = useState(false);
  const [reimburseData, setReimburseData] = useState({ keterangan: '', jumlah: 0 });
  const [isReimburseSubmitting, setIsReimburseSubmitting] = useState(false);
  const [pendingReimbursements, setPendingReimbursements] = useState<any[]>([]);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({ kategori: 'Operasional', keterangan: '', jumlah: 0 });
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  // 💰 STATE KHUSUS DIVIDEN
  const [isDividenModalOpen, setIsDividenModalOpen] = useState(false);
  const [dividenData, setDividenData] = useState({ keterangan: 'Bagi Hasil Management', jumlah: 0 });
  const [isDividenSubmitting, setIsDividenSubmitting] = useState(false);

  const userRole = (session?.user as any)?.role || 'unauthorized'; 
  const userNamaRP = (session?.user as any)?.namaRP || 'Unknown Personnel';

  // ==========================================
  // 2. FUNGSI LOGIKA (MESIN API)
  // ==========================================
  const fetchInventory = async () => { try { const res = await fetch('/api/inventory'); if (res.ok) setInventory(await res.json()); } catch (e) {} };
  const fetchMgmtStats = async () => { try { const res = await fetch(`/api/management/stats?week=${selectedWeek}`); if (res.ok) setMgmtStats(await res.json()); } catch (e) {} };
  const fetchPendingReimbursements = async () => { try { const res = await fetch('/api/management/reimburse'); if (res.ok) setPendingReimbursements(await res.json()); } catch (e) {} };

  const handleAbsensi = async () => {
    const action = isCheckedIn ? 'checkout' : 'checkin';
    try {
      const res = await fetch('/api/absensi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ namaStaff: userNamaRP, action }) });
      if (res.ok) {
        if (action === 'checkout') { setIsCheckedIn(false); setSeconds(0); setTodaySales(0); setTodayItems([]); localStorage.removeItem('ylc_checkInTime'); localStorage.removeItem('ylc_todaySales'); localStorage.removeItem('ylc_todayItems'); } 
        else { setIsCheckedIn(true); localStorage.setItem('ylc_checkInTime', Date.now().toString()); }
        fetchMgmtStats();
      }
    } catch (e) {}
  };

  const submitTransaction = async () => {
    if (isSubmitting || !modalData.item) return; setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemName: modalData.item, action: modalData.action, userName: userNamaRP, quantity: qtyInput }) });
      const data = await res.json();
      if (res.ok) { setInventory(prev => prev.map(i => i.name === modalData.item ? { ...i, stock: data.newStock } : i)); setIsModalOpen(false); alert("Stok Berhasil Diupdate!"); fetchMgmtStats(); } 
      else alert(data.error);
    } catch (e) {} finally { setIsSubmitting(false); }
  };

  const submitSales = async () => {
    if (isSalesSubmitting || salesCart.length === 0) return; setIsSalesSubmitting(true); let totalCartSales = 0; let addedItems: any[] = [];
    try {
      for (const item of salesCart) {
        const res = await fetch('/api/penjualan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemName: item.item, quantity: item.qty, userName: userNamaRP }) });
        if (res.ok) { const data = await res.json(); totalCartSales += data.totalHarga; addedItems.push({ item: item.item, qty: item.qty }); }
      }
      const newTotalSales = todaySales + totalCartSales; setTodaySales(newTotalSales); localStorage.setItem('ylc_todaySales', newTotalSales.toString());
      setTodayItems(prev => { let updatedItems = [...prev]; addedItems.forEach(cartItem => { const existingIndex = updatedItems.findIndex(i => i.item === cartItem.item); if (existingIndex >= 0) updatedItems[existingIndex].qty += cartItem.qty; else updatedItems.push({ item: cartItem.item, qty: cartItem.qty }); }); localStorage.setItem('ylc_todayItems', JSON.stringify(updatedItems)); return updatedItems; });
      
      // 👇 INI TAMBAHANNYA BIAR KERANJANG KOSONG SETELAH BAYAR 👇
      setSalesCart([]); 
      setIsSalesModalOpen(false); 
      fetchMgmtStats(); 
      alert(`✅ Transaksi Berhasil! Total: $ ${totalCartSales.toLocaleString('id-ID')}`);
    } catch (e) {} finally { setIsSalesSubmitting(false); }
  };

  const submitExpense = async () => {
    if (isExpenseSubmitting || expenseData.jumlah <= 0) return; setIsExpenseSubmitting(true);
    try { const res = await fetch('/api/management/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expenseData, userName: userNamaRP }) }); if (res.ok) { setIsExpenseModalOpen(false); setExpenseData({ kategori: 'Operasional', keterangan: '', jumlah: 0 }); fetchMgmtStats(); } } catch (e) {} finally { setIsExpenseSubmitting(false); }
  };

  const submitReimburseRequest = async () => {
    if (isReimburseSubmitting || reimburseData.jumlah <= 0 || !reimburseData.keterangan) return; setIsReimburseSubmitting(true);
    try { const res = await fetch('/api/management/reimburse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request', userName: userNamaRP, ...reimburseData }) }); if (res.ok) { setIsReimburseModalOpen(false); setReimburseData({ keterangan: '', jumlah: 0 }); alert("Request dikirim!"); } } catch (e) {} finally { setIsReimburseSubmitting(false); }
  };

  const handleReimburseAction = async (row: any, actionType: 'acc' | 'tolak') => {
    if (!confirm(`Yakin mau ${actionType.toUpperCase()}?`)) return;
    try { const res = await fetch('/api/management/reimburse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: actionType, rowNumber: row.rowNumber, waktu: row.waktu, minggu: row.minggu, userName: row.nama, keterangan: row.keterangan, jumlah: row.jumlah }) }); if (res.ok) { fetchPendingReimbursements(); fetchMgmtStats(); } } catch (e) {}
  };

  const sendWebhookReport = async () => {
    if (!mgmtStats || isSendingWebhook || !confirm(`Kirim rekap ke Discord?`)) return; setIsSendingWebhook(true);
    try { await fetch('/api/management/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week: selectedWeek, stats: mgmtStats, sender: userNamaRP }) }); alert("Laporan terkirim!"); } catch (e) {} finally { setIsSendingWebhook(false); }
  };

  // 💰 FUNGSI EKSEKUSI DIVIDEN
  const submitDividen = async () => {
    if (isDividenSubmitting || dividenData.jumlah <= 0) return; 
    setIsDividenSubmitting(true);
    try { 
      const res = await fetch('/api/management/dividen', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...dividenData, userName: userNamaRP, minggu: selectedWeek }) 
      }); 
      if (res.ok) { 
        setIsDividenModalOpen(false); 
        setDividenData({ keterangan: 'Bagi Hasil Management', jumlah: 0 }); 
        fetchMgmtStats(); 
        alert("💰 Dividen berhasil diamankan!");
      } 
    } catch (e) {} finally { setIsDividenSubmitting(false); }
  };

  // Effects
  useEffect(() => { let interval: NodeJS.Timeout; if (isCheckedIn) { interval = setInterval(() => { const saved = localStorage.getItem('ylc_checkInTime'); if (saved) setSeconds(Math.floor((Date.now() - parseInt(saved)) / 1000)); else setSeconds(prev => prev + 1); }, 1000); } return () => clearInterval(interval); }, [isCheckedIn]);
  useEffect(() => { const savedCheckIn = localStorage.getItem('ylc_checkInTime'); if (savedCheckIn) { setIsCheckedIn(true); setSeconds(Math.floor((Date.now() - parseInt(savedCheckIn)) / 1000)); } const savedSales = localStorage.getItem('ylc_todaySales'); if (savedSales) setTodaySales(parseInt(savedSales)); const savedItems = localStorage.getItem('ylc_todayItems'); if (savedItems) setTodayItems(JSON.parse(savedItems)); }, []);
  useEffect(() => { if (session) { fetchInventory(); fetchMgmtStats(); if ((session.user as any).role === 'management') fetchPendingReimbursements(); } }, [session, selectedWeek]);
  
  const formatTime = (s: number) => { const hrs = Math.floor(s / 3600); const mins = Math.floor((s % 3600) / 60); return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`; };

  // ==========================================
  // 3. TAMPILAN UI (WAJAH APLIKASI)
  // ==========================================
  if (status === "loading") return <LoadingScreen />;
  if (!session) return <LoginScreen />;
  if (userRole === 'unauthorized') return <UnauthorizedScreen />;

  return (
    <div className="min-h-screen bg-darkBg text-white pb-20 font-sans">
      <Header userRole={userRole} userNamaRP={userNamaRP} vault={mgmtStats?.totalKasGlobal} image={session?.user?.image} />

      <main className="p-8 max-w-[1400px] mx-auto space-y-8">
        
        {/* BAR TOMBOL AKTIVITAS */}
        <ActionBar 
            userRole={userRole} 
            isCheckedIn={isCheckedIn} 
            handleAbsensi={handleAbsensi} 
            openKasir={() => { setCurrentItem(inventory[0]?.name || ''); setCurrentQty(1); setIsSalesModalOpen(true); }}
            openExpense={() => setIsExpenseModalOpen(true)}
            sendReport={sendWebhookReport} 
            isSending={isSendingWebhook} 
            openReimburse={() => setIsReimburseModalOpen(true)} 
            openDividen={() => setIsDividenModalOpen(true)} // <-- MENGIRIM PERINTAH BUKA DIVIDEN
            time={formatTime(seconds)} 
        />

        {/* ======================================================= */}
        {/* --- PANEL ROLE: MANAGEMENT (BOS) -> PAKE TABS BARU! --- */}
        {/* ======================================================= */}
        {userRole === 'management' && (
          <div className="space-y-8">
            <LogsPanel mgmtStats={mgmtStats} />
            <Leaderboard mgmtStats={mgmtStats} selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek} />
            
            {/* INI DIA JURUS TABS-NYA BRE! */}
            <TabbedDashboard 
              inventory={inventory} 
              mgmtStats={mgmtStats} 
              userName={undefined} 
            />
            
            <ReimbursePanel pendingReimbursements={pendingReimbursements} fetchPendingReimbursements={fetchPendingReimbursements} handleReimburseAction={handleReimburseAction} />
            <RestockForm currentWeek={selectedWeek} spvName={userNamaRP} inventory={inventory} />
          </div>
        )}

        {/* --- PANEL ROLE: SUPERVISOR --- */}
        {userRole === 'supervisor' && (
          <div className="bg-blue-600/10 border border-blue-600/20 p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl text-xl shadow-lg shadow-blue-600/20">🛡️</div>
              <div>
                <h2 className="text-blue-400 font-black uppercase text-sm italic">Supervisor Portal</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Manajemen Stok & Audit Terbuka</p>
              </div>
            </div>
            <div className="hidden md:block">
              <p className="text-[9px] text-gray-600 uppercase font-black text-right">Access Level: Level 2</p>
            </div>
          </div>
        )}

        {/* --- PANEL AUDIT STOK (SPV BISA LIHAT) --- */}
        {userRole === 'supervisor' && (
          <div className="space-y-8">
            <PocketMonitor />
            <StockBalance inventory={inventory} mgmtStats={mgmtStats} />
            <RestockForm currentWeek={selectedWeek} spvName={userNamaRP} inventory={inventory} />
          </div>
        )}

        {/* --- PANEL STAFF (SEMUA BISA LIHAT KECUALI BOS) --- */}
        {userRole !== 'management' && (
          <PocketMonitor userName={userNamaRP} />
        )}
        
        <StaffPanel 
            isCheckedIn={isCheckedIn} 
            userRole={userRole} 
            handleAbsensi={handleAbsensi} 
            inventory={inventory} 
            openInventoryModal={(item: string, action: 'ambil'|'taruh', max: number) => { setModalData({ item, action, maxStock: max }); setQtyInput(1); setIsModalOpen(true); }} 
            totalSales={mgmtStats?.leaderboard?.find((s: any) => s.name === userNamaRP)?.totalSales || 0} 
            totalHours={mgmtStats?.leaderboard?.find((s: any) => s.name === userNamaRP)?.totalHours || 0} 
            todaySales={todaySales} 
            todayItems={todayItems} 
            time={formatTime(seconds)} 
        />
        
      </main>
        
      {/* POP-UP MODALS */}
      <AllModals 
          isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} modalData={modalData} qtyInput={qtyInput} setQtyInput={setQtyInput} submitTransaction={submitTransaction} isSubmitting={isSubmitting} 
          isSalesModalOpen={isSalesModalOpen} setIsSalesModalOpen={setIsSalesModalOpen} currentItem={currentItem} setCurrentItem={setCurrentItem} inventory={inventory} currentQty={currentQty} setCurrentQty={setCurrentQty} 
          addToCart={() => { const invItem = inventory.find(i => i.name === currentItem); if (invItem && currentQty > 0) { setSalesCart(prev => { const existing = prev.find(i => i.item === currentItem); if (existing) return prev.map(i => i.item === currentItem ? { ...i, qty: i.qty + currentQty } : i); return [...prev, { item: currentItem, qty: currentQty, price: invItem.price }]; }); setCurrentQty(1); } }} 
          salesCart={salesCart} removeFromCart={(idx: number) => setSalesCart(prev => prev.filter((_, i) => i !== idx))} submitSales={submitSales} isSalesSubmitting={isSalesSubmitting} 
          isExpenseModalOpen={isExpenseModalOpen} setIsExpenseModalOpen={setIsExpenseModalOpen} expenseData={expenseData} setExpenseData={setExpenseData} submitExpense={submitExpense} isExpenseSubmitting={isExpenseSubmitting} 
          isReimburseModalOpen={isReimburseModalOpen} setIsReimburseModalOpen={setIsReimburseModalOpen} reimburseData={reimburseData} setReimburseData={setReimburseData} submitReimburseRequest={submitReimburseRequest} isReimburseSubmitting={isReimburseSubmitting} 
          
          // PROP DIVIDEN
          isDividenModalOpen={isDividenModalOpen}
          setIsDividenModalOpen={setIsDividenModalOpen}
          dividenData={dividenData}
          setDividenData={setDividenData}
          submitDividen={submitDividen}
          isDividenSubmitting={isDividenSubmitting}
          mgmtStats={mgmtStats}
      />
      
    </div>
  );
}