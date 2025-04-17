import { supabase } from './supabase';

export async function uploadCourseVideo(file: File, lessonId: string) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${lessonId}-${Math.random()}.${fileExt}`;
    const filePath = `${lessonId}/${fileName}`;

    // Upload to storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course_videos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get video URL
    const { data: { publicUrl } } = supabase.storage
      .from('course_videos')
      .getPublicUrl(filePath);

    // Update lesson with video URL and metadata
    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        video_url: publicUrl,
        video_metadata: {
          duration: 0, // This should be extracted from the video file
          resolution: '720p',
          format: fileExt,
          storage_path: filePath
        }
      })
      .eq('id', lessonId);

    if (updateError) throw updateError;

    return publicUrl;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

export async function updateLessonContent(lessonId: string, content: any) {
  try {
    const { error } = await supabase
      .from('lessons')
      .update({ content })
      .eq('id', lessonId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating lesson content:', error);
    throw error;
  }
}

export async function deleteLessonContent(lessonId: string) {
  try {
    // First delete any associated video
    const { data: lesson } = await supabase
      .from('lessons')
      .select('video_metadata')
      .eq('id', lessonId)
      .single();

    if (lesson?.video_metadata?.storage_path) {
      await supabase.storage
        .from('course_videos')
        .remove([lesson.video_metadata.storage_path]);
    }

    // Then delete the lesson
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting lesson content:', error);
    throw error;
  }
}

export async function getContentVersions(lessonId: string) {
  try {
    const { data, error } = await supabase
      .from('content_versions')
      .select(`
        id,
        content,
        created_at,
        created_by,
        version_number,
        profiles (
          full_name
        )
      `)
      .eq('lesson_id', lessonId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching content versions:', error);
    throw error;
  }
}

export async function restoreContentVersion(lessonId: string, versionId: string) {
  try {
    // Get the content from the version
    const { data: version } = await supabase
      .from('content_versions')
      .select('content')
      .eq('id', versionId)
      .single();

    if (!version) throw new Error('Version not found');

    // Update the lesson with the version's content
    const { error } = await supabase
      .from('lessons')
      .update({ content: version.content })
      .eq('id', lessonId);

    if (error) throw error;
  } catch (error) {
    console.error('Error restoring content version:', error);
    throw error;
  }
}