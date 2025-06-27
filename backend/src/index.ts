// backend/src/app.ts (or server.ts)

import dotenv from "dotenv"
dotenv.config() // Load environment variables from .env file

import express from 'express';
import { ApolloServer } from 'apollo-server-express'; // Note: Apollo Server v3 is used here. For v4, it's `@apollo/server` and `expressMiddleware`.
import { typeDefs } from './graphql/schema'; // Adjust path if needed
import { resolvers } from './graphql/resolver'; // Adjust path if needed
import cors from 'cors'; // Import cors for handling cross-origin requests
import http from 'http'; // Import http module for the server
import { Server as SocketIOServer } from 'socket.io'; // Import Socket.IO Server
// import jwt from 'jsonwebtoken'; // You would typically import jsonwebtoken here for JWT verification

const app = express();
const PORT = process.env.PORT || 3000; // Updated PORT to 3000 or from environment variables

app.use(cors({
  origin: ["http://localhost:19006", "http://localhost:8081", "http://localhost:3000", "http://localhost:5000"], // Added http://localhost:5000 to allowed origins
  methods: ["GET", "POST", "PUT", "DELETE"]
})); // Configure CORS for Express

async function startApolloServer() {
  const httpServer = http.createServer(app); // Create an HTTP server from your Express app

  // Initialize Socket.IO and attach it to the HTTP server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ["http://localhost:19006", "http://localhost:8081", "http://localhost:3000", "http://localhost:5000"], // Added http://localhost:5000 to allowed origins
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO Connection Handling
  io.on('connection', (socket) => {
    console.log('A user connected via Socket.IO:', socket.id);

    // Listen for 'joinEvent' emitted from frontend
    socket.on('joinEvent', (data: { eventId: string; userId: string; userName: string }) => {
      console.log(`Socket: User ${data.userName} (${data.userId}) joined event ${data.eventId}`);
      // Emit to all other clients (excluding the sender)
      socket.broadcast.emit('eventJoined', data);
    });

    // Listen for 'leaveEvent' emitted from frontend
    socket.on('leaveEvent', (data: { eventId: string; userId: string; userName: string }) => {
      console.log(`Socket: User ${data.userName} (${data.userId}) left event ${data.eventId}`);
      // Emit to all other clients (excluding the sender)
      socket.broadcast.emit('eventLeft', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected from Socket.IO:', socket.id);
    });
  });


  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // Add a context function to attach user data and the io instance to the GraphQL context
    context: async ({ req }) => {
      let userId: string | null = null;
      let user = null;

      const authHeader = req.headers.authorization || '';

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        userId = token; // For demonstration: userId is directly from token. Replace with JWT verification.
      }

      // Pass the io instance to the context so resolvers can access it
      return { userId, user, io };
    },
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      if (process.env.NODE_ENV === 'production') {
        return { message: error.message, code: error.extensions?.code };
      }
      return error;
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  // Start the HTTP server (which now handles both Express and Socket.IO)
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🚀 GraphQL endpoint ready at http://localhost:${PORT}/graphql`);
    console.log(`🚀 Socket.IO ready at http://localhost:${PORT}`);
  });
}

startApolloServer();
