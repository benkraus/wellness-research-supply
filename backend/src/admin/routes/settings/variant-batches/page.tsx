import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Badge, Button, Container, Heading, Input, Label, Select, Table, Text } from '@medusajs/ui';
import { useEffect, useMemo, useState } from 'react';

interface VariantBatch {
  id: string;
  variant_id: string;
  lot_number: string;
  quantity: number;
  coa_file_key?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface VariantBatchAllocation {
  id: string;
  variant_batch_id: string;
  order_line_item_id: string;
  quantity: number;
  created_at?: string;
}

interface AllocationLineItemDetail {
  id: string;
  title?: string | null;
  product_title?: string | null;
  variant_title?: string | null;
  variant_sku?: string | null;
  quantity?: number | null;
}

interface AllocationOrderDetail {
  id: string;
  display_id?: number | null;
  status?: string | null;
  email?: string | null;
}

interface VariantBatchAllocationWithDetails extends VariantBatchAllocation {
  line_item?: AllocationLineItemDetail | null;
  order?: AllocationOrderDetail | null;
}

const emptyForm = {
  variant_id: '',
  lot_number: '',
  quantity: '0',
  coa_file_key: '',
};

const emptyFilters = {
  variant_id: '',
  lot_number: '',
  coa_status: 'all' as 'all' | 'with' | 'without',
  min_quantity: '',
  max_quantity: '',
};

const emptyAllocationForm = {
  variant_batch_id: '',
  order_line_item_id: '',
  quantity: '1',
};

const emptyAllocationFilters = {
  variant_batch_id: '',
  order_line_item_id: '',
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildBatchQuery = (filters: typeof emptyFilters) => {
  const params = new URLSearchParams();
  params.set('limit', '200');

  if (filters.variant_id.trim()) params.set('variant_id', filters.variant_id.trim());
  if (filters.lot_number.trim()) params.set('lot_number', filters.lot_number.trim());
  if (filters.coa_status === 'with') params.set('has_coa', 'true');
  if (filters.coa_status === 'without') params.set('has_coa', 'false');
  if (filters.min_quantity.trim()) params.set('min_quantity', filters.min_quantity.trim());
  if (filters.max_quantity.trim()) params.set('max_quantity', filters.max_quantity.trim());

  return params.toString();
};

const fetchBatches = async (filters: typeof emptyFilters) => {
  const query = buildBatchQuery(filters);
  const response = await fetch(`/admin/variant-batches?${query}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load batches.');
  }

  return (await response.json()) as { batches: VariantBatch[] };
};

const fetchAllocations = async (filters: typeof emptyAllocationFilters) => {
  const params = new URLSearchParams();
  params.set('limit', '200');

  if (filters.variant_batch_id.trim()) params.set('variant_batch_id', filters.variant_batch_id.trim());
  if (filters.order_line_item_id.trim()) params.set('order_line_item_id', filters.order_line_item_id.trim());

  const response = await fetch(`/admin/variant-batches/allocations?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load allocations.');
  }

  return (await response.json()) as { allocations: VariantBatchAllocationWithDetails[] };
};

const VariantBatchesSettingsPage = () => {
  const [formValues, setFormValues] = useState(emptyForm);
  const [filters, setFilters] = useState(emptyFilters);
  const [batches, setBatches] = useState<VariantBatch[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { quantity: string; coa_file_key: string }>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [createUploadLoading, setCreateUploadLoading] = useState(false);
  const [createUploadError, setCreateUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allocationForm, setAllocationForm] = useState(emptyAllocationForm);
  const [allocationFilters, setAllocationFilters] = useState(emptyAllocationFilters);
  const [allocations, setAllocations] = useState<VariantBatchAllocationWithDetails[]>([]);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  const load = async (nextFilters: typeof emptyFilters = filters) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBatches(nextFilters);
      setBatches(data.batches ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllocations = async (nextFilters: typeof emptyAllocationFilters = allocationFilters) => {
    try {
      setAllocationLoading(true);
      setAllocationError(null);
      const data = await fetchAllocations(nextFilters);
      setAllocations(data.allocations ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setAllocationError(message);
    } finally {
      setAllocationLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadAllocations();
  }, []);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      batches.forEach((batch) => {
        next[batch.id] = {
          quantity: String(batch.quantity ?? 0),
          coa_file_key: batch.coa_file_key ?? '',
        };
      });
      return next;
    });
  }, [batches]);

  const batchOptions = useMemo(
    () => batches.map((batch) => ({ id: batch.id, label: `${batch.lot_number} · ${batch.variant_id}` })),
    [batches],
  );

  const batchLabelById = useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach((batch) => {
      map.set(batch.id, `${batch.lot_number} · ${batch.variant_id}`);
    });
    return map;
  }, [batches]);

  const getOrderBadgeColor = (status?: string | null): 'grey' | 'green' | 'orange' | 'red' => {
    if (!status) return 'grey';
    if (status === 'completed') return 'green';
    if (status === 'pending' || status === 'requires_action') return 'orange';
    if (status === 'canceled' || status === 'archived') return 'red';
    return 'grey';
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const response = await fetch('/admin/variant-batches', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variant_id: formValues.variant_id.trim(),
          lot_number: formValues.lot_number.trim(),
          quantity: toNumber(formValues.quantity),
          coa_file_key: formValues.coa_file_key.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to create batch.');
      }

      setFormValues(emptyForm);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
    }
  };

  const handleUpdate = async (batchId: string) => {
    const draft = drafts[batchId];
    if (!draft) return;

    try {
      setError(null);
      const response = await fetch(`/admin/variant-batches/${batchId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: toNumber(draft.quantity),
          coa_file_key: draft.coa_file_key.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to update batch.');
      }

      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
    }
  };

  const handleDelete = async (batchId: string) => {
    try {
      setError(null);
      const response = await fetch(`/admin/variant-batches/${batchId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to delete batch.');
      }

      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
    }
  };

  const handleUpload = async (batchId: string, file?: File | null) => {
    if (!file) return;

    try {
      setUploadErrors((prev) => ({ ...prev, [batchId]: '' }));
      setUploading((prev) => ({ ...prev, [batchId]: true }));

      const response = await fetch(`/admin/variant-batches/${batchId}/coa-upload`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/pdf',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to request upload URL.');
      }

      const { upload_url, file_key } = (await response.json()) as { upload_url: string; file_key: string };

      const uploadResult = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/pdf',
        },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error('Upload failed.');
      }

      await fetch(`/admin/variant-batches/${batchId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coa_file_key: file_key,
        }),
      });

      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setUploadErrors((prev) => ({ ...prev, [batchId]: message }));
    } finally {
      setUploading((prev) => ({ ...prev, [batchId]: false }));
    }
  };

  const handleCreateUpload = async (file?: File | null) => {
    if (!file) return;

    try {
      setCreateUploadError(null);
      setCreateUploadLoading(true);

      const response = await fetch('/admin/variant-batches/coa-upload', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/pdf',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to request upload URL.');
      }

      const { upload_url, file_key } = (await response.json()) as { upload_url: string; file_key: string };

      const uploadResult = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/pdf',
        },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error('Upload failed.');
      }

      setFormValues((prev) => ({
        ...prev,
        coa_file_key: file_key,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setCreateUploadError(message);
    } finally {
      setCreateUploadLoading(false);
    }
  };

  const handleCreateAllocation = async () => {
    try {
      setAllocationError(null);
      const response = await fetch('/admin/variant-batches/allocations', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variant_batch_id: allocationForm.variant_batch_id.trim(),
          order_line_item_id: allocationForm.order_line_item_id.trim(),
          quantity: toNumber(allocationForm.quantity),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to create allocation.');
      }

      setAllocationForm(emptyAllocationForm);
      await loadAllocations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setAllocationError(message);
    }
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    try {
      setAllocationError(null);
      const response = await fetch(`/admin/variant-batches/allocations/${allocationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to delete allocation.');
      }

      await loadAllocations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setAllocationError(message);
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-8">
        <div className="space-y-1">
          <Heading level="h1">Batches & Lots</Heading>
          <Text className="text-ui-fg-subtle">
            Track lot numbers, quantities, and COA file keys for each product variant.
          </Text>
        </div>
        <Badge size="large" color="blue">
          {batches.length} batches
        </Badge>
      </div>

      <div className="px-6 py-8 space-y-6">
        <Heading level="h2">Create new batch</Heading>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Variant ID</Label>
            <Input
              value={formValues.variant_id}
              onChange={(event) => setFormValues({ ...formValues, variant_id: event.target.value })}
              placeholder="variant_01H..."
            />
          </div>
          <div className="space-y-2">
            <Label>Lot number</Label>
            <Input
              value={formValues.lot_number}
              onChange={(event) => setFormValues({ ...formValues, lot_number: event.target.value })}
              placeholder="WS-GLP-2409-A2"
            />
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={0}
              value={formValues.quantity}
              onChange={(event) => setFormValues({ ...formValues, quantity: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>COA file key</Label>
            <Input
              value={formValues.coa_file_key}
              onChange={(event) => setFormValues({ ...formValues, coa_file_key: event.target.value })}
              placeholder="coa/glp-1/lot-a2.pdf"
            />
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <input
                type="file"
                accept="application/pdf"
                className="text-xs"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  void handleCreateUpload(file);
                  event.currentTarget.value = '';
                }}
              />
              {createUploadLoading && <Text className="text-ui-fg-subtle">Uploading…</Text>}
              {createUploadError && <Text className="text-ui-fg-error">{createUploadError}</Text>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleCreate}
            disabled={!formValues.variant_id.trim() || !formValues.lot_number.trim()}
          >
            Add batch
          </Button>
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          {error && <Text className="text-ui-fg-error">{error}</Text>}
        </div>
      </div>

      <div className="px-6 py-8 space-y-4">
        <Heading level="h2">Filters</Heading>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Variant ID</Label>
            <Input
              value={filters.variant_id}
              onChange={(event) => setFilters({ ...filters, variant_id: event.target.value })}
              placeholder="variant_01H..."
            />
          </div>
          <div className="space-y-2">
            <Label>Lot number</Label>
            <Input
              value={filters.lot_number}
              onChange={(event) => setFilters({ ...filters, lot_number: event.target.value })}
              placeholder="WS-GLP-2409-A2"
            />
          </div>
          <div className="space-y-2">
            <Label>COA status</Label>
            <Select
              value={filters.coa_status}
              onValueChange={(value) => setFilters({ ...filters, coa_status: value as typeof filters.coa_status })}
            >
              <Select.Trigger>
                <Select.Value placeholder="All batches" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All batches</Select.Item>
                <Select.Item value="with">With COA</Select.Item>
                <Select.Item value="without">Without COA</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Min quantity</Label>
            <Input
              type="number"
              min={0}
              value={filters.min_quantity}
              onChange={(event) => setFilters({ ...filters, min_quantity: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Max quantity</Label>
            <Input
              type="number"
              min={0}
              value={filters.max_quantity}
              onChange={(event) => setFilters({ ...filters, max_quantity: event.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => load()} disabled={loading}>
            Apply filters
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const cleared = { ...emptyFilters };
              setFilters(cleared);
              load(cleared);
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      <div className="px-6 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <Heading level="h2">Existing batches</Heading>
          <Text className="text-ui-fg-subtle">{batches.length} total</Text>
        </div>

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Lot number</Table.HeaderCell>
              <Table.HeaderCell>Variant ID</Table.HeaderCell>
              <Table.HeaderCell>Quantity</Table.HeaderCell>
              <Table.HeaderCell>COA</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {batches.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text className="text-ui-fg-subtle">No batches found.</Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              batches.map((batch) => {
                const draft = drafts[batch.id] ?? {
                  quantity: String(batch.quantity ?? 0),
                  coa_file_key: batch.coa_file_key ?? '',
                };

                return (
                  <Table.Row key={batch.id}>
                    <Table.Cell>
                      <Text className="font-medium">{batch.lot_number}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text className="text-ui-fg-subtle">{batch.variant_id}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        type="number"
                        min={0}
                        value={draft.quantity}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [batch.id]: { ...draft, quantity: event.target.value },
                          }))
                        }
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <div className="space-y-2">
                        <Input
                          value={draft.coa_file_key}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [batch.id]: { ...draft, coa_file_key: event.target.value },
                            }))
                          }
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="file"
                            accept="application/pdf"
                            className="text-xs"
                            onChange={(event) => {
                              const file = event.currentTarget.files?.[0];
                              void handleUpload(batch.id, file);
                              event.currentTarget.value = '';
                            }}
                          />
                          {uploading[batch.id] && <Text className="text-ui-fg-subtle">Uploading…</Text>}
                          {uploadErrors[batch.id] && (
                            <Text className="text-ui-fg-error">{uploadErrors[batch.id]}</Text>
                          )}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="small" variant="secondary" onClick={() => handleUpdate(batch.id)}>
                          Save
                        </Button>
                        <Button size="small" variant="danger" onClick={() => handleDelete(batch.id)}>
                          Delete
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table>
      </div>

      <div className="px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Heading level="h2">Batch allocations</Heading>
          <Badge size="small" color="grey">
            {allocations.length} allocations
          </Badge>
        </div>
        <Text className="text-ui-fg-subtle">
          Assign lot quantities to specific order line items. This powers COA lookup per customer order.
        </Text>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Batch ID</Label>
            <Input
              list="batch-options"
              value={allocationForm.variant_batch_id}
              onChange={(event) => setAllocationForm({ ...allocationForm, variant_batch_id: event.target.value })}
              placeholder="vb_01H..."
            />
            <datalist id="batch-options">
              {batchOptions.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.label}
                </option>
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label>Order line item ID</Label>
            <Input
              value={allocationForm.order_line_item_id}
              onChange={(event) =>
                setAllocationForm({ ...allocationForm, order_line_item_id: event.target.value })
              }
              placeholder="oli_01H..."
            />
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={allocationForm.quantity}
              onChange={(event) => setAllocationForm({ ...allocationForm, quantity: event.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleCreateAllocation}
            disabled={!allocationForm.variant_batch_id.trim() || !allocationForm.order_line_item_id.trim()}
          >
            Add allocation
          </Button>
          <Button variant="secondary" onClick={() => loadAllocations()} disabled={allocationLoading}>
            {allocationLoading ? 'Refreshing…' : 'Refresh'}
          </Button>
          {allocationError && <Text className="text-ui-fg-error">{allocationError}</Text>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Filter by batch ID</Label>
            <Input
              value={allocationFilters.variant_batch_id}
              onChange={(event) =>
                setAllocationFilters({ ...allocationFilters, variant_batch_id: event.target.value })
              }
              placeholder="vb_01H..."
            />
          </div>
          <div className="space-y-2">
            <Label>Filter by order line item ID</Label>
            <Input
              value={allocationFilters.order_line_item_id}
              onChange={(event) =>
                setAllocationFilters({ ...allocationFilters, order_line_item_id: event.target.value })
              }
              placeholder="oli_01H..."
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => loadAllocations()} disabled={allocationLoading}>
            Apply allocation filters
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const cleared = { ...emptyAllocationFilters };
              setAllocationFilters(cleared);
              loadAllocations(cleared);
            }}
          >
            Clear allocation filters
          </Button>
        </div>

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Batch</Table.HeaderCell>
              <Table.HeaderCell>Order</Table.HeaderCell>
              <Table.HeaderCell>Item</Table.HeaderCell>
              <Table.HeaderCell>Quantity</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {allocations.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={4}>
                  <Text className="text-ui-fg-subtle">No allocations found.</Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              allocations.map((allocation) => {
                const lineItem = allocation.line_item;
                const order = allocation.order;
                const batchLabel = batchLabelById.get(allocation.variant_batch_id) ?? allocation.variant_batch_id;

                return (
                  <Table.Row key={allocation.id}>
                    <Table.Cell>
                      <div className="space-y-1">
                        <Text className="font-medium">{batchLabel}</Text>
                        <Text className="text-ui-fg-subtle text-xs">{allocation.variant_batch_id}</Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Text className="font-medium">
                            {order?.display_id ? `#${order.display_id}` : order?.id ?? 'Unknown order'}
                          </Text>
                          <Badge size="xsmall" color={getOrderBadgeColor(order?.status)}>
                            {order?.status ?? 'unknown'}
                          </Badge>
                        </div>
                        <Text className="text-ui-fg-subtle text-xs">{order?.email ?? '—'}</Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="space-y-1">
                        <Text className="font-medium">
                          {lineItem?.product_title || lineItem?.title || 'Line item'}
                        </Text>
                        <Text className="text-ui-fg-subtle text-xs">
                          {lineItem?.variant_title || lineItem?.variant_sku || allocation.order_line_item_id}
                        </Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Text>{allocation.quantity}</Text>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Button size="small" variant="danger" onClick={() => handleDeleteAllocation(allocation.id)}>
                        Delete
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: 'Batches & Lots',
});

export default VariantBatchesSettingsPage;
