
'use client';

import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Anton, Montserrat } from 'next/font/google';
import './globals.css';
import { cn, getFirstInitial } from '@/lib/utils';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import PinLoginScreen from '@/components/PinLoginScreen';
import SetPinScreen from '@/components/SetPinScreen';
import NotificationBell from '@/components/NotificationBell';
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
  SidebarFooter,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { LayoutDashboard, Users, Users2, Table, UserPlus as UserPlusIcon, Upload, Settings, LogOut, ImageUp } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import BackgroundImageSwitcher from '@/components/BackgroundImageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React, { useRef, useState } from 'react';
import ImageCropperModal from '@/components/ImageCropperModal';

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


const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-accent">
    <path d="M4 6h8v2H4zm0 5h12v2H4zm0 5h16v2H4z" />
  </svg>
);

function AppContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoadingAuth, currentUser, logout, pinSetupRequiredForUser, updateUserProfilePicture } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [isCropperModalOpen, setIsCropperModalOpen] = useState(false);
  const [imageToCropSrc, setImageToCropSrc] = useState<string | null>(null);

  const handleProfilePictureFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Image Too Large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImageToCropSrc(dataUri);
        setIsCropperModalOpen(true);
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  const handleCropSave = (croppedImageUrl: string) => {
    updateUserProfilePicture(croppedImageUrl);
    setIsCropperModalOpen(false);
    setImageToCropSrc(null);
  };


  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-4 p-8 rounded-lg glass-effect">
            <Skeleton className="h-12 w-12 rounded-full mx-auto bg-primary/20" />
            <Skeleton className="h-6 w-48 mx-auto bg-muted" />
            <Skeleton className="h-4 w-64 mx-auto bg-muted" />
        </div>
      </div>
    );
  }

  if (pinSetupRequiredForUser) {
    return <SetPinScreen userToSetupPinFor={pinSetupRequiredForUser} />;
  }

  if (!isAuthenticated) {
    return <PinLoginScreen />;
  }

  return (
    <>
    <SidebarProvider defaultPinnedOpen={true}>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors">
              <Logo />
              {/* <span className="group-data-[state=collapsed]:hidden font-heading tracking-wide">Finsculpt CRM</span> Removed text */}
            </Link>
             {/* SidebarTrigger was here, moved to footer */}
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
             {currentUser?.role === 'partner' && (
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Team Management">
                    <Link href="/users">
                        <Users2 />
                        <span className="group-data-[state=collapsed]:hidden">Team Management</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
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
        <SidebarFooter className="p-2 flex justify-end items-center group-data-[state=collapsed]:justify-center">
           <SidebarTrigger />
        </SidebarFooter>
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
          <div className="flex items-center gap-2 md:hidden">
            <SidebarTrigger />
            <Link href="/" className="font-semibold text-lg flex items-center gap-2">
              <Logo />
              <span className="font-heading tracking-wide">Finsculpt CRM</span>
            </Link>
          </div>
          <div className="hidden md:block text-xl font-semibold font-heading tracking-wide">Finsculpt CRM</div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeSwitcher />
             {currentUser && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name} />
                <AvatarFallback>{getFirstInitial(currentUser.name)}</AvatarFallback>
              </Avatar>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-md">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 glass-effect bg-popover/80 dark:bg-popover/60 border-white/10 dark:border-white/5">
                <div className="p-1">
                  <h4 className="font-medium leading-none text-sm font-heading tracking-wide mb-2">User</h4>
                  {currentUser && (
                    <div className="flex items-center gap-3 mb-3 p-2 rounded-md bg-muted/30">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name} />
                        <AvatarFallback>{getFirstInitial(currentUser.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{currentUser.name}</p>
                        <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfilePictureFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageUp className="mr-2 h-4 w-4" />
                    Change Profile Picture
                  </Button>
                </div>
                <BackgroundImageSwitcher />
                {isAuthenticated && (
                  <Button onClick={logout} variant="outline" size="sm" className="w-full mt-4">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </header>
        <main className={cn(
          "flex-1 overflow-y-auto p-4 md:p-6",
          "bg-background/5 dark:bg-background/2 backdrop-blur-xs rounded-lg m-1 border border-white/5" // Updated for subtle main content glass effect
        )}>
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
    {imageToCropSrc && (
        <ImageCropperModal
          isOpen={isCropperModalOpen}
          onClose={() => {
            setIsCropperModalOpen(false);
            setImageToCropSrc(null);
          }}
          imageSrc={imageToCropSrc}
          onCropSave={handleCropSave}
          aspectRatio={1 / 1}
        />
      )}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Finsculpt CRM</title>
        <meta name="description" content="Advanced CRM with Glassmorphism UI" />
      </head>
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
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
