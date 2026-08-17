import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Edit3,
  HeartHandshake,
  Inbox,
  Leaf,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Phone,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import {
  getGetAdminAppointmentsQueryKey,
  getGetAdminAvailabilityQueryKey,
  getGetAdminContactMessagesQueryKey,
  getGetAdminFaqsQueryKey,
  getGetAdminServicesQueryKey,
  getGetAvailabilityQueryKey,
  getGetFaqsQueryKey,
  getGetServicesQueryKey,
  getGetSiteContentQueryKey,
  useCreateAdminFaq,
  useCreateAdminService,
  useCreateAppointment,
  useCreateContactMessage,
  useDeleteAdminFaq,
  useDeleteAdminService,
  useGetAdminAppointments,
  useGetAdminAvailability,
  useGetAdminContactMessages,
  useGetAdminFaqs,
  useGetAdminServices,
  useGetAvailability,
  useGetFaqs,
  useGetServices,
  useGetSiteContent,
  useUpdateAdminAppointment,
  useUpdateAdminAvailability,
  useUpdateAdminFaq,
  useUpdateAdminService,
} from '@workspace/api-client-react';
import type { AdminFaq, AdminService, AppointmentStatusProperty, Faq, Service, SiteContent } from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, Show, SignIn, SignUp, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#2f6b62',
    colorForeground: '#233b36',
    colorMutedForeground: '#687a75',
    colorDanger: '#b85d50',
    colorBackground: '#f7f3ec',
    colorInput: '#fffdf9',
    colorInputForeground: '#233b36',
    colorNeutral: '#d9d2c5',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#f7f3ec] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#233b36]',
    headerSubtitle: 'text-[#687a75]',
    socialButtonsBlockButtonText: 'text-[#233b36]',
    formFieldLabel: 'text-[#233b36]',
    footerActionLink: 'text-[#2f6b62]',
    footerActionText: 'text-[#687a75]',
    dividerText: 'text-[#687a75]',
    alertText: 'text-[#b85d50]',
    formButtonPrimary: 'bg-[#2f6b62] hover:bg-[#25584f]',
    formFieldInput: 'bg-[#fffdf9] text-[#233b36] border-[#d9d2c5]',
    socialButtonsBlockButton: 'bg-[#fffdf9] border-[#d9d2c5]',
    main: 'bg-transparent',
  },
};

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faqs', label: 'FAQs' },
];

const fallbackContent: SiteContent = {
  practiceName: 'Practice name pending',
  counsellorName: 'Counsellor details pending',
  heroTitle: 'A little more room to be human.',
  heroDescription: 'A thoughtful, private first step for making sense of what you are carrying — at a pace that respects you.',
  about: 'This practice is preparing its public introduction. More information about the counsellor and approach will be published here soon.',
  qualifications: [],
  languages: [],
  location: 'Location to be published',
  onlineAvailable: false,
  phone: null,
  whatsapp: null,
  email: null,
  address: null,
  workingHours: [],
  timezone: 'Timezone to be published',
  currency: 'INR',
  emergencyDisclaimer: 'This service is not an emergency service. If you may be in immediate danger, contact local emergency services or a crisis support line in your area.',
  isPlaceholder: true,
};

function errorText(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'Something could not be loaded right now.';
}

function PlaceholderBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--accent)/.45)] bg-[hsl(var(--accent)/.12)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--accent-foreground))]" data-testid="badge-unpublished">
      <CircleAlert size={12} /> Unpublished placeholder
    </span>
  );
}

function DataState({ kind, message, onRetry }: { kind: 'loading' | 'error' | 'empty'; message?: string; onRetry?: () => void }) {
  if (kind === 'loading') {
    return <div className="space-y-3" data-testid="state-loading"><div className="h-5 w-2/3 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="h-4 w-full animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="h-4 w-5/6 animate-pulse rounded bg-[hsl(var(--muted))]" /></div>;
  }
  if (kind === 'error') {
    return <div className="rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.06)] p-5 text-sm" data-testid="state-error"><div className="flex items-center gap-2 font-semibold text-[hsl(var(--destructive))]"><CircleAlert size={17} /> {message ?? 'We could not load this just now.'}</div>{onRetry && <button type="button" onClick={onRetry} className="focus-ring mt-4 rounded-full border border-[hsl(var(--destructive)/.35)] px-4 py-2 text-xs font-bold hover:bg-[hsl(var(--destructive)/.1)]" data-testid="button-retry">Try again</button>}</div>;
  }
  return <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]" data-testid="state-empty">{message ?? 'There is nothing published here yet.'}</div>;
}

function ButtonLink({ href, children, secondary = false, className = '', testId }: { href: string; children: ReactNode; secondary?: boolean; className?: string; testId: string }) {
  return <Link href={href} className={`focus-ring inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition duration-200 hover:-translate-y-0.5 ${secondary ? 'border border-[hsl(var(--primary)/.28)] bg-[hsl(var(--card)/.5)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-sm)] hover:bg-[hsl(var(--primary)/.9)]'} ${className}`} data-testid={testId}>{children}</Link>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const contentQuery = useGetSiteContent({ query: { queryKey: getGetSiteContentQueryKey() } });
  const content = contentQuery.data ?? fallbackContent;
  const practiceName = content.practiceName || fallbackContent.practiceName;

  useEffect(() => setMobileOpen(false), [location]);

  return (
    <div className="grain min-h-[100dvh] overflow-x-hidden bg-[hsl(var(--background))]">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border)/.7)] bg-[hsl(var(--background)/.9)] backdrop-blur-lg">
        <div className="page-wrap flex h-[76px] items-center justify-between">
          <Link href="/" className="focus-ring group flex items-center gap-3" data-testid="link-logo">
            <span className="relative grid size-10 place-items-center rounded-[14px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-sm)] transition group-hover:rotate-3"><Leaf size={19} strokeWidth={1.7} /><span className="absolute -right-1 -top-1 size-2 rounded-full bg-[hsl(var(--accent))]" /></span>
            <span><span className="serif block text-lg font-semibold leading-none text-[hsl(var(--foreground))]">{practiceName}</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Counselling practice</span></span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
            {navItems.map((item) => <Link key={item.href} href={item.href} className={`focus-ring relative py-2 text-sm font-semibold transition after:absolute after:bottom-0 after:left-0 after:h-px after:bg-[hsl(var(--accent))] after:transition-all ${location === item.href ? 'text-[hsl(var(--primary))] after:w-full' : 'text-[hsl(var(--muted-foreground))] after:w-0 hover:text-[hsl(var(--primary))] hover:after:w-full'}`} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}>{item.label}</Link>)}
          </nav>
          <div className="hidden items-center gap-3 lg:flex"><ButtonLink href="/contact" secondary testId="link-header-contact">Get in touch</ButtonLink><ButtonLink href="/book" testId="link-header-book">Request an appointment <ArrowUpRight size={15} /></ButtonLink></div>
          <button type="button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen((value) => !value)} className="focus-ring grid size-11 place-items-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--primary))] lg:hidden" data-testid="button-mobile-menu">{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
        {mobileOpen && <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 pb-5 pt-3 lg:hidden" data-testid="mobile-navigation"><nav className="page-wrap flex flex-col" aria-label="Mobile navigation">{navItems.map((item) => <Link key={item.href} href={item.href} className={`focus-ring border-b border-[hsl(var(--border)/.7)] py-4 text-base font-semibold ${location === item.href ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`} data-testid={`link-mobile-${item.label.toLowerCase().replaceAll(' ', '-')}`}>{item.label}</Link>)}<div className="mt-4 grid grid-cols-2 gap-2"><ButtonLink href="/contact" secondary testId="link-mobile-contact">Get in touch</ButtonLink><ButtonLink href="/book" testId="link-mobile-book">Book a first step</ButtonLink></div></nav></div>}
      </header>
      <main>{children}</main>
      <Footer content={content} />
    </div>
  );
}

