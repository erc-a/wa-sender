import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendMessage, getQRCode, getWhatsAppStatus } from '../service/api';

function SenderPage() {
  const [formData, setFormData] = useState({
    namaNasabah: '',
    nomorTelepon: '',
    noRekening: '',
    jumlahTunggakan: '',
    skorKredit: ''
  });
  const [qrCode, setQrCode] = useState(null);
  const [isWhatsAppReady, setIsWhatsAppReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrRefreshClicked, setQrRefreshClicked] = useState(false);
  const [lastQrRefresh, setLastQrRefresh] = useState(Date.now());
  const [pollingInterval, setPollingInterval] = useState(2000);
  const [connectionErrorCount, setConnectionErrorCount] = useState(0);
  
  const pollingTimeoutRef = useRef(null);
  const isComponentMounted = useRef(true);

  // Function to check WhatsApp status immediately
  const checkWhatsAppStatusNow = useCallback(async (forceRefresh = false) => {
    if (!isComponentMounted.current) return;

    try {
      console.log('Checking WhatsApp status now...');
      const response = await getWhatsAppStatus();
      
      if (!isComponentMounted.current) return;

      // Handle connection error specially
      if (response?.isConnectionError) {
        setQrCode(null);
        setError(response.message || 'Tidak dapat terhubung ke server backend. Pastikan server berjalan.');
        setConnectionErrorCount(prev => prev + 1);
        
        // After 3 consecutive connection errors, slow down polling
        if (connectionErrorCount >= 2) {
          setPollingInterval(10000);
        }
        return;
      } else {
        // Reset connection error count and restore normal polling
        if (connectionErrorCount > 0) {
          setConnectionErrorCount(0);
          setPollingInterval(2000);
        }
      }

      setIsWhatsAppReady(response?.isReady || false);
      if (response?.isReady) {
        setQrCode(null);
        setError(null);
      } else {
        try {
          const qrResponse = await getQRCode(forceRefresh);
          
          if (!isComponentMounted.current) return;

          if (qrResponse?.isConnectionError) {
            setQrCode(null);
            setError(qrResponse.message || 'Tidak dapat terhubung ke server backend. Pastikan server berjalan.');
            return;
          }

          if (qrResponse?.qr) {
            setLastQrRefresh(Date.now());
            setQrCode(qrResponse.qr);
            setError(null);
          } else if (response?.isInitializing) {
            setError('Menginialisasi WhatsApp, harap tunggu sebentar...');
          } else {
            setError('Menunggu QR code. Harap tunggu sebentar...');
          }
        } catch (err) {
          if (isComponentMounted.current) {
            console.error('Error getting QR code:', err);
            setError('Gagal mendapatkan QR code. Silakan coba lagi.');
          }
        }
      }
    } catch (err) {
      if (isComponentMounted.current) {
        console.error('Error checking WhatsApp status:', err);
        setError('Gagal memeriksa status WhatsApp. Silakan coba lagi.');
      }
    }
  }, [connectionErrorCount]);

  // Function to manually refresh QR code
  const handleRefreshQR = useCallback(async () => {
    if (qrRefreshClicked) return;
    
    setQrRefreshClicked(true);
    setQrCode(null);
    setError('Memperbarui QR code...');
    const newTimestamp = Date.now();
    setLastQrRefresh(newTimestamp);

    try {
      const response = await getQRCode(true, true);

      if (response.refreshing) {
        console.log('QR code refresh initiated, waiting for new QR...');
        if (isComponentMounted.current) {
          setTimeout(() => {
            if (isComponentMounted.current) {
              checkWhatsAppStatusNow(true);
            }
          }, 5000);
        }
      }
    } catch (err) {
      if (isComponentMounted.current) {
        console.error('Error refreshing QR:', err);
        setError('Gagal memperbarui QR code. Silakan coba lagi.');
      }
    } finally {
      if (isComponentMounted.current) {
        setTimeout(() => {
          if (isComponentMounted.current) {
            setQrRefreshClicked(false);
          }
        }, 6000);
      }
    }
  }, [qrRefreshClicked, checkWhatsAppStatusNow]);

  // Setup polling effect
  useEffect(() => {
    if (!isComponentMounted.current) return;

    const pollStatus = () => {
      checkWhatsAppStatusNow();
      pollingTimeoutRef.current = setTimeout(pollStatus, pollingInterval);
    };

    pollStatus();

    // Cleanup function
    return () => {
      isComponentMounted.current = false;
      if (pollingTimeoutRef.current) {
        const timeoutId = pollingTimeoutRef.current;
        clearTimeout(timeoutId);
      }
    };
  }, [pollingInterval, checkWhatsAppStatusNow]);

  const creditScores = [
    { score: 1, status: 'Kredit Lancar' },
    { score: 2, status: 'Kredit DPK (Dalam Perhatian Khusus)' },
    { score: 3, status: 'Kredit Tidak Lancar' },
    { score: 4, status: 'Kredit Diragukan' },
    { score: 5, status: 'Kredit Macet' }
  ];

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleJumlahChange = (e) => {
    // Only allow numbers and format the number
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, jumlahTunggakan: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!isWhatsAppReady) {
        throw new Error('WhatsApp belum terhubung. Silakan scan QR code terlebih dahulu.');
      }

      const result = await sendMessage(formData);
      if (result.success) {
        alert('Pesan berhasil dikirim!');
        setFormData({
          namaNasabah: '',
          nomorTelepon: '',
          noRekening: '',
          jumlahTunggakan: '',
          skorKredit: ''
        });
      } else {
        throw new Error(result.message || 'Gagal mengirim pesan');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function for complete reset of WhatsApp connection
  const handleFullReset = async () => {
    if (window.confirm('Reset total akan memutuskan koneksi WhatsApp dan menghapus semua data sesi. Yakin ingin melanjutkan?')) {
      setQrRefreshClicked(true);
      setQrCode(null);
      setError('Melakukan reset total. Mohon tunggu...');
      setLastQrRefresh(Date.now());

      try {
        // Hard reset with clear session - most aggressive refresh possible
        const response = await getQRCode(true, true);

        console.log('Full reset response:', response);

        // Wait longer for full reset to complete
        setTimeout(() => {
          checkWhatsAppStatusNow(true);
        }, 8000);
      } catch (err) {
        console.error('Error during full reset:', err);
        setError('Gagal melakukan reset total. Silakan coba lagi atau muat ulang halaman.');
      } finally {
        setTimeout(() => {
          setQrRefreshClicked(false);
        }, 10000); // Longer timeout for full reset
      }
    }
  };

  const inputClassName = "block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00509F] focus:border-[#00509F] bg-white text-gray-900";
  const labelClassName = "block text-sm font-medium text-gray-700 mb-1";
  return (
    <div className="flex items-center justify-center min-h-full">
      <div className="w-full max-w-2xl bg-white/95 backdrop-blur rounded-xl shadow-xl p-6 sm:p-8">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-[#00509F] text-center">
          Formulir Pengiriman Pesan
        </h2>

        {/* WhatsApp Status */}
        <div className="mb-6 text-center">
          <p className={`text-sm font-medium ${isWhatsAppReady ? 'text-green-600' : 'text-yellow-600'}`}>
            Status WhatsApp: {isWhatsAppReady ? 'Terhubung' : 'Menunggu koneksi'}
          </p>
        </div>
        {/* QR Code Display */}
        {!isWhatsAppReady && !(error && error.includes('server')) && (
          <div className="mb-6">
            <p className="text-sm text-center mb-2">Scan QR Code untuk menghubungkan WhatsApp</p>
            {qrCode ? (
              <>
                <div className="flex justify-center">
                  {/* Use key prop to force React to completely recreate the element when QR changes */}
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-48 h-48"
                    key={`qr-${lastQrRefresh}`}
                    onError={(e) => {
                      console.error('QR image loading error:', e);
                      // Retry loading the image if there's an error
                      setTimeout(() => setLastQrRefresh(Date.now()), 1000);
                    }}
                  />
                </div>
                <div className="flex justify-center mt-2 gap-2">
                  <button
                    onClick={handleRefreshQR}
                    disabled={qrRefreshClicked}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-blue-300"
                  >
                    {qrRefreshClicked ? 'Memperbarui...' : 'Perbarui QR Code'}
                  </button>
                  <button
                    onClick={handleFullReset}
                    disabled={qrRefreshClicked}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:bg-red-300"
                    title="Reset ulang koneksi WhatsApp sepenuhnya"
                  >
                    Reset Total
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-center items-center" style={{ height: '12rem' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Connection Error Display */}
        {error && error.includes('server') && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p><strong>Error Koneksi:</strong> {error}</p>
            </div>
            <div className="mt-3">
              <p className="text-sm">Langkah troubleshooting:</p>
              <ol className="list-decimal pl-5 text-sm mt-1">
                <li>Pastikan server backend berjalan di port 5000</li>
                <li>Coba restart server backend</li>
                <li>Periksa apakah ada error di terminal server</li>
              </ol>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Refresh Halaman
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="namaNasabah" className={labelClassName}>Nama Nasabah</label>
              <input
                type="text"
                id="namaNasabah"
                value={formData.namaNasabah}
                onChange={handleInputChange}
                className={inputClassName}
                required
              />
            </div>
            <div>
              <label htmlFor="nomorTelepon" className={labelClassName}>Nomor Telepon (cth: 62812...)</label>
              <input
                type="text"
                id="nomorTelepon"
                value={formData.nomorTelepon}
                onChange={handleInputChange}
                className={inputClassName}
                required
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="noRekening" className={labelClassName}>No. Rekening</label>
              <input
                type="text"
                id="noRekening"
                value={formData.noRekening}
                onChange={handleInputChange}
                className={inputClassName}
                required
              />
            </div>
            <div>
              <label htmlFor="jumlahTunggakan" className={labelClassName}>Jumlah Tunggakan</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                id="jumlahTunggakan"
                value={formData.jumlahTunggakan}
                onChange={handleJumlahChange}
                placeholder="Masukkan angka tanpa titik atau koma"
                className={inputClassName}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="skorKredit" className={labelClassName}>Status Skor Kredit</label>
            <select
              id="skorKredit"
              value={formData.skorKredit}
              onChange={handleInputChange}
              className={inputClassName}
              required
            >
              <option value="">Pilih status skor kredit</option>
              {creditScores.map((score) => (
                <option key={score.score} value={score.score}>
                  {score.score} - {score.status}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              className="w-full bg-[#00509F] text-white py-3 px-8 rounded-lg hover:bg-[#003366] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00509F] shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 disabled:hover:shadow-lg"
              disabled={loading || !isWhatsAppReady}
            >
              {loading ? 'Mengirim...' : 'Kirim Pesan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SenderPage;