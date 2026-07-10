# HEO Runtime and UX Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 26 confirmed HEO/shared-runtime issue groups without changing the theme's main visual identity, public routes, stable DOM classes, or this project's enabled visitor-location behavior.

**Architecture:** Preserve existing component boundaries and repair each root cause at its source. Shared runtime fixes remain theme-neutral; HEO-specific state is made explicit and lifecycle-safe. Every behavior change follows RED-GREEN-REFACTOR, while issues already protected by an existing passing regression test are recorded as verified evidence instead of receiving unnecessary production changes.

**Tech Stack:** Next.js, React, JavaScript, Jest, React Testing Library, ESLint, Tailwind CSS.

---

## File and responsibility map

- `lib/config.js`: configuration precedence and explicit falsey-value semantics.
- `components/LazyImage.js`: stable image URL generation and responsive `srcSet` behavior.
- `components/LoadingProgress.js`: NProgress loading, route event registration, and cleanup.
- `components/SearchHighlightNav.js`: route-scoped temporary article-search keyword.
- `components/Comment.js`: delayed comment loading and observer/timer lifecycle.
- `components/NotionPage.js`: the single canonical `notion-article` element.
- `themes/heo/index.js`: HEO search state, home banner, article lifecycle, Schema cleanup, and 404 link markup.
- `themes/heo/config.js`: explicit project-level visitor-location enablement.
- `themes/heo/components/*`: focused HEO interaction, responsive, semantic, and copy repairs.
- `themes/heo/style.js`: valid CSS inside the styled-jsx template.
- `package.json`: lint coverage for `themes/`.
- `__tests__/**`: regression coverage, extending existing suites where their setup matches the component.

## Traceability

| Spec IDs | Implementation task |
| --- | --- |
| 01 | Task 1 |
| 02 | Task 2 |
| 03 | Task 3 |
| 04 | Task 4 |
| 05-06 | Task 5 |
| 07-09 | Task 6 |
| 10, 16-17 | Task 7 |
| 11 | Task 8 |
| 12 | Task 9 |
| 13 | Task 10 |
| 14-15 | Task 11 |
| 18 | Task 12 |
| 19, 21 | Task 13 |
| 20, 22-23 | Task 14 |
| 24-26 | Task 15 |

## Execution rules

- Before each production edit, run the task's new or existing reproduction and confirm the expected RED failure.
- If a listed reproduction already passes, stop and inspect whether the issue has already been fixed. Do not edit production code merely to match this plan; record the passing evidence and continue with remaining failing behavior.
- Use `apply_patch` for every file edit.
- Keep unrelated user changes intact. Before every commit, run `git diff --check` and inspect `git status --short`.
- Do not combine task commits unless two files are required for the same tested behavior.

### Task 1: Preserve explicit falsey configuration values (Spec 01)

**Files:**
- Create: `__tests__/lib/configFalseyValues.test.js`
- Modify: `lib/config.js:15-110`

- [ ] **Step 1: Write the failing precedence tests**

Mock `@/lib/global` before importing `siteConfig`, then cover Notion over theme, theme over BLOG/default, and falsey values:

```js
const mockGetGlobalSnapshot = jest.fn()

jest.mock('@/lib/global', () => ({
  getGlobalSnapshot: mockGetGlobalSnapshot
}))

describe('siteConfig explicit falsey values', () => {
  beforeEach(() => {
    jest.resetModules()
    mockGetGlobalSnapshot.mockReset()
  })

  test.each([
    ['FEATURE_FLAG', false],
    ['RETRY_COUNT', 0],
    ['OPTIONAL_TEXT', '']
  ])('keeps Notion %s=%p instead of falling through', (key, value) => {
    mockGetGlobalSnapshot.mockReturnValue({
      NOTION_CONFIG: { [key]: value },
      THEME_CONFIG: { [key]: 'theme-fallback' }
    })
    const { siteConfig } = require('@/lib/config')
    expect(siteConfig(key, 'default-fallback')).toBe(value)
  })

  it('falls through only for null and undefined', () => {
    mockGetGlobalSnapshot.mockReturnValue({
      NOTION_CONFIG: { FEATURE_FLAG: null },
      THEME_CONFIG: { FEATURE_FLAG: false }
    })
    const { siteConfig } = require('@/lib/config')
    expect(siteConfig('FEATURE_FLAG', true)).toBe(false)
  })
})
```

Also add alias coverage for `COMMENT_WALINE_SERVER_URL` and `COMMENT_WALINE_RECENT`, proving an explicit empty string/false alias is not replaced.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand __tests__/lib/configFalseyValues.test.js`

Expected: FAIL because `global.NOTION_CONFIG?.[key] || global.THEME_CONFIG?.[key]` and `if (!val)` discard falsey values.

- [ ] **Step 3: Implement one shared provided-value rule**

Add module-level helpers and use them for the main and alias paths:

```js
const hasConfigValue = value => value !== undefined && value !== null

const firstProvidedConfigValue = (...values) =>
  values.find(value => hasConfigValue(value))
```

Replace truthy fallback logic with `firstProvidedConfigValue(...)`, and only enter compatibility fallbacks when `!hasConfigValue(val)`. Keep `convertVal` unchanged.

- [ ] **Step 4: Verify GREEN and nearby configuration tests**

Run: `npm test -- --runInBand __tests__/lib/configFalseyValues.test.js __tests__/conf/defaultFeatureConfig.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- lib/config.js __tests__/lib/configFalseyValues.test.js
git commit -m "fix: preserve explicit falsey configuration values"
```

### Task 2: Make LazyImage SSR and first hydration deterministic (Spec 02)

**Files:**
- Modify: `__tests__/components/LazyImage.test.js:299-end`
- Modify: `components/LazyImage.js:5-16,41-52,255-296`

- [ ] **Step 1: Replace the viewport-coupled expectation with failing stability tests**

Keep existing lazy loading and `srcSet` tests. Replace the current test expecting `width=480` in `src` with a real server-render/hydration regression. Import `renderToString` from `react-dom/server` and `hydrateRoot` from `react-dom/client`; temporarily make `global.window` and `global.document` unavailable while calling `renderToString`, restore them with a narrow client viewport before hydration, and spy on `console.error`:

```js
it('hydrates with the same optimized src when server and client viewports differ', async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(global, 'window')
  const documentDescriptor = Object.getOwnPropertyDescriptor(global, 'document')
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

  Object.defineProperty(global, 'window', {
    configurable: true,
    value: undefined
  })
  Object.defineProperty(global, 'document', {
    configurable: true,
    value: undefined
  })
  const markup = renderToString(
    <LazyImage
      {...defaultProps}
      src='https://images.unsplash.com/photo.jpg?width=1080&q=80'
      priority
    />
  )

  Object.defineProperty(global, 'window', windowDescriptor)
  Object.defineProperty(global, 'document', documentDescriptor)
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 480 })
  const container = document.createElement('div')
  container.innerHTML = markup
  document.body.appendChild(container)

  await act(async () => {
    hydrateRoot(
      container,
      <LazyImage
        {...defaultProps}
        src='https://images.unsplash.com/photo.jpg?width=1080&q=80'
        priority
      />
    )
    await Promise.resolve()
  })

  expect(container.querySelector('img')).toHaveAttribute(
    'src',
    expect.stringContaining('width=1080')
  )
  expect(errorSpy).not.toHaveBeenCalledWith(
    expect.stringMatching(/hydration|did not match/i),
    expect.anything()
  )
})
```

Restore all descriptors, DOM nodes, roots, and spies in `finally`/`afterEach` so this test cannot pollute later cases. Also retain a pure rerender check:

```js
it('keeps the same optimized src regardless of client viewport width', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 480 })
  const { rerender } = render(
    <LazyImage
      {...defaultProps}
      src='https://images.unsplash.com/photo.jpg?width=1080&q=80'
      priority
    />
  )
  expect(screen.getByAltText('Test image')).toHaveAttribute(
    'src',
    expect.stringContaining('width=1080')
  )

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
  rerender(
    <LazyImage
      {...defaultProps}
      src='https://images.unsplash.com/photo.jpg?width=1080&q=80'
      priority
    />
  )
  expect(screen.getByAltText('Test image')).toHaveAttribute(
    'src',
    expect.stringContaining('width=1080')
  )
})
```

Assert that `srcSet` still contains responsive 320/480/etc. candidates so the browser retains responsive selection.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand __tests__/components/LazyImage.test.js`

Expected: FAIL because `getViewportTargetWidth` rewrites `src` using `window.innerWidth`.

- [ ] **Step 3: Remove viewport reads from source URL generation**

Make `adjustImgSize` pure:

```js
export function adjustImgSize(src, maxWidth) {
  if (!src) return null
  return replaceImageWidthParam(src, normalizeImageWidth(maxWidth))
}
```

