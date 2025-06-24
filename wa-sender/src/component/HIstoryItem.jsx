import React from 'react';

function HistoryItem({ item }) {
  const getStatusStyles = (status) => {
    switch (status) {
      case 'sent':
        return {
          border: 'border-l-[#25D366]',
          bg: 'bg-green-50',
          text: 'text-[#25D366]',
          bgButton: 'bg-[#25D366]',
          hoverButton: 'hover:bg-[#1EBE5D]'
        };
      case 'replied':
        return {
          border: 'border-l-[#00509F]',
          bg: 'bg-blue-50',
          text: 'text-[#00509F]',
          bgButton: 'bg-[#00509F]',
          hoverButton: 'hover:bg-[#003366]'
        };
      default:
        return {
          border: 'border-l-gray-400',
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          bgButton: 'bg-gray-500',
          hoverButton: 'hover:bg-gray-600'
        };
    }
  };

  const styles = getStatusStyles(item.status);
  const statusText = item.status === 'sent' ? 'Terkirim' : 'Dibalas';
  
  // Use created_at as the primary date field, then fall back to sent_at
  const formattedDate = new Date(item.created_at || item.sent_at).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`rounded-lg shadow-sm border-l-4 ${styles.border} ${styles.bg} overflow-hidden`}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{item.nama_nasabah}</h3>
                <p className="text-sm text-gray-600">{item.nomor_telepon}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.bg} ${styles.text}`}>
                {statusText}
              </span>
            </div>
            
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium">No. Rekening:</span> {item.no_rekening}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Tunggakan:</span> {formatCurrency(item.jumlah_tunggakan)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Skor Kredit:</span> {item.skor_kredit}
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-medium">Waktu:</span> {formattedDate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <a
              href={`https://wa.me/${item.nomor_telepon}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.bgButton} text-white text-sm py-2 px-4 rounded-lg ${styles.hoverButton} transition-colors inline-flex items-center gap-2 whitespace-nowrap`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.417 0-2.79-.327-4.021-.94l-2.801.836.836-2.801A7.977 7.977 0 015 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
              </svg>
              Buka Chat
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryItem;