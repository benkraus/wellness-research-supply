import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import EDebitPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [EDebitPaymentProviderService],
})
