import { getReportDownload } from '@/app/services/chat-api';
import { readSessionToken } from '@/app/services/session-cookie';

export async function GET(_request: Request, {params}: RouteContext<'/api/reports/[id]/download'>) {
  const headers = {'Cache-Control':'private, no-store'};
  const token = await readSessionToken();
  if (!token) return Response.json({kind:'unauthenticated'},{status:401,headers});
  const result = await getReportDownload(token,(await params).id);
  const status = result.kind === 'ok' ? 200 : result.kind === 'unauthenticated' ? 401 : result.kind === 'forbidden' ? 403 : result.kind === 'not_found' ? 404 : result.kind === 'not_ready' ? 409 : 503;
  return Response.json(result,{status,headers});
}
