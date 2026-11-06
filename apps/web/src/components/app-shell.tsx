'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Building2,
  CreditCard,
  FolderKanban,
  LogOut,
  ScrollText,
  Users,
} from 'lucide-react';
import { Button, cn } from '@tenantforge/ui';
import { useAuth } from '@/lib/auth-context';
import { OrgSwitcher } from '@/components/org-switcher';
import { NotificationBell } from '@/components/notification-bell';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Building2 },
  { href: '/applications', label: 'Applications', icon: Box },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/audit', label: 'Audit Log', icon: ScrollText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold text-blue-600">
              TenantForge
            </Link>
            <OrgSwitcher />
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="hidden text-sm text-slate-600 sm:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <nav className="hidden w-56 shrink-0 md:block">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname.startsWith(href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
