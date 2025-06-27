import gql from 'graphql-tag';

export const typeDefs = gql`
  type User {
    id: String!
    name: String!
    email: String!
    password: String!
    events: [Event!]!
  }

  type Event {
    id: String!
    name: String!
    location: String!
    startTime: String!
    attendees: [User!]!
  }

  input createEventInput {
    name: String!
    location: String!
    startTime: String!
  }

  input SignupInput {
    name: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type Query {
    events: [Event!]!
    users: [User!]!
  }

  type Mutation {
    createEvent(input: createEventInput!): Event!
    joinEvent(eventId: String!, userId: String!): Event!
    leaveEvent(eventId: String!, userId: String!): Event!
    signup(input: SignupInput): User!
    login(input: LoginInput): User!
  }
`;

