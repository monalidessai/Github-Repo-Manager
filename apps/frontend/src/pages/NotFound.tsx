import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
      <Card className="max-w-md w-full border-[#E5E5E5] bg-white p-6 text-center space-y-4 shadow-xl">
        <div className="p-4 bg-[#FAF9F6] text-[#7D5E46] rounded-2xl w-fit mx-auto border border-[#E8DBCB]">
          <FileQuestion className="w-12 h-12 text-[#C5A880]" />
        </div>
        <CardTitle className="text-2xl font-serif font-bold text-[#1A1A1A]">
          404 - Page Not Found
        </CardTitle>
        <CardDescription className="text-[#6B6B6B] text-xs font-medium">
          The requested page or route does not exist.
        </CardDescription>
        <div className="pt-2">
          <Link to="/dashboard">
            <Button variant="gradient" className="gap-2">
              <ArrowLeft className="w-4 h-4 text-[#C5A880]" />
              <span>Return to Dashboard</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
