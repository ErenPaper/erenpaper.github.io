// Single source of truth for all portfolio content, extracted from the
// classic site (public/classic/index.html). Apps render from this.

export const profile = {
  name: "Raphael Ramos",
  title: "Computer Engineer",
  eyebrow: "Firmware · Embedded · Hardware",
  tagline:
    "I like to build things — and figure out why they broke.",
  resume: "/assets/Raphael_Ramos_Resume.pdf",
  photo: "/assets/raphael.jpg",
  aboutPhoto: "/assets/about_me.jpg",
};

export const bio = [
  "I'm a Computer Engineering graduate from the University of Alberta (June 2026). I gravitate toward work that's hands-on and grounded — firmware, embedded systems, hardware that actually does something in the world. Currently VP Academics at the Computer Engineering Club.",
  "Outside of engineering, I play piano with my family, volunteer at events, and have watched probably too much anime — the GitHub handle is proof. I'm outgoing and love to talk (maybe too much), take my faith seriously, and genuinely believe a well-timed dad joke is a life skill.",
];

export const links = {
  email: "rcurtisramos@gmail.com",
  linkedin: { label: "/raphael-ramos1", url: "https://www.linkedin.com/in/raphael-ramos1/" },
  github: { label: "/ErenPaper", url: "https://github.com/ErenPaper" },
};

export type Experience = {
  company: string;
  role: string;
  date: string;
  location: string;
  bullets: string[];
  tags: string[];
};

export const experience: Experience[] = [
  {
    company: "Turbine-X Energy Inc.",
    role: "Product Development Intern",
    date: "May 2024 – Aug 2024",
    location: "Nisku, AB",
    bullets: [
      "Performed system-level testing and validation for fully integrated prototypes to ensure specification compliance.",
      "Calibrated advanced electrical, optical, and sensor equipment ensuring precise measurements.",
      "Built and brought up servers for internal data sharing, including physical construction and digital configuration.",
      "Created technical documentation for testing equipment covering training, specifications, and conditions.",
    ],
    tags: ["Hardware Testing", "Sensor Calibration", "System Validation", "Power Apps", "Technical Documentation"],
  },
  {
    company: "Vertical City",
    role: "Software Deployment Intern",
    date: "Jul 2023 – Sep 2023",
    location: "Edmonton, AB",
    bullets: [
      "Updated Linux-based software from Ubuntu 18 to Ubuntu 20 on elevator and lobby screens across 250+ units.",
      "Troubleshot LTE signal processing with antennas, optimizing network connectivity for uninterrupted communication.",
      "Executed hardware re-wiring on elevator TVs to ensure seamless functionality of critical systems.",
    ],
    tags: ["Linux", "Ubuntu", "LTE / Networking", "Hardware Wiring", "Software Deployment"],
  },
  {
    company: "Private Tutoring",
    role: "Academic Tutor",
    date: "Sept 2025 – Present",
    location: "Edmonton, AB",
    bullets: [
      "Provide one-on-one tutoring across Math, English, and Social Studies for students from Grade 9 to 12.",
      "Adapt teaching approach to individual learning needs across multiple clients and learning environments.",
    ],
    tags: ["Mathematics", "English", "Social Studies", "One-on-one Instruction"],
  },
];

export const extracurriculars: Experience[] = [
  {
    company: "Computer Engineering Club",
    role: "VP Academics",
    date: "Apr 2025 – Present",
    location: "University of Alberta",
    bullets: [
      "Led academic programming for 100+ members including workshops, study sessions, and exam preparation events.",
      "Coordinated with faculty and student groups to connect members with academic resources and opportunities.",
    ],
    tags: ["Leadership", "Event Planning", "Faculty Relations"],
  },
  {
    company: "AlbertaSat",
    role: "Ground Station Software Team",
    date: "Sept 2023 – Sept 2024",
    location: "University of Alberta",
    bullets: [
      "Contributed to ground station software development for CubeSat operations and reliable data transmission.",
      "Collaborated with technical teams on implementation tasks and participated in regular development work sessions.",
    ],
    tags: ["CubeSat", "Ground Station Software", "Team Collaboration"],
  },
  {
    company: "North Pointe Community Church",
    role: "Worship Leader & Pianist",
    date: "Oct 2017 – Present",
    location: "Edmonton, AB",
    bullets: [
      "Lead piano for Sunday services, youth services, and special events including Christmas and Easter.",
      "Coordinate the team during rehearsals and keep everything prepared for performance.",
    ],
    tags: ["Piano", "Team Leadership", "Performance"],
  },
  {
    company: "Lupus Society of Alberta",
    role: "Music & Event Volunteer",
    date: "Sept 2012 – Sept 2020",
    location: "Edmonton, AB",
    bullets: [
      "Performed live music at the annual Edmonton Lupus Charity Run to raise awareness and funds for research.",
      "Assisted with event organization and gave out food to runners and fundraisers participating in the run.",
    ],
    tags: ["Music Performance", "Event Volunteering", "Community"],
  },
];

