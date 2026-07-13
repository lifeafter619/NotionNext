import { useRef, useState } from 'react'
import { useNotionContext } from 'react-notion-x'

const FALLBACK_BUTTON_TEXT = 'Untitled button'

export default function NotionButton({ block, blockId, className }) {
  const { recordMap = {}, mapPageUrl } = useNotionContext()
  const [isLoading, setIsLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionFailed, setActionFailed] = useState(false)
  const actionInFlightRef = useRef(false)

  if (!block || block.type !== 'button') return null

  const automationId = getAutomationId(block)
  const automation = getRecordValue(recordMap.automation?.[automationId])
  const action = getFirstAction(recordMap, automation)
  const label =
    getPlainText(automation?.properties?.name) ||
    getPlainText(automation?.properties?.title) ||
    getPlainText(automation?.name) ||
    getPlainText(automation?.title) ||
    getPlainText(block.properties?.title) ||
    FALLBACK_BUTTON_TEXT
  const blockColor = block.format?.block_color || 'default'
  const actionTarget = getActionTarget(action, {
    automation,
    automationId,
    block,
    label,
    mapPageUrl,
    recordMap
  })
  const canRunAction = Boolean(actionTarget) && !isLoading

  const runAction = async () => {
    if (!actionTarget) return

    if (actionTarget.kind === 'external') {
      window.open(actionTarget.url, '_blank', 'noopener,noreferrer')
      return
    }

    if (actionTarget.kind === 'webhook') {
      if (actionInFlightRef.current) return
      actionInFlightRef.current = true
      setIsLoading(true)
      setActionMessage('')
      setActionFailed(false)
      try {
        const response = await fetch('/api/webhook-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: actionTarget.url,
            payload: actionTarget.payload,
            headers: actionTarget.headers
          })
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.success === false) {
          throw new Error(result.error || 'Webhook request failed')
        }
        setActionMessage('Action completed')
      } catch (error) {
        console.error('Notion button action failed:', error)
        setActionFailed(true)
        setActionMessage('Action failed. Please try again.')
      } finally {
        actionInFlightRef.current = false
        setIsLoading(false)
      }
      return
    }

    window.location.href = actionTarget.url
  }

  const handleClick = event => {
    event.preventDefault()
    void runAction()
  }

  return (
    <div className={joinClasses('notion-button-block', blockId)}>
      <button
        type='button'
        className={joinClasses(
          'notion-button',
          `notion-${blockColor}`,
          className
        )}
        title={label}
        disabled={!canRunAction}
        onClick={handleClick}>
        {label}
      </button>
      {actionMessage && (
        <span
          className={joinClasses(
            'notion-button-status',
            actionFailed ? 'text-red-600' : 'text-green-600'
          )}
          role={actionFailed ? 'alert' : 'status'}>
          {actionMessage}
        </span>
      )}
    </div>
  )
}

function getAutomationId(block) {
  return (
    block.format?.automation_id ||
    block.format?.button_automation_id ||
    block.automation_id ||
    block.button?.automation_id
  )
}

function getFirstAction(recordMap, automation) {
  const actionIds = automation?.action_ids || automation?.actions
  if (Array.isArray(actionIds) && actionIds.length > 0) {
    const firstAction = actionIds[0]
    if (typeof firstAction === 'object') return getRecordValue(firstAction)
    return getRecordValue(recordMap.automation_action?.[firstAction])
  }

  return null
}

function getActionTarget(
  action,
  { automation, automationId, block, label, mapPageUrl, recordMap }
) {
  if (!action) return null

  const target = action.config?.target || action.target || action.config || {}
  const url =
    target.url ||
    action.config?.url ||
    action.url ||
    action.config?.link ||
    action.link
  const normalizedUrl = typeof url === 'string' ? url.trim() : ''

  if (['send_webhook', 'http_request'].includes(action.type)) {
    const webhookUrl = getWebhookUrl(normalizedUrl)
    if (!webhookUrl) return null
    return {
      kind: 'webhook',
      url: webhookUrl,
      headers: getCustomHeaders(action.config),
      payload: createWebhookPayload({
        action,
        automation,
        automationId,
        block,
        label,
        recordMap
      })
    }
  }

  if (normalizedUrl) {
    const kind = getNavigationKind(normalizedUrl)
    if (!kind) return null
    return {
      kind,
      url: normalizedUrl
    }
  }

  const pageId =
    target.pageId ||
    target.page_id ||
    target.id ||
    action.config?.pageId ||
    action.config?.page_id

  if (pageId && typeof mapPageUrl === 'function') {
    const pageUrl = mapPageUrl(pageId, null)
    const kind = typeof pageUrl === 'string' ? getNavigationKind(pageUrl) : null
    if (kind) {
      return {
        kind,
        url: pageUrl
      }
    }
  }

  return null
}

function createWebhookPayload({
  action,
  automation,
  automationId,
  block,
  label,
  recordMap
}) {
  const pageId = findPageId(recordMap)

  return {
    source: {
      type: 'automation',
      automation_id: automation?.id || automationId,
      action_id: action.id || null,
      button_id: block.id,
      button_label: label
    },
    data: {
      object: 'page',
      id: pageId,
      page_id: pageId,
      url: typeof window !== 'undefined' ? window.location.href : ''
    }
  }
}

function findPageId(recordMap) {
  const pageRecord = Object.values(recordMap.block || {}).find(record => {
    const value = getRecordValue(record)
    return value?.type === 'page'
  })

  return getRecordValue(pageRecord)?.id || null
}

function getCustomHeaders(config) {
  const customHeaders = config?.customHeaders || config?.headers
  if (Array.isArray(customHeaders)) {
    return customHeaders.reduce((headers, header) => {
      const key = header?.key || header?.name
      const value = header?.value
      if (typeof key === 'string' && typeof value === 'string') {
        headers[key] = value
      }
      return headers
    }, {})
  }

  if (customHeaders && typeof customHeaders === 'object') {
    return Object.fromEntries(
      Object.entries(customHeaders).filter(
        ([key, value]) => typeof key === 'string' && typeof value === 'string'
      )
    )
  }

  return {}
}

function getRecordValue(record) {
  if (!record || typeof record !== 'object') return null
  if (record.value?.value) return record.value.value
  return record.value || record
}

function getPlainText(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)

  if (Array.isArray(value)) {
    return value.map(getPlainText).join('').trim()
  }

  return (
    value.plain_text ||
    value.text?.content ||
    value.title ||
    value.name ||
    ''
  ).trim()
}

function getNavigationKind(url) {
  try {
    const base = new URL('https://notionnext.local')
    const parsed = new URL(url, base)
    if (['mailto:', 'tel:', 'sms:'].includes(parsed.protocol)) {
      return 'internal'
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.origin === base.origin ? 'internal' : 'external'
  } catch {
    return null
  }
}

function getWebhookUrl(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null
  } catch {
    return null
  }
}

function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ')
}
