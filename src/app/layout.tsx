
'use client';

import type { Metadata } from 'next';
import { Inter_Tight, Montserrat } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { cn, getFirstInitial, getData, saveData, hexToHslString } from '@/lib/utils';
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
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { LayoutDashboard, Users, Users2, Table, UserPlus as UserPlusIcon, Upload, Settings, LogOut, ImageUp, CheckCircle, Sun, Moon, Download, FileArchive, Menu as MenuIcon, PanelLeft, Palette, Trash2 } from 'lucide-react';
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
import NextImage from 'next/image';
import { useTheme } from 'next-themes';
import { DataItemType, UserThemeSettings } from '@/lib/types';
import ProfilePictureModal from '@/components/ProfilePictureModal';
import { SketchPicker, type ColorResult } from 'react-color';
import { Separator } from '@/components/ui/separator';


const interBlack = Inter_Tight({
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
    console.log(`[Logo Component] useEffect running. Theme: ${resolvedTheme}`, props);

    if (resolvedTheme === 'dark') {
      determinedSrc = props.appLogoDarkUrl || props.defaultAppLogoDarkUrl || props.appLogoLightUrl || props.defaultAppLogoLightUrl || ultimateFallbackPngLogo;
    } else {
      determinedSrc = props.appLogoLightUrl || props.defaultAppLogoLightUrl || props.appLogoDarkUrl || props.defaultAppLogoDarkUrl || ultimateFallbackPngLogo;
    }
    
    if (currentSrc !== determinedSrc || imgError) {
      console.log(`[Logo Component] useEffect - Determined src: ${determinedSrc ? determinedSrc.substring(0,30)+'...' : 'null'}`);
      setCurrentSrc(determinedSrc || ultimateFallbackPngLogo);
      setImgError(false);
      if(currentSrc !== determinedSrc) setAttemptCounter(0); 
    }
  }, [
      props.appLogoLightUrl, 
      props.appLogoDarkUrl, 
      props.defaultAppLogoLightUrl, 
      props.defaultAppLogoDarkUrl, 
      resolvedTheme,
      currentSrc, 
      imgError,
      ultimateFallbackPngLogo
  ]);
  
  const handleError = useCallback(() => {
    console.error(`[Logo Component] Error loading image: ${currentSrc ? currentSrc.substring(0,50)+'...' : 'currentSrc is null'}. Attempt: ${attemptCounter}`);
    setImgError(true);
    let nextSrc = '';
    const currentAttemptSrc = currentSrc; 

    if (currentAttemptSrc !== ultimateFallbackPngLogo && ultimateFallbackPngLogo && attemptCounter < 1) {
        nextSrc = ultimateFallbackPngLogo;
        console.log(`[Logo Component] Falling back to ultimateFallbackPngLogo: ${nextSrc}`);
    } else if (currentAttemptSrc !== absoluteUltimatePlaceholder && attemptCounter < 2) {
        nextSrc = absoluteUltimatePlaceholder;
        console.log(`[Logo Component] Falling back to absoluteUltimatePlaceholder: ${nextSrc}`);
    }

    if (currentAttemptSrc !== nextSrc && nextSrc) {
      setCurrentSrc(nextSrc);
      setImgError(false); 
      setAttemptCounter(prev => prev + 1); 
    } else if (!nextSrc && currentAttemptSrc !== absoluteUltimatePlaceholder && attemptCounter < 2) {
      setCurrentSrc(absoluteUltimatePlaceholder);
      setImgError(false);
      setAttemptCounter(prev => prev + 1);
    } else if (attemptCounter >= 2) {
        console.warn("[Logo Component] All fallback attempts exhausted.");
    }
  }, [currentSrc, ultimateFallbackPngLogo, absoluteUltimatePlaceholder, attemptCounter]);


  const logoToDisplay = imgError && attemptCounter >= 2 ? absoluteUltimatePlaceholder : (currentSrc || ultimateFallbackPngLogo);

  const isDataUri = typeof logoToDisplay === 'string' && logoToDisplay.startsWith('data:');
  const isPlaceholderCo = typeof logoToDisplay === 'string' && logoToDisplay.startsWith('https://placehold.co');
  const unoptimized = isDataUri || isPlaceholderCo;
  
  console.log(`[Logo Component] Rendering with. Source: ${logoToDisplay ? logoToDisplay.substring(0,30)+'...' : 'null'} (isDataUri: ${isDataUri}, attempt: ${attemptCounter})`);

  if (!logoToDisplay || (imgError && logoToDisplay === absoluteUltimatePlaceholder && attemptCounter >=2 )) {
     console.log("[Logo Component] Rendering fallback div due to error or no src.");
    return <div className="h-6 w-6 bg-muted/20 flex items-center justify-center text-destructive text-xs rounded-full">F</div>;
  }
  
  return (
      <NextImage
        key={`${logoToDisplay}-${attemptCounter}-${resolvedTheme}`}
        src={logoToDisplay}
        alt="Finsculpt CRM Logo"
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
  const { toggleSidebar, openMobile: isMobileSidebarOpen } = useSidebar(); // Call useSidebar from ui/sidebar

  const auth = useAuth();
  const {
    currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser,
    appLogoLightUrl, appLogoDarkUrl, defaultAppLogoLightUrl, defaultAppLogoDarkUrl,
    headerLogoLightUrl, headerLogoDarkUrl,
    currentUserThemeSettings,
    logout, updateUserProfilePicture,
    updateAppLogoLight, updateAppLogoDark, setDefaultAppLogoLight, setDefaultAppLogoDark,
    updateHeaderLogoLight, updateHeaderLogoDark,
    updateCustomAccentColor,
    updateChartPieColorOpen, updateChartPieColorClosed, updateChartPieColorMissed, updateChartPieColorOther,
  } = auth;
  
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();

  const userProfilePicInputRef = useRef<HTMLInputElement>(null);
  const appLogoLightInputRef = useRef<HTMLInputElement>(null);
  const appLogoDarkInputRef = useRef<HTMLInputElement>(null);
  const headerLogoLightInputRef = useRef<HTMLInputElement>(null);
  const headerLogoDarkInputRef = useRef<HTMLInputElement>(null);

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
  
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const [currentAccentPickerColor, setCurrentAccentPickerColor] = useState('#008080'); 

  const [showChartColorPicker, setShowChartColorPicker] = useState<keyof UserThemeSettings | null>(null);
  const [currentChartPickerColor, setCurrentChartPickerColor] = useState('#000000');

  const chartColorConfig: {
    label: string;
    stateValue: string | null | undefined;
    updateFn: (hex: string | null) => void;
    pickerKey: keyof UserThemeSettings;   
  }[] = [
    { label: 'Open Status Color', stateValue: currentUserThemeSettings?.chartPieColorOpen, updateFn: updateChartPieColorOpen, pickerKey: 'chartPieColorOpen' },
    { label: 'Closed Status Color', stateValue: currentUserThemeSettings?.chartPieColorClosed, updateFn: updateChartPieColorClosed, pickerKey: 'chartPieColorClosed' },
    { label: 'Missed Status Color', stateValue: currentUserThemeSettings?.chartPieColorMissed, updateFn: updateChartPieColorMissed, pickerKey: 'chartPieColorMissed' },
    { label: 'Other Status Color', stateValue: currentUserThemeSettings?.chartPieColorOther, updateFn: updateChartPieColorOther, pickerKey: 'chartPieColorOther' },
  ];
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const APP_HARDCODED_DEFAULT_BACKGROUND = 'https://placehold.co/1920x1080.png'; 
      
      const applyInitialBackground = (url: string | null) => {
        document.body.style.backgroundImage = url ? `url('${url}')` : `url('${APP_HARDCODED_DEFAULT_BACKGROUND}')`;
        document.body.setAttribute('data-ai-hint', url ? 'custom background' : 'abstract gradient');
      };

      const storedCustomBg = getData<string>(DataItemType.BackgroundImage);
      const storedDefaultBg = getData<string>(DataItemType.DefaultBackgroundImage);

      if (storedCustomBg) {
        applyInitialBackground(storedCustomBg);
      } else if (storedDefaultBg) {
        applyInitialBackground(storedDefaultBg);
      } else {
        applyInitialBackground(APP_HARDCODED_DEFAULT_BACKGROUND); 
      }
    }
  }, []);


  useEffect(() => {
    setCurrentAccentPickerColor(currentUserThemeSettings?.accentColor || '#008080'); 
  }, [currentUserThemeSettings?.accentColor]);

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
      console.log(`[AppContent] ${toastTitle} File selected:`, file.name, file.size, file.type);
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
      reader.onloadstart = () => console.log(`[AppContent] ${toastTitle} FileReader started.`);
      reader.onprogress = (e) => console.log(`[AppContent] ${toastTitle} FileReader progress: ${e.loaded}/${e.total}`);
      reader.onloadend = () => { 
        console.log(`[AppContent] ${toastTitle} FileReader ended. Result length:`, (reader.result as string)?.length);
        setCropSrc(reader.result as string); 
        setCropperOpen(true); 
        console.log(`[AppContent] ${toastTitle} Cropper modal should be open now.`);
      };
      reader.onerror = (e) => {
        console.error(`[AppContent] ${toastTitle} FileReader error:`, e);
        toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
      if (inputRef.current) { 
        inputRef.current.value = '';
      }
    } else {
      console.log(`[AppContent] ${toastTitle} No file selected or selection cancelled.`);
    }
  };

  const handleUserProfilePictureFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setUserImageToCropSrc, setIsUserProfileCropperOpen, 2, "User Profile Picture", userProfilePicInputRef);
  const handleUserCropSave = (croppedImageUrl: string) => { if (currentUser) updateUserProfilePicture(croppedImageUrl); setIsUserProfileCropperOpen(false); setUserImageToCropSrc(null); };
  
  const handleAppLogoLightFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setAppLogoLightImageToCropSrc, setIsAppLogoLightCropperOpen, 1, "Light App Logo", appLogoLightInputRef);
  const handleAppLogoLightCropSave = (croppedDataUri: string) => { updateAppLogoLight(croppedDataUri); setIsAppLogoLightCropperOpen(false); setAppLogoLightImageToCropSrc(null); };
  const handleAppLogoDarkFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setAppLogoDarkImageToCropSrc, setIsAppLogoDarkCropperOpen, 1, "Dark App Logo", appLogoDarkInputRef);
  const handleAppLogoDarkCropSave = (croppedDataUri: string) => { updateAppLogoDark(croppedDataUri); setIsAppLogoDarkCropperOpen(false); setAppLogoDarkImageToCropSrc(null); };
  
  const handleSetCurrentLightLogoAsDefault = () => { if (appLogoLightUrl && currentUser?.role === 'partner') setDefaultAppLogoLight(appLogoLightUrl); else toast({ title: "Action Not Available", description: "No light theme logo is currently set.", variant: "default"}); };
  const handleSetCurrentDarkLogoAsDefault = () => { if (appLogoDarkUrl && currentUser?.role === 'partner') setDefaultAppLogoDark(appLogoDarkUrl); else toast({ title: "Action Not Available", description: "No dark theme logo is currently set.", variant: "default"}); };
  
  const handleHeaderLogoLightFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setHeaderLogoLightImageToCropSrc, setIsHeaderLogoLightCropperOpen, 0.5, "Light Header Logo", headerLogoLightInputRef);
  const handleHeaderLogoLightCropSave = (croppedDataUri: string) => { updateHeaderLogoLight(croppedDataUri); setIsHeaderLogoLightCropperOpen(false); setHeaderLogoLightImageToCropSrc(null); };
  const handleHeaderLogoDarkFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setHeaderLogoDarkImageToCropSrc, setIsHeaderLogoDarkCropperOpen, 0.5, "Dark Header Logo", headerLogoDarkInputRef);
  const handleHeaderLogoDarkCropSave = (croppedDataUri: string) => { updateHeaderLogoDark(croppedDataUri); setIsHeaderLogoDarkCropperOpen(false); setHeaderLogoDarkImageToCropSrc(null); };

  const handleAccentColorChange = (color: ColorResult) => setCurrentAccentPickerColor(color.hex);
  const handleAccentColorSave = () => { updateCustomAccentColor(currentAccentPickerColor); setShowAccentPicker(false); };
  const handleAccentColorReset = () => { updateCustomAccentColor(null); setCurrentAccentPickerColor('#008080'); setShowAccentPicker(false); };

  const handleChartColorPickerToggle = (pickerKey: keyof UserThemeSettings) => {
    const config = chartColorConfig.find(c => c.pickerKey === pickerKey);
    if (config) {
      setCurrentChartPickerColor(config.stateValue || '#000000'); 
    }
    setShowChartColorPicker(prev => prev === pickerKey ? null : pickerKey);
  };
  const handleChartColorChange = (color: ColorResult) => setCurrentChartPickerColor(color.hex);
  const handleChartColorSave = () => {
    if (showChartColorPicker) {
        const config = chartColorConfig.find(c => c.pickerKey === showChartColorPicker);
        if (config) config.updateFn(currentChartPickerColor);
    }
    setShowChartColorPicker(null); 
  };
  const handleChartColorReset = (pickerKey: keyof UserThemeSettings) => {
    const config = chartColorConfig.find(c => c.pickerKey === pickerKey);
    if (config) config.updateFn(null);
    if (showChartColorPicker === pickerKey) setShowChartColorPicker(null); 
  };

  const currentHeaderLogoToDisplay = resolvedTheme === 'dark' 
    ? (headerLogoDarkUrl || headerLogoLightUrl) 
    : (headerLogoLightUrl || headerLogoDarkUrl); 

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
  if (pinSetupRequiredForUser) return <SetPinScreen userToSetupPinFor={pinSetupRequiredForUser} />;
  if (!isAuthenticated) return <PinLoginScreen />;
  
  const spanClasses = "inline-block group-data-[state=collapsed]:hidden group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:overflow-hidden";

  return (
    <>
    <SidebarProvider defaultPinnedOpen={true}>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center h-full w-full transition-all duration-300 ease-in-out group-data-[state=expanded]:justify-center group-data-[state=collapsed]:justify-center">
            <Logo 
              appLogoLightUrl={appLogoLightUrl} 
              appLogoDarkUrl={appLogoDarkUrl}
              defaultAppLogoLightUrl={defaultAppLogoLightUrl} 
              defaultAppLogoDarkUrl={defaultAppLogoDarkUrl}
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="Dashboard"><Link href="/"><LayoutDashboard /><span className={spanClasses}>Dashboard</span></Link></SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="All Customers"><Link href="/customers"><Users /><span className={spanClasses}>All Customers</span></Link></SidebarMenuButton></SidebarMenuItem>
            {currentUser?.role === 'partner' && <SidebarMenuItem><SidebarMenuButton asChild tooltip="Team Management"><Link href="/users"><Users2 /><span className={spanClasses}>Team Management</span></Link></SidebarMenuButton></SidebarMenuItem>}
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="Data Grid"><Link href="/data-grid"><Table /><span className={spanClasses}>Data Grid</span></Link></SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="Add Customer"><Link href="/add-customer"><UserPlusIcon /><span className={spanClasses}>Add Customer</span></Link></SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="Import Data"><Link href="/import"><Upload /><span className={spanClasses}>Import Data</span></Link></SidebarMenuButton></SidebarMenuItem>
            {currentUser?.role === 'partner' && <SidebarMenuItem><SidebarMenuButton asChild tooltip="Export Data"><Link href="/export-data"><Download /><span className={spanClasses}>Export Data</span></Link></SidebarMenuButton></SidebarMenuItem>}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 flex justify-end items-center group-data-[state=collapsed]:justify-center">
           <SidebarTrigger><PanelLeft /></SidebarTrigger>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className={cn("sticky top-2 z-20 flex h-16 items-center justify-between px-4 md:px-6 mx-2 md:mx-4 rounded-lg glass-effect bg-background/50 dark:bg-background/40 hover:shadow-2xl transition-shadow duration-300")}>
          <div className="flex items-center gap-2 md:hidden">
            <SidebarTrigger><MenuIcon /></SidebarTrigger>
            {!isMobileSidebarOpen && ( 
              <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-foreground hover:text-primary transition-colors" aria-label="View dashboard">
                <div className="flex items-center font-heading">
                  {currentHeaderLogoToDisplay ? <NextImage src={currentHeaderLogoToDisplay} alt="Header Logo" width={256} height={48} className="h-12 w-auto max-w-sm mr-1 object-contain" data-ai-hint="custom header logo mobile" unoptimized/> : <span className="mr-1">Finsculpt</span>}
                  <span>CRM</span>
                </div>
              </Link>
            )}
          </div>
          <div className="hidden md:flex items-center text-xl font-semibold font-heading">
            {currentHeaderLogoToDisplay ? <NextImage src={currentHeaderLogoToDisplay} alt="Header Logo" width={256} height={48} className="h-12 w-auto max-w-sm mr-1 object-contain" data-ai-hint="custom header logo" unoptimized/> : <span className="mr-1">Finsculpt</span>}
            <span>CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeSwitcher />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-md">
                  <Settings className="h-5 w-5" /><span className="sr-only">Settings</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 sm:w-[672px] glass-effect bg-popover/80 dark:bg-popover/60 border-white/10 dark:border-white/5 max-h-[calc(100vh-8rem)] overflow-y-auto p-1">
                {/* Top Section */}
                <div className="space-y-3 p-3 mb-3">
                  <h4 className="font-medium leading-none text-sm font-heading">
                    {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'User'}
                  </h4>
                  {currentUser && (
                    <div className="flex flex-col items-center space-y-3 mb-4">
                      <button onClick={() => { if (currentUser.profilePictureUrl) setIsUserAvatarModalOpen(true); }} className={cn("rounded-full", currentUser.profilePictureUrl && "cursor-pointer hover:opacity-80 transition-opacity")} aria-label="View profile picture">
                        <Avatar className="h-24 w-24"><AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name} /><AvatarFallback className="text-3xl">{getFirstInitial(currentUser.name)}</AvatarFallback></Avatar>
                      </button>
                      <div><p className="text-sm font-medium text-center">{currentUser.name}</p><p className="text-xs text-muted-foreground text-center">{currentUser.email}</p></div>
                       <input type="file" ref={userProfilePicInputRef} onChange={handleUserProfilePictureFileChange} accept="image/*" className="hidden"/>
                       <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={() => userProfilePicInputRef.current?.click()}><ImageUp className="mr-2 h-4 w-4" />Change Profile Picture</Button>
                    </div>
                  )}
                </div>
                <Separator className="my-4" />
                {/* Bottom Section - Two Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 pt-2 px-3 pb-3">
                   {/* Left Column: Partner-only settings */}
                   <div className="space-y-6">
                    {currentUser?.role === 'partner' && (
                      <div className="space-y-3">
                        <h4 className="font-medium leading-none text-sm font-heading mb-2">App & Header Logos</h4>
                        <input type="file" ref={appLogoLightInputRef} onChange={handleAppLogoLightFileChange} accept="image/png" className="hidden"/>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={() => appLogoLightInputRef.current?.click()}><Sun className="mr-2 h-4 w-4" />App Logo (Light)</Button>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={handleSetCurrentLightLogoAsDefault} disabled={!appLogoLightUrl}><CheckCircle className="mr-2 h-4 w-4" />Set as Default Light</Button>
                        <input type="file" ref={appLogoDarkInputRef} onChange={handleAppLogoDarkFileChange} accept="image/png" className="hidden"/>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={() => appLogoDarkInputRef.current?.click()}><Moon className="mr-2 h-4 w-4" />App Logo (Dark)</Button>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={handleSetCurrentDarkLogoAsDefault} disabled={!appLogoDarkUrl}><CheckCircle className="mr-2 h-4 w-4" />Set as Default Dark</Button>
                        <input type="file" ref={headerLogoLightInputRef} onChange={handleHeaderLogoLightFileChange} accept="image/png" className="hidden"/>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={() => headerLogoLightInputRef.current?.click()}><Sun className="mr-2 h-4 w-4" />Header Logo (Light)</Button>
                        <input type="file" ref={headerLogoDarkInputRef} onChange={handleHeaderLogoDarkFileChange} accept="image/png" className="hidden"/>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={() => headerLogoDarkInputRef.current?.click()}><Moon className="mr-2 h-4 w-4" />Header Logo (Dark)</Button>
                      </div>
                    )}
                     <div className="space-y-3"> {/* Theme Customization - For All Users */}
                        <h4 className="font-medium leading-none text-sm font-heading mb-2">Theme Customization</h4>
                        <div className="space-y-1">
                          <Button variant="outline" size="sm" className="w-full h-9" onClick={() => setShowAccentPicker(!showAccentPicker)}><Palette className="mr-2 h-4 w-4" />{showAccentPicker ? "Hide" : "Change"} Accent Color</Button>
                          {(currentUserThemeSettings?.accentColor) && ( 
                            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-destructive h-8" onClick={handleAccentColorReset}><Trash2 className="mr-1.5 h-3 w-3" />Reset Accent Color</Button>
                          )}
                        </div>
                        {showAccentPicker && (
                          <div className="flex flex-col items-center space-y-2 p-2 border rounded-md bg-background/50">
                            <SketchPicker color={currentAccentPickerColor} onChangeComplete={handleAccentColorChange} disableAlpha={true} width="100%" className="[&>div]:!shadow-none [&>div]:!bg-transparent [&>div>div:nth-child(3)>div>div>span]:!text-foreground/70"/>
                            <Button size="sm" onClick={handleAccentColorSave} className="w-full h-9">Apply Accent Color</Button>
                          </div>
                        )}
                        {chartColorConfig.map((config, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => handleChartColorPickerToggle(config.pickerKey)}>
                                <div style={{width: '1rem', height: '1rem', backgroundColor: config.stateValue || 'transparent', border: '1px solid hsl(var(--border))' }} className="mr-2 rounded-sm shrink-0"></div>
                                <span className="truncate">{showChartColorPicker === config.pickerKey ? "Hide" : "Change"} {config.label}</span>
                              </Button>
                              {config.stateValue && (<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleChartColorReset(config.pickerKey)} title={`Reset ${config.label}`}><Trash2 className="h-3.5 w-3.5" /></Button>)}
                            </div>
                            {showChartColorPicker === config.pickerKey && (
                              <div className="flex flex-col items-center space-y-2 p-2 border rounded-md bg-background/50">
                                <SketchPicker color={currentChartPickerColor} onChangeComplete={handleChartColorChange} disableAlpha={true} width="100%" className="[&>div]:!shadow-none [&>div]:!bg-transparent [&>div>div:nth-child(3)>div>div>span]:!text-foreground/70"/>
                                <Button size="sm" onClick={handleChartColorSave} className="w-full h-9">Apply {config.label}</Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                  </div>
                  {/* Right Column: App Background */}
                  <div className="space-y-6">
                    <BackgroundImageSwitcher />
                  </div>
                </div>
                {/* Logout Button */}
                {isAuthenticated && (<div className="mt-6 px-3 pb-3"><Button onClick={logout} variant="outline" size="sm" className="w-full h-9"><LogOut className="mr-2 h-4 w-4" />Logout</Button></div>)}
              </PopoverContent>
            </Popover>
            {currentUser && (<button onClick={() => { if (currentUser.profilePictureUrl) setIsUserAvatarModalOpen(true); }} className={cn("rounded-full", currentUser.profilePictureUrl && "cursor-pointer hover:opacity-80 transition-opacity")} aria-label="View profile picture">
              <Avatar className="h-8 w-8"><AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.name} /><AvatarFallback>{getFirstInitial(currentUser.name)}</AvatarFallback></Avatar>
            </button>)}
          </div>
        </header>
        <main className={cn("flex-1 overflow-y-auto p-4 md:p-6 overflow-x-hidden")}>{children}</main>
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Finsculpt CRM</title>
        <meta name="description" content="Advanced CRM with Glassmorphism UI" />
      </head>
      <body className={cn(GeistSans.variable, interBlack.variable, montserrat.variable, 'antialiased font-sans flex min-h-screen flex-col')}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <SidebarProvider defaultPinnedOpen={true}> 
              <AppContent>{children}</AppContent>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

