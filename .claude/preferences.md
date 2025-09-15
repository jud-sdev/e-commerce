# Claude Code Preferences

## Coding Preferences
- Use TypeScript for all new files
- Prefer arrow functions over function declarations
- Use const/let over var
- Use template literals over string concatenation
- Prefer async/await over .then()
- Use destructuring when appropriate
- Use early returns to reduce nesting

## Formatting & Style
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings (except JSX)
- Use trailing commas in multiline objects/arrays
- Max line length: 80 characters
- Use Prettier for code formatting
- Use ESLint for code linting

## Component Structure
```typescript
// Preferred component structure
interface ComponentProps {
  // Props interface first
}

export default function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks at the top
  const [state, setState] = useState()

  // Event handlers
  const handleClick = () => {
    // Handler logic
  }

  // Early returns for loading/error states
  if (loading) return <Loading />

  // Main render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

## API Route Structure
```typescript
// Preferred API route structure
export async function GET(request: Request) {
  try {
    // Logic here
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Error message' }, { status: 500 })
  }
}
```

## Import Order
1. React/Next.js imports
2. Third-party libraries
3. Internal utilities/configs
4. Local components
5. Types (if not inlined)