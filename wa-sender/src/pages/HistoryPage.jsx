import { useState, useEffect, useCallback } from 'react';
import HistoryItem from '../component/HIstoryItem.jsx';
import { getMessageHistory } from '../service/api';

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'sent', 'replied'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);      
      
      const params = {
        page: currentPage,
        limit: 10,
        ...(filter !== 'all' && { status: filter }),
        ...(searchTerm && { search: searchTerm })
      };
      
      console.log('Fetching history with params:', params);
      const result = await getMessageHistory(params);
      
      console.log('History fetch result:', result);
      
      if (result.success) {
        setHistory(result.data || []);
        setTotalPages(result.pagination?.pages || 1);
      } else {
        // Don't throw, handle gracefully
        setError(result.message || 'Failed to fetch history');
        setHistory([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error in fetchHistory:', err);
      setError('Connection error. Please check if the server is running.');
      setHistory([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, searchTerm]);  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredAndSortedHistory = () => {
    let result = [...history];

    // Filter berdasarkan status
    if (filter !== 'all') {
      result = result.filter(item => item.status === filter);
    }

    // Filter berdasarkan pencarian
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.phone.includes(searchTerm) ||
        item.noRekening.includes(searchTerm)
      );
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl p-8">
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 border-4 border-[#00509F] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#00509F] font-medium">Memuat histori...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center min-h-full">
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur rounded-xl shadow-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#00509F]">Histori Pengiriman</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#00509F] bg-white text-gray-700"
            >
              <option value="all">Semua Status</option>
              <option value="sent">Terkirim</option>
              <option value="replied">Dibalas</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#00509F] bg-white text-gray-700"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Cari berdasarkan nama, nomor telepon, atau rekening..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00509F] bg-white text-gray-900 placeholder-gray-500"
          />
        </div>        {error && (
          <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4 mt-6">
          {filteredAndSortedHistory().length > 0 ? (
            filteredAndSortedHistory().map(item => <HistoryItem key={item.id} item={item} />)
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada data yang ditemukan.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded bg-[#00509F] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded bg-[#00509F] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;