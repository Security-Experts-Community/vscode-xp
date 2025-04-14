import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { memo } from 'react';
import { SortableListProps } from './sortable-list';

interface SortableListItemProps {
  itemId: string;
  itemClassName?: string;
  itemDraggedClassName?: string;
  itemComponent: SortableListProps['itemComponent'];
}

function SortableListItem({
  itemId,
  itemClassName,
  itemDraggedClassName,
  itemComponent: ItemComponent
}: SortableListItemProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: itemId });

  return (
    <div
      ref={setNodeRef}
      className={clsx(itemClassName, isDragging && itemDraggedClassName)}
      style={{
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 99 : ''
      }}
    >
      <ItemComponent itemId={itemId} isDragging={isDragging} dragHandleListeners={listeners!} />
    </div>
  );
}

export default memo(SortableListItem);
