import { useState } from 'react'
import { Avatar, Dropdown } from 'flowbite-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'

const getInitials = (email?: string | null) => {
  if (!email) {
    return 'TG'
  }

  const [first = '', second = ''] = email.split('@')[0].split(/[.\-_]/)
  const initials = (first.charAt(0) + (second.charAt(0) || '')).toUpperCase()
  return initials || 'TG'
}

export const UserMenu = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Failed to sign out', error)
    } finally {
      setSigningOut(false)
    }
  }

  const email = user?.email ?? 'your.account@tiny.greenhouse'

  return (
    <Dropdown
      arrowIcon={false}
      inline
      label={<Avatar placeholderInitials={getInitials(user?.email)} rounded className="ring-emerald-200 ring-offset-2" />}
    >
      <Dropdown.Header>
        <span className="block text-sm font-semibold text-gray-900">{email}</span>
        <span className="block truncate text-xs text-gray-500">Tiny Greenhouse Keeper</span>
      </Dropdown.Header>
      <Dropdown.Item onClick={() => navigate('/setup')}>Re-run setup</Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item onClick={handleSignOut} disabled={signingOut}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Dropdown.Item>
    </Dropdown>
  )
}
