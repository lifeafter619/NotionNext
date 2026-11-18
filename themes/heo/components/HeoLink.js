import SmartLink from '@/components/SmartLink'
import { withHeoSubPath } from '../utils/path'

/**
 * HEO-scoped link wrapper that keeps internal navigation inside SUB_PATH.
 */
export default function HeoLink({ href, ...props }) {
  return <SmartLink href={withHeoSubPath(href)} {...props} />
}
