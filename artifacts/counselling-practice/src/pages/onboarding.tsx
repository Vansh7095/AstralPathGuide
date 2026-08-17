import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useClerk, useUser } from '@clerk/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  getGetMyProfileQueryKey,
  useCreateStaffRequest,
  useGetMyProfile,
  useUpdateMyProfile,
} from '@workspace/api-client-react';
import type { AccountType, StaffRequestInput, UserProfileInput } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';

type Step = 'account' | 'profile' | 'review';
type FormValue = string;

const inputClass = 'focus-ring w-full rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/.7)] focus:border-[hsl(var(--primary)/.6)]';
const labelClass = 'mb-2 block text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--primary))]';

function Field({ label, name, value, onChange, placeholder, optional = false, type = 'text', multiline = false }: { label: string; name: string; value: FormValue; onChange: (value: string) => void; placeholder?: string; optional?: boolean; type?: string; multiline?: boolean }) {
  return <label className="block" data-testid={`field-${name}`}>
    <span className={labelClass}>{label} {optional && <span className="font-normal normal-case tracking-normal text-[hsl(var(--muted-foreground))]">(optional)</span>}</span>
    {multiline ? <textarea name={name} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className={`${inputClass} resize-y`} data-testid={`input-${name}`} /> : <input name={name} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} data-testid={`input-${name}`} />}
  </label>;
}

