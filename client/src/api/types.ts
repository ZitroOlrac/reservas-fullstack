export type ClassType = 'yoga' | 'spinning' | 'crossfit' | 'pilates' | 'boxeo';
export type Role = 'member' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface GymClass {
  id: number;
  title: string;
  type: ClassType;
  instructor: string;
  room: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  capacity: number;
  booked: number;
  spotsLeft: number;
  bookedByMe: boolean;
}

export interface Attendee {
  id: number;
  name: string;
  email: string;
  bookedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface NewClass {
  title: string;
  type: ClassType;
  instructor: string;
  room: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
}
