# 🛠️ FinCRuM - Unified Development Guide

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Build and Development Commands](#build-and-development-commands)
3. [Code Style Guidelines](#code-style-guidelines)
4. [Project Architecture](#project-architecture)
5. [Component Development](#component-development)
6. [API Development](#api-development)
7. [Testing Guidelines](#testing-guidelines)
8. [Security Considerations](#security-considerations)
9. [Performance Best Practices](#performance-best-practices)
10. [Deployment Guidelines](#deployment-guidelines)

---

## Development Environment Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Git for version control
- Code editor (VS Code recommended)
- Database setup (PostgreSQL/SQLite)
- Electron (for desktop app development)

### Installation Steps
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FinCRuM
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Initialize database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   # For Electron app
   npm run electron:dev
   ```

### Development Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   - Copy `.env.example` to `.env.local`
   - Configure database connection
   - Set up API keys for external services

3. **Database Setup**
   ```bash
   # Run migrations
   npm run db:migrate
   
   # Seed initial data
   npm run db:seed
   ```

4. **Start Development**
   ```bash
   # Web application
   npm run dev
   
   # Electron desktop app
   npm run electron:dev
   
   # Run tests
   npm test
   
   # Run tests in watch mode
   npm run test:watch
   ```

### Key Configuration Files

#### package.json
- Main dependency management
- Scripts for development, build, and testing
- Electron configuration

#### next.config.js
- Next.js configuration
- Webpack customizations
- Environment variable handling

#### tailwind.config.ts
- Tailwind CSS configuration
- Custom theme settings
- Plugin configurations

#### .env.example
- Template for environment variables
- Database connection strings
- API keys and secrets

#### electron.js
- Electron main process configuration
- Window management
- Menu and system integration

### Recommended VS Code Extensions
- **TypeScript**: Enhanced TypeScript support
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: CSS class suggestions
- **Auto Rename Tag**: HTML/JSX tag renaming
- **GitLens**: Enhanced Git integration

## Build and Development Commands

### Core Development Commands
- `npm run dev` - Run Next.js dev server with Turbopack (port 9002)
- `npm run electron` - Start Electron app in development mode
- `npm run build` - Build Next.js and Electron for production
- `npm run start` - Start Next.js app in production mode
- `npm run lint` - Run ESLint for code quality checks
- `npm run typecheck` - Run TypeScript type checking

### Testing Commands
- `npm test` - Run Jest unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run cypress:open` - Open Cypress for E2E testing
- `npm run cypress:run` - Run Cypress tests headlessly

### Build and Deployment Commands
- `npm run build:electron` - Build Electron application
- `npm run dist` - Create distribution packages
- `npm run export` - Export static Next.js build
- `npm run analyze` - Analyze bundle size

## Code Style Guidelines

### General Principles
- **Consistency**: Follow established patterns throughout the codebase
- **Readability**: Write self-documenting code with clear naming
- **Type Safety**: Use TypeScript for all new code
- **Performance**: Consider performance implications of code changes
- **Security**: Follow security best practices

### TypeScript Guidelines

#### Type Definitions
```typescript
// Use interfaces for object shapes
interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Use type aliases for unions and primitives
type Status = 'active' | 'inactive' | 'pending';
type CustomerID = string;

// Use generics for reusable types
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
```

#### Function Signatures
```typescript
// Prefer explicit return types for public functions
export async function fetchCustomer(id: string): Promise<Customer | null> {
  // Implementation
}

// Use proper error handling
export async function saveCustomer(
  customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Customer> {
  try {
    // Implementation
  } catch (error) {
    console.error('Failed to save customer:', error);
    throw new Error('Customer save operation failed');
  }
}
```

### File and Component Naming

#### File Naming Conventions
- **Components**: PascalCase (e.g., `CustomerForm.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useCustomerData.tsx`)
- **Services**: camelCase (e.g., `customerService.ts`)
- **Types**: camelCase (e.g., `customerTypes.ts`)
- **Utilities**: camelCase (e.g., `dateUtils.ts`)

#### Directory Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   └── forms/          # Form-specific components
├── hooks/              # Custom React hooks
├── services/           # API and business logic
├── lib/                # Utilities and helpers
├── types/              # TypeScript type definitions
└── app/                # Next.js pages and layouts
```

### Import Organization

#### Import Order
```typescript
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';

// 2. Internal utilities and types
import { cn } from '@/lib/utils';
import { Customer, CustomerFormData } from '@/types/customer';

// 3. Internal components and hooks
import { Button } from '@/components/ui/button';
import { useCustomerData } from '@/hooks/useCustomerData';

// 4. Internal services
import { customerService } from '@/services/customer';
```

#### Path Aliases
- Use `@/*` for src directory imports
- Use `@/components/*` for component imports
- Use `@/lib/*` for utility imports
- Use `@/services/*` for service imports

### CSS and Styling Guidelines

#### Tailwind CSS Best Practices
```typescript
// Use the cn() utility for conditional classes
import { cn } from '@/lib/utils';

function Button({ variant, size, className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        {
          'bg-primary text-primary-foreground': variant === 'default',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'h-10 px-4 py-2': size === 'default',
          'h-9 px-3': size === 'sm',
        },
        className
      )}
      {...props}
    />
  );
}
```

#### Component Styling
- Use Tailwind CSS classes for styling
- Create reusable component variants
- Use CSS variables for theme customization
- Avoid inline styles unless absolutely necessary

## Project Architecture

### Imports and Architecture Patterns
- **UI Components**: Import from `@/components/ui`
- **Utilities**: Import from `@/lib/utils`
- **Next.js App Router**: Follow App Router structure
- **React Hooks**: Follow hooks best practices
- **Context Providers**: Use for shared state management

### Component Architecture

#### Component Structure
```typescript
// CustomerForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Types and schemas
interface CustomerFormProps {
  initialData?: Partial<Customer>;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel?: () => void;
}

// Component implementation
export function CustomerForm({ initialData, onSubmit, onCancel }: CustomerFormProps) {
  // Hooks and state
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData || {},
  });

  // Event handlers
  const handleSubmit = async (data: CustomerFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  };

  // Render
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {/* Form content */}
    </form>
  );
}

// Default export
export default CustomerForm;
```

### Service Layer Architecture

#### Service Structure
```typescript
// customerService.ts
interface CustomerService {
  getAll(): Promise<Customer[]>;
  getById(id: string): Promise<Customer | null>;
  create(data: CreateCustomerData): Promise<Customer>;
  update(id: string, data: UpdateCustomerData): Promise<Customer>;
  delete(id: string): Promise<void>;
}

class CustomerServiceImpl implements CustomerService {
  async getAll(): Promise<Customer[]> {
    // Implementation
  }

  async getById(id: string): Promise<Customer | null> {
    // Implementation
  }

  // Other methods...
}

export const customerService = new CustomerServiceImpl();
```

## Component Development

### React Component Best Practices

#### Functional Components
```typescript
// Use functional components with hooks
export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Data fetching effect
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [customers, tasks, appointments] = await Promise.all([
          fetchCustomers({ limit: 5 }),
          fetchTasks({ status: 'pending' }),
          fetchAppointments({ upcoming: true })
        ]);
        
        setStats({
          totalCustomers: customers.length,
          pendingTasks: tasks.length,
          upcomingAppointments: appointments.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load data'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Error handling
  if (error) {
    return <ErrorMessage error={error} />;
  }

  // Loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Main render
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <StatsOverview stats={stats} />
      <div className="grid gap-6 md:grid-cols-2">
        <RecentCustomers />
        <UpcomingTasks />
      </div>
    </div>
  );
}
```

#### Custom Hooks
```typescript
// useCustomerData.tsx
export function useCustomerData(customerId?: string) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCustomer = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerService.getById(id);
      setCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch customer'));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, data: UpdateCustomerData) => {
    try {
      const updated = await customerService.update(id, data);
      setCustomer(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update customer'));
      throw err;
    }
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchCustomer(customerId);
    }
  }, [customerId, fetchCustomer]);

  return {
    customer,
    loading,
    error,
    fetchCustomer,
    updateCustomer,
  };
}
```

### Form Handling

#### React Hook Form with Zod Validation
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema definition
const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  company: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

// Form component
export function CustomerForm({ initialData, onSubmit }: CustomerFormProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData || {
      name: '',
      email: '',
      phone: '',
      company: '',
      notes: '',
    },
  });

  const handleFormSubmit = async (data: CustomerFormData) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Form submission failed:', error);
      // Handle error (show toast, etc.)
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name *
        </label>
        <input
          id="name"
          type="text"
          {...form.register('name')}
          className={cn(
            'mt-1 block w-full rounded-md border-gray-300',
            form.formState.errors.name && 'border-red-500'
          )}
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-sm text-red-600">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Other form fields */}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save Customer'}
        </Button>
      </div>
    </form>
  );
}
```

## API Development

### API Route Structure

#### Next.js API Routes
```typescript
// app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/services/customer';

// GET /api/customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const customers = await customerService.getAll({
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ data: customers, success: true });
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', success: false },
      { status: 500 }
    );
  }
}

// POST /api/customers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer = await customerService.create(body);
    
    return NextResponse.json({ data: customer, success: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to create customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer', success: false },
      { status: 500 }
    );
  }
}
```

#### Client-Side API Calls
```typescript
// services/api/customer.ts
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

class CustomerApiService {
  private baseUrl = '/api/customers';

  async getAll(params?: { limit?: number; offset?: number }): Promise<Customer[]> {
    const url = new URL(this.baseUrl, window.location.origin);
    
    if (params?.limit) url.searchParams.set('limit', params.limit.toString());
    if (params?.offset) url.searchParams.set('offset', params.offset.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<Customer[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }

    return result.data;
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<Customer> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create customer');
    }

    return result.data;
  }
}

export const customerApi = new CustomerApiService();
```

### Data Synchronization

#### Sync Hook Implementation
```typescript
// hooks/useDataSync.tsx
export function useDataSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const syncData = useCallback(async (options: SyncOptions = {}) => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setError(null);
    
    try {
      const result = await syncService.sync({
        force: options.force,
        silent: options.silent,
      });
      
      setLastSync(new Date());
      
      if (!options.silent) {
        // Show success notification
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sync failed');
      setError(error);
      
      if (!options.silent) {
        // Show error notification
      }
      
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Auto-sync on interval
  useEffect(() => {
    const interval = setInterval(() => {
      syncData({ silent: true }).catch(() => {
        // Silent sync failure
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [syncData]);

  return {
    isSyncing,
    lastSync,
    error,
    syncData,
  };
}
```

## Testing Guidelines

### Unit Testing with Jest

#### Component Testing
```typescript
// __tests__/CustomerForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerForm } from '@/components/CustomerForm';

describe('CustomerForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const customerData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
    };

    render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    await user.type(screen.getByLabelText(/name/i), customerData.name);
    await user.type(screen.getByLabelText(/email/i), customerData.email);
    await user.type(screen.getByLabelText(/phone/i), customerData.phone);
    
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(customerData);
    });
  });
});
```

#### Service Testing
```typescript
// __tests__/customerService.test.ts
import { customerService } from '@/services/customer';
import { mockCustomers } from '@/test/mocks/customer';

// Mock the database
jest.mock('@/lib/database');

describe('CustomerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('returns all customers', async () => {
      const customers = await customerService.getAll();
      expect(customers).toEqual(mockCustomers);
    });

    it('applies limit and offset', async () => {
      const customers = await customerService.getAll({ limit: 2, offset: 1 });
      expect(customers).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('creates a new customer', async () => {
      const newCustomer = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '0987654321',
      };

      const created = await customerService.create(newCustomer);
      
      expect(created).toMatchObject(newCustomer);
      expect(created.id).toBeDefined();
      expect(created.createdAt).toBeDefined();
    });
  });
});
```

### E2E Testing with Cypress

```typescript
// cypress/e2e/customer-management.cy.ts
describe('Customer Management', () => {
  beforeEach(() => {
    cy.visit('/customers');
  });

  it('should display customer list', () => {
    cy.get('[data-testid="customer-table"]').should('be.visible');
    cy.get('[data-testid="customer-row"]').should('have.length.greaterThan', 0);
  });

  it('should create a new customer', () => {
    cy.get('[data-testid="add-customer-button"]').click();
    
    cy.get('[data-testid="customer-form"]').within(() => {
      cy.get('input[name="name"]').type('Test Customer');
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="phone"]').type('1234567890');
      
      cy.get('button[type="submit"]').click();
    });
    
    cy.get('[data-testid="success-message"]').should('contain', 'Customer created successfully');
  });
});
```

## Security Considerations

### Data Protection
- **Client-side encryption**: Encrypt sensitive data before storage
- **Secure PIN storage**: Use proper hashing algorithms (bcrypt, scrypt)
- **Input validation**: Validate and sanitize all user inputs
- **XSS prevention**: Use proper escaping and Content Security Policy

### Authentication Security
```typescript
// services/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  async hashPin(pin: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(pin, saltRounds);
  }

  async verifyPin(pin: string, hashedPin: string): Promise<boolean> {
    return bcrypt.compare(pin, hashedPin);
  }

  generateToken(userId: string): string {
    return jwt.sign(
      { userId, iat: Date.now() },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  }

  verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return null;
    }
  }
}
```

### API Security
- **Rate limiting**: Implement rate limiting on authentication endpoints
- **CORS configuration**: Properly configure CORS policies
- **Secure headers**: Use security headers (HSTS, CSP, etc.)
- **Input sanitization**: Sanitize all API inputs

## Performance Best Practices

### React Performance
- **Memoization**: Use `React.memo`, `useMemo`, and `useCallback` appropriately
- **Code splitting**: Implement lazy loading for routes and components
- **Bundle optimization**: Analyze and optimize bundle size
- **Image optimization**: Use Next.js Image component for optimized images

### Database Performance
- **Indexing**: Proper indexing for frequently queried fields
- **Pagination**: Implement pagination for large datasets
- **Caching**: Use appropriate caching strategies
- **Batch operations**: Batch database operations when possible

## Deployment Guidelines

### Development Deployment
```bash
# Start development server
npm run dev

# Run with Electron
npm run electron
```

### Production Build
```bash
# Build for production
npm run build

# Build Electron app
npm run build:electron

# Create distribution packages
npm run dist
```

### Environment Configuration
```bash
# .env.local (development)
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:9002
JWT_SECRET=your-development-secret

# .env.production (production)
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_URL=https://your-production-url
JWT_SECRET=your-production-secret
```

### Error Handling
- **Global error boundaries**: Implement error boundaries for React components
- **API error handling**: Consistent error handling across all API calls
- **Logging**: Implement proper logging for debugging and monitoring
- **User feedback**: Provide clear error messages to users

---

*This development guide serves as the comprehensive reference for developing and maintaining the FinCRuM application. Follow these guidelines to ensure code quality, consistency, and maintainability.*