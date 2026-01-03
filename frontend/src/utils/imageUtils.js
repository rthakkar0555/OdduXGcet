// Utility function to get full image URL from relative path
export const getImageUrl = (relativePath) => {
  if (!relativePath) return null
  
  // If it's already a full URL (http/https), return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }
  
  // If it's a relative path starting with /, prepend backend URL
  if (relativePath.startsWith('/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    // Remove /api/v1 from URL to get base URL
    const baseURL = API_URL.replace('/api/v1', '')
    return `${baseURL}${relativePath}`
  }
  
  return relativePath
}

