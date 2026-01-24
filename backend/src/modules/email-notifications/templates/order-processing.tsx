import type { OrderAddressDTO, OrderDTO } from "@medusajs/framework/types";
import { Hr, Section, Text } from "@react-email/components";
import { Base } from "./base";

export const ORDER_PROCESSING = "order-processing";

interface OrderProcessingPreviewProps {
	order: OrderDTO & {
		display_id: string;
		summary: { raw_current_order_total: { value: number } };
	};
	shippingAddress: OrderAddressDTO;
}

export interface OrderProcessingTemplateProps {
	order: OrderDTO & {
		display_id: string;
		summary: { raw_current_order_total: { value: number } };
	};
	shippingAddress: OrderAddressDTO;
	preview?: string;
}

export const isOrderProcessingTemplateData = (
	data: unknown,
): data is OrderProcessingTemplateProps =>
	typeof data === "object" &&
	data !== null &&
	"order" in data &&
	"shippingAddress" in data &&
	typeof (data as { order?: unknown }).order === "object" &&
	typeof (data as { shippingAddress?: unknown }).shippingAddress === "object";

type OrderProcessingTemplateComponent = ((
	props: OrderProcessingTemplateProps,
) => JSX.Element) & {
	PreviewProps: OrderProcessingPreviewProps;
};

export const OrderProcessingTemplate: OrderProcessingTemplateComponent = ({
	order,
	shippingAddress,
	preview = "Your payment was received and your order is processing.",
}) => {
	return (
		<Base preview={preview}>
			<Section>
				<Text className="text-brand-text text-2xl font-bold text-center mb-6">
					Payment received
				</Text>

				<Text className="text-brand-text mb-4">
					Hi {shippingAddress.first_name} {shippingAddress.last_name},
				</Text>

				<Text className="text-brand-text mb-6">
					We received your Venmo payment. Your order is now processing and
					we’ll let you know when it ships.
				</Text>

				<Text className="text-brand-aqua text-lg font-bold mb-2">
					Order Summary
				</Text>
				<Text className="text-brand-muted mb-1">
					Order ID: <span className="text-brand-text">{order.display_id}</span>
				</Text>
				<Text className="text-brand-muted mb-1">
					Order Date:{" "}
					<span className="text-brand-text">
						{new Date(order.created_at).toLocaleDateString()}
					</span>
				</Text>
				<Text className="text-brand-muted mb-6">
					Total:{" "}
					<span className="text-brand-mint font-bold">
						{order.summary.raw_current_order_total.value} {order.currency_code}
					</span>
				</Text>

				<Hr className="border-brand-teal/20 my-6" />

				<Text className="text-brand-aqua text-lg font-bold mb-2">
					Shipping Address
				</Text>
				<Text className="text-brand-text mb-1">
					{shippingAddress.address_1}
				</Text>
				<Text className="text-brand-text mb-1">
					{shippingAddress.city}, {shippingAddress.province}{" "}
					{shippingAddress.postal_code}
				</Text>
				<Text className="text-brand-text mb-6">
					{shippingAddress.country_code}
				</Text>
			</Section>
		</Base>
	);
};

OrderProcessingTemplate.PreviewProps = {
	order: {
		id: "test-order-id",
		display_id: "ORD-123",
		created_at: new Date().toISOString(),
		email: "test@example.com",
		currency_code: "USD",
		items: [
			{
				id: "item-1",
				title: "Item 1",
				product_title: "Product 1",
				quantity: 2,
				unit_price: 10,
			},
			{
				id: "item-2",
				title: "Item 2",
				product_title: "Product 2",
				quantity: 1,
				unit_price: 25,
			},
		],
		shipping_address: {
			first_name: "Test",
			last_name: "User",
			address_1: "123 Main St",
			city: "Anytown",
			province: "CA",
			postal_code: "12345",
			country_code: "US",
		},
		summary: { raw_current_order_total: { value: 45 } },
	},
	shippingAddress: {
		first_name: "Test",
		last_name: "User",
		address_1: "123 Main St",
		city: "Anytown",
		province: "CA",
		postal_code: "12345",
		country_code: "US",
	},
} as OrderProcessingPreviewProps;

export default OrderProcessingTemplate;