Delete `getViewportTargetWidth`. Do not add a mount-time source rewrite; keep responsive behavior in existing `generateSrcSet` and `sizes`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --runInBand __tests__/components/LazyImage.test.js __tests__/themes/heo/PostCoverFallback.test.js`

Expected: PASS with no React hydration/attribute warnings.

- [ ] **Step 5: Commit**

```powershell
git add -- components/LazyImage.js __tests__/components/LazyImage.test.js
git commit -m "fix: stabilize lazy image hydration sources"
```

### Task 3: Bind NProgress after it loads and clean route handlers (Spec 03)

**Files:**
- Create: `__tests__/components/LoadingProgress.test.js`
- Modify: `components/LoadingProgress.js`

- [ ] **Step 1: Write failing delayed-load and cleanup tests**

Mock `loadExternalResource`, `useRouter`, and route event registration. Resolve the script promise after render, then invoke captured handlers:

```js
it('uses the loaded NProgress instance for later route events', async () => {
  render(<LoadingProgress />)
  window.NProgress = { start: jest.fn(), done: jest.fn(), settings: {} }
  await act(async () => resolveScriptLoad())

  routeHandlers.routeChangeStart('/next')
  routeHandlers.routeChangeComplete('/next')

  expect(window.NProgress.start).toHaveBeenCalledTimes(1)
  expect(window.NProgress.done).toHaveBeenCalledTimes(1)
  expect(window.NProgress.settings.minimum).toBe(0.1)
})
```

Add an unmount assertion that `off` receives the exact same handler functions registered through `on`, and that a resolved promise after unmount does not bind new work.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/components/LoadingProgress.test.js`

Expected: FAIL because handlers close over initial `null` and `minimun` is misspelled.

- [ ] **Step 3: Use a stable instance ref**

Replace component state with `useRef(null)`. Registered handlers read `nProgressRef.current`; the resource promise sets the ref only while the effect is active. Set `settings.minimum = 0.1`, load CSS, and keep symmetric `on`/`off` cleanup.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --runInBand __tests__/components/LoadingProgress.test.js`

Expected: PASS without state-update-after-unmount warnings.

- [ ] **Step 5: Commit**

```powershell
git add -- components/LoadingProgress.js __tests__/components/LoadingProgress.test.js
git commit -m "fix: initialize loading progress route handlers"
```

### Task 4: Scope article-search event keywords to the current route (Spec 04)

**Files:**
- Modify: `__tests__/components/SearchHighlightNav.test.js`
- Modify: `components/SearchHighlightNav.js:42-70`

- [ ] **Step 1: Add a failing route-change regression**

Dispatch `notionnext:article-search` with `old-term`, confirm the panel appears, mutate the mocked router to a new `asPath` with no keyword, rerender, and assert the old term/panel disappears after timers flush.

```js
expect(screen.queryByDisplayValue('old-term')).not.toBeInTheDocument()
expect(document.querySelectorAll('.search-highlight')).toHaveLength(0)
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/components/SearchHighlightNav.test.js`

Expected: FAIL because `eventKeyword` remains the highest-priority keyword after navigation.

- [ ] **Step 3: Clear the transient override on route identity changes**

Add a focused effect:

```js
useEffect(() => {
  setEventKeyword('')
}, [router.asPath])
```

If `asPath` changes during the component's own shallow keyword cleanup, ensure the derived router keyword remains authoritative and no highlight timer survives cleanup.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --runInBand __tests__/components/SearchHighlightNav.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- components/SearchHighlightNav.js __tests__/components/SearchHighlightNav.test.js
git commit -m "fix: clear article search state on navigation"
```

### Task 5: Reset comment loading per article and disconnect observers safely (Spec 05-06)

**Files:**
- Create: `__tests__/components/CommentLifecycle.test.js`
- Modify: `components/Comment.js:20-62`
- Modify: `themes/heo/index.js:940-983,1050-1070`
- Modify or extend: `__tests__/themes/heo/LayoutResponsiveControls.test.js`

- [ ] **Step 1: Write failing Comment lifecycle tests**

Use a controllable `IntersectionObserver` mock. Render article A, intersect it, rerender article B, and assert the actual provider content for A is removed immediately on the first B render—not merely after an effect flush. Require the loading placeholder to remain until B intersects. On unmount assert `disconnect()` is called even when `commentRef.current` changes.

```js
expect(screen.queryByTestId('mock-comment-provider')).not.toBeInTheDocument()
expect(screen.getByText('Loading...')).toBeInTheDocument()
expect(observer.disconnect).toHaveBeenCalledTimes(1)
```

- [ ] **Step 2: Write a failing HEO post-change test**

In the HEO layout suite, reveal recommendations/comments for post A, rerender with post B, and assert the recommendation/comment subtree for A is absent during B's first committed render. It must remain deferred until B's observer intersects; testing only the state after effects flush is insufficient.

- [ ] **Step 3: Run both tests and verify RED**

Run: `npm test -- --runInBand __tests__/components/CommentLifecycle.test.js __tests__/themes/heo/LayoutResponsiveControls.test.js`

Expected: FAIL because `shouldLoad` and `showRecommended` are booleans that persist across article changes, allowing one stale committed render, and Comment cleanup only unobserves a mutable ref rather than disconnecting.

- [ ] **Step 4: Implement lifecycle resets and captured cleanup**

Do not reset booleans in an effect, because effects run after commit. Bind loaded state to the article identity:

```js
const articleId = frontMatter?.id
const [loadedCommentId, setLoadedCommentId] = useState(null)
const shouldLoad = Boolean(articleId && loadedCommentId === articleId)
```

The captured observer/timer callback calls `setLoadedCommentId(articleId)`. Capture `const target = commentRef.current`, observe it, and always call `observer.disconnect()` plus `clearTimeout(timer)` in cleanup.

Apply the same render-safe pattern in HEO article layout:

```js
const postId = post?.id
const [recommendedPostId, setRecommendedPostId] = useState(null)
const showRecommended = Boolean(postId && recommendedPostId === postId)
```

Only the current post's observer can set its ID. This makes a new post false during render, before effects execute, and prevents the old comment/recommendation subtree from mounting or starting network work.

- [ ] **Step 5: Verify GREEN**

Run the same focused command. Expected: PASS with no timers or observers remaining after unmount.

- [ ] **Step 6: Commit**

```powershell
git add -- components/Comment.js themes/heo/index.js __tests__/components/CommentLifecycle.test.js __tests__/themes/heo/LayoutResponsiveControls.test.js
git commit -m "fix: reset deferred comments across articles"
```

### Task 6: Separate HEO search success, empty, and error states (Spec 07-09)

**Files:**
- Modify: `__tests__/themes/heo/SearchResultJumpNavigation.test.js`
- Modify: `themes/heo/index.js:260-263,420-695`

- [ ] **Step 1: Preserve existing stale-response evidence**

Run the existing test `does not let stale Algolia responses replace the latest search results` alone.

Run: `npm test -- --runInBand __tests__/themes/heo/SearchResultJumpNavigation.test.js -t "stale Algolia"`

Expected: PASS. Record this as evidence for Spec 07 before changing the state model. If it fails, stop and use the failure as RED.

- [ ] **Step 2: Add failing error/empty/date tests**

Add tests that:

- Reject Algolia search and expect `搜索服务暂时不可用，请稍后重试` with a retry button, while `未找到相关文章` is absent.
- Resolve `{ hits: [] }` and expect the existing empty-state copy, not the error copy.
- Resolve a hit with an ISO timestamp near a UTC day boundary and expect the visible date `2026-07-10` in `Asia/Shanghai`.
- Change from a non-empty keyword to empty while a request is in flight and assert the late response never appears.

- [ ] **Step 3: Run the suite and verify RED**

Run: `npm test -- --runInBand __tests__/themes/heo/SearchResultJumpNavigation.test.js`

Expected: FAIL because rejection currently sets `algoliaResults(null)` and renders the empty/local fallback, and `formatDate` uses environment locale/timezone.

- [ ] **Step 4: Implement explicit search state and deterministic date formatting**

Use one state object and a request generation ref:

```js
const [algoliaState, setAlgoliaState] = useState({ status: 'idle', hits: [] })
const searchGenerationRef = useRef(0)

const beginGeneration = () => ++searchGenerationRef.current
const isCurrentGeneration = generation =>
  searchGenerationRef.current === generation
```

State transitions are `idle`, `loading`, `success`, `empty`, and `error`. Only `success`/`empty` replace local results; `error` renders the retry UI and does not trigger empty-result navigation. The retry button increments a local retry token included in the search effect dependencies.

