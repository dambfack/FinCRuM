import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Updated import
import './globals.css';
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { LayoutDashboard, Table, Upload } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";

// const geistSans = Geist({ // No need to call it as a function when importing from geist/font/sans
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'ListMaster',
  description: 'Basic CRM App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          GeistSans.variable, // Use the variable directly from the import
          'antialiased font-sans flex min-h-screen flex-col'
        )}
      >
        <SidebarProvider>
          <Sidebar collapsible="icon">
            <SidebarHeader>
              <div className="flex items-center justify-between">
                 <Link href="/" className="font-semibold text-lg flex items-center gap-2">
                    {/* You can replace this with a logo if you have one */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-accent"><path d="M4 6l16 0"/><path d="M4 12l16 0"/><path d="M4 18l10 0"/></svg>
                    ListMaster
                  </Link>
                  <SidebarTrigger className="md:hidden" />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dashboard">
                    <Link href="/">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Data Grid">
                    <Link href="/data-grid">
                      <Table />
                      <span>Data Grid</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Import Data">
                    <Link href="/import">
                      <Upload />
                      <span>Import Data</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="flex flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:px-6 lg:ml-0 md:ml-auto md:w-[calc(100%-var(--sidebar-width-icon))] peer-data-[state=expanded]:md:w-[calc(100%-var(--sidebar-width))] transition-[width]">
              <div className="flex items-center gap-2 md:hidden">
                <SidebarTrigger />
                 <Link href="/" className="font-semibold text-lg flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-accent"><path d="M4 6l16 0"/><path d="M4 12l16 0"/><path d="M4 18l10 0"/></svg>
                   ListMaster
                 </Link>
              </div>
              {/* Add Header content if needed, e.g., User profile */}
              <div className="ml-auto">
                {/* Placeholder for future elements like user avatar/settings */}
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6">{children}</main>
            <Toaster />
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