function Footer({ content }: { content: SiteContent }) {
  return <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><div className="page-wrap grid gap-12 py-14 md:grid-cols-[1.35fr_1fr_1fr] md:py-20"><div><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-[14px] bg-[hsl(var(--primary-foreground)/.12)]"><Leaf size={19} /></span><span className="serif text-xl">{content.practiceName || fallbackContent.practiceName}</span></div><p className="mt-5 max-w-sm text-sm leading-7 text-[hsl(var(--primary-foreground)/.66)]">A quieter place to begin thinking, feeling, and finding your next small step.</p><div className="mt-8 flex gap-3"><Link href="/book" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--accent-foreground))]" data-testid="link-footer-book">Request an appointment <ArrowUpRight size={14} /></Link></div></div><div><p className="eyebrow !text-[hsl(var(--primary-foreground)/.6)]">Explore</p><div className="mt-4 flex flex-col items-start gap-3 text-sm text-[hsl(var(--primary-foreground)/.75)]">{navItems.slice(1).map((item) => <Link key={item.href} href={item.href} className="focus-ring hover:text-[hsl(var(--primary-foreground))]" data-testid={`link-footer-${item.label.toLowerCase().replaceAll(' ', '-')}`}>{item.label}</Link>)}</div></div><div><p className="eyebrow !text-[hsl(var(--primary-foreground)/.6)]">Trust & boundaries</p><div className="mt-4 flex flex-col items-start gap-3 text-sm text-[hsl(var(--primary-foreground)/.75)]"><Link href="/privacy" className="focus-ring hover:text-[hsl(var(--primary-foreground))]" data-testid="link-footer-privacy">Privacy</Link><Link href="/terms" className="focus-ring hover:text-[hsl(var(--primary-foreground))]" data-testid="link-footer-terms">Terms of use</Link><Link href="/disclaimer" className="focus-ring hover:text-[hsl(var(--primary-foreground))]" data-testid="link-footer-disclaimer">Important disclaimer</Link><Link href="/admin" className="focus-ring hover:text-[hsl(var(--primary-foreground))]" data-testid="link-footer-admin">Practice admin</Link></div></div></div><div className="page-wrap flex flex-col gap-2 border-t border-[hsl(var(--primary-foreground)/.15)] py-5 text-xs text-[hsl(var(--primary-foreground)/.55)] sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} {content.practiceName || fallbackContent.practiceName}. Public information only.</span><span>{content.timezone || fallbackContent.timezone}</span></div></footer>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <section className="relative overflow-hidden border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)]"><div className="page-wrap relative py-20 md:py-28"><div className="absolute -right-12 -top-20 size-64 rounded-full border border-[hsl(var(--accent)/.25)] md:size-96" /><div className="absolute -right-2 top-8 size-48 rounded-full border border-[hsl(var(--accent)/.2)] md:size-72" /><div className="relative max-w-3xl animate-rise-in"><p className="eyebrow">{eyebrow}</p><h1 className="section-title mt-5 max-w-3xl text-[hsl(var(--primary))]" data-testid="text-page-title">{title}</h1>{description && <p className="mt-6 max-w-2xl text-lg leading-8 text-[hsl(var(--muted-foreground))]" data-testid="text-page-description">{description}</p>}{action && <div className="mt-8">{action}</div>}</div></div></section>;
}

function Home() {
  const contentQuery = useGetSiteContent({ query: { queryKey: getGetSiteContentQueryKey() } });
  const servicesQuery = useGetServices({ query: { queryKey: getGetServicesQueryKey() } });
  const faqsQuery = useGetFaqs({ query: { queryKey: getGetFaqsQueryKey() } });
  const content = contentQuery.data ?? fallbackContent;
  const services = servicesQuery.data ?? [];
  const faqs = faqsQuery.data ?? [];
  const previewFaqs = faqs.slice(0, 3);

  return <div>
    <section className="relative overflow-hidden bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><div className="page-wrap relative grid min-h-[640px] items-center gap-12 py-20 md:min-h-[710px] md:grid-cols-[1.07fr_.93fr] md:py-24"><div className="relative z-10 max-w-2xl animate-rise-in"><p className="eyebrow !text-[hsl(var(--accent))]">A private first step</p><h1 className="display-title mt-6">{content.heroTitle || fallbackContent.heroTitle}</h1><p className="mt-7 max-w-xl text-base leading-8 text-[hsl(var(--primary-foreground)/.72)] md:text-lg">{content.heroDescription || fallbackContent.heroDescription}</p><div className="mt-9 flex flex-wrap gap-3"><ButtonLink href="/book" testId="link-hero-book">Request an appointment <ArrowUpRight size={16} /></ButtonLink><ButtonLink href="/how-it-works" secondary className="border-[hsl(var(--primary-foreground)/.28)] bg-transparent text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-foreground)/.1)]" testId="link-hero-process">See how it works</ButtonLink></div><div className="mt-14 flex flex-wrap gap-x-7 gap-y-3 text-xs text-[hsl(var(--primary-foreground)/.65)]"><span className="flex items-center gap-2"><LockKeyhole size={14} /> Private by design</span><span className="flex items-center gap-2"><HeartHandshake size={14} /> No pressure to perform</span></div></div><div className="relative hidden h-[440px] md:block animate-rise-in delay-200"><div className="absolute left-[13%] top-[5%] h-[390px] w-[78%] rotate-[5deg] rounded-[48%_48%_38%_40%] border border-[hsl(var(--primary-foreground)/.25)] bg-[hsl(var(--primary-foreground)/.06)]" /><div className="absolute left-[23%] top-[14%] h-[350px] w-[63%] -rotate-[8deg] rounded-[46%_54%_41%_48%] bg-[hsl(var(--accent)/.88)]" /><div className="absolute left-[30%] top-[22%] h-[310px] w-[52%] rotate-[3deg] rounded-[48%_45%_51%_42%] bg-[hsl(var(--secondary))]" /><div className="absolute left-[42%] top-[38%] size-24 rounded-full border border-[hsl(var(--primary))] bg-[hsl(var(--background))]" /><div className="absolute left-[25%] top-[58%] size-20 rounded-full bg-[hsl(var(--primary))]" /><div className="absolute bottom-[8%] left-[2%] rounded-2xl border border-[hsl(var(--primary-foreground)/.25)] bg-[hsl(var(--primary-foreground)/.08)] px-4 py-3 text-xs backdrop-blur-sm"><span className="block font-bold">Your pace matters</span><span className="mt-1 block text-[hsl(var(--primary-foreground)/.6)]">Start where you are.</span></div><div className="absolute right-[3%] top-[8%] flex size-20 animate-float-soft items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Sparkles size={24} /></div></div></div><div className="absolute -bottom-28 -left-20 size-64 rounded-full border border-[hsl(var(--accent)/.2)]" /><div className="absolute right-0 top-0 h-full w-1/3 bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/.04))]" /></section>
    {content.isPlaceholder && <div className="border-b border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.1)]"><div className="page-wrap flex items-center gap-2 py-3 text-xs text-[hsl(var(--accent-foreground))]" data-testid="notice-home-placeholder"><CircleAlert size={14} /><span>This public practice profile is still being prepared. Any marked details are not yet published.</span></div></div>}
    <section className="page-wrap grid gap-12 py-20 md:grid-cols-[.8fr_1.2fr] md:py-28"><div><p className="eyebrow">A place to arrive</p><h2 className="section-title mt-4 text-[hsl(var(--primary))]">You do not have to have the right words.</h2></div><div className="max-w-xl"><p className="text-lg leading-8 text-[hsl(var(--muted-foreground))]">{content.about || fallbackContent.about}</p><ButtonLink href="/about" secondary className="mt-7" testId="link-home-about">Meet the practice <ArrowUpRight size={15} /></ButtonLink></div></section>
    <section className="bg-[hsl(var(--secondary)/.6)] py-20 md:py-28"><div className="page-wrap"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow">Ways we can begin</p><h2 className="section-title mt-4 max-w-xl text-[hsl(var(--primary))]">Support shaped around the present moment.</h2></div><ButtonLink href="/services" secondary testId="link-home-services">View all services <ArrowUpRight size={15} /></ButtonLink></div><div className="mt-12 grid gap-4 md:grid-cols-2">{servicesQuery.isLoading ? <div className="md:col-span-2"><DataState kind="loading" /></div> : servicesQuery.isError ? <div className="md:col-span-2"><DataState kind="error" message={errorText(servicesQuery.error)} onRetry={() => void servicesQuery.refetch()} /></div> : services.length === 0 ? <div className="md:col-span-2"><DataState kind="empty" message="Published service details will appear here soon." /></div> : services.slice(0, 4).map((service, index) => <ServiceCard service={service} index={index} key={service.id} />)}</div></div></section>
    <section className="page-wrap grid gap-12 py-20 md:grid-cols-[1fr_1.05fr] md:py-28"><div><p className="eyebrow">A simple rhythm</p><h2 className="section-title mt-4 text-[hsl(var(--primary))]">No performance. No perfect starting point.</h2><p className="mt-6 max-w-md leading-7 text-[hsl(var(--muted-foreground))]">The first conversation is a chance to see whether this feels like a useful space for you. It can be practical, exploratory, or simply a beginning.</p><ButtonLink href="/how-it-works" className="mt-7" testId="link-home-how-it-works">Understand the process <ArrowUpRight size={15} /></ButtonLink></div><div className="grid gap-4 sm:grid-cols-3 md:pt-16"><ProcessStep n="01" title="Reach out" text="Share only what feels comfortable." /><ProcessStep n="02" title="Find a fit" text="Talk through what you need." /><ProcessStep n="03" title="Take your time" text="Move forward at a human pace." /></div></section>
    <section className="bg-[hsl(var(--primary))] py-20 text-[hsl(var(--primary-foreground))] md:py-28"><div className="page-wrap grid gap-12 md:grid-cols-[.75fr_1.25fr]"><div><p className="eyebrow !text-[hsl(var(--accent))]">Questions are welcome</p><h2 className="section-title mt-4">A first step can be small.</h2><p className="mt-6 max-w-sm leading-7 text-[hsl(var(--primary-foreground)/.68)]">Read through a few practical answers, then choose the next step that feels most manageable.</p><ButtonLink href="/faqs" secondary className="mt-7 border-[hsl(var(--primary-foreground)/.3)] bg-transparent text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-foreground)/.1)]" testId="link-home-faqs">Browse FAQs <ArrowUpRight size={15} /></ButtonLink></div><div className="divide-y divide-[hsl(var(--primary-foreground)/.15)]">{faqsQuery.isLoading ? <DataState kind="loading" /> : faqsQuery.isError ? <DataState kind="error" message={errorText(faqsQuery.error)} onRetry={() => void faqsQuery.refetch()} /> : previewFaqs.length === 0 ? <DataState kind="empty" message="FAQs will be published here soon." /> : previewFaqs.map((faq) => <FaqItem faq={faq} key={faq.id} dark />)}</div></div></section>
    <CtaBand />
  </div>;
}

