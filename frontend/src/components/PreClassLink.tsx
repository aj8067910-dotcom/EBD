import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Card, useToast } from '../ui/index.js';

/** Copyable pre-class link + QR code for the Just-in-Time Teaching form. */
export function PreClassLink({
  lessonId,
  token,
}: {
  lessonId: string;
  token: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/preclass/${token}?lesson=${lessonId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copiado', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Não foi possível copiar', 'error');
    }
  };

  return (
    <Card className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <QRCodeSVG value={url} size={96} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">Link de pré-aula</p>
        <p className="truncate text-xs text-muted">{url}</p>
      </div>
      <Button variant="secondary" onClick={copy}>
        {copied ? 'Copiado ✓' : 'Copiar'}
      </Button>
    </Card>
  );
}
