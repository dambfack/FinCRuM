import FileUpload from '@/components/FileUpload';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-heading tracking-wide">Import Data</h1>
      <p className="text-muted-foreground">
        Upload an Excel (.xlsx, .xls) or CSV (.csv) file to import customer data.
      </p>
      <FileUpload />
    </div>
  );
}
