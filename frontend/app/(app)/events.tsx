import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import io from 'socket.io-client';
import useAuthStore from '../src/store/useUserStore';
import { useRouter } from 'expo-router';

// Define the shape of an Event based on your GraphQL schema
interface Event {
  id: string;
  name: string;
  location: string;
  startTime: string;
  attendees: { id: string; name: string }[];
}

// GraphQL Query and Mutations
const GET_EVENTS_QUERY = `
  query GetEvents {
    events {
      id
      name
      location
      startTime
      attendees {
        id
        name
      }
    }
  }
`;

// Corrected mutation name to 'CreateEvent' (singular) to match backend resolver
const CREATE_EVENT_MUTATION = `
  mutation createEvent($input: createEventInput!) {
    createEvent(input: $input) {
      id
      name
      location
      startTime
      attendees {
        id
        name
      }
    }
  }
`;

const JOIN_EVENT_MUTATION = `
  mutation JoinEvent($eventId: String!, $userId: String!) {
    joinEvent(eventId: $eventId, userId: $userId) {
      id
      name
      location
      startTime
      attendees {
        id
        name
      }
    }
  }
`;

const LEAVE_EVENT_MUTATION = `
  mutation LeaveEvent($eventId: String!, $userId: String!) {
    leaveEvent(eventId: $eventId, userId: $userId) {
      id
      name
      location
      startTime
      attendees {
        id
        name
      }
    }
  }
`;

// Backend GraphQL URL (ensure this matches your backend's PORT in app.ts)
const backendGraphQLUrl = 'http://localhost:8000/graphql'; // Corrected to port 5000
// Socket.IO Server URL (ensure this matches your backend's PORT in app.ts)
const socketIoServerUrl = 'http://localhost:8000'; // Corrected to port 5000

// Socket.IO client instance
// Note: Keeping it outside the component for now. If you need dynamic headers
// based on auth token for socket connection itself, it would need to move inside useEffect
// and connect/disconnect on token changes. For just receiving events, this is fine.
const socket = io(socketIoServerUrl, {
  transports: ['websocket'],
});

// --- API Functions ---
const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

const fetchEvents = async (token: string): Promise<Event[]> => {
  const response = await fetch(backendGraphQLUrl, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ query: GET_EVENTS_QUERY }),
  });
  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL Events Query Error:', result.errors);
    throw new Error(result.errors[0]?.message || 'Failed to fetch events from backend.');
  }
  return result.data.events.map((event: Event) => ({
    ...event,
    attendees: event.attendees ?? []
  }));
};

const createEventApi = async (eventInput: { name: string; location: string; startTime: string }, token: string): Promise<Event> => {
  const response = await fetch(backendGraphQLUrl, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ query: CREATE_EVENT_MUTATION, variables: { input: eventInput } }),
  });
  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL Create Event Mutation Error:', result.errors);
    throw new Error(result.errors[0]?.message || 'Failed to create event.');
  }
  return { ...result.data.createEvent, attendees: result.data.createEvent.attendees ?? [] };
};

const joinEventApi = async (eventId: string, userId: string, token: string): Promise<Event> => {
  const response = await fetch(backendGraphQLUrl, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ query: JOIN_EVENT_MUTATION, variables: { eventId, userId } }),
  });
  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL Join Event Mutation Error:', result.errors);
    throw new Error(result.errors[0]?.message || 'Failed to join event.');
  }
  return { ...result.data.joinEvent, attendees: result.data.joinEvent.attendees ?? [] };
};

const leaveEventApi = async (eventId: string, userId: string, token: string): Promise<Event> => {
  const response = await fetch(backendGraphQLUrl, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ query: LEAVE_EVENT_MUTATION, variables: { eventId, userId } }),
  });
  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL Leave Event Mutation Error:', result.errors);
    throw new Error(result.errors[0]?.message || 'Failed to leave event.');
  }
  return { ...result.data.leaveEvent, attendees: result.data.leaveEvent.attendees ?? [] };
};

