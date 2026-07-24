import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useDashboardStats() {
  const [stats, setStats] = useState<any>({
    revenue: 0,
    activeListings: 0,
    newLeads: 0,
    todaySchedule: 0,
    alerts: [],
    recentActivities: [],
    projects: [],
    financial: [],
    aiSummary: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Ambil data dari service atau langsung dari supabase
        // Contoh dummy data
        setStats({
          revenue: 125_000_000,
          revenueChange: 12.5,
          activeListings: 48,
          newLeads: 12,
          todaySchedule: 5,
          alerts: [
            {
              type: 'critical',
              title: 'Material Baja Menipis',
              description: 'Stok baja di gudang tinggal 15% dari kebutuhan proyek Citra Garden',
              details: { material: 'Baja', stock: '15%', project: 'Citra Garden' }
            },
            {
              type: 'warning',
              title: 'Invoice Jatuh Tempo',
              description: 'Tagihan PT Bangun Jaya senilai Rp 85.000.000 jatuh tempo 2 hari lagi',
              details: { vendor: 'PT Bangun Jaya', amount: 85_000_000, due: '2026-07-25' }
            }
          ],
          recentActivities: [
            { id: '1', user: 'Andi', action: 'Menambahkan properti baru', time: '10 menit lalu' },
            { id: '2', user: 'Budi', action: 'Mengupdate status lead', time: '25 menit lalu' },
          ],
          projects: [
            { id: '1', name: 'Citra Garden', progress: 65, status: 'active' },
            { id: '2', name: 'Permata Hijau', progress: 30, status: 'active' },
          ],
          financial: [
            { month: 'Jan', value: 80 },
            { month: 'Feb', value: 95 },
            { month: 'Mar', value: 70 },
            { month: 'Apr', value: 110 },
            { month: 'May', value: 125 },
            { month: 'Jun', value: 140 },
          ],
          aiSummary: 'Performa penjualan meningkat 12.5% bulan ini didorong oleh tingginya permintaan properti tipe menengah. Namun stok material untuk proyek Citra Garden perlu segera dipesan ulang untuk menghindari keterlambatan. Disarankan untuk fokus pada leads yang sudah memasuki tahap negosiasi untuk mempercepat konversi.',
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
}