export type ProjectLink = { label: string; href: string };

export type Project = {
  title: string;
  tag: string;
  tech: string[];
  stats?: string[];
  featured?: boolean;
  status?: "shipped" | "soon" | "progress";
  // Rich detail (restored from the classic site). Optional so planned builds
  // can exist with just a title/tag/tech until they have a write-up.
  context?: string;       // course / date line
  video?: string;         // YouTube video id — demo
  image?: string;         // screenshot path (for non-video projects)
  brief?: string;         // one-paragraph summary
  built?: string[];       // "what I built" bullets
  insight?: string;       // the one takeaway
  linksOut?: ProjectLink[]; // GitHub / external links
};

export const projects: Project[] = [
  {
    title: "Continuing Care Home Activity Monitor",
    tag: "Capstone · Embedded · ML · Cloud · IoT",
    stats: ["97.73% ML accuracy", "29hr standalone", "Under $200 CAD", "3 subsystems"],
    tech: ["C++", "MicroPython", "Edge Impulse", "AWS IoT", "MQTT/TLS", "DynamoDB", "Lambda", "React Native"],
    featured: true,
    status: "shipped",
    context: "Capstone · Jan – Apr 2026",
    video: "SDkYA16DcgQ",
    brief:
      "A non-invasive system that helps elderly residents age safely in place — three subsystems watch for stove, water, and appliance activity, run ML on-device, and stream alerts to a caregiver app. I led the stove-safety subsystem.",
    built: [
      "Built the stove-safety subsystem on a Raspberry Pi Pico 2W — an MLX90614 infrared sensor for non-contact burner heat, a DS18B20 contact sensor for the oven, and a PIR sensor to detect whether anyone is nearby.",
      "Deployed an Edge Impulse model on-device to classify burner state and fused it with the motion sensor, so an alert only fires when the stove is hot and no one is around — 97.73% accuracy with an under-10-second response.",
      "Wired a full AWS IoT pipeline — MQTT over TLS into IoT Core, Lambda anomaly detection, DynamoDB storage — feeding a React Native caregiver app with real-time alerts and activity history.",
      "Kept the prototype under $200 CAD, proving the concept is deployable at real-world cost.",
    ],
    insight:
      "A hot stove on its own didn't mean much — a hot stove with nobody in the room did. I couldn't trust the heat model or the motion sensor on their own, and only fusing them finally killed the false alarms.",
  },
  {
    title: "Voice-Controlled Fan",
    tag: "Embedded · TinyML · Audio",
    tech: ["C / C++", "TinyML", "I2S", "INMP441", "TensorFlow Lite"],
    status: "shipped",
    context: "Embedded · TinyML",
    video: "0YUXNzxJXc8",
    brief:
      'A wake-word-controlled DC fan on the RP2040 — say "yes" to turn it on, "no" to turn it off — reusing a micro_speech TFLite model wired to real fan hardware, fully offline.',
    built: [
      "Streamed audio from an INMP441 microphone over an I2S path built on PIO + a DMA ring buffer, so capture ran continuously without stalling inference.",
      "Integrated the provided micro_speech wake-word model rather than training one — the real work was the hardware path and control logic, not the ML.",
      "Tamed noisy detections with three rules — a confidence threshold, a new-command gate, and an 1800 ms cooldown — so one spoken word triggered exactly one action.",
      "Kept the potentiometer for manual speed and direction: voice for on/off, the knob for fine control.",
    ],
    insight:
      "The model never handed me a clean 'yes' — just a stream of noisy guesses. What actually made it usable was the boring stuff wrapped around it: a confidence threshold, a new-command gate, and a cooldown.",
    linksOut: [{ label: "GitHub ↗", href: "https://github.com/ErenPaper/voice-controlled-fan" }],
  },
  {
    title: "Russian Roulette HMI",
    tag: "Embedded · Firmware · Hardware",
    tech: ["C", "RP2040 PIO", "WS2812B", "Quadrature Decode", "GDB"],
    status: "shipped",
    context: "Embedded · Rotary-Encoder HMI",
    video: "q_OnzubR1rI",
    brief:
      "An embedded human-machine interface built around a PEL12T mechanical rotary encoder and a WS2812 RGB LED ring on the RP2040 — wrapped in a Russian-roulette game where six chambers map to twelve LEDs.",
    built: [
      "Decoded the quadrature encoder with a transition lookup table, accumulating the multiple electrical transitions per detent so no clicks were skipped.",
      "Drove the WS2812 ring through the RP2040's PIO, offloading the strict LED timing off the main loop.",
      "Structured the firmware as a state machine — Idle, Arming, Ready, Reveal, Game Over — so a spin or button press meant something different in each state.",
      "Traced a stuck-button bug to the encoder being wired to 3.3V instead of GND, and fixed it by switching the GPIO to pull-down and inverting the read.",
    ],
    insight:
      "I burned an afternoon chasing an 'always pressed' button in code before I found it was wired to 3.3V instead of ground. The datasheet had the answer the whole time — I just hadn't read it closely enough.",
    linksOut: [{ label: "GitHub ↗", href: "https://github.com/ErenPaper/russian-roulette-hmi" }],
  },
  {
    title: "DC Motor Speed Controller",
    tag: "Embedded · Control Systems",
    tech: ["C", "PWM", "ADC", "H-bridge", "Wokwi"],
    status: "shipped",
    context: "Embedded · Control Systems",
    video: "njNi2PRX1Rw",
    brief:
      "An open-loop DC motor controller on the RP2040 — a potentiometer sets speed and direction through a TC1508A H-bridge, with a tachometer-style LED ring reacting in real time.",
    built: [
      "Read a potentiometer on ADC0 (0–4095) and scaled it to a PWM duty cycle (0–999) driving motor speed through the H-bridge.",
      "Used the potentiometer's midpoint as a direction switch with a dead zone — below centre reverses, above drives forward, centre stops — no extra buttons.",
      "Animated a WS2812 ring as a tachometer: green→yellow→red filling with speed (flashing at the limit), blue→purple in reverse.",
      "Prototyped it in Wokwi first — two LEDs standing in for the H-bridge, verified on a logic analyzer — before moving to real hardware.",
    ],
    insight:
      "Almost every bug turned out to be hardware, not code — a pin/pixel mismatch, the motor running off the wrong rail. Because I'd already proven the logic in Wokwi, I could trust the firmware and go straight at the wiring.",
    linksOut: [{ label: "GitHub ↗", href: "https://github.com/ErenPaper/dc-motor-speed-controller" }],
  },
  {
    title: "16-bit CPU Design",
    tag: "Hardware · Digital Logic",
    tech: ["VHDL", "Vivado", "FPGA"],
    status: "shipped",
    context: "Digital Logic · Nov 2024",
    brief:
      "A 16-bit CPU designed from scratch on a Xilinx Zybo Z7 FPGA, with a full controller-datapath architecture.",
    built: [
      "Designed a controller-datapath architecture with an ALU, register file, accumulators, and a tri-state buffer.",
      "Built an FSM executing 13 custom instructions, with a bitwise multiplier written as a validation test program.",
      "Resolved a double-access load discrepancy through rigorous simulation and debugging in Vivado.",
    ],
    insight:
      "After building a CPU from the gates up, everything above it — assembly, C, the OS — stopped feeling like magic. Once you've wired the datapath yourself, you know it's all just wires and timing.",
  },
  {
    title: "Anomaly Detection System",
    tag: "ML · Data Science",
    tech: ["Python", "Scikit-learn", "Pandas", "Matplotlib"],
    status: "shipped",
    context: "Machine Learning · Apr 2025",
    brief:
      "An end-to-end anomaly detection pipeline comparing statistical, distance-based, and ML approaches on the same data.",
    built: [
      "Implemented and compared statistical, distance-based (k-NN, DBSCAN), and ML (One-Class SVM) detection techniques.",
      "Built the preprocessing — missing-value handling, normalization, and stratified train/test/validation splits — before modelling.",
      "Evaluated each approach with precision, recall, F1-score, and ROC/PR curves.",
      "Documented the full pipeline in a reproducible Jupyter notebook.",
    ],
    insight:
      "None of the methods won across the board. The part I actually cared about wasn't crowning a winner — it was seeing exactly where each one fell apart.",
    linksOut: [{ label: "GitHub ↗", href: "https://github.com/ErenPaper/Anomaly-Detection-System" }],
  },
  {
    title: "File Sharing System",
    tag: "Systems · Networking",
    tech: ["C", "Sockets", "TCP/UDP"],
    status: "shipped",
    context: "Operating Systems · Sockets",
    brief:
      "A client-server file sharing application in C built on custom socket protocols and nonblocking I/O.",
    built: [
      "Implemented custom TCP/UDP socket protocols with enforced packet formats and error handling.",
      "Used nonblocking I/O to handle multiple concurrent connections on a single server.",
    ],
    insight:
      "Writing the protocol by hand made me realize how much TCP hands you for free. Every dropped packet and half-read message was suddenly mine to catch and plan around.",
    linksOut: [{ label: "GitHub ↗", href: "https://github.com/ErenPaper/file-sharing-system" }],
  },
  {
    title: "Social-Media Database Apps",
    tag: "Databases · Data · Python",
    tech: ["Python", "SQLite", "MongoDB", "SQL"],
    status: "shipped",
    context: "Databases · Fall 2023 · Team of 4",
    brief:
      "Two term projects building a Twitter-style app over different data stores — first a relational version on SQLite, then a document-store version on MongoDB — with login, posting, following, and search. Built with Eric Cheng, Ohm Panchal, and Esa Abuzar.",
    built: [
      "Designed the relational schema and queries for users, tweets, follows, and search on SQLite.",
      "Rebuilt the same feature set over a MongoDB document store, loading data from JSON.",
      "Split the work across a four-person team behind a shared command-line front end.",
    ],
    insight:
      "Doing the same app twice — once relational, once document — made the trade-offs concrete: what SQL joins hand you for free, MongoDB makes you design for up front.",
  },
  {
    title: "Event Lottery App",
    tag: "Mobile · Backend",
    tech: ["Java", "Android", "Firebase"],
    status: "shipped",
    context: "Course Project · Sept – Nov 2024",
    image: "/assets/eventlottery.jpg",
    brief:
      "An Android app implementing a fair, lottery-based signup system for high-demand events, backed by Firebase.",
    built: [
      "Built a fair lottery-based signup flow for oversubscribed events, backed by a real-time Firebase Firestore database.",
      "Added local push notifications and deep linking for entrants and organizers.",
      "Applied OOP design — CRC cards and UML — with comprehensive JUnit test coverage for maintainability.",
    ],
    insight:
      "Fair didn't happen on its own. The lottery only felt fair once the rules were out in the open and I could actually show the draw wasn't rigged — that was as much a design problem as a coding one.",
    linksOut: [{ label: "GitHub ↗", href: "https://github.com/ErenPaper/EventLotteryApp" }],
  },
  {
    title: "FIFO Client-Server (IPC)",
    tag: "Systems · OS · IPC",
    tech: ["C", "Named Pipes (FIFO)", "Nonblocking I/O", "Signals"],
    status: "shipped",
    context: "Operating Systems · IPC",
    brief:
      "A client-server system in C that talks over named pipes (FIFOs) with nonblocking I/O — an operating-systems exercise in inter-process communication and juggling multiple clients without sockets.",
    built: [
      "Set up bidirectional FIFOs between the server and multiple clients.",
      "Used nonblocking reads so the server could service several clients without stalling on any one.",
    ],
    insight:
      "FIFOs are really just files with rules — most of the work was in the handshake and the cleanup, not moving the data itself.",
    linksOut: [{ label: "GitHub ↗", href: "https://github.com/ErenPaper/fifo-client-server" }],
  },
  {
    title: "digicam-datestamp",
    tag: "Tools · Python · Imaging",
    tech: ["Python", "Pillow", "EXIF", "Batch Processing"],
    status: "shipped",
    context: "Personal project",
    brief:
      "A Python utility that batch-renders date/time stamps back onto photos from their EXIF capture time — built so my old Nikon Coolpix film-style shots get the on-image datestamp they never had. Chews through a folder (~200 JPGs in under 30 seconds) without ever touching the originals.",
    built: [
      "Reads the original capture time from EXIF (DateTimeOriginal) with a safe fallback.",
      "Renders a Nikon-style datestamp onto each image and honours the camera's orientation metadata.",
      "Batch-processes whole folders to a separate output directory so originals are never overwritten.",
    ],
    insight:
      "The date was sitting in the EXIF the whole time — the project was really about putting it back on the picture the way the old cameras used to.",
    linksOut: [{ label: "GitHub ↗", href: "https://github.com/ErenPaper/digicam-datestamp" }],
  },
  { title: "Group Dining Decision App (Dinnr)", tag: "Coming Soon · Mobile · Social", tech: ["Java", "Android Studio", "Firebase", "Google Places API"], status: "soon" },
  { title: "BMO Build", tag: "Coming Soon · Hardware · Embedded", tech: ["3D Printing", "Embedded C", "CAD"], status: "soon" },
  { title: "Morse Code Decoder", tag: "In Progress · Embedded · RTOS", tech: ["C", "FreeRTOS", "RP2040", "Interrupts", "Timers", "OLED"], status: "progress" },
];

