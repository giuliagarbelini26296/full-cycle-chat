import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Env } from '../config/env.schema';
import { ReportsUnavailableError } from './report-errors';

export const reportObjectKey = (id: string) => `reports/${id}.pdf`;

@Injectable()
export class ReportsStorage {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private client(publicEndpoint = false): S3Client {
    const endpoint = this.config.get(
      publicEndpoint ? 'S3_PUBLIC_ENDPOINT' : 'S3_ENDPOINT',
      { infer: true },
    );
    const accessKeyId = this.config.get('S3_ACCESS_KEY_ID', { infer: true });
    const secretAccessKey = this.config.get('S3_SECRET_ACCESS_KEY', {
      infer: true,
    });
    if (!endpoint || !accessKeyId || !secretAccessKey)
      throw new ReportsUnavailableError();
    return new S3Client({
      endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      requestHandler: { requestTimeout: 3000, connectionTimeout: 1000 },
    });
  }

  async assertReady(id: string): Promise<void> {
    const client = this.client();
    try {
      const object = await client.send(
        new HeadObjectCommand({
          Bucket: this.config.get('S3_REPORTS_BUCKET', { infer: true }),
          Key: reportObjectKey(id),
        }),
      );
      if (object.ContentType !== 'application/pdf' || !object.ContentLength)
        throw new ReportsUnavailableError();
    } catch {
      throw new ReportsUnavailableError();
    } finally {
      client.destroy();
    }
  }

  async signedDownload(id: string): Promise<string> {
    const client = this.client(true);
    try {
      return await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: this.config.get('S3_REPORTS_BUCKET', { infer: true }),
          Key: reportObjectKey(id),
          ResponseContentDisposition:
            'attachment; filename="relatorio.pdf"',
        }),
        {
          expiresIn: this.config.get('REPORT_DOWNLOAD_TTL_SECONDS', {
            infer: true,
          }),
        },
      );
    } catch {
      throw new ReportsUnavailableError();
    } finally {
      client.destroy();
    }
  }
}
