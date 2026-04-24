type AdminSurfaceStateProps = {
  title: string;
  description: string;
};

export function AdminSurfaceAccessDenied({ title, description }: AdminSurfaceStateProps) {
  return (
    <section className="rounded-card border border-border bg-panel p-5">
      <h1 className="text-xl font-semibold text-text">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-56">{description}</p>
    </section>
  );
}

export function AdminSurfaceUnavailable({ title, description }: AdminSurfaceStateProps) {
  return (
    <section className="rounded-card border border-border bg-panel p-5">
      <h1 className="text-xl font-semibold text-text">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-56">{description}</p>
    </section>
  );
}
