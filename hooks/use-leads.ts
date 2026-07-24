// hooks/use-leads.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

// Type definitions
export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: 'new' | 'hot' | 'warm' | 'cold' | 'proposal' | 'closed';
  interest?: string;
  source?: string;
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch leads dengan error handling dan fallback
  const fetchLeads = useCallback(async (searchTerm: string) => {
    try {
      let query = supabase.from('crm_leads').select('*');
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Tabel belum ada → gunakan dummy data
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.info('📋 Tabel crm_leads belum dibuat, menggunakan data dummy');
        } else {
          console.error('Error fetching leads:', error);
        }
        // Fallback dummy data
        setLeads([
          { id: '1', name: 'Budi Santoso', email: 'budi@email.com', phone: '08123456789', status: 'hot' },
          { id: '2', name: 'Siti Rahayu', email: 'siti@email.com', phone: '08198765432', status: 'warm' },
          { id: '3', name: 'Agus Wijaya', email: 'agus@email.com', phone: '08111222333', status: 'cold' },
        ]);
        setLoading(false);
        return;
      }

      setLeads(data || []);
    } catch (error) {
      console.warn('⚠️ Gagal fetch leads, menggunakan data dummy:', error);
      setLeads([
        { id: '1', name: 'Budi Santoso', email: 'budi@email.com', phone: '08123456789', status: 'hot' },
        { id: '2', name: 'Siti Rahayu', email: 'siti@email.com', phone: '08198765432', status: 'warm' },
        { id: '3', name: 'Agus Wijaya', email: 'agus@email.com', phone: '08111222333', status: 'cold' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Efek utama dengan debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads(search);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [search, fetchLeads]);

  // Initial fetch saat mount
  useEffect(() => {
    fetchLeads('');
  }, [fetchLeads]);

  return {
    leads,
    loading,
    search,
    setSearch,
    refetch: () => fetchLeads(search), // Manual refetch
  };
}