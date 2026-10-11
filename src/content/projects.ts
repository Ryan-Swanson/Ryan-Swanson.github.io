import { shot } from "./media";
import type { Project, ProjectSlug } from "./types";

const PRIVATE_SOURCE =
  "Source is private. The screens and architecture notes here come straight from the current code.";

/* fr3t.app */

const fr3tHero = shot(
  "fr3t-app/workspace",
  "fr3t.app desktop workspace with a C major scale on a guitar fretboard, the diatonic chord grid, and a C, G, Am, F progression in the sequencer timeline.",
);

const fr3t: Project = {
  slug: "fr3t-app",
  title: "fr3t.app",
  kind: "Web app",
  summary: "A browser fretboard trainer for scales, chords, CAGED shapes, and chord progressions.",
  medium: ["Next.js", "TypeScript", "Zustand", "Tone.js", "Vitest and Playwright"],
  platforms: ["Web, desktop and mobile browsers"],
  status: {
    label: "Live",
    detail: "Public and free at fr3t.app. No account needed.",
    tone: "live",
  },
  role: "Sole designer and developer",
  years: "2025 to 2026",
  hero: fr3tHero,
  links: [{ label: "Open fr3t.app", href: "https://fr3t.app/", kind: "live" }],
  sourceNote: PRIVATE_SOURCE,
  caseStudy: {
    problem:
      "Guitar, bass, and ukulele learners usually move between chord charts, scale diagrams, and a separate metronome to see how theory maps onto the neck. I wanted one place where a key, scale, or chord appears on the fretboard, plays back with real audio, and can be shared as a link.",
    audience:
      "Guitar, bass, and ukulele players learning scales, chords, CAGED positions, and progressions in a browser, without an account.",
    built: [
      "An interactive fretboard for guitar (6 and 7 string), bass (4 and 5 string), and ukulele, including re-entrant and validated custom tunings.",
      "A music theory engine I wrote for note spelling, scale degrees, chord voicings, and CAGED positions.",
      "A chord sequencer with genre presets, swing, looping, and a metronome, played through Tone.js samples and an effects chain.",
      "Note-finding and interval-training practice modes.",
      "Statically generated scale and chord reference pages that open into the app with the same state.",
    ],
    architecture: [
      "Next.js App Router with React and TypeScript. The interactive workspace runs in the browser, and reference routes are generated at build time with generateStaticParams.",
      "Separate Zustand stores for the fretboard, sequencer, practice, and audio, persisted to localStorage with explicit schema versions and migrations.",
      "View state lives in short, validated query parameters, so any view can be linked and a bad link falls back safely.",
      "Tone.js audio: instrument samplers, a compressor, limiter, reverb, and delay chain, and Transport-based scheduling for the sequencer and metronome.",
      "Served from Firebase App Hosting as a Next.js standalone server. There is no user backend and no accounts.",
    ],
    decisions: [
      {
        title: "Write the theory engine instead of using a library",
        body: "Note names on the fretboard, the reference pages, and printable workbooks all come from one engine, so I needed full control over spelling rules. It spells a black-key tonic whichever way gives fewer accidentals for the chosen scale (Db major, but C# minor) and keeps interval names like #11 and b5 distinct. Owning the theory code meant giving it its own validation scripts in CI, so every spelling rule is checked on every change.",
      },
      {
        title: "Version every persisted store",
        body: "There are no accounts, so localStorage is the only place a returning user's settings live. Every persisted store declares a version and a migration, and a guard covers a Zustand v5 merge behavior that would otherwise overwrite the seeded starter progression. Returning users keep their settings across every release.",
      },
      {
        title: "Use URLs as the share format",
        body: "I chose validated query parameters over saved sessions on a server. A custom tuning is accepted only as a complete set of instrument, string count, tuning, and open-string pitches, so a partial link cannot produce an impossible fretboard. Every view is shareable with no backend at all.",
      },
    ],
    hardProblem: {
      title: "Keeping the sequencer in time",
      body: "Chords on the grid, including triplet positions between sixteenth-note lines, have to strum exactly with the metronome, survive tempo, swing, and loop changes, and never double-trigger on a loop wrap or seek. The scheduler looks for upcoming blocks in quarter-beat windows through Transport.scheduleRepeat, but schedules each strum at its exact audio-context time, so off-grid triplets land where they belong. A set of already-strummed block IDs prevents duplicates; it is cleared when the tick moves backward or the Transport fires loopStart, which also re-primes blocks that are active at the loop start. Trigger times are forced into the future and kept strictly increasing, with a 0.5 ms offset for simultaneous blocks, because Tone.Player throws when two starts share a timestamp. The playhead reads Transport ticks directly and the store receives only throttled position updates, so playback does not cause a React render every frame.",
    },
    validation: [
      "About 620 Vitest unit tests for the app, plus separate suites for the printable-workbook tooling.",
      "22 Playwright browser suites cover the audio lifecycle, sequencer integration, practice modes, responsive and landscape layouts, keyboard access, and visual regression.",
      "CI runs lint, a type check, the theory validation scripts, unit tests, a production build, a standalone smoke test, and browser checks in Chromium and WebKit on every change.",
    ],
    result:
      "fr3t.app is live and free to use without an account, with the fretboard, sequencer, practice modes, and statically generated scale and chord reference pages built to be found through search.",
    next: [
      "Bass chord voicings and a new round of theory refinements, already built and tested in the repository.",
      "A native iPhone version of fr3t, built in SwiftUI.",
      "Optional sync, so settings and progressions follow a player between devices.",
    ],
    gallery: [
      fr3tHero,
      shot(
        "fr3t-app/practice",
        "fr3t.app note-finding practice mode, asking the player to locate a named note on the guitar fretboard.",
      ),
      shot(
        "fr3t-app/reference",
        "Static reference page for the C major scale on guitar, with the scale drawn on the fretboard and its degrees labeled.",
      ),
      shot(
        "fr3t-app/chords",
        "Chord reference for C major on guitar, with chord tones marked on the fretboard and playable shapes.",
      ),
      shot(
        "fr3t-app/mobile-sequencer",
        "fr3t.app on a phone-sized screen, showing the chord sequencer tab with the starter progression.",
      ),
    ],
  },
};

