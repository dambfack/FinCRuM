import { NextResponse } from 'next/server';

// Simple ping endpoint for network status checking
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is running' 
  });
}

// Also support HEAD requests for lightweight checks
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}