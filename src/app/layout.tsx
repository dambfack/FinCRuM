
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
  <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 1200" className="h-6 w-6 text-accent">
    <g id="rZHqIMXXaJh1ZyXVJqeOu">
      <g>
        <g id="rZHqIMXXaJh1ZyXVJqeOu-child-0">
          <path style={{ stroke: "currentColor", strokeWidth: 19.2, strokeDasharray: "none", strokeLinecap: "butt", strokeDashoffset: 0, strokeLinejoin: "miter", strokeMiterlimit: 4, fill: "currentColor", fillRule: "nonzero", opacity: 1 }} vectorEffect="non-scaling-stroke" transform="matrix(1.469586 0 0 1.469586 599.99999 599.999984) matrix(1 0 0 1 0 0)  translate(-9767.781356, -605.257686)" d="M9617.66244,988.59174c-1.83341,-0.76047 -2.86917,-2.02595 -25.82251,-31.45865l-21.5009,-27.57311v-5.10349c-0.00595,-2.81019 -0.26787,-12.72605 -0.58931,-22.03591c-0.32144,-9.30986 -0.85718,-26.68787 -1.19053,-38.6178c-0.33335,-11.92993 -0.86908,-30.91206 -1.19053,-42.18252c-0.32144,-11.2764 -0.85123,-30.52589 -1.17862,-42.77664c-0.32739,-12.25075 -0.73813,-26.96117 -0.91075,-32.6766c-1.29767,-42.47958 -3.13704,-106.89407 -3.58348,-125.06226c-0.39287,-16.16006 -0.52978,-17.27107 -2.25009,-18.39396c-0.82146,-0.54065 -5.72048,-1.30706 -13.21484,-2.07348c-14.79229,-1.51501 -14.828,-1.52095 -16.61379,-3.64196c-1.8215,-2.15666 -1.94056,-3.13695 -2.63702,-21.63785c-0.48216,-12.85676 -0.43454,-15.11441 0.35121,-16.80765c1.9227,-4.1529 -2.95846,-3.92119 72.93758,-3.49937c47.2996,0.26141 68.6874,0.5763 69.52672,1.02189c0.66074,0.35647 1.72626,1.49718 2.36319,2.53689c1.07743,1.77048 1.15481,3.12507 1.16076,20.19414c0,15.19759 -0.15477,18.59596 -0.9048,20.03967c-1.57149,3.03595 -3.24418,3.45778 -15.23278,3.83207c-6.01811,0.19012 -13.12555,0.49312 -15.79233,0.67136l-4.84544,0.32677l-0.36906,13.4687c-0.57145,21.1685 -0.91075,34.26884 -1.54768,59.513c-0.32144,12.91023 -0.99409,39.37233 -1.4822,58.81788c-1.13695,45.01647 -1.98818,79.68337 -2.387,97.43568c-0.4524,20.06937 -1.96437,79.81408 -3.00013,118.43782c-0.54169,20.13473 -1.13695,33.63907 -1.51197,34.34608zM9623.00194,985.44884c1.81555,-1.58036 1.74412,-0.46935 2.7144,-43.22223c0.3393,-14.87082 1.00599,-42.40829 1.4822,-61.19436c0.48216,-18.78607 1.13695,-45.12341 1.4703,-58.52082c0.32739,-13.39741 0.73813,-29.706 0.91075,-36.24132c0.17263,-6.53532 0.57741,-23.11127 0.89885,-36.83544c0.32144,-13.72417 0.84527,-36.04526 1.16076,-49.60902c0.31549,-13.56376 0.72027,-29.201 0.88694,-34.75602c0.17263,-5.55502 0.44049,-15.58377 0.60122,-22.2795c0.77384,-32.4033 1.09528,-41.04181 1.53578,-41.3151c0.39883,-0.24359 26.01299,-1.41995 31.6918,-1.44965c0.95837,-0.00594 2.2739,-0.62383 3.12513,-1.46748l1.45839,-1.46154v-36.68097l-1.53578,-1.44371l-1.53578,-1.43777l-68.27071,-0.202l-68.26476,-0.202l-1.11314,1.22983c-0.61312,0.67136 -1.1429,2.10318 -1.17862,3.1726c-0.20239,5.65008 1.0179,31.72601 1.53578,32.86672c0.33335,0.73077 1.17862,1.60412 1.88103,1.94277c1.15481,0.56441 10.87546,1.80018 22.31046,2.84583c4.9764,0.45153 7.34555,1.91307 8.34559,5.15102c0.32144,1.05159 0.75003,8.59692 0.95242,16.76607c0.19644,8.16915 0.61312,23.53903 0.92861,34.1619c0.30954,10.62287 0.83932,29.06435 1.17267,40.99428c1.20838,43.33511 1.8215,65.03832 2.69059,94.46508c0.48216,16.49871 1.14886,39.6278 1.4822,51.39138c0.33335,11.76358 0.86908,30.615 1.19053,41.88546c0.32144,11.27046 0.75003,25.99275 0.95242,32.71225l0.36906,12.20917l21.98902,28.19099c12.09574,15.50059 22.42951,28.51776 22.96525,28.9277zM9728.03015,606.22204c-18.96508,-3.42807 -35.76935,-16.31454 -44.3709,-34.02525c-3.91088,-8.05033 -5.63714,-15.29859 -5.90501,-24.76292c-0.32739,-11.78734 1.48816,-19.95649 6.69671,-30.12188c9.40516,-18.35831 26.8166,-30.42489 47.79962,-33.13407c2.70249,-0.35053 38.95996,-0.58224 91.83718,-0.59412c94.86706,-0.01782 89.87281,-0.19606 92.58125,3.23795c1.4822,1.88336 2.19652,4.97873 1.58935,6.88585c-0.79765,2.50125 -37.54919,50.75567 -39.24569,51.52803c-1.19648,0.54065 -11.44095,0.83177 -39.56713,1.11695l-37.94802,0.38024l-0.69646,5.91149c-3.17275,27.0087 -23.8879,48.95549 -50.62117,53.62527zM9750.2037,603.92874c17.59002,-3.36866 32.63232,-14.27076 41.47197,-30.05653c3.91088,-6.98685 6.31574,-15.40553 7.0241,-24.59657l0.38097,-4.91931l38.91234,-0.3743c25.63798,-0.24359 39.32307,-0.58818 40.09692,-1.00406c1.45244,-0.7783 36.84678,-47.69595 37.71586,-49.9952c0.97028,-2.5666 -0.73217,-5.60849 -3.61325,-6.4462c-1.61912,-0.4753 -27.42972,-0.60006 -91.84313,-0.43965c-80.64623,0.19606 -89.97996,0.31488 -93.52177,1.19418c-22.84024,5.6679 -39.20997,21.51309 -45.23999,43.80447c-1.73222,6.39867 -2.12509,17.18789 -0.88694,24.2698c2.11318,12.06064 7.51817,22.54685 16.13163,31.30418c9.16705,9.32174 19.03651,14.752 31.25131,17.20572zM9534.18275,518.16752c-1.0298,-0.95653 -2.02985,-2.38836 -2.22033,-3.1726c-0.19048,-0.78424 -0.27382,-49.46049 -0.18453,-108.17143l0.16667,-106.74554l1.44649,-1.53283c0.7917,-0.84365 4.54186,-3.31519 8.33368,-5.48967c3.78587,-2.17448 9.03014,-5.20449 11.6493,-6.73732c2.61916,-1.53283 9.45278,-5.47185 15.17921,-8.75733c14.39941,-8.25233 61.25256,-35.18973 80.60456,-46.34136c17.09,-9.84457 18.69126,-10.44463 22.04854,-8.24639c3.77397,2.4656 3.55967,-0.01782 4.04779,46.98301c0.25596,24.92928 0.6786,43.347 1.01195,44.10747c0.31549,0.71889 1.20838,1.72295 1.98818,2.23389c1.27386,0.83177 18.19719,0.99218 162.98301,1.58036c130.62451,0.52283 161.92344,0.80206 163.44731,1.42589c3.80373,1.56848 5.38713,6.47591 3.25014,10.08816c-2.89298,4.90149 -52.12123,68.72186 -53.57367,69.45857c-1.77388,0.90306 -40.26954,1.2833 -187.88286,1.88336c-54.35942,0.21982 -85.82502,0.55847 -87.06912,0.93871c-3.88707,1.19418 -3.70849,-1.63977 -3.70849,58.24752c-0.00595,52.6628 -0.03572,54.29663 -1.16076,56.1384c-0.63693,1.03971 -1.77388,2.23983 -2.52987,2.6676c-1.10124,0.62977 -14.51251,0.81989 -68.66359,0.9803l-67.29448,0.202zM9642.55633,517.1991l27.86426,-0.22577l1.45244,-1.36053l1.44649,-1.36053v-54.21939c0,-36.96021 0.20239,-54.7541 0.63693,-55.88887c0.93456,-2.4656 2.86322,-4.27172 5.27403,-4.93714c1.30958,-0.36241 20.09013,-0.606 48.85323,-0.62977c25.70346,-0.02376 86.64053,-0.31488 135.42233,-0.64165c73.7888,-0.49906 88.90848,-0.73671 89.96805,-1.41995c1.64293,-1.05753 51.98432,-67.09991 52.80578,-69.26845c0.44049,-1.16448 0.42264,-2.0616 -0.06548,-3.13101c-1.5834,-3.46372 10.79807,-3.1726 -165.26287,-3.87366c-153.62548,-0.61194 -161.94725,-0.69512 -163.69732,-1.70512c-3.92874,-2.25171 -3.79778,-0.79018 -4.22637,-47.07213c-0.24406,-26.08187 -0.62503,-42.63405 -1.00599,-43.87576c-0.73813,-2.38242 -3.76206,-3.96278 -5.96454,-3.12507c-0.75598,0.28518 -7.26221,3.92119 -14.46489,8.08003c-7.20268,4.15884 -17.64955,10.17728 -23.21526,13.37364c-5.56571,3.20231 -20.42943,11.75763 -33.0371,19.01184c-22.6319,13.02311 -36.38843,20.93085 -51.49025,29.59906c-4.25613,2.44183 -8.20868,4.9609 -8.78013,5.60849c-0.98218,1.09912 -1.04171,7.07597 -1.04171,107.61296c0,96.80591 0.08929,106.5673 0.95837,107.80902c0.52383,0.74859 1.52983,1.58036 2.23224,1.84177zM9726.29793,577.13393c-8.28606,-1.86554 -15.58994,-7.09379 -19.18533,-13.74794c-3.02394,-5.58473 -4.39899,-17.59783 -2.80369,-24.50151c3.10132,-13.42711 15.81614,-21.89926 38.20398,-25.44022c9.30991,-1.47342 39.65047,-1.44371 54.62133,0.05347c19.85202,1.98436 21.56043,2.37648 20.64967,4.74108c-0.74408,1.93683 -3.82754,2.95278 -17.48883,5.75108c-21.739,4.44996 -31.90014,8.24639 -38.6921,14.44306c-4.22041,3.8499 -6.01811,7.46809 -6.77409,13.62317c-1.0298,8.46027 -3.64301,14.28264 -8.63727,19.26731l-5.99579,1.75123c6.57257,-3.76282 11.15079,-11.65491 12.34129,-21.43443c1.17267,-9.67227 5.93477,-15.75012 16.2983,-20.80014c7.19673,-3.50531 12.73863,-5.25796 24.60817,-7.75327c16.57212,-3.49343 20.95326,-4.53314 20.95326,-4.98467c0,-0.48718 -14.703,-2.11507 -28.19761,-3.11913c-11.67311,-0.87336 -37.00155,-0.36835 -44.12685,0.88524c-20.64372,3.61819 -31.63823,10.61692 -35.06694,22.31515c-2.00604,6.84426 -0.83337,18.49496 2.47034,24.55498c4.29001,7.86752 14.52139,13.01246 23.18753,12.53634zM9732.66333,575.27474l7.5325,-2.20007c-0.55881,0.31992 -1.13203,0.60999 -1.71882,0.86884c-1.78225,0.78729 -3.75375,1.21806 -5.81368,1.33124z"/>
        </g>
      </g>
    </g>
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
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCropSave = (croppedImageUrl: string) => {
    if (currentUser) {
        updateUserProfilePicture(croppedImageUrl);
    }
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
          <div className="flex items-center h-full w-full transition-all duration-300 ease-in-out group-data-[state=expanded]:justify-center group-data-[state=collapsed]:justify-center">
            <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors">
              <Logo />
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
          "bg-background/5 dark:bg-background/2 backdrop-blur-xs rounded-lg m-1 border border-white/5"
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

    