function OnboardingFrame({ step, children, title, description }: { step: Step; children: ReactNode; title: string; description: string }) {
  const { signOut } = useClerk();
  const steps = [{ id: 'account', label: 'Account type' }, { id: 'profile', label: 'Your details' }, { id: 'review', label: 'Review' }];
  const current = steps.findIndex((item) => item.id === step);
  return <div className="grain min-h-[100dvh] bg-[hsl(var(--background))]">
    <header className="border-b border-[hsl(var(--border)/.75)] bg-[hsl(var(--background)/.85)] backdrop-blur-lg">
      <div className="page-wrap flex h-[76px] items-center justify-between">
        <Link href="/" className="focus-ring flex items-center gap-3" data-testid="link-onboarding-logo"><span className="grid size-10 place-items-center rounded-[14px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><HeartHandshake size={19} /></span><span><span className="serif block text-lg font-semibold leading-none text-[hsl(var(--foreground))]">A quieter beginning</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Private onboarding</span></span></Link>
        <button type="button" onClick={() => void signOut()} className="focus-ring rounded-full px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]" data-testid="button-onboarding-sign-out">Sign out</button>
      </div>
    </header>
    <main className="page-wrap grid gap-10 py-10 md:grid-cols-[.72fr_1.28fr] md:py-16">
      <aside className="md:sticky md:top-10 md:self-start">
        <p className="eyebrow">A small first step</p>
        <h1 className="section-title mt-4 max-w-sm text-[hsl(var(--primary))]">{title}</h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-[hsl(var(--muted-foreground))]">{description}</p>
        <div className="mt-9 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))]"><ShieldCheck size={16} /> Your information stays private</div>
          <p className="mt-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]">Only the practice team can see the details needed to respond to you. You can leave optional fields blank.</p>
        </div>
      </aside>
      <section className="rounded-[30px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.66)] p-5 shadow-[var(--shadow-sm)] sm:p-8" data-testid="onboarding-panel">
        <div className="mb-8 flex items-center gap-2" aria-label="Onboarding progress">
          {steps.map((item, index) => <div key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition ${index < current ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : index === current ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}>{index < current ? <Check size={15} /> : index + 1}</div>
            <span className={`hidden truncate text-xs font-bold sm:block ${index === current ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{item.label}</span>
            {index < steps.length - 1 && <span className="mx-1 h-px flex-1 bg-[hsl(var(--border))]" />}
          </div>)}
        </div>
        {children}
      </section>
    </main>
  </div>;
}

function AccountStep({ value, onChoose, onNext }: { value: AccountType | null; onChoose: (value: AccountType) => void; onNext: () => void }) {
  const options = [
    { id: 'client' as const, title: 'I am looking for counselling', text: 'Create a private client profile and make appointment requests at your pace.', icon: HeartHandshake },
    { id: 'staff' as const, title: 'I am a counsellor or practice team member', text: 'Request staff verification. Access is granted only after the practice reviews your details.', icon: ShieldCheck },
    { id: 'admin' as const, title: 'I help administer the practice', text: 'Request administrative verification. Selecting this does not grant admin access.', icon: Sparkles },
  ];
  return <div><p className="eyebrow">Step 1 of 3</p><h2 className="serif mt-3 text-3xl text-[hsl(var(--primary))]">How will you use this space?</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">This helps us show you the right next step. You can change course by contacting the practice.</p>
    <div className="mt-8 space-y-3">{options.map(({ id, title, text, icon: Icon }) => <button type="button" key={id} onClick={() => onChoose(id)} className={`focus-ring flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${value === id ? 'border-[hsl(var(--primary)/.6)] bg-[hsl(var(--secondary)/.65)] shadow-[var(--shadow-sm)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card)/.4)]'}`} data-testid={`button-account-type-${id}`}><span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${value === id ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'}`}><Icon size={19} /></span><span><span className="block font-bold text-[hsl(var(--primary))]">{title}</span><span className="mt-1 block text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</span></span></button>)}</div>
    <div className="mt-8 flex justify-end"><button type="button" disabled={!value} onClick={onNext} className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-onboarding-account-next">Continue <ChevronRight size={16} /></button></div>
  </div>;
}

function ClientStep({ values, setValues, onBack, onNext, busy }: { values: Record<string, string>; setValues: (name: string, value: string) => void; onBack: () => void; onNext: () => void; busy: boolean }) {
  return <div><p className="eyebrow">Step 2 of 3 · Client profile</p><h2 className="serif mt-3 text-3xl text-[hsl(var(--primary))]">Tell us only what feels useful.</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">These details help the practice respond thoughtfully. Nothing here is a test, and optional fields can wait.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2"><Field label="Full name" name="fullName" value={values.fullName} onChange={(v) => setValues('fullName', v)} placeholder="Your name" /><Field label="Preferred name" name="preferredName" value={values.preferredName} onChange={(v) => setValues('preferredName', v)} placeholder="What should we call you?" optional /><Field label="Phone" name="phone" value={values.phone} onChange={(v) => setValues('phone', v)} placeholder="A number we can reach you on" optional type="tel" /><Field label="Date of birth" name="dateOfBirth" value={values.dateOfBirth} onChange={(v) => setValues('dateOfBirth', v)} optional type="date" /><Field label="Preferred contact" name="preferredContactMethod" value={values.preferredContactMethod} onChange={(v) => setValues('preferredContactMethod', v)} placeholder="Email, phone, or WhatsApp" optional /><Field label="Location" name="location" value={values.location} onChange={(v) => setValues('location', v)} placeholder="City or area" optional /><Field label="Preferred format" name="preferredFormat" value={values.preferredFormat} onChange={(v) => setValues('preferredFormat', v)} placeholder="Online, in person, or either" optional /><Field label="Preferred language" name="preferredLanguage" value={values.preferredLanguage} onChange={(v) => setValues('preferredLanguage', v)} placeholder="Language you feel most at ease in" optional /><div className="sm:col-span-2"><Field label="What brings you here?" name="counsellingReason" value={values.counsellingReason} onChange={(v) => setValues('counsellingReason', v)} placeholder="Share as much or as little context as you like" optional multiline /></div><div className="sm:col-span-2"><Field label="What would you like support with?" name="counsellingGoals" value={values.counsellingGoals} onChange={(v) => setValues('counsellingGoals', v)} placeholder="A few words are enough" optional multiline /></div><div className="sm:col-span-2"><Field label="Accessibility needs" name="accessibilityRequirements" value={values.accessibilityRequirements} onChange={(v) => setValues('accessibilityRequirements', v)} placeholder="Anything that would make sessions easier for you" optional multiline /></div></div>
    <div className="mt-8 flex flex-wrap justify-between gap-3"><button type="button" onClick={onBack} className="focus-ring inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary))]" data-testid="button-onboarding-client-back"><ChevronLeft size={16} /> Back</button><button type="button" disabled={busy || values.fullName.trim().length < 2} onClick={onNext} className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-45" data-testid="button-onboarding-client-next">{busy ? 'Saving…' : 'Review details'} <ChevronRight size={16} /></button></div>
  </div>;
}

function StaffStep({ accountType, values, setValues, onBack, onNext, busy }: { accountType: AccountType; values: Record<string, string>; setValues: (name: string, value: string) => void; onBack: () => void; onNext: () => void; busy: boolean }) {
  const isAdmin = accountType === 'admin';
  return <div><p className="eyebrow">Step 2 of 3 · Practice role</p><h2 className="serif mt-3 text-3xl text-[hsl(var(--primary))]">Request a verified practice role.</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Selecting counsellor or admin is a request only. The practice verifies every request server-side before any private access is opened.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2"><Field label="Full name" name="fullName" value={values.fullName} onChange={(v) => setValues('fullName', v)} placeholder="Your professional name" /><Field label="Professional role" name="professionalRole" value={values.professionalRole} onChange={(v) => setValues('professionalRole', v)} placeholder="Counsellor, coordinator, administrator" /><Field label="Phone" name="phone" value={values.phone} onChange={(v) => setValues('phone', v)} placeholder="A number we can reach you on" type="tel" /><Field label="Professional email" name="professionalEmail" value={values.professionalEmail} onChange={(v) => setValues('professionalEmail', v)} placeholder="name@practice.org" optional type="email" /><Field label="Qualification" name="qualification" value={values.qualification} onChange={(v) => setValues('qualification', v)} placeholder="Relevant qualification or training" /><Field label="Years of experience" name="experienceYears" value={values.experienceYears} onChange={(v) => setValues('experienceYears', v)} placeholder="0" optional type="number" /><Field label="Areas of expertise" name="expertise" value={values.expertise} onChange={(v) => setValues('expertise', v)} placeholder="The work you do best" /><Field label="Languages spoken" name="languagesSpoken" value={values.languagesSpoken} onChange={(v) => setValues('languagesSpoken', v)} placeholder="Languages you can work in" /><Field label={isAdmin ? "Admin verification code" : "Practice verification code"} name="authorizationCode" value={values.authorizationCode} onChange={(v) => setValues('authorizationCode', v)} placeholder="Enter the code shared by the practice" type="password" /><div className="sm:col-span-2"><Field label="Availability preferences" name="availabilityPreferences" value={values.availabilityPreferences} onChange={(v) => setValues('availabilityPreferences', v)} placeholder="Days, hours, or other useful context" optional multiline /></div></div>
    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[hsl(var(--accent)/.12)] p-4 text-xs leading-6 text-[hsl(var(--accent-foreground))]"><CircleAlert size={17} className="mt-0.5 shrink-0" /><span>This code is checked privately by the server. A valid code confirms the request is associated with the practice; final access still follows the practice’s verification process.</span></div>
    <div className="mt-8 flex flex-wrap justify-between gap-3"><button type="button" onClick={onBack} className="focus-ring inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary))]" data-testid="button-onboarding-staff-back"><ChevronLeft size={16} /> Back</button><button type="button" disabled={busy || values.fullName.trim().length < 2 || values.professionalRole.trim().length < 2 || values.qualification.trim().length < 2 || values.expertise.trim().length < 2 || values.languagesSpoken.trim().length < 2 || values.phone.trim().length < 7 || values.authorizationCode.trim().length < 1} onClick={onNext} className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-45" data-testid="button-onboarding-staff-next">{busy ? 'Saving…' : 'Review request'} <ChevronRight size={16} /></button></div>
  </div>;
}

function ReviewStep({ accountType, values, onBack, onSubmit, busy, error }: { accountType: AccountType; values: Record<string, string>; onBack: () => void; onSubmit: () => void; busy: boolean; error: string | null }) {
  const isClient = accountType === 'client';
  const summary = isClient ? [['Account type', 'Client'], ['Full name', values.fullName], ['Preferred format', values.preferredFormat || 'Not specified'], ['Preferred language', values.preferredLanguage || 'Not specified']] : [['Requested role', accountType === 'admin' ? 'Practice administrator' : 'Counsellor / practice team'], ['Full name', values.fullName], ['Professional role', values.professionalRole], ['Experience', values.experienceYears ? `${values.experienceYears} years` : 'Not specified'], ['Verification code', values.authorizationCode ? 'Provided' : 'Missing']];
  return <div><p className="eyebrow">Step 3 of 3 · Review</p><h2 className="serif mt-3 text-3xl text-[hsl(var(--primary))]">Does this feel right?</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">You can return to make changes. Your information is sent securely to this practice only when you submit.</p><div className="mt-8 divide-y divide-[hsl(var(--border))] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)]">{summary.map(([label, value]) => <div key={label} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{label}</span><span className="text-sm font-semibold text-[hsl(var(--primary))]">{value}</span></div>)}</div>{!isClient && <div className="mt-5 rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[hsl(var(--secondary)/.45)] p-4 text-sm leading-6 text-[hsl(var(--primary))]"><Clock3 size={17} className="mb-2" /><strong>Verification comes next.</strong> This request is not approval. A practice administrator will review it server-side.</div>}{error && <div className="mt-5 rounded-2xl bg-[hsl(var(--destructive)/.08)] p-4 text-sm text-[hsl(var(--destructive))]" data-testid="status-onboarding-error">{error}</div>}<div className="mt-8 flex flex-wrap justify-between gap-3"><button type="button" onClick={onBack} className="focus-ring inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary))]" data-testid="button-onboarding-review-back"><ChevronLeft size={16} /> Back</button><button type="button" disabled={busy} onClick={onSubmit} className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-45" data-testid="button-onboarding-submit">{busy ? 'Saving securely…' : isClient ? 'Save my profile' : 'Send verification request'} <Check size={16} /></button></div></div>;
}

