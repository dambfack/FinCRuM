'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  Settings, 
  Users, 
  Database, 
  Calendar, 
  FileText, 
  Shield, 
  Zap,
  ExternalLink,
  ChevronRight,
  Search,
  Mail,
  Phone,
  Download,
  Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface HelpGuideProps {
  className?: string;
}

const HelpGuide: React.FC<HelpGuideProps> = ({ className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { value: 'all', label: 'All Categories', icon: BookOpen },
    { value: 'Getting Started', label: 'Getting Started', icon: HelpCircle },
    { value: 'Customer Management', label: 'Customer Management', icon: Users },
    { value: 'Calendar Integration', label: 'Calendar Integration', icon: Calendar },
    { value: 'Data & Security', label: 'Data & Security', icon: Shield },
    { value: 'Troubleshooting', label: 'Troubleshooting', icon: Settings }
  ];

  const quickStartGuide = [
    {
      step: 1,
      title: "Set Up Your Profile",
      description: "Configure your user profile and PIN for secure access",
      icon: <Users className="h-5 w-5" />
    },
    {
      step: 2,
      title: "Add Your First Customer",
      description: "Navigate to 'Add Customer' to create your first customer record",
      icon: <Users className="h-5 w-5" />
    },
    {
      step: 3,
      title: "Import Existing Data",
      description: "Use the Import feature to bring in your existing customer data",
      icon: <Database className="h-5 w-5" />
    },
    {
      step: 4,
      title: "Connect Calendar Services",
      description: "Link Google Calendar or Microsoft Calendar for appointment sync",
      icon: <Calendar className="h-5 w-5" />
    }
  ];

  const faqData = [
    {
      category: "Getting Started",
      icon: <BookOpen className="h-5 w-5" />,
      questions: [
        {
          question: "How do I set up my PIN for the first time?",
          answer: "When you first launch FinCRuM, you'll be prompted to create a secure PIN. Choose a 4-6 digit PIN that you'll remember. This PIN protects your data and is required each time you open the application."
        },
        {
          question: "What file formats can I import?",
          answer: "FinCRuM supports CSV, Excel (.xlsx, .xls), and JSON file formats for importing customer data. Make sure your file includes columns for customer name, contact information, and any other relevant details."
        },
        {
          question: "How do I add my company logo?",
          answer: "Go to Settings (gear icon in the top right) and look for the 'Header Logo' section. You can upload separate logos for light and dark themes. PNG format is recommended for best quality."
        }
      ]
    },
    {
      category: "Customer Management",
      icon: <Users className="h-5 w-5" />,
      questions: [
        {
          question: "How do I edit customer information?",
          answer: "Navigate to 'All Customers' and click on any customer row to open their details. You can edit all information including contact details, notes, and attachments."
        },
        {
          question: "Can I attach files to customer records?",
          answer: "Yes! In the customer detail view, you can upload and attach documents, images, and other files. These are stored securely and can be accessed anytime."
        },
        {
          question: "How do I delete a customer?",
          answer: "In the customer list, select the customer(s) you want to delete and click the delete button. Note: This action cannot be undone, so please be careful."
        }
      ]
    },
    {
      category: "Calendar Integration",
      icon: <Calendar className="h-5 w-5" />,
      questions: [
        {
          question: "How do I connect my Google Calendar?",
          answer: "Go to Settings and find the 'Google Calendar' section. Click 'Connect' and follow the authentication process. Once connected, your appointments will sync automatically."
        },
        {
          question: "Can I sync with Microsoft Calendar?",
          answer: "Yes! FinCRuM supports Microsoft Calendar integration. In Settings, look for 'Microsoft Calendar' and follow the connection process."
        },
        {
          question: "Why aren't my calendar events syncing?",
          answer: "Check your internet connection and ensure you've granted the necessary permissions. You can also try disconnecting and reconnecting your calendar service in Settings."
        }
      ]
    },
    {
      category: "Data & Security",
      icon: <Shield className="h-5 w-5" />,
      questions: [
        {
          question: "Where is my data stored?",
          answer: "Your data is stored locally on your device using IndexedDB for security and privacy. No data is sent to external servers unless you explicitly connect calendar services."
        },
        {
          question: "How do I backup my data?",
          answer: "Use the 'Export Data' feature (available to partners) to create backups of your customer data. You can export to CSV or JSON format."
        },
        {
          question: "Is my data encrypted?",
          answer: "Yes, your data is protected by your PIN and stored securely on your local device. Calendar integrations use OAuth2 for secure authentication."
        }
      ]
    },
    {
      category: "Troubleshooting",
      icon: <Settings className="h-5 w-5" />,
      questions: [
        {
          question: "The application won't start. What should I do?",
          answer: "Try restarting the application. If the problem persists, check that port 9002 isn't being used by another application. You can also check the electron.log file for detailed error information."
        },
        {
          question: "I forgot my PIN. How can I reset it?",
          answer: "Currently, PIN reset requires clearing application data. Contact support for assistance with data recovery if needed."
        },
        {
          question: "The interface looks broken or distorted.",
          answer: "Try switching between light and dark themes in Settings. If issues persist, try clearing your browser cache or restarting the application."
        }
      ]
    }
  ];

  const features = [
    {
      title: "Customer Management",
      description: "Complete customer relationship management with detailed profiles",
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "Calendar Integration",
      description: "Sync with Google Calendar and Microsoft Calendar",
      icon: <Calendar className="h-6 w-6" />
    },
    {
      title: "Data Import/Export",
      description: "Import from CSV/Excel and export your data",
      icon: <Database className="h-6 w-6" />
    },
    {
      title: "Secure Storage",
      description: "PIN-protected local data storage",
      icon: <Shield className="h-6 w-6" />
    },
    {
      title: "Team Management",
      description: "Multi-user support with role-based access",
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "File Attachments",
      description: "Attach documents and files to customer records",
      icon: <FileText className="h-6 w-6" />
    }
  ];

  const filteredFAQ = useMemo(() => {
    return faqData.map(category => ({
      ...category,
      questions: category.questions.filter(
        q => {
          const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               q.answer.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCategory = selectedCategory === 'all' || category.category === selectedCategory;
          return matchesSearch && matchesCategory;
        }
      )
    })).filter(category => category.questions.length > 0);
  }, [searchTerm, selectedCategory]);

  return (
    <div className={`container mx-auto p-6 max-w-6xl ${className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
        <p className="text-muted-foreground">
          Everything you need to know about using FinCRuM effectively
        </p>
      </div>

      <Tabs defaultValue="quick-start" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-start" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Start
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-start" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Start Guide
              </CardTitle>
              <CardDescription>
                Get up and running with FinCRuM in just a few steps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {quickStartGuide.map((step, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                        {step.step}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-muted-foreground">
                      {step.icon}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Find answers to common questions about FinCRuM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search FAQ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <Button
                        key={category.value}
                        variant={selectedCategory === category.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.value)}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-3 w-3" />
                        {category.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredFAQ.reduce((acc, cat) => acc + cat.questions.length, 0)} questions
                  {selectedCategory !== 'all' && ` in ${categories.find(c => c.value === selectedCategory)?.label}`}
                </p>
              </div>
              
              <ScrollArea className="h-[600px]">
                <div className="space-y-6">
                  {filteredFAQ.map((category, categoryIndex) => (
                    <div key={categoryIndex}>
                      <div className="flex items-center gap-2 mb-4">
                        {category.icon}
                        <h3 className="text-lg font-semibold">{category.category}</h3>
                        <Badge variant="secondary">{category.questions.length}</Badge>
                      </div>
                      
                      <Accordion type="single" collapsible className="space-y-2">
                        {category.questions.map((faq, faqIndex) => (
                          <AccordionItem key={faqIndex} value={`${categoryIndex}-${faqIndex}`} className="border rounded-lg px-4">
                            <AccordionTrigger className="text-left hover:no-underline">
                              <span className="font-medium">{faq.question}</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      
                      {categoryIndex < filteredFAQ.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Features Overview
              </CardTitle>
              <CardDescription>
                Discover all the powerful features FinCRuM has to offer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {features.map((feature, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {feature.icon}
                        </div>
                        {feature.title}
                      </CardTitle>
                      <CardDescription>
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Get Support
                </CardTitle>
                <CardDescription>
                  Need help? We're here to assist you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-muted-foreground">support@finsculpt.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">GitHub Repository</p>
                    <p className="text-sm text-muted-foreground">Report issues and contribute</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Useful information for troubleshooting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Version:</span>
                  <span className="font-mono">v1.0.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="font-mono">{typeof window !== 'undefined' ? navigator.platform : 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">User Agent:</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {typeof window !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'Unknown'}
                  </span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Include this information when contacting support
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HelpGuide;