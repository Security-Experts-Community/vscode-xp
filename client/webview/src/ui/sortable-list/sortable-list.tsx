import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { restrictToFirstScrollableAncestor, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { memo, useMemo } from 'react';
import SortableListItem from './sortable-list-item';

export interface SortableListItemComponentProps {
  itemId: string;
  isDragging: boolean;
  dragHandleListeners: SyntheticListenerMap;
}

export interface SortableListProps {
  itemIds: string[];
  itemClassName?: string;
  itemDraggedClassName?: string;
  itemComponent: React.ComponentType<SortableListItemComponentProps>;
  onDragStart?(): void;
  onDragEnd?(fromId: string, toId: string): void;
}

function SortableList({
  itemIds,
  itemClassName,
  itemDraggedClassName,
  itemComponent,
  onDragStart,
  onDragEnd
}: SortableListProps) {
  const sensors = useSensors(useSensor(MouseSensor));

  const handleDragEnd = (e: DragEndEvent) => {
    if (onDragEnd && e.active && e.over && e.active.id !== e.over.id) {
      onDragEnd(String(e.active.id), String(e.over.id));
    }
  };

  const renderedItems = useMemo(
    () =>
      itemIds.map((itemId) => (
        <SortableListItem
          key={itemId}
          itemId={itemId}
          itemClassName={itemClassName}
          itemDraggedClassName={itemDraggedClassName}
          itemComponent={itemComponent}
        />
      )),
    [itemIds, itemClassName, itemDraggedClassName, itemComponent]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {renderedItems}
      </SortableContext>
    </DndContext>
  );
}

export default memo(SortableList);