/* InputShare */

const inputShareHero = shot(
  "inputshare/mac-home",
  "The Mac desktop with InputShare open on Home while sharing with a Windows PC: one receiver connected, controls to return input or stop all sharing, and the desk layout of both computers' displays.",
);

const inputShare: Project = {
  slug: "inputshare",
  title: "InputShare",
  kind: "Cross-platform desktop utility",
  summary: "One keyboard, pointer, and clipboard shared across Mac, Windows, and Linux machines on a local network.",
  medium: ["Rust", "QUIC and TLS 1.3", "SwiftUI", "WinUI 3", "UniFFI and a C ABI"],
  platforms: ["macOS (native app)", "Windows (native app)", "Linux (receiver)"],
  status: {
    label: "Available by arrangement",
    detail:
      "Native apps for macOS and Windows, with two-way sharing confirmed between a Mac and a Windows PC. Linux machines join as receivers. Available by arrangement ahead of a public release.",
    tone: "limited",
  },
  role: "Sole designer and developer",
  years: "2026",
  hero: inputShareHero,
  links: [],
  sourceNote: PRIVATE_SOURCE,
  caseStudy: {
    problem:
      "I work at one desk with several computers, and switching keyboards or reaching for another mouse breaks my focus. A shared keyboard also has to be trustworthy: a dropped connection must not leave a key held down on another machine, and a receiver must not accept input from any host that happens to be on the network.",
    audience:
      "People who work at one desk with several Mac, Windows, or Linux computers on a trusted local network.",
    built: [
      "A Rust core for transport, pairing, trust, display topology, input injection, and multi-format clipboard sync.",
      "A native SwiftUI menu-bar host for macOS with Home, Layout, and Clipboard views and a display arrangement canvas.",
      "A native WinUI 3 host for Windows that runs the same Rust engine in-process.",
      "Receivers for macOS, Windows, and Linux. The Linux receiver injects input through uinput or libei.",
      "Release gate scripts, input replay and latency tools, and a two-machine qualification checklist.",
    ],
    architecture: [
      "QUIC over TLS 1.3 (quinn and rustls) with separate lanes for critical input, coalesced pointer motion, clipboard and topology, and telemetry, so a clipboard transfer never blocks a key-up.",
      "SPAKE2 short-code pairing that pins certificate identities into a persistent trust store. A pairing code is valid for at most 60 seconds and three attempts.",
      "Display topology with edges and crossing zones. Moving the pointer onto another machine is a transaction the receiver acknowledges.",
      "macOS uses the core through UniFFI-generated Swift bindings. Windows uses a hand-versioned C ABI with version, schema, and capability checks.",
      "A typed, versioned wire protocol with capability negotiation between host and receiver.",
    ],
    decisions: [
      {
        title: "Input safety before features",
        body: "I put release tracking, panic stop, and reconnect recovery ahead of polish, discovery, and gaming support. Every injector implements a release-all path that runs on disconnect, heartbeat timeout, stream error, shutdown, and panic stop, and it is a required test gate. A stuck Command key on another machine would make the tool untrustworthy, so other features waited.",
      },
      {
        title: "Explicit pairing, no trust on first use",
        body: "A receiver that accepts any host on the LAN is an input-injection hole. Production receivers require a SPAKE2 short-code exchange that pins identities, and the trust-on-first-use flag is labeled development-only. Pairing takes one short code, and only computers the user approved can ever send input.",
      },
      {
        title: "One Rust engine behind a versioned C ABI",
        body: "Instead of growing a second session client for Windows, the WinUI app loads the same Rust engine through a C ABI that reports its version, schema versions, and a capability bitmask, and it refuses a library that does not match. A build check also stops the GUI from spawning the command-line tool or reimplementing pairing in C#. Pairing, trust, and reconnect logic exist once and behave identically on both platforms.",
      },
    ],
    hardProblem: {
      title: "Never report a cancelled pairing that might have succeeded",
      body: "On the Windows receiver tray, a user can cancel pairing at almost the same moment the native listener commits the new host to the trust store. The tray used to treat the user's stop request as proof that pairing had no effect, so it could say “Pairing cancelled” while the host was in fact trusted. I changed it to report a cancellation only when the native process's own terminal receipt also says cancelled. If that receipt is missing or says anything else, the outcome is “unconfirmed” and the tray asks the user to review Trusted Hosts, and a committed trust record still wins over a stop request. New test cases cover a receipt that is present but still ready, a deleted receipt, and a matched native cancellation.",
    },
    validation: [
      "October 2026 qualification runs: 772 macOS tests with zero failures, and on Windows 813 Rust tests, 307 core tests, and 408 native adapter tests passing, with zero WinUI build warnings.",
      "Two-machine testing confirmed smooth sharing in both directions, Mac to Windows and Windows to Mac, including clicking, typing, scrolling, pausing, and returning input.",
      "CI runs rustfmt, clippy, the Rust workspace tests, and contract tests, and a native workflow builds the macOS ARM64 release and the Windows x64 MSIX package.",
    ],
    result:
      "InputShare 0.3.6 runs as native apps on macOS and Windows on one shared Rust engine, and I use it to drive a Mac and a Windows PC from one keyboard and mouse. It is available by arrangement while I prepare a public release.",
    next: [
      "A signed public release for macOS and Windows.",
      "A desktop app for Linux, building on the Linux receiver that already works.",
      "Sharing beyond one local network.",
    ],
    gallery: [
      inputShareHero,
      shot(
        "inputshare/windows-layout",
        "The Windows 11 desktop with InputShare open on Layout: the desk canvas with two Windows displays and two Mac displays, three active crossing regions, and the MacBook placed to the right of the PC.",
        "The Windows app, built in WinUI 3 on the same Rust engine.",
      ),
    ],
  },
};

