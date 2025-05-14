import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Anton, Montserrat } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/ThemeProvider'; // Import ThemeProvider
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
import { LayoutDashboard, Table, Upload, UserPlus as UserPlusIcon, Users, Settings } from 'lucide-react'; // Removed Sun, Moon, Laptop as they are in ThemeSwitcher
import { Toaster } from "@/components/ui/toaster";
import BackgroundImageSwitcher from '@/components/BackgroundImageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher'; // Import ThemeSwitcher
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          GeistSans.variable,
          anton.variable,
          montserrat.variable,
          'antialiased font-sans flex min-h-screen flex-col'
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <Sidebar variant="floating" collapsible="icon">
              <SidebarHeader>
                <div className="flex items-center justify-between">
                   <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors">
                      <Logo />
                      <span className="group-data-[state=collapsed]:hidden font-heading tracking-wide">Finsculpt CRM</span>
                    </Link>
                    <SidebarTrigger />
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Dashboard">
                      <Link href="/">
                        <LayoutDashboard />
                        <span className="group-data-[state=collapsed]:hidden">Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="All Customers">
                      <Link href="/customers">
                        <Users />
                        <span className="group-data-[state=collapsed]:hidden">All Customers</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Data Grid">
                      <Link href="/data-grid">
                        <Table />
                        <span className="group-data-[state=collapsed]:hidden">Data Grid</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                     <SidebarMenuButton asChild tooltip="Add Customer">
                       <Link href="/add-customer">
                         <UserPlusIcon />
                         <span className="group-data-[state=collapsed]:hidden">Add Customer</span>
                       </Link>
                     </SidebarMenuButton>
                   </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Import Data">
                      <Link href="/import">
                        <Upload />
                        <span className="group-data-[state=collapsed]:hidden">Import Data</span>
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
                "sticky top-2 z-20 flex h-16 items-center justify-between px-4 md:px-6 mx-2 md:mx-4 rounded-lg",
                "glass-effect", 
                "bg-background/50 dark:bg-background/40",
                "hover:shadow-2xl transition-shadow duration-300" 
              )}>
                <div className="flex items-center gap-2 md:hidden"> {/* This trigger is for mobile sheet */}
                  <SidebarTrigger />
                   <Link href="/" className="font-semibold text-lg flex items-center gap-2">
                     <Logo />
                     <span className="font-heading tracking-wide">Finsculpt CRM</span>
                   </Link>
                </div>
                <div className="hidden md:block text-xl font-semibold font-heading tracking-wide">Finsculpt CRM</div>

                <div className="flex items-center gap-3">
                  <ThemeSwitcher />
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
                "bg-background/5 dark:bg-background/2 backdrop-blur-xs rounded-lg m-1 border border-white/5"
              )}>
                  {children}
              </main>
              <Toaster />
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
