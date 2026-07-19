import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import SmartLink from './HeoLink'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import CONFIG from '../config'
import NotByAI from '@/components/NotByAI'
import QrCode from '@/components/QrCode'
import { resolveArticleCopyrightText } from '@/lib/utils/articleCopyright'
import {
  stripTransientQueryParamsFromAsPath,
  stripTransientQueryParamsFromUrl
} from '@/lib/utils/stripTransientUrlParams'

/**
 * 版权声明
 * @returns
 */
export default function PostCopyright({ post }) {
  const router = useRouter()
  const [path, setPath] = useState(
    siteConfig('LINK') + stripTransientQueryParamsFromAsPath(router.asPath)
  )
  useEffect(() => {
    setPath(stripTransientQueryParamsFromUrl(window.location.href))
  }, [router.asPath])

  const { locale } = useGlobal()
  const copyrightText = resolveArticleCopyrightText({
    post,
    locale,
    mode: siteConfig('HEO_ARTICLE_COPYRIGHT', null, CONFIG)
  })

  if (!copyrightText) {
    return <></>
  }

  return (
    <section className='dark:text-gray-300 mt-6 mx-1 '>
      <div className='flex justify-between items-center overflow-x-auto whitespace-nowrap text-sm dark:bg-gray-900 bg-gray-100 p-5 leading-8 border-l-2 border-indigo-500 relative'>
        <ul className='flex-1'>
          <li>
            <strong className='mr-2'>{locale.COMMON.AUTHOR}:</strong>
            <SmartLink href={'/about'} className='hover:underline'>
              {siteConfig('AUTHOR')}
            </SmartLink>
          </li>
          <li>
            <strong className='mr-2'>{locale.COMMON.URL}:</strong>
            <a
              className='whitespace-normal break-words hover:underline'
              href={path}>
              {path}
            </a>
          </li>
          <li>
            <strong className='mr-2'>{locale.COMMON.COPYRIGHT}:</strong>
            {copyrightText}
          </li>
          {siteConfig('HEO_ARTICLE_NOT_BY_AI', false, CONFIG) && (
            <li>
              <NotByAI />
            </li>
          )}
        </ul>
        <div className='ml-4 hidden md:block'>
          <div className='w-24 h-24 bg-white p-1 rounded-md shadow-sm overflow-hidden'>
            <QrCode value={path} />
          </div>
        </div>
      </div>
    </section>
  )
}
