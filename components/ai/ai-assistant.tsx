'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIAssistantProps {
  type: 'title' | 'description';
  prompt: string;
  onGenerated: (text: string) => void;
  disabled?: boolean;
}

export function AIAssistant({ type, prompt, onGenerated, disabled }: AIAssistantProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Mohon isi detail properti terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal generate');
      }

      onGenerated(data.result);
      toast.success(`${type === 'title' ? 'Judul' : 'Deskripsi'} berhasil dibuat!`);
    } catch (error: any) {
      toast.error(error.message || 'Gagal generate AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={disabled || loading || !prompt.trim()}
      className="gap-2 border-dashed"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Sparkles size={14} />
      )}
      {loading ? 'Generating...' : 'AI Generate'}
    </Button>
  );
}