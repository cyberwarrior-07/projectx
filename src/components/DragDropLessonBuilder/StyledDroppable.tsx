import { DragDropContext, Droppable, DroppableProps } from '@hello-pangea/dnd';

export const StyledDroppable = ({ children, ...props }: DroppableProps) => {
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