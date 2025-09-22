import '@testing-library/jest-dom'

// Add missing globals for Node.js environment
global.Request = global.Request ?? class Request {
  constructor(input, init) {
    this.url = input
    this.method = init?.method || 'GET'
    this.headers = new Headers(init?.headers)
    this.body = init?.body
  }

  async json() {
    return JSON.parse(this.body)
  }
}

global.Response = global.Response ?? class Response {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Headers(init?.headers)
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
  }
}

global.Headers = global.Headers ?? class Headers {
  constructor(init) {
    this._headers = {}
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this._headers[key.toLowerCase()] = value
      })
    }
  }

  get(name) {
    return this._headers[name.toLowerCase()]
  }

  set(name, value) {
    this._headers[name.toLowerCase()] = value
  }
}

// Mock next/server Request and Response
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url, init) {
      const urlObj = typeof url === 'string' ? new URL(url) : url
      this.url = urlObj.toString()
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers)
      this.body = init?.body
      this.cookies = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        getAll: jest.fn(() => []),
      }
      this.nextUrl = {
        searchParams: urlObj.searchParams || new URLSearchParams(),
        pathname: urlObj.pathname,
        href: urlObj.href,
        origin: urlObj.origin,
        toString: () => urlObj.toString(),
      }
    }

    async json() {
      return JSON.parse(this.body)
    }

    async text() {
      return this.body
    }
  },
  NextResponse: class NextResponse {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.headers = new Headers(init?.headers)
      this.ok = this.status >= 200 && this.status < 300
    }

    static json(data, init) {
      return {
        body: data,
        status: init?.status || 200,
        headers: init?.headers || {},
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
        async json() {
          return data
        }
      }
    }

    static redirect(url, status = 307) {
      return {
        body: null,
        status,
        headers: { Location: url },
        ok: false,
      }
    }
  }
}))

// Mock @auth/prisma-adapter
jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({
    createUser: jest.fn(),
    getUser: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserByAccount: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    linkAccount: jest.fn(),
    unlinkAccount: jest.fn(),
    createSession: jest.fn(),
    getSessionAndUser: jest.fn(),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
    createVerificationToken: jest.fn(),
    useVerificationToken: jest.fn(),
  }))
}))

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-id' })),
    verify: jest.fn(() => Promise.resolve(true)),
  }))
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))