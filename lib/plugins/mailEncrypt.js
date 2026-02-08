export const handleEmailClick = (e, emailIcon, CONTACT_EMAIL) => {
  if (CONTACT_EMAIL && emailIcon && !emailIcon.current.href) {
    e.preventDefault()
    const email = decryptEmail(CONTACT_EMAIL)
    emailIcon.current.href = `mailto:${email}`
    emailIcon.current.click()
  }
}

export const encryptEmail = email => {
  if (!email) return ''
  return btoa(unescape(encodeURIComponent(email)))
}

export const decryptEmail = encryptedEmail => {
  if (!encryptedEmail || typeof encryptedEmail !== 'string') {
    return encryptedEmail
  }
  // 简单的Base64正则检查
  const base64Regex =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
  if (!base64Regex.test(encryptedEmail)) {
    return encryptedEmail
  }
  try {
    return decodeURIComponent(escape(atob(encryptedEmail)))
  } catch (error) {
    console.error('解密邮箱失败:', error)
    return encryptedEmail
  }
}
