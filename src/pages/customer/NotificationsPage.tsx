import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api/endpoints';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { formatLagosDateTime } from '../../utils/format';

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { page, unreadOnly }],
    queryFn: () => notificationsApi.list({ page, pageSize: 15, unreadOnly }),
  });

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    await queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    await queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h1 className="h3 fw-bold mb-0">Notifications</h1>
        <div className="d-flex align-items-center gap-3">
          <div className="form-check form-switch mb-0">
            <input
              id="unread-only-toggle"
              type="checkbox"
              className="form-check-input"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
            />
            <label htmlFor="unread-only-toggle" className="form-check-label small fw-semibold">
              Unread Only
            </label>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => void handleMarkAllRead()}
          >
            Mark All as Read
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading notifications..." />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon="bi-bell-slash"
          title="No notifications"
          description="Updates on your orders, payments, and deliveries will appear here."
        />
      ) : (
        <>
          <div className="list-group shadow-sm">
            {data.items.map((n) => (
              <div
                key={n.id}
                className={`list-group-item d-flex justify-content-between align-items-start p-3 ${
                  !n.isRead ? 'bg-light border-start border-success border-4' : ''
                }`}
              >
                <div>
                  <div className="fw-bold">
                    {n.title}
                    {!n.isRead && <span className="badge text-bg-success ms-2">New</span>}
                  </div>
                  <p className="mb-1 small text-muted">{n.message}</p>
                  <div className="d-flex gap-3 align-items-center small text-secondary">
                    <span>{formatLagosDateTime(n.createdAt)}</span>
                    {n.orderId && (
                      <Link to={`/orders/${n.orderId}`} className="text-success fw-semibold">
                        View Order →
                      </Link>
                    )}
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => void handleMarkRead(n.id)}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};