/* learncenter.dev */

const learnCenterHero = shot(
  "learncenter-dev/home",
  "learncenter.dev home page on desktop, with the headline, an overview of services, and calls to action.",
);

const learnCenterDev: Project = {
  slug: "learncenter-dev",
  title: "learncenter.dev",
  kind: "Company website",
  summary: "The website for my company, LearnCenter LLC: services, anonymized client work, and products.",
  medium: ["Next.js", "TypeScript", "Tailwind CSS", "FastAPI", "Firebase App Hosting"],
  platforms: ["Web"],
  status: {
    label: "Live",
    detail: "Public company site at learncenter.dev.",
    tone: "live",
  },
  role: "Designer and developer. LearnCenter LLC is my company.",
  years: "2025 to 2026",
  hero: learnCenterHero,
  links: [{ label: "Visit learncenter.dev", href: "https://learncenter.dev/", kind: "company" }],
  sourceNote: PRIVATE_SOURCE,
  caseStudy: {
    problem:
      "My company needed a site that explains its services to small businesses, shows client work without exposing client identities, and handles inquiries reliably. It also hosts support and privacy pages for the apps I publish, so those pages need stable public URLs.",
    audience:
      "Small and local businesses looking for a website, web application, or technical help, plus people looking for support pages for my apps.",
    built: [
      "Service, work, product, guide, and contact pages, with service pages generated from a typed data module.",
      "Client case studies with business names, domains, and contact details withheld, and hard-redacted screenshots.",
      "A contact form validated with react-hook-form and Zod in the browser and with Pydantic in a FastAPI service that delivers mail over SMTP.",
      "Support and privacy pages for my published apps, route metadata, JSON-LD, a sitemap, and an IndexNow submission workflow.",
      "Consent-gated Google Analytics and web-vitals reporting.",
    ],
    architecture: [
      "Next.js 16 App Router, React 19, TypeScript in strict mode, and Tailwind CSS. Content lives in typed modules in the repository, with no CMS and no database.",
      "The frontend runs on Firebase App Hosting. Requests to /api are rewritten to a separate FastAPI service configured for Cloud Run.",
      "The FastAPI service handles contact submissions with Pydantic validation, slowapi rate limiting, SMTP delivery, and readiness checks that report unavailable when mail is not configured.",
      "An enforced Content Security Policy, Permissions-Policy, HSTS, and frame denial on every route, set in next.config.ts.",
      "A Docker Compose and nginx stack for local full-stack runs and as a self-hosted option.",
    ],
    decisions: [
      {
        title: "Anonymize client work by default",
        body: "Clients did not sign up to be portfolio pieces, so every case study withholds the business name, domain, and contact details and uses hard-redacted screenshots. When a client has told me about an outcome, the site presents it as the client's own report, not as a measured result. Clients can trust that working with me will never put their business on display without their say.",
      },
      {
        title: "Keep the contact backend separate",
        body: "The contact form is the only part that needs secrets, so it lives in a small FastAPI service rather than in the Next.js app. The service fails closed: without SMTP configuration, readiness checks return 503 and submissions get a clear retry message instead of disappearing. Secrets never touch the frontend, and the form can never silently drop a lead.",
      },
      {
        title: "Content in code, not a CMS",
        body: "Services, work items, products, and guides are typed TypeScript modules, so a broken reference fails the build and every change goes through review and CI. Every update gets the same review and testing as code.",
      },
    ],
    hardProblem: {
      title: "Rate limiting behind proxies without trusting spoofed headers",
      body: "The contact endpoint allows five submissions an hour per client by default, but behind a proxy every request arrives from the proxy's address, and X-Forwarded-For is easy to forge. The limiter reads X-Forwarded-For only when the direct peer is inside an explicitly configured trusted proxy network. It then walks the chain from right to left and uses the first address that is not a trusted proxy, so a client cannot avoid the limit by prepending fake addresses. If any entry in the chain is not a valid IP address, it falls back to the peer address. An invalid trusted-proxy setting stops the service at startup instead of trusting the wrong peer, and limits can use shared storage such as Redis so quotas hold across instances.",
    },
    validation: [
      "Backend tests cover health, contact, email, and rate-limiter behavior, and frontend tests cover analytics URL sanitization and the contact request helpers.",
      "CI runs ESLint, a TypeScript check, the frontend tests, and a production build, plus flake8 and pytest for the backend, on every push and pull request to main.",
      "The live site serves an enforced Content Security Policy, HSTS, and the other security headers on every route.",
    ],
    result:
      "learncenter.dev is live and is the public home for my company's services, client work, and app support pages. I designed and built it, and I maintain it as the front door for LearnCenter LLC.",
    next: [
      "More case studies as current client projects launch.",
      "Nonce-based script policies to tighten the Content Security Policy further.",
      "More guides for small businesses choosing between a website, a web app, and off-the-shelf tools.",
    ],
    gallery: [
      learnCenterHero,
      shot(
        "learncenter-dev/work",
        "learncenter.dev work page listing client projects with business names withheld and redacted screenshots.",
      ),
      shot(
        "learncenter-dev/case-study",
        "A learncenter.dev case study page for a building supplier website, with the client's name, domain, and contact details withheld in every screenshot.",
      ),
      shot(
        "learncenter-dev/products",
        "learncenter.dev products page listing the company's own apps with their availability.",
      ),
      shot(
        "learncenter-dev/mobile",
        "learncenter.dev home page on a phone-sized screen, with the navigation and opening section.",
      ),
    ],
  },
};

