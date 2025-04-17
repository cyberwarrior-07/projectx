import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DroppableProps } from '@hello-pangea/dnd';
import { Button } from './ui/Button';
import { GripVertical, Video, FileText, Code, FileQuestion, X, Edit, Plus, Upload, Trash2 } from 'lucide-react';
import type { DropResult } from '@hello-pangea/dnd';
import { supabase } from '../lib/supabase';
import { LessonOverlay } from './LessonOverlay';

export type ContentBlock = {
  id: string;
  type: 'video' | 'text' | 'code' | 'quiz';
  content: any;
  title?: string;
  description?: string;
  video_url?: string;
  order_position?: number;
};

interface DragDropLessonBuilderProps {
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
  onAddBlock: (type: ContentBlock['type']) => void;
  courseId?: string;
  existingLessons?: ContentBlock[];
  setExistingLessons: (lessons: ContentBlock[]) => void;
}

// Function to fetch existing lessons
async function fetchExistingLessons(courseId: string) {
  const { data: lessons, error } = await supabase
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

  if (error) throw error;
  return lessons;
}

// Custom Droppable component with modern defaults
const StyledDroppable = ({ children, ...props }: DroppableProps) => {
  return (
    <Droppable {...props}>
      {(provided, snapshot) => (
        <ul
          {...provided.droppableProps}
          ref={provided.innerRef}
          className="space-y-4 mt-6"
        >
          {children(provided, snapshot)}
        </ul>
      )}
    </Droppable>
  );
};