function ServiceCard({ service, index }: { service: Service; index: number }) {
  return <article className={`group relative rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${index === 0 ? 'md:row-span-2 md:p-9' : ''}`} data-testid={`card-service-${service.id}`}><div className="flex items-start justify-between gap-4"><span className="serif text-4xl text-[hsl(var(--accent))]">0{index + 1}</span>{service.isPlaceholder && <PlaceholderBadge />}</div><h3 className="serif mt-8 text-2xl text-[hsl(var(--primary))]">{service.name}</h3><p className="mt-3 leading-7 text-[hsl(var(--muted-foreground))]">{service.description}</p><div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-[hsl(var(--primary))]"><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5">{service.durationMinutes ? `${service.durationMinutes} minutes` : 'Session details pending'}</span>{service.priceInr != null && <span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5">{service.priceInr} INR</span>}</div><Link href="/book" className="focus-ring mt-7 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))] opacity-0 transition group-hover:opacity-100" data-testid={`link-service-book-${service.id}`}>Request this service <ArrowUpRight size={15} /></Link></article>;
}

function ProcessStep({ n, title, text }: { n: string; title: string; text: string }) {
  return <div className="relative border-l border-[hsl(var(--accent)/.5)] pl-5"><span className="eyebrow text-[hsl(var(--accent-foreground))]">{n}</span><h3 className="mt-3 font-bold text-[hsl(var(--primary))]">{title}</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>;
}