Implement `formatDate` as fixed `YYYY-MM-DD` using `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(...)`, assembling the exact format from parts so separators are deterministic.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --runInBand __tests__/themes/heo/SearchResultJumpNavigation.test.js`

Expected: PASS, including the pre-existing stale-response test.

- [ ] **Step 6: Commit**

```powershell
git add -- themes/heo/index.js __tests__/themes/heo/SearchResultJumpNavigation.test.js
git commit -m "fix: distinguish HEO search errors from empty results"
```

### Task 7: Honor controlled search, banner, and footer configuration (Spec 10, 16-17)

**Files:**
- Modify: `__tests__/themes/SearchInputNavigation.test.js`
- Create: `__tests__/themes/heo/ConfigRendering.test.js`
- Modify: `themes/heo/components/SearchInput.js`
- Modify: `themes/heo/components/Footer.js`
- Modify: `themes/heo/index.js:100-120`

- [ ] **Step 1: Add failing controlled-input and configuration tests**

For HEO SearchInput, rerender `currentSearch` from `alpha` to `beta` and expect the textbox value to become `beta`. In `ConfigRendering.test.js`, mock `siteConfig` and assert:

- `HEO_HOME_BANNER_ENABLE: false` omits the Hero and leaves no empty banner wrapper.
- `HEO_HOME_BANNER_ENABLE: true` renders the Hero.
- Footer's备案 anchor uses configured `BEI_AN_LINK`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/themes/SearchInputNavigation.test.js __tests__/themes/heo/ConfigRendering.test.js`

Expected: FAIL because HEO SearchInput uses `defaultValue`, Hero is unconditional, and Footer uses a hard-coded URL.

- [ ] **Step 3: Implement the minimal configuration wiring**

Make SearchInput value controlled by local state synchronized from `currentSearch`:

```js
const [searchText, setSearchText] = useState(currentSearch || '')
useEffect(() => setSearchText(currentSearch || ''), [currentSearch])
```

Use `value={searchText}` and preserve submit/clear behavior. Gate Hero with `siteConfig('HEO_HOME_BANNER_ENABLE') !== false`. Set Footer `href={BEI_AN_LINK || 'https://beian.miit.gov.cn/'}`.

- [ ] **Step 4: Verify GREEN**

Run the same focused command. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- themes/heo/components/SearchInput.js themes/heo/components/Footer.js themes/heo/index.js __tests__/themes/SearchInputNavigation.test.js __tests__/themes/heo/ConfigRendering.test.js
git commit -m "fix: honor HEO search and site configuration"
```

### Task 8: Observe the actual desktop catalog boundary (Spec 11)

**Files:**
- Modify: `__tests__/themes/heo/FloatTocButtonFallback.test.js`
- Modify: `themes/heo/components/FloatTocButton.js:350-430`
- Modify if needed: `themes/heo/components/Catalog.js`

- [ ] **Step 1: Replace sidebar-wide expectations with failing catalog-boundary tests**

Update the test currently named `does not show ... while later sidebar blocks are still visible`: the floating TOC should depend on the catalog element, not unrelated later cards. Assert the observer receives the catalog node (give it a stable `data-heo-catalog` marker if no unique selector exists), and changing another sidebar card must not change floating visibility.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/themes/heo/FloatTocButtonFallback.test.js`

Expected: FAIL because the implementation observes `sideRightSticky`.

- [ ] **Step 3: Narrow the observation target**

Mark the real catalog root with `data-heo-catalog`, query that node from the sticky sidebar, and observe it with the existing IntersectionObserver logic. If no catalog exists, keep the documented fallback behavior. Disconnect the prior observer whenever the target changes and on unmount.

- [ ] **Step 4: Verify GREEN**

Run the focused suite. Expected: PASS, including drag-listener cleanup tests.

- [ ] **Step 5: Commit**

```powershell
git add -- themes/heo/components/FloatTocButton.js themes/heo/components/Catalog.js __tests__/themes/heo/FloatTocButtonFallback.test.js
git commit -m "fix: scope floating toc visibility to catalog"
```

### Task 9: Remove duplicate adjacent-post controls and reset drag transforms (Spec 12)

**Files:**
- Create: `__tests__/themes/heo/PostAdjacent.test.js`
- Modify: `themes/heo/components/PostAdjacent.js`

- [ ] **Step 1: Write failing responsive and cleanup tests**

Render both previous and next posts. Assert there is only one visible navigation set at the `md`/tablet breakpoint class contract: mobile section ends before `md`, desktop fixed card starts at `md`. Simulate pointer/mouse drag, unmount or rerender a different post, and assert any inline `transform` is cleared.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/themes/heo/PostAdjacent.test.js`

Expected: FAIL because `lg:hidden` overlaps the `md:flex` fixed control and direct transforms survive lifecycle transitions.

- [ ] **Step 3: Align breakpoints and centralize reset**

Change the mobile section to `md:hidden`. Add `resetDragStyles()` that clears transform/transition on both refs and resets drag state; call it on drag end/cancel, post identity change, breakpoint change, and cleanup. Keep existing hrefs and card classes.

- [ ] **Step 4: Verify GREEN**

Run the focused suite. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- themes/heo/components/PostAdjacent.js __tests__/themes/heo/PostAdjacent.test.js
git commit -m "fix: stabilize adjacent post controls"
```

