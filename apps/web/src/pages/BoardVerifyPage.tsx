import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

const PASSCODE = 'dboa2026';
const DBOA_CHAPTER_ID = '14844f0c-5672-40c6-ae4e-0ec1b8a10679';
const RULEBOOK_STEP_ID = '2b47e891-4fe4-4dc1-8dc4-d21589913ca1';

type VerifyRow = {
  cycle_id: string;
  workflow_step_id: string;
  person_id: string;
  full_name: string;
  email: string;
  step_name: string;
  step_type: string;
  member_type: string;
};

type OutstandingBook = {
  person_id: string;
  full_name: string;
  email: string;
  book_step: string;
  workflow_step_id: string;
  cycle_id: string;
};

type BookStep = { id: string; name: string };

type IssueBookOk = { ok: true };
type IssueBookDup = { ok: false; reason: 'already_issued'; issued_at: string; issued_by: string };
type IssueBookResult = IssueBookOk | IssueBookDup;

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400';

const stepTypeChip = (type: string) => {
  const styles: Record<string, string> = {
    payment: 'bg-emerald-50 text-emerald-700',
    external_confirm: 'bg-blue-50 text-blue-700',
    credential: 'bg-purple-50 text-purple-700',
    attendance: 'bg-amber-50 text-amber-700',
    assessment: 'bg-rose-50 text-rose-700',
    acknowledgment: 'bg-slate-100 text-slate-600',
    staff_verify: 'bg-sky-50 text-sky-700',
  };
  const cls = styles[type] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{type}</span>
  );
};

