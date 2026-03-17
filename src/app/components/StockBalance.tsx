"use client";

export default function StockBalance({ inventory, mgmtStats }: any) {
  // 1. Ambil data Penjualan per item
  const soldMap = mgmtStats?.itemSales?.reduce((acc: any, item: any) => {
    acc[item.name.toLowerCase()] = item.qty;
    return acc;
  }, {}) || {};

  // 2. Ambil data Restock per item (hasil scan Log_Pengeluaran)
  const restockMap = mgmtStats?.expensesList?.reduce((acc: any, exp: any) => {
    if (exp.kategori === 'Restock Barang') {
      const match = exp.keterangan.match(/Restock (\d+)x (.+)/);
      if (match) {
        const qty = parseInt(match[1]);
        const name = match[2].trim().toLowerCase();
        acc[name] = (acc[name] || 0) + qty;
      }
    }
    return acc;
  }, {}) || {};

  // 3. Hitung Global (Apakah ada barang yang hilang?)
  const totalBarangHilang = inventory.reduce((acc: number, item: any) => {
    const totalRestock = restockMap[item.name.toLowerCase()] || 0;
    const totalSold = soldMap[item.name.toLowerCase()] || 0;
    const sisaSeharusnya = totalRestock - totalSold;
    const selisih = item.stock - sisaSeharusnya;
    
    // Kalau selisihnya minus, berarti hilang
    return selisih < 0 ? acc + Math.abs(selisih) : acc;
  }, 0);

  return (
    <div className={`bg-cardBg border-2 ${totalBarangHilang > 0 ? 'border-red-600 shadow-[0_0_30px_rgba(255,0,0,0.2)]' : 'border-gray-800'} rounded-3xl overflow-hidden mt-8 transition-all`}>
      
      {/* HEADER TAMPILAN */}
      <div className={`p-6 border-b ${totalBarangHilang > 0 ? 'border-red-600 bg-red-600/10' : 'border-gray-800 bg-darkBg/50'} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
        <div>
          <h3 className={`font-black italic uppercase tracking-widest text-sm ${totalBarangHilang > 0 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
            {totalBarangHilang > 0 ? '🚨 WARNING: ADA BARANG HILANG ATAU SALAH REKAP' : '📊 Stock Balance'}
          </h3>
          <p className="text-[10px] text-gray-500 uppercase mt-1">Perbandingan Barang Masuk, Keluar, dan Audit Kehilangan</p>
        </div>
        
        {/* JIKA ADA YANG HILANG, TAMPILIN BADGE BESAR */}
        {totalBarangHilang > 0 && (
          <div className="bg-red-600 text-white px-4 py-2 rounded-xl border-2 border-red-400 shadow-[0_0_15px_rgba(255,0,0,0.5)] flex items-center gap-2 animate-bounce">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest leading-none">Total Indikasi Hilang</p>
              <p className="text-lg font-black leading-none mt-1">{totalBarangHilang} PCS</p>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-800 bg-gray-900/30">
              <th className="p-4">Nama Item</th>
              <th className="p-4 text-center">Restock</th>
              <th className="p-4 text-center">Terjual</th>
              <th className="p-4 text-center">Live Inventory</th>
              <th className="p-4 text-center text-blue-400">Sisa (Seharusnya)</th>
              {/* KOLOM BARU: KEHILANGAN */}
              <th className="p-4 text-center text-red-400 bg-red-900/10">Indikasi Hilang</th>
              <th className="p-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {inventory.map((item: any, idx: number) => {
              const totalRestock = restockMap[item.name.toLowerCase()] || 0;
              const totalSold = soldMap[item.name.toLowerCase()] || 0;
              
              // LOGIKA MATEMATIKA BOS AKEW
              const sisaBelumTerjual = totalRestock - totalSold; // Misal: 305 - 235 = 70
              const selisihKehilangan = item.stock - sisaBelumTerjual; // Misal: 60 - 70 = -10 (Hilang 10)
              
              const isMissing = selisihKehilangan < 0;

              return (
                <tr key={idx} className={`border-b border-gray-900/50 hover:bg-white/5 transition-colors ${isMissing ? 'bg-red-950/20' : ''}`}>
                  <td className="p-4 font-black uppercase text-gray-300">{item.name}</td>
                  
                  <td className="p-4 text-center font-bold text-orange-500">
                    {totalRestock > 0 ? `${totalRestock}` : "-"}
                  </td>
                  
                  <td className="p-4 text-center font-bold text-green-500">
                    {totalSold > 0 ? `${totalSold}` : "-"}
                  </td>

                  <td className="p-4 text-center">
                    <span className={`font-black px-3 py-1 rounded-lg ${
                        item.stock <= 5 ? 'bg-red-900/30 text-red-500' : 'bg-gray-800 text-gray-300'
                    }`}>
                        {item.stock} Pcs
                    </span>
                  </td>

                  <td className="p-4 text-center font-black">
                    <span className="text-blue-400">{sisaBelumTerjual}</span>
                  </td>
                  
                  {/* KOLOM INDIKASI HILANG */}
                  <td className={`p-4 text-center font-black ${isMissing ? 'bg-red-900/20' : ''}`}>
                    {isMissing ? (
                      <div className="flex flex-col items-center">
                        <span className="text-red-500 text-lg animate-pulse">-{Math.abs(selisihKehilangan)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-700 text-xs">Aman</span>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    {isMissing ? (
                      <span className="text-[10px] bg-red-600 border border-red-400 text-white px-2 py-1 rounded font-black uppercase shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                        Cari tahu!
                      </span>
                    ) : item.stock <= 5 ? (
                      <span className="text-[10px] bg-red-900/50 text-red-500 px-2 py-1 rounded font-black uppercase">Low Stock</span>
                    ) : (
                      <span className="text-[10px] bg-green-600/20 text-green-500 px-2 py-1 rounded font-black uppercase">Healthy</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={`p-4 border-t ${totalBarangHilang > 0 ? 'bg-red-950/30 border-red-900/50' : 'bg-blue-900/10 border-gray-800'}`}>
          <p className={`text-[9px] italic text-center uppercase tracking-widest font-bold ${totalBarangHilang > 0 ? 'text-red-400' : 'text-blue-400'}`}>
            {totalBarangHilang > 0 
              ? `⚠️ SEGERA LAKUKAN AUDIT! Ada selisih antara sisa seharusnya dengan fisik di Live Inventory.`
              : `💡 Sisa (Seharusnya) = Restock dikurangi Terjual. Jika Live Inventory lebih kecil dari Sisa, berarti barang hilang.`}
          </p>
      </div>
    </div>
  );
}