export default function DragDropLessonBuilder({
  blocks,
  onBlocksChange,
  onAddBlock,
  courseId,
  existingLessons = [],
  setExistingLessons,
}: DragDropLessonBuilderProps) {
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState<ContentBlock['type']>('text');
  const [selectedBlock, setSelectedBlock] = useState<ContentBlock | null>(null);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    // Create a map to deduplicate lessons by ID
    const uniqueLessons = new Map();
    
    // Add existing lessons first
    existingLessons.forEach(lesson => {
      uniqueLessons.set(lesson.id, lesson);
    });
    
    // Add new blocks, overwriting any duplicates
    blocks.forEach(block => {
      uniqueLessons.set(block.id, block);
    });
    
    // Convert back to array
    const allItems = Array.from(uniqueLessons.values());
    
    // Reorder the combined array
    const items = Array.from(allItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_position: index + 1,
    }));

    // Split back into existing and new blocks
    const updatedExisting = updatedItems.filter(item => 
      existingLessons.some(existing => existing.id === item.id)
    );
    const updatedBlocks = updatedItems.filter(item => 
      blocks.some(block => block.id === item.id)
    );

    // Update both arrays
    setExistingLessons(updatedExisting);
    onBlocksChange(updatedBlocks);

    // Update order in database if courseId exists
    if (courseId) {
      try {
        // Update each lesson individually to ensure RLS policies are respected
        for (const item of updatedItems) {
          const { error } = await supabase
            .from('lessons')
            .update({ order_position: item.order_position })
            .eq('id', item.id)
            .eq('course_id', courseId); // Add course_id to the query to match RLS policy

          if (error) {
            console.error('Error updating lesson order:', error);
            throw error;
          }
        }
      } catch (err) {
        console.error('Error updating lesson order:', err);
        alert('Failed to save lesson order');
      }
    }
  };

  const handleAddNewBlock = (type: ContentBlock['type']) => {
    setSelectedBlockType(type);
    setSelectedBlock(null);
    setShowOverlay(true);
  };

  const handleEditBlock = (block: ContentBlock) => {
    setSelectedBlockType(block.type);
    // Extract quiz questions from content
    const quizQuestions = block.type === 'quiz' && block.content?.questions 
      ? block.content.questions 
      : [];

    setSelectedBlock({
      ...block,
      type: block.type,
      content: {
        ...block.content,
        questions: quizQuestions.length > 0 ? quizQuestions : [{
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        }]
      }
    });
    setShowOverlay(true);
  };

  const handleSaveBlock = async (formData: any) => {
    try {
      let videoUrl = formData.videoUrl;
      let newBlockId = null;

      // Handle video upload if there's a new file
      if (formData.videoFile) {
        const fileExt = formData.videoFile.name.split('.').pop() || 'mp4';
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course_videos')
          .upload(filePath, formData.videoFile, {
            cacheControl: '31536000', // 1 year
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course_videos')
          .getPublicUrl(filePath);

        videoUrl = publicUrl;
      }

      // Prepare content based on block type
      const content = (() => {
        switch (selectedBlockType) {
          case 'quiz':
            // Ensure quiz questions are properly structured
            const questions = formData.quizQuestions.map(q => ({
              question: q.question || '',
              options: q.options || ['', '', '', ''],
              correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
            })).filter(q => q.question.trim() !== '');

            return {
              type: 'quiz',
              questions: questions.length > 0 ? questions : [{
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0
              }]
            };
          case 'text':
            return {
              type: 'text',
              text: formData.content
            };
          case 'code':
            return {
              type: 'code',
              code_template: formData.codeTemplate,
              language: formData.codeLanguage,
              instructions: formData.content
            };
          case 'video':
            return {
              type: 'video',
              video_url: videoUrl,
              duration: formData.duration
            };
          default:
            return {};
        }
      })();

      // Prepare block data based on type
      const blockData = {
        title: formData.title,
        description: selectedBlockType === 'quiz' && formData.quizQuestions ? 
          `Quiz with ${formData.quizQuestions.length} questions` : 
          formData.description,
        type: selectedBlockType,
        video_url: videoUrl,
        content,
      };

      if (selectedBlock) {
        // Update existing block
        if (courseId) {
          // First fetch existing lesson to preserve any fields we're not updating
          const { data: existingLesson } = await supabase
            .from('lessons')
            .select('*')
            .eq('id', selectedBlock.id)
            .single();

          // Merge existing data with updates
          const { error } = await supabase
            .from('lessons')
            .update({
              ...existingLesson,
              ...blockData,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedBlock.id)
            .eq('course_id', courseId);

          if (error) throw error;
        }

        const updatedBlocks = blocks.map(block =>
          block.id === selectedBlock.id ? { ...block, ...blockData } : block
        );
        onBlocksChange(updatedBlocks);
      } else {
        // Create new block with proper UUID
        const newBlock: ContentBlock = {
          id: crypto.randomUUID(),
          type: selectedBlockType,
          order_position: blocks.length + existingLessons.length + 1,
          ...blockData,
        };

        if (courseId) {
          const { data, error } = await supabase
            .from('lessons') 
            .insert([{
              ...newBlock,
              course_id: courseId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_locked: blocks.length + existingLessons.length > 0,
              available_languages: ['English'],
              duration: formData.duration || 0
            }])
            .select();
            
          if (error) throw error;
          
          // Store the ID of the newly created lesson to avoid duplication
          if (data && data.length > 0) {
            newBlockId = data[0].id;
            // Don't add to blocks array since we'll fetch it from the database
          } else {
            // Only add to blocks array if not saved to database
            onBlocksChange([...blocks, newBlock]);
          }
        }
      }

      setShowOverlay(false);

      // Refresh existing lessons after save
      if (courseId) {
        const lessons = await fetchExistingLessons(courseId);
        if (lessons) {
          const formattedLessons = lessons.map(lesson => ({
            id: lesson.id,
            type: lesson.content?.type || 'text',
            content: lesson.content,
            title: lesson.title,
            description: lesson.content?.instructions || lesson.description,
            video_url: lesson.video_url,
            order_position: lesson.order_position,
            is_locked: lesson.is_locked,
            video_metadata: lesson.video_metadata,
            duration: lesson.duration,
            available_languages: lesson.available_languages,
            created_at: lesson.created_at,
            updated_at: lesson.updated_at
          }));
          setExistingLessons(formattedLessons);
          // Clear the blocks array since all lessons are now in existingLessons
          onBlocksChange([]);
        }
      }
    } catch (error) {
      console.error('Error saving block:', error);
      alert('Failed to save block');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      if (courseId) {
        // First, fetch the lesson to get its video URL if it exists
        const { data: lesson, error: fetchError } = await supabase
          .from('lessons')
          .select('video_url, content')
          .eq('id', blockId)
          .single();

        if (fetchError) {
          console.error('Error fetching lesson:', fetchError);
          throw new Error(`Failed to fetch lesson: ${fetchError.message}`);
        }

        // If there's a video URL, delete it from storage
        if (lesson?.video_url) {
          try {
            const url = new URL(lesson.video_url);
            const videoPath = url.pathname.split('/').pop();
            if (videoPath) {
              // Use the remove method correctly
              const { error: storageError } = await supabase

              if (storageError) {
                console.error('Error deleting video from storage:', storageError);
                // Continue with deletion even if storage deletion fails
              }
            }
          } catch (error) {
            console.error('Error parsing video URL:', error);
            // Continue with deletion even if video deletion fails
          }
        }

        // Delete associated records in the progress table first
        const { error: progressError } = await supabase
          .from('progress')
          .delete()
          .eq('lesson_id', blockId);
        
        if (progressError) {
          console.error('Error deleting progress records:', progressError);
          throw new Error(`Failed to delete progress records: ${progressError.message}`);
        }

        // Delete associated records in other tables
        const otherTables = ['code_executions', 'content_versions'];
        for (const table of otherTables) {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq('lesson_id', blockId);
          
          if (error) {
            console.error(`Error deleting ${table} records:`, error);
            throw new Error(`Failed to delete associated ${table} records: ${error.message}`);
          }
        }

        // After all associated records are deleted, delete the lesson
        const { error: lessonError } = await supabase
          .from('lessons')
          .delete()
          .eq('id', blockId)
          .eq('course_id', courseId);

        if (lessonError) {
          console.error('Error deleting lesson:', lessonError);
          throw new Error(`Failed to delete lesson: ${lessonError.message}`);
        }

        // Update existing lessons state
        setExistingLessons(existingLessons.filter(lesson => lesson.id !== blockId));
        
        // Also update blocks state in case it exists there
        onBlocksChange(blocks.filter(block => block.id !== blockId));
        return;
      }

      // Handle deletion of new blocks that haven't been saved to database yet
      const updatedBlocks = blocks.filter(block => block.id !== blockId);
      onBlocksChange(updatedBlocks);
    } catch (error) {
      console.error('Error deleting block:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete block');
    }
  };

  const getBlockIcon = (type: ContentBlock['type']) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5 text-white" />;
      case 'text':
        return <FileText className="w-5 h-5 text-white" />;
      case 'code':
        return <Code className="w-5 h-5 text-white" />;
      case 'quiz':
        return <FileQuestion className="w-5 h-5 text-white" />;
    }
  };

  const getBlockDescription = (type: ContentBlock['type']) => {
    switch (type) {
      case 'video':
        return 'Upload or embed video content';
      case 'text':
        return 'Add text, images, and formatted content';
      case 'code':
        return 'Create interactive coding exercises';
      case 'quiz':
        return 'Build assessments and quizzes';
    }
  };

  // Helper function to safely get block description text
  const getBlockDescriptionText = (block: ContentBlock) => {
    if (block.type === 'code' && typeof block.content?.instructions === 'object') {
      return '';
    }
    
    if (block.content?.instructions && typeof block.content.instructions === 'string') {
      return block.content.instructions;
    }
    
    if (block.description && typeof block.description === 'string') {
      return block.description;
    }
    
    return getBlockDescription(block.type);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => handleAddNewBlock('video')} type="button">
          <Video className="w-4 h-4 mr-2" />
          Add Video
        </Button>
        <Button variant="outline" onClick={() => handleAddNewBlock('text')} type="button">
          <FileText className="w-4 h-4 mr-2" />
          Add Content
        </Button>
        <Button variant="outline" onClick={() => handleAddNewBlock('code')} type="button">
          <Code className="w-4 h-4 mr-2" />
          Add Code Exercise
        </Button>
        <Button variant="outline" onClick={() => handleAddNewBlock('quiz')} type="button">
          <FileQuestion className="w-4 h-4 mr-2" />
          Add Assessment
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <StyledDroppable droppableId="lesson-blocks">
          {(provided, snapshot) => (
            <>
              {/* Combine existing lessons and blocks, ensuring no duplicates */}
              {[...existingLessons, ...blocks.filter(block => 
                !existingLessons.some(lesson => lesson.id === block.id)
              )].map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="glass-effect rounded-lg p-4 hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div {...provided.dragHandleProps}>
                          <GripVertical className="w-5 h-5 text-gray-500 cursor-move" />
                        </div>
                        {getBlockIcon(block.type)}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-100 truncate">
                            {block.title}
                          </h3>
                          <div 
                            className="text-sm text-gray-300"
                            dangerouslySetInnerHTML={{ __html: getBlockDescriptionText(block) }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBlock(block)}
                        >
                          <Edit className="h-4 w-4 text-[#ff6600]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {blocks.length === 0 && existingLessons.length === 0 && (
                <div className="text-center py-8 glass-effect rounded-lg border-2 border-dashed border-gray-700">
                  <p className="text-gray-300">
                    Add content blocks to build your course
                  </p>
                </div>
              )}
            </>
          )}
        </StyledDroppable>
      </DragDropContext>

      <LessonOverlay
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        onSave={handleSaveBlock}
        type={selectedBlockType}
        initialData={selectedBlock}
        title={selectedBlock ? 'Edit Lesson' : 'Add New Lesson'}
      />
    </div>
  );
}