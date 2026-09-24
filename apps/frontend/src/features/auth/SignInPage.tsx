import { SignIn } from '@clerk/react'

export function SignInPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  )
}
