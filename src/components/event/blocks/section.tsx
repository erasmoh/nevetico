export function BlockSection({
  title,
  children,
  bare = false,
}: {
  title?: string;
  children: React.ReactNode;
  bare?: boolean;
}) {
  return (
    <section className={bare ? "" : "rounded-xl border border-border p-6"}>
      {title ? (
        <h2 className="font-heading mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
