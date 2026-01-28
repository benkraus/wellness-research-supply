import { refetchEntity } from '@medusajs/framework/http';
import { Modules, calculateAmountsWithTax } from '@medusajs/framework/utils';

type TaxableVariant = {
  id?: string;
  calculated_price?: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
    is_calculated_price_tax_inclusive: boolean;
    is_original_price_tax_inclusive: boolean;
    calculated_amount_with_tax?: number;
    calculated_amount_without_tax?: number;
    original_amount_with_tax?: number;
    original_amount_without_tax?: number;
  };
};

type TaxableProduct = {
  id?: string;
  type_id?: string | null;
  variants?: TaxableVariant[];
  categories?: Array<{ is_internal?: boolean }>;
};

export const refetchProduct = async (
  idOrFilter: Record<string, unknown>,
  scope: any,
  fields: string[],
) => {
  return await refetchEntity({ entity: 'product', idOrFilter, scope, fields });
};

export const filterOutInternalProductCategories = (products: TaxableProduct[]) => {
  products.forEach((product) => {
    if (!product.categories) {
      return;
    }
    product.categories = product.categories.filter((category) => !category.is_internal);
  });
};

export const wrapProductsWithTaxPrices = async (req: any, products: TaxableProduct[]) => {
  const taxContext = req?.taxContext as
    | {
        taxInclusivityContext?: { automaticTaxes?: boolean };
        taxLineContext?: Record<string, unknown>;
      }
    | undefined;

  if (!taxContext?.taxInclusivityContext || !taxContext?.taxLineContext) {
    return;
  }

  if (!taxContext.taxInclusivityContext.automaticTaxes) {
    return;
  }

  const taxService = req.scope.resolve(Modules.TAX) as any;
  const taxRates = await taxService.getTaxLines(
    products.map(asTaxItem).flat(),
    taxContext.taxLineContext,
  );

  const taxRatesMap = new Map<string, any[]>();
  (taxRates as any[]).forEach((taxRate) => {
    const lineItemId = taxRate.line_item_id as string | undefined;
    if (!lineItemId) {
      return;
    }
    if (!taxRatesMap.has(lineItemId)) {
      taxRatesMap.set(lineItemId, []);
    }
    taxRatesMap.get(lineItemId)?.push(taxRate);
  });

  products.forEach((product) => {
    product.variants?.forEach((variant) => {
      if (!variant.calculated_price) {
        return;
      }

      const taxRatesForVariant = taxRatesMap.get(variant.id ?? '') || [];
      const { priceWithTax, priceWithoutTax } = calculateAmountsWithTax({
        taxLines: taxRatesForVariant,
        amount: variant.calculated_price.calculated_amount,
        includesTax: variant.calculated_price.is_calculated_price_tax_inclusive,
      });

      variant.calculated_price.calculated_amount_with_tax = priceWithTax;
      variant.calculated_price.calculated_amount_without_tax = priceWithoutTax;

      const { priceWithTax: originalPriceWithTax, priceWithoutTax: originalPriceWithoutTax } =
        calculateAmountsWithTax({
          taxLines: taxRatesForVariant,
          amount: variant.calculated_price.original_amount,
          includesTax: variant.calculated_price.is_original_price_tax_inclusive,
        });

      variant.calculated_price.original_amount_with_tax = originalPriceWithTax;
      variant.calculated_price.original_amount_without_tax = originalPriceWithoutTax;
    });
  });
};

const asTaxItem = (product: TaxableProduct) => {
  return (
    product.variants
      ?.map((variant) => {
        if (!variant.calculated_price) {
          return undefined;
        }

        return {
          id: variant.id,
          product_id: product.id,
          product_type_id: product.type_id,
          quantity: 1,
          unit_price: variant.calculated_price.calculated_amount,
          currency_code: variant.calculated_price.currency_code,
        };
      })
      .filter((variant) => Boolean(variant)) ?? []
  );
};
