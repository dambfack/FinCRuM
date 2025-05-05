'use client';

import AddCustomerForm from '@/components/AddCustomerForm';

export default function AddCustomerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Add New Customer</h1>
      <p className="text-muted-foreground">
        Enter the customer details below. The fields should match the columns in your imported data.
      </p>
      <AddCustomerForm />
    </div>
  );
}
