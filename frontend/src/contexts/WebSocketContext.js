import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('ws://localhost:8000', {
      transports: ['websocket'],
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    newSocket.on('incident_detected', (data) => {
      console.log('New incident detected:', data);
      toast.success(`New ${data.incident_type} incident detected!`, {
        duration: 5000,
        position: 'top-right'
      });
    });

    newSocket.on('feed_status_update', (data) => {
      console.log('Feed status updated:', data);
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast.error('WebSocket connection error');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinFeed = (feedId) => {
    if (socket) {
      socket.emit('join_feed', feedId);
    }
  };

  const leaveFeed = (feedId) => {
    if (socket) {
      socket.emit('leave_feed', feedId);
    }
  };

  const value = {
    socket,
    isConnected,
    joinFeed,
    leaveFeed
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