function FaqItem({ faq, dark = false }: { faq: Faq; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="py-5" data-testid={`faq-${faq.id}`}><button type="button" onClick={() => setOpen((value) => !value)} className={`focus-ring flex w-full items-center justify-between gap-5 text-left text-base font-semibold ${dark ? 'text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--primary))]'}`} aria-expanded={open} data-testid={`button-faq-${faq.id}`}><span>{faq.question}</span><ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <p className={`mt-4 max-w-2xl pr-7 text-sm leading-7 ${dark ? 'text-[hsl(var(--primary-foreground)/.66)]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid={`text-faq-answer-${faq.id}`}>{faq.answer}</p>}</div>;
}

function CtaBand() {
  return <section className="page-wrap py-20 md:py-28"><div className="relative overflow-hidden rounded-[30px] bg-[hsl(var(--accent))] px-7 py-12 text-[hsl(var(--accent-foreground))] md:px-16 md:py-16"><div className="absolute -right-10 -top-20 size-60 rounded-full border border-[hsl(var(--accent-foreground)/.2)]" /><div className="relative max-w-2xl"><p className="eyebrow !text-[hsl(var(--accent-foreground)/.7)]">Whenever you are ready</p><h2 className="section-title mt-4">A conversation starts here.</h2><p className="mt-5 max-w-lg leading-7 text-[hsl(var(--accent-foreground)/.72)]">You can ask a question, share a little context, or request a time. There is no need to explain everything at once.</p><div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/book" className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" testId="link-cta-book">Request an appointment <ArrowUpRight size={15} /></ButtonLink><ButtonLink href="/contact" secondary className="border-[hsl(var(--accent-foreground)/.3)] bg-transparent text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent-foreground)/.1)]" testId="link-cta-contact">Ask a question</ButtonLink></div></div></div></section>;
}

function About() {
  const query = useGetSiteContent({ query: { queryKey: getGetSiteContentQueryKey() } });
  const content = query.data ?? fallbackContent;
  return <div><PageIntro eyebrow="The practice" title="A counselling space made for honesty, not performance." description="Thoughtful support begins with a relationship that feels respectful, clear, and human." action={<ButtonLink href="/book" testId="link-about-book">Take a first step <ArrowUpRight size={15} /></ButtonLink>} /><section className="page-wrap grid gap-14 py-20 md:grid-cols-[.8fr_1.2fr] md:py-28"><div className="relative"><div className="sticky top-28 rounded-[28px] bg-[hsl(var(--primary))] p-8 text-[hsl(var(--primary-foreground))]"><div className="grid size-16 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><UserRound size={28} /></div><p className="eyebrow mt-8 !text-[hsl(var(--accent))]">Counsellor</p><h2 className="serif mt-3 text-3xl">{content.counsellorName || fallbackContent.counsellorName}</h2>{content.isPlaceholder && <div className="mt-5"><PlaceholderBadge /></div>}<p className="mt-7 text-sm leading-7 text-[hsl(var(--primary-foreground)/.67)]">Personal details and the practice story will be shared here when this profile is ready to be published.</p></div></div><div><p className="eyebrow">An introduction</p><h2 className="section-title mt-4 text-[hsl(var(--primary))]">There is value in being met with care and curiosity.</h2><p className="mt-7 whitespace-pre-line text-lg leading-8 text-[hsl(var(--muted-foreground))]">{content.about || fallbackContent.about}</p><div className="mt-14 grid gap-4 border-t border-[hsl(var(--border))] pt-8 sm:grid-cols-2"><InfoBlock icon={<MapPin size={17} />} label="Based in" value={content.location || fallbackContent.location} placeholder={content.isPlaceholder} /><InfoBlock icon={<MessageCircle size={17} />} label="Sessions" value={content.onlineAvailable ? 'In person and online' : 'Details to be published'} placeholder={content.isPlaceholder || !content.onlineAvailable} /></div></div></section><section className="bg-[hsl(var(--secondary)/.55)] py-20 md:py-28"><div className="page-wrap grid gap-12 md:grid-cols-2"><div><p className="eyebrow">Practice information</p><h2 className="section-title mt-4 text-[hsl(var(--primary))]">Clear about what is known — and what is still to come.</h2></div><div className="space-y-8"><InfoList title="Qualifications" values={content.qualifications} placeholder={content.isPlaceholder} /><InfoList title="Languages" values={content.languages} placeholder={content.isPlaceholder} /></div></div></section><CtaBand /></div>;
}

function InfoBlock({ icon, label, value, placeholder }: { icon: ReactNode; label: string; value: string; placeholder?: boolean }) {
  return <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="flex items-center gap-2 text-[hsl(var(--primary))]">{icon}<span className="text-xs font-bold uppercase tracking-[.12em]">{label}</span></div><p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]" data-testid={`text-info-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p>{placeholder && <div className="mt-3"><PlaceholderBadge /></div>}</div>;
}

function InfoList({ title, values, placeholder }: { title: string; values: string[]; placeholder?: boolean }) {
  return <div className="border-b border-[hsl(var(--border))] pb-7"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[hsl(var(--primary))]">{title}</h3>{placeholder && <PlaceholderBadge />}</div>{values.length > 0 ? <ul className="mt-4 space-y-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{values.map((value) => <li key={value} className="flex gap-2"><Check size={16} className="mt-1 shrink-0 text-[hsl(var(--accent-foreground))]" />{value}</li>)}</ul> : <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">Not published yet.</p>}</div>;
}

function Services() {
  const query = useGetServices({ query: { queryKey: getGetServicesQueryKey() } });
  const services = query.data ?? [];
  return <div><PageIntro eyebrow="Services" title="Support for the parts of life that feel difficult to hold alone." description="Published service details are listed below. If you are unsure what may fit, you are welcome to ask before requesting an appointment." action={<ButtonLink href="/contact" secondary testId="link-services-question">Ask a question <ArrowUpRight size={15} /></ButtonLink>} /><section className="page-wrap py-20 md:py-28">{query.isLoading ? <DataState kind="loading" /> : query.isError ? <DataState kind="error" message={errorText(query.error)} onRetry={() => void query.refetch()} /> : services.length === 0 ? <DataState kind="empty" message="No counselling services have been published yet." /> : <div className="grid gap-5 md:grid-cols-2">{services.map((service, index) => <DetailedService service={service} index={index} key={service.id} />)}</div>}</section><CtaBand /></div>;
}

function DetailedService({ service, index }: { service: Service; index: number }) {
  return <article className="rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 md:p-10" data-testid={`service-detail-${service.id}`}><div className="flex items-start justify-between gap-4"><span className="serif text-5xl text-[hsl(var(--accent))]">0{index + 1}</span>{service.isPlaceholder && <PlaceholderBadge />}</div><h2 className="serif mt-9 text-3xl text-[hsl(var(--primary))]">{service.name}</h2><p className="mt-4 leading-7 text-[hsl(var(--muted-foreground))]">{service.description}</p><div className="mt-8 grid gap-5 border-t border-[hsl(var(--border))] pt-7 sm:grid-cols-2"><div><p className="eyebrow">May be suitable for</p><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{service.suitableFor || 'Details to be published.'}</p></div><div><p className="eyebrow">Session details</p><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{service.sessionDetails || 'Details to be published.'}</p></div></div><div className="mt-8 flex flex-wrap items-center justify-between gap-4"><div className="flex gap-2 text-xs font-bold text-[hsl(var(--primary))]"><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-2">{service.durationMinutes ? `${service.durationMinutes} minutes` : 'Duration pending'}</span>{service.priceInr != null ? <span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-2">{service.priceInr} INR</span> : <span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-2">Fee to be published</span>}</div><ButtonLink href="/book" testId={`link-detailed-book-${service.id}`}>Request this service <ArrowUpRight size={15} /></ButtonLink></div></article>;
}

function HowItWorks() {
  return <div><PageIntro eyebrow="How it works" title="A clear process, with room to change your mind." description="You do not need to arrive with a diagnosis, a plan, or a polished explanation. Just enough to start a conversation." /><section className="page-wrap py-20 md:py-28"><div className="grid gap-4 md:grid-cols-3"><ProcessCard number="01" icon={<Send size={21} />} title="Make contact" text="Send a message or request an appointment with the details you feel ready to share. A request is not a commitment." /><ProcessCard number="02" icon={<HeartHandshake size={21} />} title="Talk through fit" text="The first exchange is a chance to ask questions, understand the boundaries of the work, and see whether it feels right." /><ProcessCard number="03" icon={<Leaf size={21} />} title="Begin in your way" text="If you choose to continue, sessions are shaped around your goals, your pace, and what is useful in the room." /></div></section><section className="bg-[hsl(var(--primary))] py-20 text-[hsl(var(--primary-foreground))] md:py-28"><div className="page-wrap grid gap-12 md:grid-cols-[.9fr_1.1fr]"><div><p className="eyebrow !text-[hsl(var(--accent))]">Privacy, plainly</p><h2 className="section-title mt-4">A private space still has important boundaries.</h2></div><div className="space-y-7 text-sm leading-7 text-[hsl(var(--primary-foreground)/.7)]"><p className="flex gap-4"><ShieldCheck className="mt-1 shrink-0 text-[hsl(var(--accent))]" size={20} /><span>Information shared through this website is used to respond to your enquiry or appointment request. Please avoid sharing highly sensitive details in an initial form.</span></p><p className="flex gap-4"><LockKeyhole className="mt-1 shrink-0 text-[hsl(var(--accent))]" size={20} /><span>Online forms and email are not a substitute for a secure clinical platform. You can keep your message brief and ask questions about privacy before continuing.</span></p><p className="flex gap-4"><CircleAlert className="mt-1 shrink-0 text-[hsl(var(--accent))]" size={20} /><span>This is not an emergency service. If you may be in immediate danger, contact local emergency services or a crisis support line in your area.</span></p></div></div></section><section className="page-wrap py-20 text-center md:py-28"><p className="eyebrow">No rush</p><h2 className="section-title mx-auto mt-4 max-w-2xl text-[hsl(var(--primary))]">You are allowed to take the time you need.</h2><ButtonLink href="/book" className="mt-8" testId="link-process-book">Request an appointment <ArrowUpRight size={15} /></ButtonLink></section></div>;
}

function ProcessCard({ number, icon, title, text }: { number: string; icon: ReactNode; title: string; text: string }) {
  return <article className="rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"><div className="flex items-center justify-between text-[hsl(var(--primary))]"><span className="eyebrow">{number}</span><span className="grid size-11 place-items-center rounded-2xl bg-[hsl(var(--secondary))]">{icon}</span></div><h2 className="serif mt-10 text-2xl text-[hsl(var(--primary))]">{title}</h2><p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{text}</p></article>;
}

function Faqs() {
  const query = useGetFaqs({ query: { queryKey: getGetFaqsQueryKey() } });
  const faqs = query.data ?? [];
  return <div><PageIntro eyebrow="FAQs" title="The practical questions are part of the conversation." description="If your question is not answered here, you can send it directly. You do not need to decide everything before reaching out." action={<ButtonLink href="/contact" secondary testId="link-faq-contact">Ask a question <ArrowUpRight size={15} /></ButtonLink>} /><section className="page-wrap max-w-4xl py-20 md:py-28">{query.isLoading ? <DataState kind="loading" /> : query.isError ? <DataState kind="error" message={errorText(query.error)} onRetry={() => void query.refetch()} /> : faqs.length === 0 ? <DataState kind="empty" message="FAQs will be published here soon." /> : <div className="divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">{faqs.map((faq) => <FaqItem faq={faq} key={faq.id} />)}</div>}</section><CtaBand /></div>;
}

function Contact() {
  const contentQuery = useGetSiteContent({ query: { queryKey: getGetSiteContentQueryKey() } });
  const content = contentQuery.data ?? fallbackContent;
  const mutation = useCreateContactMessage();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [error, setError] = useState('');
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); setError(''); mutation.mutate({ data: { name: form.name, email: form.email, phone: form.phone || null, message: form.message } }, { onSuccess: () => { setSent(true); setForm({ name: '', email: '', phone: '', message: '' }); }, onError: (err) => setError(errorText(err)) }); };
  const contactValue = (value: string | null | undefined, label: string) => value ? value : `Not published — ${label} placeholder`;
  return <div><PageIntro eyebrow="Contact" title="You can start with a question." description="A short message is enough. Share what you would like to understand, and a response can help you decide what comes next." /><section className="page-wrap grid gap-12 py-20 md:grid-cols-[.8fr_1.2fr] md:py-28"><div><div className="rounded-[26px] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))]"><p className="eyebrow !text-[hsl(var(--accent))]">Contact details</p><div className="mt-7 space-y-5">{[[<Mail size={17} />, 'Email', contactValue(content.email, 'email')], [<Phone size={17} />, 'Phone', contactValue(content.phone, 'phone')], [<MessageCircle size={17} />, 'WhatsApp', contactValue(content.whatsapp, 'WhatsApp')]].map(([icon, label, value], index) => <div className="flex gap-3" key={String(label)} data-testid={`contact-detail-${index}`}><span className="mt-0.5 text-[hsl(var(--accent))]">{icon}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--primary-foreground)/.55)]">{label}</p><p className="mt-1 text-sm text-[hsl(var(--primary-foreground)/.8)]">{value}</p>{!content.email && <div className="mt-2"><PlaceholderBadge /></div>}</div></div>)}</div><div className="mt-8 border-t border-[hsl(var(--primary-foreground)/.15)] pt-6"><p className="text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--primary-foreground)/.55)]">Hours & location</p><p className="mt-2 text-sm leading-6 text-[hsl(var(--primary-foreground)/.75)]">{content.address || content.location || fallbackContent.location}</p><p className="mt-1 text-sm text-[hsl(var(--primary-foreground)/.65)]">{content.workingHours.length ? content.workingHours.join(' · ') : 'Working hours to be published'}{content.timezone ? ` · ${content.timezone}` : ''}</p></div></div><p className="mt-5 flex gap-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><CircleAlert className="mt-0.5 shrink-0" size={14} />{content.emergencyDisclaimer || fallbackContent.emergencyDisclaimer}</p></div><div className="rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 md:p-10">{sent ? <SuccessState title="Your message has been received." text="Thank you for reaching out. Your message is now with the practice; a response can help you decide what feels right." onReset={() => setSent(false)} resetLabel="Send another message" /> : <form onSubmit={submit} className="space-y-5" noValidate><div><p className="eyebrow">Send a message</p><h2 className="serif mt-3 text-3xl text-[hsl(var(--primary))]">What would you like to know?</h2></div><Field label="Name" id="contact-name" value={form.name} onChange={(value) => update('name', value)} required placeholder="Your name" /><Field label="Email" id="contact-email" type="email" value={form.email} onChange={(value) => update('email', value)} required placeholder="you@example.com" /><Field label="Phone (optional)" id="contact-phone" value={form.phone} onChange={(value) => update('phone', value)} placeholder="A number you are comfortable sharing" /><Field label="Message" id="contact-message" value={form.message} onChange={(value) => update('message', value)} required textarea placeholder="A little context is enough. Please do not include urgent or highly sensitive information." /><p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">By sending this form, you understand that email and online forms are not emergency or fully secure clinical channels.</p>{error && <div className="rounded-xl bg-[hsl(var(--destructive)/.08)] p-3 text-sm text-[hsl(var(--destructive))]" data-testid="status-contact-error">{error}</div>}<button type="submit" disabled={mutation.isPending} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-50" data-testid="button-submit-contact">{mutation.isPending ? 'Sending…' : <>Send message <Send size={15} /></>}</button></form>}</div></section></div>;
}

