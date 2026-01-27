import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IApiKeyModuleService } from '@medusajs/framework/types';
import { ApiKeyType, Modules } from '@medusajs/framework/utils';
import {
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const apiKeyModuleService: IApiKeyModuleService = req.scope.resolve(Modules.API_KEY);
    const salesChannelModuleService = req.scope.resolve(Modules.SALES_CHANNEL);
    const apiKeys = await apiKeyModuleService.listApiKeys();
    let defaultApiKey = apiKeys.find((apiKey) => apiKey.title === 'Webshop');
    const shouldLinkSalesChannel = !defaultApiKey;

    if (!defaultApiKey) {
      defaultApiKey = await apiKeyModuleService.createApiKeys({
        title: 'Webshop',
        type: ApiKeyType.PUBLISHABLE,
        created_by: 'system',
      });
    }

    if (shouldLinkSalesChannel) {
      let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
        name: "Default Sales Channel",
      });

      if (!defaultSalesChannel.length) {
        const { result: salesChannelResult } = await createSalesChannelsWorkflow(
          req.scope
        ).run({
          input: {
            salesChannelsData: [
              {
                name: "Default Sales Channel",
              },
            ],
          },
        });
        defaultSalesChannel = salesChannelResult;
      }

      if (defaultSalesChannel.length) {
        await linkSalesChannelsToApiKeyWorkflow(req.scope).run({
          input: {
            id: defaultApiKey.id,
            add: [defaultSalesChannel[0].id],
          },
        });
      }
    }

    res.json({ publishableApiKey: defaultApiKey.token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
