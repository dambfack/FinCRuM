'use client';

import React, { memo, ReactNode, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormWrapperProps {
  title?: string;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  className?: string;
  showCard?: boolean;
  disabled?: boolean;
  footer?: ReactNode;
}

const FormWrapper = memo<FormWrapperProps>(({ 
  title,
  children,
  onSubmit,
  loading = false,
  submitText = 'Save',
  cancelText = 'Cancel',
  onCancel,
  className = '',
  showCard = true,
  disabled = false,
  footer
}) => {
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || disabled) return;
    await onSubmit(e);
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {children}
      
      {footer || (
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || disabled}
            className="min-w-[100px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              submitText
            )}
          </Button>
        </div>
      )}
    </form>
  );

  if (!showCard) {
    return <div className={className}>{formContent}</div>;
  }

  return (
    <Card className={cn('w-full', className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
});

FormWrapper.displayName = 'FormWrapper';

export default FormWrapper;
export type { FormWrapperProps };