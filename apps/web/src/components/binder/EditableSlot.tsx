import Image from "next/image";
import type { CardSlot } from "@/lib/binderTypes";

type Props = {
  card: CardSlot;
  pageIdx: number;
  slotIdx: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (pageIdx: number, slotIdx: number) => void;
  onDragOver: (pageIdx: number, slotIdx: number) => void;
  onDragEnd: () => void;
  onDrop: (pageIdx: number, slotIdx: number) => void;
  onAdd: (pageIdx: number, slotIdx: number) => void;
  onRemove: (pageIdx: number, slotIdx: number) => void;
  onCardClick: (card: NonNullable<CardSlot>) => void;
};

export function EditableSlot({
  card,
  pageIdx,
  slotIdx,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onAdd,
  onRemove,
  onCardClick,
}: Props) {
  if (card) {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(pageIdx, slotIdx)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(pageIdx, slotIdx);
        }}
        onDragEnd={onDragEnd}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(pageIdx, slotIdx);
        }}
        onClick={() => onCardClick(card)}
        className={`relative card-ratio rounded-md overflow-hidden cursor-grab active:cursor-grabbing group transition-opacity ${
          isDragging ? "opacity-40" : "opacity-100"
        } ${isDragOver ? "ring-2 ring-dx-red" : ""}`}
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)" }}
      >
        <Image
          src={card.image}
          alt={card.name}
          fill
          className="object-cover"
          sizes="120px"
          unoptimized
        />
        <div className="absolute inset-0 sleeve-sheen pointer-events-none" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(pageIdx, slotIdx);
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-dx-red z-10"
          aria-label="Remove card"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(pageIdx, slotIdx);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(pageIdx, slotIdx);
      }}
      onClick={() => onAdd(pageIdx, slotIdx)}
      className={`card-ratio rounded-md border border-dashed flex items-center justify-center transition-colors w-full ${
        isDragOver
          ? "border-dx-red bg-dx-red/10"
          : "border-[rgba(100,70,20,0.35)] bg-[rgba(100,70,20,0.04)] hover:border-[rgba(100,70,20,0.6)] hover:bg-[rgba(100,70,20,0.08)]"
      }`}
    >
      <svg
        className="w-4 h-4 text-[rgba(160,110,40,0.6)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  );
}