// --- EventsScreen Component ---
const EventsScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuthStore();

  const [showModal, setShowModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');

  const currentUserId = user?.id || '';
  const currentUserName = user?.name || user?.email || 'Guest';

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, router]);

  const { data: events, isLoading, isError, error } = useQuery<Event[], Error>({
    queryKey: ['events', currentUserId], // Key now correctly includes currentUserId
    queryFn: () => fetchEvents(currentUserId), // Pass currentUserId as token to the fetch function
    enabled: isAuthenticated, // Only run this query if the user is authenticated
  });

  const createEventMutation = useMutation<Event, Error, { name: string; location: string; startTime: string }>({
    mutationFn: (input) => createEventApi(input, currentUserId),
    onSuccess: () => {
      setShowModal(false);
      setEventName('');
      setEventLocation('');
      setEventStartTime('');
      Alert.alert('Success', 'Event creation request sent!');
      // No manual queryClient update here, relying solely on Socket.IO 'eventCreated'
    },
    onError: (mutationError) => {
      console.error('Create Event Mutation Error:', mutationError);
      Alert.alert('Error', mutationError.message || 'Failed to create event.');
    },
  });

  const joinEventMutation = useMutation<Event, Error, { eventId: string; userId: string; userName: string }>({
    mutationFn: ({ eventId, userId }) => joinEventApi(eventId, userId, currentUserId), // Pass currentUserId to API call
    onSuccess: (joinedEvent, variables) => {
      // Optimistically update the cache immediately for responsiveness
      queryClient.setQueryData<Event[]>(['events', currentUserId], (oldEvents) => { // Updated queryKey
        if (!oldEvents) return [];
        return oldEvents.map((event) =>
          event.id === joinedEvent.id
            ? { ...event, attendees: [...(event.attendees ?? []), { id: variables.userId, name: variables.userName }] }
            : event
        );
      });
      // Emit socket event to notify other users (and the current user if they are also listening)
      socket.emit('joinEvent', { eventId: joinedEvent.id, userId: variables.userId, userName: variables.userName });
      Alert.alert('Success', `You have joined "${joinedEvent.name}"!`);
    },
    onError: (mutationError) => {
      console.error('Join Event Mutation Error:', mutationError);
      Alert.alert('Error', mutationError.message || 'Failed to join event.');
    },
  });

  const leaveEventMutation = useMutation<Event, Error, { eventId: string; userId: string; userName: string }>({
    mutationFn: ({ eventId, userId }) => leaveEventApi(eventId, userId, currentUserId), // Pass currentUserId to API call
    onSuccess: (leftEvent, variables) => {
      // Optimistically update the cache immediately for responsiveness
      queryClient.setQueryData<Event[]>(['events', currentUserId], (oldEvents) => { // Updated queryKey
        if (!oldEvents) return [];
        return oldEvents.map((event) =>
          event.id === leftEvent.id
            ? { ...event, attendees: (event.attendees ?? []).filter(a => a.id !== variables.userId) }
            : event
        );
      });
      // Emit socket event to notify other users
      socket.emit('leaveEvent', { eventId: leftEvent.id, userId: variables.userId, userName: variables.userName });
      Alert.alert('Success', `You have left "${leftEvent.name}"!`);
    },
    onError: (mutationError) => {
      console.error('Leave Event Mutation Error:', mutationError);
      Alert.alert('Error', mutationError.message || 'Failed to leave event.');
    },
  });

  const handleCreateEvent = () => {
    if (!eventName || !eventLocation || !eventStartTime) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    if (!currentUserId) {
        Alert.alert('Authentication Error', 'Please log in to create an event.');
        return;
    }
    createEventMutation.mutate({ name: eventName, location: eventLocation, startTime: eventStartTime });
  };

  const handleJoinLeaveEvent = (event: Event) => {
    if (!currentUserId) {
      Alert.alert('Error', 'User information missing. Please log in.');
      return;
    }

    const isAttending = event.attendees?.some(attendee => attendee.id === currentUserId);

    if (isAttending) {
      leaveEventMutation.mutate({ eventId: event.id, userId: currentUserId, userName: currentUserName });
    } else {
      joinEventMutation.mutate({ eventId: event.id, userId: currentUserId, userName: currentUserName });
    }
  };

  const handleSignOut = () => {
    signOut();
    router.replace('/(auth)/login');
  };

  useEffect(() => {
    // Moved socket connection setup inside this effect to potentially react to currentUserId changes
    // This function sets up all event listeners
    const setupSocketListeners = () => {
      // Disconnect any existing connections before setting up new ones
      // This is crucial to prevent duplicate listeners if the effect re-runs
      socket.off(); // Remove all previous listeners
      socket.connect(); // Ensure the socket is connected

      socket.on('connect', () => {
        console.log('Connected to Socket.IO server:', socket.id);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server');
      });

      socket.on('eventJoined', (data: { eventId: string; userId: string; userName: string }) => {
        console.log('Socket: Event Joined by another user:', data);
        queryClient.setQueryData<Event[]>(['events', currentUserId], (oldEvents) => { // Updated queryKey
          if (!oldEvents) return [];
          return oldEvents.map((event) =>
            event.id === data.eventId && !(event.attendees ?? []).some(a => a.id === data.userId)
              ? { ...event, attendees: [...(event.attendees ?? []), { id: data.userId, name: data.userName }] }
              : event
          );
        });
      });

      socket.on('eventCreated', (newEvent: Event) => {
        console.log('Socket: New Event received via Socket.IO:', newEvent);
        queryClient.setQueryData<Event[]>(['events', currentUserId], (oldEvents) => { // Updated queryKey
          const eventToAdd = { ...newEvent, attendees: newEvent.attendees ?? [] };
          if (oldEvents && oldEvents.some(event => event.id === eventToAdd.id)) {
              return oldEvents;
          }
          return oldEvents ? [...oldEvents, eventToAdd] : [eventToAdd];
        });
      });

      socket.on('eventLeft', (data: { eventId: string; userId: string; userName: string }) => {
        console.log('Socket: Event Left by another user:', data);
        queryClient.setQueryData<Event[]>(['events', currentUserId], (oldEvents) => { // Updated queryKey
          if (!oldEvents) return [];
          return oldEvents.map((event) =>
            event.id === data.eventId
              ? { ...event, attendees: (event.attendees ?? []).filter(a => a.id !== data.userId) }
              : event
          );
        });
      });
    };

    // Only set up listeners if currentUserId is available and not a guest
    if (currentUserId && currentUserId !== 'guest_id') { // Ensure a valid user ID for personalized updates
      setupSocketListeners();
    } else {
      // If no valid user, disconnect existing socket listeners that might be tied to a previous session
      socket.off();
      socket.disconnect();
    }


    // Cleanup function: This runs when the component unmounts or before the effect re-runs
    return () => {
      console.log('Cleaning up Socket.IO listeners...');
      socket.off(); // Remove all listeners
      socket.disconnect(); // Disconnect the socket connection
    };
  }, [queryClient, currentUserId]); // Depend on queryClient and currentUserId to re-setup listeners on auth change

  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009579" />
        <Text style={styles.loadingText}>Redirecting to Login...</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009579" />
        <Text style={styles.loadingText}>Loading Events...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading events:</Text>
        <Text style={styles.errorText}>{error?.message || 'Unknown error'}</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Upcoming Events</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.loggedInAs}>Logged in as: {currentUserName} ({currentUserId})</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addEventButton}>
          <Text style={styles.addEventButtonText}>Add Event</Text>
        </TouchableOpacity>
      </View>

      {events && events.length > 0 ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const currentAttendees = item.attendees ?? [];
            const isAttending = currentAttendees.some(attendee => attendee.id === currentUserId);

            return (
              <TouchableOpacity onPress={() => handleJoinLeaveEvent(item)} style={styles.eventCard}>
                <Text style={styles.eventName}>{item.name}</Text>
                <Text style={styles.eventDetail}>📍 {item.location}</Text>
                <Text style={styles.eventDetail}>⏰ {item.startTime}</Text>
                <Text style={styles.eventAttendees}>
                  Attendees: {currentAttendees.map(a => a.name).join(', ') || 'No attendees yet'}
                </Text>
                <View style={styles.joinLeaveButtonContainer}>
                  <Text style={[styles.joinLeaveButton, isAttending ? styles.leaveButton : styles.joinButton]}>
                    {isAttending ? 'Leave Event' : 'Join Event'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContentContainer}
        />
      ) : (
        <Text style={styles.noEventsText}>No events found.</Text>
      )}

      {/* Add Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Create New Event</Text>
            <TextInput
              style={styles.input}
              placeholder="Event Name"
              value={eventName}
              onChangeText={setEventName}
            />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={eventLocation}
              onChangeText={setEventLocation}
            />
            <TextInput
              style={styles.input}
              placeholder="Start Time (e.g., Friday 10 AM)"
              value={eventStartTime}
              onChangeText={setEventStartTime}
              autoCapitalize="none"
              keyboardType="default"
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                onPress={handleCreateEvent}
                style={[styles.modalButton, styles.createButton]}
                disabled={createEventMutation.isPending}
              >
                {createEventMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Create Event</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
                disabled={createEventMutation.isPending}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default EventsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    flex: 1,
  },
  loggedInAs: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addEventButton: {
    backgroundColor: '#009579',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  addEventButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
    color: '#009579',
  },
  eventDetail: {
    fontSize: 16,
    color: '#555',
    marginBottom: 3,
  },
  eventAttendees: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#777',
    marginTop: 5,
  },
  noEventsText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#888',
    marginTop: 50,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#009579',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    backgroundColor: '#009579',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  joinLeaveButtonContainer: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  joinLeaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    fontWeight: 'bold',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#4CAF50', // Green for Join
  },
  leaveButton: {
    backgroundColor: '#f44336', // Red for Leave
  },
});
