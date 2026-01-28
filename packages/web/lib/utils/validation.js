// Email validation utilities
import { ALLOWED_DOMAIN } from '../config/constants';

/**
 * Validate email format and domain restriction
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailLower = email.toLowerCase().trim();
  
  // Check domain restriction
  if (!emailLower.endsWith(ALLOWED_DOMAIN)) {
    return { valid: false, error: 'Only North Highland Email accepted.' };
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true, normalizedEmail: emailLower };
}
