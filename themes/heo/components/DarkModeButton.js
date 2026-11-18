import AppearanceModeSwitch from '@/components/AppearanceModeSwitch'

/**
 * 深色模式按钮
 */
const DarkModeButton = props => {
  const { cRef, className, fullWidth = false } = props
  return (
    <AppearanceModeSwitch
      cRef={cRef}
      className={className || ''}
      fullWidth={fullWidth}
    />
  )
}
export default DarkModeButton
