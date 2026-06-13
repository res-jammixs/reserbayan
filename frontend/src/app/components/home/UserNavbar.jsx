'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ClipboardList,
  FileBadge2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  User,
  X,
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import NotificationDrawer from '@/app/components/notifications/NotificationDrawer';
import ProfileDrawer from '@/app/components/profile/ProfileDrawer';

function DocumentNavIcon(props) {
  return <FileBadge2 {...props} strokeWidth={1.8} />;
}

const roleNavItems = {
  SUPER_ADMIN: [
    { href: '/superadmin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/superadmin/documents', label: 'Documents', icon: DocumentNavIcon },
    { href: '/superadmin/management', label: 'Management', icon: ClipboardList },
    { href: '/superadmin/announcements', label: 'Announcements', icon: Megaphone },
  ],
  ADMIN: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/documents', label: 'Documents', icon: DocumentNavIcon },
    { href: '/admin/management', label: 'Management', icon: ClipboardList },
    { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  ],
  RESIDENT: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/documents', label: 'Documents', icon: DocumentNavIcon },
    { href: '/requests', label: 'Requests', icon: ClipboardList },
    { href: '/announcements', label: 'Announcements', icon: Megaphone },
  ],
};

function getNavRole(role) {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return role;
  return 'RESIDENT';
}

function NavLink({ href, label, icon: Icon, pathname, onClick }) {
  const active = pathname === href || pathname?.startsWith(`${href}/`);
  const activeClass = active
    ? 'text-[#122361] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-gradient-to-r after:from-[#122361] after:to-[#2f84c0]'
    : 'text-gray-700 hover:text-[#122361] hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:h-0.5 hover:after:w-full hover:after:bg-gray-300';

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-2 px-3 py-2 font-semibold transition-all duration-300 ${activeClass}`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

function NotificationBellButton({ unreadCount, onClick, className = '' }) {
  const badgeLabel = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl p-2 text-gray-700 transition hover:bg-[#eef3ff] hover:text-[#122361] ${className}`}
      aria-label="Open notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-[1.15rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white ring-2 ring-white">
          {badgeLabel}
        </span>
      )}
    </button>
  );
}

export default function UserNavbar() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [role, setRole] = useState(null);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navRole = getNavRole(role);
  const navItems = useMemo(() => roleNavItems[navRole], [navRole]);
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Profile' : 'Profile';

  useEffect(() => {
    setRole(localStorage.getItem('role'));

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('notifications') === 'open') {
      setNotificationDrawerOpen(true);
      params.delete('notifications');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [pathname, router]);

  const performLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.dispatchEvent(new CustomEvent('userLogout'));
    window.location.href = '/';
  };

  const openNotifications = () => {
    setNotificationDrawerOpen(true);
    setProfileDrawerOpen(false);
    setIsOpen(false);
  };

  const openProfile = () => {
    setProfileDrawerOpen(true);
    setNotificationDrawerOpen(false);
    setDropdownOpen(false);
    setIsOpen(false);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center space-x-2">
          <Image
            src="/reserbayan-logo.png"
            alt="ReserBayan Logo"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <span className="font-[family-name:var(--font-montserrat)] text-xl font-bold text-gray-900">ReserBayan</span>
        </div>

        <nav className="hidden items-center space-x-8 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <NotificationBellButton unreadCount={unreadCount} onClick={openNotifications} />

          <div className="relative" ref={dropdownRef}>
            {user && (
              <button
                type="button"
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex items-center space-x-2 rounded-lg px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#122361]"
              >
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="font-medium">{displayName}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            )}

            {dropdownOpen && user && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center space-x-2 px-4 py-3 text-left text-gray-700 transition-colors first:rounded-t-lg hover:bg-gray-50 hover:text-[#122361]"
                  onClick={openProfile}
                >
                  <User className="h-4 w-4" />
                  <span>View Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(true);
                    setDropdownOpen(false);
                  }}
                  className="flex w-full items-center space-x-2 rounded-b-lg px-4 py-3 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <NotificationBellButton unreadCount={unreadCount} onClick={openNotifications} />
          <button type="button" onClick={() => setIsOpen((open) => !open)} aria-label="Toggle menu">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="space-y-4 px-8 py-4">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} onClick={() => setIsOpen(false)} />
            ))}

            {user && (
              <div className="space-y-2" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#122361]"
                >
                  <div className="flex items-center space-x-2">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="Profile" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                    <span className="font-medium">{displayName}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="overflow-hidden rounded-lg bg-gray-50">
                    <button
                      type="button"
                      className="flex w-full items-center space-x-2 px-4 py-3 text-left text-gray-700 transition-colors hover:bg-gray-100 hover:text-[#122361]"
                      onClick={openProfile}
                    >
                      <User className="h-4 w-4" />
                      <span>View Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoutConfirm(true);
                        setDropdownOpen(false);
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center space-x-2 px-4 py-3 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        role={navRole}
        user={user}
        onUnreadCountChange={setUnreadCount}
      />

      <ProfileDrawer
        isOpen={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        role={navRole}
        user={user}
      />

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-md">
          <div className="mx-4 max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <LogOut className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Confirm Logout</h3>
              <p className="mb-8 text-gray-600">Are you sure you want to log out? You&apos;ll need to sign in again to access your account.</p>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-lg bg-gray-200 px-6 py-3 font-semibold text-gray-800 transition-colors hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    performLogout();
                    setShowLogoutConfirm(false);
                  }}
                  className="flex-1 rounded-lg bg-red-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-600"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
