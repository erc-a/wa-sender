function Navbar({ onNavigate, activeView }) {  const linkStyles = "cursor-pointer py-2 px-6 rounded-full transition-all duration-200 font-medium text-base";
  const activeStyles = "bg-white text-[#00509F] shadow-lg";
  const inactiveStyles = "text-white hover:bg-[#00509F]/20";

  return (    <nav className="max-w-md mx-auto bg-[#00509F]/10 backdrop-blur rounded-full p-1.5 flex justify-center items-center space-x-2">
      <a
        onClick={() => onNavigate('sender')}
        className={`${linkStyles} ${activeView === 'sender' ? activeStyles : inactiveStyles}`}
      >
        Kirim Pesan
      </a>
      <a
        onClick={() => onNavigate('history')}
        className={`${linkStyles} ${activeView === 'history' ? activeStyles : inactiveStyles}`}
      >
        Histori
      </a>
    </nav>
  );
}

export default Navbar;