### Task 10: Clamp reading progress and provide an accessible title (Spec 13)

**Files:**
- Create: `__tests__/themes/heo/ReadingProgress.test.js`
- Modify: `themes/heo/components/ReadingProgress.js`
- Modify: `themes/heo/components/Header.js:150-175`

- [ ] **Step 1: Write failing boundary and label tests**

Mock document dimensions for negative, normal, over-100, and zero-scrollable-height cases. Assert the progressbar value is always finite and within `0..100`. Render Header with post metadata and assert ReadingProgress receives the article title; without a title it receives `阅读进度`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/themes/heo/ReadingProgress.test.js`

Expected: FAIL because the raw percentage is not clamped and Header omits the title prop.

- [ ] **Step 3: Implement finite clamping and title fallback**

```js
const rawProgress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0
const progress = Number.isFinite(rawProgress)
  ? Math.min(100, Math.max(0, rawProgress))
  : 0
```

Pass `title={post?.title || '阅读进度'}` from Header and expose it through the existing accessible label/title mechanism.

- [ ] **Step 4: Verify GREEN and Header regression**

Run: `npm test -- --runInBand __tests__/themes/heo/ReadingProgress.test.js __tests__/themes/heo/HeaderScroll.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- themes/heo/components/ReadingProgress.js themes/heo/components/Header.js __tests__/themes/heo/ReadingProgress.test.js
git commit -m "fix: bound and label HEO reading progress"
```

### Task 11: Make visitor location opt-in while keeping this project enabled (Spec 14-15)

**Files:**
- Modify: `__tests__/themes/heo/VisitorInfoCardStorage.test.js`
- Modify: `themes/heo/components/VisitorInfoCard.js`
- Modify: `themes/heo/config.js`

- [ ] **Step 1: Add failing privacy and copy tests**

Mock `siteConfig` and `fetch`:

- Missing/false `HEO_VISITOR_LOCATION_ENABLE` makes zero fetch calls and renders `欢迎您的来访~`.
- True enables the existing primary/fallback API sequence.
- Failed enabled requests render `未知地区` without throwing.
- Busuanzi page PV renders copy such as `本站内容已被浏览 N 次`, never `今天的第 N 位读者`.
- The exported/default HEO config explicitly contains `HEO_VISITOR_LOCATION_ENABLE: true`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/themes/heo/VisitorInfoCardStorage.test.js`

Expected: FAIL because location requests are unconditional, the flag is absent, and PV copy is misleading.

- [ ] **Step 3: Gate the effect and stabilize disabled UI**

Import `siteConfig`. Initialize location to `null`; only set `加载中...` and call APIs when the flag is strictly `true`. When disabled, render the fixed visitor welcome row. Rename `todayVisitors` to `pageViews` and update comments/copy to cumulative PV semantics. Add to HEO config:

```js
HEO_VISITOR_LOCATION_ENABLE: true,
```

- [ ] **Step 4: Verify GREEN**

Run the focused suite. Expected: PASS with no unhandled fetch promise.

- [ ] **Step 5: Commit**

```powershell
git add -- themes/heo/components/VisitorInfoCard.js themes/heo/config.js __tests__/themes/heo/VisitorInfoCardStorage.test.js
git commit -m "fix: make visitor location explicitly configurable"
```

### Task 12: Let coverless post cards use the full content width (Spec 18)

**Files:**
- Modify: `__tests__/themes/heo/PostCoverFallback.test.js`
- Modify: `themes/heo/components/BlogPostCard.js:85-120`

- [ ] **Step 1: Add a failing coverless-width test**

Render a post with no cover and no site fallback cover. Assert the content container has `w-full` and does not have `md:w-7/12`. Keep the existing mutation/fallback-cover tests.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/themes/heo/PostCoverFallback.test.js`

Expected: FAIL because the content width is unconditional.

- [ ] **Step 3: Make width conditional on resolved cover presence**

Use the same resolved cover boolean that controls the image branch:

```js
className={resolvedCover ? 'w-full md:w-7/12 ...' : 'w-full ...'}
```

Do not mutate `post` while deriving the fallback.

- [ ] **Step 4: Verify GREEN**

Run the focused suite. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- themes/heo/components/BlogPostCard.js __tests__/themes/heo/PostCoverFallback.test.js
git commit -m "fix: expand HEO cards without covers"
```

