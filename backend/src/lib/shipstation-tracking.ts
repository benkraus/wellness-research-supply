type TrackingEntry = {
  tracking_number?: string;
  tracking_status?: string;
  tracking_url?: string;
  label_url?: string;
  shipped_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type TrackingPackage = {
  tracking_number: string;
  tracking_status?: string | null;
  tracking_url?: string | null;
  label_url?: string | null;
  shipped_at?: string | null;
  updated_at?: string | null;
};

type FulfillmentWithLabels = {
  id: string;
  shipped_at?: string | null;
  metadata?: Record<string, unknown> | null;
  labels?: Array<{
    id?: string;
    tracking_number: string;
    tracking_url?: string | null;
    label_url?: string | null;
  }> | null;
};

export const getFulfillmentTrackingPackages = (fulfillment: FulfillmentWithLabels): TrackingPackage[] => {
  const labels = fulfillment.labels ?? [];
  if (!labels.length) return [];

  const metadata = (fulfillment.metadata ?? {}) as Record<string, unknown>;
  const trackingEntries = Array.isArray(metadata.shipstation_tracking)
    ? (metadata.shipstation_tracking as TrackingEntry[])
    : [];

  return labels.map((label) => {
    const entry = trackingEntries.find((item) => item.tracking_number === label.tracking_number);
    return {
      tracking_number: label.tracking_number,
      tracking_status: entry?.tracking_status ?? null,
      tracking_url: entry?.tracking_url ?? label.tracking_url ?? null,
      label_url: entry?.label_url ?? label.label_url ?? null,
      shipped_at: entry?.shipped_at ?? fulfillment.shipped_at ?? null,
      updated_at: entry?.updated_at ?? null,
    };
  });
};

export const getFulfillmentLatestTrackingUpdate = (fulfillment: FulfillmentWithLabels): string | null => {
  const metadata = (fulfillment.metadata ?? {}) as Record<string, unknown>;
  const trackingUpdated = metadata.shipstation_tracking_updated_at;
  if (typeof trackingUpdated === 'string') {
    return trackingUpdated;
  }
  return null;
};
