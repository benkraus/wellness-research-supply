import type {
	CalculatedShippingOptionPrice,
	CalculateShippingOptionPriceDTO,
	CartAddressDTO,
	CartLineItemDTO,
	CreateFulfillmentResult,
	CreateShippingOptionDTO,
	FulfillmentDTO,
	FulfillmentItemDTO,
	FulfillmentOrderDTO,
	FulfillmentOption,
	OrderLineItemDTO,
	StockLocationAddressDTO,
} from "@medusajs/framework/types";
import {
	AbstractFulfillmentProviderService,
	MedusaError,
} from "@medusajs/framework/utils";
import { ShipStationClient } from "./client";
import type {
	GetShippingRatesResponse,
	Rate,
	ShipStationAddress,
} from "./types";

export type ShipStationOptions = {
	api_key: string;
};

type FulfillmentContext = {
	from_location?: {
		name?: string;
		address?: Omit<
			StockLocationAddressDTO,
			"created_at" | "updated_at" | "deleted_at"
		>;
	};
	shipping_address?: Omit<
		CartAddressDTO,
		"created_at" | "updated_at" | "deleted_at" | "id"
	>;
	items?: ShipmentItem[];
	currency_code?: string;
};

type ShipmentItem =
	| CartLineItemDTO
	| OrderLineItemDTO
	| NonNullable<FulfillmentOrderDTO["items"]>[number];

class ShipStationProviderService extends AbstractFulfillmentProviderService {
	static identifier = "shipstation";
	protected options_: ShipStationOptions;
	protected client: ShipStationClient;

	constructor(_: unknown, options: ShipStationOptions) {
		super();

		this.options_ = options;
		this.client = new ShipStationClient(options);
	}

