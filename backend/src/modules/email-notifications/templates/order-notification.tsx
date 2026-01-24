import type { OrderAddressDTO, OrderDTO } from "@medusajs/framework/types";
import { Hr, Section, Text } from "@react-email/components";
import { Base } from "./base";

export const ORDER_NOTIFICATION = "order-notification";

interface OrderNotificationPreviewProps {
	order: OrderDTO & {
		display_id: string;
		summary: { raw_current_order_total: { value: number } };
	};
	shippingAddress: OrderAddressDTO;
}

export interface OrderNotificationTemplateProps {
	order: OrderDTO & {
		display_id: string;
		summary: { raw_current_order_total: { value: number } };
	};
	shippingAddress: OrderAddressDTO;
	preview?: string;
}

export const isOrderNotificationTemplateData = (
	data: unknown,
): data is OrderNotificationTemplateProps =>
	typeof data === "object" &&
	data !== null &&
	"order" in data &&
	"shippingAddress" in data &&
	typeof (data as { order?: unknown }).order === "object" &&
	typeof (data as { shippingAddress?: unknown }).shippingAddress === "object";

type OrderNotificationTemplateComponent = ((
	props: OrderNotificationTemplateProps,
) => JSX.Element) & {
	PreviewProps: OrderNotificationPreviewProps;
};

export const OrderNotificationTemplate: OrderNotificationTemplateComponent = ({
	order,
	shippingAddress,
	preview = "New paid order received.",
}) => {
	return (
		<Base preview={preview}>
			<Section>
				<Text className="text-brand-text text-2xl font-bold text-center mb-6">
					New paid order
				</Text>

				<Text className="text-brand-text mb-4">
					Order #{order.display_id} has been paid via Venmo.
				</Text>

				<Text className="text-brand-muted mb-6">
					Customer: {order.email}
				</Text>

				<Text className="text-brand-aqua text-lg font-bold mb-2">
					Order Summary
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

OrderNotificationTemplate.PreviewProps = {
	order: {
		id: "test-order-id",
		display_id: "ORD-123",
		created_at: new Date().toISOString(),
		email: "customer@example.com",
		currency_code: "USD",
		items: [
			{
				id: "item-1",
				title: "Item 1",
				product_title: "Product 1",
				quantity: 2,
				unit_price: 10,
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
} as OrderNotificationPreviewProps;

export default OrderNotificationTemplate;
