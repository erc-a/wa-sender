import { useState } from 'react';
import Navbar from './component/Navbar';
import SenderPage from './pages/SenderPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  const [currentView, setCurrentView] = useState('sender');

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#00509F] via-[#0073e6] to-[#e6f0ff] overflow-hidden">
      <div className="h-full flex flex-col">
        <header className="p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-center mb-6">
            Whatsapp Sender
          </h1>
          <Navbar activeView={currentView} onNavigate={setCurrentView} />
        </header>

        <main className="flex-1 overflow-auto px-4 pb-4">
          {currentView === 'sender' && <SenderPage />}
          {currentView === 'history' && <HistoryPage />}
        </main>
        
        <footer className="text-center p-4 text-[#00509F] text-sm font-medium">
          @ericarwido. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default App;