import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { Modules } from '@medusajs/utils';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { filename, mimeType } = (req.body ?? {}) as {
    filename?: string;
    mimeType?: string;
  };

  if (!filename) {
    return res.status(400).json({ error: 'filename is required.' });
  }

  const fileModuleService = req.scope.resolve(Modules.FILE);

  const upload = await fileModuleService.getUploadFileUrls({
    filename,
    mimeType: mimeType || 'application/pdf',
    access: 'public',
  });

  return res.status(200).json({
    upload_url: upload.url,
    file_key: upload.key,
  });
};
