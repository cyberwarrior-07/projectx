import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { X, Upload, Link, Clock, FileText } from 'lucide-react';
import ReactQuill from 'react-quill';
import { supabase } from '../lib/supabase';
import { convertGoogleDriveLink, isValidVideoUrl, isYoutubeUrl, extractYoutubeVideoId } from '../lib/videoUtils';
import 'react-quill/dist/quill.snow.css';

interface LessonOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  type: 'video' | 'text' | 'code' | 'quiz';
  title?: string;
  courseId?: string;
}

export function LessonOverlay({
  isOpen,
  onClose,
  onSave,
  initialData,
  type,
  courseId,
  title = 'Add New Lesson'
}: LessonOverlayProps) {
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    videoUrl: '',
    videoFile: null as File | null,
    uploadError: null as string | null,
    uploadProgress: 0,
    isUploading: false,
    uploadComplete: false,
    featuredImage: null as File | null,
    featuredImageUrl: '',
    duration: {
      hours: 0,
      minutes: 0,
      seconds: 0
    },
    exerciseFiles: [] as File[],
    exerciseFileUrls: [] as string[],
    quizQuestions: [{
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    }] as any[],
    codeTemplate: '',
    codeLanguage: 'javascript'
  });

  useEffect(() => {
    if (initialData) {
      try {
        const totalMinutes = initialData.duration || 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        let questions = [];
        if (type === 'quiz') {
          // Extract questions from the content object
          questions = initialData.content?.questions || [];
          
          // Ensure we have valid questions or provide default
          if (questions.length === 0) {
            questions = [{
              question: '',
              options: ['', '', '', ''],
              correctAnswer: 0
            }];
          }
        }

        setFormData({
          name: initialData.title || '',
          content: initialData.content?.text || initialData.description || '',
          videoUrl: initialData.video_url || '',
          videoFile: null,
          featuredImage: null,
          featuredImageUrl: initialData.thumbnail_url || '',
          duration: {
            hours,
            minutes,
            seconds: 0
          },
          exerciseFiles: [],
          exerciseFileUrls: initialData.exercise_files || [],
          quizQuestions: questions,
          codeTemplate: initialData.content?.code_template || '',
          codeLanguage: initialData.content?.language || 'javascript',
          uploadError: null,
          uploadProgress: 0,
          isUploading: false,
          uploadComplete: false
        });
      } catch (error) {
        console.error('Error loading initial data:', error);
        // Set default form data on error
        setFormData({
          name: '',
          content: '',
          videoUrl: '',
          videoFile: null,
          featuredImage: null,
          featuredImageUrl: '',
          duration: { hours: 0, minutes: 0, seconds: 0 },
          exerciseFiles: [],
          exerciseFileUrls: [],
          quizQuestions: type === 'quiz' ? [{
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0
          }] : [],
          codeTemplate: '',
          codeLanguage: 'javascript',
          uploadError: null,
          uploadProgress: 0,
          isUploading: false,
          uploadComplete: false
        });
      }
    } else {
      // Reset form data when creating a new lesson
      setFormData({
        name: '',
        content: '',
        videoUrl: '',
        videoFile: null,
        featuredImage: null,
        featuredImageUrl: '',
        duration: {
          hours: 0,
          minutes: 0,
          seconds: 0
        },
        exerciseFiles: [],
        exerciseFileUrls: [],
        quizQuestions: type === 'quiz' ? [{
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        }] : [],
        codeTemplate: '',
        codeLanguage: 'javascript',
        uploadError: null,
        uploadProgress: 0,
        isUploading: false,
        uploadComplete: false
      });
    }
  }, [initialData, type]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Prepare content based on type
    const content = getContentByType();
    let videoUrl = formData.videoUrl || '';
    let thumbnailUrl = formData.featuredImageUrl || '';

    // Handle video upload if there's a file
    if (formData.videoFile) {
      try {
        setFormData(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

        const fileExt = formData.videoFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt || 'mp4'}`;
        const filePath = `${fileName}`;

        // First check file size
        if (formData.videoFile.size > 5 * 1024 * 1024 * 1024) { // 5GB
          throw new Error('Video file must be less than 5GB');
        }

        // Check file type
        const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/mov'];
        if (!allowedTypes.includes(formData.videoFile.type)) {
          throw new Error('Please upload a valid video file (MP4, WebM, MOV)');
        }

        const { error: uploadError } = await supabase.storage
          .from('course_videos')
          .upload(filePath, formData.videoFile, {
            cacheControl: '31536000', // 1 year
            upsert: true,
            onUploadProgress: (progress) => {
              const percentage = (progress.loaded / progress.total) * 100;
              setFormData(prev => ({ ...prev, uploadProgress: percentage }));
            }
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course_videos')
          .getPublicUrl(filePath);

        videoUrl = publicUrl;
        setFormData(prev => ({
          ...prev, 
          isUploading: false, 
          uploadProgress: 100,
          uploadComplete: true,
          videoUrl: publicUrl,
          uploadError: null
        }));
      } catch (error) {
        console.error('Error uploading video:', error);
        setFormData(prev => ({ 
          ...prev, 
          isUploading: false, 
          uploadProgress: 0,
          uploadError: error instanceof Error ? error.message : 'Failed to upload video',
          uploadComplete: false
        }));
        return;
      }
    }

    // Handle image upload if there's a file
    if (formData.featuredImage) {
      try {
        const fileExt = formData.featuredImage.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt || 'jpg'}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course_images')
          .upload(filePath, formData.featuredImage, {
            cacheControl: '31536000', // 1 year
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course_images')
          .getPublicUrl(filePath);

        thumbnailUrl = publicUrl;
      } catch (error) {
        console.error('Error uploading image:', error);
        setFormData(prev => ({
          ...prev,
          uploadError: error instanceof Error ? error.message : 'Failed to upload image'
        }));
        return;
      }
    }

    // Handle exercise file uploads
    const exerciseUrls = [];
    for (const file of formData.exerciseFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt || 'file'}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course_files')
          .upload(filePath, file, {
            cacheControl: '31536000', // 1 year
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course_files')
          .getPublicUrl(filePath);

        exerciseUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading exercise file:', error);
      }
    }

    await onSave({
      title: formData.name,
      description: formData.content,
      content,
      type,
      videoUrl,
      duration: formData.duration.hours * 60 + formData.duration.minutes,
      exercise_files: [...formData.exerciseFileUrls, ...exerciseUrls],
      thumbnail_url: thumbnailUrl,
    });
    onClose();
  };

  const getContentByType = () => {
    switch (type) {
      case 'video':
        return {
          type: 'video',
          video_url: formData.videoUrl,
          duration: formData.duration.hours * 60 + formData.duration.minutes
        };
      case 'text':
        return {
          type: 'text',
          text: formData.content
        };
      case 'code':
        return {
          type: 'code',
          language: formData.codeLanguage,
          code_template: formData.codeTemplate,
          instructions: formData.content
        };
      case 'quiz':
        // Filter out empty questions and ensure proper structure
        const validQuestions = formData.quizQuestions
          .filter(q => q.question.trim() !== '')
          .map(q => ({
            question: q.question.trim(),
            options: q.options.map(opt => opt.trim()),
            correctAnswer: q.correctAnswer
          }));
        
        return {
          type: 'quiz',
          questions: validQuestions.length > 0 ? validQuestions : [{
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0
          }]
        };
      default:
        return {};
    }
  };

  const handleFileUpload = async (file: File, type: 'thumbnail' | 'video') => {
    try {
      const fileExt = file.name.split('.').pop();
      // Create a unique file name
      const fileName = `${crypto.randomUUID()}.${fileExt || (type === 'video' ? 'mp4' : 'jpg')}`;
      const filePath = `${fileName}`;
      
      // First check file size
      if (type === 'video' && file.size > 5 * 1024 * 1024 * 1024) { // 5GB
        throw new Error('Video file must be less than 5GB');
      }
      
      // Check file type
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/mov'];
      if (type === 'video' && !validVideoTypes.includes(file.type) && !file.type.startsWith('video/')) {
        throw new Error('Please upload a valid video file');
      }
      
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (type === 'thumbnail' && !validImageTypes.includes(file.type) && !file.type.startsWith('image/')) {
        throw new Error('Please upload a valid image file');
      }

      // Determine the correct bucket based on file type
      const bucket = type === 'thumbnail' ? 'course_thumbnails' : 'course_videos';
      
      console.log(`Uploading ${type} to ${bucket}/${filePath}`, file.type, file.size);
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '31536000', // 1 year
          upsert: true,
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            setFormData(prev => ({
              ...prev,
              uploadProgress: percentage,
              isUploading: true
            }));
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

      setFormData(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 0,
        uploadComplete: true,
        [type === 'video' ? 'videoUrl' : 'thumbnailUrl']: publicUrl
      }));

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      setFormData(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 0,
        uploadError: error instanceof Error ? error.message : `Failed to upload ${type}`
      }));
      throw error;
    }
  };

  const handleVideoUpload = (file: File) => {
    // Validate file size and type
    if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
      setFormData(prev => ({ ...prev, uploadError: 'Video file must be less than 2GB' }));
      return;
    }

    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/mov'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('video/')) {
      setFormData(prev => ({ ...prev, uploadError: 'Please upload a valid video file (MP4, WebM, MOV)' }));
      return;
    }

    // Set upload state
    setFormData(prev => ({ 
      ...prev, 
      videoFile: file,
      isUploading: true,
      uploadProgress: 0,
      uploadError: null
    }));
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt || 'mp4'}`;
    const filePath = `${fileName}`;
    
    console.log(`Starting video upload: ${filePath}`, file.type, file.size);
    
    // Start the upload
    supabase.storage
      .from('course_videos')
      .upload(filePath, file, {
        cacheControl: '31536000', // 1 year
        upsert: true,
        onUploadProgress: (progress) => {
          const percentage = (progress.loaded / progress.total) * 100;
          console.log(`Upload progress: ${percentage.toFixed(2)}%`);
          setFormData(prev => ({ ...prev, uploadProgress: percentage }));
        }
      })
      .then(({ data, error }) => {
        if (error) {
          console.error('Upload error:', error);
          setFormData(prev => ({
            ...prev,
            isUploading: false,
            uploadError: error.message
          }));
          return;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('course_videos')
          .getPublicUrl(filePath);
        
        console.log('Video uploaded successfully:', publicUrl);
        setFormData(prev => ({
          ...prev,
          videoUrl: publicUrl,
          isUploading: false,
          uploadComplete: true,
          uploadProgress: 100,
          uploadError: null
        }));
      })
      .catch((err) => {
        console.error('Error in video upload:', err);
        setFormData(prev => ({
          ...prev,
          isUploading: false,
          uploadError: err instanceof Error ? err.message : 'Failed to upload video'
        }));
      });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">{title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  placeholder="Enter lesson name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content
                </label>
                <ReactQuill
                  value={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  className="bg-gray-800 text-white rounded-md"
                  theme="snow"
                />
              </div>

              {type === 'code' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Code Template
                  </label>
                  <select
                    value={formData.codeLanguage}
                    onChange={(e) => setFormData({ ...formData, codeLanguage: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white mb-2"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                  <textarea
                    value={formData.codeTemplate}
                    onChange={(e) => setFormData({ ...formData, codeTemplate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white font-mono"
                    rows={10}
                    placeholder="Enter starter code template..."
                  />
                </div>
              )}

              {type === 'quiz' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-300">
                      Quiz Questions
                    </label>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          quizQuestions: [
                            ...formData.quizQuestions,
                            {
                              question: '',
                              options: ['', '', '', ''],
                              correctAnswer: 0
                            }
                          ]
                        });
                      }}
                    >
                      Add Question
                    </Button>
                  </div>

                  {formData.quizQuestions.map((question, qIndex) => (
                    <div key={qIndex} className="glass-effect rounded-lg p-4 space-y-4">
                      <div className="flex justify-between">
                        <input
                          type="text"
                          value={question.question}
                          onChange={(e) => {
                            const newQuestions = [...formData.quizQuestions];
                            newQuestions[qIndex].question = e.target.value;
                            setFormData({ ...formData, quizQuestions: newQuestions });
                          }}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                          placeholder="Enter question..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newQuestions = formData.quizQuestions.filter((_, i) => i !== qIndex);
                            setFormData({ ...formData, quizQuestions: newQuestions });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newQuestions = [...formData.quizQuestions];
                              newQuestions[qIndex].options[oIndex] = e.target.value;
                              setFormData({ ...formData, quizQuestions: newQuestions });
                            }}
                            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                            placeholder={`Option ${oIndex + 1}`}
                          />
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={question.correctAnswer === oIndex}
                            onChange={() => {
                              const newQuestions = [...formData.quizQuestions];
                              newQuestions[qIndex].correctAnswer = oIndex;
                              setFormData({ ...formData, quizQuestions: newQuestions });
                            }}
                            className="h-4 w-4 text-[#ff6600] bg-gray-800 border-gray-700"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Featured Image
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
                  {formData.featuredImageUrl ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-40 bg-gray-800 rounded-lg overflow-hidden">
                        <img 
                          src={formData.featuredImageUrl} 
                          alt="Featured" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          featuredImage: null,
                          featuredImageUrl: ''
                        }))}
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="px-4 py-2"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Image
                    </Button>
                  )}
                  <input
                    id="featured-image-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ 
                          ...prev, 
                          featuredImage: file,
                          isUploading: true,
                          uploadProgress: 0,
                          uploadError: null
                        }));
                        
                        // Upload the image
                        handleFileUpload(file, 'thumbnail')
                          .then(url => {
                            console.log('Image uploaded successfully:', url);
                            setFormData(prev => ({
                              ...prev,
                              featuredImageUrl: url,
                              isUploading: false,
                              uploadComplete: true
                            }));
                          })
                          .catch(err => {
                            console.error('Error uploading thumbnail:', err);
                            setFormData(prev => ({
                              ...prev,
                              isUploading: false,
                              uploadError: err instanceof Error ? err.message : 'Failed to upload image'
                            }));
                          });
                      }
                    }}
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    JPEG, PNG, GIF, and WebP formats, up to 10 MB
                  </p>
                  {formData.isUploading && type !== 'video' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-[#ff6600] h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${formData.uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Uploading... {Math.round(formData.uploadProgress)}%
                      </p>
                    </div>
                  )}
                  {formData.uploadError && type !== 'video' && (
                    <p className="mt-2 text-sm text-red-400">
                      {formData.uploadError}
                    </p>
                  )}
                </div>
              </div>

              {type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Video {formData.isUploading && (
                      <span className="text-[#ff6600] animate-pulse">
                        Uploading: {Math.round(formData.uploadProgress)}%
                      </span>
                    )}
                  </label>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Video URL (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={formData.videoUrl}
                        onChange={(e) => {
                          const url = e.target.value;
                          // Check if it's a Google Drive sharing link
                          const isYoutube = isYoutubeUrl(url);
                          const isGoogleDrive = url.includes('drive.google.com/file/d/');
                          
                          setFormData(prev => ({
                            ...prev,
                            videoUrl: url,
                            videoFile: null,
                            uploadComplete: false,
                            uploadError: isGoogleDrive ? 
                              'Google Drive links may not work reliably. YouTube links are recommended instead.' : 
                              isYoutube ? 
                              'YouTube link detected. This is the recommended way to add videos.' : 
                              null
                          }));
                        }}
                        placeholder="Enter YouTube URL (recommended)"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Paste a YouTube link for best compatibility
                    </p>
                    {formData.videoUrl?.includes('drive.google.com') && (
                      <p className="text-xs text-amber-400 mt-1">
                        Google Drive links may not work reliably. YouTube links are recommended instead.
                      </p>
                    )}
                    {formData.videoUrl && isYoutubeUrl(formData.videoUrl || '') && (
                      <p className="text-xs text-green-400 mt-1">
                        YouTube link detected. This is the recommended way to add videos.
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"/>
                    <div className="text-center py-4 text-sm text-gray-400">OR</div>
                    <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"/>
                  </div>
                  <div 
                    className={`border-2 border-dashed ${formData.isUploading ? 'border-[#ff6600]' : 'border-gray-700'} rounded-lg p-4 text-center transition-all duration-300 ${!formData.isUploading && !formData.videoFile ? 'hover:border-gray-500 hover:bg-gray-800/30' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.add('border-[#ff6600]', 'bg-[#ff6600]/5');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!formData.isUploading) {
                        e.currentTarget.classList.remove('border-[#ff6600]', 'bg-[#ff6600]/5');
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (formData.isUploading) return;
                      
                      e.currentTarget.classList.remove('border-[#ff6600]', 'bg-[#ff6600]/5');
                      
                      const files = Array.from(e.dataTransfer.files);
                      const videoFile = files.find(file => file.type.startsWith('video/'));
                      
                      if (videoFile) {
                        handleVideoUpload(videoFile);
                      }
                    }}
                  >
                    {formData.videoFile ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center space-x-2 text-gray-300">
                          <FileText className="h-5 w-5" />
                          <span>{formData.videoFile.name}</span>
                        </div>
                        {formData.isUploading ? (
                          <div>
                            <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                              <div 
                                className="bg-[#ff6600] h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${formData.uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Uploading... {Math.round(formData.uploadProgress)}%
                            </p>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              videoFile: null,
                              videoUrl: '',
                              uploadComplete: false
                            }))}
                          >
                            Remove Video
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="px-4 py-2"
                          onClick={() => document.getElementById('video-upload')?.click()}
                        >
                          <Upload className="h-5 w-5 mr-2" />
                          Upload Video
                        </Button>
                        <input
                          id="video-upload"
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleVideoUpload(file);
                            }
                          }}
                        />
                        <p className="text-sm text-gray-400 mt-2">
                          MP4, WebM, or MOV format, up to 2GB
                        </p>
                        {formData.uploadError && (
                          <p className="mt-2 text-sm text-red-400">
                            {formData.uploadError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration
                  </label>
                  <div className="flex items-center space-x-2">
                    <div>
                      <input
                        type="number"
                        min="0"
                        value={formData.duration.hours}
                        onChange={(e) => setFormData({
                          ...formData,
                          duration: {
                            ...formData.duration,
                            hours: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                      />
                      <span className="text-sm text-gray-400 ml-1">h</span>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={formData.duration.minutes}
                        onChange={(e) => setFormData({
                          ...formData,
                          duration: {
                            ...formData.duration,
                            minutes: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                      />
                      <span className="text-sm text-gray-400 ml-1">m</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exercise Files
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
                  <Button
                    variant="outline"
                    className="px-4 py-2"
                    onClick={() => document.getElementById('exercise-files-upload')?.click()}
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Files
                  </Button>
                  <input
                    id="exercise-files-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setFormData(prev => ({
                        ...prev,
                        exerciseFiles: [...prev.exerciseFiles, ...files]
                      }));
                    }}
                  />
                  <div className="mt-4 space-y-2">
                    {formData.exerciseFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-800 rounded-md p-2">
                        <span className="text-sm text-gray-300">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newFiles = formData.exerciseFiles.filter((_, i) => i !== index);
                            setFormData(prev => ({
                              ...prev,
                              exerciseFiles: newFiles
                            }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {formData.exerciseFileUrls.map((url, index) => (
                      <div key={`url-${index}`} className="flex items-center justify-between bg-gray-800 rounded-md p-2">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          {url.split('/').pop()}
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newUrls = formData.exerciseFileUrls.filter((_, i) => i !== index);
                            setFormData(prev => ({
                              ...prev,
                              exerciseFileUrls: newUrls
                            }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={formData.isUploading}>
              {formData.isUploading ? 'Uploading...' : 'Save Lesson'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}