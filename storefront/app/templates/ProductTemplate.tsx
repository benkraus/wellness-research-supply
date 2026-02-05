import { Breadcrumb, Breadcrumbs } from '@app/components/common/breadcrumbs/Breadcrumbs';
import { Button } from '@app/components/common/buttons/Button';
import { Container } from '@app/components/common/container/Container';
import { FieldLabel } from '@app/components/common/forms/fields/FieldLabel';
import { Grid } from '@app/components/common/grid/Grid';
import { GridColumn } from '@app/components/common/grid/GridColumn';
import { SubmitButton } from '@app/components/common/remix-hook-form/buttons/SubmitButton';
import { QuantitySelector } from '@app/components/common/remix-hook-form/field-groups/QuantitySelector';
import { ProductImageGallery } from '@app/components/product/ProductImageGallery';
import { ProductOptionSelectorRadio } from '@app/components/product/ProductOptionSelectorRadio';
import { ProductOptionSelectorSelect } from '@app/components/product/ProductOptionSelectorSelect';
import { ProductPrice } from '@app/components/product/ProductPrice';
import { ProductPriceRange } from '@app/components/product/ProductPriceRange';
import { ProductReviewStars } from '@app/components/reviews/ProductReviewStars';
import { Share } from '@app/components/share';
import { Modal } from '@app/components/common/modals/Modal';
import { HtmlContent } from '@app/components/common/content/HtmlContent';
import { PdfViewer } from '@app/components/common/content/PdfViewer';
import { useCart } from '@app/hooks/useCart';
import { useCustomer } from '@app/hooks/useCustomer';
import { useProductInventory } from '@app/hooks/useProductInventory';
import { useRegion } from '@app/hooks/useRegion';
import { getPosthog } from '@app/lib/posthog';
import { createLineItemSchema } from '@app/routes/api.cart.line-items.create';
import HomeIcon from '@heroicons/react/24/solid/HomeIcon';
import { zodResolver } from '@hookform/resolvers/zod';
import { StoreProductReviewStats } from '@lambdacurry/medusa-plugins-sdk';
import { FetcherKeys } from '@libs/util/fetcher-keys';
import {
  getFilteredOptionValues,
  getOptionValuesWithDiscountLabels,
  selectVariantFromMatrixBySelectedOptions,
  selectVariantMatrix,
} from '@libs/util/products';
import { formatPrice, getVariantFinalPrice } from '@libs/util/prices';
import { StoreProduct, StoreProductOptionValue, StoreProductVariant } from '@medusajs/types';
import truncate from 'lodash/truncate';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useFetcher } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';

/**
 * Generates breadcrumbs for a product page
 * @param product - The product to generate breadcrumbs for
 * @returns An array of breadcrumb objects
 */
const getBreadcrumbs = (product: StoreProduct) => {
  const breadcrumbs: Breadcrumb[] = [
    {
      label: (
        <span className="flex whitespace-nowrap">
          <HomeIcon className="inline h-4 w-4" />
          <span className="sr-only">Home</span>
        </span>
      ),
      url: `/`,
    },
    {
      label: 'All Products',
      url: '/products',
    },
  ];

  if (product.collection) {
    breadcrumbs.push({
      label: product.collection.title,
      url: `/collections/${product.collection.handle}`,
    });
  }

  return breadcrumbs;
};

export interface ProductTemplateProps {
  product: StoreProduct;
  reviewsCount: number;
  reviewStats?: StoreProductReviewStats;
}

type BatchInventorySummary = {
  id: string;
  lot_number?: string | null;
  available_quantity: number;
  has_coa: boolean;
  created_at?: string | Date | null;
};

type VariantWithBatchInventory = StoreProductVariant & {
  batch_inventory?: BatchInventorySummary[];
};

type VariantWithBatchInventoryMetadata = StoreProductVariant & {
  metadata?: {
    batch_inventory?: BatchInventorySummary[];
  } | null;
};

