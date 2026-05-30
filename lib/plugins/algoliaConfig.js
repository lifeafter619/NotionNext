export function hasAlgoliaAdminConfig(config) {
  return Boolean(
    config?.ALGOLIA_APP_ID &&
    config?.ALGOLIA_ADMIN_APP_KEY &&
    config?.ALGOLIA_INDEX
  )
}

export function hasAlgoliaSearchConfig(config) {
  return Boolean(
    config?.ALGOLIA_APP_ID &&
    config?.ALGOLIA_SEARCH_ONLY_APP_KEY &&
    config?.ALGOLIA_INDEX
  )
}

export function getAlgoliaAdminConfig(readConfig) {
  return {
    ALGOLIA_APP_ID: readConfig('ALGOLIA_APP_ID'),
    ALGOLIA_ADMIN_APP_KEY: readConfig('ALGOLIA_ADMIN_APP_KEY'),
    ALGOLIA_INDEX: readConfig('ALGOLIA_INDEX')
  }
}

export function getAlgoliaSearchConfig(readConfig) {
  return {
    ALGOLIA_APP_ID: readConfig('ALGOLIA_APP_ID'),
    ALGOLIA_SEARCH_ONLY_APP_KEY: readConfig('ALGOLIA_SEARCH_ONLY_APP_KEY'),
    ALGOLIA_INDEX: readConfig('ALGOLIA_INDEX')
  }
}

export function isAlgoliaAdminEnabled(readConfig) {
  return hasAlgoliaAdminConfig(getAlgoliaAdminConfig(readConfig))
}

export function isAlgoliaSearchEnabled(readConfig) {
  return hasAlgoliaSearchConfig(getAlgoliaSearchConfig(readConfig))
}
