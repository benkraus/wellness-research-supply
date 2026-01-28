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

type PriceRule = {
  attribute?: string | null;
  value?: string | null;
};

type PriceSetPrice = {
  id: string;
  amount: number;
  currency_code: string;
  min_quantity?: number | null;
  max_quantity?: number | null;
  created_at?: string;
  updated_at?: string;
  price_rules?: PriceRule[] | null;
};

const buildRules = (price: PriceSetPrice) => {
  const rules: Record<string, string> = {};
  for (const priceRule of price.price_rules || []) {
    const ruleAttribute = priceRule.attribute;
    if (ruleAttribute) {
      rules[ruleAttribute] = priceRule.value ?? '';
    }
  }
  return rules;
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

export const attachVariantPrices = (variants: any[]) => {
  variants.forEach((variant) => {
    const prices = (variant?.price_set?.prices as PriceSetPrice[] | undefined)?.map((price) => ({
      id: price.id,
      amount: price.amount,
      currency_code: price.currency_code,
      min_quantity: price.min_quantity,
      max_quantity: price.max_quantity,
      variant_id: variant.id,
      created_at: price.created_at,
      updated_at: price.updated_at,
      rules: buildRules(price),
    }));

    if (prices) {
      variant.prices = prices;
    }

    if ('price_set' in variant) {
      delete variant.price_set;
    }
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
