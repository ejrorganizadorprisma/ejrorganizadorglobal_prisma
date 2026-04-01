import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadCount, useMarkAsRead } from '../hooks/useNotifications';

export function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markAsRead = useMarkAsRead();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNavigationPath = (type: string, relatedEntityId?: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return '/products'; // Navigate to products page to see low stock items
      case 'QUOTE_PENDING':
        return relatedEntityId ? `/quotes/${relatedEntityId}` : '/quotes';
      case 'SALE_COMPLETED':
        return relatedEntityId ? `/sales/${relatedEntityId}` : '/sales';
      case 'SERVICE_ORDER_PENDING':
        return relatedEntityId ? `/service-orders/${relatedEntityId}` : '/service-orders';
      case 'PURCHASE_ORDER_APPROVED':
        return relatedEntityId ? `/purchase-orders/${relatedEntityId}` : '/purchase-orders';
      case 'PURCHASE_REQUEST_PENDING':
        return relatedEntityId ? `/purchase-requests/${relatedEntityId}` : '/purchase-requests';
      default:
        return null; // No navigation for unknown types
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // Navigate to related page
    const path = getNavigationPath(notification.type, notification.relatedEntityId);
    if (path) {
      navigate(path);
      setIsOpen(false); // Close dropdown after navigation
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return '⚠️';
      case 'QUOTE_PENDING':
        return '📋';
      case 'SALE_COMPLETED':
        return '💰';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return 'text-yellow-600';
      case 'QUOTE_PENDING':
        return 'text-blue-600';
      case 'SALE_COMPLETED':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
          </div>

          <div className="overflow-y-auto max-h-80">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Carregando...
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-2xl ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                Nenhuma notificação
              </div>
            )}
          </div>

          {notifications && notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Ver todas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