export const ProductTemplate = ({ product, reviewsCount, reviewStats }: ProductTemplateProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const lastProductViewRef = useRef<string | null>(null);
  const lastAddToCartSubmissionRef = useRef<number | null>(null);
  const lastAddToCartCaptureRef = useRef<number | null>(null);
  const lastAddToCartPayloadRef = useRef<Record<string, unknown> | null>(null);
  const addToCartFetcher = useFetcher<any>({ key: FetcherKeys.cart.createLineItem });
  const notifyFetcher = useFetcher<{ success?: boolean; error?: string }>({ key: 'notify' });
  const { toggleCartDrawer } = useCart();
  const { customer } = useCustomer();
  const { region } = useRegion();
  const hasErrors = Object.keys(addToCartFetcher.data?.errors || {}).length > 0;

  // Combine both states to detect adding items as early as possible
  const isAddingToCart = ['submitting', 'loading'].includes(addToCartFetcher.state);

  const defaultValues = {
    productId: product.id!,
    quantity: '1',
    options: useMemo(() => {
      // Get the first variant as the default
      const firstVariant = product.variants?.[0];

      if (firstVariant && firstVariant.options) {
        // Create options object from the first variant
        return firstVariant.options.reduce(
          (acc, option) => {
            if (option.option_id && option.value) {
              acc[option.option_id] = option.value;
            }
            return acc;
          },
          {} as Record<string, string>,
        );
      }

      // Fallback to first option values if no variants
      return (
        product.options?.reduce(
          (acc, option) => {
            if (!option.id || !option.values?.length) return acc;
            acc[option.id] = option.values[0].value;
            return acc;
          },
          {} as Record<string, string>,
        ) || {}
      );
    }, [product]),
  };

  const form = useRemixForm({
    resolver: zodResolver(createLineItemSchema),
    defaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
    fetcher: addToCartFetcher,
    submitConfig: {
      method: 'post',
      action: '/api/cart/line-items/create',
      encType: 'multipart/form-data',
    },
  });

  const breadcrumbs = getBreadcrumbs(product);
  const currencyCode = region.currency_code;
  const [controlledOptions, setControlledOptions] = useState<Record<string, string>>(defaultValues.options);
  const selectedOptions = useMemo(
    () => product.options?.map(({ id }) => controlledOptions[id]),
    [product, controlledOptions],
  );

  const variantMatrix = useMemo(() => selectVariantMatrix(product), [product]);
  const selectedVariant = useMemo(() => {
    return selectVariantFromMatrixBySelectedOptions(variantMatrix, selectedOptions);
  }, [variantMatrix, selectedOptions]);

  const productSelectOptions = useMemo(
    () =>
      product.options?.map((option, index) => {
        // For the first option (Duration), always show all values
        if (index === 0) {
          const optionValuesWithPrices = getOptionValuesWithDiscountLabels(
            index,
            currencyCode,
            option.values || [],
            variantMatrix,
            selectedOptions,
          );

          return {
            title: option.title,
            product_id: option.product_id as string,
            id: option.id,
            values: optionValuesWithPrices,
          };
        }

        // For subsequent options, filter based on previous selections
        const filteredOptionValues = getFilteredOptionValues(product, controlledOptions, option.id);

        // Only include option values that are available based on current selections
        const availableOptionValues = option.values?.filter((optionValue) =>
          filteredOptionValues.some((filteredValue) => filteredValue.value === optionValue.value),
        ) as StoreProductOptionValue[];

        const optionValuesWithPrices = getOptionValuesWithDiscountLabels(
          index,
          currencyCode,
          availableOptionValues || [],
          variantMatrix,
          selectedOptions,
        );

        return {
          title: option.title,
          product_id: option.product_id as string,
          id: option.id,
          values: optionValuesWithPrices,
        };
      }),
    [product, controlledOptions, currencyCode, variantMatrix, selectedOptions],
  );

  const productInventory = useProductInventory(product);
  const selectedAvailability = productInventory.getVariantAvailability(selectedVariant);
  const isPurchasable = selectedAvailability.isPurchasable;
  const isComingSoon = selectedAvailability.isComingSoon;
  const notifyBatchId = selectedAvailability.notifyBatchId;
  const pendingBatchId = selectedAvailability.pendingBatchId;
  const hasContactInfo = Boolean(customer?.email || customer?.phone);
  const pricingTiers = useMemo(() => {
    if (!selectedVariant) return [];

    const prices = ((selectedVariant as { prices?: any[] }).prices ?? []).filter(
      (price) => price?.currency_code === currencyCode,
    );

    const tierPrices = prices
      .filter((price) => price?.min_quantity || price?.max_quantity)
      .map((price) => ({
        min: Number(price.min_quantity ?? 1),
        max: price.max_quantity === null || price.max_quantity === undefined ? null : Number(price.max_quantity),
        amount: Number(price.amount ?? 0),
      }))
      .filter((price) => Number.isFinite(price.amount) && price.amount > 0)
      .sort((a, b) => a.min - b.min);

    if (!tierPrices.length) return [];

    const basePrice =
      prices.find((price) => !price.min_quantity && !price.max_quantity)?.amount ??
      getVariantFinalPrice(selectedVariant);

    return tierPrices.map((tier) => {
      const label = tier.max && tier.max >= tier.min ? `${tier.min}-${tier.max}` : `${tier.min}+`;
      const discount = basePrice ? Math.round(((basePrice - tier.amount) / basePrice) * 100) : null;

      return {
        label,
        price: formatPrice(tier.amount, { currency: currencyCode }),
        discount: discount && discount > 0 ? discount : null,
      };
    });
  }, [currencyCode, selectedVariant]);

  const selectedVariantBatches = useMemo(() => {
    if (!selectedVariant) return [] as BatchInventorySummary[];
    return (
      (selectedVariant as VariantWithBatchInventory).batch_inventory ??
      (selectedVariant as VariantWithBatchInventoryMetadata).metadata?.batch_inventory ??
      []
    );
  }, [selectedVariant]);

  const activeBatches = useMemo(() => {
    if (!selectedVariantBatches.length) return [] as BatchInventorySummary[];
    return [...selectedVariantBatches]
      .filter((batch) => batch.available_quantity > 0)
      .sort((a, b) => {
        if (b.available_quantity !== a.available_quantity) {
          return b.available_quantity - a.available_quantity;
        }
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [selectedVariantBatches]);

  const activeCoaBatches = useMemo(() => {
    return activeBatches
      .filter((batch) => batch.has_coa && batch.lot_number)
      .slice(0, 2);
  }, [activeBatches]);

  const hasAvailableCoa = activeCoaBatches.length > 0;
  const [coaModalLot, setCoaModalLot] = useState<string | null>(null);

  useEffect(() => {
    if (!product?.id) return;
    const posthog = getPosthog();
    if (!posthog) return;
    if (lastProductViewRef.current === product.id) return;

    const payload: Record<string, unknown> = {
      product_id: product.id,
      product_title: product.title,
      currency: currencyCode,
    };

    if (product.handle) payload.product_handle = product.handle;
    if (selectedVariant?.id) payload.variant_id = selectedVariant.id;
    if (selectedVariant?.title) payload.variant_title = selectedVariant.title;

    posthog.capture('product_viewed', payload);
    lastProductViewRef.current = product.id;
  }, [product.id, product.title, product.handle, currencyCode, selectedVariant?.id, selectedVariant?.title]);

  /**
   * Updates controlled options based on a changed option and resets subsequent options
   * @param currentOptions - Current controlled options
   * @param changedOptionId - ID of the option that changed
   * @param newValue - New value for the changed option
   * @returns Updated options object
   */
  const updateControlledOptions = (
    currentOptions: Record<string, string>,
    changedOptionId: string,
    newValue: string,
  ): Record<string, string> => {
    // Create new options object with the changed option
    const newOptions = { ...currentOptions };
    newOptions[changedOptionId] = newValue;

    // Get all option IDs in order
    const allOptionIds = product.options?.map((option) => option.id) || [];

    // Find the index of the changed option
    const changedOptionIndex = allOptionIds.indexOf(changedOptionId);

    // Get all options that come after the changed one
    const subsequentOptionIds = changedOptionIndex >= 0 ? allOptionIds.slice(changedOptionIndex + 1) : [];

    // Reset all subsequent options to their first available value
    if (subsequentOptionIds.length > 0) {
      // For each subsequent option, find available values based on current selections
      subsequentOptionIds.forEach((optionId) => {
        if (!optionId) return;

        // Get filtered option values for this option
        const filteredValues = getFilteredOptionValues(product, newOptions, optionId);

        if (filteredValues.length > 0) {
          // Set to first available value
          newOptions[optionId] = filteredValues[0].value;
        } else {
          // No valid options, set to empty
          newOptions[optionId] = '';
        }
      });
    }

    return newOptions;
  };

  const handleOptionChangeBySelect = (e: ChangeEvent<HTMLInputElement>) => {
    const changedOptionId = e.target.name.replace('options.', '');
    const newValue = e.target.value;
    const newOptions = updateControlledOptions(controlledOptions, changedOptionId, newValue);
    setControlledOptions(newOptions);
    form.setValue('options', newOptions);
  };

  const handleOptionChangeByRadio = (name: string, value: string) => {
    const newOptions = updateControlledOptions(controlledOptions, name, value);
    setControlledOptions(newOptions);
    form.setValue('options', newOptions);
  };

  useEffect(() => {
    if (!isAddingToCart && !hasErrors) {
      // Only reset the form fields, not the controlled options
      if (formRef.current) {
        // Reset the form to clear validation states
        formRef.current.reset();

        // Re-set the quantity field to 1
        const quantityField = formRef.current.querySelector(
          'select[name="quantity"], input[name="quantity"]'
        ) as HTMLSelectElement | HTMLInputElement | null;
        if (quantityField) {
          quantityField.value = '1';
        }

        // Keep the hidden productId field
        const productIdInput = formRef.current.querySelector('input[name="productId"]') as HTMLInputElement;
        if (productIdInput) {
          productIdInput.value = product.id!;
        }
      }
    }
  }, [isAddingToCart, hasErrors, product.id]);

  useEffect(() => {
    // Initialize controlledOptions with defaultValues.options only on initial load
    if (Object.keys(controlledOptions).length === 0) {
      setControlledOptions(defaultValues.options);
    }
  }, [defaultValues.options, controlledOptions]);

  useEffect(() => {
    // Initialize controlledOptions with defaultValues.options
    setControlledOptions(defaultValues.options);
  }, [defaultValues.options]);

  const soldOut = !isPurchasable;
  const renderCoaPanel = (variant: 'highlight' | 'default') => {
    const isHighlight = variant === 'highlight';
    const headingId = isHighlight ? 'coa-availability' : 'coa-transparency';
    const description = isHighlight
      ? 'View the Certificate of Analysis for the in-stock lot(s) below.'
      : 'We obtain Certificates of Analysis (COAs) for each batch. The store may have multiple batches of the same product on hand at once, so there is not a single COA displayed on the product page.';

    return (
      <section
        aria-labelledby={headingId}
        className={`mt-4 rounded-2xl border ${
          isHighlight ? 'border-primary-200/40 bg-primary-500/10' : 'border-primary-200/20 bg-highlight-100/20'
        } p-4 sm:p-5 shadow-[0_16px_40px_-32px_rgba(45,212,191,0.65)]`}
      >
        <p
          className={`text-2xs uppercase tracking-[0.3em] ${
            isHighlight ? 'text-primary-100' : 'text-primary-300'
          }`}
        >
          {isHighlight ? 'COA available' : 'COA transparency'}
        </p>
        <h4 id={headingId} className="mt-2 text-base font-semibold text-primary-50">
          {isHighlight ? 'Certificates of Analysis for this batch' : 'Certificates of Analysis are batch specific'}
        </h4>
        <p className="mt-2 text-sm text-primary-200">{description}</p>
        <div className="mt-4 space-y-2">
          {activeCoaBatches.length > 0 ? (
            activeCoaBatches.map((batch) => (
              <button
                key={batch.id}
                type="button"
                onClick={() => setCoaModalLot(batch.lot_number ?? null)}
                className="inline-flex items-center gap-2 rounded-full border border-primary-200/30 px-4 py-2 text-xs font-semibold text-primary-50 hover:bg-highlight-100/40"
              >
                View COA PDF
                {batch.lot_number ? (
                  <span className="text-primary-200">(Lot {batch.lot_number})</span>
                ) : null}
              </button>
            ))
          ) : activeBatches.length > 0 ? (
            <p className="text-sm text-primary-200">COA pending for the current batch.</p>
          ) : (
            <p className="text-sm text-primary-200">No active batches available.</p>
          )}
        </div>
        <p className="mt-3 text-xs text-primary-200">
          Have a lot number?{' '}
          <Link to="/coa" className="font-semibold text-primary-50 underline underline-offset-4">
            Look up your COA
          </Link>
          .
        </p>
      </section>
    );
  };

  // Use useCallback for the form submission handler
  const handleAddToCart = useCallback(() => {
    const quantityField = formRef.current?.querySelector(
      'select[name="quantity"], input[name="quantity"]'
    ) as HTMLSelectElement | HTMLInputElement | null;
    const quantityValue = quantityField?.value ?? '1';
    const quantity = Number(quantityValue);
    const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    lastAddToCartSubmissionRef.current = Date.now();
    lastAddToCartPayloadRef.current = {
      product_id: product.id,
      product_title: product.title,
      product_handle: product.handle,
      variant_id: selectedVariant?.id,
      variant_title: selectedVariant?.title,
      quantity: normalizedQuantity,
      currency: currencyCode,
    };

    // Open cart drawer
    toggleCartDrawer(true);
  }, [currencyCode, product.handle, product.id, product.title, selectedVariant?.id, selectedVariant?.title, toggleCartDrawer]);

  useEffect(() => {
    if (addToCartFetcher.state !== 'idle') return;
    if (!addToCartFetcher.data?.cart || hasErrors) return;

    const submissionId = lastAddToCartSubmissionRef.current;
    if (!submissionId || lastAddToCartCaptureRef.current === submissionId) return;

    const posthog = getPosthog();
    if (!posthog) return;

    const payload = {
      ...(lastAddToCartPayloadRef.current ?? {}),
      cart_id: addToCartFetcher.data.cart.id,
    };

    posthog.capture('add_to_cart', payload);
    lastAddToCartCaptureRef.current = submissionId;
  }, [addToCartFetcher.state, addToCartFetcher.data?.cart, hasErrors]);

  return (
    <>
      <section className="pb-12 pt-12 xl:pt-24 min-h-screen">
        <RemixFormProvider {...form}>
          <addToCartFetcher.Form
            id="addToCartForm"
            ref={formRef}
            method="post"
            action="/api/cart/line-items/create"
            onSubmit={handleAddToCart}
          >
            <input type="hidden" name="productId" value={product.id} />

            <Container className="px-0 sm:px-6 md:px-8">
              <Grid className="items-start">
                <GridColumn>
                  <div className="md:py-6">
                    <Grid className="!gap-0">
                      <GridColumn className="flex flex-col md:col-span-8 lg:col-span-8 lg:pr-8 xl:pr-12">
                        <div className="relative overflow-hidden rounded-3xl bg-highlight-100/10 px-0 sm:px-6 md:p-10 md:pt-0 shadow-[0_20px_60px_-45px_rgba(45,212,191,0.65)]">
                          <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-primary-400/10 blur-3xl" />
                          <div className="pointer-events-none absolute -bottom-16 right-12 h-40 w-40 rounded-full bg-highlight-200/15 blur-3xl" />
                          <div>
                            <Breadcrumbs className="mb-6 text-primary-200" breadcrumbs={breadcrumbs} />

                            <header className="flex gap-4 mb-2">
                              <h1 className="text-3xl font-bold tracking-tight text-primary-50 sm:text-4xl sm:tracking-tight">
                                {product.title}
                              </h1>
                              <div className="flex-1" />
                              <Share
                                itemType="product"
                                shareData={{
                                  title: product.title,
                                  text: truncate(product.description || 'Check out this product', {
                                    length: 200,
                                    separator: ' ',
                                  }),
                                }}
                              />
                            </header>
                          </div>

                          <ProductReviewStars reviewsCount={reviewsCount} reviewStats={reviewStats} />

                          <section aria-labelledby="product-information" className="mt-5">
                            <h2 id="product-information" className="sr-only">
                              Product information
                            </h2>

                            <p className="text-lg text-primary-50 sm:text-xl flex gap-3">
                              {selectedVariant ? (
                                <ProductPrice product={product} variant={selectedVariant} currencyCode={currencyCode} />
                              ) : (
                                <ProductPriceRange product={product} currencyCode={currencyCode} />
                              )}
                            </p>
                            {pricingTiers.length > 0 && (
                              <div className="mt-4 rounded-2xl border border-primary-200/20 bg-highlight-100/15 p-4 sm:p-5 shadow-[0_16px_40px_-32px_rgba(45,212,191,0.5)]">
                                <p className="text-2xs uppercase tracking-[0.3em] text-primary-300">
                                  Volume pricing
                                </p>
                                <div className="mt-3 grid gap-2 text-sm text-primary-100">
                                  {pricingTiers.map((tier) => (
                                    <div key={tier.label} className="flex flex-wrap items-center gap-3">
                                      <span className="rounded-full border border-primary-200/30 px-3 py-1 text-xs font-semibold text-primary-50">
                                        {tier.label} vials
                                      </span>
                                      <span className="text-primary-50">{tier.price} each</span>
                                      {tier.discount ? (
                                        <span className="text-primary-200">Save {tier.discount}%</span>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {hasAvailableCoa && renderCoaPanel('highlight')}
                          </section>

                          {productSelectOptions && productSelectOptions.length > 5 && (
                            <section aria-labelledby="product-options" className="product-options">
                              <h2 id="product-options" className="sr-only">
                                Product options
                              </h2>

                              <div className="space-y-4">
                                {productSelectOptions.map((option) => (
                                  <ProductOptionSelectorSelect
                                    key={option.id}
                                    option={option}
                                    value={controlledOptions[option.id]}
                                    onChange={handleOptionChangeBySelect}
                                    currencyCode={currencyCode}
                                  />
                                ))}
                              </div>
                            </section>
                          )}

                          {productSelectOptions && productSelectOptions.length <= 5 && (
                            <section aria-labelledby="product-options" className="product-options my-8 grid gap-4">
                              <h2 id="product-options" className="sr-only">
                                Product options
                              </h2>
                              {productSelectOptions.map((option) => (
                                <div key={option.id}>
                                  <FieldLabel className="mb-2 text-primary-200">{option.title}</FieldLabel>
                                  <ProductOptionSelectorRadio
                                    option={option}
                                    value={controlledOptions[option.id]}
                                    onChange={handleOptionChangeByRadio}
                                    currencyCode={currencyCode}
                                  />
                                </div>
                              ))}
                            </section>
                          )}

                            <div className="my-2 flex flex-col gap-2">
                              <div className="flex items-center gap-4 py-2">
                                {!soldOut && <QuantitySelector variant={selectedVariant} />}
                                <div className="flex-1">
                                  {!soldOut ? (
                                    <SubmitButton className="!h-12 w-full whitespace-nowrap !text-base !font-bold bg-primary-500 hover:bg-primary-400 text-primary-900 shadow-[0_10px_30px_-20px_rgba(45,212,191,0.7)]">
                                      {isAddingToCart ? 'Adding...' : 'Add to cart'}
                                    </SubmitButton>
                                  ) : (
                                    <SubmitButton
                                      disabled
                                      className="pointer-events-none !h-12 w-full !text-base !font-bold !opacity-100 bg-highlight-100/35 border border-primary-300/30 text-primary-200/80 shadow-none"
                                    >
                                      {isComingSoon ? 'Coming soon' : 'Sold out'}
                                    </SubmitButton>
                                  )}
                                </div>
                              </div>

                              {isComingSoon && (
                                <div className="rounded-2xl border border-amber-200/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                                  Coming soon, pending lab results for this batch.
                                </div>
                              )}

                              {!isPurchasable && (
                                <div className="rounded-2xl border border-primary-200/20 bg-highlight-100/20 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.3em] text-primary-300">Notify me</p>
                                  <div className="mt-3">
                                    {!customer?.id ? (
                                      <Button
                                        as={(buttonProps) => (
                                          <Link to="/account" {...buttonProps} />
                                        )}
                                        className="!h-11 w-full !text-sm !font-bold"
                                      >
                                        Sign in to get notified
                                      </Button>
                                    ) : !hasContactInfo ? (
                                      <p className="text-sm text-primary-200">
                                        Add an email or phone number in your{' '}
                                        <Link
                                          to="/account"
                                          className="font-semibold text-primary-50 underline underline-offset-4"
                                        >
                                          account settings
                                        </Link>{' '}
                                        to get notified.
                                      </p>
                                    ) : notifyBatchId ? (
                                      <Button
                                        type="button"
                                        className="!h-11 w-full !text-sm !font-bold"
                                        disabled={notifyFetcher.state !== 'idle'}
                                        onClick={() =>
                                          notifyFetcher.submit(
                                            { variant_batch_id: notifyBatchId },
                                            { method: 'post', action: '/api/notify' },
                                          )
                                        }
                                      >
                                        {notifyFetcher.state !== 'idle' ? 'Saving…' : 'Notify me'}
                                      </Button>
                                    ) : (
                                      <p className="text-sm text-primary-200">Notify is unavailable for this batch.</p>
                                    )}
                                  </div>
                                  {notifyFetcher.data?.error && (
                                    <p className="mt-3 text-sm text-red-300">{notifyFetcher.data.error}</p>
                                  )}
                                  {notifyFetcher.data?.success && (
                                    <p className="mt-3 text-sm text-emerald-300">
                                      You’re on the list. We’ll notify you when it’s available.
                                    </p>
                                  )}
                                  {pendingBatchId && !isComingSoon && (
                                    <p className="mt-2 text-xs text-primary-300">Batch {pendingBatchId}</p>
                                  )}
                                </div>
                              )}

                            {!!product.description && (
                              <div className="mt-4">
                                <h3 className="mb-2 text-primary-200">Description</h3>
                                <HtmlContent
                                  html={product.description}
                                  className="prose prose-invert max-w-none text-primary-100"
                                />
                              </div>
                            )}

                            {!hasAvailableCoa && renderCoaPanel('default')}

                            {product.categories && product.categories.length > 0 && (
                              <nav aria-label="Categories" className="mt-4">
                                <h3 className="mb-2 text-primary-200">Categories</h3>

                                <ol className="flex flex-wrap items-center gap-2 text-xs text-primary-200">
                                  {product.categories.map((category) => (
                                    <li key={`${category.id ?? category.handle ?? category.name}` }>
                                      <Button
                                        as={(buttonProps) => (
                                          <Link to={`/categories/${category.handle}`} {...buttonProps} />
                                        )}
                                        className="!h-auto whitespace-nowrap !rounded !px-2 !py-1 !text-xs !font-bold"
                                      >
                                        {category.name}
                                      </Button>
                                    </li>
                                  ))}
                                </ol>
                              </nav>
                            )}

                            {product.tags && product.tags.length > 0 && (
                              <nav aria-label="Tags" className="mt-4">
                                <h3 className="mb-2 text-primary-200">Tags</h3>

                                <ol className="flex flex-wrap items-center gap-2 text-xs text-primary-200">
                                  {product.tags.map((tag) => (
                                    <li key={`${tag.id ?? tag.value}` }>
                                      <Button className="!h-auto whitespace-nowrap !rounded !px-2 !py-1 !text-xs !font-bold bg-accent-900 cursor-default">
                                        {tag.value}
                                      </Button>
                                    </li>
                                  ))}
                                </ol>
                              </nav>
                            )}
                          </div>
                        </div>
                      </GridColumn>

                      <GridColumn className="mb-10 md:col-span-4 lg:col-span-4 lg:pl-6 xl:pl-10">
                        <div className="md:sticky md:top-24">
                          <div className="mx-auto w-full max-w-xs lg:max-w-[220px] xl:max-w-xs">
                            <ProductImageGallery key={product.id} product={product} />
                          </div>
                        </div>
                      </GridColumn>
                    </Grid>
                  </div>
                </GridColumn>
              </Grid>
            </Container>
          </addToCartFetcher.Form>
        </RemixFormProvider>
      </section>
      <Modal isOpen={Boolean(coaModalLot)} onClose={() => setCoaModalLot(null)}>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">COA PDF</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {coaModalLot ? `Lot ${coaModalLot}` : 'Certificate of Analysis'}
            </h3>
          </div>
          {coaModalLot && (
            <div className="h-[75vh] w-full overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/40 p-4">
              <PdfViewer url={`/api/coa/${encodeURIComponent(coaModalLot)}/pdf`} />
            </div>
          )}
          {coaModalLot && (
            <a
              href={`/api/coa/${encodeURIComponent(coaModalLot)}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-primary-600 underline underline-offset-4"
            >
              Open PDF in a new tab
            </a>
          )}
        </div>
      </Modal>
    </>
  );
};
