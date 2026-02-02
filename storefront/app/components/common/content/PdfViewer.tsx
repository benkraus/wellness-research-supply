import clsx from 'clsx';
import type { FC, HTMLAttributes } from 'react';
import { useEffect, useRef, useState } from 'react';

export interface PdfViewerProps extends HTMLAttributes<HTMLDivElement> {
  url: string;
}

export const PdfViewer: FC<PdfViewerProps> = ({ url, className, ...props }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderTokenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const renderToken = ++renderTokenRef.current;

    const renderPdf = async () => {
      setIsLoading(true);
      setError(null);

      const container = containerRef.current;
      if (!container) return;
      container.innerHTML = '';

      const [{ getDocument, GlobalWorkerOptions }, workerSrc] = await Promise.all([
        import('pdfjs-dist/legacy/build/pdf'),
        import('pdfjs-dist/legacy/build/pdf.worker?url'),
      ]);

      GlobalWorkerOptions.workerSrc = (workerSrc as { default?: string }).default ?? (workerSrc as string);

      const loadingTask = getDocument({ url });
      const pdf = await loadingTask.promise;

      if (cancelled || renderTokenRef.current !== renderToken) return;

      const firstPage = await pdf.getPage(1);
      const baseViewport = firstPage.getViewport({ scale: 1 });
      const targetWidth = container.clientWidth || baseViewport.width;
      const scale = targetWidth / baseViewport.width;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = 'w-full rounded-lg shadow-[0_12px_25px_rgba(15,23,42,0.18)] bg-white';
        container.appendChild(canvas);

        const renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (cancelled || renderTokenRef.current !== renderToken) return;
      }

      setIsLoading(false);
    };

    renderPdf().catch((err) => {
      console.error('Failed to render PDF', err);
      if (!cancelled) {
        setError('Unable to load PDF preview.');
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div {...props} className={clsx('w-full', className)}>
      {isLoading && <p className="text-sm text-primary-200">Loading PDF…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div ref={containerRef} className="space-y-6" />
    </div>
  );
};
