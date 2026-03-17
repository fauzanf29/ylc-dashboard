export default function StaffPanel(props: any) {
  if (!props.isCheckedIn && props.userRole === 'staff') {
    return (
      <div className="bg-[#0a0a0a] border border-gray-800/60 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-2xl min-h-[400px]">
        <div className="w-20 h-20 bg-burgundy/5 rounded-full flex items-center justify-center mb-6 border border-burgundy/20">
          <svg className="w-10 h-10 text-burgundyLight opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h2 className="text-2xl font-black italic uppercase mb-4 tracking-widest text-gray-200">Akses Terkunci</h2>
        <p className="text-gray-500 mb-8 text-xs uppercase tracking-widest">Silakan <strong className="text-burgundyLight">Check In</strong> untuk akses brankas.</p>
        <button onClick={props.handleAbsensi} className="bg-transparent border border-green-600/50 text-green-500 hover:bg-green-600 hover:text-white px-10 py-3.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300">Mulai Shift</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
      
      {/* ========================================== */}
      {/* 📦 KIRI: ETALASE PREMIUM (LUXURY UI) */}
      {/* ========================================== */}
      <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-800/60 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800/50 pb-5">
          <h3 className="text-xs text-gray-300 font-black flex items-center gap-4 uppercase tracking-[0.2em]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-burgundy opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Live Inventory
          </h3>
          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.2em]">
            YLC System v2.0
          </p>
        </div>
        
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
          {props.inventory.map((item: any, index: number) => {
            const stock = item.stock || 0;
            
            // Logika Indikator Elegan
            let dotColor = "bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]";
            let textColor = "text-green-400";
            let borderAccent = "border-t-green-500/20";

            if (stock <= 0) {
              dotColor = "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.8)]";
              textColor = "text-red-500";
              borderAccent = "border-t-red-500/50";
            } else if (stock <= 15) {
              dotColor = "bg-yellow-500 shadow-[0_0_10px_rgba(255,255,0,0.5)]";
              textColor = "text-yellow-400";
              borderAccent = "border-t-yellow-500/20";
            }

            return (
              <div key={index} className={`relative flex flex-col p-5 rounded-2xl bg-[#111] border border-gray-800/50 border-t-2 ${borderAccent} hover:border-gray-600 transition-all duration-300 group`}>
                
                {/* HEADER KOTAK: STOK & HARGA */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Sisa Stok</p>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                      <span className={`font-mono font-black text-lg leading-none ${textColor}`}>{stock}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Harga</p>
                    <p className="font-mono text-xs text-gray-400 leading-none">$ {item.price?.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                {/* NAMA BARANG TENGAN */}
                <div className="flex-grow flex items-center justify-center py-5 border-y border-gray-800/30 my-2">
                  <h4 className="font-black text-sm text-gray-200 uppercase tracking-widest text-center leading-relaxed">
                    {item.name}
                  </h4>
                </div>

                {/* TOMBOL PREMIUM */}
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => props.openInventoryModal(item.name, 'ambil', stock)} 
                    disabled={stock <= 0}
                    className={`flex-1 py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all duration-300 border ${
                      stock <= 0 
                        ? 'bg-transparent border-gray-800/50 text-gray-700 cursor-not-allowed' 
                        : 'bg-transparent border-burgundy/30 text-burgundyLight hover:bg-burgundy hover:border-burgundy hover:text-white'
                    }`}
                  >
                    Ambil
                  </button>
                  <button 
                    onClick={() => props.openInventoryModal(item.name, 'taruh', stock)} 
                    className="flex-1 py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all duration-300 bg-transparent border border-gray-800 hover:border-gray-400 text-gray-500 hover:text-gray-200"
                  >
                    Taruh
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================== */}
      {/* 📊 KANAN: KASIR ANALYTICS (DIBIKIN SENADA) */}
      {/* ========================================== */}
      <div className="bg-[#0a0a0a] border border-gray-800/60 rounded-3xl p-8 shadow-2xl flex flex-col h-full">
        <h3 className="text-xs text-gray-300 font-black mb-8 uppercase tracking-[0.2em] border-l-2 border-yellow-600 pl-4 py-1">
          Kasir Analytics
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#111] p-5 rounded-2xl border border-gray-800/50">
            <p className="text-[8px] text-gray-500 mb-2 uppercase font-bold tracking-widest">Sales (Wk)</p>
            <p className="text-lg font-black text-green-500">$ {props.totalSales.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-[#111] p-5 rounded-2xl border border-gray-800/50">
            <p className="text-[8px] text-gray-500 mb-2 uppercase font-bold tracking-widest">Shift (Wk)</p>
            <p className="text-lg font-mono font-bold text-burgundyLight">{props.totalHours.toFixed(2)} H</p>
          </div>
        </div>

        <div className="mb-8 p-5 bg-gradient-to-br from-yellow-900/10 to-transparent border border-yellow-900/20 rounded-2xl">
          <p className="text-[8px] text-yellow-600 mb-2 uppercase font-black tracking-widest">Sales Shift Ini</p>
          <p className="text-3xl font-black text-yellow-500 tracking-wider">$ {props.todaySales.toLocaleString('id-ID')}</p>
        </div>

        <div className="flex-1 min-h-[120px] mb-6">
          <p className="text-[8px] text-gray-500 mb-4 uppercase font-bold tracking-widest border-b border-gray-800/50 pb-3">Item Terjual</p>
          <ul className="space-y-3 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
            {props.todayItems.map((item: any, idx: number) => (
              <li key={idx} className="flex justify-between items-center border-b border-gray-800/30 pb-2">
                <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wider">{item.item}</span>
                <span className="font-mono text-xs text-yellow-600 font-black">x{item.qty}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-800/50">
          <p className="text-[8px] text-gray-500 mb-2 uppercase font-bold tracking-widest">Durasi Shift</p>
          <p className="text-xl font-mono font-black tracking-[0.2em] text-gray-300">{props.time}</p>
        </div>
      </div>

    </div>
  );
}