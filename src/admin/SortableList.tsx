import type { CSSProperties, ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import s from './admin.module.css';

function Item({
  id,
  as: Tag,
  render,
}: {
  id: string;
  as: 'li' | 'div';
  render: (handle: ReactNode, dragging: boolean) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
  };
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={s.handle}
      aria-label="Drag to reorder. With the keyboard, press Space, then the arrow keys."
      {...attributes}
      {...listeners}
    />
  );
  return (
    <Tag ref={setNodeRef as never} style={style} data-dragging={isDragging ? '' : undefined}>
      {render(handle, isDragging)}
    </Tag>
  );
}

/**
 * Vertical drag-to-reorder list (dnd-kit). `render` receives the drag handle to
 * place in the row; `onMove` gets the old and new index. Rows also need their own
 * up and down buttons for people who do not drag.
 */
export function SortableList<T extends { id: string }>({
  items,
  onMove,
  render,
  as = 'li',
}: {
  items: T[];
  onMove: (from: number, to: number) => void;
  render: (item: T, index: number, handle: ReactNode, dragging: boolean) => ReactNode;
  as?: 'li' | 'div';
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from >= 0 && to >= 0) onMove(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item, i) => (
          <Item key={item.id} id={item.id} as={as} render={(handle, dragging) => render(item, i, handle, dragging)} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

/** Moves one element of an array (returns a new array). */
export function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
