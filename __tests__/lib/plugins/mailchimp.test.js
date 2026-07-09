import BLOG from '@/blog.config'
import subscribeToMailchimpApi from '@/lib/plugins/mailchimp'

jest.mock('@/blog.config', () => ({
  MAILCHIMP_LIST_ID: 'list-id',
  MAILCHIMP_API_KEY: 'key-us1',
  MAILCHIMP_SERVER_PREFIX: ''
}))

describe('subscribeToMailchimpApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    })
    BLOG.MAILCHIMP_LIST_ID = 'list-id'
    BLOG.MAILCHIMP_API_KEY = 'key-us1'
    BLOG.MAILCHIMP_SERVER_PREFIX = ''
  })

  it('rejects malformed emails before calling Mailchimp', () => {
    expect(() => subscribeToMailchimpApi({ email: 'not-an-email' })).toThrow(
      'Invalid email'
    )

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('trims valid emails before sending them to Mailchimp', async () => {
    await subscribeToMailchimpApi({
      email: ' user@example.com ',
      first_name: 'Ada',
      last_name: 'Lovelace'
    })

    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toMatchObject({
      email_address: 'user@example.com',
      merge_fields: {
        FNAME: 'Ada',
        LNAME: 'Lovelace'
      }
    })
  })
})
