import axios from 'axios'

// Get API base URL from environment variable, default to empty string for relative URLs
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
})

export default api
