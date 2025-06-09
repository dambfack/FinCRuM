export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'customers' | 'data' | 'technical' | 'account';
  tags: string[];
}

export const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'How do I add a new customer to the system?',
    answer: 'To add a new customer, navigate to the "Add Customer" page from the sidebar menu. Fill in the required information including name, contact details, and any additional customer data. Click "Save" to add the customer to your database.',
    category: 'customers',
    tags: ['customer', 'add', 'new', 'create']
  },
  {
    id: '2',
    question: 'How can I import customer data from a CSV file?',
    answer: 'Go to the "Import Data" page from the sidebar. Click "Choose File" and select your CSV file. Make sure your CSV file has the correct column headers (Name, Email, Phone, etc.). Review the preview and click "Import" to add the data to your system.',
    category: 'data',
    tags: ['import', 'csv', 'data', 'upload', 'bulk']
  },
  {
    id: '3',
    question: 'How do I export customer data?',
    answer: 'Navigate to the "Export Data" page (available for partners). Select the data range and format you want to export. Choose between CSV, Excel, or PDF formats. Click "Export" to download your data file.',
    category: 'data',
    tags: ['export', 'download', 'csv', 'excel', 'pdf']
  },
  {
    id: '4',
    question: 'What is the difference between user roles?',
    answer: 'There are different user roles in the system: Partners have full access including team management and data export. Regular users can view and manage customers but have limited administrative functions.',
    category: 'account',
    tags: ['roles', 'permissions', 'partner', 'user', 'access']
  },
  {
    id: '5',
    question: 'How do I change my PIN?',
    answer: 'Currently, PIN changes need to be handled by your system administrator. Contact your team lead or partner for assistance with PIN modifications.',
    category: 'account',
    tags: ['pin', 'password', 'security', 'change']
  },
  {
    id: '6',
    question: 'How do I search for specific customers?',
    answer: 'Use the search functionality in the "All Customers" page or "Data Grid" view. You can search by name, email, phone number, or other customer attributes. The search is real-time and will filter results as you type.',
    category: 'customers',
    tags: ['search', 'find', 'filter', 'customers']
  },
  {
    id: '7',
    question: 'Can I customize the application theme?',
    answer: 'Yes! You can switch between light and dark themes using the theme toggle in the header. You can also customize accent colors and other visual elements through the settings menu.',
    category: 'general',
    tags: ['theme', 'dark', 'light', 'customize', 'appearance']
  },
  {
    id: '8',
    question: 'What file formats are supported for import?',
    answer: 'The system supports CSV files for data import. Make sure your CSV file is properly formatted with appropriate column headers and UTF-8 encoding for best results.',
    category: 'technical',
    tags: ['csv', 'format', 'import', 'file', 'supported']
  },
  {
    id: '9',
    question: 'How do I manage team members?',
    answer: 'Team management is available for partners only. Navigate to "Team Management" from the sidebar to add, edit, or remove team members. You can also assign roles and manage permissions from this page.',
    category: 'account',
    tags: ['team', 'management', 'users', 'partner', 'permissions']
  },
  {
    id: '10',
    question: 'What should I do if the application is not responding?',
    answer: 'If the application becomes unresponsive, try refreshing the page first. If the issue persists, close and restart the application. For persistent issues, contact technical support.',
    category: 'technical',
    tags: ['troubleshooting', 'not responding', 'refresh', 'restart']
  },
  {
    id: '11',
    question: 'How do I view customer details?',
    answer: 'Click on any customer name in the customer list or data grid to view their detailed information. You can also edit customer details from this view if you have the appropriate permissions.',
    category: 'customers',
    tags: ['view', 'details', 'customer', 'information']
  },
  {
    id: '12',
    question: 'Is my data automatically saved?',
    answer: 'Yes, most changes are automatically saved to the database. However, when adding or editing customer information, make sure to click the "Save" button to confirm your changes.',
    category: 'general',
    tags: ['save', 'automatic', 'data', 'backup']
  }
];