/**
 * GrantHub seed
 *
 * Loads a complete demo dataset for Rockville University:
 *   - 1 institution
 *   - 4 academic departments
 *   - 5 funding agencies
 *   - 3 fiscal years (FY2024, FY2025, FY2026 — current)
 *   - 14 users (3 demo logins + 8 PIs + 3 research-admin staff)
 *   - 14 grants spanning every status in the workflow
 *   - ~45 deliverables, deliberately weighted so the AI search demo lands
 *   - Funding allocations per grant per fiscal year (planned vs actual)
 *   - GrantRoles linking PIs / co-PIs / collaborators to their grants
 *
 * Conventions
 *   - Idempotent: every entity is inserted via upsert on a natural unique key,
 *     so `npm run db:seed` is safe to run repeatedly.
 *   - Deterministic: dates are computed from a fixed `TODAY` constant rather
 *     than `new Date()`, so the demo state is identical across resets.
 *   - Auth0 sub values are placeholders (`seed|<slug>`). The Day-3 auth
 *     middleware will match by email on first real login and overwrite the
 *     placeholder with the genuine Auth0 `sub`.
 *
 * Tuning notes for the AI search demo (Day 9)
 *   - Biology has at least 3 overdue deliverables this quarter
 *   - One Computer Science grant ("CRISPR-DX") has rich budget data across 3 FYs
 *   - At least 4 PUBLICATION deliverables completed in FY2025 (2 Biology, 2 CS)
 *   - At least 2 grants in SUBMITTED status awaiting review
 *   - Chemistry has exactly 3 PIs (predictable answer for "Who are the PIs in Chemistry?")
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// -----------------------------------------------------------------------------
// Time anchors — every relative date hangs off this.
// -----------------------------------------------------------------------------

const TODAY = new Date('2026-05-05T00:00:00Z');

const daysFromToday = (offset: number): Date => {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

// Rockville's fiscal year runs July 1 to June 30, like most US universities.
const fiscalYears = [
  {
    label: 'FY2024',
    startDate: new Date('2023-07-01T00:00:00Z'),
    endDate: new Date('2024-06-30T00:00:00Z'),
    closed: true,
  },
  {
    label: 'FY2025',
    startDate: new Date('2024-07-01T00:00:00Z'),
    endDate: new Date('2025-06-30T00:00:00Z'),
    closed: true,
  },
  {
    label: 'FY2026',
    startDate: new Date('2025-07-01T00:00:00Z'),
    endDate: new Date('2026-06-30T00:00:00Z'),
    closed: false,
  },
];

// -----------------------------------------------------------------------------
// Static reference data
// -----------------------------------------------------------------------------

const departments = [
  { code: 'BIO', name: 'Biology' },
  { code: 'CS', name: 'Computer Science' },
  { code: 'CHEM', name: 'Chemistry' },
  { code: 'MECH', name: 'Mechanical Engineering' },
];

const fundingAgencies = [
  { shortName: 'NSF', name: 'National Science Foundation', agencyType: 'FEDERAL' as const },
  { shortName: 'NIH', name: 'National Institutes of Health', agencyType: 'FEDERAL' as const },
  { shortName: 'DOE', name: 'Department of Energy', agencyType: 'FEDERAL' as const },
  { shortName: 'DARPA', name: 'Defense Advanced Research Projects Agency', agencyType: 'FEDERAL' as const },
  { shortName: 'SLOAN', name: 'Alfred P. Sloan Foundation', agencyType: 'PRIVATE_FOUNDATION' as const },
];

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------

type SeedUser = {
  slug: string; // used to build auth0Sub and look up users when wiring grants
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  role: 'PI' | 'RESEARCH_ADMIN' | 'ADMIN';
  departmentCode: string | null;
};

const users: SeedUser[] = [
  // Demo logins — these are the three accounts the README and sprint plan reference.
  {
    slug: 'demo-pi',
    email: 'pi@demo.granthub.local',
    firstName: 'Demo',
    lastName: 'Investigator',
    title: 'Associate Professor',
    role: 'PI',
    departmentCode: 'BIO',
  },
  {
    slug: 'demo-admin',
    email: 'admin@demo.granthub.local',
    firstName: 'Demo',
    lastName: 'Administrator',
    title: 'Office of Research',
    role: 'RESEARCH_ADMIN',
    departmentCode: null,
  },
  {
    slug: 'demo-superadmin',
    email: 'superadmin@demo.granthub.local',
    firstName: 'Demo',
    lastName: 'Superadmin',
    title: 'System Administrator',
    role: 'ADMIN',
    departmentCode: null,
  },

  // Faculty PIs — eight, distributed across the four departments.
  {
    slug: 'pi-chen',
    email: 'l.chen@rockville.edu',
    firstName: 'Linda',
    lastName: 'Chen',
    title: 'Professor',
    role: 'PI',
    departmentCode: 'BIO',
  },
  {
    slug: 'pi-okafor',
    email: 'a.okafor@rockville.edu',
    firstName: 'Adaeze',
    lastName: 'Okafor',
    title: 'Assistant Professor',
    role: 'PI',
    departmentCode: 'BIO',
  },
  {
    slug: 'pi-ramirez',
    email: 'j.ramirez@rockville.edu',
    firstName: 'Javier',
    lastName: 'Ramirez',
    title: 'Associate Professor',
    role: 'PI',
    departmentCode: 'CS',
  },
  {
    slug: 'pi-patel',
    email: 'r.patel@rockville.edu',
    firstName: 'Rohan',
    lastName: 'Patel',
    title: 'Professor',
    role: 'PI',
    departmentCode: 'CS',
  },
  {
    slug: 'pi-fischer',
    email: 'k.fischer@rockville.edu',
    firstName: 'Klara',
    lastName: 'Fischer',
    title: 'Professor',
    role: 'PI',
    departmentCode: 'CHEM',
  },
  {
    slug: 'pi-wong',
    email: 'm.wong@rockville.edu',
    firstName: 'Mei',
    lastName: 'Wong',
    title: 'Assistant Professor',
    role: 'PI',
    departmentCode: 'CHEM',
  },
  {
    slug: 'pi-grant',
    email: 't.grant@rockville.edu',
    firstName: 'Thomas',
    lastName: 'Grant',
    title: 'Associate Professor',
    role: 'PI',
    departmentCode: 'CHEM',
  },
  {
    slug: 'pi-novak',
    email: 's.novak@rockville.edu',
    firstName: 'Sasha',
    lastName: 'Novak',
    title: 'Professor',
    role: 'PI',
    departmentCode: 'MECH',
  },

  // Office of Research staff — additional research admins beyond the demo login.
  {
    slug: 'admin-burke',
    email: 'p.burke@rockville.edu',
    firstName: 'Patricia',
    lastName: 'Burke',
    title: 'Senior Grants Officer',
    role: 'RESEARCH_ADMIN',
    departmentCode: null,
  },
  {
    slug: 'admin-tanaka',
    email: 'h.tanaka@rockville.edu',
    firstName: 'Hiroshi',
    lastName: 'Tanaka',
    title: 'Compliance Officer',
    role: 'RESEARCH_ADMIN',
    departmentCode: null,
  },
];

// -----------------------------------------------------------------------------
// Grants
// -----------------------------------------------------------------------------

type SeedGrant = {
  grantNumber: string;
  title: string;
  abstract: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'CLOSED' | 'REJECTED';
  departmentCode: string;
  fundingAgencyShort: string;
  fiscalYearLabel: string;
  sponsorAwardId: string | null;
  totalBudget: number;
  startOffsetDays: number | null; // relative to TODAY
  endOffsetDays: number | null;
  createdBySlug: string;
  approvedBySlug: string | null;
  // Roles: lead PI is required, others optional.
  leadPiSlug: string;
  coPiSlugs?: string[];
  collaboratorSlugs?: string[];
  // Funding rows: one per fiscal year the grant has spent against.
  funding: { fiscalYearLabel: string; planned: number; actual: number }[];
};

const grants: SeedGrant[] = [
  // ---- Biology ----
  {
    grantNumber: 'RU-26-0001',
    title: 'Coral Reef Microbiome Dynamics Under Thermal Stress',
    abstract:
      'Multi-year study characterizing shifts in coral-associated microbial communities during marine heatwaves, with implications for reef resilience modeling.',
    status: 'ACTIVE',
    departmentCode: 'BIO',
    fundingAgencyShort: 'NSF',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: 'NSF-2412345',
    totalBudget: 1_250_000,
    startOffsetDays: -400,
    endOffsetDays: 700,
    createdBySlug: 'pi-chen',
    approvedBySlug: 'demo-admin',
    leadPiSlug: 'pi-chen',
    coPiSlugs: ['pi-okafor'],
    funding: [
      { fiscalYearLabel: 'FY2025', planned: 420_000, actual: 405_000 },
      { fiscalYearLabel: 'FY2026', planned: 430_000, actual: 218_000 },
    ],
  },
  {
    grantNumber: 'RU-26-0002',
    title: 'CRISPR-Based Diagnostics for Vector-Borne Disease (CRISPR-DX)',
    abstract:
      'Field-deployable nucleic acid diagnostics using engineered Cas13 variants. Phase 2 includes prospective validation in two endemic regions.',
    status: 'ACTIVE',
    departmentCode: 'BIO',
    fundingAgencyShort: 'NIH',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: 'NIH-R01-AI178923',
    totalBudget: 2_400_000,
    startOffsetDays: -750,
    endOffsetDays: 350,
    createdBySlug: 'pi-okafor',
    approvedBySlug: 'demo-admin',
    leadPiSlug: 'pi-okafor',
    coPiSlugs: ['pi-chen'],
    collaboratorSlugs: ['pi-ramirez'],
    funding: [
      { fiscalYearLabel: 'FY2024', planned: 800_000, actual: 792_000 },
      { fiscalYearLabel: 'FY2025', planned: 800_000, actual: 815_000 },
      { fiscalYearLabel: 'FY2026', planned: 800_000, actual: 410_000 },
    ],
  },
  {
    grantNumber: 'RU-26-0003',
    title: 'Salt Marsh Carbon Sequestration in the Mid-Atlantic',
    abstract:
      'Quantifying blue-carbon flux in restored vs reference salt marshes using eddy covariance and isotopic tracers.',
    status: 'SUBMITTED',
    departmentCode: 'BIO',
    fundingAgencyShort: 'NSF',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: null,
    totalBudget: 875_000,
    startOffsetDays: null,
    endOffsetDays: null,
    createdBySlug: 'demo-pi',
    approvedBySlug: null,
    leadPiSlug: 'demo-pi',
    coPiSlugs: ['pi-okafor'],
    funding: [],
  },

  // ---- Computer Science ----
  {
    grantNumber: 'RU-26-0004',
    title: 'Verifiable Coordination Protocols for Multi-Agent LLM Systems',
    abstract:
      'Formal methods for safety properties of agent ensembles, including bounded-tool-use guarantees and audit-trail completeness.',
    status: 'ACTIVE',
    departmentCode: 'CS',
    fundingAgencyShort: 'DARPA',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: 'DARPA-HR001124C',
    totalBudget: 1_800_000,
    startOffsetDays: -300,
    endOffsetDays: 800,
    createdBySlug: 'pi-ramirez',
    approvedBySlug: 'admin-burke',
    leadPiSlug: 'pi-ramirez',
    coPiSlugs: ['pi-patel'],
    funding: [
      { fiscalYearLabel: 'FY2025', planned: 600_000, actual: 588_000 },
      { fiscalYearLabel: 'FY2026', planned: 600_000, actual: 312_000 },
    ],
  },
  {
    grantNumber: 'RU-26-0005',
    title: 'Energy-Aware Compilers for Edge ML Workloads',
    abstract:
      'Compiler passes that co-optimize for latency and joules-per-inference on heterogeneous edge accelerators.',
    status: 'ACTIVE',
    departmentCode: 'CS',
    fundingAgencyShort: 'DOE',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: 'DOE-SC0024501',
    totalBudget: 950_000,
    startOffsetDays: -200,
    endOffsetDays: 530,
    createdBySlug: 'pi-patel',
    approvedBySlug: 'admin-burke',
    leadPiSlug: 'pi-patel',
    funding: [
      { fiscalYearLabel: 'FY2026', planned: 475_000, actual: 198_000 },
    ],
  },
  {
    grantNumber: 'RU-26-0006',
    title: 'Differential Privacy in Federated Health Records',
    abstract:
      'Privacy budgets and audit mechanisms for cross-institutional model training, with a hospital-network testbed.',
    status: 'UNDER_REVIEW',
    departmentCode: 'CS',
    fundingAgencyShort: 'NIH',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: null,
    totalBudget: 1_100_000,
    startOffsetDays: null,
    endOffsetDays: null,
    createdBySlug: 'pi-ramirez',
    approvedBySlug: null,
    leadPiSlug: 'pi-ramirez',
    coPiSlugs: ['pi-patel'],
    funding: [],
  },

  // ---- Chemistry ----
  {
    grantNumber: 'RU-25-0014',
    title: 'Catalytic Upcycling of Polyolefin Plastics',
    abstract:
      'Heterogeneous catalysts for converting polyethylene waste streams into high-value lubricant-range hydrocarbons.',
    status: 'ACTIVE',
    departmentCode: 'CHEM',
    fundingAgencyShort: 'DOE',
    fiscalYearLabel: 'FY2025',
    sponsorAwardId: 'DOE-EE0009987',
    totalBudget: 1_400_000,
    startOffsetDays: -550,
    endOffsetDays: 200,
    createdBySlug: 'pi-fischer',
    approvedBySlug: 'admin-tanaka',
    leadPiSlug: 'pi-fischer',
    coPiSlugs: ['pi-grant'],
    funding: [
      { fiscalYearLabel: 'FY2025', planned: 700_000, actual: 689_500 },
      { fiscalYearLabel: 'FY2026', planned: 700_000, actual: 421_000 },
    ],
  },
  {
    grantNumber: 'RU-26-0007',
    title: 'Photoredox Catalysis for C–H Functionalization',
    abstract:
      'Visible-light photocatalysts enabling site-selective late-stage functionalization of complex pharmaceuticals.',
    status: 'ACTIVE',
    departmentCode: 'CHEM',
    fundingAgencyShort: 'NSF',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: 'NSF-2398876',
    totalBudget: 720_000,
    startOffsetDays: -150,
    endOffsetDays: 580,
    createdBySlug: 'pi-wong',
    approvedBySlug: 'admin-burke',
    leadPiSlug: 'pi-wong',
    funding: [
      { fiscalYearLabel: 'FY2026', planned: 360_000, actual: 142_000 },
    ],
  },
  {
    grantNumber: 'RU-26-0008',
    title: 'Solid-State Electrolytes for Lithium-Metal Batteries',
    abstract:
      'Sulfide-glass electrolyte synthesis and interfacial stability characterization at relevant cycling rates.',
    status: 'APPROVED',
    departmentCode: 'CHEM',
    fundingAgencyShort: 'DOE',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: 'DOE-EE0010234',
    totalBudget: 1_650_000,
    startOffsetDays: 30,
    endOffsetDays: 1100,
    createdBySlug: 'pi-grant',
    approvedBySlug: 'demo-admin',
    leadPiSlug: 'pi-grant',
    coPiSlugs: ['pi-fischer', 'pi-novak'],
    funding: [],
  },

  // ---- Mechanical Engineering ----
  {
    grantNumber: 'RU-26-0009',
    title: 'Bio-Inspired Soft Actuators for Surgical Robotics',
    abstract:
      'Pneumatic soft-robotic end effectors with embedded strain sensing for minimally invasive procedures.',
    status: 'ACTIVE',
    departmentCode: 'MECH',
    fundingAgencyShort: 'NIH',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: 'NIH-R21-EB034501',
    totalBudget: 580_000,
    startOffsetDays: -250,
    endOffsetDays: 480,
    createdBySlug: 'pi-novak',
    approvedBySlug: 'admin-burke',
    leadPiSlug: 'pi-novak',
    funding: [
      { fiscalYearLabel: 'FY2025', planned: 290_000, actual: 281_000 },
      { fiscalYearLabel: 'FY2026', planned: 290_000, actual: 134_000 },
    ],
  },
  {
    grantNumber: 'RU-26-0010',
    title: 'Hypersonic Boundary-Layer Transition in Reusable Vehicles',
    abstract:
      'Wind-tunnel and CFD investigation of transition mechanisms relevant to reusable hypersonic platforms.',
    status: 'SUBMITTED',
    departmentCode: 'MECH',
    fundingAgencyShort: 'DARPA',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: null,
    totalBudget: 1_950_000,
    startOffsetDays: null,
    endOffsetDays: null,
    createdBySlug: 'pi-novak',
    approvedBySlug: null,
    leadPiSlug: 'pi-novak',
    funding: [],
  },

  // ---- Historical / closed / rejected for status variety ----
  {
    grantNumber: 'RU-25-0007',
    title: 'Pollinator Network Resilience in Urban Greenways',
    abstract:
      'Three-year survey of bee and lepidopteran communities along restored urban corridors.',
    status: 'CLOSED',
    departmentCode: 'BIO',
    fundingAgencyShort: 'SLOAN',
    fiscalYearLabel: 'FY2024',
    sponsorAwardId: 'SLOAN-G-2022-19345',
    totalBudget: 410_000,
    startOffsetDays: -900,
    endOffsetDays: -60,
    createdBySlug: 'pi-chen',
    approvedBySlug: 'admin-tanaka',
    leadPiSlug: 'pi-chen',
    funding: [
      { fiscalYearLabel: 'FY2024', planned: 205_000, actual: 204_300 },
      { fiscalYearLabel: 'FY2025', planned: 205_000, actual: 198_700 },
    ],
  },
  {
    grantNumber: 'RU-25-0019',
    title: 'Quantum Error Mitigation on NISQ Hardware',
    abstract:
      'Empirical study of zero-noise extrapolation across superconducting and trapped-ion platforms.',
    status: 'REJECTED',
    departmentCode: 'CS',
    fundingAgencyShort: 'NSF',
    fiscalYearLabel: 'FY2025',
    sponsorAwardId: null,
    totalBudget: 540_000,
    startOffsetDays: null,
    endOffsetDays: null,
    createdBySlug: 'pi-patel',
    approvedBySlug: null,
    leadPiSlug: 'pi-patel',
    funding: [],
  },
  {
    grantNumber: 'RU-26-0011',
    title: 'Adaptive Optics for Deep-Tissue Two-Photon Imaging',
    abstract:
      'Wavefront-shaping techniques to extend imaging depth in scattering biological tissue.',
    status: 'DRAFT',
    departmentCode: 'CHEM',
    fundingAgencyShort: 'NIH',
    fiscalYearLabel: 'FY2026',
    sponsorAwardId: null,
    totalBudget: 690_000,
    startOffsetDays: null,
    endOffsetDays: null,
    createdBySlug: 'pi-wong',
    approvedBySlug: null,
    leadPiSlug: 'pi-wong',
    funding: [],
  },
];

// -----------------------------------------------------------------------------
// Deliverables
// -----------------------------------------------------------------------------

type SeedDeliverable = {
  grantNumber: string;
  type:
    | 'PROGRESS_REPORT'
    | 'ANNUAL_REPORT'
    | 'FINAL_REPORT'
    | 'DATASET'
    | 'PUBLICATION'
    | 'MILESTONE';
  title: string;
  description?: string;
  status:
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'ACCEPTED'
    | 'REVISION_REQUESTED'
    | 'WITHDRAWN';
  dueOffsetDays: number; // relative to TODAY
  fiscalYearLabel: string;
  assigneeSlug: string | null;
  submittedOffsetDays?: number;
  completedOffsetDays?: number;
};

const deliverables: SeedDeliverable[] = [
  // ----- RU-26-0001 (Coral Reef, Biology, ACTIVE) — has overdue items for AI demo
  {
    grantNumber: 'RU-26-0001',
    type: 'PROGRESS_REPORT',
    title: 'Q4 FY2025 Progress Report',
    status: 'ACCEPTED',
    dueOffsetDays: -120,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-chen',
    submittedOffsetDays: -125,
    completedOffsetDays: -110,
  },
  {
    grantNumber: 'RU-26-0001',
    type: 'PROGRESS_REPORT',
    title: 'Q1 FY2026 Progress Report',
    description: 'Reef survey results from autumn dive season.',
    status: 'IN_PROGRESS',
    dueOffsetDays: -23, // overdue — AI demo will surface this
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-chen',
  },
  {
    grantNumber: 'RU-26-0001',
    type: 'DATASET',
    title: '16S rRNA sequencing dataset, year 2',
    status: 'IN_PROGRESS',
    dueOffsetDays: -40, // overdue
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-okafor',
  },
  {
    grantNumber: 'RU-26-0001',
    type: 'PUBLICATION',
    title: 'Microbial shifts during 2024 Caribbean heatwave (ISME J)',
    status: 'ACCEPTED',
    dueOffsetDays: -200,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-chen',
    submittedOffsetDays: -210,
    completedOffsetDays: -180,
  },
  {
    grantNumber: 'RU-26-0001',
    type: 'MILESTONE',
    title: 'Year 2 site-selection decision',
    status: 'NOT_STARTED',
    dueOffsetDays: 60,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-chen',
  },

  // ----- RU-26-0002 (CRISPR-DX, Biology, ACTIVE) — rich history for budget burn demo
  {
    grantNumber: 'RU-26-0002',
    type: 'ANNUAL_REPORT',
    title: 'Year 2 Annual Report to NIH',
    status: 'ACCEPTED',
    dueOffsetDays: -90,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-okafor',
    submittedOffsetDays: -95,
    completedOffsetDays: -80,
  },
  {
    grantNumber: 'RU-26-0002',
    type: 'PUBLICATION',
    title: 'Engineered Cas13 variants for paper-strip readout (Nat. Biotechnol.)',
    status: 'ACCEPTED',
    dueOffsetDays: -140,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-okafor',
    submittedOffsetDays: -150,
    completedOffsetDays: -130,
  },
  {
    grantNumber: 'RU-26-0002',
    type: 'PROGRESS_REPORT',
    title: 'Q1 FY2026 Progress Report',
    status: 'SUBMITTED',
    dueOffsetDays: -10,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-okafor',
    submittedOffsetDays: -12,
  },
  {
    grantNumber: 'RU-26-0002',
    type: 'DATASET',
    title: 'Field validation dataset (Region A, n=412)',
    status: 'IN_PROGRESS',
    dueOffsetDays: -7, // overdue, Biology
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-chen',
  },
  {
    grantNumber: 'RU-26-0002',
    type: 'MILESTONE',
    title: 'Phase 2 IRB approval at Region B partner site',
    status: 'NOT_STARTED',
    dueOffsetDays: 45,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-okafor',
  },
  {
    grantNumber: 'RU-26-0002',
    type: 'FINAL_REPORT',
    title: 'Final Report to NIH',
    status: 'NOT_STARTED',
    dueOffsetDays: 350,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-okafor',
  },

  // ----- RU-26-0004 (Multi-agent verification, CS, ACTIVE)
  {
    grantNumber: 'RU-26-0004',
    type: 'PROGRESS_REPORT',
    title: 'Q4 FY2025 Progress Report',
    status: 'ACCEPTED',
    dueOffsetDays: -110,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-ramirez',
    submittedOffsetDays: -115,
    completedOffsetDays: -100,
  },
  {
    grantNumber: 'RU-26-0004',
    type: 'PUBLICATION',
    title: 'Bounded tool-use proofs for agent ensembles (POPL)',
    status: 'ACCEPTED',
    dueOffsetDays: -60,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-ramirez',
    submittedOffsetDays: -75,
    completedOffsetDays: -55,
  },
  {
    grantNumber: 'RU-26-0004',
    type: 'PROGRESS_REPORT',
    title: 'Q1 FY2026 Progress Report',
    status: 'IN_PROGRESS',
    dueOffsetDays: 14,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-ramirez',
  },
  {
    grantNumber: 'RU-26-0004',
    type: 'MILESTONE',
    title: 'Reference implementation v0.2 release',
    status: 'IN_PROGRESS',
    dueOffsetDays: 90,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-patel',
  },

  // ----- RU-26-0005 (Energy-aware compilers, CS, ACTIVE)
  {
    grantNumber: 'RU-26-0005',
    type: 'PROGRESS_REPORT',
    title: 'Q1 FY2026 Progress Report',
    status: 'IN_PROGRESS',
    dueOffsetDays: -2, // freshly overdue
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-patel',
  },
  {
    grantNumber: 'RU-26-0005',
    type: 'PUBLICATION',
    title: 'Joules-per-inference compiler heuristics (ASPLOS)',
    status: 'SUBMITTED',
    dueOffsetDays: -30,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-patel',
    submittedOffsetDays: -35,
  },
  {
    grantNumber: 'RU-26-0005',
    type: 'DATASET',
    title: 'Edge-accelerator benchmark suite v1',
    status: 'NOT_STARTED',
    dueOffsetDays: 120,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-patel',
  },

  // ----- RU-25-0014 (Polyolefin upcycling, Chemistry, ACTIVE)
  {
    grantNumber: 'RU-25-0014',
    type: 'ANNUAL_REPORT',
    title: 'Year 1 Annual Report to DOE',
    status: 'ACCEPTED',
    dueOffsetDays: -300,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-fischer',
    submittedOffsetDays: -305,
    completedOffsetDays: -290,
  },
  {
    grantNumber: 'RU-25-0014',
    type: 'PUBLICATION',
    title: 'Selective C–C bond cleavage in polyethylene (JACS)',
    status: 'ACCEPTED',
    dueOffsetDays: -180,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-fischer',
    submittedOffsetDays: -195,
    completedOffsetDays: -170,
  },
  {
    grantNumber: 'RU-25-0014',
    type: 'PROGRESS_REPORT',
    title: 'Q1 FY2026 Progress Report',
    status: 'SUBMITTED',
    dueOffsetDays: -5,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-fischer',
    submittedOffsetDays: -6,
  },
  {
    grantNumber: 'RU-25-0014',
    type: 'MILESTONE',
    title: 'Pilot-scale reactor commissioning',
    status: 'IN_PROGRESS',
    dueOffsetDays: 75,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-grant',
  },
  {
    grantNumber: 'RU-25-0014',
    type: 'FINAL_REPORT',
    title: 'Final Report to DOE',
    status: 'NOT_STARTED',
    dueOffsetDays: 200,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-fischer',
  },

  // ----- RU-26-0007 (Photoredox, Chemistry, ACTIVE)
  {
    grantNumber: 'RU-26-0007',
    type: 'PROGRESS_REPORT',
    title: 'Q1 FY2026 Progress Report',
    status: 'IN_PROGRESS',
    dueOffsetDays: 21,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-wong',
  },
  {
    grantNumber: 'RU-26-0007',
    type: 'MILESTONE',
    title: 'Catalyst library screen complete',
    status: 'NOT_STARTED',
    dueOffsetDays: 110,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-wong',
  },
  {
    grantNumber: 'RU-26-0007',
    type: 'PUBLICATION',
    title: 'Late-stage C–H functionalization scope study',
    status: 'NOT_STARTED',
    dueOffsetDays: 240,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-wong',
  },

  // ----- RU-26-0009 (Soft actuators, MECH, ACTIVE)
  {
    grantNumber: 'RU-26-0009',
    type: 'PROGRESS_REPORT',
    title: 'Q4 FY2025 Progress Report',
    status: 'ACCEPTED',
    dueOffsetDays: -100,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-novak',
    submittedOffsetDays: -110,
    completedOffsetDays: -90,
  },
  {
    grantNumber: 'RU-26-0009',
    type: 'MILESTONE',
    title: 'Bench-top end-effector demo (3 DoF)',
    status: 'IN_PROGRESS',
    dueOffsetDays: -15, // overdue
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-novak',
  },
  {
    grantNumber: 'RU-26-0009',
    type: 'PROGRESS_REPORT',
    title: 'Q1 FY2026 Progress Report',
    status: 'IN_PROGRESS',
    dueOffsetDays: 28,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-novak',
  },
  {
    grantNumber: 'RU-26-0009',
    type: 'DATASET',
    title: 'Strain-sensor characterization dataset',
    status: 'NOT_STARTED',
    dueOffsetDays: 180,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-novak',
  },

  // ----- RU-25-0007 (Pollinator network, Biology, CLOSED)
  {
    grantNumber: 'RU-25-0007',
    type: 'FINAL_REPORT',
    title: 'Final Report to Sloan Foundation',
    status: 'ACCEPTED',
    dueOffsetDays: -75,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-chen',
    submittedOffsetDays: -85,
    completedOffsetDays: -65,
  },
  {
    grantNumber: 'RU-25-0007',
    type: 'PUBLICATION',
    title: 'Three-year urban pollinator census (Ecol. Appl.)',
    status: 'ACCEPTED',
    dueOffsetDays: -240,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-chen',
    submittedOffsetDays: -260,
    completedOffsetDays: -230,
  },
  {
    grantNumber: 'RU-25-0007',
    type: 'DATASET',
    title: 'Open pollinator observation dataset (Dryad)',
    status: 'ACCEPTED',
    dueOffsetDays: -90,
    fiscalYearLabel: 'FY2025',
    assigneeSlug: 'pi-chen',
    submittedOffsetDays: -100,
    completedOffsetDays: -80,
  },

  // ----- RU-26-0008 (Solid-state electrolytes, Chemistry, APPROVED — pre-kickoff)
  {
    grantNumber: 'RU-26-0008',
    type: 'MILESTONE',
    title: 'Year 1 kickoff meeting',
    status: 'NOT_STARTED',
    dueOffsetDays: 45,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-grant',
  },
  {
    grantNumber: 'RU-26-0008',
    type: 'PROGRESS_REPORT',
    title: 'Q1 first-year Progress Report',
    status: 'NOT_STARTED',
    dueOffsetDays: 120,
    fiscalYearLabel: 'FY2026',
    assigneeSlug: 'pi-grant',
  },
];

// -----------------------------------------------------------------------------
// Seed orchestration
// -----------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding GrantHub demo data for Rockville University...\n');

  // ---- Institution ------------------------------------------------------
  const institution = await prisma.institution.upsert({
    where: { shortName: 'rockville' },
    update: {},
    create: {
      name: 'Rockville University',
      shortName: 'rockville',
    },
  });
  console.log(`✓ Institution: ${institution.name}`);

  // ---- Departments ------------------------------------------------------
  const departmentByCode = new Map<string, number>();
  for (const dept of departments) {
    const row = await prisma.department.upsert({
      where: {
        institutionId_code: { institutionId: institution.id, code: dept.code },
      },
      update: { name: dept.name, active: true },
      create: {
        institutionId: institution.id,
        name: dept.name,
        code: dept.code,
        active: true,
      },
    });
    departmentByCode.set(dept.code, row.id);
  }
  console.log(`✓ Departments: ${departments.length}`);

  // ---- Funding agencies -------------------------------------------------
  const agencyByShort = new Map<string, number>();
  for (const agency of fundingAgencies) {
    const row = await prisma.fundingAgency.upsert({
      where: {
        institutionId_shortName: {
          institutionId: institution.id,
          shortName: agency.shortName,
        },
      },
      update: { name: agency.name, agencyType: agency.agencyType, active: true },
      create: {
        institutionId: institution.id,
        name: agency.name,
        shortName: agency.shortName,
        agencyType: agency.agencyType,
        active: true,
      },
    });
    agencyByShort.set(agency.shortName, row.id);
  }
  console.log(`✓ Funding agencies: ${fundingAgencies.length}`);

  // ---- Fiscal years -----------------------------------------------------
  const fiscalYearByLabel = new Map<string, number>();
  for (const fy of fiscalYears) {
    const row = await prisma.fiscalYear.upsert({
      where: {
        institutionId_label: { institutionId: institution.id, label: fy.label },
      },
      update: { startDate: fy.startDate, endDate: fy.endDate, closed: fy.closed },
      create: {
        institutionId: institution.id,
        label: fy.label,
        startDate: fy.startDate,
        endDate: fy.endDate,
        closed: fy.closed,
      },
    });
    fiscalYearByLabel.set(fy.label, row.id);
  }
  console.log(`✓ Fiscal years: ${fiscalYears.length}`);

  // ---- Users ------------------------------------------------------------
  const userBySlug = new Map<string, number>();
  for (const u of users) {
    const departmentId =
      u.departmentCode != null ? departmentByCode.get(u.departmentCode) ?? null : null;
    const auth0Sub = `seed|${u.slug}`; // overwritten on first real Auth0 login

    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        title: u.title,
        role: u.role,
        departmentId,
        active: true,
      },
      create: {
        institutionId: institution.id,
        auth0Sub,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        title: u.title,
        role: u.role,
        departmentId,
        active: true,
      },
    });
    userBySlug.set(u.slug, row.id);
  }
  console.log(`✓ Users: ${users.length} (3 demo logins, 8 PIs, 3 research admins)`);

  // ---- Grants -----------------------------------------------------------
  const grantByNumber = new Map<string, number>();
  for (const g of grants) {
    const departmentId = departmentByCode.get(g.departmentCode);
    const fundingAgencyId = agencyByShort.get(g.fundingAgencyShort);
    const fiscalYearId = fiscalYearByLabel.get(g.fiscalYearLabel);
    const createdById = userBySlug.get(g.createdBySlug);
    const approvedById = g.approvedBySlug ? userBySlug.get(g.approvedBySlug) ?? null : null;

    if (!departmentId || !fundingAgencyId || !fiscalYearId || !createdById) {
      throw new Error(`Bad reference data on grant ${g.grantNumber}`);
    }

    // Workflow timestamps based on status.
    const submittedAt =
      g.status === 'SUBMITTED' ||
      g.status === 'UNDER_REVIEW' ||
      g.status === 'APPROVED' ||
      g.status === 'ACTIVE' ||
      g.status === 'CLOSED' ||
      g.status === 'REJECTED'
        ? daysFromToday(-90)
        : null;
    const approvedAt =
      g.status === 'APPROVED' || g.status === 'ACTIVE' || g.status === 'CLOSED'
        ? daysFromToday(-60)
        : null;
    const closedAt = g.status === 'CLOSED' ? daysFromToday(-30) : null;

    const row = await prisma.grant.upsert({
      where: { grantNumber: g.grantNumber },
      update: {
        title: g.title,
        abstract: g.abstract,
        status: g.status,
        departmentId,
        fundingAgencyId,
        fiscalYearId,
        sponsorAwardId: g.sponsorAwardId,
        totalBudget: new Prisma.Decimal(g.totalBudget),
        startDate: g.startOffsetDays != null ? daysFromToday(g.startOffsetDays) : null,
        endDate: g.endOffsetDays != null ? daysFromToday(g.endOffsetDays) : null,
        approvedById,
        submittedAt,
        approvedAt,
        closedAt,
      },
      create: {
        institutionId: institution.id,
        grantNumber: g.grantNumber,
        title: g.title,
        abstract: g.abstract,
        status: g.status,
        departmentId,
        fundingAgencyId,
        fiscalYearId,
        sponsorAwardId: g.sponsorAwardId,
        totalBudget: new Prisma.Decimal(g.totalBudget),
        startDate: g.startOffsetDays != null ? daysFromToday(g.startOffsetDays) : null,
        endDate: g.endOffsetDays != null ? daysFromToday(g.endOffsetDays) : null,
        createdById,
        approvedById,
        submittedAt,
        approvedAt,
        closedAt,
      },
    });
    grantByNumber.set(g.grantNumber, row.id);

    // Grant roles ------------------------------------------------------------
    const leadId = userBySlug.get(g.leadPiSlug);
    if (!leadId) throw new Error(`Lead PI not found for ${g.grantNumber}`);
    await prisma.grantRole.upsert({
      where: { grantId_userId: { grantId: row.id, userId: leadId } },
      update: { role: 'LEAD_PI' },
      create: { grantId: row.id, userId: leadId, role: 'LEAD_PI' },
    });
    for (const slug of g.coPiSlugs ?? []) {
      const uid = userBySlug.get(slug);
      if (!uid) throw new Error(`Co-PI ${slug} not found for ${g.grantNumber}`);
      await prisma.grantRole.upsert({
        where: { grantId_userId: { grantId: row.id, userId: uid } },
        update: { role: 'CO_PI' },
        create: { grantId: row.id, userId: uid, role: 'CO_PI' },
      });
    }
    for (const slug of g.collaboratorSlugs ?? []) {
      const uid = userBySlug.get(slug);
      if (!uid) throw new Error(`Collaborator ${slug} not found for ${g.grantNumber}`);
      await prisma.grantRole.upsert({
        where: { grantId_userId: { grantId: row.id, userId: uid } },
        update: { role: 'COLLABORATOR' },
        create: { grantId: row.id, userId: uid, role: 'COLLABORATOR' },
      });
    }

    // Funding rows ----------------------------------------------------------
    for (const f of g.funding) {
      const fyId = fiscalYearByLabel.get(f.fiscalYearLabel);
      if (!fyId) throw new Error(`FY ${f.fiscalYearLabel} not found for ${g.grantNumber}`);
      await prisma.funding.upsert({
        where: { grantId_fiscalYearId: { grantId: row.id, fiscalYearId: fyId } },
        update: {
          plannedAmount: new Prisma.Decimal(f.planned),
          actualAmount: new Prisma.Decimal(f.actual),
        },
        create: {
          grantId: row.id,
          fiscalYearId: fyId,
          plannedAmount: new Prisma.Decimal(f.planned),
          actualAmount: new Prisma.Decimal(f.actual),
        },
      });
    }
  }
  console.log(`✓ Grants: ${grants.length} (across all 7 statuses)`);

  // ---- Deliverables -----------------------------------------------------
  // Deliverables don't have a natural unique key (other than their PK), so we
  // upsert on (grantId, title) which is unique enough for seed purposes.
  for (const d of deliverables) {
    const grantId = grantByNumber.get(d.grantNumber);
    const fiscalYearId = fiscalYearByLabel.get(d.fiscalYearLabel);
    const assigneeId = d.assigneeSlug ? userBySlug.get(d.assigneeSlug) ?? null : null;
    if (!grantId || !fiscalYearId) {
      throw new Error(`Bad reference data on deliverable "${d.title}"`);
    }

    const existing = await prisma.deliverable.findFirst({
      where: { grantId, title: d.title },
      select: { id: true },
    });

    const data = {
      grantId,
      fiscalYearId,
      type: d.type,
      title: d.title,
      description: d.description ?? null,
      status: d.status,
      dueDate: daysFromToday(d.dueOffsetDays),
      assigneeId,
      submittedAt:
        d.submittedOffsetDays != null ? daysFromToday(d.submittedOffsetDays) : null,
      completedAt:
        d.completedOffsetDays != null ? daysFromToday(d.completedOffsetDays) : null,
    };

    if (existing) {
      await prisma.deliverable.update({ where: { id: existing.id }, data });
    } else {
      await prisma.deliverable.create({ data });
    }
  }
  console.log(`✓ Deliverables: ${deliverables.length}`);

  // ---- Summary ----------------------------------------------------------
  console.log('\n🎉 Seed complete.\n');
  console.log('Demo logins (match by email when you wire Auth0):');
  console.log('  pi@demo.granthub.local         → PI            (Biology)');
  console.log('  admin@demo.granthub.local      → RESEARCH_ADMIN');
  console.log('  superadmin@demo.granthub.local → ADMIN');
  console.log('\nFor the AI demo on Day 9, the following are pre-baked:');
  console.log('  • Biology has 3+ overdue deliverables this quarter');
  console.log('  • CRISPR-DX (RU-26-0002) has 3 FYs of planned-vs-actual budget data');
  console.log('  • 4 publications completed in FY2025 (2 BIO, 2 CS-adjacent)');
  console.log('  • 3 grants in SUBMITTED/UNDER_REVIEW awaiting research-admin action');
  console.log('  • Chemistry has exactly 3 PIs');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:');
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });