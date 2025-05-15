
'use client';

import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Inter, Montserrat, Anton } from 'next/font/google'; // Keep Anton if still used elsewhere, or remove
import './globals.css';
import { cn, getFirstInitial, getData, saveData } from '@/lib/utils';
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
import { LayoutDashboard, Users, Users2, Table, UserPlus as UserPlusIcon, Upload, Settings, LogOut, ImageUp, CheckCircle, Sun, Moon, Download, FileArchive, Menu as MenuIcon } from 'lucide-react'; // Added MenuIcon
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
import NextImage from 'next/image'; // Renamed to avoid conflict with window.Image
import { useTheme } from 'next-themes';
import { DataItemType } from '@/lib/types';
import ProfilePictureModal from '@/components/ProfilePictureModal';


const interBlack = Inter({
  subsets: ['latin'],
  weight: ['900'],
  variable: '--font-inter-black',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
});

const Logo: React.FC<{
  appLogoLightUrl: string | null;
  appLogoDarkUrl: string | null;
  defaultAppLogoLightUrl: string | null;
  defaultAppLogoDarkUrl: string | null;
}> = (props) => {
  const { resolvedTheme } = useTheme();
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [attemptCounter, setAttemptCounter] = useState(0);

  const ultimateFallbackPngLogo = "/f_logo.png";
  const absoluteUltimatePlaceholder = "https://placehold.co/64x64.png?text=F";

  useEffect(() => {
    let determinedSrc: string | null = null;
    if (resolvedTheme === 'dark') {
      determinedSrc = props.appLogoDarkUrl || props.defaultAppLogoDarkUrl || props.appLogoLightUrl || props.defaultAppLogoLightUrl || ultimateFallbackPngLogo;
    } else {
      determinedSrc = props.appLogoLightUrl || props.defaultAppLogoLightUrl || props.appLogoDarkUrl || props.defaultAppLogoDarkUrl || ultimateFallbackPngLogo;
    }
    setCurrentSrc(determinedSrc || ultimateFallbackPngLogo);
    setImgError(false);
  }, [props.appLogoLightUrl, props.appLogoDarkUrl, props.defaultAppLogoLightUrl, props.defaultAppLogoDarkUrl, resolvedTheme, ultimateFallbackPngLogo]);

  const handleError = useCallback(() => {
    setImgError(true);
    let nextSrc = '';
    if (currentSrc === props.appLogoDarkUrl) nextSrc = props.appLogoLightUrl || props.defaultAppLogoDarkUrl || props.defaultAppLogoLightUrl || ultimateFallbackPngLogo;
    else if (currentSrc === props.appLogoLightUrl) nextSrc = props.defaultAppLogoLightUrl || props.appLogoDarkUrl || props.defaultAppLogoDarkUrl || ultimateFallbackPngLogo;
    else if (currentSrc === props.defaultAppLogoDarkUrl) nextSrc = props.defaultAppLogoLightUrl || ultimateFallbackPngLogo;
    else if (currentSrc === props.defaultAppLogoLightUrl) nextSrc = ultimateFallbackPngLogo;
    else if (currentSrc === ultimateFallbackPngLogo && currentSrc !== absoluteUltimatePlaceholder) nextSrc = absoluteUltimatePlaceholder;
    else return;

    if (currentSrc !== nextSrc && nextSrc) {
      setCurrentSrc(nextSrc);
      setImgError(false);
      setAttemptCounter(prev => prev + 1);
    } else if (!nextSrc && currentSrc !== absoluteUltimatePlaceholder) {
      setCurrentSrc(absoluteUltimatePlaceholder);
      setImgError(false);
      setAttemptCounter(prev => prev + 1);
    }
  }, [currentSrc, props, attemptCounter, ultimateFallbackPngLogo, absoluteUltimatePlaceholder]);

  if (!currentSrc || (imgError && currentSrc === absoluteUltimatePlaceholder)) {
    return <div className="h-6 w-6 bg-destructive/20 flex items-center justify-center text-destructive text-xs rounded-full">!</div>;
  }
  
  const isDataUri = typeof currentSrc === 'string' && currentSrc.startsWith('data:');
  const isPlaceholderCo = typeof currentSrc === 'string' && currentSrc.startsWith('https://placehold.co');
  const unoptimized = isDataUri || isPlaceholderCo;

  return (
    <NextImage
      key={`${currentSrc}-${attemptCounter}-${resolvedTheme}`}
      src={currentSrc}
      alt="App Logo"
      width={24}
      height={24}
      className="h-6 w-6 object-contain"
      data-ai-hint="company app logo"
      unoptimized={unoptimized}
      onError={handleError}
    />
  );
};


