import { signOut } from "next-auth/react";

export default function Header({ userRole, userNamaRP, vault, image }: any) {
  return (
    <header className="flex justify-between items-center p-6 border-b border-gray-800 bg-cardBg sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black italic tracking-wider">Y Luxury<span className="text-burgundy">Club</span></h1>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 bg-darkBg border border-gray-700 p-1.5 pr-4 rounded-full">
          <img src={image || ""} alt="Profile" className="w-9 h-9 rounded-full border border-burgundy" />
          <div className="text-left"><p className="text-xs font-bold uppercase leading-none">{userNamaRP}</p><p className="text-[10px] text-burgundyLight font-bold italic uppercase">{userRole}</p></div>
        </div>
        <button onClick={() => signOut()} className="text-gray-500 hover:text-white transition">✖</button>
      </div>
    </header>
  );
}