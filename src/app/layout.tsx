import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Anton } from 'next/font/google'; // Import Anton font
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

// Configure Anton font
const anton = Anton({
  subsets: ['latin'],
  weight: ['400'], // Anton typically only has a 400 weight
  variable: '--font-anton', // Create a CSS variable
});

export const metadata: Metadata = {
  title: 'Finsculpt CRM',
  description: 'Advanced CRM with Glassmorphism UI',
};

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-accent">
    <path d="M4 6h8v2H4zm0 5h12v2H4zm0 5h16v2H4z" />
  </svg>
);


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
          anton.variable, // Add Anton font variable
          'antialiased font-sans flex min-h-screen flex-col'
        )}
      >
        <SidebarProvider>
          <Sidebar collapsible="icon" className="bg-sidebar-background/50 dark:bg-sidebar-background/30 glass-effect-sidebar">
            <SidebarHeader>
              <div className="flex items-center justify-between">
                 <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors">
                    <Logo />
                    <span className="group-data-[state=collapsed]:hidden font-heading">Finsculpt CRM</span>
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
            "bg-background/10 dark:bg-background/5 backdrop-blur-sm"
          )}>
            <header className={cn(
              "sticky top-0 z-20 flex h-16 items-center justify-between px-4 md:px-6",
              "bg-transparent glass-effect-header"
            )}>
              <div className="flex items-center gap-2 md:hidden">
                <SidebarTrigger />
                 <Link href="/" className="font-semibold text-lg flex items-center gap-2">
                   <Logo />
                   <span className="font-heading">Finsculpt CRM</span>
                 </Link>
              </div>
              <div className="hidden md:block text-xl font-semibold font-heading">Finsculpt CRM</div>

              <div className="flex items-center gap-3">
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
              </div>
            </header>
            <main className={cn(
              "flex-1 overflow-y-auto p-4 md:p-6",
              "bg-transparent"
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
