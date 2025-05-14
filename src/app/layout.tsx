
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
import { LayoutDashboard, Users, Users2, Table, UserPlus as UserPlusIcon, Upload, Settings, LogOut, ImageUp, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import BackgroundImageSwitcher from '@/components/BackgroundImageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import ImageCropperModal from '@/components/ImageCropperModal';
import NextImage from 'next/image'; // Renamed to NextImage to avoid conflict

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

const Logo = (props: { appLogoUrl: string | null; defaultAppLogoUrl: string | null }) => {
  const ultimateFallbackPngLogo = "/f_logo.png"; // Assuming f_logo.png is in public
  const absoluteUltimatePlaceholder = "https://placehold.co/64x64.png?text=F";

  const [currentSrc, setCurrentSrc] = useState<string>(props.appLogoUrl || props.defaultAppLogoUrl || ultimateFallbackPngLogo);
  const [imgError, setImgError] = useState(false);
  const [attemptCounter, setAttemptCounter] = useState(0); // Used to force re-render via key

  useEffect(() => {
    let newSrc: string | null = null;
    if (props.appLogoUrl) {
      newSrc = props.appLogoUrl;
    } else if (props.defaultAppLogoUrl) {
      newSrc = props.defaultAppLogoUrl;
    } else {
      newSrc = ultimateFallbackPngLogo;
    }
    // console.log(`[Logo Component] useEffect update. appLogoUrl: ${props.appLogoUrl ? 'Exists (len ' + props.appLogoUrl.length +')' : 'null'}, defaultAppLogoUrl: ${props.defaultAppLogoUrl ? 'Exists (len ' + props.defaultAppLogoUrl.length +')' : 'null'}. Attempting to set src to: ${newSrc ? newSrc.substring(0,70) : 'null'}...`, 'Attempt:', attemptCounter);
    setCurrentSrc(newSrc || ultimateFallbackPngLogo);
    setImgError(false); // Reset error on src change
  }, [props.appLogoUrl, props.defaultAppLogoUrl, attemptCounter]); // Add attemptCounter to dependencies


  const handleError = useCallback(() => {
    // console.error(`[Logo Component] Next/Image onError for src: ${currentSrc}. Attempt: ${attemptCounter}`);
    setImgError(true);

    let nextSrc = '';
    if (currentSrc === props.appLogoUrl && props.defaultAppLogoUrl) {
      // console.log("[Logo Component] Fallback 1: Trying defaultAppLogoUrl");
      nextSrc = props.defaultAppLogoUrl;
    } else if ((currentSrc === props.appLogoUrl || currentSrc === props.defaultAppLogoUrl) && currentSrc !== ultimateFallbackPngLogo) {
      // console.log("[Logo Component] Fallback 2: Trying ultimateFallbackPngLogo (/f_logo.png)");
      nextSrc = ultimateFallbackPngLogo;
    } else if (currentSrc === ultimateFallbackPngLogo && currentSrc !== absoluteUltimatePlaceholder) {
      // console.log("[Logo Component] Fallback 3: Trying absoluteUltimatePlaceholder (placehold.co)");
      nextSrc = absoluteUltimatePlaceholder;
    } else {
      // console.error("[Logo Component] All fallbacks exhausted or absolute placeholder also errored. Current src:", currentSrc);
      if (currentSrc === absoluteUltimatePlaceholder) return;
      nextSrc = absoluteUltimatePlaceholder;
    }

    if (nextSrc && currentSrc !== nextSrc) {
        // Instead of directly setting currentSrc, which might not trigger re-render correctly with next/image caching,
        // increment attemptCounter. The useEffect will then pick up the new props/state and set currentSrc.
        // This is a trick to force a re-evaluation of the image source by changing the key.
        setCurrentSrc(nextSrc); // Still set currentSrc to try the next source
        setImgError(false); // Reset error for the new attempt
        setAttemptCounter(prev => prev + 1);
    } else if (!nextSrc && currentSrc !== absoluteUltimatePlaceholder) {
        setCurrentSrc(absoluteUltimatePlaceholder);
        setImgError(false);
        setAttemptCounter(prev => prev + 1);
    }

  }, [currentSrc, props.appLogoUrl, props.defaultAppLogoUrl, ultimateFallbackPngLogo, absoluteUltimatePlaceholder, attemptCounter]);


  if (!currentSrc || (imgError && currentSrc === absoluteUltimatePlaceholder)) {
    // console.log(`[Logo Component] Absolute placeholder (${absoluteUltimatePlaceholder}) also failed or currentSrc is empty. Rendering minimal error indicator.`);
    return <div className="h-6 w-6 bg-destructive/20 flex items-center justify-center text-destructive text-xs rounded-full">!</div>;
  }

  const isDataUri = typeof currentSrc === 'string' && currentSrc.startsWith('data:');
  const isPlaceholderCo = typeof currentSrc === 'string' && currentSrc.startsWith('https://placehold.co');
  const unoptimized = isDataUri || isPlaceholderCo;

  const dataAiHint =
    currentSrc === props.appLogoUrl ? "custom app logo" :
    currentSrc === props.defaultAppLogoUrl ? "default app logo" :
    currentSrc === ultimateFallbackPngLogo ? "fallback f logo" : "placeholder";

  // console.log(`[Logo Component] Rendering NextImage. Key: ${currentSrc}-${attemptCounter} Source: ${typeof currentSrc === 'string' ? currentSrc.substring(0,70) : currentSrc}... (isDataUri: ${isDataUri}, unoptimized: ${unoptimized}, attempt: ${attemptCounter})`);

  return (
    <NextImage
      key={`${currentSrc}-${attemptCounter}`} // Key to help React differentiate and re-render
      src={currentSrc}
      alt={
        currentSrc === props.appLogoUrl ? "App Logo" :
        currentSrc === props.defaultAppLogoUrl ? "Default App Logo" :
        currentSrc === ultimateFallbackPngLogo ? "Finsculpt CRM F Logo (Fallback)" :
        "Logo Placeholder"
      }
      width={24}
      height={24}
      className="h-6 w-6 object-contain" // Ensure object-contain for aspect ratio
      data-ai-hint={dataAiHint}
      unoptimized={unoptimized} // Important for data URIs and external placeholders
      onError={handleError}
    />
  );
};


function AppContent({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const {
    isAuthenticated,
    isLoadingAuth,
    currentUser,
    logout,
    pinSetupRequiredForUser,
    appLogoUrl,
    defaultAppLogoUrl,
    headerLogoUrl, // Use this from context
    updateAppLogo,
    setDefaultAppLogo,
    updateUserProfilePicture,
    updateHeaderLogo, // Use this from context
  } = auth;
  const userProfilePicInputRef = useRef<HTMLInputElement>(null);
  const appLogoInputRef = useRef<HTMLInputElement>(null);
  const headerLogoInputRef = useRef<HTMLInputElement>(null); // New ref for header logo input
  const { toast } = useToast();

  const [isUserProfileCropperOpen, setIsUserProfileCropperOpen] = useState(false);
  const [userImageToCropSrc, setUserImageToCropSrc] = useState<string | null>(null);

  const [isAppLogoCropperOpen, setIsAppLogoCropperOpen] = useState(false);
  const [appLogoImageToCropSrc, setAppLogoImageToCropSrc] = useState<string | null>(null);

  const [isHeaderLogoCropperOpen, setIsHeaderLogoCropperOpen] = useState(false);
  const [headerLogoImageToCropSrc, setHeaderLogoImageToCropSrc] = useState<string | null>(null);

  // console.log('[AppContent] Rendering. Context values - appLogoUrl:', appLogoUrl ? `len: ${appLogoUrl.length}`: 'null', "defaultAppLogoUrl:", defaultAppLogoUrl ? `len: ${defaultAppLogoUrl.length}`: 'null', "headerLogoUrl:", headerLogoUrl ? `len: ${headerLogoUrl.length}`: 'null');

  const handleUserProfilePictureFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "Image Too Large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        });
         if (userProfilePicInputRef.current) {
          userProfilePicInputRef.current.value = '';
        }
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setUserImageToCropSrc(dataUri);
        setIsUserProfileCropperOpen(true);
      };
      reader.readAsDataURL(file);
      if (userProfilePicInputRef.current) {
        userProfilePicInputRef.current.value = '';
      }
    }
  };

  const handleUserCropSave = (croppedImageUrl: string) => {
    if (currentUser) {
        updateUserProfilePicture(croppedImageUrl);
    }
    setIsUserProfileCropperOpen(false);
    setUserImageToCropSrc(null);
  };

  const handleAppLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png') {
        toast({ title: "Invalid File Type", description: "Please upload a PNG file for the app logo.", variant: "destructive" });
        if (appLogoInputRef.current) appLogoInputRef.current.value = '';
        return;
      }
      if (file.size > 1 * 1024 * 1024) { // 1MB limit for App Logo
        toast({ title: "Logo Too Large", description: "Please select a PNG logo smaller than 1MB.", variant: "destructive" });
        if (appLogoInputRef.current) appLogoInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAppLogoImageToCropSrc(reader.result as string);
        setIsAppLogoCropperOpen(true);
      };
      reader.onerror = (e) => {
        console.error('[AppContent] App Logo FileReader onerror:', e);
        toast({ title: "File Read Error", description: "Could not read the selected app logo file.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
      if (appLogoInputRef.current) {
        appLogoInputRef.current.value = '';
      }
    }
  };

  const handleAppLogoCropSave = (croppedDataUri: string) => {
    updateAppLogo(croppedDataUri);
    setIsAppLogoCropperOpen(false);
    setAppLogoImageToCropSrc(null);
  };

  const handleSetCurrentLogoAsDefault = () => {
    if (appLogoUrl && currentUser?.role === 'partner') {
      setDefaultAppLogo(appLogoUrl);
    } else {
      toast({ title: "Action Not Available", description: "No custom app logo is currently set, or you don't have permission.", variant: "default"});
    }
  };

  const handleHeaderTextLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png') {
        toast({ title: "Invalid File Type", description: "Please upload a PNG file for the header logo.", variant: "destructive" });
        if (headerLogoInputRef.current) headerLogoInputRef.current.value = '';
        return;
      }
      if (file.size > 512 * 1024) { // 512KB limit for header text logo
        toast({ title: "Logo Too Large", description: "Please select a PNG logo smaller than 512KB for the header.", variant: "destructive" });
        if (headerLogoInputRef.current) headerLogoInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeaderLogoImageToCropSrc(reader.result as string);
        setIsHeaderLogoCropperOpen(true);
      };
      reader.readAsDataURL(file);
      if (headerLogoInputRef.current) {
        headerLogoInputRef.current.value = '';
      }
    }
  };

  const handleHeaderLogoCropSave = (croppedDataUri: string) => {
    updateHeaderLogo(croppedDataUri);
    setIsHeaderLogoCropperOpen(false);
    setHeaderLogoImageToCropSrc(null);
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
          <div className="flex items-center h-full w-full transition-all duration-300 ease-in-out group-data-[state=expanded]:justify-center group-data-[state=collapsed]:justify-center">
            <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors">
               <Logo appLogoUrl={appLogoUrl} defaultAppLogoUrl={defaultAppLogoUrl} />
            </Link>
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
      <SidebarInset className={cn("flex flex-col")}>
        <header className={cn(
          "sticky top-2 z-20 flex h-16 items-center justify-between px-4 md:px-6 mx-2 md:mx-4 rounded-lg",
          "glass-effect",
          "bg-background/50 dark:bg-background/40",
          "hover:shadow-2xl transition-shadow duration-300"
        )}>
          <div className="flex items-center gap-2 md:hidden">
            <SidebarTrigger />
            <Link href="/" className="font-semibold text-lg flex items-center gap-2">
             <Logo appLogoUrl={appLogoUrl} defaultAppLogoUrl={defaultAppLogoUrl} />
              <div className="flex items-center font-heading tracking-wide">
                {headerLogoUrl ? (
                  <img src={headerLogoUrl} alt="Header Logo" className="h-8 w-auto max-w-64 mr-1 object-contain" data-ai-hint="custom header logo mobile" />
                ) : (
                  <span className="mr-1">Finsculpt</span>
                )}
                <span>CRM</span>
              </div>
            </Link>
          </div>
          <div className="hidden md:flex items-center text-xl font-semibold font-heading tracking-wide">
            {headerLogoUrl ? (
              <img src={headerLogoUrl} alt="Header Logo" className="h-8 w-auto max-w-64 mr-1 object-contain" data-ai-hint="custom header logo" />
            ) : (
              <span className="mr-1">Finsculpt</span>
            )}
            <span>CRM</span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeSwitcher />
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
                    ref={userProfilePicInputRef}
                    onChange={handleUserProfilePictureFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-3"
                    onClick={() => userProfilePicInputRef.current?.click()}
                  >
                    <ImageUp className="mr-2 h-4 w-4" />
                    Change Profile Picture
                  </Button>
                </div>

                {currentUser?.role === 'partner' && (
                  <div className="p-1 mt-2 border-t border-border/20 pt-3">
                    <h4 className="font-medium leading-none text-sm font-heading tracking-wide mb-2">App Settings</h4>
                     <input
                        type="file"
                        ref={appLogoInputRef}
                        onChange={handleAppLogoFileChange}
                        accept="image/png"
                        className="hidden"
                      />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mb-1"
                      onClick={() => appLogoInputRef.current?.click()}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                       Change App Logo (PNG)
                    </Button>
                     <input
                        type="file"
                        ref={headerLogoInputRef}
                        onChange={handleHeaderTextLogoFileChange}
                        accept="image/png"
                        className="hidden"
                      />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mb-1"
                      onClick={() => headerLogoInputRef.current?.click()}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                       Change Header Text Logo (PNG)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mb-3"
                      onClick={handleSetCurrentLogoAsDefault}
                      disabled={!appLogoUrl}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                       Set Current App Logo as Default
                    </Button>
                  </div>
                )}

                <BackgroundImageSwitcher />
                {isAuthenticated && (
                  <Button onClick={logout} variant="outline" size="sm" className="w-full mt-4">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                )}
              </PopoverContent>
            </Popover>
             {currentUser && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name} />
                <AvatarFallback>{getFirstInitial(currentUser.name)}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>
        <main className={cn("flex-1 overflow-y-auto p-4 md:p-6 rounded-lg")}>
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
    {userImageToCropSrc && (
        <ImageCropperModal
          isOpen={isUserProfileCropperOpen}
          onClose={() => {
            setIsUserProfileCropperOpen(false);
            setUserImageToCropSrc(null);
          }}
          imageSrc={userImageToCropSrc}
          onCropSave={handleUserCropSave}
          aspectRatio={1 / 1}
        />
      )}
      {appLogoImageToCropSrc && (
        <ImageCropperModal
          isOpen={isAppLogoCropperOpen}
          onClose={() => {
            setIsAppLogoCropperOpen(false);
            setAppLogoImageToCropSrc(null);
          }}
          imageSrc={appLogoImageToCropSrc}
          onCropSave={handleAppLogoCropSave}
          aspectRatio={1 / 1}
        />
      )}
      {headerLogoImageToCropSrc && (
        <ImageCropperModal
          isOpen={isHeaderLogoCropperOpen}
          onClose={() => {
            setIsHeaderLogoCropperOpen(false);
            setHeaderLogoImageToCropSrc(null);
          }}
          imageSrc={headerLogoImageToCropSrc}
          onCropSave={handleHeaderLogoCropSave}
          aspectRatio={16 / 9}
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

