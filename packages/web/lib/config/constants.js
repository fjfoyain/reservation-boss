// Application constants
export const PARKING_SPOTS = [
  'Parking 1',
  'Parking 2',
  'Parking 3',
  'Parking 4',
  'Parking 5',
  'Parking 6',
  'Parking 7',
  'Parking 8',
  'Parking 9',
  'Parking 10',
];

export const ALLOWED_DOMAIN = '@northhighland.com';
export const MAX_WEEKLY_RESERVATIONS = 4;
export const TIMEZONE = 'America/Guayaquil';

// Firestore collection names — change here to update everywhere
export const USERS_COLLECTION = 'v3_users';
export const ATTENDANCE_COLLECTION = 'v3_attendance';
export const PARKING_COLLECTION = 'v3_parking';
export const CONFIG_COLLECTION = 'v3_config';
export const ROOMS_COLLECTION = 'v3_rooms';
export const ROOM_RESERVATIONS_COLLECTION = 'v3_room_reservations';
export const LATE_REQUESTS_COLLECTION = 'v3_late_requests';
export const INVITATIONS_COLLECTION = 'v3_invitations';
export const BLACKOUT_DATES_COLLECTION = 'blackout_dates';
export const APPROVAL_REQUESTS_COLLECTION = 'v3_approvalRequests';

// CORS allowed origins
export const ALLOWED_ORIGINS = [
  'https://reservationboss.io',
  'https://www.reservationboss.io',
  'http://localhost:3000',
];
