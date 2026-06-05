function BinderRings({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col justify-around h-full py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative mx-auto w-7 h-7">
          <div className="w-7 h-7 rounded-full ring-metal" />
          <div className="absolute inset-[5px] rounded-full bg-[#0c0405]" />
        </div>
      ))}
    </div>
  );
}

export function PageSpine() {
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: "linear-gradient(180deg, #1a0d05 0%, #120908 100%)",
        boxShadow:
          "inset 0 0 16px rgba(0,0,0,0.6), -5px 0 10px rgba(0,0,0,0.4), 5px 0 10px rgba(0,0,0,0.4)",
      }}
    >
      <BinderRings count={5} />
    </div>
  );
}