	static validateOptions(options: ShipStationOptions) {
		if (!options?.api_key) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"api_key is required in the provider's options",
			);
		}
	}

	async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
		const { carriers } = await this.client.getCarriers();
		const fulfillmentOptions: FulfillmentOption[] = [];

		carriers
			.filter((carrier) => !carrier.disabled_by_billing_plan)
			.forEach((carrier) => {
				carrier.services.forEach((service) => {
					fulfillmentOptions.push({
						id: `${carrier.carrier_id}__${service.service_code}`,
						name: service.name,
						carrier_id: carrier.carrier_id,
						carrier_service_code: service.service_code,
					});
				});
			});

		return fulfillmentOptions;
	}

	async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
		return true;
	}

	private async createShipment({
		carrier_id,
		carrier_service_code,
		from_address,
		to_address,
		items,
		currency_code,
	}: {
		carrier_id: string;
		carrier_service_code: string;
		from_address?: {
			name?: string;
			address?: Omit<
				StockLocationAddressDTO,
				"created_at" | "updated_at" | "deleted_at"
			>;
		};
		to_address?: Omit<
			CartAddressDTO,
			"created_at" | "updated_at" | "deleted_at" | "id"
		>;
		items: ShipmentItem[];
		currency_code: string;
	}): Promise<GetShippingRatesResponse> {
		if (!from_address?.address) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"from_location.address is required to calculate shipping rate",
			);
		}

		const ship_from: ShipStationAddress = {
			name: from_address?.name || "",
			phone: from_address?.address?.phone || "",
			address_line1: from_address?.address?.address_1 || "",
			city_locality: from_address?.address?.city || "",
			state_province: from_address?.address?.province || "",
			postal_code: from_address?.address?.postal_code || "",
			country_code: from_address?.address?.country_code || "",
			address_residential_indicator: "unknown",
		};

		if (!to_address) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"shipping_address is required to calculate shipping rate",
			);
		}

		const ship_to: ShipStationAddress = {
			name: `${to_address.first_name || ""} ${to_address.last_name || ""}`.trim(),
			phone: to_address.phone || "",
			address_line1: to_address.address_1 || "",
			city_locality: to_address.city || "",
			state_province: to_address.province || "",
			postal_code: to_address.postal_code || "",
			country_code: to_address.country_code || "",
			address_residential_indicator: "unknown",
		};

		const totalVials = items.reduce((sum, item) => {
			return sum + (typeof item.quantity === "number" ? item.quantity : 0);
		}, 0);
		const packageCount = Math.max(1, Math.ceil(totalVials / 10));
		const packages = Array.from({ length: packageCount }, () => ({
			weight: {
				value: 4,
				unit: "ounce",
			},
			dimensions: {
				unit: "inch",
				length: 6,
				width: 4,
				height: 1,
			},
		}));

		return await this.client.getShippingRates({
			shipment: {
				carrier_id,
				service_code: carrier_service_code,
				ship_to,
				ship_from,
				validate_address: "no_validation",
				items: items?.map((item) => ({
					name: item.title || "",
					quantity: typeof item.quantity === "number" ? item.quantity : 0,
					sku:
						"variant_sku" in item && typeof item.variant_sku === "string"
							? item.variant_sku
							: "",
				})),
				packages,
				customs: {
					contents: "merchandise",
					non_delivery: "return_to_sender",
				},
			},
			rate_options: {
				carrier_ids: [carrier_id],
				service_codes: [carrier_service_code],
				preferred_currency: currency_code,
			},
		});
	}

	async calculatePrice(
		optionData: CalculateShippingOptionPriceDTO["optionData"],
		data: CalculateShippingOptionPriceDTO["data"],
		context: CalculateShippingOptionPriceDTO["context"],
	): Promise<CalculatedShippingOptionPrice> {
		const { shipment_id } = (data as { shipment_id?: string }) || {};
		const { carrier_id, carrier_service_code } = optionData as {
			carrier_id: string;
			carrier_service_code: string;
		};
		let rate: Rate | undefined;

		if (!shipment_id) {
			const shipment = await this.createShipment({
				carrier_id,
				carrier_service_code,
				from_address: {
					name: context.from_location?.name,
					address: context.from_location?.address,
				},
				to_address: context.shipping_address,
				items: context.items || [],
				currency_code: context.currency_code as string,
			});
			rate = shipment.rate_response.rates[0];
		} else {
			const rateResponse = await this.client.getShipmentRates(shipment_id);
			rate = rateResponse[0]?.rates?.[0];
		}

		const calculatedPrice = !rate
			? 0
			: rate.shipping_amount.amount +
				rate.insurance_amount.amount +
				rate.confirmation_amount.amount +
				rate.other_amount.amount +
				(rate.tax_amount?.amount || 0);

		return {
			calculated_amount: calculatedPrice,
			is_calculated_price_tax_inclusive: !!rate?.tax_amount,
		};
	}

	async validateFulfillmentData(
		optionData: Record<string, unknown>,
		data: Record<string, unknown>,
		context: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		let { shipment_id } = data as {
			shipment_id?: string;
		};

		if (!shipment_id) {
			const { carrier_id, carrier_service_code } = optionData as {
				carrier_id: string;
				carrier_service_code: string;
			};
			const fulfillmentContext = context as FulfillmentContext;
			const shipment = await this.createShipment({
				carrier_id,
				carrier_service_code,
				from_address: {
					name: fulfillmentContext.from_location?.name,
					address: fulfillmentContext.from_location?.address,
				},
				to_address: fulfillmentContext.shipping_address,
				items: fulfillmentContext.items || [],
				currency_code: fulfillmentContext.currency_code || "",
			});
			shipment_id = shipment.shipment_id;
		}

		return {
			...data,
			shipment_id,
		};
	}

	async createFulfillment(
		data: Record<string, unknown>,
		items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
		order: Partial<FulfillmentOrderDTO> | undefined,
		fulfillment: Partial<
			Omit<FulfillmentDTO, "provider_id" | "data" | "items">
		>,
	): Promise<CreateFulfillmentResult> {
		const { shipment_id } = data as {
			shipment_id: string;
		};

		if (!shipment_id) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"shipment_id is required to create a fulfillment",
			);
		}

		const orderItems = Array.isArray(order?.items) ? order.items : [];

		if (!orderItems.length) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"order items are required to create a fulfillment",
			);
		}

		const originalShipment = await this.client.getShipment(shipment_id);
		const orderItemsToFulfill: ShipmentItem[] = [];

		items.forEach((item) => {
			const fulfillmentItem = item as Partial<
				Omit<FulfillmentItemDTO, "fulfillment">
			>;
			if (!fulfillmentItem?.line_item_id) {
				return;
			}

			const orderItem = orderItems.find(
				(orderItem) => orderItem.id === fulfillmentItem.line_item_id,
			);
			if (!orderItem) {
				return;
			}

			orderItemsToFulfill.push({
				...orderItem,
				quantity: fulfillmentItem.quantity ?? orderItem.quantity,
			});
		});

		if (!orderItemsToFulfill.length) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"no order items matched the fulfillment request",
			);
		}

		const newShipment = await this.createShipment({
			carrier_id: originalShipment.carrier_id,
			carrier_service_code: originalShipment.service_code,
			from_address: {
				name: originalShipment.ship_from.name,
				address: {
					...originalShipment.ship_from,
					address_1: originalShipment.ship_from.address_line1,
					city: originalShipment.ship_from.city_locality,
					province: originalShipment.ship_from.state_province,
				},
			},
			to_address: {
				...originalShipment.ship_to,
				address_1: originalShipment.ship_to.address_line1,
				city: originalShipment.ship_to.city_locality,
				province: originalShipment.ship_to.state_province,
			},
			items: orderItemsToFulfill,
			currency_code: order?.currency_code || "",
		});

		const label = await this.client.purchaseLabelForShipment(
			newShipment.shipment_id,
		);
		const labelUrl = label.label_download?.pdf || label.label_download?.href || "";
		const trackingUrl = label.label_download?.href || label.label_download?.pdf || "";
		const existingData = (
			fulfillment as { data?: Record<string, unknown> }
		).data;

		return {
			data: {
				...(existingData || {}),
				label_id: label.label_id,
				shipment_id: label.shipment_id,
			},
			labels: [
				{
					tracking_number: label.tracking_number || "",
					tracking_url: trackingUrl,
					label_url: labelUrl,
				},
			],
		};
	}

	async cancelFulfillment(data: Record<string, unknown>): Promise<void> {
		const { label_id, shipment_id } = data as {
			label_id?: string;
			shipment_id?: string;
		};

		if (!label_id || !shipment_id) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				"label_id and shipment_id are required to cancel a fulfillment",
			);
		}

		await this.client.voidLabel(label_id);
		await this.client.cancelShipment(shipment_id);
	}
}

export default ShipStationProviderService;
