import { PasswordConfirmationField } from '../../../../../components/admin-form-fields/password-confirmation-field';
import {
  operatorFormActionsClass,
  operatorFormClass,
  operatorFormConfirmClass,
  operatorFormFieldsClass,
  operatorFormFullWidthCtaClass,
  operatorFormIntroClass,
  operatorFormSecondaryClass,
  operatorFormSectionClass,
} from '../../../../../components/ui-classes';
import {
  changeAdminPermissionsAction,
  changeAdminRoleAction,
  deactivateAdminAction,
  resetAdminPasswordAction,
  restoreAdminAction,
} from '../../../../../lib/admin-mutations/admins.server';
import { ADMIN_V2_ROLE_OPTIONS } from '../../../../../lib/admin-rbac';
import { type AdminCasePageData } from '../page.loader';

export function AdminManagementActions({ admin, isSelf }: { admin: AdminCasePageData[`admin`]; isSelf: boolean }) {
  const overrideModeByCapability = new Map(
    admin.accessProfile.permissionOverrides.map((override) => [
      override.capability,
      override.granted ? `grant` : `deny`,
    ]),
  );

  return (
    <section className="detailGrid">
      <article className="panel">
        <h2>Lifecycle actions</h2>
        <div className="formStack">
          {admin.core.status === `ACTIVE` ? (
            <form action={deactivateAdminAction.bind(null, admin.core.id)} className={operatorFormClass}>
              <input type="hidden" name="version" value={String(admin.version)} />
              <div className={operatorFormSectionClass}>
                <div className={operatorFormIntroClass}>
                  <p className="text-sm font-medium text-white/90">Deactivate admin</p>
                  <p className="muted">Lifecycle action only. The reason stays visible in the audit log.</p>
                </div>
                <div className={operatorFormFieldsClass}>
                  <label className="field">
                    <span>Reason</span>
                    <textarea
                      name="reason"
                      maxLength={500}
                      placeholder="Operational reason visible in audit log."
                      disabled={isSelf}
                    />
                  </label>
                </div>
                <div className={operatorFormConfirmClass}>
                  <label className="field">
                    <span>Confirm</span>
                    <input type="checkbox" name="confirmed" value="true" required disabled={isSelf} />
                  </label>
                  <PasswordConfirmationField disabled={isSelf} />
                  {isSelf ? <p className="errorText mt-2">Self-deactivate is blocked.</p> : null}
                </div>
                <div className={operatorFormActionsClass}>
                  <button
                    className={`dangerButton ${operatorFormFullWidthCtaClass}`}
                    type="submit"
                    name="confirmedSubmit"
                    value="true"
                    disabled={isSelf}
                  >
                    Deactivate admin
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form action={restoreAdminAction.bind(null, admin.core.id)} className={operatorFormClass}>
              <input type="hidden" name="version" value={String(admin.version)} />
              <div className={operatorFormSecondaryClass}>
                <div className={operatorFormIntroClass}>
                  <p className="text-sm font-medium text-white/90">Restore admin</p>
                  <p className="muted">Re-enables the admin record without changing current role configuration.</p>
                </div>
                <div className={operatorFormFieldsClass}>
                  <PasswordConfirmationField />
                </div>
                <div className={operatorFormActionsClass}>
                  <button className={`primaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
                    Restore admin
                  </button>
                </div>
              </div>
            </form>
          )}

          <form action={resetAdminPasswordAction.bind(null, admin.core.id)} className={operatorFormClass}>
            <input type="hidden" name="version" value={String(admin.version)} />
            <div className={operatorFormSecondaryClass}>
              <div className={operatorFormIntroClass}>
                <p className="text-sm font-medium text-white/90">Password reset</p>
                <p className="muted">Secondary recovery action for active admins only.</p>
              </div>
              <div className={operatorFormFieldsClass}>
                <PasswordConfirmationField />
              </div>
              <div className={operatorFormActionsClass}>
                <button
                  className={`secondaryButton ${operatorFormFullWidthCtaClass}`}
                  type="submit"
                  disabled={admin.core.status !== `ACTIVE`}
                >
                  Send password reset
                </button>
              </div>
            </div>
          </form>
        </div>
      </article>

      <article className="panel">
        <h2>Role change</h2>
        <p className="muted">
          Schema-backed lifecycle controls expose the full admin role set available in this workspace.
        </p>
        <form action={changeAdminRoleAction.bind(null, admin.core.id)} className={operatorFormClass}>
          <input type="hidden" name="version" value={String(admin.version)} />
          <div className={operatorFormSectionClass}>
            <div className={operatorFormFieldsClass}>
              <label className="field">
                <span>Role</span>
                <select
                  name="roleKey"
                  defaultValue={admin.accessProfile.resolvedRole ?? admin.core.role ?? `OPS_ADMIN`}
                >
                  {ADMIN_V2_ROLE_OPTIONS.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.key}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={operatorFormConfirmClass}>
              <label className="field">
                <span>Confirm</span>
                <input type="checkbox" name="confirmed" value="true" required />
              </label>
              <PasswordConfirmationField />
            </div>
            <div className={operatorFormActionsClass}>
              <button
                className={`primaryButton ${operatorFormFullWidthCtaClass}`}
                type="submit"
                name="confirmedSubmit"
                value="true"
              >
                Change role
              </button>
            </div>
          </div>
        </form>
      </article>

      <article className="panel">
        <h2>Permissions change</h2>
        <p className="muted">
          Explicit overrides remain schema-backed and apply as inherit, grant, or deny across the available admin
          capabilities.
        </p>
        <form action={changeAdminPermissionsAction.bind(null, admin.core.id)} className={operatorFormClass}>
          <input type="hidden" name="version" value={String(admin.version)} />
          <div className={operatorFormSectionClass}>
            <div className={operatorFormFieldsClass}>
              {admin.accessProfile.availablePermissionCapabilities.map((capability) => (
                <label key={capability} className="field">
                  <span className="mono">{capability}</span>
                  <select
                    name={`capability_override_${capability}`}
                    defaultValue={overrideModeByCapability.get(capability) ?? `inherit`}
                  >
                    <option value="inherit">inherit role baseline</option>
                    <option value="grant">explicit grant</option>
                    <option value="deny">explicit deny</option>
                  </select>
                </label>
              ))}
              <PasswordConfirmationField />
            </div>
            <div className={operatorFormActionsClass}>
              <button className={`primaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
                Save overrides
              </button>
            </div>
          </div>
        </form>
      </article>
    </section>
  );
}