function Field({ label, id, value, onChange, required, type = 'text', textarea = false, placeholder }: { label: string; id: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; textarea?: boolean; placeholder: string }) {
  const common = { id, name: id, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), required, placeholder, className: 'focus-ring mt-2 w-full rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/.7)]' };
  return <label htmlFor={id} className="block text-sm font-semibold text-[hsl(var(--primary))]" data-testid={`label-${id}`}>{label}{required && <span className="ml-1 text-[hsl(var(--accent-foreground))]">*</span>}{textarea ? <textarea {...common} rows={5} data-testid={`textarea-${id}`} /> : <input {...common} type={type} data-testid={`input-${id}`} />}</label>;
}

function Booking() {
  const servicesQuery = useGetServices({ query: { queryKey: getGetServicesQueryKey() } });
  const services = servicesQuery.data ?? [];
  const [form, setForm] = useState({ serviceId: '', date: '', time: '', name: '', email: '', phone: '', message: '' });
  const availabilityParams = useMemo(() => ({ date: form.date }), [form.date]);
  const slotsQuery = useGetAvailability(availabilityParams, { query: { enabled: !!form.date, queryKey: getGetAvailabilityQueryKey(availabilityParams) } });
  const mutation = useCreateAppointment();
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === 'date' ? { time: '' } : {}) }));
  const submit = (event: FormEvent) => { event.preventDefault(); setError(''); mutation.mutate({ data: { serviceId: Number(form.serviceId), preferredDate: form.date, preferredTime: form.time, name: form.name, email: form.email, phone: form.phone, message: form.message || null } }, { onSuccess: () => setComplete(true), onError: (err) => setError(errorText(err)) }); };
  if (complete) return <div><PageIntro eyebrow="Appointment request" title="Your request is on its way." description="This is a request, not a confirmed appointment. The practice will need to respond before a time is final." /><section className="page-wrap py-20 md:py-28"><SuccessState title="Thank you for taking this first step." text="Keep an eye on the contact details you shared. If you need to add context, you can send a separate message." onReset={() => { setComplete(false); setForm({ serviceId: '', date: '', time: '', name: '', email: '', phone: '', message: '' }); }} resetLabel="Make another request" /><div className="mt-10 text-center"><Link href="/" className="focus-ring inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]" data-testid="link-book-home"><ArrowLeft size={15} /> Back to home</Link></div></section></div>;
  return <div><PageIntro eyebrow="Appointment request" title="Choose a possible time. We will take it from there." description="Tell us a little about what you are looking for. Your request will be reviewed before anything is confirmed." /><section className="page-wrap grid gap-12 py-20 md:grid-cols-[1.1fr_.9fr] md:py-28"><form onSubmit={submit} className="space-y-5" noValidate><div><p className="eyebrow">Your request</p><h2 className="serif mt-3 text-3xl text-[hsl(var(--primary))]">A few practical details</h2></div><label className="block text-sm font-semibold text-[hsl(var(--primary))]">Service<span className="ml-1 text-[hsl(var(--accent-foreground))]">*</span><select required value={form.serviceId} onChange={(event) => update('serviceId', event.target.value)} className="focus-ring mt-2 w-full rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-4 py-3 text-sm" data-testid="select-booking-service"><option value="">Choose a published service</option>{services.map((service) => <option value={service.id} key={service.id}>{service.name}{service.isPlaceholder ? ' (unpublished)' : ''}</option>)}</select></label>{servicesQuery.isError && <DataState kind="error" message={errorText(servicesQuery.error)} onRetry={() => void servicesQuery.refetch()} />}{!servicesQuery.isLoading && !servicesQuery.isError && services.length === 0 && <DataState kind="empty" message="Appointment requests will open when a service is published." />}<div className="grid gap-5 sm:grid-cols-2"><Field label="Preferred date" id="booking-date" type="date" value={form.date} onChange={(value) => update('date', value)} required placeholder="" /><label className="block text-sm font-semibold text-[hsl(var(--primary))]">Preferred time<span className="ml-1 text-[hsl(var(--accent-foreground))]">*</span><select required value={form.time} onChange={(event) => update('time', event.target.value)} disabled={!form.date || slotsQuery.isLoading} className="focus-ring mt-2 w-full rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-4 py-3 text-sm disabled:opacity-50" data-testid="select-booking-time"><option value="">{!form.date ? 'Choose a date first' : slotsQuery.isLoading ? 'Checking times…' : 'Choose a possible time'}</option>{(slotsQuery.data ?? []).map((slot) => <option key={`${slot.start}-${slot.end}`} value={`${slot.start}–${slot.end}`}>{slot.start} – {slot.end}</option>)}</select></label></div>{form.date && !slotsQuery.isLoading && !slotsQuery.isError && (slotsQuery.data ?? []).length === 0 && <p className="rounded-xl bg-[hsl(var(--secondary))] p-3 text-xs text-[hsl(var(--muted-foreground))]" data-testid="status-no-slots">No published times are available for this date. You can choose another date.</p>}{slotsQuery.isError && <p className="text-xs text-[hsl(var(--destructive))]" data-testid="status-availability-error">{errorText(slotsQuery.error)}</p>}<div className="border-t border-[hsl(var(--border))] pt-5"><Field label="Your name" id="booking-name" value={form.name} onChange={(value) => update('name', value)} required placeholder="Your name" /><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Email" id="booking-email" type="email" value={form.email} onChange={(value) => update('email', value)} required placeholder="you@example.com" /><Field label="Phone" id="booking-phone" value={form.phone} onChange={(value) => update('phone', value)} required placeholder="A number we can reach" /></div><div className="mt-5"><Field label="Message (optional)" id="booking-message" value={form.message} onChange={(value) => update('message', value)} textarea placeholder="Anything you would like us to know? Please keep it brief." /></div></div><div className="flex gap-3 rounded-2xl bg-[hsl(var(--secondary)/.65)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><LockKeyhole className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" size={16} />Please avoid sending urgent, highly sensitive, or identifying clinical details through this form. Online forms are not emergency services.</div>{error && <div className="rounded-xl bg-[hsl(var(--destructive)/.08)] p-3 text-sm text-[hsl(var(--destructive))]" data-testid="status-booking-error">{error}</div>}<button type="submit" disabled={mutation.isPending || services.length === 0} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-50" data-testid="button-submit-booking">{mutation.isPending ? 'Sending request…' : <>Send appointment request <CalendarDays size={15} /></>}</button></form><aside className="h-fit rounded-[28px] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] md:sticky md:top-28"><Clock3 size={22} className="text-[hsl(var(--accent))]" /><h2 className="serif mt-6 text-3xl">Before you send</h2><ul className="mt-6 space-y-4 text-sm leading-6 text-[hsl(var(--primary-foreground)/.7)]"><li className="flex gap-3"><Check className="mt-1 shrink-0 text-[hsl(var(--accent))]" size={16} />A request is not a confirmed booking.</li><li className="flex gap-3"><Check className="mt-1 shrink-0 text-[hsl(var(--accent))]" size={16} />A response will help confirm fit, availability, and next steps.</li><li className="flex gap-3"><Check className="mt-1 shrink-0 text-[hsl(var(--accent))]" size={16} />You can ask questions before deciding to continue.</li></ul><Link href="/privacy" className="focus-ring mt-8 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--accent))]" data-testid="link-book-privacy">Read privacy information <ArrowUpRight size={14} /></Link></aside></section></div>;
}

function SuccessState({ title, text, onReset, resetLabel }: { title: string; text: string; onReset: () => void; resetLabel: string }) {
  return <div className="mx-auto max-w-xl rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center md:p-12" data-testid="state-success"><div className="mx-auto grid size-16 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Check size={28} /></div><h2 className="serif mt-7 text-3xl text-[hsl(var(--primary))]">{title}</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{text}</p><button type="button" onClick={onReset} className="focus-ring mt-7 rounded-full border border-[hsl(var(--primary)/.25)] px-5 py-3 text-sm font-bold text-[hsl(var(--primary))]" data-testid="button-reset-form">{resetLabel}</button></div>;
}

type AdminTab = 'appointments' | 'availability' | 'services' | 'faqs' | 'messages';
type AppointmentFilter = 'all' | AppointmentStatusProperty;

