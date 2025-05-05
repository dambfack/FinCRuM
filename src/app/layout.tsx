import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
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
import { LayoutDashboard, Table, Upload, Shapes, UserPlus } from 'lucide-react'; // Added UserPlus icon
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Finsculpt CRM',
  description: 'Basic CRM App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Added 'dark' class to enable dark mode by default
    <html lang="en" className="dark">
      <body
        className={cn(
          GeistSans.variable,
          'antialiased font-sans flex min-h-screen flex-col'
        )}
      >
        <SidebarProvider>
          <Sidebar collapsible="icon">
            <SidebarHeader>
              <div className="flex items-center justify-between">
                 <Link href="/" className="font-semibold text-lg flex items-center gap-2">
                    <Shapes className="h-6 w-6 text-accent"/>
                    Finsculpt CRM
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
                   <SidebarMenuButton asChild tooltip="Add Customer">
                     <Link href="/add-customer">
                       <UserPlus />
                       <span>Add Customer</span>
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
                   <Shapes className="h-6 w-6 text-accent"/>
                   Finsculpt CRM
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
