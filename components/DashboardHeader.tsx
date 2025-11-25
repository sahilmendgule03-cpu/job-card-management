'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu, User, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50 w-full overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-6">
          {/* Logo Section */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="truncate">
              <h1 className="text-base sm:text-xl font-bold leading-tight">
                SM Enterprises
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Fabrication Shop System
              </p>
            </div>
          </Link>

          {/* Mobile Menu Button */}
          <div className="sm:hidden">
            <Button variant="outline" size="icon" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav
            className={`${
              menuOpen ? 'flex' : 'hidden'
            } sm:flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto`}
          >
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto">
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/reports" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto">
                Reports
              </Button>
            </Link>
            <Link href="/dashboard/completed" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto">
                Completed Jobs
              </Button>
            </Link>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}
