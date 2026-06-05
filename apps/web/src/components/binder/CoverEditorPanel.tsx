import type { BinderCoverConfig, CoverColorId } from "@/lib/binderTypes";
import { COVER_COLORS } from "@/lib/binderTypes";
import { CoverThumb } from "./CoverThumb";

type Props = {
  cover: BinderCoverConfig;
  setCover: (cfg: BinderCoverConfig) => void;
  username: string;
  onClose: () => void;
};

export function CoverEditorPanel({ cover, setCover, username, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 inset-y-0 w-[340px] bg-surface border-l border-hair overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-hair">
          <div>
            <div className="font-semibold text-ink">Binder Cover</div>
            <div className="text-[12px] text-ink3 mt-0.5">Personalise your cover</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink3 hover:text-ink transition-colors mt-0.5"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Cover type */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink3 mb-2">Cover type</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCover({ ...cover, type: "color" })}
                className={`flex-1 py-2 rounded-md border text-sm transition-colors ${
                  cover.type === "color"
                    ? "border-dx-red bg-dx-red/10 text-ink"
                    : "border-hair bg-surface2 text-ink2 hover:border-ink3"
                }`}
              >
                Classic leather
              </button>
              <div className="relative flex-1 group">
                <button
                  type="button"
                  disabled
                  className="w-full py-2 rounded-md border border-hair bg-surface2 text-ink3 text-sm cursor-not-allowed opacity-50"
                >
                  Custom image
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-base border border-hair rounded text-[11px] text-ink3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Coming soon
                </div>
              </div>
            </div>
          </div>

          {/* Leather colour */}
          {cover.type === "color" && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink3 mb-2">Leather colour</div>
              <div className="grid grid-cols-4 gap-2">
                {COVER_COLORS.map((c) => {
                  const isActive = cover.colorId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCover({ ...cover, colorId: c.id as CoverColorId })}
                      title={c.label}
                      className={`relative aspect-[3/4] rounded-md transition-all ${
                        isActive
                          ? "ring-2 ring-dx-red ring-offset-1 ring-offset-surface"
                          : "hover:ring-1 hover:ring-white/20"
                      }`}
                      style={{
                        background: `linear-gradient(160deg, ${c.a} 0%, ${c.b} 55%, ${c.c} 100%)`,
                      }}
                    >
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 text-center pb-0.5">
                        <span className="text-[9px] text-white/40">{c.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Embossed name toggle */}
          {cover.type === "color" && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink3 mb-2">Embossed name</div>
              <label className="flex items-center justify-between cursor-pointer gap-3">
                <span className="text-sm text-ink2">Show &ldquo;The binder of {username}&rdquo;</span>
                <div
                  className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors ${
                    cover.showName ? "bg-dx-red" : "bg-surface2 border border-hair"
                  }`}
                  onClick={() => setCover({ ...cover, showName: !cover.showName })}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow ${
                      cover.showName ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </div>
              </label>
            </div>
          )}

          {/* Preview */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink3 mb-2">Preview</div>
            <div className="flex justify-center">
              <CoverThumb cfg={cover} size={120} username={username} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
