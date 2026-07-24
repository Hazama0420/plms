// hooks/use-followups.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useFollowups() {
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowups = async () => {
      try {
        const { data, error } = await supabase
          .from('crm_followups')
          .select('*, lead:crm_leads(*)')
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: true })
          .limit(10);

        if (error) {
          // Jika tabel belum ada, log sebagai info bukan error
          if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
            console.info('📋 Tabel crm_followups belum dibuat, menggunakan data dummy');
          } else {
            console.error('Error fetching followups:', error);
          }
          // Gunakan dummy data
          setFollowups([
            {
              id: '1',
              lead: { name: 'Budi Santoso' },
              scheduled_at: new Date().toISOString(),
              note: 'Follow-up penawaran properti Citra Garden',
              status: 'pending',
            },
            {
              id: '2',
              lead: { name: 'Siti Rahayu' },
              scheduled_at: new Date(Date.now() + 3600000).toISOString(),
              note: 'Konfirmasi jadwal survey',
              status: 'pending',
            },
          ]);
          setLoading(false);
          return;
        }

        setFollowups(data || []);
      } catch (error) {
        console.warn('⚠️ Gagal fetch followups, menggunakan data dummy:', error);
        // Fallback dummy
        setFollowups([
          {
            id: '1',
            lead: { name: 'Budi Santoso' },
            scheduled_at: new Date().toISOString(),
            note: 'Follow-up penawaran properti Citra Garden',
            status: 'pending',
          },
          {
            id: '2',
            lead: { name: 'Siti Rahayu' },
            scheduled_at: new Date(Date.now() + 3600000).toISOString(),
            note: 'Konfirmasi jadwal survey',
            status: 'pending',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowups();
  }, []);

  return { followups, loading };
}