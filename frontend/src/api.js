const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) {
    let message = 'Something went wrong';
    let extra = {};
    try {
      const body = JSON.parse(text);
      message = body.message || body.error || message;
      if (body.events) extra.events = body.events;
    } catch { /* non-JSON error */ }
    const err = new Error(message);
    Object.assign(err, extra);
    throw err;
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  // Events
  getEvents: () => request('/events'),
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (data) => request('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),
  cloneEvent: (id, data) => request(`/events/${id}/clone`, { method: 'POST', body: JSON.stringify(data || {}) }),

  // Guests (standalone)
  getAllGuests: () => request('/guests'),
  getGuest: (id) => request(`/guests/${id}`),
  createGuest: (data) => request('/guests', { method: 'POST', body: JSON.stringify(data) }),
  updateGuest: (id, data) => request(`/guests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGuest: (id) => request(`/guests/${id}`, { method: 'DELETE' }),
  bulkCreateGuests: (guests) => request('/guests/bulk', { method: 'POST', body: JSON.stringify(guests) }),

  // Event Guests (assignments)
  getEventGuests: (eventId) => request(`/events/${eventId}/guests`),
  assignGuest: (eventId, data) => request(`/events/${eventId}/guests`, { method: 'POST', body: JSON.stringify(data) }),
  updateEventGuest: (eventId, egId, data) => request(`/events/${eventId}/guests/${egId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeEventGuest: (eventId, egId) => request(`/events/${eventId}/guests/${egId}`, { method: 'DELETE' }),
  getEventSummary: (eventId) => request(`/events/${eventId}/guests/summary`),

  // Guest Meals (under event-guest)
  getMeals: (eventId, egId) => request(`/events/${eventId}/guests/${egId}/meals`),
  getMealSummary: (eventId) => request(`/events/${eventId}/guests/meal-summary`),
  createMeal: (eventId, egId, data) => request(`/events/${eventId}/guests/${egId}/meals`, { method: 'POST', body: JSON.stringify(data) }),
  updateMeal: (eventId, egId, mealId, data) => request(`/events/${eventId}/guests/${egId}/meals/${mealId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMeal: (eventId, egId, mealId) => request(`/events/${eventId}/guests/${egId}/meals/${mealId}`, { method: 'DELETE' }),

  // Schedules
  getSchedules: (eventId) => request(`/events/${eventId}/schedules`),
  createSchedule: (eventId, data) => request(`/events/${eventId}/schedules`, { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (eventId, id, data) => request(`/events/${eventId}/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (eventId, id) => request(`/events/${eventId}/schedules/${id}`, { method: 'DELETE' }),

  // Helpers
  getHelpers: () => request('/helpers'),
  createHelper: (data) => request('/helpers', { method: 'POST', body: JSON.stringify(data) }),
  updateHelper: (id, data) => request(`/helpers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHelper: (id) => request(`/helpers/${id}`, { method: 'DELETE' }),
  getHelperAssignments: (id) => request(`/helpers/${id}/assignments`),

  // Accommodation Places
  getAccommodationPlaces: () => request('/accommodation-places'),
  getAccommodationOccupancy: (fromDate, toDate) => {
    const params = fromDate && toDate ? `?fromDate=${fromDate}&toDate=${toDate}` : '';
    return request(`/accommodation-places/occupancy${params}`);
  },
  createAccommodationPlace: (data) => request('/accommodation-places', { method: 'POST', body: JSON.stringify(data) }),
  updateAccommodationPlace: (id, data) => request(`/accommodation-places/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccommodationPlace: (id) => request(`/accommodation-places/${id}`, { method: 'DELETE' }),

  // Drop-off Locations
  getDropOffLocations: () => request('/drop-off-locations'),
  createDropOffLocation: (data) => request('/drop-off-locations', { method: 'POST', body: JSON.stringify(data) }),
  updateDropOffLocation: (id, data) => request(`/drop-off-locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDropOffLocation: (id) => request(`/drop-off-locations/${id}`, { method: 'DELETE' }),

  // Activity Logs
  getActivityLogs: (entityType) => request(`/activity-logs${entityType ? `?entityType=${entityType}` : ''}`),
};
