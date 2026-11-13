import { readFile } from 'node:fs/promises';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { API } from './chat-api';

// Arranjo do teste nas fronteiras reais. O Worker/ARQ é exercitado na integração Python.
const storage = () => new S3Client({endpoint:'http://s3:8333',region:'us-east-1',forcePathStyle:true,credentials:{accessKeyId:'fullcycle',secretAccessKey:'fullcycle-secret'}});

export async function startReport(id: string) {
  const response = await fetch(`${API}/bot/requests/${id}/report`,{method:'POST',headers:{Authorization:`Bearer ${process.env.CHAT_BOT_TOKEN}`}});
  if (!response.ok) throw new Error(`Início de relatório recusado: ${response.status}`);
}

export async function readyReport(id: string) {
  const client = storage();
  try {
    await client.send(new PutObjectCommand({Bucket:'reports',Key:`digitaly/${id}.pdf`,Body:await readFile('e2e/fixtures/relatorio-ficticio.pdf'),ContentType:'application/pdf',ACL:'private'}));
  } finally {client.destroy();}
  const response = await fetch(`${API}/worker/reports/${id}/complete`,{method:'POST',headers:{Authorization:`Bearer ${process.env.CHAT_WORKER_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({status:'ready'})});
  if (!response.ok) throw new Error(`Entrega de relatório recusada: ${response.status}`);
}

export async function removeReportFile(id: string) {
  const client = storage();
  try {await client.send(new DeleteObjectCommand({Bucket:'reports',Key:`digitaly/${id}.pdf` }));}
  finally {client.destroy();}
}
