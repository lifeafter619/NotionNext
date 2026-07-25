import AppearanceModeSwitch from './AppearanceModeSwitch'

/**
 * 深色模式按钮
 */
const DarkModeButton = props => {
  const { cRef, className } = props
  return <AppearanceModeSwitch cRef={cRef} className={className || ''} />
}
export default DarkModeButton
