'use client';

import { useEffect, useState } from 'react';
// import { getSecureCRMContactById } from '@/actions/crm-contacts.action';
import type { CRMContact } from '@/types/crm.types';

interface LeadContactCardProps {
  contactId: string;
  leadId?: string;
}

export function LeadContactCard({ contactId, leadId }: LeadContactCardProps) {
  const [contact, setContact] = useState<CRMContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContact() {
      setLoading(true);
      try {
        const res = await fetch(`/api/crm/contacts/${contactId}${leadId ? `?leadId=${leadId}` : ""}`);
        const json = res.ok ? await res.json() : null;
        if (!json || json.error) {
          setError(json?.error ?? "Gagal memuat data kontak");
        } else {
          setContact(json.data as CRMContact);
        }
      } catch (err) {
        setError("Gagal memuat data kontak");
      } finally {
        setLoading(false);
      }
    }

    if (contactId) {
      fetchContact();
    }
  }, [contactId, leadId]);

  if (loading) return <div className="text-xs text-muted-foreground animate-pulse">Memuat data kontak...</div>;
  if (error || !contact) return <div className="text-xs text-rose-500">Kontak tidak ditemukan.</div>;

  return (
    <div className="p-3 border rounded-xl bg-card border-border shadow-2xs space-y-1 text-xs">
      <h3 className="font-bold text-sm text-foreground">{contact.full_name}</h3>
      <p className="text-muted-foreground">Email: {contact.email || '-'}</p>
      <p className="text-muted-foreground">
        Telepon: <span className="font-mono text-foreground font-semibold">{contact.phone || '-'}</span>
      </p>
      <p className="text-muted-foreground">
        WhatsApp: <span className="font-mono text-foreground font-semibold">{contact.whatsapp || '-'}</span>
      </p>
    </div>
  );
}