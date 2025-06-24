import { useState, useEffect, useRef, useCallback } from 'react';
import { sendMessage, getQRCode, getWhatsAppStatus } from '../service/api';

// BRI Logo as base64 image (can be replaced with a real asset path)
const BRI_LOGO = "data:image/png;base64,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";

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

  // Notification component
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Function to check WhatsApp status immediately
  const checkWhatsAppStatusNow = useCallback(async (forceRefresh = false) => {
    try {
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
        // WhatsApp is ready - clear QR code and error
        setQrCode(null);
        setError(null);
      } else {
        // WhatsApp not ready - check for QR code
        if (response?.qrCode) {
          setLastQrRefresh(Date.now());
          setQrCode(response.qrCode);
          setError(null);
        } else {
          // No QR code in status response, try fallback
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
            } else if (response?.isInitializing || response?.message?.includes('Initializing')) {
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
      }
    } catch (err) {
      console.error('Error checking WhatsApp status:', err);
      if (isComponentMounted.current) {
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
    // Set mounted to true when effect runs
    isComponentMounted.current = true;

    const pollStatus = () => {
      if (!isComponentMounted.current) return;
      checkWhatsAppStatusNow();
      pollingTimeoutRef.current = setTimeout(pollStatus, pollingInterval);
    };

    pollStatus();

    // Cleanup function
    return () => {
      isComponentMounted.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
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

    try {
      console.log('Form data:', formData); // Debug log

      // Validate required fields - menggunakan nama field yang benar
      if (!formData.namaNasabah || !formData.nomorTelepon || !formData.jumlahTunggakan || !formData.noRekening || !formData.skorKredit) {
        const missingFields = [];
        if (!formData.namaNasabah) missingFields.push('Nama Nasabah');
        if (!formData.nomorTelepon) missingFields.push('Nomor Telepon');
        if (!formData.noRekening) missingFields.push('No. Rekening');
        if (!formData.jumlahTunggakan) missingFields.push('Jumlah Tunggakan');
        if (!formData.skorKredit) missingFields.push('Status Skor Kredit');
        
        const errorMessage = `Field berikut harus diisi: ${missingFields.join(', ')}`;
        setError(errorMessage);
        showNotification(errorMessage, 'error');
        return;
      }

      // Validate and format phone number
      let phoneNumber = formData.nomorTelepon.trim();
      
      // Remove all non-digit characters except + at the beginning
      phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      // Remove + if present
      if (phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.substring(1);
      }
      
      // Validate phone number format
      if (phoneNumber.startsWith('0')) {
        // Indonesian format starting with 0
        if (phoneNumber.length < 10 || phoneNumber.length > 13) {
          const errorMessage = 'Nomor telepon tidak valid. Gunakan format: 08xxxxxxxxx';
          setError(errorMessage);
          showNotification(errorMessage, 'error');
          return;
        }
      } else if (phoneNumber.startsWith('62')) {
        // Indonesian format with country code
        if (phoneNumber.length < 11 || phoneNumber.length > 15) {
          const errorMessage = 'Nomor telepon tidak valid. Gunakan format: 628xxxxxxxxx';
          setError(errorMessage);
          showNotification(errorMessage, 'error');
          return;
        }
      } else {
        const errorMessage = 'Nomor telepon harus dimulai dengan 08 atau +62';
        setError(errorMessage);
        showNotification(errorMessage, 'error');
        return;
      }

      // Validate amount
      if (!formData.jumlahTunggakan || parseInt(formData.jumlahTunggakan) <= 0) {
        const errorMessage = 'Jumlah tunggakan harus lebih dari 0';
        setError(errorMessage);
        showNotification(errorMessage, 'error');
        return;
      }

      // Format currency
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR'
      }).format(parseInt(formData.jumlahTunggakan));

      // Get credit status
      const creditStatus = creditScores.find(score => score.score === parseInt(formData.skorKredit))?.status || 'Tidak diketahui';

      // Create message preview
      const message = `Nasabah Kartu Kredit BRI Yth,

Dinformasikan bahwa  Kartu Kredit BRI Bapak/Ibu telah  masuk kolektibilitas *${creditStatus}* pada SLIK OJK dengan keterangan sebagai berikut: 

Nama Nasabah : *${formData.namaNasabah}*
No Kartu : ${formData.noRekening}
Jumlah Tagihan : ${formattedAmount} (${creditStatus})

Dapatkan segera program keringanan khusus di bulan Juni 2025:

1.	Lunas diskon*
      *Surat lunas di terbitkan 1 hari 
      *Cleansing slik OJK segera 
      *Kartu di tutup permanent
      *Jika ingin melakukan pinjaman       
       atau kredit KPR sudah bisa di
       realisasikan 
*Syarat dan ketentuan berlaku
Ajukan program keringanan melalui 
hubungi 085609553363
Tagihan akan diserahkan kepihak Debcollector bila tidak ada kejelasan

Terima kasih, selamat beraktifitas dan selalu jaga kesehatan
Info lebih lanjut, hubungi Contact BRI 150017`;      // Show confirmation dialog with improved format
      const confirmMessage = `KONFIRMASI PENGIRIMAN PESAN

Anda akan mengirim pesan ke:
• Nama Nasabah: ${formData.namaNasabah}
• Nomor WhatsApp: ${phoneNumber}
• No. Kartu: ${formData.noRekening}
• Jumlah Tagihan: ${formattedAmount}
• Status: ${creditStatus}

Apakah Anda yakin ingin mengirim pesan ini?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      setLoading(true);

      console.log('Sending message to:', phoneNumber);
      console.log('Message:', message);

      // Make sure we're sending the right format
      const messageData = {
        to: phoneNumber,
        message: message
      };
        console.log('Message data to send:', messageData); // Debug log

      // Pass all form data to sendMessage for better database storage
      const result = await sendMessage(phoneNumber, message, {
        nama_nasabah: formData.namaNasabah,
        no_rekening: formData.noRekening,
        jumlah_tunggakan: parseInt(formData.jumlahTunggakan),
        skor_kredit: parseInt(formData.skorKredit)
      });
      
      if (result.success) {
        const successMessage = 'Pesan berhasil dikirim!';
        showNotification(successMessage, 'success');
        // Reset form
        setFormData({
          namaNasabah: '',
          nomorTelepon: '',
          noRekening: '',
          skorKredit: '',
          jumlahTunggakan: ''
        });
      } else {
        const errorMessage = result.message || 'Gagal mengirim pesan';
        setError(errorMessage);
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error.message || 'Terjadi kesalahan saat mengirim pesan';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
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
      {/* Notification Popup */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-sm">{notification.message}</p>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}      <div className="w-full max-w-2xl bg-white/95 backdrop-blur rounded-xl shadow-xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#00509F] text-center">
            Formulir Pengiriman Pesan
          </h2>
        </div>

        {/* WhatsApp Status */}
        <div className="mb-6">
          <div className={`p-4 rounded-lg ${isWhatsAppReady ? 'bg-green-100 border-green-500' : 'bg-yellow-100 border-yellow-500'} border`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${isWhatsAppReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <p className={`font-medium ${isWhatsAppReady ? 'text-green-800' : 'text-yellow-800'}`}>
                Status WhatsApp: {isWhatsAppReady ? 'Terhubung dan Siap' : 'Belum Terhubung'}
              </p>
            </div>
            {isWhatsAppReady && (
              <p className="text-green-600 text-sm mt-1">
                WhatsApp sudah terhubung. Anda dapat mengirim pesan sekarang.
              </p>
            )}
          </div>
        </div>

        {/* QR Code Display - Only show when not ready */}
        {!isWhatsAppReady && !(error && error.includes('server')) && (
          <div className="mb-6">
            <p className="text-sm text-center mb-2">Scan QR Code untuk menghubungkan WhatsApp</p>
            {qrCode ? (
              <>
                <div className="flex justify-center">
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-48 h-48"
                    key={`qr-${lastQrRefresh}`}
                    onError={(e) => {
                      console.error('QR image loading error:', e);
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
              <div className="flex justify-center items-center h-48 bg-gray-100 rounded">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Memuat QR Code...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <p>{error}</p>
          </div>
        )}

        {/* Form - Only show when WhatsApp is ready */}
        {isWhatsAppReady && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="namaNasabah" className={labelClassName}>Nama Nasabah *</label>
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
                <label htmlFor="nomorTelepon" className={labelClassName}>
                  Nomor Telepon WhatsApp *
                </label>
                <input
                  type="tel"
                  id="nomorTelepon"
                  value={formData.nomorTelepon}
                  onChange={handleInputChange}
                  className={inputClassName}
                  placeholder="08123456789 atau +628123456789"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: 08xxxxxxxxx atau +628xxxxxxxxx
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="noRekening" className={labelClassName}>No. Rekening *</label>
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
                <label htmlFor="jumlahTunggakan" className={labelClassName}>Jumlah Tunggakan *</label>
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
              <label htmlFor="skorKredit" className={labelClassName}>Status Skor Kredit *</label>
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
            </div>            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-[#00509F] text-white py-3 px-8 rounded-lg hover:bg-[#003366] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00509F] shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 disabled:hover:shadow-lg"
                disabled={loading || !isWhatsAppReady}
              >
                {loading ? 'Mengirim...' : 'Kirim Pesan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SenderPage;