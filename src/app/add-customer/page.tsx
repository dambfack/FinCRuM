'use client';

import CustomerForm from '@/components/CustomerForm'; // Updated component name

export default function AddCustomerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Add New Customer</h1>
      <p className="text-muted-foreground">
        Enter the customer details below.
      </p>
      <CustomerForm />
    </div>
  );
}
