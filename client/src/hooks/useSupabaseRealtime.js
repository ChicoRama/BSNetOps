import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export function useSupabaseRealtime(table, selectQuery = '*', options = {}) {
  const { orderBy = 'created_at', ascending = false, filter = null } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      let query = supabase.from(table).select(selectQuery);

      if (filter) query = filter(query);
      if (orderBy) query = query.order(orderBy, { ascending });

      const { data, error } = await query;
      if (error) throw error;

      setData(data || []);
    } catch (err) {
      console.error(`Gagal memuat data dari tabel "${table}":`, err.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [table, selectQuery, orderBy, ascending, filter]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => fetchData(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, table]);

  return { data, loading, refetch: () => fetchData(true) };
}