import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Eye, Upload, Image as ImageIcon, Plus } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DragDropLessonBuilder from '../../components/DragDropLessonBuilder';

type CourseSection = 'basics' | 'curriculum' | 'additional';

interface ContentBlock {
  id: string;
  type: 'video' | 'text' | 'code' | 'quiz';
  content: any;
  title?: string;
  description?: string;
  video_url?: string;
  video_metadata?: {
    duration: number;
    resolution: string;
    format: string;
    size: number;
    storage_path: string;
  };
  order_position?: number;
}

export function CourseBuilder() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [currentSection, setCurrentSection] = useState<CourseSection>('basics');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [existingLessons, setExistingLessons] = useState<ContentBlock[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl] = useState('https://example.com/course/');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseUrl: '',
    difficulty: 'beginner',
    visibility: 'public',
    thumbnail: null as File | null,
    thumbnailUrl: '',
    introVideo: null as File | null,
    introVideoUrl: '',
    price: 0,
    isScheduled: false,
    scheduledDate: '',
    isFeatured: false,
    category: 'Programming'
  });

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
      fetchExistingLessons();
    } else {
      setLoading(false);
      setIsLoadingLessons(false);
    }
  }, [courseId]); 

  async function fetchExistingLessons() {
    if (!courseId) return;

    try {
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          description,
          video_url,
          content,
          order_position,
          is_locked
        `)
        .eq('course_id', courseId)
        .order('order_position');

      if (lessonsError) throw lessonsError;

      if (lessons) {
        const formattedLessons = lessons.map(lesson => ({
          id: lesson.id,
          type: lesson.content?.type || 'text',
          content: lesson.content,
          title: lesson.title,
          description: lesson.content?.instructions || lesson.description,
          video_url: lesson.video_url,
          order_position: lesson.order_position,
          is_locked: lesson.is_locked
        }));

        setExistingLessons(formattedLessons);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setError('Failed to fetch existing lessons');
    } finally {
      setIsLoadingLessons(false);
    }
  }

  useEffect(() => {
    // Reset error when blocks or form data changes
    setError(null);
  }, [blocks, formData]);

  // Auto-generate course URL from title
  useEffect(() => {
    if (formData.title) {
      const urlSafeTitle = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
      setFormData(prev => ({
        ...prev,
        courseUrl: `${baseUrl}${urlSafeTitle}`
      }));
    }
  }, [formData.title, baseUrl]);

  async function fetchCourseData() {
    try {
      // Fetch course details
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      if (course) {
        // Update form data with course details
        setFormData({
          title: course.title || '',
          description: course.description || '',
          courseUrl: course.course_url || '',
          difficulty: course.difficulty || 'beginner',
          visibility: course.visibility || 'public',
          thumbnail: null,
          thumbnailUrl: course.thumbnail_url || '',
          introVideo: null,
          introVideoUrl: course.video_url || '',
          price: course.price || 0,
          isScheduled: Boolean(course.scheduled_date),
          scheduledDate: course.scheduled_date || '',
          isFeatured: course.is_featured || false,
          category: course.category || 'Programming'
        });
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      alert('Failed to fetch course data');
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (file: File, type: 'thumbnail' | 'video') => {
    try {
      const fileExt = file.name.split('.').pop();
      // Create a unique file name
      const fileName = `${crypto.randomUUID()}.${fileExt || (type === 'video' ? 'mp4' : 'jpg')}`;
      const filePath = `${fileName}`;
      const bucket = type === 'thumbnail' ? 'course_thumbnails' : 'course_videos';
      
      console.log(`Uploading ${type} to ${bucket}/${filePath}`, file.type, file.size);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '31536000', // 1 year
          upsert: true,
          onUploadProgress: (progress) => {
            console.log(`Upload progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
          }
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath, {
          download: false,
          transform: {
            quality: type === 'thumbnail' ? 80 : undefined
          }
        });

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      let thumbnailUrl = formData.thumbnailUrl;
      let videoUrl = formData.introVideoUrl;

      if (formData.thumbnail) {
        thumbnailUrl = await handleFileUpload(formData.thumbnail, 'thumbnail');
      }

      if (formData.introVideo) {
        try {
          videoUrl = await handleFileUpload(formData.introVideo, 'video');
        } catch (error) {
          console.error('Error uploading video:', error);
          setError(error instanceof Error ? error.message : 'Failed to upload video');
          setIsSubmitting(false);
          return;
        }
      }

      const courseData = {
        title: formData.title,
        description: formData.description,
        course_url: formData.courseUrl,
        difficulty: formData.difficulty,
        visibility: formData.visibility,
        thumbnail_url: thumbnailUrl,
        video_url: videoUrl,
        price: formData.price,
        scheduled_date: formData.isScheduled ? formData.scheduledDate : null,
        is_featured: formData.isFeatured,
        category: formData.category,
        updated_at: new Date().toISOString()
      };

      let result;
      if (courseId) {
        result = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', courseId);
      } else {
        result = await supabase
          .from('courses')
          .insert([{
            ...courseData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select();
      }

      if (result.error) throw result.error;

      // Save all lesson blocks
      if (blocks.length > 0) {
        const lessonPromises = blocks.map((block, index) => {
          const lessonData = {
            course_id: courseId || result.data[0].id,
            title: block.title || `Untitled ${block.type} lesson`,
            description: block.description,
            video_url: block.video_url,
            video_metadata: block.video_metadata,
            order_position: existingLessons.length + index + 1,
            content: {
              type: block.type,
              ...block.content
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          return supabase
            .from('lessons')
            .insert([lessonData])
            .select();
        });

        const results = await Promise.all(lessonPromises);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
          throw new Error('Failed to save some lessons');
        }
      }

      navigate('/admin/courses');
    } catch (error) {
      console.error('Error saving course:', error);
      setError(error instanceof Error ? error.message : 'Failed to save course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      content: {},
      order_position: blocks.length + existingLessons.length + 1
    };
    setBlocks([...blocks, newBlock]);
  };

  if (loading || isLoadingLessons) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/courses')}
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Back to Courses
          </Button>
          <h1 className="text-2xl font-bold gradient-text">
            {courseId ? 'Edit Course' : 'Create New Course'}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          {courseId && (
            <Button variant="outline" onClick={() => window.open(`/preview/${courseId}`, '_blank')}>
              <Eye className="h-5 w-5 mr-2" />
              Preview
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            {courseId ? 'Update Course' : 'Create Course'}
          </Button>
        </div>
      </div>

      <div className="glass-effect rounded-lg p-6">
        <div className="flex border-b border-gray-800 mb-6">
          <button
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
              currentSection === 'basics'
                ? 'border-[#ff6600] text-[#ff6600]'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setCurrentSection('basics')}
          >
            1. Basics
          </button>
          {error && (
            <div className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg mt-4">
              {error}
            </div>
          )}
          <button
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
              currentSection === 'curriculum'
                ? 'border-[#ff6600] text-[#ff6600]'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setCurrentSection('curriculum')}
          >
            2. Curriculum
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
              currentSection === 'additional'
                ? 'border-[#ff6600] text-[#ff6600]'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setCurrentSection('additional')}
          >
            3. Additional
          </button>
        </div>

        {currentSection === 'basics' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Course Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                placeholder="Enter course title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Course URL
              </label>
              <p className="text-sm text-gray-400 mb-2">Auto-generated from course title</p>
              <input
                type="text"
                value={formData.courseUrl}
                readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-400"
                placeholder="https://example.com/course"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Description
              </label>
              <ReactQuill
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                className="bg-gray-800 text-white rounded-md"
                theme="snow"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  <option value="Programming">Programming</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile Development">Mobile Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Machine Learning">Machine Learning</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Visibility
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Price
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  min="0"
                  step="0.01"
                />
              </div>
            
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Featured Image
              </label>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    document.getElementById('thumbnail-upload')?.click();
                  }}
                  disabled={isSubmitting}
                >
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Upload Image
                </Button>
                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check file size
                      if (file.size > 10 * 1024 * 1024) {
                        alert('Image must be less than 10MB');
                        return;
                      }
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        thumbnail: file,
                        thumbnailUrl: URL.createObjectURL(file) // Show preview immediately
                      }));
                    }
                  }}
                />
                {formData.thumbnailUrl && (
                  <div className="h-10 w-10 rounded overflow-hidden">
                    <img 
                      src={formData.thumbnailUrl} 
                      alt="Thumbnail" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Intro Video
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Video URL (YouTube recommended)
                  </label>
                  <input
                    type="url"
                    value={formData.introVideoUrl}
                    onChange={(e) => setFormData({ ...formData, introVideoUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                    placeholder="Enter YouTube URL (recommended)"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Paste a YouTube link for best compatibility
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-2">OR</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    document.getElementById('video-upload')?.click();
                  }}
                  disabled={isSubmitting}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Video
                </Button>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/mov"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check file size
                      if (file.size > 5 * 1024 * 1024 * 1024) {
                        alert('Video must be less than 5GB');
                        return;
                      }
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        introVideo: file,
                        isSubmitting: true
                      }));
                      
                      // Upload immediately
                      handleFileUpload(file, 'video')
                        .then(url => {
                          console.log('Video uploaded successfully:', url);
                          setFormData(prev => ({
                            ...prev,
                            introVideoUrl: url,
                            isSubmitting: false
                          }));
                        })
                        .catch(err => {
                          console.error('Error uploading video:', err);
                          setFormData(prev => ({
                            ...prev,
                            isSubmitting: false
                          }));
                          alert('Failed to upload video: ' + (err instanceof Error ? err.message : 'Unknown error'));
                        });
                    }
                  }}
                />
              </div>
              {formData.introVideoUrl && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">
                    <span className="font-medium">Video URL:</span> {formData.introVideoUrl}
                  </p>
                  {isYoutubeUrl(formData.introVideoUrl) && (
                    <p className="text-xs text-green-400">
                      ✓ YouTube link detected. This is the recommended way to add videos.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={formData.isScheduled}
                  onChange={(e) => setFormData({ ...formData, isScheduled: e.target.checked })}
                  className="h-4 w-4 text-[#ff6600] bg-gray-800 border-gray-700 rounded"
                />
                <label className="ml-2 text-sm font-medium text-gray-200">
                  Schedule Course
                </label>
              </div>
              {formData.isScheduled && (
                <input
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                />
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="h-4 w-4 text-[#ff6600] bg-gray-800 border-gray-700 rounded"
              />
              <label className="ml-2 text-sm font-medium text-gray-200">
                Feature this course
              </label>
            </div>
          </div>
        )}

        {currentSection === 'curriculum' && (
          <div>
            <DragDropLessonBuilder
              blocks={blocks}
              onBlocksChange={setBlocks}
              onAddBlock={handleAddBlock}
              courseId={courseId}
              existingLessons={existingLessons}
              setExistingLessons={setExistingLessons}
            />
          </div>
        )}

        {currentSection === 'additional' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Additional Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Course Prerequisites
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  rows={4}
                  placeholder="Enter course prerequisites..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Target Audience
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  rows={4}
                  placeholder="Describe the target audience..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Learning Outcomes
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  rows={4}
                  placeholder="List the learning outcomes..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}