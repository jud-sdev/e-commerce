import { requireAdmin } from '@/lib/auth-utils'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('next/navigation')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should redirect to login if no session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/signin')
  })

  it('should redirect to login if no user ID', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {},
      expires: '',
    })
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/signin')
  })

  it('should redirect to dashboard if user is not admin', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
      expires: '',
    })
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })

  it('should return session for admin user', async () => {
    const mockSession = {
      user: { id: 'admin1', role: 'ADMIN' },
      expires: '',
    }
    mockGetServerSession.mockResolvedValue(mockSession)

    const result = await requireAdmin()
    expect(result).toEqual(mockSession)
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})