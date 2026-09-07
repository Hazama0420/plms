'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { CRMContact } from '@/types/crm.types';

import { useTranslation } from "@/lib/i18n/hooks";

interface LeadContactCardProps {
  contactId: string;
  leadId?: string;
}

export function LeadContactCard({ contactId, leadId }: LeadContactCardProps) {
  const { t } = useTranslation();
  const [contact, setContact] = useState<CRMContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContact() {
      if (!contactId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('crm_contacts')
          .select('*')
          .eq('id', contactId)
          .maybeSingle();

        if (dbError || !data) {
          setError(dbError?.message ?? 'Kontak tidak ditemukan');
          setContact(null);
        } else {
          setContact(data as CRMContact);
        }
      } catch (err) {
        setError("Gagal memuat data kontak");
        setContact(null);
      } finally {
        setLoading(false);
      }
    }

    fetchContact();
  }, [contactId, leadId]);

  if (loading) return <div className="text-xs text-muted-foreground animate-pulse">{t("crm.contactCard.loading")}</div>;
  if (error || !contact) return <div className="text-xs text-rose-500">{t("crm.contactCard.notFound")}</div>;

  return (
    <div className="p-3 border rounded-xl bg-card border-border shadow-2xs space-y-1 text-xs">
      <h3 className="font-bold text-sm text-foreground">{contact.full_name}</h3>
      <p className="text-muted-foreground">Email: {contact.email || '-'}</p>
      <p className="text-muted-foreground">
        {t("crm.contactCard.phone")} <span className="font-mono text-foreground font-semibold">{contact.phone || '-'}</span>
      </p>
      <p className="text-muted-foreground">
        {t("crm.contactCard.whatsapp")} <span className="font-mono text-foreground font-semibold">{contact.whatsapp || '-'}</span>
      </p>
    </div>
  );
}