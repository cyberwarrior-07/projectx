import { supabase } from './supabase';

export const isYoutubeUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export const isSupabaseStorageUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('storage.supabase');
};

export const getSignedStorageUrl = async (url: string): Promise<string> => {
  try {
    // Extract bucket and file path from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucket = pathParts[3];
    const filePath = pathParts.slice(4).join('/');

    // Get signed URL that's valid for 1 hour
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error processing storage URL:', err);
    return url; // Fallback to original URL
  }
};