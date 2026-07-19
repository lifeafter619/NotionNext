import { siteConfig } from '@/lib/config'
import { handleEmailClick } from '@/lib/plugins/mailEncrypt'
import { useRef } from 'react'
import SmartLink from './HeoLink'

/**
 * 社交联系方式按钮组
 * @returns {JSX.Element}
 * @constructor
 */
const SocialButton = () => {
  const emailIcon = useRef(null)
  const CONTACT_GITHUB = siteConfig('CONTACT_GITHUB')
  const CONTACT_TWITTER = siteConfig('CONTACT_TWITTER')
  const CONTACT_TELEGRAM = siteConfig('CONTACT_TELEGRAM')
  const CONTACT_LINKEDIN = siteConfig('CONTACT_LINKEDIN')
  const CONTACT_WEIBO = siteConfig('CONTACT_WEIBO')
  const CONTACT_INSTAGRAM = siteConfig('CONTACT_INSTAGRAM')
  const CONTACT_EMAIL = siteConfig('CONTACT_EMAIL')
  const ENABLE_RSS = siteConfig('ENABLE_RSS')
  const CONTACT_BILIBILI = siteConfig('CONTACT_BILIBILI')
  const CONTACT_YOUTUBE = siteConfig('CONTACT_YOUTUBE')
  const iconClass =
    'transform hover:scale-125 duration-150 dark:hover:text-[var(--heo-color-accent)] hover:text-[var(--heo-color-primary)]'

  const handleEmailKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleEmailClick(e, emailIcon, CONTACT_EMAIL)
    }
  }

  return (
    <div className='w-full flex justify-center'>
      <div className='flex flex-wrap justify-center gap-x-6 gap-y-4 sm:gap-x-12 text-3xl text-gray-600 dark:text-gray-300'>
        {CONTACT_GITHUB && (
          <a
            target='_blank'
            rel='noreferrer'
            title={'github'}
            href={CONTACT_GITHUB}>
            <i className={`${iconClass} fab fa-github`} />
          </a>
        )}
        {CONTACT_TWITTER && (
          <a
            target='_blank'
            rel='noreferrer'
            title={'twitter'}
            href={CONTACT_TWITTER}>
            <i className={`${iconClass} fab fa-twitter`} />
          </a>
        )}
        {CONTACT_TELEGRAM && (
          <a
            target='_blank'
            rel='noreferrer'
            href={CONTACT_TELEGRAM}
            title={'telegram'}>
            <i className={`${iconClass} fab fa-telegram`} />
          </a>
        )}
        {CONTACT_LINKEDIN && (
          <a
            target='_blank'
            rel='noreferrer'
            href={CONTACT_LINKEDIN}
            title={'linkIn'}>
            <i className={`${iconClass} fab fa-linkedin`} />
          </a>
        )}
        {CONTACT_WEIBO && (
          <a
            target='_blank'
            rel='noreferrer'
            title={'weibo'}
            href={CONTACT_WEIBO}>
            <i className={`${iconClass} fab fa-weibo`} />
          </a>
        )}
        {CONTACT_INSTAGRAM && (
          <a
            target='_blank'
            rel='noreferrer'
            title={'instagram'}
            href={CONTACT_INSTAGRAM}>
            <i className={`${iconClass} fab fa-instagram`} />
          </a>
        )}
        {CONTACT_EMAIL && (
          <a
            ref={emailIcon}
            role='link'
            tabIndex={0}
            onClick={e => handleEmailClick(e, emailIcon, CONTACT_EMAIL)}
            onKeyDown={handleEmailKeyDown}
            title='email'
            className='cursor-pointer'>
            <i className='transform hover:scale-125 duration-150 fas fa-envelope dark:hover:text-indigo-400 hover:text-indigo-600' />
          </a>
        )}
        {ENABLE_RSS && (
          <SmartLink
            target='_blank'
            rel='noreferrer'
            title='RSS'
            href='/rss/feed.xml'>
            <i className={`${iconClass} fas fa-rss`} />
          </SmartLink>
        )}
        {CONTACT_BILIBILI && (
          <a
            target='_blank'
            rel='noreferrer'
            title={'bilibili'}
            href={CONTACT_BILIBILI}>
            <i className={`${iconClass} fab fa-bilibili`} />
          </a>
        )}
        {CONTACT_YOUTUBE && (
          <a
            target='_blank'
            rel='noreferrer'
            title={'youtube'}
            href={CONTACT_YOUTUBE}>
            <i className={`${iconClass} fab fa-youtube`} />
          </a>
        )}
      </div>
    </div>
  )
}
export default SocialButton
