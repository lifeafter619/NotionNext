import { useState } from 'react'
import { useNotionContext } from 'react-notion-x'

const FALLBACK_BUTTON_TEXT = 'Untitled button'

export default function NotionButton({ block, blockId, className }) {
  const { recordMap = {}, mapPageUrl } = useNotionContext()
  const [isLoading, setIsLoading] = useState(false)

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
      setIsLoading(true)
      try {
        await fetch('/api/webhook-proxy', {
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
      } finally {
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

  if (['send_webhook', 'http_request'].includes(action.type) && url) {
    return {
      kind: 'webhook',
      url: url.trim(),
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

  if (typeof url === 'string' && url.trim()) {
    return {
      kind: isExternalUrl(url) ? 'external' : 'internal',
      url: url.trim()
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
    if (pageUrl) {
      return {
        kind: 'internal',
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

function isExternalUrl(url) {
  return /^(https?:)?\/\//i.test(url)
}

function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ')
}
