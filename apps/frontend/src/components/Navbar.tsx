import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { NotificationDto } from '@repo-manager/shared';
import {
  FolderGit2,
  Settings,
  History,
  LogOut,
  ShieldCheck,
  Bell,
  Check,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsResponse } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res: any = await apiClient.get('/notifications');
      return res.data as { notifications: NotificationDto[]; unreadCount: number };
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const notifications = notificationsResponse?.notifications || [];
  const unreadCount = notificationsResponse?.unreadCount || 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E5E5] bg-white/95 backdrop-blur-xl transition-all shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left Brand & Navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="p-2 bg-[#1A1A1A] text-[#FDFBF7] rounded-lg shadow-sm border border-[#C5A880]/50 group-hover:scale-105 transition-transform">
                <FolderGit2 className="w-5 h-5 text-[#C5A880]" />
              </div>
              <span className="text-xl font-serif font-bold text-[#1A1A1A] tracking-tight">
                PT Repo Manager
              </span>
            </Link>

            <nav className="hidden md:flex space-x-2">
              <Link to="/dashboard">
                <Button
                  variant={isActive('/dashboard') ? 'gradient' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <FolderGit2 className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>

              <Link to="/settings">
                <Button
                  variant={isActive('/settings') ? 'gradient' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </Link>

              <Link to="/audit">
                <Button
                  variant={isActive('/audit') ? 'gradient' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <History className="w-4 h-4" />
                  Audit Log
                </Button>
              </Link>
            </nav>
          </div>

          {/* Right User & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notification Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative rounded-xl border-[#E5E5E5] bg-[#FDFBF7] hover:bg-[#F5EFE6] text-[#1A1A1A]"
                >
                  <Bell className="w-4 h-4 text-[#7D5E46]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-700 text-[10px] font-bold text-white shadow-md animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 border-[#E5E5E5] bg-white">
                <div className="p-3 bg-[#F5EFE6] border-b border-[#E5E5E5] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#7D5E46]" />
                    <span className="text-xs font-serif font-bold text-[#1A1A1A]">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-[11px] text-[#C5A880] hover:text-[#7D5E46] h-auto p-0"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E5E5] text-xs">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[#6B6B6B] text-xs flex flex-col items-center gap-2">
                      <Sparkles className="w-6 h-6 text-[#C5A880]" />
                      <span>No active warning alerts</span>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 transition-colors flex gap-2.5 items-start ${
                          n.read
                            ? 'bg-white text-[#6B6B6B]'
                            : 'bg-[#FDFBF7] text-[#1A1A1A] border-l-2 border-[#C5A880] font-medium'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            n.severity === 'danger' ? 'text-rose-700' : 'text-amber-700'
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-xs text-[#1A1A1A] leading-snug">{n.message}</p>
                          <span className="text-[10px] text-[#A39281] mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {!n.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markReadMutation.mutate(n.id)}
                            className="h-6 w-6 text-[#A39281] hover:text-[#1A1A1A] hover:bg-[#F5EFE6]"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Role Badge */}
            <Badge variant="gold" className="hidden sm:inline-flex gap-1.5 py-1 px-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7D5E46]" />
              {user.role === 'ADMIN' ? 'Admin' : 'User'}
            </Badge>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E5E5E5]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 p-1.5 hover:bg-[#F5EFE6] rounded-full">
                    <Avatar
                      src={user.avatarUrl}
                      alt={user.username}
                      fallback={user.username.substring(0, 2)}
                    />
                    <span className="text-xs font-semibold text-[#1A1A1A] hidden lg:inline max-w-[120px] truncate">
                      {user.name || user.username}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-[#E5E5E5] bg-white">
                  <DropdownMenuLabel>Logged in as</DropdownMenuLabel>
                  <div className="px-3 py-1 text-xs text-[#7D5E46] font-mono font-semibold truncate">
                    @{user.username}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-rose-700 focus:text-rose-800 focus:bg-rose-50 gap-2 cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
