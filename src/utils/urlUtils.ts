/**
 * Utility functions for handling URLs and object cleanup
 */

/**
 * Safely revokes an object URL if it exists
 * @param url The URL to revoke
 * @returns true if URL was revoked, false if URL was invalid or null
 */
export const safeRevokeObjectURL = (url: string | null | undefined): boolean => {
  if (!url || !url.startsWith('blob:')) {
    return false;
  }
  
  try {
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error revoking object URL:', error);
    return false;
  }
};

/**
 * Safely revokes an object URL from a result object
 * @param result Object containing a url property to revoke
 * @returns true if URL was revoked, false if URL was invalid or null
 */
export const safeRevokeResultURL = (result: { url?: string } | null | undefined): boolean => {
  if (!result || !result.url) {
    return false;
  }
  
  return safeRevokeObjectURL(result.url);
};
