/**
 * Email validation utilities
 * Shared across all platforms
 */

/**
 * Validates if an email belongs to the allowed domain
 * @param {string} email - Email to validate
 * @param {string} allowedDomain - Domain to check against (e.g., "@northhighland.com")
 * @returns {{valid: boolean, normalizedEmail?: string, error?: string}}
 */
export function validateEmail(email, allowedDomain = "@northhighland.com") {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: "Email is required" };
  }
  
  const emailLower = email.toLowerCase().trim();
  
  if (!emailLower.endsWith(allowedDomain)) {
    return { valid: false, error: `Only ${allowedDomain} emails are accepted.` };
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return { valid: false, error: "Invalid email format" };
  }
  
  return { valid: true, normalizedEmail: emailLower };
}
