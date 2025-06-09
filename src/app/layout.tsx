
'use client';

import type { Metadata } from 'next';
import localFont from 'next/font/local';
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
import { LayoutDashboard, Users, Users2, Table, UserPlus as UserPlusIcon, Upload, Settings, LogOut, ImageUp, CheckCircle, Sun, Moon, Download, FileArchive, Menu as MenuIcon, PanelLeft, Palette, Trash2, Briefcase, ListTree, HelpCircle } from 'lucide-react';
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
import { GoogleAuthManager } from '@/components/GoogleAuthManager';
import { MicrosoftAuthManager } from '@/components/MicrosoftAuthManager';


// Local fonts downloaded from Google Fonts
const interBlack = localFont({
  src: '../../public/fonts/inter-900.woff2',
  weight: '900',
  style: 'normal',
  variable: '--font-inter-black',
  display: 'swap',
});

const montserrat = localFont({
  src: [
    {
      path: '../../public/fonts/montserrat-300.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/montserrat-400.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/montserrat-700.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-montserrat',
  display: 'swap',
});

// const interBlack = Inter({
//   subsets: ['latin'],
//   weight: ['900'],
//   variable: '--font-inter-black',
// });

// const montserrat = Montserrat({
//   subsets: ['latin'],
//   weight: ['300', '400', '500', '600', '700'],
//   variable: '--font-montserrat',
// });

const Logo: React.FC<{
  // No props needed as it's a static SVG now, or dynamic from context if we re-add that later
}> = () => {
  // SVG directly embedded
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 1200"
      className="h-6 w-6 text-accent" // Size controlled by CSS
    >
      <path
        style={{
          stroke: "currentColor", // Inherits color from text-accent
          strokeWidth: 19.2,
          strokeDasharray: "none",
          strokeLinecap: "butt",
          strokeDashoffset: 0,
          strokeLinejoin: "miter",
          strokeMiterlimit: 4,
          fill: "currentColor", // Inherits color from text-accent
          fillRule: "nonzero",
          opacity: 1,
        }}
        vectorEffect="non-scaling-stroke"
        transform="translate(-13754.595 -289.478)scale(1.46959)"
        d="M9617.662 988.592c-1.833-.76-2.869-2.026-25.822-31.459l-21.501-27.573v-5.104c-.006-2.81-.268-12.726-.59-22.035-.32-9.31-.856-26.688-1.19-38.618s-.869-30.912-1.19-42.183c-.322-11.276-.852-30.526-1.179-42.776s-.738-26.962-.91-32.677c-1.298-42.48-3.138-106.894-3.584-125.062-.393-16.16-.53-17.271-2.25-18.394-.822-.54-5.72-1.307-13.215-2.074-14.792-1.515-14.828-1.52-16.614-3.642-1.821-2.156-1.94-3.137-2.637-21.637-.482-12.857-.434-15.115.351-16.808 1.923-4.153-2.958-3.921 72.938-3.5 47.3.262 68.687.577 69.527 1.022.66.357 1.726 1.498 2.363 2.537 1.077 1.77 1.155 3.125 1.16 20.194 0 15.198-.154 18.596-.904 20.04-1.572 3.036-3.244 3.458-15.233 3.832-6.018.19-13.126.493-15.792.672l-4.846.326-.369 13.469c-.571 21.168-.91 34.269-1.548 59.513-.321 12.91-.994 39.372-1.482 58.818-1.137 45.016-1.988 79.683-2.387 97.436-.452 20.069-1.964 79.814-3 118.437-.542 20.135-1.137 33.64-1.512 34.346zm5.34-3.143c1.815-1.58 1.744-.47 2.714-43.222.34-14.871 1.006-42.409 1.483-61.195.482-18.786 1.136-45.123 1.47-58.52.327-13.398.738-29.707.91-36.242s.578-23.111.9-36.835c.32-13.724.845-36.046 1.16-49.61.316-13.563.72-29.2.887-34.755.173-5.555.44-15.584.601-22.28.774-32.403 1.096-41.042 1.536-41.315.399-.244 26.013-1.42 31.692-1.45.958-.006 2.274-.623 3.125-1.467l1.458-1.462v-36.68l-1.535-1.444-1.536-1.438-68.27-.202-68.266-.202-1.113 1.23c-.613.671-1.143 2.103-1.178 3.172-.203 5.65 1.018 31.726 1.535 32.867.334.73 1.18 1.604 1.881 1.943 1.155.564 10.876 1.8 22.31 2.846 4.977.451 7.346 1.913 8.347 5.15.321 1.052.75 8.598.952 16.767.196 8.169.613 23.539.929 34.162.31 10.623.839 29.064 1.172 40.994 1.209 43.335 1.822 65.038 2.69 94.465a71599 71599 0 0 1 1.483 51.391c.333 11.764.87 30.615 1.19 41.886.322 11.27.75 25.993.953 32.712l.369 12.21 21.99 28.19c12.095 15.5 22.429 28.518 22.964 28.928zm105.028-379.227c-18.965-3.428-35.77-16.314-44.37-34.025-3.912-8.05-5.638-15.299-5.906-24.763-.327-11.787 1.488-19.957 6.697-30.122 9.405-18.358 26.817-30.425 47.8-33.134 2.702-.35 38.96-.582 91.837-.594 94.867-.018 89.873-.196 92.581 3.238 1.482 1.883 2.197 4.978 1.59 6.886-.798 2.5-37.55 50.755-39.246 51.528-1.197.54-11.441.831-39.567 1.117l-37.948.38-.697 5.911c-3.173 27.009-23.888 48.956-50.621 53.626zm22.174-2.293c17.59-3.369 32.632-14.271 41.472-30.057 3.91-6.987 6.315-15.405 7.024-24.596l.38-4.92 38.913-.374c25.638-.244 39.323-.588 40.097-1.004 1.452-.778 36.847-47.696 37.716-49.995.97-2.567-.732-5.609-3.613-6.446-1.62-.476-27.43-.6-91.844-.44-80.646.196-89.98.315-93.521 1.194-22.84 5.668-39.21 21.513-45.24 43.805-1.732 6.398-2.125 17.187-.887 24.27 2.113 12.06 7.518 22.546 16.131 31.304 9.167 9.321 19.037 14.752 31.252 17.205zm-216.021-85.761c-1.03-.957-2.03-2.389-2.22-3.173s-.274-49.46-.185-108.172l.167-106.745 1.446-1.533c.792-.844 4.542-3.315 8.334-5.49a2095 2095 0 0 0 11.649-6.737 2884 2884 0 0 1 15.18-8.757c14.399-8.253 61.252-35.19 80.604-46.342 17.09-9.844 18.691-10.444 22.048-8.246 3.774 2.466 3.56-.018 4.048 46.983.256 24.93.679 43.347 1.012 44.108.316.718 1.208 1.722 1.988 2.233 1.274.832 18.197.993 162.983 1.58 130.625.524 161.924.803 163.448 1.427 3.803 1.568 5.387 6.476 3.25 10.088-2.893 4.901-52.122 68.722-53.574 69.458-1.774.903-40.27 1.284-187.883 1.884-54.36.22-85.825.558-87.069.938-3.887 1.195-3.708-1.64-3.708 58.248-.006 52.663-.036 54.297-1.161 56.138-.637 1.04-1.774 2.24-2.53 2.668-1.101.63-14.513.82-68.664.98l-67.294.202zm108.373-.969 27.865-.226 1.452-1.36 1.447-1.36v-54.22c0-36.96.202-54.754.636-55.889.935-2.466 2.864-4.272 5.274-4.937 1.31-.363 20.09-.606 48.854-.63 25.703-.024 86.64-.315 135.422-.642 73.789-.499 88.909-.736 89.968-1.42 1.643-1.057 51.984-67.1 52.806-69.268.44-1.164.423-2.062-.066-3.131-1.583-3.464 10.798-3.173-165.262-3.874-153.626-.612-161.948-.695-163.698-1.705-3.929-2.251-3.798-.79-4.226-47.072-.244-26.082-.625-42.634-1.006-43.876-.738-2.382-3.762-3.962-5.965-3.125-.756.285-7.262 3.921-14.465 8.08-7.202 4.16-17.65 10.178-23.215 13.374l-33.037 19.012a51042 51042 0 0 1-51.49 29.599c-4.256 2.442-8.209 4.96-8.78 5.608-.983 1.1-1.042 7.076-1.042 107.613 0 96.806.09 106.568.958 107.81.524.748 1.53 1.58 2.233 1.841zm83.742 59.935c-8.286-1.866-15.59-7.094-19.185-13.748-3.024-5.585-4.4-17.598-2.804-24.502 3.101-13.427 15.816-21.899 38.204-25.44 9.31-1.473 39.65-1.443 54.621.054 19.852 1.984 21.56 2.376 20.65 4.74-.744 1.938-3.828 2.954-17.489 5.752-21.739 4.45-31.9 8.246-38.692 14.443-4.22 3.85-6.018 7.468-6.774 13.623-1.03 8.46-3.643 14.283-8.637 19.267l-5.996 1.752c6.572-3.763 11.15-11.655 12.341-21.435 1.173-9.672 5.935-15.75 16.298-20.8 7.197-3.505 12.739-5.258 24.609-7.753 16.572-3.494 20.953-4.533 20.953-4.985 0-.487-14.703-2.115-28.198-3.119-11.673-.873-37.001-.368-44.127.885-20.643 3.618-31.638 10.617-35.067 22.315-2.006 6.845-.833 18.495 2.47 24.555 4.29 7.868 14.522 13.013 23.188 12.537zm6.365-1.86 7.533-2.2q-.838.48-1.719.87c-1.782.787-3.754 1.218-5.814 1.33z"
        strokeLinecap="round" // This will be overridden by style object
      />
    </svg>
  );
};


function AppContent({ children }: { children: React.ReactNode }) {
  const { toggleSidebar, openMobile: isMobileSidebarOpen } = useSidebar(); // Call useSidebar from ui/sidebar
  const auth = useAuth();
  const {
    currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser,
    headerLogoLightUrl, headerLogoDarkUrl, defaultHeaderLogoLightUrl, defaultHeaderLogoDarkUrl,
    currentUserThemeSettings,
    logout, updateUserProfilePicture,
    updateHeaderLogoLight, updateHeaderLogoDark, setDefaultHeaderLogoLight, setDefaultHeaderLogoDark,
    updateCustomAccentColor,
    updateChartPieColorOpen, updateChartPieColorClosed, updateChartPieColorMissed, updateChartPieColorOther,
  } = auth;
  
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();

  const userProfilePicInputRef = useRef<HTMLInputElement>(null);

  const headerLogoLightInputRef = useRef<HTMLInputElement>(null);
  const headerLogoDarkInputRef = useRef<HTMLInputElement>(null);

  const [isUserProfileCropperOpen, setIsUserProfileCropperOpen] = useState(false);
  const [userImageToCropSrc, setUserImageToCropSrc] = useState<string | null>(null);

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
        setCropSrc(reader.result as string); 
        setCropperOpen(true); 
      };
      reader.onerror = (e) => {
        console.error(`[AppContent] ${toastTitle} FileReader error:`, e);
        toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleUserProfilePictureFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setUserImageToCropSrc, setIsUserProfileCropperOpen, 2, "User Profile Picture", userProfilePicInputRef);
  const handleUserCropSave = (croppedImageUrl: string) => { if (currentUser) updateUserProfilePicture(croppedImageUrl); setIsUserProfileCropperOpen(false); setUserImageToCropSrc(null); };
    
  const handleSetCurrentLightHeaderLogoAsDefault = () => { if (headerLogoLightUrl && currentUser?.role === 'partner') setDefaultHeaderLogoLight(headerLogoLightUrl); else toast({ title: "Action Not Available", description: "No light theme header logo is currently set.", variant: "default"}); };
  const handleSetCurrentDarkHeaderLogoAsDefault = () => { if (headerLogoDarkUrl && currentUser?.role === 'partner') setDefaultHeaderLogoDark(headerLogoDarkUrl); else toast({ title: "Action Not Available", description: "No dark theme header logo is currently set.", variant: "default"}); };
  
  const handleHeaderLogoLightFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setHeaderLogoLightImageToCropSrc, setIsHeaderLogoLightCropperOpen, 1, "Light Header Logo", headerLogoLightInputRef);
  const handleHeaderLogoLightCropSave = (croppedDataUri: string) => { updateHeaderLogoLight(croppedDataUri); setIsHeaderLogoLightCropperOpen(false); setHeaderLogoLightImageToCropSrc(null); };
  const handleHeaderLogoDarkFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleFileChangeGeneric(event, setHeaderLogoDarkImageToCropSrc, setIsHeaderLogoDarkCropperOpen, 1, "Dark Header Logo", headerLogoDarkInputRef);
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
    ? (headerLogoDarkUrl || defaultHeaderLogoDarkUrl || headerLogoLightUrl || defaultHeaderLogoLightUrl) 
    : (headerLogoLightUrl || defaultHeaderLogoLightUrl || headerLogoDarkUrl || defaultHeaderLogoDarkUrl); 

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
        <SidebarHeader className={cn(
            "h-16 flex items-center",
            "group-data-[state=expanded]:justify-center",
            "group-data-[state=collapsed]:justify-center" 
          )}>
          {/* Logo is removed from here as per user request */}
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="Dashboard"><Link href="/"><LayoutDashboard /><span className={spanClasses}>Dashboard</span></Link></SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="All Customers"><Link href="/customers"><Users /><span className={spanClasses}>All Customers</span></Link></SidebarMenuButton></SidebarMenuItem>
            {currentUser?.role === 'partner' && <SidebarMenuItem><SidebarMenuButton asChild tooltip="Team Management"><Link href="/users"><Users2 /><span className={spanClasses}>Team Management</span></Link></SidebarMenuButton></SidebarMenuItem>}
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="Data Grid"><Link href="/data-grid"><Table /><span className={spanClasses}>Data Grid</span></Link></SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="Add Customer"><Link href="/add-customer"><UserPlusIcon /><span className={spanClasses}>Add Customer</span></Link></SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="Import Data"><Link href="/import"><Upload /><span className={spanClasses}>Import Data</span></Link></SidebarMenuButton></SidebarMenuItem>
            {currentUser?.role === 'partner' && <SidebarMenuItem><SidebarMenuButton asChild tooltip="Export Data"><Link href="/export-data"><FileArchive /><span className={spanClasses}>Export Data</span></Link></SidebarMenuButton></SidebarMenuItem>}
            <SidebarMenuItem><SidebarMenuButton asChild tooltip="Help & Support"><Link href="/help"><HelpCircle /><span className={spanClasses}>Help & Support</span></Link></SidebarMenuButton></SidebarMenuItem>
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
                  {currentHeaderLogoToDisplay ? (
                    <NextImage src={currentHeaderLogoToDisplay} alt="Header Logo" width={256} height={56} className="h-14 w-auto max-w-sm mr-1 object-contain" data-ai-hint="custom header logo mobile" unoptimized={currentHeaderLogoToDisplay.startsWith('data:')}/> 
                  ) : (
                    <span className="mr-1">Finsculpt</span>
                  )}
                </div>
              </Link>
            )}
          </div>
          <div className="hidden md:flex items-center text-xl font-heading">
            {currentHeaderLogoToDisplay ? (
               <NextImage src={currentHeaderLogoToDisplay} alt="Header Logo" width={256} height={56} className="h-14 w-auto max-w-sm mr-1 object-contain" data-ai-hint="custom header logo" unoptimized={currentHeaderLogoToDisplay.startsWith('data:')}/>
            ) : (
              <span className="mr-1">Finsculpt</span>
            )}
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 pt-4 px-3 pb-3">
                  {/* Left Column: Partner-only settings & Theme Customization */}
                  <div className="space-y-6">
                    {currentUser?.role === 'partner' && (
                      <div className="space-y-3">
                        <h4 className="font-medium leading-none text-sm font-heading mb-2">Header Logos</h4>
                        <input type="file" ref={headerLogoLightInputRef} onChange={handleHeaderLogoLightFileChange} accept="image/png" className="hidden"/>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={() => headerLogoLightInputRef.current?.click()}><Sun className="mr-2 h-4 w-4" />Header Logo (Light)</Button>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={handleSetCurrentLightHeaderLogoAsDefault} disabled={!headerLogoLightUrl}><CheckCircle className="mr-2 h-4 w-4" />Set as Default Light Header</Button>
                        
                        <input type="file" ref={headerLogoDarkInputRef} onChange={handleHeaderLogoDarkFileChange} accept="image/png" className="hidden"/>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={() => headerLogoDarkInputRef.current?.click()}><Moon className="mr-2 h-4 w-4" />Header Logo (Dark)</Button>
                        <Button variant="outline" size="sm" className="w-full h-9" onClick={handleSetCurrentDarkHeaderLogoAsDefault} disabled={!headerLogoDarkUrl}><CheckCircle className="mr-2 h-4 w-4" />Set as Default Dark Header</Button>
                      </div>
                    )}
                     <div className="space-y-3"> 
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
                  {/* Right Column: App Background & Cloud Services */}
                  <div className="space-y-6">
                    <BackgroundImageSwitcher />
                    <GoogleAuthManager />
                    <MicrosoftAuthManager />
                  </div>
                </div>
                {isAuthenticated && (<div className="mt-6 px-3 pb-3"><Button onClick={() => logout()} variant="outline" size="sm" className="w-full h-9"><LogOut className="mr-2 h-4 w-4" />Logout</Button></div>)}
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
