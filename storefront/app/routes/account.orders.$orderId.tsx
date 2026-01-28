import { Container } from "@app/components/common/container/Container";
import { formatDate, formatPrice } from "@libs/util";
import { listOrderVariantBatches, retrieveOrder } from "@libs/util/server/data/orders.server";
import { getCustomer } from "@libs/util/server/data/customer.server";
import type { StoreOrder } from "@medusajs/types";
import { Link, type LoaderFunctionArgs, redirect, useLoaderData } from "react-router";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const customer = await getCustomer(request);
	if (!customer) {
		throw redirect("/account");
	}

	if (customer.metadata?.email_verified === false) {
		const params = new URLSearchParams({
			email: customer.email,
			pending: "1",
		});
		throw redirect(`/account/verify-email?${params.toString()}`);
	}

	const orderId = params.orderId;
	if (!orderId) {
		throw redirect("/account");
	}

	const [order, batchAllocations] = await Promise.all([
		retrieveOrder(request, orderId).catch(() => null),
		listOrderVariantBatches(request, orderId).catch(() => null),
	]);
	if (!order) {
		throw redirect("/account");
	}

	return { order, batchAllocations } as { order: StoreOrder; batchAllocations: typeof batchAllocations };
};

export const meta = () => [
	{ title: "Order Details | Wellness Research Supply" },
	{ name: "description", content: "Review your order details." },
];

export default function AccountOrderDetailRoute() {
	const { order, batchAllocations } = useLoaderData<typeof loader>();
	const batchMap = new Map(
		(batchAllocations?.items ?? []).map((item) => [item.line_item_id, item.batches]),
	);

	return (
		<div className="bg-highlight-50 py-16 sm:py-24">
			<Container>
				<div className="mx-auto max-w-4xl">
					<div className="rounded-2xl border border-primary-900/10 bg-highlight-100 p-8 shadow-sm">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<h1 className="text-3xl font-display font-bold text-primary-50">Order #{order.display_id}</h1>
								<p className="mt-2 text-sm text-primary-200">
									Placed {formatDate(new Date(order.created_at as string))}
								</p>
								<p className="mt-1 text-sm text-primary-200 capitalize">
									Status: {order.status?.replace("_", " ") ?? "processing"}
								</p>
							</div>
							<Link
								to="/account"
								className="rounded-full border border-primary-200/30 px-4 py-2 text-sm font-semibold text-primary-50"
							>
								Back to account
							</Link>
						</div>

						<div className="mt-8 grid gap-6 lg:grid-cols-2">
							<div className="rounded-xl border border-primary-900/10 bg-highlight-50 p-6">
								<h2 className="text-lg font-semibold text-primary-50">Summary</h2>
								<div className="mt-4 space-y-2 text-sm text-primary-200">
									<div className="flex items-center justify-between">
										<span>Subtotal</span>
										<span className="text-primary-50">
											{formatPrice(order.item_subtotal || 0, { currency: order.currency_code })}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span>Shipping</span>
										<span className="text-primary-50">
											{formatPrice(order.shipping_total || 0, { currency: order.currency_code })}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span>Taxes</span>
										<span className="text-primary-50">
											{formatPrice(order.tax_total || 0, { currency: order.currency_code })}
										</span>
									</div>
									{(order.discount_total || 0) > 0 && (
										<div className="flex items-center justify-between">
											<span>Discount</span>
											<span className="text-primary-50">
												-{formatPrice(order.discount_total || 0, { currency: order.currency_code })}
											</span>
										</div>
									)}
									<div className="flex items-center justify-between border-t border-primary-900/10 pt-3 text-base">
										<span>Total</span>
										<span className="text-primary-50 font-semibold">
											{formatPrice(order.total || 0, { currency: order.currency_code })}
										</span>
									</div>
								</div>
							</div>

							<div className="rounded-xl border border-primary-900/10 bg-highlight-50 p-6">
								<h2 className="text-lg font-semibold text-primary-50">Shipping</h2>
								<div className="mt-4 space-y-2 text-sm text-primary-200">
									<p className="text-primary-50">
										{order.shipping_address?.first_name} {order.shipping_address?.last_name}
									</p>
									<p>{order.shipping_address?.address_1}</p>
									{order.shipping_address?.address_2 && <p>{order.shipping_address.address_2}</p>}
									<p>
										{order.shipping_address?.city}, {order.shipping_address?.province} {order.shipping_address?.postal_code}
									</p>
									<p className="uppercase">{order.shipping_address?.country_code}</p>
								</div>
							</div>
						</div>

						<div className="mt-8 rounded-xl border border-primary-900/10 bg-highlight-50 p-6">
							<h2 className="text-lg font-semibold text-primary-50">Items</h2>
							<div className="mt-4 space-y-4">
								{order.items?.map((item) => {
									const batches = batchMap.get(item.id) ?? [];

									return (
										<div key={item.id} className="border-b border-primary-900/10 pb-4">
											<div className="flex flex-wrap items-start justify-between gap-4">
												<div>
													<p className="text-primary-50 font-semibold">{item.product_title}</p>
													<p className="text-sm text-primary-200">{item.title}</p>
													<p className="text-sm text-primary-200">Qty {item.quantity}</p>
												</div>
												<p className="text-primary-50 font-semibold">
													{formatPrice(item.unit_price || 0, { currency: order.currency_code })}
												</p>
											</div>
											<div className="mt-3">
												<p className="text-xs uppercase tracking-[0.2em] text-primary-300">Batches</p>
												{batches.length === 0 ? (
													<p className="mt-2 text-xs text-primary-200">Batch details will appear once available.</p>
												) : (
													<div className="mt-2 flex flex-wrap gap-2">
														{batches.map((batch) => (
															<div
																key={batch.id}
																className="flex items-center gap-2 rounded-full border border-primary-200/20 bg-highlight-100 px-3 py-1 text-xs text-primary-200"
															>
															<span className="text-primary-50">Lot {batch.lot_number}</span>
															<span className="text-primary-300">Qty {batch.quantity}</span>
															{batch.coa_url ? (
																<a
																	href={batch.coa_url}
																	target="_blank"
																	rel="noreferrer"
																	className="text-primary-50 underline decoration-primary-200/40 underline-offset-4"
																>
																	COA
																</a>
															) : (
																<span className="text-primary-300">COA pending</span>
															)}
														</div>
														))}
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</Container>
		</div>
	);
}
