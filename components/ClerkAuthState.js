import { useUser } from '@clerk/nextjs'

export const SignedIn = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser()
  return isLoaded && isSignedIn ? <>{children}</> : null
}

export const SignedOut = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser()
  return isLoaded && !isSignedIn ? <>{children}</> : null
}