export type SkillCategory = { name: string; skills: string[] };

export const skills: SkillCategory[] = [
  { name: "Languages", skills: ["Python", "C", "C++", "Java", "SQL", "VHDL", "MATLAB", "JavaScript", "HTML/CSS", "ARM", "MIPS"] },
  { name: "Embedded & Hardware", skills: ["Raspberry Pi Pico 2W", "RP2040 PIO", "MicroPython", "Edge Impulse", "TensorFlow Lite", "FreeRTOS", "Vivado", "LTSpice", "Cadence", "WaveForms", "Wokwi", "GDB"] },
  { name: "Protocols & Interfaces", skills: ["GPIO", "I2C", "SPI", "UART", "I2S", "PWM", "ADC", "DMA", "MQTT/TLS"] },
  { name: "Cloud & Backend", skills: ["AWS IoT Core", "Lambda", "DynamoDB", "Firebase", "Supabase", "MongoDB", "SQLite"] },
  { name: "Dev Tools", skills: ["Git", "GitHub", "Android Studio", "VS Code", "Jupyter", "Linux"] },
  { name: "Libraries & Frameworks", skills: ["React Native", "NumPy", "Pandas", "Matplotlib", "Seaborn", "Scikit-learn", "OpenMP"] },
];

export const interests = ["Film Photography", "Super 8", "Game Boy", "PS1 / PS2", "Vinyl", "Piano", "Fashion", "Anime"];

export type Certification = {
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  note?: string;
  tag?: string;         // e.g. "LICENSE" for a professional designation
  credential?: string;  // path to the certificate image/PDF, if available
};

export const certifications: Certification[] = [
  {
    name: "Engineer-in-Training (EIT)",
    issuer: "APEGA",
    date: "Registered",
    tag: "LICENSE",
    note: "Registered member on the path to Professional Engineer (P.Eng.).",
  },
  {
    name: "ProTect Security Staff Certificate",
    issuer: "AGLC",
    date: "Mar 2023 – Mar 2028",
    credentialId: "202303040124",
    credential: "/assets/1696231729435.png",
  },
  {
    name: "Systems Tool Kit (STK) Certification — Level 1",
    issuer: "Ansys",
    date: "Sep 2023",
    credential: "/assets/1695007946251.jpeg",
  },
  {
    name: "Elko Engineering Garage Orientation",
    issuer: "University of Alberta",
    date: "Sep 2023",
    credential: "/assets/1696231851417.jpeg",
  },
  { name: "WHMIS", issuer: "University of Alberta", date: "Sep 2021" },
];
