import React, { useMemo, useState } from 'react';

const sidebarItems = [
  { key: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { key: 'contracts', label: 'Contracts', icon: '▤' },
  { key: 'payments', label: 'Payments', icon: '◫' },
  { key: 'documents', label: 'Documents', icon: '▣' },
  { key: 'contacts', label: 'Contacts', icon: '◌' },
  { key: 'banking', label: 'Bank & Cards', icon: '◈' },
  { key: 'withdraw', label: 'Withdraw', icon: '↘' },
  { key: 'exchange', label: 'Exchange', icon: '⇄' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

const mobileNavItems = [
  { key: 'dashboard', label: 'Home', icon: '⌂' },
  { key: 'payments', label: 'Payments', icon: '◫' },
  { key: 'exchange', label: 'Exchange', icon: '⇄' },
  { key: 'contracts', label: 'Contracts', icon: '▤' },
  { key: 'contacts', label: 'Contacts', icon: '◌' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

const quickDocs = [
  'INV-COMPLETED-7b358c43-1773720077824.pdf',
  'INV-COMPLETED-85af522f-1773719935824.pdf',
  'INV-COMPLETED-9424a491-1773719615100.pdf',
  'INV-COMPLETED-b3d5e4a5-1773302695565.pdf',
];

const pendingWithdrawals = ['-$10000.00', '-$10000.00', '-$57700.00', '-$9900.00', '-$111.00'];

const timelineItems = [
  ['Identity verified', '24.03.2026, 08:07'],
  ['Bank account added', '26.02.2026, 10:12'],
  ['Profile completed', '25.02.2026, 18:40'],
];

const contracts = [
  { name: 'Independent Contractor Agreement', status: 'Signed', updated: '21 Mar 2026' },
  { name: 'NDA — Remoola Platform', status: 'Pending', updated: '19 Mar 2026' },
  { name: 'W-9 Tax Certification', status: 'Required', updated: '18 Mar 2026' },
];

const payments = [
  { title: 'Client payout', amount: '+$2,400.00', status: 'Completed', date: '22 Mar 2026' },
  { title: 'Platform fee', amount: '-$35.00', status: 'Completed', date: '22 Mar 2026' },
  { title: 'Withdrawal request', amount: '-$9900.00', status: 'Pending', date: '20 Mar 2026' },
  { title: 'Card payment', amount: '+$620.00', status: 'Processing', date: '19 Mar 2026' },
];

const documents = [
  { name: 'Invoice March #1042.pdf', kind: 'Invoice', updated: '17 Mar 2026' },
  { name: 'Identity report.pdf', kind: 'Compliance', updated: '16 Mar 2026' },
  { name: 'Signed agreement.pdf', kind: 'Contract', updated: '12 Mar 2026' },
  { name: 'Bank confirmation.pdf', kind: 'Banking', updated: '11 Mar 2026' },
];

const contacts = [
  { name: 'Anna Peterson', role: 'Account manager', email: 'anna@remoola.com' },
  { name: 'Finance Desk', role: 'Billing support', email: 'finance@remoola.com' },
  { name: 'Compliance Team', role: 'Verification', email: 'compliance@remoola.com' },
];

const accounts = [
  { label: 'Primary Bank Account', meta: '**** 4421 • USD', status: 'Connected' },
  { label: 'Visa Corporate', meta: '**** 1488 • Expires 10/28', status: 'Default' },
  { label: 'Backup Bank Account', meta: '**** 7742 • USD', status: 'Pending' },
];

const withdrawalRows = [
  { amount: '$9,900.00', destination: 'Primary Bank Account', status: 'Pending' },
  { amount: '$1,200.00', destination: 'Visa Corporate', status: 'Review' },
  { amount: '$320.00', destination: 'Primary Bank Account', status: 'Ready' },
];

const exchangeRates = [
  { pair: 'USD → EUR', rate: '0.92', fee: '0.45%' },
  { pair: 'EUR → USD', rate: '1.08', fee: '0.45%' },
  { pair: 'USD → GBP', rate: '0.79', fee: '0.60%' },
];

const settingGroups = [
  { title: 'Profile', items: ['Personal information', 'Company details', 'Address book'] },
  { title: 'Security', items: ['Password', '2FA', 'Active sessions'] },
  { title: 'Notifications', items: ['Payments', 'Compliance', 'Product updates'] },
];

export default function RemoolaMobileAppShell() {
  const [activePage, setActivePage] = useState('dashboard');

  const activeSidebarItem = useMemo(
    () => sidebarItems.find((item) => item.key === activePage) || sidebarItems[0],
    [activePage],
  );

  return (
    <div className="min-h-screen bg-[#07142b] text-white">
      <div className="mx-auto min-h-screen w-full max-w-md md:max-w-none">
        <aside className="border-b border-white/10 bg-[#091a36] md:fixed md:left-0 md:top-0 md:h-screen md:w-[248px] md:border-b-0 md:border-r md:overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 md:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-lg font-semibold shadow-[0_0_24px_rgba(59,130,246,.35)]">
                R
              </div>
              <div className="text-2xl font-semibold tracking-tight">Remoola</div>
            </div>

            <div className="flex items-center gap-3 md:hidden">
              <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80">
                ⇅
              </button>
              <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80">
                ↗
              </button>
            </div>
          </div>

          <nav className="hidden px-3 pb-5 md:block md:h-[calc(100vh-80px)] md:overflow-y-auto">
            <ul className="space-y-1">
              {sidebarItems.map((item) => {
                const isActive = item.key === activePage;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => setActivePage(item.key)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col md:ml-[248px]">
          <header className="hidden items-center justify-between border-b border-white/10 px-6 py-4 md:flex">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/40">
              Search anything...
            </div>
            <div className="ml-4 flex items-center gap-3">
              <button type="button" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80">
                Notifications
              </button>
              <button type="button" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80">
                Log out
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8 md:pt-6">
            <section className="mb-6 md:hidden">
              <div className="flex items-start gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#0a1833_0%,#07142b_100%)] p-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,.45)]">
                  <span className="text-4xl">{activeSidebarItem.icon}</span>
                </div>
                <div>
                  <h1 className="text-5xl font-semibold tracking-tight">{activeSidebarItem.label}</h1>
                  <p className="mt-2 text-lg text-white/55">Mobile first workspace for finance operations</p>
                </div>
              </div>
            </section>

            <section className="mb-6 hidden md:block">
              <h1 className="text-4xl font-semibold tracking-tight">{activeSidebarItem.label}</h1>
              <p className="mt-1 text-white/55">Manage balances, payments, documents, compliance, and account settings.</p>
            </section>

            {activePage === 'dashboard' ? <DashboardPage /> : null}
            {activePage === 'contracts' ? <ContractsPage /> : null}
            {activePage === 'payments' ? <PaymentsPage /> : null}
            {activePage === 'documents' ? <DocumentsPage /> : null}
            {activePage === 'contacts' ? <ContactsPage /> : null}
            {activePage === 'banking' ? <BankingPage /> : null}
            {activePage === 'withdraw' ? <WithdrawPage /> : null}
            {activePage === 'exchange' ? <ExchangePage /> : null}
            {activePage === 'settings' ? <SettingsPage /> : null}
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#08152d]/95 px-2 py-2 backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
              {mobileNavItems.map((item) => {
                const isActive = item.key === activePage;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActivePage(item.key)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] ${
                      isActive ? 'bg-blue-500/15 text-blue-300' : 'text-white/60'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard icon="◉" label="Balance" value="-$673.15" sublabel="Available balance" accent="text-yellow-400" />
        <MetricCard icon="▣" label="Requests" value="0" sublabel="Active payment requests" />
        <MetricCard icon="◔" label="Last payment" value="19 Mar 2026" sublabel="13:01" />
      </section>

      <section className="mt-5 rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,.28)]">
              <span className="text-4xl">✓</span>
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-cyan-100/80">Stripe Verify Me</div>
              <h2 className="mt-1 text-3xl font-semibold">Identity verified</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/70 md:text-sm">
                Your verification is complete and higher account access is available.
              </p>
            </div>
          </div>
          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/15 px-4 py-2 text-base text-emerald-300 md:text-sm">
            Verified
          </span>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <ActionCard title="Create Payment Request" text="Send an invoice-like request in minutes." cta="Create" />
        <ActionCard title="Start Payment" text="One-off payment flow (card or bank)." cta="Pay" highlight />
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Panel title="Open Payment Requests">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
              No open payment requests yet.
            </div>
          </Panel>

          <Panel title="Activity Timeline">
            <div className="space-y-4">
              {timelineItems.map(([title, date]) => (
                <div key={title} className="flex gap-3">
                  <div className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white/90">{title}</div>
                    <div className="text-xs text-white/45">{date}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Pending withdrawals" aside="5 total">
            <div className="space-y-3">
              {pendingWithdrawals.map((amount, index) => (
                <div
                  key={`${amount}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-white/85">{amount}</div>
                    <div className="text-xs text-white/35">Code</div>
                  </div>
                  <span className="text-sm text-amber-300">Pending</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Tasks – Onboarding / Compliance">
            <div>
              <div className="text-sm text-white/55">2 of 4 completed</div>
              <div className="mt-1 text-sm text-blue-300">50% ready</div>
              <div className="mt-3 h-2.5 rounded-full bg-white/10">
                <div className="h-2.5 w-1/2 rounded-full bg-blue-500" />
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <ChecklistItem checked>Complete KYC</ChecklistItem>
                <ChecklistItem checked>Complete your profile</ChecklistItem>
                <ChecklistItem>Upload W-9 form</ChecklistItem>
                <ChecklistItem>Add bank account</ChecklistItem>
              </div>
            </div>
          </Panel>

          <Panel title="Quick Docs" aside="View all">
            <div className="space-y-2">
              {quickDocs.map((doc) => (
                <div
                  key={doc}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <span className="max-w-[75%] truncate text-white/85">{doc}</span>
                  <span className="text-xs text-white/35">17.03.2026</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function ContractsPage() {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel title="Contracts overview">
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div key={contract.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-white/90">{contract.name}</div>
                  <div className="mt-1 text-sm text-white/45">Updated {contract.updated}</div>
                </div>
                <StatusPill status={contract.status} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Required next steps">
        <div className="space-y-3 text-sm text-white/70">
          <ChecklistItem checked>Independent Contractor Agreement</ChecklistItem>
          <ChecklistItem>Complete W-9 upload</ChecklistItem>
          <ChecklistItem>Review NDA amendments</ChecklistItem>
          <ChecklistItem>Download signed copies</ChecklistItem>
        </div>
      </Panel>
    </section>
  );
}

function PaymentsPage() {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard icon="↑" label="Incoming" value="+$3,020" sublabel="This month" accent="text-emerald-300" />
        <MetricCard icon="↓" label="Outgoing" value="-$10,046" sublabel="This month" />
        <MetricCard icon="◎" label="Processing" value="2" sublabel="Live transactions" />
      </section>

      <Panel title="Recent payments">
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={`${payment.title}-${payment.date}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-white/90">{payment.title}</div>
                  <div className="mt-1 text-sm text-white/45">{payment.date}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-white/90">{payment.amount}</div>
                  <div className="mt-1 text-sm text-white/45">{payment.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DocumentsPage() {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <Panel title="Document library">
        <div className="space-y-3">
          {documents.map((document) => (
            <div key={document.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="font-medium text-white/90">{document.name}</div>
                <div className="mt-1 text-sm text-white/45">{document.kind}</div>
              </div>
              <div className="text-right text-sm text-white/45">{document.updated}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Storage summary">
        <div className="space-y-4">
          <MetricLine label="Total files" value="28" />
          <MetricLine label="Private docs" value="21" />
          <MetricLine label="Invoices" value="12" />
          <MetricLine label="Contracts" value="5" />
        </div>
      </Panel>
    </section>
  );
}

function ContactsPage() {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel title="Contacts">
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.email} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-medium text-white/90">{contact.name}</div>
              <div className="mt-1 text-sm text-white/45">{contact.role}</div>
              <div className="mt-2 text-sm text-blue-300">{contact.email}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Communication shortcuts">
        <div className="space-y-3">
          <ActionMini label="New support message" />
          <ActionMini label="Request billing help" />
          <ActionMini label="Contact compliance" />
        </div>
      </Panel>
    </section>
  );
}

function BankingPage() {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard icon="◈" label="Accounts" value="3" sublabel="Connected methods" />
        <MetricCard icon="★" label="Default" value="Visa" sublabel="Primary method" />
        <MetricCard icon="!" label="Pending" value="1" sublabel="Needs review" />
      </section>

      <Panel title="Bank accounts & cards">
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="font-medium text-white/90">{account.label}</div>
                <div className="mt-1 text-sm text-white/45">{account.meta}</div>
              </div>
              <StatusPill status={account.status} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function WithdrawPage() {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Create withdrawal">
        <div className="space-y-4">
          <Field label="Amount" value="$9,900.00" />
          <Field label="Destination" value="Primary Bank Account" />
          <Field label="Fee estimate" value="$18.00" />
          <button type="button" className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white">
            Continue
          </button>
        </div>
      </Panel>

      <Panel title="Recent withdrawal requests">
        <div className="space-y-3">
          {withdrawalRows.map((row) => (
            <div key={`${row.amount}-${row.destination}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="font-medium text-white/90">{row.amount}</div>
                <div className="mt-1 text-sm text-white/45">{row.destination}</div>
              </div>
              <StatusPill status={row.status} />
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function ExchangePage() {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel title="Exchange form">
        <div className="space-y-4">
          <Field label="From" value="USD" />
          <Field label="To" value="EUR" />
          <Field label="Amount" value="$1,250.00" />
          <Field label="Estimated receive" value="€1,147.50" />
          <button type="button" className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-[#05261c]">
            Convert funds
          </button>
        </div>
      </Panel>

      <Panel title="Live rates">
        <div className="space-y-3">
          {exchangeRates.map((rate) => (
            <div key={rate.pair} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="font-medium text-white/90">{rate.pair}</div>
                <div className="mt-1 text-sm text-white/45">Fee {rate.fee}</div>
              </div>
              <div className="text-lg font-semibold text-white/90">{rate.rate}</div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function SettingsPage() {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {settingGroups.map((group) => (
        <Panel key={group.title} title={group.title}>
          <div className="space-y-3">
            {group.items.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                {item}
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </section>
  );
}

function MetricCard({ icon, label, value, sublabel, accent = 'text-white' }) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)] p-5 shadow-[0_8px_30px_rgba(0,0,0,.18)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/90 text-xl shadow-[0_0_24px_rgba(59,130,246,.35)]">
          {icon}
        </div>
        <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">{label}</span>
      </div>
      <div className={`text-5xl font-semibold tracking-tight ${accent}`}>{value}</div>
      <div className="mt-3 text-base text-white/55">{sublabel}</div>
    </article>
  );
}

function ActionCard({ title, text, cta, highlight = false }) {
  return (
    <article className="flex items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
            highlight ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
          }`}
        >
          ☐
        </div>
        <div>
          <div className="font-medium text-white/90">{title}</div>
          <div className="mt-1 text-sm text-white/45">{text}</div>
        </div>
      </div>
      <button
        type="button"
        className={`rounded-full px-4 py-2 text-sm font-medium ${
          highlight ? 'bg-emerald-500 text-[#05261c]' : 'bg-blue-500 text-white'
        }`}
      >
        {cta}
      </button>
    </article>
  );
}

function Panel({ title, aside, children }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white/90">{title}</h3>
        {aside ? <span className="text-xs text-white/40">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

function ChecklistItem({ checked, children }) {
  return (
    <div className="flex items-center gap-3 text-white/75">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] ${
          checked ? 'border-blue-400 bg-blue-500/15 text-blue-300' : 'border-white/20 text-transparent'
        }`}
      >
        ✓
      </span>
      <span className={checked ? 'line-through text-white/35' : ''}>{children}</span>
    </div>
  );
}

function StatusPill({ status }) {
  const tone =
    status === 'Signed' || status === 'Completed' || status === 'Connected' || status === 'Default' || status === 'Ready'
      ? 'border-emerald-400/20 bg-emerald-500/15 text-emerald-300'
      : status === 'Pending' || status === 'Processing' || status === 'Review'
        ? 'border-amber-400/20 bg-amber-500/15 text-amber-300'
        : 'border-white/10 bg-white/5 text-white/70';

  return <span className={`rounded-full border px-3 py-1 text-xs ${tone}`}>{status}</span>;
}

function MetricLine({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-white/60">{label}</span>
      <span className="font-medium text-white/90">{value}</span>
    </div>
  );
}

function ActionMini({ label }) {
  return (
    <button type="button" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80">
      {label}
    </button>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="mb-2 text-sm text-white/55">{label}</div>
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/90">{value}</div>
    </div>
  );
}
