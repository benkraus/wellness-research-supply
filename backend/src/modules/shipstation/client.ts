import { MedusaError } from "@medusajs/framework/utils";
import type { ShipStationOptions } from "./service";
import type {
	CarriersResponse,
	GetShippingRatesRequest,
	GetShippingRatesResponse,
	Label,
	RateResponse,
	Shipment,
	VoidLabelResponse,
} from "./types";

class Semaphore {
	private available: number;
	private queue: Array<() => void> = [];

	constructor(max: number) {
		this.available = Math.max(1, Math.floor(max));
	}

	private async acquire(): Promise<() => void> {
		if (this.available > 0) {
			this.available -= 1;
			return () => this.release();
		}

		return await new Promise((resolve) => {
			this.queue.push(() => {
				this.available -= 1;
				resolve(() => this.release());
			});
		});
	}

	private release() {
		this.available += 1;
		const next = this.queue.shift();
		if (next) next();
	}

	async withPermit<T>(fn: () => Promise<T>): Promise<T> {
		const release = await this.acquire();
		try {
			return await fn();
		} finally {
			release();
		}
	}
}

const SHIPSTATION_MAX_CONCURRENCY = (() => {
	const raw = Number(process.env.SHIPSTATION_MAX_CONCURRENCY ?? 2);
	return Number.isFinite(raw) ? raw : 2;
})();

const shipstationSemaphore = new Semaphore(SHIPSTATION_MAX_CONCURRENCY);

export class ShipStationClient {
	options: ShipStationOptions;

	constructor(options: ShipStationOptions) {
		this.options = options;
	}

	private async sendRequest<T>(url: string, data?: RequestInit): Promise<T> {
		const timeoutMs = this.options.timeout_ms ?? 10_000;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);

		// If a caller passed its own signal, tie it to our controller so either can abort the request.
		const externalSignal = data?.signal;
		if (externalSignal) {
			if (externalSignal.aborted) controller.abort();
			else {
				externalSignal.addEventListener(
					"abort",
					() => {
						controller.abort();
					},
					{ once: true },
				);
			}
		}

		try {
			return await shipstationSemaphore.withPermit(async () => {
				return await fetch(`https://api.shipstation.com/v2${url}`, {
					...data,
					signal: controller.signal,
					headers: {
						...data?.headers,
						"api-key": this.options.api_key,
						"Content-Type": "application/json",
					},
				})
					.then((resp) => {
						const contentType = resp.headers.get("content-type");
						if (!contentType?.includes("application/json")) {
							return resp.text();
						}

						return resp.json();
					})
					.then((resp) => {
						if (typeof resp !== "string" && resp.errors?.length) {
							throw new MedusaError(
								MedusaError.Types.INVALID_DATA,
								`An error occurred while sending a request to ShipStation: ${resp.errors.map(
									(error) => error.message,
								)}`,
							);
						}

						return resp as T;
					});
			});
		} catch (e: any) {
			if (e?.name === "AbortError") {
				throw new MedusaError(
					MedusaError.Types.UNEXPECTED_STATE,
					`ShipStation request timed out after ${timeoutMs}ms`,
				);
			}
			throw e;
		} finally {
			clearTimeout(timeout);
		}
	}

	async getCarriers(): Promise<CarriersResponse> {
		return await this.sendRequest<CarriersResponse>("/carriers");
	}

	async getShippingRates(
		data: GetShippingRatesRequest,
	): Promise<GetShippingRatesResponse> {
		return await this.sendRequest<GetShippingRatesResponse>("/rates", {
			method: "POST",
			body: JSON.stringify(data),
		}).then((resp) => {
			if (resp.rate_response?.errors?.length) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`An error occurred while retrieving rates from ShipStation: ${resp.rate_response.errors.map(
						(error) => error.message,
					)}`,
				);
			}

			return resp;
		});
	}

	async getShipmentRates(id: string): Promise<RateResponse[]> {
		return await this.sendRequest<RateResponse[]>(`/shipments/${id}/rates`);
	}

	async purchaseLabelForShipment(id: string): Promise<Label> {
		return await this.sendRequest<Label>(`/labels/shipment/${id}`, {
			method: "POST",
			body: JSON.stringify({}),
		});
	}

	async getLabel(id: string): Promise<Label> {
		return await this.sendRequest<Label>(`/labels/${id}`);
	}

	async voidLabel(id: string): Promise<VoidLabelResponse> {
		return await this.sendRequest<VoidLabelResponse>(`/labels/${id}/void`, {
			method: "PUT",
		});
	}

	async cancelShipment(id: string): Promise<void> {
		return await this.sendRequest<void>(`/shipments/${id}/cancel`, {
			method: "PUT",
		});
	}

	async getShipment(id: string): Promise<Shipment> {
		return await this.sendRequest<Shipment>(`/shipments/${id}`);
	}
}
