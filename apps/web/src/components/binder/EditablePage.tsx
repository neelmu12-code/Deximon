import type { CardSlot } from "@/lib/binderTypes";
import { EditableSlot } from "./EditableSlot";

type Props = {
  slots: CardSlot[];
  pageIdx: number;
  side: "left" | "right";
  dragSrc: { pageIdx: number; slotIdx: number } | null;
  dragOver: { pageIdx: number; slotIdx: number } | null;
  onDragStart: (pageIdx: number, slotIdx: number) => void;
  onDragOver: (pageIdx: number, slotIdx: number) => void;
  onDragEnd: () => void;
  onDrop: (pageIdx: number, slotIdx: number) => void;
  onAdd: (pageIdx: number, slotIdx: number) => void;
  onRemove: (pageIdx: number, slotIdx: number) => void;
  onCardClick: (card: NonNullable<CardSlot>) => void;
};

export function EditablePage({
  slots,
  pageIdx,
  side,
  dragSrc,
  dragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onAdd,
  onRemove,
  onCardClick,
}: Props) {
  // Spine (58px) is centered at the seam = 29px into each page. 40px gives 11px clearance.
  const padding =
    side === "left"
      ? "pl-4 pt-4 pr-[40px] pb-8"
      : "pl-[40px] pt-4 pr-4 pb-8";

  return (
    <div className={`parchment parchment-grain absolute inset-0 rounded-sm ${padding}`}>
      <div className="relative z-[1] grid grid-cols-3 gap-2.5 h-full">
        {Array.from({ length: 9 }).map((_, i) => (
          <EditableSlot
            key={i}
            card={slots[i] ?? null}
            pageIdx={pageIdx}
            slotIdx={i}
            isDragging={
              dragSrc?.pageIdx === pageIdx && dragSrc?.slotIdx === i
            }
            isDragOver={
              dragOver?.pageIdx === pageIdx && dragOver?.slotIdx === i
            }
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            onAdd={onAdd}
            onRemove={onRemove}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}
