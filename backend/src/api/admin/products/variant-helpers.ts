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

const isPricingField = (fieldName: string) =>
  fieldName.startsWith('variants.prices') ||
  fieldName.startsWith('*variants.prices') ||
  fieldName.startsWith('prices') ||
  fieldName.startsWith('*prices');

export const remapKeysForVariant = (selectFields: string[]) => {
  const variantFields = selectFields.filter((fieldName) => !isPricingField(fieldName));
  const pricingFields = selectFields
    .filter((fieldName) => isPricingField(fieldName))
    .map((fieldName) => fieldName.replace('prices.', 'price_set.prices.'));

  return [...variantFields, ...pricingFields];
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

export const remapVariantResponse = (variant: any) => {
  if (!variant) {
    return variant;
  }

  const prices = variant.price_set?.prices?.map((price: PriceSetPrice) => ({
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

  const response = {
    ...variant,
    prices,
  };

  delete response.price_set;

  return response;
};