function AppContent({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { resolvedTheme } = useTheme();
  const {
    currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser,
    appLogoLightUrl, appLogoDarkUrl, defaultAppLogoLightUrl, defaultAppLogoDarkUrl,
    headerLogoLightUrl, headerLogoDarkUrl,
    logout, updateUserProfilePicture,
    updateAppLogoLight, updateAppLogoDark, setDefaultAppLogoLight, setDefaultAppLogoDark,
    updateHeaderLogoLight, updateHeaderLogoDark,
    openMobile, // Get openMobile state from useSidebar via AuthContext or pass useSidebar here
  } = auth; // Assuming useAuth now exposes openMobile or we call useSidebar here. For now, let's assume useAuth gives us this.
                // If not, useSidebar() hook would need to be called directly in AppContent for openMobile.
                // For this change, I will assume useAuth is updated or we'd call useSidebar() directly in AppContent
                // Let's call useSidebar() for clarity:
  const { openMobile: isMobileSidebarOpen } = useSidebar(); // Call useSidebar from ui/sidebar
  
  const userProfilePicInputRef = useRef<HTMLInputElement>(null);
  
  const appLogoLightInputRef = useRef<HTMLInputElement>(null);
  const appLogoDarkInputRef = useRef<HTMLInputElement>(null);
  const headerLogoLightInputRef = useRef<HTMLInputElement>(null);
  const headerLogoDarkInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const [isUserProfileCropperOpen, setIsUserProfileCropperOpen] = useState(false);
  const [userImageToCropSrc, setUserImageToCropSrc] = useState<string | null>(null);

  const [isAppLogoLightCropperOpen, setIsAppLogoLightCropperOpen] = useState(false);
  const [appLogoLightImageToCropSrc, setAppLogoLightImageToCropSrc] = useState<string | null>(null);
  const [isAppLogoDarkCropperOpen, setIsAppLogoDarkCropperOpen] = useState(false);
  const [appLogoDarkImageToCropSrc, setAppLogoDarkImageToCropSrc] = useState<string | null>(null);

  const [isHeaderLogoLightCropperOpen, setIsHeaderLogoLightCropperOpen] = useState(false);
  const [headerLogoLightImageToCropSrc, setHeaderLogoLightImageToCropSrc] = useState<string | null>(null);
  const [isHeaderLogoDarkCropperOpen, setIsHeaderLogoDarkCropperOpen] = useState(false);
  const [headerLogoDarkImageToCropSrc, setHeaderLogoDarkImageToCropSrc] = useState<string | null>(null);

  const [isUserAvatarModalOpen, setIsUserAvatarModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const APP_HARDCODED_DEFAULT_BACKGROUND_LAYOUT = 'https://placehold.co/1920x1080.png';
      
      const applyInitialBackground = (url: string | null) => {
        document.body.style.backgroundImage = url ? `url('${url}')` : '';
        if (url) {
          document.body.setAttribute('data-ai-hint', 'custom background');
        } else {
          document.body.setAttribute('data-ai-hint', 'abstract gradient');
        }
      };

      const storedCustomBg = getData<string>(DataItemType.BackgroundImage);
      const storedDefaultBg = getData<string>(DataItemType.DefaultBackgroundImage);

      if (storedCustomBg) {
        applyInitialBackground(storedCustomBg);
      } else if (storedDefaultBg) {
        applyInitialBackground(storedDefaultBg);
      } else {
        applyInitialBackground(APP_HARDCODED_DEFAULT_BACKGROUND_LAYOUT);
      }
    }
  }, []); 

  const handleFileChangeGeneric = (
    event: React.ChangeEvent<HTMLInputElement>, 
    setCropSrc: (src: string | null) => void, 
    setCropperOpen: (open: boolean) => void, 
    maxSizeMB: number, 
    toastTitle: string,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({ title: "Image Too Large", description: `Please select an image smaller than ${maxSizeMB}MB.`, variant: "destructive" });
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      if (toastTitle.toLowerCase().includes("logo") && !file.type.startsWith('image/png')) {
         toast({ title: "Invalid File Type", description: "Please upload a PNG file for logos.", variant: "destructive" });
         if (inputRef.current) inputRef.current.value = '';
         return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setCropSrc(dataUri);
        setCropperOpen(true);
      };
      reader.onerror = (e) => {
        toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleUserProfilePictureFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setUserImageToCropSrc, setIsUserProfileCropperOpen, 2, "User Profile Picture", userProfilePicInputRef);
  const handleUserCropSave = (croppedImageUrl: string) => {
    if (currentUser) updateUserProfilePicture(croppedImageUrl);
    setIsUserProfileCropperOpen(false); setUserImageToCropSrc(null);
  };

  const handleAppLogoLightFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setAppLogoLightImageToCropSrc, setIsAppLogoLightCropperOpen, 1, "Light App Logo", appLogoLightInputRef);
  const handleAppLogoLightCropSave = (croppedDataUri: string) => { updateAppLogoLight(croppedDataUri); setIsAppLogoLightCropperOpen(false); setAppLogoLightImageToCropSrc(null); };
  
  const handleAppLogoDarkFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setAppLogoDarkImageToCropSrc, setIsAppLogoDarkCropperOpen, 1, "Dark App Logo", appLogoDarkInputRef);
  const handleAppLogoDarkCropSave = (croppedDataUri: string) => { updateAppLogoDark(croppedDataUri); setIsAppLogoDarkCropperOpen(false); setAppLogoDarkImageToCropSrc(null); };

  const handleSetCurrentLightLogoAsDefault = () => { if (appLogoLightUrl && currentUser?.role === 'partner') setDefaultAppLogoLight(appLogoLightUrl); else toast({ title: "Action Not Available", description: "No custom light app logo is currently set, or insufficient permissions.", variant: "default"}); };
  const handleSetCurrentDarkLogoAsDefault = () => { if (appLogoDarkUrl && currentUser?.role === 'partner') setDefaultAppLogoDark(appLogoDarkUrl); else toast({ title: "Action Not Available", description: "No custom dark app logo is currently set, or insufficient permissions.", variant: "default"}); };

  const handleHeaderLogoLightFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setHeaderLogoLightImageToCropSrc, setIsHeaderLogoLightCropperOpen, 0.5, "Light Header Logo", headerLogoLightInputRef);
  const handleHeaderLogoLightCropSave = (croppedDataUri: string) => { updateHeaderLogoLight(croppedDataUri); setIsHeaderLogoLightCropperOpen(false); setHeaderLogoLightImageToCropSrc(null); };

  const handleHeaderLogoDarkFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setHeaderLogoDarkImageToCropSrc, setIsHeaderLogoDarkCropperOpen, 0.5, "Dark Header Logo", headerLogoDarkInputRef);
  const handleHeaderLogoDarkCropSave = (croppedDataUri: string) => { updateHeaderLogoDark(croppedDataUri); setIsHeaderLogoDarkCropperOpen(false); setHeaderLogoDarkImageToCropSrc(null); };


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
  
  const currentHeaderLogo = resolvedTheme === 'dark' ? (headerLogoDarkUrl || headerLogoLightUrl) : (headerLogoLightUrl || headerLogoDarkUrl);

  return (
    <>
    <SidebarProvider defaultPinnedOpen={true}>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center h-full w-full transition-all duration-300 ease-in-out group-data-[state=expanded]:justify-center group-data-[state=collapsed]:justify-center">
            <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors">
              <Logo 
                appLogoLightUrl={appLogoLightUrl} 
                appLogoDarkUrl={appLogoDarkUrl}
                defaultAppLogoLightUrl={defaultAppLogoLightUrl} 
                defaultAppLogoDarkUrl={defaultAppLogoDarkUrl}
              />
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
            {currentUser?.role === 'partner' && (
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Export Data">
                    <Link href="/export-data">
                        <FileArchive /> {/* Changed icon for Export */}
                        <span className="group-data-[state=collapsed]:hidden">Export Data</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 flex justify-end items-center group-data-[state=collapsed]:justify-center">
           <SidebarTrigger>
             <PanelLeft /> {/* Default Desktop Trigger Icon */}
           </SidebarTrigger>
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
            <SidebarTrigger>
              <MenuIcon /> {/* Hamburger icon for mobile */}
            </SidebarTrigger>
            {!isMobileSidebarOpen && ( /* Conditionally render logo and text if mobile sidebar is closed */
              <Link href="/" className="font-semibold text-lg flex items-center gap-2">
                <Logo 
                  appLogoLightUrl={appLogoLightUrl} 
                  appLogoDarkUrl={appLogoDarkUrl}
                  defaultAppLogoLightUrl={defaultAppLogoLightUrl} 
                  defaultAppLogoDarkUrl={defaultAppLogoDarkUrl}
                />
                <div className="flex items-center font-heading">
                  {currentHeaderLogo ? (
                    <img src={currentHeaderLogo} alt="Header Logo" className="h-10 w-auto max-w-xs mr-1 object-contain" data-ai-hint="custom header logo mobile" />
                  ) : (
                    <span className="mr-1">Finsculpt</span>
                  )}
                  <span>CRM</span>
                </div>
              </Link>
            )}
          </div>
          <div className="hidden md:flex items-center text-xl font-semibold font-heading">
            {currentHeaderLogo ? (
              <img src={currentHeaderLogo} alt="Header Logo" className="h-10 w-auto max-w-xs mr-1 object-contain" data-ai-hint="custom header logo" />
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
                  <h4 className="font-medium leading-none text-sm font-heading mb-2">User</h4>
                  {currentUser && (
                    <div className="flex items-center gap-3 mb-3 p-2 rounded-md bg-muted/30">
                       <button
                        onClick={() => {
                          if (currentUser.profilePictureUrl) {
                            setIsUserAvatarModalOpen(true);
                          }
                        }}
                        className={cn("rounded-full", currentUser.profilePictureUrl && "cursor-pointer hover:opacity-80 transition-opacity")}
                        aria-label="View profile picture"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name} />
                          <AvatarFallback>{getFirstInitial(currentUser.name)}</AvatarFallback>
                        </Avatar>
                      </button>
                      <div>
                        <p className="text-sm font-medium">{currentUser.name}</p>
                        <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                      </div>
                    </div>
                  )}
                  <input type="file" ref={userProfilePicInputRef} onChange={handleUserProfilePictureFileChange} accept="image/*" className="hidden"/>
                  <Button variant="outline" size="sm" className="w-full mb-3" onClick={() => userProfilePicInputRef.current?.click()}> <ImageUp className="mr-2 h-4 w-4" /> Change Profile Picture </Button>
                </div>

                {currentUser?.role === 'partner' && (
                  <div className="p-1 mt-2 border-t border-border/20 pt-3">
                    <h4 className="font-medium leading-none text-sm font-heading mb-2">App & Header Logos</h4>
                    
                    <input type="file" ref={appLogoLightInputRef} onChange={handleAppLogoLightFileChange} accept="image/png" className="hidden"/>
                    <Button variant="outline" size="sm" className="w-full mb-1" onClick={() => appLogoLightInputRef.current?.click()}> <Sun className="mr-2 h-4 w-4" /> App Logo (Light) </Button>
                    <Button variant="outline" size="sm" className="w-full mb-1" onClick={handleSetCurrentLightLogoAsDefault} disabled={!appLogoLightUrl}> <CheckCircle className="mr-2 h-4 w-4" /> Set as Default Light App Logo </Button>

                    <input type="file" ref={appLogoDarkInputRef} onChange={handleAppLogoDarkFileChange} accept="image/png" className="hidden"/>
                    <Button variant="outline" size="sm" className="w-full mb-1 mt-2" onClick={() => appLogoDarkInputRef.current?.click()}> <Moon className="mr-2 h-4 w-4" /> App Logo (Dark) </Button>
                    <Button variant="outline" size="sm" className="w-full mb-3" onClick={handleSetCurrentDarkLogoAsDefault} disabled={!appLogoDarkUrl}> <CheckCircle className="mr-2 h-4 w-4" /> Set as Default Dark App Logo </Button>

                    <input type="file" ref={headerLogoLightInputRef} onChange={handleHeaderLogoLightFileChange} accept="image/png" className="hidden"/>
                    <Button variant="outline" size="sm" className="w-full mb-1 mt-2" onClick={() => headerLogoLightInputRef.current?.click()}> <Sun className="mr-2 h-4 w-4" /> Header Logo (Light) </Button>
                    
                    <input type="file" ref={headerLogoDarkInputRef} onChange={handleHeaderLogoDarkFileChange} accept="image/png" className="hidden"/>
                    <Button variant="outline" size="sm" className="w-full mb-3" onClick={() => headerLogoDarkInputRef.current?.click()}> <Moon className="mr-2 h-4 w-4" /> Header Logo (Dark) </Button>
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
               <button
                onClick={() => {
                  if (currentUser.profilePictureUrl) {
                    setIsUserAvatarModalOpen(true);
                  }
                }}
                className={cn("rounded-full", currentUser.profilePictureUrl && "cursor-pointer hover:opacity-80 transition-opacity")}
                aria-label="View profile picture"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name} />
                  <AvatarFallback>{getFirstInitial(currentUser.name)}</AvatarFallback>
                </Avatar>
              </button>
            )}
          </div>
        </header>
        <main className={cn("flex-1 overflow-y-auto p-4 md:p-6")}>
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
    
    {isUserAvatarModalOpen && <ProfilePictureModal isOpen={isUserAvatarModalOpen} onClose={() => setIsUserAvatarModalOpen(false)} imageUrl={currentUser?.profilePictureUrl} altText={currentUser?.name} />}
    {userImageToCropSrc && <ImageCropperModal isOpen={isUserProfileCropperOpen} onClose={() => {setIsUserProfileCropperOpen(false); setUserImageToCropSrc(null);}} imageSrc={userImageToCropSrc} onCropSave={handleUserCropSave} aspectRatio={1/1} />}
    {appLogoLightImageToCropSrc && <ImageCropperModal isOpen={isAppLogoLightCropperOpen} onClose={() => {setIsAppLogoLightCropperOpen(false); setAppLogoLightImageToCropSrc(null);}} imageSrc={appLogoLightImageToCropSrc} onCropSave={handleAppLogoLightCropSave} aspectRatio={1/1} />}
    {appLogoDarkImageToCropSrc && <ImageCropperModal isOpen={isAppLogoDarkCropperOpen} onClose={() => {setIsAppLogoDarkCropperOpen(false); setAppLogoDarkImageToCropSrc(null);}} imageSrc={appLogoDarkImageToCropSrc} onCropSave={handleAppLogoDarkCropSave} aspectRatio={1/1} />}
    {headerLogoLightImageToCropSrc && <ImageCropperModal isOpen={isHeaderLogoLightCropperOpen} onClose={() => {setIsHeaderLogoLightCropperOpen(false); setHeaderLogoLightImageToCropSrc(null);}} imageSrc={headerLogoLightImageToCropSrc} onCropSave={handleHeaderLogoLightCropSave} aspectRatio={16/9} />}
    {headerLogoDarkImageToCropSrc && <ImageCropperModal isOpen={isHeaderLogoDarkCropperOpen} onClose={() => {setIsHeaderLogoDarkCropperOpen(false); setHeaderLogoDarkImageToCropSrc(null);}} imageSrc={headerLogoDarkImageToCropSrc} onCropSave={handleHeaderLogoDarkCropSave} aspectRatio={16/9} />}
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
          interBlack.variable,
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
            {/* useSidebar needs to be within SidebarProvider, 
                so AppContent needs to be a child of SidebarProvider if it uses useSidebar */}
            <SidebarProvider defaultPinnedOpen={true}> 
              <AppContent>{children}</AppContent>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
// Removed SidebarProvider from inside AuthProvider in RootLayout
// and wrapped AppContent with SidebarProvider instead.
// This ensures useSidebar() inside AppContent has access to its context.

// Also had to ensure PanelLeft is imported for the desktop sidebar trigger.
// It might have been unintentionally removed earlier.
// Added MenuIcon to imports as well for the mobile trigger.


    