export default function BoardVerifyPage() {
  const [passcode, setPasscode] = useState('');
  const [repName, setRepName] = useState('');
  const [authed, setAuthed] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);

  // Verify queue
  const [queue, setQueue] = useState<VerifyRow[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, string | null>>({});

  // Book issuance
  const issueSectionRef = useRef<HTMLElement>(null);
  const [bookSteps, setBookSteps] = useState<BookStep[]>([]);
  const [issuePerson, setIssuePerson] = useState<{ id: string; name: string } | null>(null);
  const [issueBookType, setIssueBookType] = useState<'rulebook' | 'mechanics'>('rulebook');
  const [issueBusy, setIssueBusy] = useState(false);
  const [issueResult, setIssueResult] = useState<IssueBookResult | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Outstanding books
  const [outstanding, setOutstanding] = useState<OutstandingBook[]>([]);
  const [outstandingLoading, setOutstandingLoading] = useState(false);

  const loadQueue = async () => {
    setQueueLoading(true);
    const { data } = await (supabase as any).rpc('list_verify_queue', {
      p_passcode: PASSCODE,
      p_chapter_id: DBOA_CHAPTER_ID,
    });
    setQueue((data ?? []) as VerifyRow[]);
    setQueueLoading(false);
  };

  const loadOutstanding = async () => {
    setOutstandingLoading(true);
    const { data } = await (supabase as any).rpc('outstanding_books', {
      p_passcode: PASSCODE,
      p_chapter_id: DBOA_CHAPTER_ID,
    });
    setOutstanding((data ?? []) as OutstandingBook[]);
    setOutstandingLoading(false);
  };

  const loadBookSteps = async () => {
    const { data } = await supabase
      .from('workflow_step')
      .select('id, name')
      .eq('chapter_id', DBOA_CHAPTER_ID)
      .ilike('name', '%NFHS%')
      .order('sort_order');
    setBookSteps((data ?? []) as BookStep[]);
  };

  useEffect(() => {
    if (!authed) return;
    loadQueue();
    loadOutstanding();
    loadBookSteps();
  }, [authed]);

  const handlePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === PASSCODE) {
      setAuthed(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const handleVerify = async (row: VerifyRow, action: 'verify' | 'reject') => {
    const key = `${row.cycle_id}:${row.workflow_step_id}`;
    setRowBusy((prev) => ({ ...prev, [key]: action }));
    const { data, error } = await (supabase as any).rpc('staff_verify_step', {
      p_passcode: PASSCODE,
      p_cycle_id: row.cycle_id,
      p_workflow_step_id: row.workflow_step_id,
      p_action: action,
      p_actor_label: repName || null,
      p_note: action === 'reject' ? (rejectNotes[key] || null) : null,
    });
    setRowBusy((prev) => ({ ...prev, [key]: null }));
    if (!error && (data as any)?.ok) {
      setQueue((prev) =>
        prev.filter(
          (r) => !(r.cycle_id === row.cycle_id && r.workflow_step_id === row.workflow_step_id),
        ),
      );
    }
  };

  const handleIssueBook = async () => {
    if (!issuePerson) return;
    setIssueBusy(true);
    setIssueResult(null);
    setIssueError(null);

    const stepId =
      issueBookType === 'rulebook'
        ? RULEBOOK_STEP_ID
        : bookSteps.find((s) => s.name.toLowerCase().includes('mechanic'))?.id ?? '';

    if (!stepId) {
      setIssueError('Mechanics step not found — reload and try again.');
      setIssueBusy(false);
      return;
    }

    const { data, error } = await (supabase as any).rpc('issue_book', {
      p_passcode: PASSCODE,
      p_person_id: issuePerson.id,
      p_book_type: issueBookType,
      p_workflow_step_id: stepId,
      p_issued_by_label: repName || null,
      p_note: null,
    });

    if (error) {
      setIssueError(error.message ?? 'Failed to issue book.');
    } else {
      setIssueResult(data as IssueBookResult);
      if ((data as IssueBookResult).ok) {
        loadOutstanding();
      }
    }
    setIssueBusy(false);
  };

  // Person options: dedup queue + outstanding
  const personOptions = [
    ...queue.map((r) => ({ id: r.person_id, name: r.full_name || r.email })),
    ...outstanding.map((r) => ({ id: r.person_id, name: r.full_name || r.email })),
  ].filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i);

  const prefillIssue = (item: OutstandingBook) => {
    setIssuePerson({ id: item.person_id, name: item.full_name || item.email });
    setIssueBookType(item.book_step.toLowerCase().includes('mechanic') ? 'mechanics' : 'rulebook');
    setIssueResult(null);
    setIssueError(null);
    issueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="mb-1 text-lg font-semibold text-slate-900">Board verify — staff access</h1>
            <p className="mb-4 text-sm text-slate-500">Staff passcode required.</p>
            <form onSubmit={handlePasscode} className="flex flex-col gap-3">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Staff passcode"
                autoFocus
                className={inputCls}
              />
              {passcodeError ? <p className="text-sm text-rose-600">Incorrect passcode.</p> : null}
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Enter
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Board verify</h1>
          <p className="mt-1 text-sm text-slate-500">
            Verify manual steps and issue materials. Replace this passcode gate with staff auth before go-live.
          </p>
        </header>

        {/* Rep name */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            Your name <span className="font-normal text-slate-400">(recorded on each action)</span>
            <input
              type="text"
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              placeholder="e.g. James Smith"
              className={`mt-1.5 ${inputCls}`}
            />
          </label>
        </div>

        {/* ── A1: Verify queue ── */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Verify queue</h2>
          {queueLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : queue.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-400">No pending verifications.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((row) => {
                const key = `${row.cycle_id}:${row.workflow_step_id}`;
                const busy = rowBusy[key];
                return (
                  <div key={key} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {row.full_name || row.email}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{row.email}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-sm text-slate-700">{row.step_name}</span>
                          {stepTypeChip(row.step_type)}
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            {row.member_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => handleVerify(row, 'verify')}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busy === 'verify' ? 'Verifying…' : '✓ Verify'}
                      </button>
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          type="text"
                          placeholder="Reject reason (optional)"
                          value={rejectNotes[key] ?? ''}
                          onChange={(e) =>
                            setRejectNotes((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => handleVerify(row, 'reject')}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          {busy === 'reject' ? 'Rejecting…' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── A2: Book issuance ── */}
        <section ref={issueSectionRef}>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Issue books</h2>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <label className="block text-sm font-semibold text-slate-700">
                Official
                <select
                  value={issuePerson?.id ?? ''}
                  onChange={(e) => {
                    const p = personOptions.find((o) => o.id === e.target.value);
                    setIssuePerson(p ?? null);
                    setIssueResult(null);
                    setIssueError(null);
                  }}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="">— select official —</option>
                  {personOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-3">
                {(['rulebook', 'mechanics'] as const).map((type) => {
                  const selected = issueBookType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setIssueBookType(type);
                        setIssueResult(null);
                        setIssueError(null);
                      }}
                      className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition"
                      style={{
                        backgroundColor: selected ? '#0f172a' : 'white',
                        color: selected ? 'white' : '#334155',
                        borderColor: selected ? '#0f172a' : '#e2e8f0',
                      }}
                    >
                      {type === 'rulebook' ? 'Rulebook' : 'Mechanics Manual'}
                    </button>
                  );
                })}
              </div>

              {issueResult && !issueResult.ok ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-amber-800">Already issued</p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Issued on{' '}
                    {new Date(issueResult.issued_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {issueResult.issued_by ? ` by ${issueResult.issued_by}` : ''} — not issuing a
                    second set.
                  </p>
                </div>
              ) : issueResult?.ok ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-emerald-700">
                    Book issued and step marked complete.
                  </p>
                </div>
              ) : issueError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                  <p className="text-sm text-rose-700">{issueError}</p>
                </div>
              ) : null}

              <button
                type="button"
                disabled={issueBusy || !issuePerson}
                onClick={handleIssueBook}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {issueBusy ? 'Issuing…' : 'Issue book'}
              </button>
            </div>
          </div>
        </section>

        {/* ── A3: Outstanding books ── */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Outstanding books</h2>
          {outstandingLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : outstanding.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-400">All officials have received their books.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {outstanding.map((item, i) => (
                  <li
                    key={`${item.person_id}:${item.workflow_step_id}:${i}`}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.full_name || item.email}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.email} · needs {item.book_step}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => prefillIssue(item)}
                      className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Issue
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
