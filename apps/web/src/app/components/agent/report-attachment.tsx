"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportPayload } from 'chat-events';
import { Button } from '@/app/components/ui/button';

// A ação tipada é separada do AgentText: o texto do modelo nunca vira URL de download.
export function ReportAttachment({report}: {report: ReportPayload}) {
  const router = useRouter();
  const [isDownloading,setDownloading] = useState(false);
  const [error,setError] = useState<string | null>(null);
  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(report.id)}/download`,{cache:'no-store'});
      if (response.status === 401) {router.push('/api/session/expired');return;}
      if (!response.ok) {
        setError(response.status === 403 ? 'Seu acesso a este relatório não está liberado.' : response.status === 409 ? 'Este relatório não está disponível. Faça um novo pedido.' : 'Não foi possível baixar o relatório agora. Tente novamente.');
        return;
      }
      const data = await response.json() as {url?:string};
      if (typeof data.url !== 'string' || !/^https?:\/\//.test(data.url)) throw new Error('Download indisponível.');
      window.location.assign(data.url);
    } catch {setError('Não foi possível baixar o relatório agora. Tente novamente.');}
    finally {setDownloading(false);}
  }
  if (report.status === 'failed') return null;
  return <div className="mt-2 flex flex-col items-start gap-2">
    <Button size="sm" variant="secondary" disabled={report.status !== 'ready'} loading={isDownloading} onClick={download}>
      {report.status === 'queued' ? 'PDF na fila' : 'Baixar relatório PDF'}
    </Button>
    {error && <p role="alert" className="text-caption text-danger">{error}</p>}
  </div>;
}
