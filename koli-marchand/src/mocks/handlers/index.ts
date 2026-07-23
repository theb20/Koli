import { authHandlers } from './auth'
import { dashboardHandlers } from './dashboard'
import { productHandlers } from './products'
import { orderHandlers } from './orders'
import { payoutHandlers } from './payouts'
import { customerHandlers } from './customers'
import { promotionHandlers } from './promotions'
import { statsHandlers } from './stats'
import { settingsHandlers } from './settings'

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...productHandlers,
  ...orderHandlers,
  ...payoutHandlers,
  ...customerHandlers,
  ...promotionHandlers,
  ...statsHandlers,
  ...settingsHandlers,
]
