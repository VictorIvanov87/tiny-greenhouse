import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { authReady, db } from '../auth/firebase'
import type { NotificationSettings, SetupCompletionPayload, SetupProfile } from './state'

const USERS_COLLECTION = 'users'
const GREENHOUSES_COLLECTION = 'greenhouses'

const defaultProfile: SetupProfile = {
  setupCompleted: false,
}

export const getUserProfile = async (uid: string): Promise<SetupProfile | null> => {
  await authReady
  const userRef = doc(db, USERS_COLLECTION, uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    return null
  }

  return snapshot.data() as SetupProfile
}

export const ensureUserDoc = async (uid: string): Promise<SetupProfile> => {
  const existing = await getUserProfile(uid)

  if (existing) {
    return existing
  }

  const userRef = doc(db, USERS_COLLECTION, uid)
  await setDoc(userRef, defaultProfile)

  return defaultProfile
}

const buildNotifications = (settings: NotificationSettings): NotificationSettings => ({
  email: settings.email,
  push: settings.push,
})

export const completeSetup = async (uid: string, data: SetupCompletionPayload) => {
  const userRef = doc(db, USERS_COLLECTION, uid)
  const greenhouseRef = doc(collection(db, GREENHOUSES_COLLECTION))
  const greenhouseId = greenhouseRef.id

  await Promise.all([
    setDoc(
      userRef,
      {
        setupCompleted: true,
        language: data.language,
        plantType: data.plantType,
        notifications: buildNotifications(data.notifications),
        currentGreenhouseId: greenhouseId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(greenhouseRef, {
      ownerUid: uid,
      method: 'soil',
      createdAt: serverTimestamp(),
    }),
  ])
}

export const markSetupCompleted = async (uid: string) => {
  const userRef = doc(db, USERS_COLLECTION, uid)
  await setDoc(
    userRef,
    {
      setupCompleted: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
