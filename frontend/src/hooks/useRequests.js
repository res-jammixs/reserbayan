import { useState, useEffect, useCallback } from 'react';

export function useRequests(user) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user?.residentId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching requests for residentId:', user.residentId);
      const response = await fetch(`/api/document-requests/resident/${user.residentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched requests:', data);
        setRequests(data);
      } else {
        console.error('Failed to fetch requests:', response.status, response.statusText);
        alert('Failed to load requests. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      alert('Network error. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [user?.residentId]);

  useEffect(() => {
    if (user) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [user, fetchRequests]);

  const cancelRequest = useCallback(async (requestId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'No token found' };
    }

    try {
      const response = await fetch(`/api/document-requests/${requestId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        // Refetch requests after cancelling
        await fetchRequests();
        return { success: true };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      return { success: false, error: 'Network error' };
    }
  }, [fetchRequests]);

  return { requests, loading, refetchRequests: fetchRequests, cancelRequest };
}