function CompleteStep({ accountType }: { accountType: AccountType }) {
  const isClient = accountType === 'client';
  return <div className="py-8 text-center" data-testid="status-onboarding-complete"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Check size={30} /></div><p className="eyebrow mt-7">You are all set</p><h2 className="serif mt-3 text-3xl text-[hsl(var(--primary))]">{isClient ? 'Your private profile is ready.' : 'Your request is with the practice.'}</h2><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[hsl(var(--muted-foreground))]">{isClient ? 'You can now request a first appointment whenever you feel ready.' : 'Verification is handled server-side. We will update your access status after review.'}</p><Link href={isClient ? '/dashboard' : '/staff'} className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-onboarding-destination">Go to my workspace <ChevronRight size={16} /></Link></div>;
}

export default function Onboarding() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const profileQuery = useGetMyProfile({ query: { enabled: isLoaded && !!isSignedIn, queryKey: getGetMyProfileQueryKey() } });
  const updateProfile = useUpdateMyProfile();
  const createStaffRequest = useCreateStaffRequest();
  const [step, setStep] = useState<Step>('account');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValuesState] = useState<Record<string, string>>({
    fullName: '', preferredName: '', phone: '', dateOfBirth: '', preferredContactMethod: '', location: '', emergencyContactName: '', emergencyContactPhone: '', counsellingReason: '', preferredFormat: '', preferredLanguage: '', accessibilityRequirements: '', counsellingGoals: '', professionalRole: '', professionalEmail: '', qualification: '', experienceYears: '', expertise: '', languagesSpoken: '', availabilityPreferences: '', authorizationCode: '',
  });
  const valuesWithUser: Record<string, string> = useMemo(() => ({ ...values, fullName: values.fullName || user?.fullName || '' }), [user?.fullName, values]);
  const setValues = (name: string, value: string) => setValuesState((current) => ({ ...current, [name]: value }));
  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation('/sign-in?redirect_url=/onboarding');
    if (profileQuery.data?.role === 'admin' && !complete) setLocation('/admin');
    else if (profileQuery.data?.onboardingStatus === 'complete' && !complete) {
      if (profileQuery.data.role === 'admin') setLocation('/admin');
      else if (profileQuery.data.role === 'staff' || profileQuery.data.accountType === 'staff' || profileQuery.data.accountType === 'admin') setLocation('/staff');
      else setLocation('/dashboard');
    }
  }, [complete, isLoaded, isSignedIn, profileQuery.data, setLocation]);
  if (!isLoaded || profileQuery.isLoading) return <div className="grid min-h-[100dvh] place-items-center bg-[hsl(var(--background))]"><div className="w-full max-w-md space-y-3 px-6"><div className="h-4 w-1/3 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="h-10 w-full animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /><div className="h-24 w-full animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /></div></div>;
  if (!isSignedIn) return null;
  if (profileQuery.error) return <OnboardingFrame step="account" title="We could not open your profile." description="Please try again. Your account is safe, and no changes were made."><div className="rounded-2xl bg-[hsl(var(--destructive)/.08)] p-5 text-sm text-[hsl(var(--destructive))]"><CircleAlert size={18} className="mb-2" />Something went wrong while loading your profile.</div><button type="button" onClick={() => void profileQuery.refetch()} className="focus-ring mt-6 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-onboarding-retry">Try again</button></OnboardingFrame>;
  if (complete) return <OnboardingFrame step="review" title="A considered space starts with clarity." description="Your workspace will reflect the information you chose to share."><CompleteStep accountType={accountType ?? 'client'} /></OnboardingFrame>;
  const save = () => {
    if (!accountType) return;
    setError(null);
    const profile: UserProfileInput = {
      accountType,
      fullName: valuesWithUser.fullName.trim(),
      preferredName: valuesWithUser.preferredName || null,
      phone: valuesWithUser.phone || null,
      dateOfBirth: valuesWithUser.dateOfBirth || null,
      preferredContactMethod: valuesWithUser.preferredContactMethod || null,
      location: valuesWithUser.location || null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      counsellingReason: valuesWithUser.counsellingReason || null,
      preferredFormat: valuesWithUser.preferredFormat || null,
      preferredLanguage: valuesWithUser.preferredLanguage || null,
      accessibilityRequirements: valuesWithUser.accessibilityRequirements || null,
      counsellingGoals: valuesWithUser.counsellingGoals || null,
    };
    updateProfile.mutate({ data: profile }, {
      onSuccess: (nextProfile) => {
        queryClient.setQueryData(getGetMyProfileQueryKey(), nextProfile);
        if (accountType === 'client') { setComplete(true); return; }
        const request: StaffRequestInput = {
          requestedRole: accountType === 'admin' ? 'admin' : 'staff',
          fullName: profile.fullName,
          professionalRole: valuesWithUser.professionalRole.trim(),
          phone: valuesWithUser.phone.trim(),
          professionalEmail: valuesWithUser.professionalEmail || null,
          qualification: valuesWithUser.qualification.trim(),
          experienceYears: valuesWithUser.experienceYears ? Number(valuesWithUser.experienceYears) : null,
          expertise: valuesWithUser.expertise.trim(),
          languagesSpoken: valuesWithUser.languagesSpoken.trim(),
          availabilityPreferences: valuesWithUser.availabilityPreferences || null,
          authorizationCode: valuesWithUser.authorizationCode.trim(),
        };
        createStaffRequest.mutate({ data: request }, { onSuccess: () => setComplete(true), onError: (err) => setError(err instanceof Error ? err.message : 'We could not send the verification request.') });
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'We could not save your profile.'),
    });
  };
  const busy = updateProfile.isPending || createStaffRequest.isPending;
  return <OnboardingFrame step={step} title="Let’s make your next step easier." description="A few details help this practice meet you with the right context, without asking you to tell your whole story at once.">
    {step === 'account' && <AccountStep value={accountType} onChoose={(value) => { setAccountType(value); setValuesState((current) => ({ ...current, fullName: current.fullName || user?.fullName || '' })); }} onNext={() => setStep('profile')} />}
    {step === 'profile' && accountType === 'client' && <ClientStep values={valuesWithUser} setValues={setValues} onBack={() => setStep('account')} onNext={() => setStep('review')} busy={busy} />}
    {step === 'profile' && accountType && accountType !== 'client' && <StaffStep accountType={accountType} values={valuesWithUser} setValues={setValues} onBack={() => setStep('account')} onNext={() => setStep('review')} busy={busy} />}
    {step === 'review' && accountType && <ReviewStep accountType={accountType} values={valuesWithUser} onBack={() => setStep('profile')} onSubmit={save} busy={busy} error={error} />}
  </OnboardingFrame>;
}