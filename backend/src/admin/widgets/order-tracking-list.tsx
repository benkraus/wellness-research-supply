import { Badge, Button, Container, Heading, Input, Table, Text } from '@medusajs/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';

const defineWidgetConfig = <T extends { zone: string | string[] }>(config: T): T => config;

type TrackingPackage = {
  tracking_number: string;
  tracking_status?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
};

type TrackingOrder = {
  id: string;
  display_id?: number | null;
  status?: string | null;
  email?: string | null;
  packages: TrackingPackage[];
  latest_update?: string | null;
  overdue?: boolean;
};

type TrackingListResponse = {
  orders: TrackingOrder[];
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

const OrderTrackingListWidget = () => {
  const [limit, setLimit] = useState('25');
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsedLimit = useMemo(() => {
    const numeric = Number(limit);
    if (!Number.isFinite(numeric)) return 25;
    return Math.min(Math.max(Math.round(numeric), 1), 100);
  }, [limit]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/admin/orders/tracking?limit=${parsedLimit}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unable to load tracking updates.');
      }

      const payload = (await response.json()) as TrackingListResponse;
      setOrders(payload.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [parsedLimit]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Container className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Heading level="h2">Latest tracking updates</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Most recent ShipStation tracking activity.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="w-24"
          />
          <Button variant="secondary" size="small" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading ? (
        <Text className="text-ui-fg-subtle">Loading tracking updates…</Text>
      ) : error ? (
        <Text className="text-ui-fg-error">{error}</Text>
      ) : orders.length === 0 ? (
        <Text className="text-ui-fg-subtle">No tracking updates yet.</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Order</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Packages</Table.HeaderCell>
              <Table.HeaderCell>Latest update</Table.HeaderCell>
              <Table.HeaderCell>Overdue</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {orders.map((order) => (
              <Table.Row key={order.id} className={order.overdue ? 'bg-ui-bg-highlight' : undefined}>
                <Table.Cell>
                  <div className="space-y-1">
                    <Text className="font-medium">
                      {order.display_id ? `#${order.display_id}` : order.id}
                    </Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      {order.email ?? '—'}
                    </Text>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="xsmall" color={order.status === 'completed' ? 'green' : 'grey'}>
                    {order.status ?? 'unknown'}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col gap-1">
                    {order.packages.map((pkg) => (
                      <div key={pkg.tracking_number} className="flex items-center gap-2">
                        <Badge size="xsmall" color={getStatusColor(pkg.tracking_status)}>
                          {formatStatus(pkg.tracking_status)}
                        </Badge>
                        {pkg.tracking_url ? (
                          <a
                            href={pkg.tracking_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ui-fg-interactive"
                          >
                            {pkg.tracking_number}
                          </a>
                        ) : (
                          <Text size="small" className="text-ui-fg-subtle">
                            {pkg.tracking_number}
                          </Text>
                        )}
                      </div>
                    ))}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Text>{formatDate(order.latest_update)}</Text>
                </Table.Cell>
                <Table.Cell>
                  {order.overdue ? <Badge color="red">Over 5 days</Badge> : <Text>—</Text>}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: 'order.list.after',
});

export default OrderTrackingListWidget;
