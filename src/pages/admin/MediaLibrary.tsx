import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Upload, Trash2, Image as ImageIcon, Video, FileText, X } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'thumbnail';
  name: string;
  created_at: string;
  bucket: string;
  path: string;
}

interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [uploadState, setUploadState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null
  });

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      // Get list of files from each bucket
      const buckets = ['course_images', 'course_videos', 'course_files', 'course_thumbnails'];
      const mediaItems: MediaItem[] = [];

      for (const bucket of buckets) {
        // List all files in the bucket (including nested folders)
        const { data: files, error } = await supabase.storage.from(bucket).list();

        if (error) throw error;

        if (files) {
          // Process files and folders
          for (const item of files) {
            if (!item.id) continue; // Skip folders
            
            // Determine file type based on bucket and extension
            let type: 'image' | 'video' | 'document' | 'thumbnail';
            if (bucket === 'course_images' || bucket === 'course_thumbnails') {
              type = bucket === 'course_thumbnails' ? 'thumbnail' : 'image';
            } else if (bucket === 'course_videos') {
              type = 'video';
            } else {
              type = 'document';
            }
            
            mediaItems.push({
              id: item.id || crypto.randomUUID(),
              name: item.name,
              url: supabase.storage.from(bucket).getPublicUrl(item.name).data.publicUrl,
              type,
              created_at: item.created_at || new Date().toISOString(),
              bucket,
              path: item.name
            });
          }
        }
      }

      setMedia(mediaItems);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadState({
      isUploading: true,
      progress: 0,
      error: null
    });

    try {
      // Determine bucket based on file type
      let bucket;
      if (file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024) {
        bucket = 'course_images';
      } else if (file.type.startsWith('video/')) {
        bucket = 'course_videos';
      } else if (file.type.startsWith('application/') || file.type.startsWith('text/')) {
        bucket = 'course_files';
      } else bucket = 'course_images'; // Default to images

      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt || 'file'}`;
      const filePath = `${fileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadState(prev => ({ ...prev, progress: percent }));
          }
        });

      if (uploadError) throw uploadError;

      // Refresh media list after successful upload
      await fetchMedia();

      setUploadState({
        isUploading: false,
        progress: 0,
        error: null
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? 
          error.message.includes('already exists') ? 'A file with this name already exists' : error.message : 
          'Failed to upload file. Please try again.'
      }));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'image':
      case 'thumbnail':
        return <ImageIcon className="h-8 w-8 text-blue-400" />;
      case 'video':
        return <Video className="h-8 w-8 text-green-400" />;
      case 'document':
        return <FileText className="h-8 w-8 text-yellow-400" />;
      default:
        return <FileText className="h-8 w-8 text-gray-400" />;
    }
  };

  const filteredMedia = filter === 'all' 
    ? media 
    : media.filter(item => item.type === filter);

  const handleDeleteMedia = async (item: MediaItem) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    
    try {
      const { error } = await supabase.storage
        .from(item.bucket)
        .remove([item.path]);
        
      if (error) throw error;
      
      // Remove from local state
      setMedia(media.filter(m => m.id !== item.id));
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold gradient-text">Media Library</h1>
        <Button
          onClick={() => {
            const input = document.getElementById('file-upload') as HTMLInputElement;
            if (input) {
              input.value = ''; // Clear previous selection
              input.click();
            }
          }}
          disabled={uploadState.isUploading}
        >
          <Upload className="h-5 w-5 mr-2" />
          Upload Media
        </Button>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.pdf,.zip,.txt,.md"
        />
      </div>

      {/* Upload Progress */}
      {uploadState.isUploading && (
        <div className="glass-effect rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-300">Uploading...</span>
            <span className="text-sm text-gray-300">{Math.round(uploadState.progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[#ff6600] to-[#ff944d] h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadState.error && (
        <div className="glass-effect rounded-lg p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between">
          <span>{uploadState.error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUploadState(prev => ({ ...prev, error: null }))}
            className="flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <Button 
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button 
          variant={filter === 'image' ? 'primary' : 'outline'}
          onClick={() => setFilter('image')}
        >
            <ImageIcon className="h-4 w-4" />
            <span>Images</span>
        </Button>
        <Button 
          variant={filter === 'video' ? 'primary' : 'outline'}
          onClick={() => setFilter('video')}
        >
            <Video className="h-4 w-4" />
            <span>Videos</span>
        </Button>
        <Button 
          variant={filter === 'document' ? 'primary' : 'outline'}
          onClick={() => setFilter('document')}
        >
            <FileText className="h-4 w-4" />
            <span>Documents</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMedia.map((item) => (
          <div key={item.id} className="glass-effect rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              {getIcon(item.type)}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDeleteMedia(item)}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
            {(item.type === 'image' || item.type === 'thumbnail') && (
              <img 
                src={item.url} 
                alt={item.name}
                className="w-full h-40 object-cover rounded-md mb-2" 
              />
            )}
            {item.type === 'video' && (
              <video
                src={item.url}
                className="w-full h-40 object-cover rounded-md mb-2"
                controls
              />
            )}
            <div>
              <h3 className="text-lg font-medium text-gray-200 truncate">{item.name}</h3>
              <p className="text-sm text-gray-400">
                {item.bucket.replace('course_', '')} • {new Date(item.created_at).toLocaleDateString()}
              </p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                View File
              </a>
            </div>
          </div>
        ))}
        {filteredMedia.length === 0 && !loading && (
          <div className="col-span-3 text-center py-12 glass-effect rounded-lg">
            <p className="text-gray-400">No {filter === 'all' ? 'media files' : filter + 's'} found</p>
          </div>
        )}
      </div>
    </div>
  );
}