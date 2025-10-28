import type { UserCredential } from 'firebase/auth'
import { GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from './firebase'

export class AuthError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'AuthError'
  }
}

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

const errorMessages: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Account not found. Try signing up.',
  'auth/email-already-in-use': 'Email already in use.',
}

const mapFirebaseError = (error: unknown) => {
  if (error instanceof AuthError) {
    return error
  }

  if (error instanceof FirebaseError) {
    const message = errorMessages[error.code] ?? 'Something went wrong. Please try again.'
    return new AuthError(error.code, message)
  }

  return new AuthError('auth/unknown', 'Something went wrong. Please try again.')
}

export const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, email, password)
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export const signUpWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  try {
    return await createUserWithEmailAndPassword(auth, email, password)
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    return await signInWithPopup(auth, provider)
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth)
  } catch (error) {
    throw mapFirebaseError(error)
  }
}
