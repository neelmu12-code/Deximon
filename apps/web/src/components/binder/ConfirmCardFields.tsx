"use client";

import {
  CONDITION_OPTIONS,
  HOLO_OPTIONS,
  LANGUAGE_OPTIONS,
  rarityOptions,
  type CardDetails,
  type CardIdentity,
} from "@/lib/cardDetails";

const FIELD =
  "h-10 w-full rounded-md border border-hair bg-surface2 px-3 text-sm text-ink outline-none focus:border-ink2";
const LABEL = "block text-[11px] uppercase tracking-wider text-ink3 mb-1.5";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="block">
      <span className={LABEL}>{label}</span>
      <div
        className="flex h-10 w-full items-center rounded-md border border-hair bg-surface px-3 text-sm text-ink2"
        title="Comes from the card catalog and can't be changed"
      >
        {value || "—"}
      </div>
    </div>
  );
}

/**
 * The shared "confirm card details" fields. Identity (name, set, number) is
 * read-only because it comes from the catalog; only the four hard-to-scan
 * attributes are editable, and each is a constrained dropdown.
 */
export function ConfirmCardFields({
  identity,
  value,
  onChange,
}: {
  identity: CardIdentity;
  value: CardDetails;
  onChange: (next: CardDetails) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ReadOnlyField label="Name" value={identity.name} />
      <ReadOnlyField label="Set name" value={identity.set_name} />
      <ReadOnlyField label="Number" value={identity.number} />

      <label className="block">
        <span className={LABEL}>Rarity</span>
        <select
          className={FIELD}
          value={value.rarity}
          onChange={(e) => onChange({ ...value, rarity: e.target.value })}
        >
          {rarityOptions(value.rarity).map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={LABEL}>Holo type</span>
        <select
          className={FIELD}
          value={value.holo_type}
          onChange={(e) => onChange({ ...value, holo_type: e.target.value as CardDetails["holo_type"] })}
        >
          {HOLO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={LABEL}>Condition</span>
        <select
          className={FIELD}
          value={value.condition}
          onChange={(e) => onChange({ ...value, condition: e.target.value })}
        >
          {CONDITION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={LABEL}>Language</span>
        <select
          className={FIELD}
          value={value.language}
          onChange={(e) => onChange({ ...value, language: e.target.value })}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
