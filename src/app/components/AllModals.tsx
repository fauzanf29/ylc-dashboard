export default function AllModals(props: any) {
  // Hitung otomatis total belanjaan yang ada di cart
  const grandTotalSales = props.salesCart?.reduce((acc: number, curr: any) => acc + ((curr.price || 0) * curr.qty), 0) || 0;

  return (
    <>
      {/* MODAL INVENTORY */}
      {props.isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-burgundy rounded-3xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-black italic mb-6 uppercase text-center">{props.modalData.action === 'ambil' ? 'Ambil' : 'Taruh'} <span className="text-burgundyLight">{props.modalData.item}</span></h2>
            <input type="number" value={props.qtyInput} onChange={(e) => props.setQtyInput(parseInt(e.target.value) || 0)} className="bg-darkBg border border-gray-700 rounded-xl p-4 w-full text-center text-3xl font-black mb-8 outline-none" />
            <div className="flex gap-4">
              <button onClick={() => props.setIsModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase transition">Batal</button>
              <button onClick={props.submitTransaction} disabled={props.isSubmitting} className={`flex-1 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-lg transition-all ${props.isSubmitting ? 'bg-burgundy/40 text-gray-400 cursor-not-allowed' : 'bg-burgundy text-white hover:bg-burgundyLight'}`}>{props.isSubmitting ? 'Memproses...' : 'Konfirmasi'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SALES (KASIR) */}
      {props.isSalesModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-yellow-600/50 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black italic mb-4 uppercase text-center text-yellow-500">Rekap Penjualan</h2>
            
            <div className="flex gap-2 mb-4">
              <select value={props.currentItem} onChange={(e) => props.setCurrentItem(e.target.value)} className="bg-darkBg border border-gray-700 rounded-xl p-3 flex-1 font-bold outline-none text-xs">
                {props.inventory.map((item: any, idx: number) => ( <option key={idx} value={item.name}>{item.name} - $ {item.price?.toLocaleString('id-ID')}</option> ))}
              </select>
              <input type="number" value={props.currentQty} onChange={(e) => props.setCurrentQty(parseInt(e.target.value) || 0)} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-20 text-center font-black outline-none text-sm" />
              <button onClick={props.addToCart} className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 px-4 rounded-xl font-black text-xl">+</button>
            </div>
            
            <div className="bg-darkBg border border-gray-800 rounded-xl p-4 mb-4 min-h-[150px] max-h-[200px] overflow-y-auto">
              <ul className="space-y-3">
                {props.salesCart.map((cartItem: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs uppercase text-gray-200">{cartItem.item}</span>
                      <span className="text-[10px] text-gray-500">$ {cartItem.price.toLocaleString('id-ID')} x {cartItem.qty}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-yellow-500 text-sm">$ {(cartItem.price * cartItem.qty).toLocaleString('id-ID')}</span>
                      <button onClick={() => props.removeFromCart(idx)} className="text-red-500 text-xs font-bold">✖</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 💰 KOTAK GRAND TOTAL (FITUR BARU) */}
            {props.salesCart.length > 0 && (
              <div className="mb-6 p-4 bg-green-950/40 border border-green-600/50 rounded-xl flex justify-between items-center shadow-[0_0_15px_rgba(0,255,0,0.1)]">
                <div>
                  <p className="text-[15px] text-green-500 font-bold uppercase tracking-widest">Total</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-green-400 text-2xl tracking-wider">
                    $ {grandTotalSales.toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => props.setIsSalesModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase transition">Tutup</button>
              <button onClick={props.submitSales} disabled={props.isSalesSubmitting || props.salesCart.length === 0} className={`flex-1 py-3.5 rounded-xl font-bold text-[10px] uppercase transition-all shadow-lg ${props.isSalesSubmitting || props.salesCart.length === 0 ? 'bg-yellow-900/30 text-gray-600 cursor-not-allowed shadow-none' : 'bg-yellow-600 text-white hover:bg-yellow-500'}`}>{props.isSalesSubmitting ? 'Sabar...' : 'Kirim Laporan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPENSE */}
      {props.isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-red-600/50 rounded-3xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-black italic mb-6 uppercase text-center text-red-500">Catat Pengeluaran</h2>
            <div className="space-y-4 mb-8">
              <select value={props.expenseData.kategori} onChange={(e) => props.setExpenseData({...props.expenseData, kategori: e.target.value})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full font-bold outline-none text-sm">
                <option value="Operasional">Operasional</option><option value="Bonus Karyawan">Bonus Karyawan</option><option value="Bahan Baku">Bahan Baku</option><option value="Lain-Lain">Lain-Lain</option>
              </select>
              <input type="text" placeholder="Keterangan" value={props.expenseData.keterangan} onChange={(e) => props.setExpenseData({...props.expenseData, keterangan: e.target.value})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full font-bold text-sm outline-none" />
              <input type="number" placeholder="Jumlah ($)" value={props.expenseData.jumlah} onChange={(e) => props.setExpenseData({...props.expenseData, jumlah: parseInt(e.target.value) || 0})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full text-center text-xl font-black outline-none" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => props.setIsExpenseModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase transition">Batal</button>
              <button onClick={props.submitExpense} disabled={props.isExpenseSubmitting} className="flex-1 bg-red-600 py-3.5 text-white rounded-xl font-bold text-[10px] uppercase">{props.isExpenseSubmitting ? 'Mencatat...' : 'Konfirmasi'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REIMBURSE */}
      {props.isReimburseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cardBg border border-blue-600/50 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black italic mb-6 uppercase text-center text-blue-500">Ajukan Reimburse</h2>
            <div className="space-y-4 mb-8">
              <input type="text" placeholder="Detail Pengeluaran" value={props.reimburseData.keterangan} onChange={(e) => props.setReimburseData({...props.reimburseData, keterangan: e.target.value})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full font-bold text-sm outline-none" />
              <input type="number" placeholder="Nominal ($)" value={props.reimburseData.jumlah} onChange={(e) => props.setReimburseData({...props.reimburseData, jumlah: parseInt(e.target.value) || 0})} className="bg-darkBg border border-gray-700 rounded-xl p-3 w-full text-center text-xl font-black outline-none" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => props.setIsReimburseModalOpen(false)} className="flex-1 bg-gray-800 py-3.5 rounded-xl font-bold text-[10px] uppercase transition">Batal</button>
              <button onClick={props.submitReimburseRequest} disabled={props.isReimburseSubmitting} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-[10px] uppercase">{props.isReimburseSubmitting ? 'Mengirim...' : 'Kirim Request'}</button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* 💰 MODAL DIVIDEN (PROFIT SHARING) VIP */}
      {/* ========================================== */}
      {props.isDividenModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-[#0a0a0a] border border-yellow-600/50 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(234,179,8,0.15)] relative overflow-hidden">
            
            {/* Efek Cahaya Emas di Background */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="text-center mb-6">
              <span className="text-4xl drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">👑</span>
              <h2 className="text-2xl font-black italic mt-2 uppercase text-yellow-500 tracking-wider">Tarik Dividen</h2>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Distribusi Profit YLC Management</p>
            </div>

            {/* Display Net Profit */}
            <div className="bg-yellow-950/20 border border-yellow-600/30 p-5 rounded-2xl mb-8 text-center shadow-inner relative z-10">
              <p className="text-[10px] text-yellow-600/80 font-black uppercase tracking-[0.2em] mb-1">Net Profit Tersedia</p>
              <p className="text-3xl font-black text-yellow-500 tracking-wider">$ {props.mgmtStats?.finance?.net?.toLocaleString('id-ID') || 0}</p>
            </div>

            <div className="space-y-6 mb-8 relative z-10">
              <input type="text" placeholder="Keterangan (Contoh: Bagi Hasil Minggu 3)" value={props.dividenData.keterangan} onChange={(e) => props.setDividenData({...props.dividenData, keterangan: e.target.value})} className="bg-[#111] border border-gray-800 rounded-xl p-3.5 w-full font-bold text-sm outline-none focus:border-yellow-600/50 transition-colors text-gray-200" />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-600">$</span>
                <input type="number" placeholder="Nominal Tarik ($)" value={props.dividenData.jumlah || ''} onChange={(e) => props.setDividenData({...props.dividenData, jumlah: parseInt(e.target.value) || 0})} className="bg-[#111] border border-gray-800 rounded-xl p-3.5 pl-9 w-full text-2xl font-black outline-none focus:border-yellow-600/50 transition-colors text-yellow-500" />
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <button onClick={() => props.setIsDividenModalOpen(false)} className="flex-1 bg-[#111] hover:bg-gray-800 border border-gray-800 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors text-gray-400">Batal</button>
              <button onClick={props.submitDividen} disabled={props.isDividenSubmitting} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white border border-yellow-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] transition-all disabled:opacity-50">
                {props.isDividenSubmitting ? 'Mengeksekusi...' : 'Tarik Dividen'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🥈 MODAL BONUS KARYAWAN */}
      {/* ========================================== */}
      {props.isBonusModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-[#0a0a0a] border border-gray-400/30 rounded-3xl p-8 w-full max-w-md shadow-[0_0_30px_rgba(255,255,255,0.05)] relative overflow-hidden">
            
            <div className="text-center mb-6">
              <span className="text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">🥈</span>
              <h2 className="text-2xl font-black italic mt-2 uppercase text-gray-200 tracking-wider">Kirim Bonus</h2>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Apresiasi Performa Staff YLC</p>
            </div>

            <div className="space-y-4 mb-8 relative z-10">
              {/* Dropdown Nama Staff otomatis dari Leaderboard */}
              <select value={props.bonusData.staffName} onChange={(e) => props.setBonusData({...props.bonusData, staffName: e.target.value})} className="bg-[#111] border border-gray-800 rounded-xl p-3.5 w-full font-bold text-sm outline-none focus:border-gray-500/50 text-gray-300">
                <option value="">Pilih Nama Staff</option>
                {props.mgmtStats?.leaderboard?.map((s: any, i: number) => <option key={i} value={s.name}>{s.name}</option>)}
              </select>
              
              <input type="text" placeholder="Alasan Bonus (Contoh: Penjualan Terbanyak)" value={props.bonusData.keterangan} onChange={(e) => props.setBonusData({...props.bonusData, keterangan: e.target.value})} className="bg-[#111] border border-gray-800 rounded-xl p-3.5 w-full font-bold text-sm outline-none focus:border-gray-500/50 transition-colors text-gray-200" />
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-600">$</span>
                <input type="number" placeholder="Nominal Bonus ($)" value={props.bonusData.jumlah || ''} onChange={(e) => props.setBonusData({...props.bonusData, jumlah: parseInt(e.target.value) || 0})} className="bg-[#111] border border-gray-800 rounded-xl p-3.5 pl-9 w-full text-2xl font-black outline-none focus:border-gray-500/50 transition-colors text-white" />
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <button onClick={() => props.setIsBonusModalOpen(false)} className="flex-1 bg-[#111] hover:bg-gray-800 border border-gray-800 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors text-gray-400">Batal</button>
              <button onClick={props.submitBonus} disabled={props.isBonusSubmitting} className="flex-1 bg-gray-200 hover:bg-white text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50">
                {props.isBonusSubmitting ? 'Mengirim...' : 'Kirim Bonus'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}