/* TalkMac */

const talkMacHero = shot(
  "talkmac/overview",
  "The Mac desktop with TalkMac's Overview open while listening, with usage totals and the active mode (Parakeet TDT 0.6B v3, no refinement), above the live dictation panel showing the sentence as it is spoken.",
  "Real usage from my own Mac: 1,001 dictations and about 103,000 words. One line is blurred for privacy.",
);

const talkMac: Project = {
  slug: "talkmac",
  title: "TalkMac",
  kind: "macOS app",
  summary: "Local-first macOS dictation that types at the cursor, with optional validated text refinement.",
  medium: ["Swift 6", "AppKit and SwiftUI", "Core ML via FluidAudio", "MLX", "SQLite via GRDB"],
  platforms: ["macOS 26 or later on Apple Silicon"],
  status: {
    label: "Release candidate",
    detail: "Signed, notarized, and in daily use on my Mac. Preparing for public release.",
    tone: "development",
  },
  role: "Sole designer and developer",
  years: "2026",
  hero: talkMacHero,
  links: [],
  sourceNote: PRIVATE_SOURCE,
  caseStudy: {
    problem:
      "I wanted to dictate into whatever Mac app I am already using without sending audio off the machine. That means running speech recognition locally, cleaning up text without letting a model rewrite what I said, and inserting it reliably into editors that behave very differently.",
    audience:
      "Mac users on Apple Silicon who want to dictate into the app in front of them, with audio staying on the device.",
    built: [
      "A menu-bar app with global hotkeys for dictation, commands, and an emergency stop, plus settings for modes, vocabulary, models, privacy, and history.",
      "On-device speech recognition with Parakeet through FluidAudio on Core ML, with Apple Speech as an alternative.",
      "Optional refinement through local Qwen models on MLX, or through OpenAI with per-mode consent, validated before it is used.",
      "A text insertion layer that chooses a route per app and verifies the result.",
      "Searchable local history, and a permission-bounded voice command workflow through Codex.",
    ],
    architecture: [
      "Swift 6 with strict concurrency, AppKit and SwiftUI, split into 27 library packages and 3 executables.",
      "A domain layer with no platform dependencies. Speech recognition and refinement providers sit behind domain protocols and can be swapped.",
      "A versioned model store that pins revisions, expected files, sizes, and hashes.",
      "GRDB over SQLite for history (with FTS5 search), modes, and diagnostics. Credentials live in the Keychain.",
      "Bounded integrations for Codex, Chrome, and Safari that use authenticated IPC and fail closed.",
      "61 architecture decision records and a dedicated architecture test target track the layering.",
    ],
    decisions: [
      {
        title: "Local by default, cloud only by consent",
        body: "Microphone audio stays on the Mac for local dictation. Cloud refinement is text-only, needs the user's own key in the Keychain and per-mode permission, and falls back to local text if validation fails. Privacy is the default, not an upgrade.",
      },
      {
        title: "Treat model output as a proposal",
        body: "Local refinement must return exactly one JSON object with the text and an empty edits list, within a bounded token budget and a 25 second deadline. TalkMac derives edit spans itself after checking that the spoken words were preserved, rather than trusting the model's edits. Any timeout, schema failure, or rejected output falls back to the deterministic local text, so a refinement failure never costs the user their dictation.",
      },
      {
        title: "Commands fail closed",
        body: "Voice commands can act in other apps, so TalkMac denies permission expansion whenever it cannot prove the scope, refuses unknown protocol versions, and keeps model-reported success marked as unverified. Emergency Stop revokes local authority before waiting on the server. A voice command can never do more than the user approved.",
      },
    ],
    hardProblem: {
      title: "Inserting text that actually lands",
      body: "Some editors report success for an Accessibility text write and then discard it. In July 2026 testing, Safari accepted the write while leaving a web textarea empty, and Chromium and Electron apps behaved the same way. I limited direct Accessibility writes to TextEdit, Notes, and Mail, which passed physical testing. Everywhere else TalkMac puts the text on a marked pasteboard, sends Command-V to that specific process, and restores the clipboard; if the clipboard cannot be restored, it types prebuilt Unicode key events in surrogate-safe chunks of at most 32 UTF-16 units. It verifies the result at 150 ms and again 350 ms later, and a mismatch fails the dictation and keeps the text in History instead of claiming success. Secure fields get copy-only recovery, and once a direct write has been attempted, an ambiguous result cannot trigger a fallback paste, which prevents double insertion.",
    },
    validation: [
      "The full Swift package suite passes 1,768 tests (October 2026), backed by about 2,000 Swift Testing cases and a dedicated architecture test target.",
      "In a July 2026 benchmark on an M1 Max with a warm Parakeet model, p95 recognition time was 290 ms for 5.2 seconds of audio and 550 ms for 30 seconds.",
      "Physical insertion testing passed in 10 installed apps, and installed builds are Developer ID signed, notarized, and accepted by Gatekeeper.",
    ],
    result:
      "TalkMac 0.1.0 is a signed and notarized release candidate that I use every day: 1,001 dictations and about 103,000 words so far, which it estimates saved me nearly seven hours of typing.",
    next: [
      "A public release with signed automatic updates.",
      "Final qualification of the voice command workflow across more apps.",
      "More local refinement models as Apple Silicon support grows.",
    ],
    gallery: [
      talkMacHero,
    ],
  },
};

