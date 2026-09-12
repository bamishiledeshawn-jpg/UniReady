// Base URL for uniready-api. Override with VITE_API_URL in a .env file
// for anything other than local development (e.g. a deployed backend URL).
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
