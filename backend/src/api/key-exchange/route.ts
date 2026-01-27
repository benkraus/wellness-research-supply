import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IApiKeyModuleService } from '@medusajs/framework/types';
import { ApiKeyType, Modules } from '@medusajs/framework/utils';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const apiKeyModuleService: IApiKeyModuleService = req.scope.resolve(Modules.API_KEY);
    const apiKeys = await apiKeyModuleService.listApiKeys();
    let defaultApiKey = apiKeys.find((apiKey) => apiKey.title === 'Webshop');

    if (!defaultApiKey) {
      defaultApiKey = await apiKeyModuleService.createApiKeys({
        title: 'Webshop',
        type: ApiKeyType.PUBLISHABLE,
        created_by: 'system',
      });
    }

    res.json({ publishableApiKey: defaultApiKey.token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
