import type { ProjectSlug } from "./types";

export interface ProfileLink {
  label: string;
  href: string;
  kind: "github" | "linkedin";
}

export interface ExperienceItem {
  org: string;
  title: string;
  /** Display range, e.g. "Sep 2025 to present". */
  dates: string;
  location?: string;
  lines: string[];
}

export interface EducationItem {
  school: string;
  credential: string;
  year: string;
}

export interface CapabilityGroup {
  title: string;
  detail: string;
  /** Projects on this site that demonstrate the capability. */
  projects: ProjectSlug[];
}

export interface AlsoBuiltItem {
  name: string;
  line: string;
}

export interface Profile {
  name: string;
  location: string;
  headline: string;
  intro: string;
  links: ProfileLink[];
  experience: ExperienceItem[];
  education: EducationItem[];
  capabilities: CapabilityGroup[];
  alsoBuilt: AlsoBuiltItem[];
}

export const profile: Profile = {
  name: "Ryan Swanson",
  location: "Petaluma, California",
  headline: "I design and build web products, native Apple apps, and cross-platform desktop tools.",
  intro:
    "I am a software engineer and the founder of LearnCenter LLC, where I build websites and software for small businesses and publish my own apps. I work across TypeScript and React, Python and FastAPI, Swift, and Rust, and I put most of my effort into software that behaves correctly when something goes wrong. I use AI coding agents in my workflow, and the design decisions, review, and testing are mine.",
  links: [
    { label: "GitHub", href: "https://github.com/Ryan-Swanson", kind: "github" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/ryanswanson1995/", kind: "linkedin" },
  ],
  experience: [
    {
      org: "LearnCenter LLC",
      title: "Software Engineer & Founder",
      dates: "Sep 2025 to present",
      location: "Santa Rosa, California",
      lines: [
        "I design, build, and run websites and web applications for small businesses, with client identities kept private.",
        "I publish my own products through the company, including ProTuner on the App Store and fr3t.app.",
      ],
    },
    {
      org: "TransformWorks",
      title: "Technical Consultant",
      dates: "Sep 2025 to Dec 2025",
      location: "Santa Rosa, California",
      lines: [
        "Full-stack consulting: I built AI evaluation demos for an education client with Next.js, FastAPI, and Python, covering frontend, backend, data models, evaluation logic, and deployment.",
      ],
    },
    {
      org: "Avant Health Sciences",
      title: "Software Developer",
      dates: "Jan 2022 to Jun 2023",
      location: "Remote",
      lines: [
        "Built Django and SQL-backed systems with account workflows for patient-matching and deduplication, used in hospital-partner demonstrations.",
        "Automated ETL and data-validation workflows with Python and Bash.",
      ],
    },
    {
      org: "Exchange Bank",
      title: "Bank Teller, Financial Services",
      dates: "2018 to 2019",
      location: "Petaluma, California",
      lines: ["Handled customer transactions and account service in a regulated banking environment."],
    },
    {
      org: "Mission Engineering",
      title: "Production Manager",
      dates: "2013 to 2018",
      location: "Petaluma, California",
      lines: ["Coordinated scheduling, inventory, vendors, shipping, and production planning, and trained staff."],
    },
  ],
  education: [
    {
      school: "University of California San Diego",
      credential: "B.S. Applied Mathematics",
      year: "2025",
    },
    {
      school: "Santa Rosa Junior College",
      credential:
        "A.S. Computer Science, Mathematics and Physics, plus a Certificate in Web and Mobile Front-End Development",
      year: "2023",
    },
  ],
  capabilities: [
    {
      title: "Web products",
      detail:
        "Next.js, React, and TypeScript apps with static generation, validated URL state, versioned client storage, and security headers.",
      projects: ["fr3t-app", "learncenter-dev", "groovemind"],
    },
    {
      title: "Native Apple apps",
      detail:
        "Swift, SwiftUI, and AppKit for macOS, iPhone, and Apple Watch, including menu-bar apps, Accessibility-based text insertion, and WatchConnectivity sync.",
      projects: ["talkmac", "protuner", "inputshare"],
    },
    {
      title: "Systems and networking",
      detail:
        "Rust with QUIC and TLS 1.3, SPAKE2 pairing, a versioned C ABI, and Swift bindings shared by native macOS and Windows hosts.",
      projects: ["inputshare"],
    },
    {
      title: "Audio and music software",
      detail:
        "Sample-accurate scheduling in Tone.js and AVAudioEngine, pitch validation and smoothing, and exact-time MIDI generation and export.",
      projects: ["fr3t-app", "protuner", "groovemind"],
    },
    {
      title: "Applied AI with guardrails",
      detail:
        "On-device speech recognition, local models on MLX, and structured model output that code validates before anything reaches the user.",
      projects: ["talkmac", "groovemind"],
    },
    {
      title: "Backend and delivery",
      detail:
        "FastAPI services with validation and rate limiting, Firebase App Hosting, and CI that runs linting, type checks, tests, and builds.",
      projects: ["learncenter-dev", "groovemind", "fr3t-app"],
    },
  ],
  alsoBuilt: [
    {
      name: "fr3t for iOS",
      line: "A native SwiftUI version of fr3t.app for iPhone, in development.",
    },
  ],
};
