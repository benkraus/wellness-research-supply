import type { OrderDTO } from '@medusajs/framework/types'

import {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_ORDER_NOTIFICATIONS_ENABLED,
} from './constants'

const TELEGRAM_MESSAGE_LIMIT = 4096;

const toSafeString = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

const truncateMessage = (message: string) => {
  if (message.length <= TELEGRAM_MESSAGE_LIMIT) {
    return message
  }

  return `${message.slice(0, TELEGRAM_MESSAGE_LIMIT - 3)}...`
};

const formatItems = (order: OrderDTO) => {
  const items = Array.isArray(order.items) ? order.items : [];

  if (!items.length) {
    return ''
  }

  const maxItems = 20;
  const lines = items.slice(0, maxItems).map((item) => {
    const title = toSafeString(item.title || item.product_title || 'Item')
    const quantity = toSafeString(item.quantity ?? '1')
    return `- ${title} x${quantity}`;
  });

  if (items.length > maxItems) {
    lines.push(`- ...and ${items.length - maxItems} more`);
  }

  return ['Items:', ...lines].join('\n')
};

const formatOrderMessage = (order: OrderDTO) => {
  const total = order.summary?.raw_current_order_total?.value;
  const currency = toSafeString(order.currency_code || '').toUpperCase()
  const lines: string[] = [];

  lines.push('New order placed')
  lines.push(
    `Order: #${toSafeString(order.display_id)} (${toSafeString(order.id)})`
  )
  lines.push(`Email: ${toSafeString(order.email)}`)

  if (total !== undefined && total !== null && Number.isFinite(Number(total))) {
    lines.push(`Total: ${toSafeString(total)} ${currency}`.trim())
  } else {
    lines.push(`Total: ${toSafeString(order.total)} ${currency}`.trim())
  }

  const itemsBlock = formatItems(order);
  if (itemsBlock) {
    lines.push('')
    lines.push(itemsBlock)
  }

  return truncateMessage(lines.join('\n'))
};

export const sendTelegramOrderPlacedNotification = async (order: OrderDTO) => {
  if (!TELEGRAM_ORDER_NOTIFICATIONS_ENABLED) {
    return
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return
  }

  const message = formatOrderMessage(order)
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        disable_web_page_preview: true,
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Telegram notification failed (${response.status}): ${body}`
    )
  }
};
