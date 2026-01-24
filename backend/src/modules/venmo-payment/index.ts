import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import VenmoPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [VenmoPaymentProviderService],
})
