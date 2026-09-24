import { SignUp } from '@clerk/react'

export function SignUpPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  )
}
