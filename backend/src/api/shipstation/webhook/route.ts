import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';
import type { IFulfillmentModuleService, IOrderModuleService } from '@medusajs/framework/types';

import { SHIPSTATION_API_KEY } from '../../../lib/constants';
import { ShipStationClient } from '../../../modules/shipstation/client';
import type { Label, Shipment } from '../../../modules/shipstation/types';

type ShipStationWebhookPayload = {
  event?: string;
  resource_url?: string;
  resource_id?: string;
  shipment_id?: string;
  label_id?: string;
  tracking_number?: string;
  tracking_status?: string;
  shipment_status?: string;
  ship_date?: string;
  shipped_at?: string;
  status?: string;
  [key: string]: unknown;
};

const parseResourceId = (resourceUrl?: string, segment?: string) => {
  if (!resourceUrl || !segment) return undefined;
  const match = resourceUrl.match(new RegExp(`/${segment}/([^/?#]+)`));
  return match?.[1];
};

const coerceDate = (value?: string | Date | null) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const mergeTrackingEntries = (
  existing: Array<Record<string, unknown>>,
  nextEntry: Record<string, unknown>,
) => {
  const trackingNumber = nextEntry.tracking_number as string | undefined;
  const labelId = nextEntry.label_id as string | undefined;
  const shipmentId = nextEntry.shipment_id as string | undefined;
  const index = existing.findIndex((entry) => {
    return (
      (trackingNumber && entry.tracking_number === trackingNumber) ||
      (labelId && entry.label_id === labelId) ||
      (shipmentId && entry.shipment_id === shipmentId)
    );
  });

  if (index >= 0) {
    return existing.map((entry, idx) => (idx === index ? { ...entry, ...nextEntry } : entry));
  }

  return [...existing, nextEntry];
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = (req.body ?? {}) as ShipStationWebhookPayload;

  if (!SHIPSTATION_API_KEY) {
    return res.status(500).json({ error: 'ShipStation API key is not configured.' });
  }

  const event = payload.event ?? (payload.event_type as string | undefined);
  const shipmentId =
    payload.shipment_id ||
    (payload.shipmentId as string | undefined) ||
    parseResourceId(payload.resource_url, 'shipments') ||
    (payload.resource_id as string | undefined);
  const labelId =
    payload.label_id ||
    (payload.labelId as string | undefined) ||
    parseResourceId(payload.resource_url, 'labels');
  const trackingNumber = payload.tracking_number || (payload.trackingNumber as string | undefined);

  if (!shipmentId && !labelId && !trackingNumber) {
    return res.status(202).json({ received: true });
  }

  const client = new ShipStationClient({ api_key: SHIPSTATION_API_KEY });

  let label: Label | null = null;
  let shipment: Shipment | null = null;

  if (labelId) {
    try {
      label = await client.getLabel(labelId);
    } catch {
      label = null;
    }
  }

  if (!label && shipmentId) {
    try {
      shipment = await client.getShipment(shipmentId);
    } catch {
      shipment = null;
    }
  }

  const trackingStatus =
    (label?.tracking_status as string | undefined) ||
    payload.tracking_status ||
    (payload.trackingStatus as string | undefined) ||
    (payload.status as string | undefined) ||
    undefined;
  const shipmentStatus =
    (shipment?.shipment_status as string | undefined) ||
    payload.shipment_status ||
    (payload.shipmentStatus as string | undefined);
  const shipDate =
    coerceDate(label?.ship_date) ||
    coerceDate(payload.ship_date) ||
    coerceDate(payload.shipped_at);

  const fulfillmentModuleService = req.scope.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT);
  const orderModuleService = req.scope.resolve<IOrderModuleService>(Modules.ORDER);
  const fulfillments = await fulfillmentModuleService.listFulfillments({ provider_id: 'shipstation' });
  const matches = fulfillments.filter((fulfillment) => {
    const data = fulfillment.data as Record<string, unknown> | null | undefined;
    return (
      (shipmentId && data?.shipment_id === shipmentId) ||
      (labelId && data?.label_id === labelId) ||
      (trackingNumber &&
        Array.isArray(fulfillment.labels) &&
        fulfillment.labels.some((labelItem) => labelItem.tracking_number === trackingNumber))
    );
  });

  if (matches.length === 0) {
    return res.status(202).json({ received: true });
  }

  const nowIso = new Date().toISOString();
  const trackingUrl = label?.label_download?.href ?? label?.label_download?.pdf ?? undefined;
  const labelUrl = label?.label_download?.pdf ?? label?.label_download?.href ?? undefined;
  const normalizedTrackingNumber = label?.tracking_number ?? trackingNumber;

  await Promise.all(
    matches.map(async (fulfillment) => {
      const existingMetadata = (fulfillment.metadata ?? {}) as Record<string, unknown>;
      const existingTracking = Array.isArray(existingMetadata.shipstation_tracking)
        ? (existingMetadata.shipstation_tracking as Array<Record<string, unknown>>)
        : [];

      const nextEntry = {
        tracking_number: normalizedTrackingNumber,
        tracking_status: trackingStatus,
        shipment_status: shipmentStatus,
        tracking_url: trackingUrl,
        label_url: labelUrl,
        label_id: label?.label_id ?? labelId,
        shipment_id: label?.shipment_id ?? shipmentId,
        shipped_at: shipDate?.toISOString(),
        updated_at: nowIso,
        event,
      };

      const nextTracking = mergeTrackingEntries(existingTracking, nextEntry);
      const nextMetadata = {
        ...existingMetadata,
        shipstation_tracking: nextTracking,
        shipstation_tracking_updated_at: nowIso,
      };

      const updateData: Record<string, unknown> = { metadata: nextMetadata };
      if (shipDate) {
        updateData.shipped_at = shipDate;
      }

      await fulfillmentModuleService.updateFulfillment(fulfillment.id, updateData);

      const orderId = (fulfillment as { order_id?: string }).order_id;
      if (orderId) {
        const order = await orderModuleService.retrieveOrder(orderId).catch(() => null);
        if (order) {
          const orderMetadata = (order.metadata ?? {}) as Record<string, unknown>;
          await orderModuleService.updateOrders([
            {
              id: orderId,
              metadata: {
                ...orderMetadata,
                shipstation_tracking_updated_at: nowIso,
              },
            },
          ]);
        }
      }
    }),
  );

  return res.status(200).json({ received: true });
};
