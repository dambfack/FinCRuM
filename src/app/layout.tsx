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
import { LayoutDashboard, Table, Upload, UserPlusIcon, Settings } from 'lucide-react';
import SyncManager from "@/components/SyncManager";
import { Toaster } from "@/components/ui/toaster";
import BackgroundImageSwitcher from '@/components/BackgroundImageSwitcher';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Finsculpt CRM',
  description: 'Advanced CRM with Glassmorphism UI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          GeistSans.variable,
          'antialiased font-sans flex min-h-screen flex-col' // Removed bg-background, body style from globals.css will handle it
        )}
      >
        <SidebarProvider>
          <Sidebar collapsible="icon" className="bg-sidebar-background/50 dark:bg-sidebar-background/30 glass-effect-sidebar">
            <SidebarHeader>
              <div className="flex items-center justify-between">
                 <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors">
                    {/* Simplified Logo - replace with actual SVG or Icon component if available */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-accent"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                    <span className="group-data-[state=collapsed]:hidden">Finsculpt CRM</span>
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
                       <UserPlusIcon />
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
          <SidebarInset className={cn(
            "flex flex-col",
            "bg-background/10 dark:bg-background/5 backdrop-blur-sm" // Main content area glass effect
            // "m-0 md:m-2 md:rounded-xl md:border md:border-white/5 md:shadow-lg" // Optional: frame the inset area
          )}>
            <header className={cn(
              "sticky top-0 z-20 flex h-16 items-center justify-between px-4 md:px-6",
              "bg-transparent glass-effect-header" // Header glass effect
            )}>
              <div className="flex items-center gap-2 md:hidden">
                <SidebarTrigger />
                 <Link href="/" className="font-semibold text-lg flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-accent"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                   Finsculpt CRM
                 </Link>
              </div>
              <div className="hidden md:block text-xl font-semibold">Finsculpt CRM</div>
              
              <div className="flex items-center gap-3">
                <SyncManager/>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-md">
                      <Settings className="h-5 w-5" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 glass-effect bg-popover/80 dark:bg-popover/60 border-white/10 dark:border-white/5">
                    <BackgroundImageSwitcher />
                  </PopoverContent>
                </Popover>
                {/* Placeholder for future elements like user avatar/settings */}
              </div>
            </header>
            <main className={cn(
              "flex-1 overflow-y-auto p-4 md:p-6",
              // "glass-effect-main-content" // Apply this if main needs its own distinct glass panel
              "bg-transparent" // Ensure main itself is transparent if SidebarInset provides the backdrop
            )}>
                {children}
            </main>
            <Toaster />
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
