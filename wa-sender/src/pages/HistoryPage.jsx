import { useState, useEffect, useCallback } from 'react';
import HistoryItem from '../component/HIstoryItem.jsx';
import { getMessageHistory } from '../service/api';

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'sent', 'replied'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest'
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);  
  const [dateFilter, setDateFilter] = useState('');
  const [stats, setStats] = useState({ todayCount: 0, totalCount: 0 });  // Create a debounced search term that only updates after a delay
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay
    
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);      
      
      const params = {
        page: currentPage,
        limit: 10,
        ...(filter !== 'all' && { status: filter }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(dateFilter && { date: dateFilter })
      };
      
      console.log('Fetching history with params:', params);
      const result = await getMessageHistory(params);
      
      console.log('History fetch result:', result);
      
      if (result.success) {
        setHistory(result.data || []);
        setTotalPages(result.pagination?.pages || 1);
        
        // Always update stats with the latest values from the server
        if (result.stats) {
          console.log('Updating stats:', result.stats);
          setStats({
            todayCount: result.stats.todayCount || 0,
            totalCount: result.stats.totalCount || 0
          });
        } else {
          setStats({ todayCount: 0, totalCount: 0 });
        }
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
  }, [currentPage, filter, debouncedSearchTerm, dateFilter]);
  // Fetch history data initially and then refresh stats periodically
  useEffect(() => {
    fetchHistory();
    
    // Refresh the stats every minute to keep the counters updated
    const statsInterval = setInterval(() => {
      console.log('Refreshing stats...');
      fetchHistory();
    }, 60000); // 60 seconds
    
    // Clear interval on component unmount
    return () => clearInterval(statsInterval);
  }, [fetchHistory]);
  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    console.log('Selected date:', selectedDate); // Log the selected date
    setDateFilter(selectedDate);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleClearDate = () => {
    setDateFilter('');
    setCurrentPage(1);
  };

  const filteredAndSortedHistory = () => {
    let result = [...history];

    // Filter berdasarkan status
    if (filter !== 'all') {
      result = result.filter(item => item.status === filter);
    }    // Filter berdasarkan pencarian - with improved multi-term search
    if (searchTerm) {
      const searchTerms = searchTerm.split(' ').filter(term => term.trim() !== '');
      
      if (searchTerms.length > 0) {
        // Apply all search terms (AND logic)
        result = result.filter(item => {
          // Check if all search terms match at least one field
          return searchTerms.every(term => {
            const searchLower = term.toLowerCase();
            
            // Convert numeric fields to strings for searching
            const tunggakanStr = item.jumlah_tunggakan?.toString() || '';
            const skorStr = item.skor_kredit?.toString() || '';
            
            return (
              (item.nama_nasabah || '').toLowerCase().includes(searchLower) ||
              (item.nomor_telepon || '').includes(searchLower) ||
              (item.no_rekening || '').includes(searchLower) ||
              tunggakanStr.includes(searchLower) ||
              skorStr.includes(searchLower)
            );
          });
        });
      }
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  };
  // Only show full-screen loading on initial load
  if (loading && history.length === 0) {
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
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur rounded-xl shadow-xl p-6 sm:p-8">        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#00509F]">Histori Pengiriman</h2>            <div className="mt-2 flex gap-4">
              <div className="bg-green-100 px-3 py-1 rounded-md">
                <span className="text-sm font-medium text-green-800">Hari Ini: {stats?.todayCount || 0}</span>
              </div>
              <div className="bg-blue-100 px-3 py-1 rounded-md">
                <span className="text-sm font-medium text-blue-800">Total: {stats?.totalCount || 0}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
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
            <div className="flex items-center">
              <input
                type="date"
                value={dateFilter}
                onChange={handleDateChange}
                className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#00509F] bg-white text-gray-700"
                style={{ width: '140px' }}
              />
              {dateFilter && (
                <button
                  onClick={handleClearDate}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  title="Clear date filter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>        <div className="flex mb-4">
          <div className="w-full relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan nama, nomor telepon, rekening, jumlah, atau skor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00509F] bg-white text-gray-900 placeholder-gray-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>        {error && (
          <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* Inline loading indicator for subsequent searches/filters */}
        {loading && history.length > 0 && (
          <div className="flex justify-center items-center py-3 mb-4">
            <div className="w-5 h-5 border-3 border-[#00509F] border-t-transparent rounded-full animate-spin mr-2"></div>
            <p className="text-sm text-[#00509F]">Memperbarui data...</p>
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