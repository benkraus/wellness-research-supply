import type { AdminOrder, DetailWidgetProps } from '@medusajs/framework/types';
import { Badge, Container, Heading, Table, Text } from '@medusajs/ui';
import { useEffect, useMemo, useState } from 'react';

const defineWidgetConfig = <T extends { zone: string | string[] }>(config: T): T => config;

type TrackingPackage = {
  tracking_number: string;
  tracking_status?: string | null;
  tracking_url?: string | null;
  label_url?: string | null;
  shipped_at?: string | null;
};

type TrackingResponse = {
  order?: {
    id: string;
  };
  packages: TrackingPackage[];
  overdue?: boolean;
};

const getStatusColor = (status?: string | null): 'grey' | 'green' | 'orange' | 'red' => {
  if (!status) return 'grey';
  if (status === 'delivered') return 'green';
  if (status === 'error') return 'red';
  if (status === 'in_transit') return 'orange';
  return 'grey';
};

const formatStatus = (status?: string | null) => {
  if (!status) return 'Unknown';
  return status.replace('_', ' ');
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const OrderTrackingDetailsWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/admin/orders/${data.id}/tracking`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Unable to load tracking details.');
        }

        const payload = (await response.json()) as TrackingResponse;
        if (!isMounted) return;
        setTracking(payload);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unexpected error.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (data?.id) {
      void load();
    }

    return () => {
      isMounted = false;
    };
  }, [data?.id]);

  const packages = tracking?.packages ?? [];
  const overdue = Boolean(tracking?.overdue);
  const statusSummary = useMemo(() => {
    const counts = packages.reduce<Record<string, number>>((acc, pkg) => {
      const key = pkg.tracking_status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([status, count]) => `${formatStatus(status)} · ${count}`)
      .join(' · ');
  }, [packages]);

  return (
    <Container className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Heading level="h2">Tracking</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            ShipStation package tracking for this order.
          </Text>
        </div>
        {overdue && <Badge color="red">Overdue &gt; 5 days</Badge>}
      </div>

      {loading ? (
        <Text className="text-ui-fg-subtle">Loading tracking…</Text>
      ) : error ? (
        <Text className="text-ui-fg-error">{error}</Text>
      ) : packages.length === 0 ? (
        <Text className="text-ui-fg-subtle">No tracking updates yet.</Text>
      ) : (
        <>
          {statusSummary && (
            <Text size="small" className="text-ui-fg-subtle">
              {statusSummary}
            </Text>
          )}
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Tracking #</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Shipped</Table.HeaderCell>
                <Table.HeaderCell>Links</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {packages.map((pkg) => (
                <Table.Row key={pkg.tracking_number}>
                  <Table.Cell>
                    <Text className="font-medium">{pkg.tracking_number}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={getStatusColor(pkg.tracking_status)}>
                      {formatStatus(pkg.tracking_status)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text>{formatDate(pkg.shipped_at)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-2">
                      {pkg.tracking_url && (
                        <a
                          href={pkg.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ui-fg-interactive"
                        >
                          Track
                        </a>
                      )}
                      {pkg.label_url && (
                        <a
                          href={pkg.label_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ui-fg-interactive"
                        >
                          Label
                        </a>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </>
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: 'order.details.side.after',
});

export default OrderTrackingDetailsWidget;
