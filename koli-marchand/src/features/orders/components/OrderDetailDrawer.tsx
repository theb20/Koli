import { Drawer } from '@/components/ui/Drawer'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtDateTime, fmtFcfa } from '@/lib/format'
import { orderStatusMap, paymentMethodLabels } from '@/lib/statusMaps'
import type { OrderStatus } from '@/types'
import { useOrder, useUpdateOrderStatus } from '../api/useOrders'

interface OrderDetailDrawerProps {
  orderId: string
  onClose: () => void
}

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled']

export function OrderDetailDrawer({ orderId, onClose }: OrderDetailDrawerProps) {
  const { data: order, isLoading } = useOrder(orderId)
  const updateStatus = useUpdateOrderStatus()

  return (
    <Drawer title={order ? order.orderNumber : 'Commande'} onClose={onClose}>
      {isLoading && <p className="text-sm text-[#6b6b68]">Chargement…</p>}

      {order && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <StatusBadge label={orderStatusMap[order.status].label} tone={orderStatusMap[order.status].tone} />
            <p className="text-xs text-[#6b6b68]">{fmtDateTime(order.createdAt)}</p>
          </div>

          <div>
            <label htmlFor="order-status" className="block text-xs font-semibold text-[#0a0a0b] mb-1.5">
              Changer le statut
            </label>
            <select
              id="order-status"
              value={order.status}
              disabled={updateStatus.isPending}
              onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value as OrderStatus })}
              className="w-full rounded-xl border border-[#e8e8e4] px-3 py-2.5 text-sm focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {orderStatusMap[s].label}
                </option>
              ))}
            </select>
          </div>

          <section>
            <h3 className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-2">Articles</h3>
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <img src={item.thumbnail} alt="" className="w-11 h-11 rounded-lg object-cover bg-[#f5f5f3] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0a0a0b] truncate">{item.productName}</p>
                    <p className="text-xs text-[#6b6b68]">
                      {item.quantity} × {fmtFcfa(item.unitPrice)}
                    </p>
                  </div>
                  <span className="text-sm font-bold shrink-0">{fmtFcfa(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between pt-3 mt-3 border-t border-[#e8e8e4]">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-bold">{fmtFcfa(order.totalAmount)}</span>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-2">Client</h3>
            <p className="text-sm font-semibold text-[#0a0a0b]">{order.customer.name}</p>
            <p className="text-sm text-[#6b6b68]">{order.customer.phone}</p>
            {order.customer.email && <p className="text-sm text-[#6b6b68]">{order.customer.email}</p>}
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-2">Adresse de livraison</h3>
            <p className="text-sm text-[#0a0a0b]">{order.shippingAddress.address}</p>
            <p className="text-sm text-[#6b6b68]">
              {order.shippingAddress.city}, {order.shippingAddress.country}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-2">Paiement</h3>
            <p className="text-sm text-[#0a0a0b]">{paymentMethodLabels[order.paymentMethod]}</p>
          </section>
        </div>
      )}
    </Drawer>
  )
}