### Task 13: Correct carousel link behavior and social controls on narrow screens (Spec 19, 21)

**Files:**
- Modify: `__tests__/themes/heo/SwipeExternalOpen.test.js`
- Create: `__tests__/themes/heo/SocialButton.test.js`
- Modify: `themes/heo/components/Swipe.js`
- Modify: `themes/heo/components/SocialButton.js`

- [ ] **Step 1: Add failing Swipe behavior tests**

Assert internal `/post` links do not get `_blank`, external `https://external.example` links get `_blank` plus `rel="noopener noreferrer"`, and autoplay pauses during mouse hover, keyboard focus within the carousel, and `prefers-reduced-motion: reduce`.

- [ ] **Step 2: Add failing SocialButton tests**

Assert the container can wrap on narrow screens (`flex-wrap` and bounded gaps), email entries use `mailto:address`, and entries without a target are not rendered as empty anchors.

- [ ] **Step 3: Run and verify RED**

Run: `npm test -- --runInBand __tests__/themes/heo/SwipeExternalOpen.test.js __tests__/themes/heo/SocialButton.test.js`

Expected: FAIL because all Swipe links force a new tab, autoplay has no pause state, social controls do not wrap, and email lacks href.

- [ ] **Step 4: Implement target classification and pause state**

Classify external URLs with the project's existing URL helper if available; otherwise treat `http(s)://` with a different host as external. Drive the interval only when `!isPaused && !prefersReducedMotion`. Add mouse/focus handlers with cleanup. In SocialButton, use a wrapping flex container and normalize email to `mailto:`.

- [ ] **Step 5: Verify GREEN**

Run the focused command. Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- themes/heo/components/Swipe.js themes/heo/components/SocialButton.js __tests__/themes/heo/SwipeExternalOpen.test.js __tests__/themes/heo/SocialButton.test.js
git commit -m "fix: improve HEO carousel and social controls"
```

### Task 14: Restore valid HTML, unique article IDs, and one Schema owner (Spec 20, 22-23)

**Files:**
- Create: `__tests__/themes/heo/SemanticMarkup.test.js`
- Modify: `themes/heo/components/Logo.js`
- Modify: `themes/heo/components/Announcement.js`
- Modify: `themes/heo/index.js:1010-1016,1135-1139`
- Verify only: `components/NotionPage.js:233-239`
- Verify only: `components/SEO.js:279-300`

- [ ] **Step 1: Write failing semantic markup tests**

Render Logo, Announcement plus NotionPage, the HEO article wrapper, and Layout404 with existing mocks. Assert:

- Logo's Link owns one valid anchor-like interactive surface and has no `legacyBehavior`-dependent div child.
- 404 contains no `<a><button>` nesting; the link itself has button classes.
- The combined article path has exactly one `[id="notion-article"]`.
- HEO article wrapper has neither `itemtype="https://schema.org/Movie"` nor a second `BlogPosting`; `components/SEO.js` remains the sole `BlogPosting` JSON-LD source.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/themes/heo/SemanticMarkup.test.js`

Expected: FAIL on legacy markup, nested controls, duplicate ID, and Movie microdata.

- [ ] **Step 3: Apply minimal semantic changes**

Use `SmartLink`/Next Link with className on the link and image/content directly inside it. Change Announcement's duplicate ID to `heo-announcement` (retain existing classes). Remove `itemScope` and `itemType` from HEO `<article>`. Style the 404 `SmartLink` directly as the button.

- [ ] **Step 4: Verify GREEN and selector consumers**

Run: `npm test -- --runInBand __tests__/themes/heo/SemanticMarkup.test.js __tests__/themes/heo/Catalog.test.js __tests__/themes/heo/PostHeaderSearch.test.js __tests__/components/PrismMacLineNumbers.test.js`

Expected: PASS; canonical `notion-article` consumers still find the body.

- [ ] **Step 5: Commit**

```powershell
git add -- themes/heo/components/Logo.js themes/heo/components/Announcement.js themes/heo/index.js __tests__/themes/heo/SemanticMarkup.test.js
git commit -m "fix: correct HEO semantic article markup"
```

### Task 15: Repair invalid HEO styles and bring themes into lint (Spec 24-26)