/* ProTuner */

const proTunerHero = shot(
  "protuner/tuner",
  "ProTuner chromatic tuner on iPhone showing the detected note, its frequency in hertz, and a cents needle.",
);

const proTuner: Project = {
  slug: "protuner",
  title: "ProTuner",
  kind: "iPhone and Apple Watch app",
  summary: "An iPhone tuner and metronome with an Apple Watch metronome, on the App Store.",
  medium: ["SwiftUI", "AudioKit", "AVAudioEngine", "WatchConnectivity"],
  platforms: ["iPhone (iOS 17 or later)", "Apple Watch (watchOS 10 or later)"],
  status: {
    label: "On the App Store",
    detail: "iPhone and Apple Watch. Released April 2026, with a “Data Not Collected” privacy label.",
    tone: "live",
  },
  role: "Designer, developer, and publisher through LearnCenter LLC",
  years: "2026",
  hero: proTunerHero,
  links: [
    {
      label: "View on the App Store",
      href: "https://apps.apple.com/us/app/protuner-tuner-metronome/id6761435770",
      kind: "app-store",
    },
    { label: "Support", href: "https://learncenter.dev/protuner/support", kind: "support" },
  ],
  sourceNote: PRIVATE_SOURCE,
  caseStudy: {
    problem:
      "String players need a tuner that reads plucked notes steadily and a metronome that stays in time, ideally on the wrist during practice. Raw pitch tracking on real strings jumps octaves and reacts to noise, so the hard part is deciding when a reading is trustworthy enough to show.",
    audience:
      "Beginner and hobbyist string players, including guitar, bass, ukulele, banjo, mandolin, violin, and cello.",
    built: [
      "A chromatic tuner with note, frequency, and cents readout, guided tuning for 7 instruments, and custom tunings.",
      "A metronome with presets, setlists, accents, subdivisions, and tap tempo, scheduled by audio sample time.",
      "An Apple Watch metronome that installs independently and works with the phone app over WatchConnectivity.",
      "Haptic feedback on iPhone and Watch, with everything on device: no accounts and no data collection.",
    ],
    architecture: [
      "SwiftUI with Observation, targeting iOS 17 and watchOS 10, with the project generated by XcodeGen.",
      "Audio input through AudioKit's engine with a custom tap. Soundpipe's pitch tracker gives the first estimate, and analysis runs on its own queue.",
      "A metronome on AVAudioEngine and AVAudioPlayerNode with sample-time scheduled buffers, output latency compensation, and recovery from interruptions and route changes.",
      "One coordinator owns the shared audio session for the tuner, metronome, and reference tones.",
      "WatchConnectivity sync with ping and acknowledgment clock probing, per-device revisions, and session epochs.",
      "Local JSON files and UserDefaults for persistence. There is no backend.",
    ],
    decisions: [
      {
        title: "The phone leads only when the clock is trustworthy",
        body: "The Watch follows the phone only when the phone is reachable and a fresh clock estimate from ping and acknowledgment timestamps has an uncertainty of 40 ms or less. Otherwise the Watch keeps time on its own clock. The two devices stay in step whenever the connection allows it, and the metronome never stutters when it does not.",
      },
      {
        title: "Foreground-only playback on the Watch",
        body: "watchOS extended runtime sessions are meant for specific health and wellness session types, and music practice is not one of them. I kept Watch playback in the foreground, which follows Apple's rules and keeps the app safe through App Review.",
      },
      {
        title: "One owner for the audio session",
        body: "The tuner, metronome, and reference tones all need the process-wide audio session. Instead of letting each engine reconfigure or deactivate it, they register with one coordinator that keeps the strongest requested profile until every owner releases it. This keeps one feature from switching off audio that another feature still needs.",
      },
    ],
    hardProblem: {
      title: "Trustworthy pitch on real strings",
      body: "Raw pitch tracker output on plucked strings jumps octaves, drifts, and reads noise as pitch, and smoothing across a note boundary can show a false in-tune reading and fire a false haptic. Soundpipe's tracker gives the first estimate, and ProTuner then tests that frequency and its 1/4, 1/3, 1/2, and 2x candidates with normalized autocorrelation to correct octave errors. Three independent gates on signal level, tracker amplitude, and periodicity reject broadband noise. A 5-frame median filter (7 frames below 120 Hz when low-frequency assist is on) steadies the reading, smoothing resets on a note change, and the display locks only after at least three same-note samples and a minimum rolling confidence. Reference tones that the app plays itself suppress pitch acceptance, so it cannot tune to its own output.",
    },
    validation: [
      "316 XCTest methods across the iOS unit, iOS UI, and Watch test targets.",
      "An accuracy harness feeds harmonic test signals through the production pitch detector to check octave correction, gating, and lock behavior.",
      "Regression suites cover metronome timing and Watch connectivity session handling.",
    ],
    result:
      "ProTuner has been on the App Store since April 6, 2026, as a one-time purchase published by LearnCenter LLC, with a “Data Not Collected” privacy label. I took it from first commit to App Store approval on my own.",
    next: [
      "An update with a practice dashboard and a remote tuner on Apple Watch, already built in the repository.",
      "A native iPad layout.",
      "Localization beyond English.",
    ],
    gallery: [
      proTunerHero,
      shot(
        "protuner/guided",
        "ProTuner guided tuner on iPhone for standard E tuning, with the low E string marked in tune and the other strings listed with target frequencies.",
      ),
      shot(
        "protuner/metronome",
        "ProTuner metronome on iPhone with tempo, beat accent, and subdivision controls.",
      ),
      shot(
        "protuner/watch",
        "ProTuner metronome on Apple Watch playing at 120 BPM in 4/4, with beat indicators and a stop control.",
      ),
      shot(
        "protuner/watch-presets",
        "ProTuner preset list on Apple Watch with quick-access tempo presets.",
      ),
    ],
  },
};