function Admin() {
  return <div><PageIntro eyebrow="Practice admin" title="A private place to keep the practice moving." description="Manage appointment requests, availability, public services, FAQs, and incoming questions from one protected workspace." /><Show when="signed-out"><section className="page-wrap py-20 md:py-28"><div className="mx-auto max-w-xl rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center md:p-12"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><LockKeyhole size={25} /></div><h2 className="serif mt-7 text-3xl text-[hsl(var(--primary))]">Sign in to continue</h2><p className="mt-4 leading-7 text-[hsl(var(--muted-foreground))]">This area is private and appointment or contact details are never shown publicly.</p><Link href="/sign-in" className="focus-ring mt-7 inline-flex rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-admin-sign-in">Sign in securely</Link></div></section></Show><Show when="signed-in"><AdminDashboard /></Show></div>;
}

function AdminDashboard() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<AdminTab>('appointments');
  const [filter, setFilter] = useState<AppointmentFilter>('all');
  const appointmentsQuery = useGetAdminAppointments(filter === 'all' ? undefined : { status: filter }, { query: { queryKey: getGetAdminAppointmentsQueryKey(filter === 'all' ? undefined : { status: filter }) } });
  const availabilityQuery = useGetAdminAvailability({ query: { queryKey: getGetAdminAvailabilityQueryKey() } });
  const servicesQuery = useGetAdminServices({ query: { queryKey: getGetAdminServicesQueryKey() } });
  const faqsQuery = useGetAdminFaqs({ query: { queryKey: getGetAdminFaqsQueryKey() } });
  const messagesQuery = useGetAdminContactMessages({ query: { queryKey: getGetAdminContactMessagesQueryKey() } });
  const appointments = appointmentsQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const faqs = faqsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const invalidate = (key: readonly unknown[]) => void queryClient.invalidateQueries({ queryKey: key });
  const appointmentMutation = useUpdateAdminAppointment({ mutation: { onSuccess: () => invalidate(getGetAdminAppointmentsQueryKey(filter === 'all' ? undefined : { status: filter })) } });
  const availabilityMutation = useUpdateAdminAvailability({ mutation: { onSuccess: () => invalidate(getGetAdminAvailabilityQueryKey()) } });
  const serviceCreate = useCreateAdminService({ mutation: { onSuccess: () => invalidate(getGetAdminServicesQueryKey()) } });
  const serviceUpdate = useUpdateAdminService({ mutation: { onSuccess: () => invalidate(getGetAdminServicesQueryKey()) } });
  const serviceDelete = useDeleteAdminService({ mutation: { onSuccess: () => invalidate(getGetAdminServicesQueryKey()) } });
  const faqCreate = useCreateAdminFaq({ mutation: { onSuccess: () => invalidate(getGetAdminFaqsQueryKey()) } });
  const faqUpdate = useUpdateAdminFaq({ mutation: { onSuccess: () => invalidate(getGetAdminFaqsQueryKey()) } });
  const faqDelete = useDeleteAdminFaq({ mutation: { onSuccess: () => invalidate(getGetAdminFaqsQueryKey()) } });

  const busy = appointmentMutation.isPending || availabilityMutation.isPending || serviceCreate.isPending || serviceUpdate.isPending || serviceDelete.isPending || faqCreate.isPending || faqUpdate.isPending || faqDelete.isPending;
  const queryError = appointmentsQuery.error ?? availabilityQuery.error ?? servicesQuery.error ?? faqsQuery.error ?? messagesQuery.error;

  return <section className="page-wrap py-12 md:py-16" data-testid="admin-dashboard">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div><p className="eyebrow">Private workspace</p><h2 className="section-title mt-3 text-[hsl(var(--primary))]">Practice overview</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Changes here affect what visitors can request and what appears on the public site.</p></div>
      <div className="flex flex-wrap items-center gap-3">{userId && <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 font-mono text-[11px] text-[hsl(var(--muted-foreground))]" title="Use this value for ADMIN_CLERK_USER_IDS">Clerk ID: {userId}</span>}{busy && <span className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--secondary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary))]"><span className="size-2 animate-pulse rounded-full bg-[hsl(var(--accent))]" /> Saving changes</span>}</div>
    </div>
    {queryError && <div className="mb-6"><DataState kind="error" message={errorText(queryError)} onRetry={() => { void appointmentsQuery.refetch(); void availabilityQuery.refetch(); void servicesQuery.refetch(); void faqsQuery.refetch(); void messagesQuery.refetch(); }} /></div>}
    <div className="mb-8 flex gap-2 overflow-x-auto border-b border-[hsl(var(--border))] pb-2" role="tablist" aria-label="Practice administration">
      {([['appointments', 'Appointments', CalendarClock], ['availability', 'Availability', Settings2], ['services', 'Services', HeartHandshake], ['faqs', 'FAQs', MessageCircle], ['messages', 'Messages', Inbox] ] as const).map(([value, label, Icon]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`focus-ring inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition ${tab === value ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]'}`} data-testid={`tab-admin-${value}`}><Icon size={15} />{label}</button>)}
    </div>
    {tab === 'appointments' && <AppointmentsPanel appointments={appointments} filter={filter} setFilter={setFilter} onUpdate={(id, data) => appointmentMutation.mutate({ id, data })} />}
    {tab === 'availability' && <AvailabilityPanel settings={availabilityQuery.data} onSave={(data) => availabilityMutation.mutate({ data })} />}
    {tab === 'services' && <ServicesPanel services={services} onCreate={(data) => serviceCreate.mutate({ data })} onUpdate={(id, data) => serviceUpdate.mutate({ id, data })} onDelete={(id) => { if (window.confirm('Delete this service? Existing appointment records will remain, but the service will no longer be available.')) serviceDelete.mutate({ id }); }} />}
    {tab === 'faqs' && <FaqsPanel faqs={faqs} onCreate={(data) => faqCreate.mutate({ data })} onUpdate={(id, data) => faqUpdate.mutate({ id, data })} onDelete={(id) => { if (window.confirm('Delete this FAQ from the practice?')) faqDelete.mutate({ id }); }} />}
    {tab === 'messages' && <MessagesPanel messages={messages} />}
  </section>;
}

function AdminPanelShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-8"><div className="mb-7"><h3 className="serif text-2xl text-[hsl(var(--primary))]">{title}</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p></div>{children}</div>;
}

