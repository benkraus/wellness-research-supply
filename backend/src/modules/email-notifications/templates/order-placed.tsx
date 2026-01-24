import type { OrderAddressDTO, OrderDTO } from "@medusajs/framework/types";
import { Hr, Section, Text } from "@react-email/components";
import { Base } from "./base";

export const ORDER_PLACED = "order-placed";

interface OrderPlacedPreviewProps {
	order: OrderDTO & {
		display_id: string;
		summary: { raw_current_order_total: { value: number } };
	};
	shippingAddress: OrderAddressDTO;
}

export interface OrderPlacedTemplateProps {
	order: OrderDTO & {
		display_id: string;
		summary: { raw_current_order_total: { value: number } };
	};
	shippingAddress: OrderAddressDTO;
	preview?: string;
}

export const isOrderPlacedTemplateData = (
	data: unknown,
): data is OrderPlacedTemplateProps =>
	typeof data === "object" &&
	data !== null &&
	"order" in data &&
	"shippingAddress" in data &&
	typeof (data as { order?: unknown }).order === "object" &&
	typeof (data as { shippingAddress?: unknown }).shippingAddress === "object";

type OrderPlacedTemplateComponent = ((
	props: OrderPlacedTemplateProps,
) => JSX.Element) & {
	PreviewProps: OrderPlacedPreviewProps;
};

export const OrderPlacedTemplate: OrderPlacedTemplateComponent = ({
	order,
	shippingAddress,
	preview = "Your order has been placed!",
}) => {
	return (
		<Base preview={preview}>
			<Section>
				<Text className="text-brand-text text-2xl font-bold text-center mb-8">
					Order Confirmation
				</Text>

				<Text className="text-brand-text mb-4">
					Dear {shippingAddress.first_name} {shippingAddress.last_name},
				</Text>

				<Text className="text-brand-text mb-8">
					Thank you for your recent order! We are processing it with care. Here
					are your order details:
				</Text>

				<Text className="text-brand-muted mb-6">
					We do not accept card payments. You’ll receive payment instructions
					shortly from orders@wellnessresearchsupply.com.
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

				<Hr className="border-brand-teal/20 my-6" />

				<Text className="text-brand-aqua text-lg font-bold mb-4">
					Order Items
				</Text>

				<div className="w-full border-collapse border border-brand-teal/20 rounded overflow-hidden">
					<div className="flex justify-between bg-brand-ink/50 p-2 border-b border-brand-teal/20">
						<Text className="font-bold text-brand-aqua m-0">Item</Text>
						<div className="flex gap-4">
							<Text className="font-bold text-brand-aqua m-0">Qty</Text>
							<Text className="font-bold text-brand-aqua m-0">Price</Text>
						</div>
					</div>
					{order.items.map((item) => (
						<div
							key={item.id}
							className="flex justify-between p-2 border-b border-brand-teal/10 last:border-0"
						>
							<Text className="text-brand-text m-0">
								{item.title} - {item.product_title}
							</Text>
							<div className="flex gap-8">
								<Text className="text-brand-muted m-0">{item.quantity}</Text>
								<Text className="text-brand-text m-0">
									{item.unit_price} {order.currency_code}
								</Text>
							</div>
						</div>
					))}
				</div>
			</Section>
		</Base>
	);
};

OrderPlacedTemplate.PreviewProps = {
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
} as OrderPlacedPreviewProps;

export default OrderPlacedTemplate;
