import { PrismaClient } from "@prisma/client";
import prisma from "../packages/db";
import bcrypt from "bcrypt"
import { Server as SocketIOServer } from 'socket.io'; // Import for type hinting

const TOKEN_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Define the context type for better type safety
interface MyContext {
  userId: string | null;
  user: any; // Or your actual User type
  io: SocketIOServer; // Include the Socket.IO server instance in the context type
}

export const resolvers = {
  Query: {
    events: () => prisma.event.findMany({ include: { attendees: true } }),
    users: () => prisma.user.findMany({ include: { events: true } }),
  },
  Mutation: {
    joinEvent: async (_: any, { eventId, userId }: any) => {
      return await prisma.event.update({
        where: { id: eventId },
        data: {
          attendees: {
            connect: { id: userId },
          },
        },
        include: { attendees: true },
      });
    },
    leaveEvent: async (_: any, { eventId, userId }: any) => {
      return await prisma.event.update({
        where: { id: eventId },
        data: {
          attendees: {
            disconnect: { id: userId },
          },
        },
        include: { attendees: true },
      });
    },
    signup: async (_: any, { input }: any) => {
      // Destructure 'input' from the arguments
      const { email, password, name } = input; // Then destructure properties from the 'input' object

      try {
        const userExists = await prisma.user.findUnique({
          where: { email },
        });

        if (userExists) {
          throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
          data: {
            email,
            password: hashedPassword, // IMPORTANT: Store hashed password in production!
            name,
          },
        });
        return newUser;
      } catch (error: any) {
        // Handle unique constraint errors for email, or other database errors
        if (error.code === "P2002" && error.meta?.target?.includes("email")) {
          throw new Error("A user with this email already exists.");
        }
        console.error("Signup error in resolver:", error);
        throw new Error("Could not create user. Please try again.");
      }
    },
    login: async (_: any, { input }: any) => {
      const { email, password } = input;
      try {
        const userExists = await prisma.user.findUnique({
          where: { email },
        });

        if (!userExists) {
          throw new Error("User not found. Please check your email.");
        }

        const isPasswordValid = await bcrypt.compare(password, userExists.password)

        if (!isPasswordValid) {
          throw new Error("Invalid password. Please try again.");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: userExists.email
          }
        })

        return user;
      } catch (error) {
        console.error("Login error in resolver:", error);
        throw new Error("Login failed. Please check your credentials and try again.");
      }
    },
    // Changed mutation name from 'createEvents' to 'createEvent' (singular)
    // Added 'context' parameter to access the Socket.IO instance
    createEvent: async (_: any, { input }: any, context: MyContext) => {
      const { name, location, startTime } = input;
      const { io } = context; // Destructure io from the context

      try {
        const newEvent = await prisma.event.create({
          data: {
            name,
            location,
            startTime
          },
          include: {
            attendees: true
          }
        });

        // Emit a Socket.IO event to all connected clients about the new event
        // Make sure the frontend is listening for 'eventCreated'
        io.emit('eventCreated', newEvent);

        return newEvent;
      } catch (error) {
        console.error("Error creating event :", error)
        throw new Error("Could not create event, Please try again")
      }
    }
  },
};