function StatusPill({ status }: { status: AppointmentStatusProperty }) {
  const labels: Record<AppointmentStatusProperty, string> = { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', rejected: 'Rejected' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] ${status === 'confirmed' ? 'bg-[hsl(153_40%_88%)] text-[hsl(154_40%_25%)]' : status === 'pending' ? 'bg-[hsl(var(--accent)/.18)] text-[hsl(var(--accent-foreground))]' : status === 'rejected' || status === 'cancelled' ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'}`}>{labels[status]}</span>;
}

function AppointmentsPanel({ appointments, filter, setFilter, onUpdate }: { appointments: Array<{ id: number; serviceName: string; preferredDate: string; preferredTime: string; name: string; email: string; phone: string; message: string | null; status: AppointmentStatusProperty; createdAt: string }>; filter: AppointmentFilter; setFilter: (value: AppointmentFilter) => void; onUpdate: (id: number, data: { status?: AppointmentStatusProperty; preferredDate?: string; preferredTime?: string }) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [reschedule, setReschedule] = useState({ date: '', time: '' });
  const current = appointments.find((appointment) => appointment.id === selected);
  useEffect(() => { if (current) setReschedule({ date: current.preferredDate.slice(0, 10), time: current.preferredTime }); }, [selected, current]);
  return <AdminPanelShell title="Appointment requests" description="Review incoming requests and keep each person’s status clear. A confirmed appointment is the only status that blocks a public time slot.">
    <div className="mb-6 flex flex-wrap gap-2">{(['all', 'pending', 'confirmed', 'cancelled', 'completed', 'rejected'] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-bold ${filter === value ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}>{value === 'all' ? 'All requests' : value}</button>)}</div>
    {appointments.length === 0 ? <DataState kind="empty" message="No appointment requests match this filter." /> : <div className="space-y-3">{appointments.map((appointment) => <article key={appointment.id} className={`rounded-2xl border p-4 transition ${selected === appointment.id ? 'border-[hsl(var(--primary)/.45)] bg-[hsl(var(--secondary)/.35)]' : 'border-[hsl(var(--border))]'}`} data-testid={`admin-appointment-${appointment.id}`}><button type="button" onClick={() => setSelected(selected === appointment.id ? null : appointment.id)} className="focus-ring flex w-full flex-col items-start justify-between gap-3 text-left sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-3"><span className="font-bold text-[hsl(var(--primary))]">{appointment.name}</span><StatusPill status={appointment.status} /></div><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{appointment.serviceName} · {appointment.preferredDate.slice(0, 10)} · {appointment.preferredTime}</p></div><span className="text-xs font-bold text-[hsl(var(--primary))]">{selected === appointment.id ? 'Hide details' : 'View details'}</span></button>{selected === appointment.id && <div className="mt-5 border-t border-[hsl(var(--border))] pt-5"><div className="grid gap-5 text-sm md:grid-cols-2"><div><p className="eyebrow">Contact</p><p className="mt-2 font-semibold text-[hsl(var(--primary))]">{appointment.email}</p><p className="mt-1 text-[hsl(var(--muted-foreground))]">{appointment.phone}</p></div><div><p className="eyebrow">Message</p><p className="mt-2 leading-6 text-[hsl(var(--muted-foreground))]">{appointment.message || 'No message provided.'}</p></div></div><div className="mt-6 flex flex-wrap gap-2">{(['confirmed', 'rejected', 'cancelled', 'completed'] as const).map((status) => <button key={status} type="button" onClick={() => onUpdate(appointment.id, { status })} className="focus-ring rounded-full border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))]">{status === 'confirmed' ? 'Approve' : status === 'rejected' ? 'Reject' : status === 'cancelled' ? 'Cancel' : 'Mark completed'}</button>)}</div><div className="mt-6 rounded-2xl bg-[hsl(var(--background)/.6)] p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--primary))]">Reschedule</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input type="date" value={reschedule.date} onChange={(event) => setReschedule({ ...reschedule, date: event.target.value })} className="focus-ring rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-sm" aria-label="Rescheduled date" /><input type="text" value={reschedule.time} onChange={(event) => setReschedule({ ...reschedule, time: event.target.value })} placeholder="10:00–11:00" className="focus-ring rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-sm" aria-label="Rescheduled time" /><button type="button" onClick={() => onUpdate(appointment.id, { preferredDate: reschedule.date, preferredTime: reschedule.time, status: 'confirmed' })} className="focus-ring rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Save time</button></div></div></div>}</article>)}</div>}
  </AdminPanelShell>;
}

function AvailabilityPanel({ settings, onSave }: { settings?: { workingDays: number[]; workingStart: string; workingEnd: string; breakStart: string | null; breakEnd: string | null; unavailableDates: string[]; sessionDurationMinutes: number }; onSave: (data: { workingDays: number[]; workingStart: string; workingEnd: string; breakStart: string | null; breakEnd: string | null; unavailableDates: string[]; sessionDurationMinutes: number }) => void }) {
  const [draft, setDraft] = useState({ workingDays: [1, 2, 3, 4, 5], workingStart: '10:00', workingEnd: '17:00', breakStart: '', breakEnd: '', unavailableDates: [] as string[], sessionDurationMinutes: 60 });
  const [blockedDate, setBlockedDate] = useState('');
  useEffect(() => { if (settings) setDraft({ ...settings, breakStart: settings.breakStart ?? '', breakEnd: settings.breakEnd ?? '' }); }, [settings]);
  const update = (key: keyof typeof draft, value: string | number) => setDraft((current) => ({ ...current, [key]: value }));
  return <AdminPanelShell title="Availability" description="Public booking slots use these settings. Unavailable dates and confirmed appointments are removed automatically."><div className="grid gap-8 lg:grid-cols-[1fr_1fr]"><div><p className="eyebrow">Working days</p><div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">{[['Sun', 0], ['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6]].map(([label, day]) => <label key={String(day)} className={`cursor-pointer rounded-xl border px-2 py-3 text-center text-xs font-bold ${draft.workingDays.includes(Number(day)) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}><input type="checkbox" className="sr-only" checked={draft.workingDays.includes(Number(day))} onChange={() => setDraft((current) => ({ ...current, workingDays: current.workingDays.includes(Number(day)) ? current.workingDays.filter((value) => value !== Number(day)) : [...current.workingDays, Number(day)].sort() }))} />{label}</label>)}</div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Starts<input type="time" value={draft.workingStart} onChange={(event) => update('workingStart', event.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-3 py-2.5" /></label><label className="text-sm font-semibold">Ends<input type="time" value={draft.workingEnd} onChange={(event) => update('workingEnd', event.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-3 py-2.5" /></label><label className="text-sm font-semibold">Break starts<input type="time" value={draft.breakStart} onChange={(event) => update('breakStart', event.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-3 py-2.5" /></label><label className="text-sm font-semibold">Break ends<input type="time" value={draft.breakEnd} onChange={(event) => update('breakEnd', event.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-3 py-2.5" /></label></div></div><div><p className="eyebrow">Session rules</p><label className="mt-3 block text-sm font-semibold">Session duration<select value={draft.sessionDurationMinutes} onChange={(event) => update('sessionDurationMinutes', Number(event.target.value))} className="focus-ring mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-3 py-2.5"><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={50}>50 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option><option value={120}>120 minutes</option></select></label><p className="eyebrow mt-7">Unavailable dates</p><div className="mt-3 flex gap-2"><input type="date" value={blockedDate} onChange={(event) => setBlockedDate(event.target.value)} className="focus-ring min-w-0 flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-3 py-2.5 text-sm" /><button type="button" onClick={() => { if (blockedDate && !draft.unavailableDates.includes(blockedDate)) { setDraft((current) => ({ ...current, unavailableDates: [...current.unavailableDates, blockedDate].sort() })); setBlockedDate(''); } }} className="focus-ring inline-flex items-center gap-1 rounded-xl bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))]"><Plus size={14} />Add</button></div><div className="mt-3 flex flex-wrap gap-2">{draft.unavailableDates.map((date) => <button key={date} type="button" onClick={() => setDraft((current) => ({ ...current, unavailableDates: current.unavailableDates.filter((value) => value !== date) }))} className="focus-ring inline-flex items-center gap-1 rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--primary))]">{date}<X size={12} /></button>)}{draft.unavailableDates.length === 0 && <p className="text-sm text-[hsl(var(--muted-foreground))]">No blocked dates.</p>}</div></div></div><button type="button" onClick={() => onSave({ ...draft, breakStart: draft.breakStart || null, breakEnd: draft.breakEnd || null })} className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-save-availability">Save availability <CheckCircle2 size={15} /></button></AdminPanelShell>;
}

type ServiceForm = { name: string; description: string; suitableFor: string; sessionDetails: string; durationMinutes: number; priceInr: number | null; isEnabled: boolean; isPlaceholder: boolean };
const emptyServiceForm: ServiceForm = { name: '', description: '', suitableFor: '', sessionDetails: '', durationMinutes: 60, priceInr: null, isEnabled: true, isPlaceholder: false };

function ServicesPanel({ services, onCreate, onUpdate, onDelete }: { services: AdminService[]; onCreate: (data: ServiceForm) => void; onUpdate: (id: number, data: ServiceForm) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyServiceForm);
  const openNew = () => { setEditing('new'); setForm(emptyServiceForm); };
  const openEdit = (service: AdminService) => { setEditing(service.id); setForm({ name: service.name, description: service.description, suitableFor: service.suitableFor, sessionDetails: service.sessionDetails, durationMinutes: service.durationMinutes, priceInr: service.priceInr, isEnabled: service.isEnabled, isPlaceholder: service.isPlaceholder }); };
  const save = () => { if (form.name.trim() && form.description.trim()) { if (editing === 'new') onCreate(form); else if (typeof editing === 'number') onUpdate(editing, form); setEditing(null); } };
  return <AdminPanelShell title="Services" description="Only enabled services appear in the public booking flow. Keep placeholder content marked until the practice owner approves it."><div className="mb-5 flex justify-end"><button type="button" onClick={openNew} className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Add service</button></div>{editing !== null && <div className="mb-6 rounded-2xl bg-[hsl(var(--secondary)/.55)] p-5"><p className="eyebrow">{editing === 'new' ? 'New service' : 'Edit service'}</p><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Name" id="admin-service-name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required placeholder="Service name" /><Field label="Description" id="admin-service-description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} required textarea placeholder="Short public description" /><Field label="Suitable for" id="admin-service-suitable" value={form.suitableFor} onChange={(value) => setForm({ ...form, suitableFor: value })} placeholder="Who this may suit" /><Field label="Session details" id="admin-service-details" value={form.sessionDetails} onChange={(value) => setForm({ ...form, sessionDetails: value })} placeholder="What a session is like" /></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-sm font-semibold">Duration<select value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} className="focus-ring mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2.5"><option value={30}>30 min</option><option value={45}>45 min</option><option value={50}>50 min</option><option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>120 min</option></select></label><label className="text-sm font-semibold">Price (INR)<input type="number" min="0" value={form.priceInr ?? ''} onChange={(event) => setForm({ ...form, priceInr: event.target.value ? Number(event.target.value) : null })} className="focus-ring mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2.5" placeholder="Optional" /></label><label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" checked={form.isEnabled} onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })} />Visible for booking</label></div><div className="mt-4 flex items-center gap-2"><input type="checkbox" checked={form.isPlaceholder} onChange={(event) => setForm({ ...form, isPlaceholder: event.target.checked })} id="admin-service-placeholder" /><label htmlFor="admin-service-placeholder" className="text-sm">Mark as unpublished placeholder</label></div><div className="mt-5 flex gap-2"><button type="button" onClick={save} className="focus-ring rounded-full bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Save service</button><button type="button" onClick={() => setEditing(null)} className="focus-ring rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold">Cancel</button></div></div>}{services.length === 0 ? <DataState kind="empty" message="No services yet. Add the first published offering." /> : <div className="space-y-3">{services.map((service) => <div key={service.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-[hsl(var(--primary))]">{service.name}</h4>{service.isEnabled ? <span className="text-xs text-[hsl(154_40%_30%)]">Enabled</span> : <span className="text-xs text-[hsl(var(--muted-foreground))]">Disabled</span>}{service.isPlaceholder && <PlaceholderBadge />}</div><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{service.durationMinutes} minutes{service.priceInr != null ? ` · INR ${service.priceInr}` : ''}</p></div><div className="flex gap-2"><button type="button" onClick={() => openEdit(service)} className="focus-ring inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))]"><Edit3 size={13} />Edit</button><button type="button" onClick={() => onDelete(service.id)} className="focus-ring inline-flex items-center gap-1 rounded-full border border-[hsl(var(--destructive)/.35)] px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} />Delete</button></div></div>)}</div>}</AdminPanelShell>;
}

