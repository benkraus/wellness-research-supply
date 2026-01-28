import { defineRouteConfig } from '@medusajs/admin-sdk';
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  Table,
  Tabs,
  Text,
} from '@medusajs/ui';
import { useEffect, useMemo, useState } from 'react';

interface VariantBatch {
  id: string;
  variant_id: string;
  lot_number: string;
  quantity: number;
  received_at?: string | null;
  invoice_url?: string | null;
  lab_invoice_url?: string | null;
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

interface ProductSummary {
  id: string;
  title?: string | null;
}

interface VariantSummary {
  id: string;
  title?: string | null;
  sku?: string | null;
  product?: {
    title?: string | null;
  } | null;
}

const emptyForm = {
  variant_id: '',
  lot_number: '',
  quantity: '0',
  coa_file_key: '',
  received_at: '',
  invoice_url: '',
  lab_invoice_url: '',
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

const generateLotNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let value = '';

  for (let i = 0; i < 6; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }

  return value;
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

const fetchProducts = async () => {
  const params = new URLSearchParams();
  params.set('limit', '200');
  params.set('fields', 'id,title');

  const response = await fetch(`/admin/products?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load products.');
  }

  return (await response.json()) as { products: ProductSummary[] };
};

const fetchProductVariants = async (productId: string) => {
  const params = new URLSearchParams();
  params.set('limit', '200');
  params.set('fields', 'id,title,sku');

  const response = await fetch(`/admin/products/${productId}/variants?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load variants.');
  }

  return (await response.json()) as { variants: VariantSummary[] };
};

const fetchVariantsByIds = async (variantIds: string[]) => {
  const ids = Array.from(new Set(variantIds.filter(Boolean)));
  if (!ids.length) {
    return { variants: [] as VariantSummary[] };
  }

  const chunks: string[][] = [];
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }

  const results: VariantSummary[] = [];

  for (const chunk of chunks) {
    const params = new URLSearchParams();
    params.set('limit', String(chunk.length));
    params.set('fields', 'id,title,sku,product.title');
    chunk.forEach((id) => params.append('id', id));

    const response = await fetch(`/admin/product-variants?${params.toString()}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Unable to load variants.');
    }

    const payload = (await response.json()) as { variants: VariantSummary[] };
    results.push(...(payload.variants ?? []));
  }

  return { variants: results };
};

const VariantBatchesSettingsPage = () => {
  const [formValues, setFormValues] = useState(emptyForm);
  const [filters, setFilters] = useState(emptyFilters);
  const [batches, setBatches] = useState<VariantBatch[]>([]);
  const [createUploadLoading, setCreateUploadLoading] = useState(false);
  const [createUploadError, setCreateUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [allocationForm, setAllocationForm] = useState(emptyAllocationForm);
  const [allocationFilters, setAllocationFilters] = useState(emptyAllocationFilters);
  const [allocations, setAllocations] = useState<VariantBatchAllocationWithDetails[]>([]);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [variants, setVariants] = useState<VariantSummary[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsError, setVariantsError] = useState<string | null>(null);
  const [variantLabels, setVariantLabels] = useState<Record<string, string>>({});
  const [variantLabelsError, setVariantLabelsError] = useState<string | null>(null);

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
    const variantIds = Array.from(new Set(batches.map((batch) => batch.variant_id).filter(Boolean)));
    if (!variantIds.length) {
      setVariantLabels({});
      setVariantLabelsError(null);
      return;
    }

    let isMounted = true;

    void (async () => {
      try {
        setVariantLabelsError(null);
        const data = await fetchVariantsByIds(variantIds);
        if (!isMounted) return;

        const next: Record<string, string> = {};
        data.variants.forEach((variant) => {
          const productTitle = variant.product?.title ?? 'Product';
          const variantTitle = variant.title ?? variant.sku ?? variant.id;
          next[variant.id] = `${productTitle} · ${variantTitle}`;
        });
        setVariantLabels(next);
      } catch (err) {
        if (!isMounted) return;
        setVariantLabels({});
        setVariantLabelsError('Unable to load variant names.');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [batches]);

  useEffect(() => {
    if (!isCreateModalOpen) return;
    setFormValues((prev) => ({
      ...emptyForm,
      lot_number: generateLotNumber(),
    }));
    setSelectedProductId('');
    setVariants([]);
    setVariantsError(null);
    setCreateUploadError(null);

    if (products.length === 0) {
      void (async () => {
        try {
          setProductsLoading(true);
          setProductsError(null);
          const data = await fetchProducts();
          setProducts(data.products ?? []);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unexpected error.';
          setProductsError(message);
        } finally {
          setProductsLoading(false);
        }
      })();
    }
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (!selectedProductId) return;
    void (async () => {
      try {
        setVariantsLoading(true);
        setVariantsError(null);
        const data = await fetchProductVariants(selectedProductId);
        const nextVariants = data.variants ?? [];
        setVariants(nextVariants);
        if (nextVariants.length === 1) {
          setFormValues((prev) => ({ ...prev, variant_id: nextVariants[0].id }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error.';
        setVariantsError(message);
      } finally {
        setVariantsLoading(false);
      }
    })();
  }, [selectedProductId]);

  const batchOptions = useMemo(
    () =>
      batches.map((batch) => ({
        id: batch.id,
        label: `${batch.lot_number} · ${variantLabels[batch.variant_id] ?? batch.variant_id}`,
      })),
    [batches, variantLabels],
  );

  const activeBatches = useMemo(
    () => batches.filter((batch) => Number(batch.quantity ?? 0) > 0),
    [batches],
  );

  const pastBatches = useMemo(
    () => batches.filter((batch) => Number(batch.quantity ?? 0) <= 0),
    [batches],
  );

  const batchLabelById = useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach((batch) => {
      map.set(batch.id, `${batch.lot_number} · ${variantLabels[batch.variant_id] ?? batch.variant_id}`);
    });
    return map;
  }, [batches, variantLabels]);

  const productOptions = useMemo(() => {
    return [...products]
      .sort((a, b) => (a.title ?? a.id).localeCompare(b.title ?? b.id))
      .map((product) => ({
        value: product.id,
        label: product.title ?? product.id,
      }));
  }, [products]);

  const variantOptions = useMemo(() => {
    return [...variants]
      .sort((a, b) => (a.title ?? a.sku ?? a.id).localeCompare(b.title ?? b.sku ?? b.id))
      .map((variant) => ({
        value: variant.id,
        label: `${variant.title ?? variant.sku ?? 'Variant'}${variant.sku ? ` · ${variant.sku}` : ''}`,
      }));
  }, [variants]);

  const getOrderBadgeColor = (status?: string | null): 'grey' | 'green' | 'orange' | 'red' => {
    if (!status) return 'grey';
    if (status === 'completed') return 'green';
    if (status === 'pending' || status === 'requires_action') return 'orange';
    if (status === 'canceled' || status === 'archived') return 'red';
    return 'grey';
  };

  const triggerFilePicker = (inputId: string) => {
    if (typeof document === 'undefined') return;
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    input?.click();
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
          received_at: formValues.received_at || null,
          invoice_url: formValues.invoice_url.trim() || null,
          lab_invoice_url: formValues.lab_invoice_url.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to create batch.');
      }

      setFormValues(emptyForm);
      setIsCreateModalOpen(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
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

  const createUploadInputId = 'coa-create-upload';

  return (
    <Container className="p-0">
      <div className="flex flex-col gap-4 border-b px-6 py-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Heading level="h1">Batches & Lots</Heading>
          <Text className="text-ui-fg-subtle">
            Track lot numbers, quantities, and COA file keys for each product variant.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge size="large" color="blue">
            {batches.length} batches
          </Badge>
          <Button variant="secondary" onClick={() => load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>New batch</Button>
        </div>
      </div>

      <div className="px-6 py-6">
        <Tabs defaultValue="batches">
          <Tabs.List className="mb-6">
            <Tabs.Trigger value="batches">Batches</Tabs.Trigger>
            <Tabs.Trigger value="allocations">Allocations</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="batches" className="space-y-6">
            <div className="space-y-4">
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
                    onValueChange={(value) =>
                      setFilters({ ...filters, coa_status: value as typeof filters.coa_status })
                    }
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
                {error && <Text className="text-ui-fg-error">{error}</Text>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Heading level="h2">Existing batches</Heading>
                <Text className="text-ui-fg-subtle">{activeBatches.length} active</Text>
              </div>

              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Lot number</Table.HeaderCell>
                    <Table.HeaderCell>Variant</Table.HeaderCell>
                    <Table.HeaderCell>Quantity</Table.HeaderCell>
                    <Table.HeaderCell>COA</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {activeBatches.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={4}>
                        <Text className="text-ui-fg-subtle">No batches found.</Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    activeBatches.map((batch) => {
                      return (
                        <Table.Row key={batch.id}>
                          <Table.Cell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="small"
                              className="px-0"
                              onClick={() => window.location.assign(`/app/variant-batches/${batch.id}`)}
                            >
                              {batch.lot_number}
                            </Button>
                          </Table.Cell>
                          <Table.Cell>
                            <Text className="font-medium">
                              {variantLabels[batch.variant_id] ?? batch.variant_id}
                            </Text>
                            {variantLabels[batch.variant_id] && (
                              <Text size="small" className="text-ui-fg-subtle">
                                {batch.variant_id}
                              </Text>
                            )}
                            {variantLabelsError && (
                              <Text size="small" className="text-ui-fg-error">
                                {variantLabelsError}
                              </Text>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <Text>{batch.quantity}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={batch.coa_file_key ? 'green' : 'orange'}>
                              {batch.coa_file_key ? 'On file' : 'Missing'}
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })
                  )}
                </Table.Body>
              </Table>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Heading level="h2">Past batches</Heading>
                <Text className="text-ui-fg-subtle">{pastBatches.length} archived</Text>
              </div>

              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Lot number</Table.HeaderCell>
                    <Table.HeaderCell>Variant</Table.HeaderCell>
                    <Table.HeaderCell>Quantity</Table.HeaderCell>
                    <Table.HeaderCell>COA</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {pastBatches.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={4}>
                        <Text className="text-ui-fg-subtle">No past batches.</Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    pastBatches.map((batch) => (
                      <Table.Row key={batch.id}>
                        <Table.Cell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            className="px-0"
                            onClick={() => window.location.assign(`/app/variant-batches/${batch.id}`)}
                          >
                            {batch.lot_number}
                          </Button>
                        </Table.Cell>
                        <Table.Cell>
                          <Text className="font-medium">
                            {variantLabels[batch.variant_id] ?? batch.variant_id}
                          </Text>
                          {variantLabels[batch.variant_id] && (
                            <Text size="small" className="text-ui-fg-subtle">
                              {batch.variant_id}
                            </Text>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <Text>{batch.quantity}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge color={batch.coa_file_key ? 'green' : 'orange'}>
                            {batch.coa_file_key ? 'On file' : 'Missing'}
                          </Badge>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table>
            </div>
          </Tabs.Content>

          <Tabs.Content value="allocations" className="space-y-6">
            <div className="space-y-2">
              <Heading level="h2">Batch allocations</Heading>
              <Text className="text-ui-fg-subtle">
                Assign lot quantities to specific order line items. This powers COA lookup per customer order.
              </Text>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Batch ID</Label>
                <Input
                  list="batch-options"
                  value={allocationForm.variant_batch_id}
                  onChange={(event) =>
                    setAllocationForm({ ...allocationForm, variant_batch_id: event.target.value })
                  }
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
                    <Table.Cell colSpan={5}>
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
          </Tabs.Content>
        </Tabs>
      </div>

      <FocusModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <FocusModal.Content>
          <FocusModal.Header className="justify-start gap-x-6 px-6 py-4">
            <div className="space-y-1">
              <FocusModal.Title>Create new batch</FocusModal.Title>
              <FocusModal.Description>
                Add a new lot, assign quantities, and optionally upload a COA PDF.
              </FocusModal.Description>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="space-y-6 px-6 py-6">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select
                    value={selectedProductId}
                    onValueChange={(value) => {
                      setSelectedProductId(value);
                      setFormValues((prev) => ({ ...prev, variant_id: '' }));
                      setVariants([]);
                    }}
                    disabled={productsLoading}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder={productsLoading ? 'Loading products…' : 'Select a product'} />
                    </Select.Trigger>
                    <Select.Content>
                      {productOptions.map((product) => (
                        <Select.Item key={product.value} value={product.value}>
                          {product.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                  {productsError && <Text className="text-ui-fg-error">{productsError}</Text>}
                  {!productsLoading && !productsError && productOptions.length === 0 && (
                    <Text size="small" className="text-ui-fg-subtle">
                      No products found.
                    </Text>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Variant</Label>
                  <Select
                    value={formValues.variant_id}
                    onValueChange={(value) => setFormValues((prev) => ({ ...prev, variant_id: value }))}
                    disabled={!selectedProductId || variantsLoading}
                  >
                    <Select.Trigger>
                      <Select.Value
                        placeholder={
                          !selectedProductId
                            ? 'Select a product first'
                            : variantsLoading
                              ? 'Loading variants…'
                              : 'Select a variant'
                        }
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {variantOptions.map((variant) => (
                        <Select.Item key={variant.value} value={variant.value}>
                          {variant.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                  {variantsError && <Text className="text-ui-fg-error">{variantsError}</Text>}
                  {!variantsLoading && selectedProductId && !variantsError && variantOptions.length === 0 && (
                    <Text size="small" className="text-ui-fg-subtle">
                      No variants found for this product.
                    </Text>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Lot number</Label>
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      onClick={() => setFormValues({ ...formValues, lot_number: generateLotNumber() })}
                    >
                      Generate
                    </Button>
                  </div>
                  <Input
                    value={formValues.lot_number}
                    onChange={(event) => setFormValues({ ...formValues, lot_number: event.target.value })}
                    placeholder="PNQEML"
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
                  <Label>Received date</Label>
                  <Input
                    type="date"
                    value={formValues.received_at}
                    onChange={(event) => setFormValues({ ...formValues, received_at: event.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>COA file key</Label>
                  <Input
                    value={formValues.coa_file_key}
                    onChange={(event) => setFormValues({ ...formValues, coa_file_key: event.target.value })}
                    placeholder="coa/glp-1/lot-a2.pdf"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supplier invoice link</Label>
                  <Input
                    type="url"
                    value={formValues.invoice_url}
                    onChange={(event) => setFormValues({ ...formValues, invoice_url: event.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lab testing invoice link</Label>
                  <Input
                    type="url"
                    value={formValues.lab_invoice_url}
                    onChange={(event) => setFormValues({ ...formValues, lab_invoice_url: event.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-4">
                  <div className="space-y-3">
                    <Text size="small" className="text-ui-fg-subtle">
                      Upload a COA PDF to link it with this lot.
                    </Text>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id={createUploadInputId}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          void handleCreateUpload(file);
                          event.currentTarget.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={() => triggerFilePicker(createUploadInputId)}
                        disabled={createUploadLoading}
                      >
                        {formValues.coa_file_key ? 'Replace COA PDF' : 'Upload COA PDF'}
                      </Button>
                      {createUploadLoading && <Text className="text-ui-fg-subtle">Uploading…</Text>}
                      {createUploadError && <Text className="text-ui-fg-error">{createUploadError}</Text>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FocusModal.Body>
          <FocusModal.Footer className="flex flex-wrap gap-2 px-6 py-4">
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formValues.variant_id.trim() || !formValues.lot_number.trim()}
            >
              Create batch
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: 'Batches & Lots',
});

export default VariantBatchesSettingsPage;
