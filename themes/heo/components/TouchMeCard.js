import { siteConfig } from '@/lib/config'
import SmartLink from './HeoLink'
import CONFIG from '../config'

/**
 * 交流频道
 * @returns
 */
export default function TouchMeCard() {
  if (!siteConfig('HEO_SOCIAL_CARD', true, CONFIG)) {
    return <></>
  }
  return (
    <div
      className={
        'relative h-28 text-white flex flex-col group overflow-hidden rounded-xl'
      }>
      <SmartLink
        href={siteConfig('HEO_SOCIAL_CARD_URL', null, CONFIG)}
        className='h-full w-full'>
        <div className='relative h-full w-full lg:p-6 p-4 border rounded-xl bg-[var(--heo-color-primary)] dark:bg-[var(--heo-color-accent)] dark:border-gray-600 overflow-hidden'>
          {/* 默认显示内容 */}
          <div className='h-full relative z-10 group-hover:opacity-0 transition-opacity duration-300'>
            <h2 className='font-[1000] text-3xl'>
              {siteConfig('HEO_SOCIAL_CARD_TITLE_1', null, CONFIG)}
            </h2>
            <h3 className='pt-2'>
              {siteConfig('HEO_SOCIAL_CARD_TITLE_2', null, CONFIG)}
            </h3>
          </div>

          {/* 背景图片 */}
          <div
            className='absolute left-0 top-0 w-full h-full z-0'
            style={{
              background:
                'url(https://bu.dusays.com/2023/05/16/64633c4cd36a9.png) center center no-repeat'
            }}></div>

          {/* 蒙版效果 - 鼠标悬停显示 */}
          <div className='absolute inset-0 bg-[var(--heo-color-primary)] dark:bg-[var(--heo-color-accent)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20'>
            <div className='font-[1000] text-xl text-center'>
              {siteConfig('HEO_SOCIAL_CARD_TITLE_3', null, CONFIG)}
            </div>
          </div>
        </div>
      </SmartLink>
    </div>
  )
}
