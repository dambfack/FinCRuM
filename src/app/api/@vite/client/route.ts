import { NextResponse } from 'next/server';

// Handle Vite client requests that may be triggered by development tools
// This prevents 404 errors in the console during development
export async function GET() {
  return new NextResponse('// Vite client placeholder', {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache'
    }
  });
}

export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache'
    }
  });
}