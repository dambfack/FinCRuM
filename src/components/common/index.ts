// Barrel exports for common components
// This file optimizes imports and reduces bundle size by providing a single entry point

export { default as OptimizedChart, ChartSkeleton } from './OptimizedChart';
export type { OptimizedChartProps, ChartData } from './OptimizedChart';

export { default as FormWrapper } from './FormWrapper';
export type { FormWrapperProps } from './FormWrapper';

export { default as DataTable, TableSkeleton } from './DataTable';
export type { DataTableProps, Column, Action } from './DataTable';

// Re-export commonly used UI components to reduce individual imports
export { Button } from '@/components/ui/button';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
export { Input } from '@/components/ui/input';
export { Label } from '@/components/ui/label';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export { Textarea } from '@/components/ui/textarea';
export { Badge } from '@/components/ui/badge';
export { Skeleton } from '@/components/ui/skeleton';
export { Separator } from '@/components/ui/separator';
export { Switch } from '@/components/ui/switch';
export { Checkbox } from '@/components/ui/checkbox';
export { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
export { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
export { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
export { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
export { Progress } from '@/components/ui/progress';
export { Slider } from '@/components/ui/slider';
export { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Common icons to reduce lucide-react imports
export { 
  Users, 
  UserPlus, 
  Calendar, 
  Clock, 
  PlusCircle, 
  RefreshCw, 
  Square, 
  CheckSquare, 
  User, 
  FileArchive,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Settings,
  LogOut,
  Menu,
  Home,
  LayoutDashboard
} from 'lucide-react';