type FaqForm = { question: string; answer: string; isPublished: boolean };
const emptyFaqForm: FaqForm = { question: '', answer: '', isPublished: true };

function FaqsPanel({ faqs, onCreate, onUpdate, onDelete }: { faqs: AdminFaq[]; onCreate: (data: FaqForm) => void; onUpdate: (id: number, data: FaqForm) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<FaqForm>(emptyFaqForm);
  const save = () => { if (form.question.trim() && form.answer.trim()) { if (editing === 'new') onCreate(form); else if (typeof editing === 'number') onUpdate(editing, form); setEditing(null); } };
  return <AdminPanelShell title="FAQs" description="Publish clear answers to the questions people commonly have before they reach out."><div className="mb-5 flex justify-end"><button type="button" onClick={() => { setEditing('new'); setForm(emptyFaqForm); }} className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Add FAQ</button></div>{editing !== null && <div className="mb-6 rounded-2xl bg-[hsl(var(--secondary)/.55)] p-5"><p className="eyebrow">{editing === 'new' ? 'New FAQ' : 'Edit FAQ'}</p><div className="mt-4 space-y-4"><Field label="Question" id="admin-faq-question" value={form.question} onChange={(value) => setForm({ ...form, question: value })} required placeholder="What might someone ask?" /><Field label="Answer" id="admin-faq-answer" value={form.answer} onChange={(value) => setForm({ ...form, answer: value })} required textarea placeholder="A clear, reassuring answer" /></div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} />Visible on the public FAQs page</label><div className="mt-5 flex gap-2"><button type="button" onClick={save} className="focus-ring rounded-full bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Save FAQ</button><button type="button" onClick={() => setEditing(null)} className="focus-ring rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold">Cancel</button></div></div>}{faqs.length === 0 ? <DataState kind="empty" message="No FAQs yet. Add the first answer for visitors." /> : <div className="space-y-3">{faqs.map((faq) => <div key={faq.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-[hsl(var(--border))] p-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><h4 className="font-bold text-[hsl(var(--primary))]">{faq.question}</h4><span className="text-xs text-[hsl(var(--muted-foreground))]">{faq.isPublished ? 'Published' : 'Hidden'}</span></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{faq.answer}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => { setEditing(faq.id); setForm({ question: faq.question, answer: faq.answer, isPublished: faq.isPublished }); }} className="focus-ring inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))]"><Edit3 size={13} />Edit</button><button type="button" onClick={() => onDelete(faq.id)} className="focus-ring inline-flex items-center gap-1 rounded-full border border-[hsl(var(--destructive)/.35)] px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} />Delete</button></div></div>)}</div>}</AdminPanelShell>;
}

function MessagesPanel({ messages }: { messages: Array<{ id: number; name: string; email: string; phone: string | null; message: string; createdAt: string }> }) {
  return <AdminPanelShell title="Contact messages" description="Private messages from the public contact form. Keep replies in your usual secure communication channel.">{messages.length === 0 ? <DataState kind="empty" message="No contact messages yet." /> : <div className="space-y-3">{messages.map((message) => <article key={message.id} className="rounded-2xl border border-[hsl(var(--border))] p-4"><div className="flex flex-col justify-between gap-2 sm:flex-row"><div><h4 className="font-bold text-[hsl(var(--primary))]">{message.name}</h4><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{message.email}{message.phone ? ` · ${message.phone}` : ''}</p></div><time className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(message.createdAt).toLocaleString()}</time></div><p className="mt-4 whitespace-pre-line text-sm leading-7 text-[hsl(var(--muted-foreground))]">{message.message}</p></article>)}</div>}</AdminPanelShell>;
}

function TrustPage({ type }: { type: 'privacy' | 'terms' | 'disclaimer' }) {
  const copy = { privacy: { eyebrow: 'Privacy', title: 'A plain-language note about information and this website.', intro: 'This page describes the intended boundaries of this public website. It is not a substitute for a practice-specific legal or clinical privacy notice.', sections: [['What we collect', 'When you use the contact or appointment forms, you choose to share details such as your name, email, phone number, preferred time, and message. Please keep forms brief and avoid sharing urgent or highly sensitive information.'], ['How it is used', 'Information submitted through this website is intended to help respond to your enquiry or appointment request. It should not be used as a place to store an ongoing clinical record.'], ['Your choices', 'You can ask what information has been received, request clarification, or choose not to continue. Practice-specific retention and deletion details will be published when the practice is fully configured.']] }, terms: { eyebrow: 'Terms of use', title: 'A respectful, limited use of this website.', intro: 'By using this website, you agree to use it for genuine information, contact, and appointment enquiries.', sections: [['Information is illustrative until published', 'Some practice details may be marked as unpublished placeholders. Do not treat those details as confirmed credentials, availability, pricing, or contact channels.'], ['Requests are not confirmations', 'Submitting an appointment form does not create a confirmed appointment or therapeutic relationship. A response from the practice is needed before a time is final.'], ['Please use the site safely', 'Do not use forms for emergencies, crisis support, or detailed medical information. The practice may update this information as its public service is prepared.']] }, disclaimer: { eyebrow: 'Important disclaimer', title: 'Some things this website cannot provide.', intro: 'The information here is general public information about a counselling practice. It does not provide diagnosis, treatment, crisis support, or medical advice.', sections: [['Not an emergency service', 'If you may be in immediate danger, contact local emergency services or a crisis support line in your area. Do not wait for a form or email response.'], ['No promise of outcome', 'Counselling is personal and experiences vary. Nothing on this website promises a particular result or represents a clinical claim.'], ['A first request is only a first request', 'Contacting the practice is an invitation to begin a conversation. It is not a guarantee of availability, suitability, or a confirmed appointment.']] } }[type]; return <div><PageIntro eyebrow={copy.eyebrow} title={copy.title} description={copy.intro} /><section className="page-wrap max-w-3xl py-20 md:py-28"><div className="space-y-10">{copy.sections.map(([heading, text]) => <article key={heading} className="border-b border-[hsl(var(--border))] pb-9"><h2 className="serif text-2xl text-[hsl(var(--primary))]">{heading}</h2><p className="mt-3 leading-7 text-[hsl(var(--muted-foreground))]">{text}</p></article>)}</div><ButtonLink href="/contact" secondary className="mt-10" testId={`link-${type}-contact`}>Ask a question <ArrowUpRight size={15} /></ButtonLink></section></div>;
}

function SignInPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function PublicShell() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Shell><Switch><Route path="/" component={Home} /><Route path="/about" component={About} /><Route path="/services" component={Services} /><Route path="/how-it-works" component={HowItWorks} /><Route path="/faqs" component={Faqs} /><Route path="/contact" component={Contact} /><Route path="/book" component={Booking} /><Route path="/admin" component={Admin} /><Route path="/privacy"><TrustPage type="privacy" /></Route><Route path="/terms"><TrustPage type="terms" /></Route><Route path="/disclaimer"><TrustPage type="disclaimer" /></Route><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

function Router() {
  return <Switch><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route component={PublicShell} /></Switch>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
  return <WouterRouter base={basePath}><ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} routerPush={(to) => window.history.pushState({}, '', stripBase(to))} routerReplace={(to) => window.history.replaceState({}, '', stripBase(to))}><QueryClientProvider client={queryClient}><TooltipProvider><Router /></TooltipProvider><Toaster /></QueryClientProvider></ClerkProvider></WouterRouter>;
}

export default App;