/* GrooveMind */

const grooveMindHero = shot(
  "groovemind/piano-roll",
  "GrooveMind piano roll with a melody track's notes on a pitch and time grid and one note selected to show its exact values.",
);

const grooveMind: Project = {
  slug: "groovemind",
  title: "GrooveMind",
  kind: "Music generation workstation",
  summary: "A local MIDI workstation where a model plans the music and code writes the notes.",
  medium: ["Next.js", "FastAPI", "Pydantic", "OpenAI structured outputs", "Tone.js"],
  platforms: ["Web, run locally"],
  status: {
    label: "Working prototype",
    detail: "Runs locally with full editing, revisions, and MIDI export.",
    tone: "development",
  },
  role: "Designer and lead developer",
  years: "2025 to 2026",
  hero: grooveMindHero,
  links: [],
  sourceNote: PRIVATE_SOURCE,
  caseStudy: {
    problem:
      "I wanted AI help with drum, bass, keys, and melody ideas that a musician can actually edit and finish in a DAW. Letting a language model write raw notes makes timing, meter, and loop length unreliable and hard to test, so I kept the model at the planning level and made note generation deterministic.",
    audience: "Musicians and producers who want editable MIDI ideas to finish in their own DAW.",
    built: [
      "A FastAPI backend that asks a model for a strict JSON musical blueprint and validates it against closed Pydantic models.",
      "A deterministic composition engine for arrangement, melody, bass, drums, and rhythm, including grouped odd meters.",
      "A musical review step that scores each result and triggers refinement only for issues that come with a concrete repair directive.",
      "A Next.js workstation with a piano roll, drum editor, mixer, revisions, candidate comparison, and MIDI export as one file, per-part files, or a ZIP.",
      "Sessions stored in SQLite, with a browser IndexedDB journal for recovery.",
    ],
    architecture: [
      "The browser never calls the model. Next.js route handlers proxy to the backend with a header allow-list.",
      "One outbound model boundary that refuses to run unless remote calls are explicitly enabled and a real key is set.",
      "Exact musical time as fractions at 960 PPQ, with meters that carry explicit groupings.",
      "MIDI validation for note lifecycles, shared-channel conflicts, retriggers, and aligned track ends before export.",
      "Tone.js for audition in the browser, with Zustand and TanStack Query for state.",
    ],
    decisions: [
      {
        title: "The model plans, code composes",
        body: "The model returns a constrained symbolic blueprint of sections, harmony, and drum strategy, and a deterministic engine turns it into notes. Results can be reproduced, tested offline, and edited note by note. Every result is reproducible and safe to edit.",
      },
      {
        title: "No silent fallback",
        body: "When the provider is unavailable, generation says so instead of quietly substituting canned music. Token-limit failures are not replayed, and a failed optional refinement keeps the existing valid version. Users always get an honest result they can trust.",
      },
      {
        title: "Exact time instead of floats",
        body: "Positions are exact fractions at 960 PPQ and meters carry their groupings, so odd meters, partial clips, and loop ends export without rounding drift. Loops line up perfectly when dropped into any DAW.",
      },
    ],
    hardProblem: {
      title: "Odd meters that feel right and loop cleanly",
      body: "A 7/8 groove should feel like 3+2+2 or 2+2+3, not seven equal pulses, and the bar has to end exactly so it loops in a DAW. Float timing and templates shaped around 4/4 break both. The meter definition validates that groupings are positive and sum to the numerator, and it exposes exact fraction positions. Drum generation derives its accents from the grouping and applies bounded fills, and a test asserts that a 7/8 bar grouped 2+2+3 accents at exactly 0, 1, and 2 quarter notes. Export writes the grouping into the meter map, and a fixture checks a 3+2+2 pulse with an exact two-bar duration.",
    },
    validation: [
      "About 520 backend tests across 63 files and 129 frontend tests across 28 files.",
      "The CI workflow runs ruff, mypy, and pytest with model calls disabled and an empty API key, plus a frontend job.",
      "Frontend tests block network access, and authored fixture sessions exercise the engine and editors without model calls.",
    ],
    result:
      "GrooveMind is a working prototype with generation, a full editor, revisions, candidate comparison, and clean MIDI export into any DAW.",
    next: [
      "A hosted version, so musicians can try it without a local setup.",
      "Listening sessions with musicians to tune the engine's musical choices.",
      "More instrument styles and more grouped odd meters.",
    ],
    gallery: [
      grooveMindHero,
      shot(
        "groovemind/drums",
        "GrooveMind drum editor showing a 7/8 groove grouped 3+2+2, with accented hits and an ending fill.",
      ),
      shot(
        "groovemind/mixer",
        "GrooveMind mixer with three parts, General MIDI instrument pickers, and one track soloed.",
      ),
      shot(
        "groovemind/export",
        "GrooveMind export tab offering the combined arrangement, individual parts, and a ZIP of MIDI files.",
      ),
    ],
  },
};

export const projects: Project[] = [fr3t, inputShare, learnCenterDev, talkMac, proTuner, grooveMind];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === (slug as ProjectSlug));
}
