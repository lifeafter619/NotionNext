#!/usr/bin/env node
/**
 * 容错地应用 patch-package 补丁。
 *
 * 背景：在 Vercel 等 CI 环境中，patch-package 默认开启 --error-on-fail，
 * 一旦某个补丁应用失败（常见于 node_modules 缓存残留、镜像 tarball 差异、
 * 不可见字符等环境因素），就会让整个 `yarn install` 以 exit 1 中断，
 * 从而阻断部署。
 *
 * 这里的补丁都是增强性的（File 组件可覆盖、gallery 图标显隐、uuidToId
 * 空值保护、docs chat 错误回退），即便应用失败也只是退回 npm 原始行为，
 * 不应让站点构建整体失败。
 *
 * 因此本脚本优先用 patch-package 正常应用所有补丁，失败时打印诊断信息，
 * 但始终以 exit 0 结束，保证部署链路不被补丁失败阻断。
 */
const { spawnSync } = require('child_process')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')

function log(...args) {
  // eslint-disable-next-line no-console
  console.log('[apply-patches]', ...args)
}

function runPatchPackage() {
  // shell: true 让 Windows 上能正确解析 npx，跨平台更稳健
  const result = spawnSync('npx patch-package', {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: true,
    // 与 CI 行为对齐，确保补丁失败能被捕获为非零退出码
    env: { ...process.env, CI: '1' }
  })
  return result.status
}

function main() {
  log('applying patches…')
  const status = runPatchPackage()

  if (status === 0) {
    log('all patches applied successfully.')
    return
  }

  // 补丁应用失败：打印诊断，但不中断构建——补丁是增强性的，
  // 失败只会退回 npm 原始包行为，不应阻断站点部署。
  log(
    `patch-package exited with ${status}. ` +
      'Patches are non-fatal enhancements; falling back to upstream package ' +
      'behavior and continuing the build. If a patched feature looks off, ' +
      'clear the CI node_modules cache and redeploy.'
  )
}

try {
  main()
} catch (err) {
  // 任何意外异常都不应中断部署
  log('unexpected error, continuing build:', err && err.message ? err.message : err)
}

process.exit(0)
