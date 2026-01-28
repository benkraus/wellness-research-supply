import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Badge, Button, Container, Heading, Input, Label, Table, Text } from '@medusajs/ui';
import { useEffect, useMemo, useState } from 'react';

interface VariantBatchDetail {
  id: string;
  variant_id: string;
  lot_number: string;
  quantity: number;
  coa_file_key?: string | null;
  received_at?: string | null;
  invoice_url?: string | null;
  lab_invoice_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface VariantSummary {
  id: string;
  title?: string | null;
  sku?: string | null;
  product?: {
    title?: string | null;
  } | null;
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

interface VariantBatchAllocationWithDetails {
  id: string;
  variant_batch_id: string;
  order_line_item_id: string;
  quantity: number;
  line_item?: AllocationLineItemDetail | null;
  order?: AllocationOrderDetail | null;
}

const toDateInput = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const fetchVariantLabel = async (variantId: string) => {
  if (!variantId) return null;
  const params = new URLSearchParams();
  params.set('limit', '1');
  params.set('fields', 'id,title,sku,product.title');
  params.append('id', variantId);

  const response = await fetch(`/admin/product-variants?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load variant.');
  }

  const payload = (await response.json()) as { variants: VariantSummary[] };
  return payload.variants?.[0] ?? null;
};

const fetchAllocations = async (batchId: string) => {
  const params = new URLSearchParams();
  params.set('limit', '200');
  params.set('variant_batch_id', batchId);

  const response = await fetch(`/admin/variant-batches/allocations?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load batch allocations.');
  }

  return (await response.json()) as { allocations: VariantBatchAllocationWithDetails[] };
};

const getOrderBadgeColor = (status?: string | null): 'grey' | 'green' | 'orange' | 'red' => {
  if (!status) return 'grey';
  if (status === 'completed') return 'green';
  if (status === 'pending' || status === 'requires_action') return 'orange';
  if (status === 'canceled' || status === 'archived') return 'red';
  return 'grey';
};

const VariantBatchDetailsPage = () => {
  const [batchId, setBatchId] = useState('');
  const [batch, setBatch] = useState<VariantBatchDetail | null>(null);
  const [variantLabel, setVariantLabel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<VariantBatchAllocationWithDetails[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(false);
  const [allocationsError, setAllocationsError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState({
    quantity: '',
    coa_file_key: '',
    received_at: '',
    invoice_url: '',
    lab_invoice_url: '',
  });

  const hasBatch = Boolean(batch && batch.id);

  const load = async (targetId?: string) => {
    const resolvedId = targetId ?? batchId;
    if (!resolvedId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/admin/variant-batches/${resolvedId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to load batch.');
      }

      const payload = (await response.json()) as { batch: VariantBatchDetail };
      const nextBatch = payload.batch;
      setBatch(nextBatch);
      setFormValues({
        quantity: String(nextBatch.quantity ?? 0),
        coa_file_key: nextBatch.coa_file_key ?? '',
        received_at: toDateInput(nextBatch.received_at),
        invoice_url: nextBatch.invoice_url ?? '',
        lab_invoice_url: nextBatch.lab_invoice_url ?? '',
      });

      try {
        const variant = await fetchVariantLabel(nextBatch.variant_id);
        if (variant) {
          const productTitle = variant.product?.title ?? 'Product';
          const variantTitle = variant.title ?? variant.sku ?? variant.id;
          setVariantLabel(`${productTitle} · ${variantTitle}`);
        } else {
          setVariantLabel(nextBatch.variant_id);
        }
      } catch {
        setVariantLabel(nextBatch.variant_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parts = window.location.pathname.split('/').filter(Boolean);
    const resolvedId = parts[parts.length - 1] ?? '';
    setBatchId(resolvedId);
    void load(resolvedId);
  }, []);

  useEffect(() => {
    if (!batchId) return;
    let isMounted = true;

    void (async () => {
      try {
        setAllocationsLoading(true);
        setAllocationsError(null);
        const data = await fetchAllocations(batchId);
        if (!isMounted) return;
        setAllocations(data.allocations ?? []);
      } catch (err) {
        if (!isMounted) return;
        setAllocations([]);
        setAllocationsError(err instanceof Error ? err.message : 'Unable to load allocations.');
      } finally {
        if (isMounted) setAllocationsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [batchId]);

  const handleSave = async () => {
    if (!batch?.id) return;

    try {
      setSaving(true);
      setError(null);
      const response = await fetch(`/admin/variant-batches/${batch.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: Number(formValues.quantity) || 0,
          coa_file_key: formValues.coa_file_key.trim() || null,
          received_at: formValues.received_at || null,
          invoice_url: formValues.invoice_url.trim() || null,
          lab_invoice_url: formValues.lab_invoice_url.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to update batch.');
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!batch?.id) return;
    try {
      setDeleting(true);
      setError(null);
      const response = await fetch(`/admin/variant-batches/${batch.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to delete batch.');
      }

      window.location.assign('/app/variant-batches');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async (file?: File | null) => {
    if (!file || !batch?.id) return;

    try {
      setUploadError(null);
      setUploading(true);
      const response = await fetch(`/admin/variant-batches/${batch.id}/coa-upload`, {
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

      const { upload_url, file_key } = (await response.json()) as {
        upload_url: string;
        file_key: string;
      };

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

      await fetch(`/admin/variant-batches/${batch.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coa_file_key: file_key }),
      });

      await load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const createdLabel = useMemo(() => {
    if (!batch?.created_at) return '—';
    const date = new Date(batch.created_at);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  }, [batch?.created_at]);

  const supplierInvoiceUrl = formValues.invoice_url.trim();
  const labInvoiceUrl = formValues.lab_invoice_url.trim();
  const coaDownloadUrl =
    batch?.coa_file_key && batch?.lot_number
      ? `/store/coa/${encodeURIComponent(batch.lot_number)}`
      : '';

  if (loading) {
    return (
      <Container className="space-y-2">
        <Heading level="h1">Batch details</Heading>
        <Text className="text-ui-fg-subtle">Loading batch…</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="space-y-3">
        <Heading level="h1">Batch details</Heading>
        <Text className="text-ui-fg-error">{error}</Text>
        <Button variant="secondary" onClick={() => load()}>
          Retry
        </Button>
      </Container>
    );
  }

  if (!hasBatch) {
    return (
      <Container className="space-y-2">
        <Heading level="h1">Batch details</Heading>
        <Text className="text-ui-fg-subtle">Batch not found.</Text>
        <Button variant="secondary" onClick={() => window.location.assign('/app/variant-batches')}>
          Back to batches
        </Button>
      </Container>
    );
  }

  const uploadInputId = 'batch-coa-upload';

  return (
    <Container className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Heading level="h1">Batch {batch.lot_number}</Heading>
          <Text className="text-ui-fg-subtle">Created {createdLabel}</Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => window.location.assign('/app/variant-batches')}>
          Back to batches
        </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-4">
          <div className="rounded-md border border-ui-border-base p-5">
            <div className="space-y-3">
              <Heading level="h2">Batch info</Heading>
              <Text className="text-ui-fg-subtle">{variantLabel || batch.variant_id}</Text>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <Text size="small" className="text-ui-fg-subtle">
                    Lot number
                  </Text>
                  <Text className="font-medium">{batch.lot_number}</Text>
                </div>
                <div className="space-y-1">
                  <Text size="small" className="text-ui-fg-subtle">
                    Variant ID
                  </Text>
                  <Text className="font-medium">{batch.variant_id}</Text>
                </div>
                <div className="space-y-1">
                  <Text size="small" className="text-ui-fg-subtle">
                    COA status
                  </Text>
                  <Badge color={batch.coa_file_key ? 'green' : 'orange'}>
                    {batch.coa_file_key ? 'On file' : 'Missing'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-ui-border-base p-5">
            <div className="space-y-4">
              <Heading level="h2">Inventory</Heading>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formValues.quantity}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, quantity: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Received date</Label>
                  <Input
                    type="date"
                    value={formValues.received_at}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, received_at: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-ui-border-base p-5">
            <div className="space-y-4">
              <Heading level="h2">Invoices</Heading>
              <div className="space-y-2">
                <Label>Supplier invoice link</Label>
                <Input
                  type="url"
                  value={formValues.invoice_url}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, invoice_url: event.target.value }))
                  }
                  placeholder="https://..."
                />
                {supplierInvoiceUrl ? (
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() => window.open(supplierInvoiceUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Open supplier invoice
                  </Button>
                ) : (
                  <Text size="small" className="text-ui-fg-subtle">
                    No supplier invoice link.
                  </Text>
                )}
              </div>
              <div className="space-y-2">
                <Label>Lab testing invoice link</Label>
                <Input
                  type="url"
                  value={formValues.lab_invoice_url}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, lab_invoice_url: event.target.value }))
                  }
                  placeholder="https://..."
                />
                {labInvoiceUrl ? (
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() => window.open(labInvoiceUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Open lab invoice
                  </Button>
                ) : (
                  <Text size="small" className="text-ui-fg-subtle">
                    No lab invoice link.
                  </Text>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-ui-border-base p-5">
            <div className="space-y-4">
              <Heading level="h2">Orders using this batch</Heading>
              {allocationsLoading ? (
                <Text className="text-ui-fg-subtle">Loading allocations…</Text>
              ) : allocationsError ? (
                <Text className="text-ui-fg-error">{allocationsError}</Text>
              ) : allocations.length === 0 ? (
                <Text className="text-ui-fg-subtle">No orders allocated.</Text>
              ) : (
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Order</Table.HeaderCell>
                      <Table.HeaderCell>Item</Table.HeaderCell>
                      <Table.HeaderCell>Qty</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {allocations.map((allocation) => {
                      const order = allocation.order;
                      const lineItem = allocation.line_item;
                      return (
                        <Table.Row key={allocation.id}>
                          <Table.Cell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Text className="font-medium">
                                  {order?.display_id
                                    ? `#${order.display_id}`
                                    : order?.id ?? 'Unknown order'}
                                </Text>
                                <Badge size="xsmall" color={getOrderBadgeColor(order?.status)}>
                                  {order?.status ?? 'unknown'}
                                </Badge>
                              </div>
                              <Text className="text-ui-fg-subtle text-xs">
                                {order?.email ?? '—'}
                              </Text>
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
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-ui-border-base p-5">
            <div className="space-y-3">
              <Heading level="h2">COA document</Heading>
              <div className="space-y-2">
                <Label>COA file key</Label>
                <Input
                  value={formValues.coa_file_key}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, coa_file_key: event.target.value }))
                  }
                  placeholder="coa/glp-1/lot-a2.pdf"
                />
                {coaDownloadUrl ? (
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() => window.open(coaDownloadUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Open COA
                  </Button>
                ) : (
                  <Text size="small" className="text-ui-fg-subtle">
                    No COA linked.
                  </Text>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={uploadInputId}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    void handleUpload(file);
                    event.currentTarget.value = '';
                  }}
                />
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => document.getElementById(uploadInputId)?.click()}
                  disabled={uploading}
                >
                  {formValues.coa_file_key ? 'Replace COA' : 'Upload COA'}
                </Button>
                {uploading && <Text className="text-ui-fg-subtle">Uploading…</Text>}
                {uploadError && <Text className="text-ui-fg-error">{uploadError}</Text>}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-ui-border-base p-5">
            <div className="space-y-3">
              <Heading level="h2">Actions</Heading>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({});

export default VariantBatchDetailsPage;
