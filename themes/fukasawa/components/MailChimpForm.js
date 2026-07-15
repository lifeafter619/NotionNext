import { useRef, useState } from 'react'
import { subscribeToNewsletter } from '@/lib/plugins/mailchimp'
import { siteConfig } from '@/lib/config'
import CONFIG from '../config'
import { useGlobal } from '@/lib/global'

/**
 * 邮件订阅表单
 * @returns
 */
export default function MailChimpForm() {
  const inputRef = useRef(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { locale } = useGlobal()

  const handleSubmit = async event => {
    event.preventDefault()
    if (submitting || success) return

    setSubmitting(true)
    setError('')
    try {
      await subscribeToNewsletter(inputRef.current?.value || '')
      setSuccess(true)
    } catch {
      setError('Subscription failed. Check your email and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {siteConfig('FUKASAWA_MAILCHIMP_FORM', null, CONFIG) && (
        <div className='sm:col-span-6 md:col-span-3 lg:col-span-3'>
          <h6 className='text-gray-800 font-medium mb-2'>
            {locale.MAILCHIMP.SUBSCRIBE}
          </h6>
          <p className='text-sm text-gray-600 mb-4'>{locale.MAILCHIMP.MSG}</p>
          <form
            onSubmit={event => {
              void handleSubmit(event)
            }}
            aria-busy={submitting}>
            <div className='flex flex-wrap mb-4'>
              <div className='w-full'>
                <label className='block text-sm sr-only' htmlFor='newsletter'>
                  {locale.MAILCHIMP.EMAIL}
                </label>
                <div className='relative flex items-center max-w-xs'>
                  <input
                    ref={inputRef}
                    disabled={success || submitting}
                    id='newsletter'
                    type='email'
                    className='form-input w-full text-gray-800 px-3 py-2 pr-12 text-sm'
                    placeholder={locale.MAILCHIMP.EMAIL}
                    required
                  />
                  <button
                    disabled={success || submitting}
                    type='submit'
                    className='absolute inset-0 left-auto'
                    aria-label='Subscribe'>
                    <span
                      className='absolute inset-0 right-auto w-px -ml-px my-2 bg-gray-300'
                      aria-hidden='true'></span>
                    <svg
                      className='w-3 h-3 fill-current text-blue-600 mx-3 shrink-0'
                      viewBox='0 0 12 12'
                      xmlns='http://www.w3.org/2000/svg'>
                      <path
                        d='M11.707 5.293L7 .586 5.586 2l3 3H0v2h8.586l-3 3L7 11.414l4.707-4.707a1 1 0 000-1.414z'
                        fillRule='nonzero'
                      />
                    </svg>
                  </button>
                </div>
                {/* Success message */}
                {success && (
                  <p role='status' className='mt-2 text-green-600 text-sm'>
                    Thanks for subscribing!
                  </p>
                )}
                {error && (
                  <p role='alert' className='mt-2 text-red-600 text-sm'>
                    {error}
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
