import type { AdminInventoryItem, DetailWidgetProps } from '@medusajs/framework/types';
import { Badge, Container, Heading, Table, Text } from '@medusajs/ui';
import { useEffect, useMemo, useState } from 'react';

const defineWidgetConfig = <T extends { zone: string | string[] }>(config: T): T => config;

interface VariantSummary {
  id: string;
  title?: string | null;
  sku?: string | null;
  product?: { id: string; title?: string | null } | null;
}

interface VariantBatchSummary {
  id: string;
  variant_id: string;
  lot_number: string;
  quantity: number;
  coa_file_key?: string | null;
  variant?: VariantSummary | null;
}

const InventoryItemBatchesWidget = ({ data }: DetailWidgetProps<AdminInventoryItem>) => {
  const [batches, setBatches] = useState<VariantBatchSummary[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/admin/inventory-items/${data.id}/variant-batches`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Unable to load batch inventory.');
        }

        const payload = (await response.json()) as {
          batches: VariantBatchSummary[];
          total_quantity?: number;
        };

        if (!isMounted) return;
        setBatches(payload.batches ?? []);
        setTotalQuantity(payload.total_quantity ?? 0);
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

  const sortedBatches = useMemo(
    () => [...batches].sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0)),
    [batches],
  );

  return (
    <Container className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Heading level="h2">Batch inventory</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Active lots linked to this inventory item.
          </Text>
        </div>
        <Badge color={totalQuantity > 0 ? 'green' : 'grey'}>{totalQuantity} units</Badge>
      </div>

      {loading ? (
        <Text className="text-ui-fg-subtle">Loading batches...</Text>
      ) : error ? (
        <Text className="text-ui-fg-error">{error}</Text>
      ) : sortedBatches.length === 0 ? (
        <Text className="text-ui-fg-subtle">No batches in stock.</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Lot</Table.HeaderCell>
              <Table.HeaderCell>Variant</Table.HeaderCell>
              <Table.HeaderCell>Qty</Table.HeaderCell>
              <Table.HeaderCell>COA</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sortedBatches.map((batch) => (
              <Table.Row key={batch.id}>
                <Table.Cell>
                  <Text className="font-medium">{batch.lot_number}</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {batch.id}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text className="font-medium">{batch.variant?.title ?? batch.variant_id}</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {batch.variant?.product?.title ?? 'Product'} - {batch.variant?.sku ?? 'No SKU'}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text>{batch.quantity}</Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col gap-1">
                    <Badge color={batch.coa_file_key ? 'green' : 'orange'}>
                      {batch.coa_file_key ? 'On file' : 'Missing'}
                    </Badge>
                    {batch.coa_file_key && (
                      <Text size="small" className="text-ui-fg-subtle">
                        {batch.coa_file_key}
                      </Text>
                    )}
                  </div>
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
  zone: 'inventory_item.details.side.after',
});

export default InventoryItemBatchesWidget;
