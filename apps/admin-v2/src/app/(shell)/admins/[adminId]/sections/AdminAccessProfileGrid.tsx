import { type AdminCasePageData } from '../page.loader';

export function AdminAccessProfileGrid({ admin }: { admin: AdminCasePageData[`admin`] }) {
  return (
    <section className="detailGrid">
      <article className="panel">
        <h2>Capabilities</h2>
        <div className="formStack">
          {admin.accessProfile.capabilities.length === 0 ? <p className="muted">No capabilities.</p> : null}
          {admin.accessProfile.capabilities.map((capability) => (
            <div key={capability} className="panel">
              <span className="mono">{capability}</span>
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <h2>Permission overrides</h2>
        <div className="formStack">
          {admin.accessProfile.permissionOverrides.length === 0 ? (
            <p className="muted">No explicit overrides.</p>
          ) : null}
          {admin.accessProfile.permissionOverrides.map((override) => (
            <div key={override.capability} className="panel">
              <strong className="mono">{override.capability}</strong>
              <p className="muted">Granted: {String(override.granted)}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
