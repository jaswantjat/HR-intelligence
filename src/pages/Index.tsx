import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Job Search App</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Find active job openings at any company using AI-powered search
        </p>
        <Button asChild size="lg">
          <Link to="/jobs" className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Start Job Search
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
