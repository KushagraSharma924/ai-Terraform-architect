'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { exportApi } from '@/lib/api/export.api';
import { toast } from 'sonner';
import { Download, Package, RotateCcw, Loader2 } from 'lucide-react';

/**
 * Phase 5 — export (zip) + download + rollback actions for a Terraform version.
 * Polls the async artifact build, then surfaces a download link.
 */
export function VersionActions({ versionId, onRollback }: { versionId: string; onRollback?: () => void }) {
  const [artifactId, setArtifactId] = useState<string | null>(null);

  const exportZip = useMutation({
    mutationFn: async () => {
      const { artifactId } = await exportApi.requestExport(versionId, 'zip');
      // Poll until ready (artifacts build asynchronously).
      for (let i = 0; i < 20; i++) {
        const a = await exportApi.getArtifact(artifactId);
        if (a.status === 'ready') return a;
        if (a.status === 'failed') throw new Error('Export failed');
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error('Export timed out');
    },
    onSuccess: (a) => {
      setArtifactId(a.id);
      toast.success('ZIP ready');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Export failed'),
  });

  const rollback = useMutation({
    mutationFn: () => exportApi.rollback(versionId),
    onSuccess: () => {
      toast.success('Rolled back — a new version was created');
      onRollback?.();
    },
    onError: () => toast.error('Rollback failed'),
  });

  return (
    <div className="flex items-center gap-2">
      {artifactId ? (
        <a href={exportApi.downloadUrl(artifactId)} target="_blank" rel="noreferrer">
          <Button variant="outline" className="text-xs py-1.5">
            <Download className="h-4 w-4 mr-1.5" /> Download ZIP
          </Button>
        </a>
      ) : (
        <Button variant="outline" onClick={() => exportZip.mutate()} disabled={exportZip.isPending} className="text-xs py-1.5">
          {exportZip.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Package className="h-4 w-4 mr-1.5" />}
          Export ZIP
        </Button>
      )}
      <Button variant="outline" onClick={() => rollback.mutate()} disabled={rollback.isPending} className="text-xs py-1.5">
        <RotateCcw className="h-4 w-4 mr-1.5" /> Rollback to this
      </Button>
    </div>
  );
}