**Files:**
- Create: `__tests__/themes/heo/StyleValidity.test.js`
- Modify: `themes/heo/style.js`
- Modify: `themes/heo/components/DarkModeButton.js`
- Modify: `themes/heo/components/InfoCard.js`
- Modify: `themes/heo/components/PostHeader.js`
- Modify: `themes/heo/components/PostAdjacent.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing static regression tests**

Read the source files as text and assert:

```js
expect(heoStyle).not.toMatch(/^\s*\/\//m)
expect(darkModeButton).not.toContain('hover: scale-')
expect(infoCard).not.toContain('transitaion-all')
expect(postHeader).not.toContain('font-sm')
expect(postAdjacent).not.toContain('h-18')
expect(packageJson.scripts.lint).toMatch(/themes/)
```

Also assert the exact replacements: `hover:scale-100`, `hover:scale-50`, `transition-all`, `text-sm`, and `min-h-[4.5rem]`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --runInBand __tests__/themes/heo/StyleValidity.test.js`

Expected: FAIL for all confirmed invalid tokens and missing lint scope.

- [ ] **Step 3: Apply exact style corrections**

Replace CSS `//` comments with `/* ... */` or remove them. Apply only the replacements specified above. Change scripts to:

```json
"lint": "eslint pages components lib hooks themes proxy.ts types --ext .js,.jsx,.ts,.tsx",
"lint:fix": "eslint pages components lib hooks themes proxy.ts types --ext .js,.jsx,.ts,.tsx --fix"
```

- [ ] **Step 4: Verify GREEN, then inspect the new lint baseline**

Run: `npm test -- --runInBand __tests__/themes/heo/StyleValidity.test.js`

Expected: PASS.

Run: `npm run lint`

Expected: no new lint errors from changed files. If historical theme lint errors appear, capture their exact files/rules; fix only confirmed HEO issues or mechanically safe violations required for the expanded command to pass. Do not suppress rules globally.

- [ ] **Step 5: Commit**

```powershell
git add -- themes/heo/style.js themes/heo/components/DarkModeButton.js themes/heo/components/InfoCard.js themes/heo/components/PostHeader.js themes/heo/components/PostAdjacent.js package.json __tests__/themes/heo/StyleValidity.test.js
git commit -m "fix: validate HEO styles in lint"
```

### Task 16: Run complete verification and produce the evidence matrix

**Files:**
- Modify if implementation discoveries require it: `docs/superpowers/specs/2026-07-10-heo-runtime-and-ux-repair-design.md`
- Modify: `docs/superpowers/plans/2026-07-10-heo-runtime-and-ux-repair.md` (check completed boxes/evidence notes only)

- [ ] **Step 1: Run all focused HEO/shared-runtime regressions**

Run:

```powershell
npm test -- --runInBand __tests__/lib/configFalseyValues.test.js __tests__/components/LazyImage.test.js __tests__/components/LoadingProgress.test.js __tests__/components/SearchHighlightNav.test.js __tests__/components/CommentLifecycle.test.js __tests__/themes/SearchInputNavigation.test.js __tests__/themes/heo
```

Expected: PASS with no console errors, React warnings, open handles, or unhandled promises.

- [ ] **Step 2: Run the full Jest suite**

Run: `npm test -- --runInBand`

Expected: PASS. If an unrelated baseline failure exists, rerun it independently and record exact evidence before deciding whether it is in scope.

- [ ] **Step 3: Run static quality gates**

Run:

```powershell
npm run lint
npm run type-check
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: exit 0 and generate a production Next.js build without hydration, compile, lint, or type failures.

- [ ] **Step 5: Verify the 26-item evidence matrix**

For each Spec ID 01-26, record one of:

- failing test observed -> production fix -> passing test;
- pre-existing regression test passed and source inspection proved no production change was necessary.

Confirm specifically that `themes/heo/config.js` still contains `HEO_VISITOR_LOCATION_ENABLE: true` after all merges.

- [ ] **Step 6: Review the final diff**

Run:

```powershell
git status --short
git diff --stat 32bb6613..HEAD
git log --oneline -20
```

Inspect for unrelated edits, accidental visual redesign, changed public routes, removed stable classes, secrets, generated output, or dependency lockfile churn.

- [ ] **Step 7: Commit verification documentation if changed**

```powershell
git add -- docs/superpowers/specs/2026-07-10-heo-runtime-and-ux-repair-design.md docs/superpowers/plans/2026-07-10-heo-runtime-and-ux-repair.md
git commit -m "docs: record HEO repair verification"
```

Skip this commit when no documentation changed.
