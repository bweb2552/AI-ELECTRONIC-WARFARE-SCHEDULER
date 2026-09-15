# Business Model Canvas: SMART-SCAN EW

## Adaptive Receiver Scheduler for Simulated Electronic Warfare

> This document describes potential business models for the SMART-SCAN EW project. This is a research prototype and educational tool — not a production military system. Government procurement is not immediate or guaranteed.

---

## 1. Customer Segments

| Segment | Description | Needs |
|---------|-------------|-------|
| **Government Research Laboratories** | DRDO, BEL, ISRO, and similar defense research organizations | Adaptive scanning algorithms, reproducible evaluation, scenario libraries for testing |
| **Defense Technology Organizations** | Organizations developing EW subsystems and RF monitoring capabilities | Integration-ready scheduling modules, baseline comparison frameworks |
| **Spectrum Monitoring Agencies** | WPC, DoT, and civilian spectrum management bodies | Efficient spectrum scanning strategies, interference detection approaches |
| **Universities and Research Institutions** | RF engineering, signal processing, and EW research groups | Educational tools, research prototypes, benchmarking datasets |
| **RF Equipment Manufacturers** | Companies building SDR platforms, spectrum analyzers, EW receivers | Algorithm libraries, demo capabilities for customer presentations |
| **Training and Simulation Providers** | Organizations developing EW training simulators | Scenario library, visualization components, behavioral models |
| **Public Safety Communication Teams** | Organizations managing emergency/safety radio frequencies | Spectrum monitoring optimization, interference source detection |

---

## 2. Value Propositions

| Value | Description |
|-------|-------------|
| **Adaptive Scanning Without Prior Intelligence** | Core innovation: the scheduler learns emitter behavior patterns in real-time without requiring pre-existing intelligence about the RF environment |
| **Explainable AI Decisions** | Every scan decision includes a traceable reasoning chain — which features drove the choice, what alternatives were considered, and why this band was selected |
| **Reproducible Evaluation Framework** | 7 standardized scenarios with seeded randomness enable identical conditions for comparing scheduling algorithms — essential for research credibility |
| **Real-Time Visual Intelligence Dashboard** | 10+ visualization panels (spectrum, activity matrix, link graph, behavioral patterns, prediction layer) provide immediate insight into scheduler behavior |
| **Comparison With Baseline Methods** | Built-in sequential, random, and priority schedulers provide reference points for measuring adaptive scheduler improvement |
| **Modular Architecture** | Clean separation between RF simulation, receiver model, detection engine, and scheduling intelligence allows independent testing and extension |
| **Open Research Foundation** | TypeScript codebase, documented algorithms, and scenario library lower the barrier for academic researchers entering the EW simulation space |

---

## 3. Channels

| Channel | Description | Reach |
|---------|-------------|-------|
| **Direct Government Procurement** | RFP responses to DRDO, BEL, ISRO, and defense research tenders | High-value, long sales cycle (6-18 months) |
| **SIH / Hackathon Visibility** | Smart India Hackathon participation and demonstration | Direct access to government stakeholders, immediate feedback |
| **Research Publications** | IEEE, IET, and defense technology journals | Academic credibility, peer validation |
| **Defense Technology Conferences** | DSA, DefExpo, Aero India, and EW-specific symposia | Direct engagement with defense procurement teams |
| **University Partnerships** | Collaborative research agreements with RF engineering departments | Pipeline for talent and research extensions |
| **Open Source Community** | Public repository with educational documentation | Broader adoption, community contributions, visibility |

---

## 4. Customer Relationships

| Relationship | Description |
|--------------|-------------|
| **Custom Scenario Development** | Build client-specific emitter behavior models matching their operational RF environment |
| **Training and Support** | On-site or remote training for operations teams and researchers using the system |
| **Integration Assistance** | Help clients integrate scheduling algorithms into existing SDR platforms or EW subsystems |
| **Research Collaboration** | Joint publication opportunities, shared development of new scheduling approaches |
| **Technical Support** | Email and scheduled support for installation, configuration, and customization |
| **Algorithm Tuning** | Optimize scheduler parameters for specific client scenarios and receiver hardware |

---

## 5. Revenue Streams

| Stream | Description | Pricing Model |
|--------|-------------|---------------|
| **R&D Contracts** | Funded research to develop new scheduling algorithms or extend the scenario library | Fixed-price or time-and-materials |
| **Government Pilot Projects** | Small-scale deployment evaluations with government agencies | Milestone-based payments |
| **Annual Software Licensing** | Recurring license for continued access to updates and new scenarios | Annual subscription |
| **Enterprise Deployment** | Full deployment with custom integration, training, and ongoing support | Project-based pricing |
| **Custom Scenario Development** | Build scenario libraries matching specific operational environments | Per-scenario pricing |
| **Training Packages** | Structured training programs for operations teams | Per-seat or per-cohort pricing |
| **Integration and Support Contracts** | Ongoing maintenance, updates, and technical support | Annual retainer |
| **University / Research Licenses** | Discounted access for academic research and education | Reduced annual fee or royalty-based |
| **Hardware-in-the-Loop Integration** | Services to connect the scheduler with real SDR hardware for validation testing | Project-based pricing |

---

## 6. Key Resources

| Resource | Description | Status |
|----------|-------------|--------|
| **Proprietary Scenario Library** | 7+ reproducible scenarios with documented emitter behaviors and ground truth data | Implemented |
| **Labeled Behavioral Trace Data** | Simulation outputs with labeled detection events, scheduler decisions, and emitter states | Generated during evaluation |
| **Scenario Generation Engine** | Configurable framework for creating new emitter behavior models and RF environments | Implemented |
| **Receiver Impairment Models** | Configurable models for bandwidth limitations, tuning time, dwell time, and noise | Implemented |
| **Domain Expertise** | Understanding of EW concepts, scheduling algorithms, and RF propagation | Accumulated during development |
| **Benchmarking Framework** | Standardized metrics (Pd, FAR, Intercept Rate, Scan Efficiency) with comparative evaluation | Implemented |
| **Visualization Components** | Real-time dashboard with spectrum, matrix, graph, and pattern visualizations | Implemented |

---

## 7. Key Activities

| Activity | Description | Priority |
|----------|-------------|----------|
| **Software Development and Maintenance** | Core scheduler algorithms, simulation engine, and dashboard | Ongoing |
| **Scenario Library Expansion** | Adding new emitter types, scenarios, and environmental conditions | Medium |
| **Algorithm Research and Improvement** | Developing better scheduling approaches, exploring ML/AI techniques | Ongoing |
| **Government Compliance Preparation** | Meeting security, documentation, and certification requirements for defense procurement | When pursuing contracts |
| **Customer Training and Support** | Onboarding new users, providing technical assistance | As needed |
| **Hardware Integration Research** | Investigating SDR platform integration for real-world validation | Long-term |

---

## 8. Key Partners

| Partner | Role | Relationship Type |
|---------|------|-------------------|
| **DRDO / Defense Research Labs** | Primary customers, co-development partners for scenario validation | Research collaboration |
| **University RF Research Groups** | Academic validation, algorithm extensions, talent pipeline | University partnerships |
| **SDR Hardware Manufacturers** | Platform integration, hardware-in-the-loop testing | Technology partnership |
| **Government Spectrum Management Bodies** | Requirements input, regulatory compliance, deployment channels | Advisory |
| **Cloud / Secure Hosting Providers** | Deployment infrastructure for government-grade security | Service provider |
| **Defense System Integrators** | Integration into larger EW platforms and C4ISR systems | Channel partner |

---

## 9. Cost Structure

| Cost Category | Description | Est. Annual |
|---------------|-------------|-------------|
| **Development Team** | Core developers, algorithm researchers, UI engineers | 60-70% of budget |
| **Cloud Infrastructure** | Development, testing, and demo hosting | 5-10% |
| **Compliance and Certification** | Security audits, documentation, government certifications | 5-10% (when applicable) |
| **Training and Support** | Customer onboarding, technical support, documentation | 5-10% |
| **Research and Publications** | Conference attendance, paper preparation, academic partnerships | 3-5% |
| **Hardware and Testing** | SDR platforms for integration research, testing equipment | 2-5% |
| **Business Development** | Government procurement process, RFP preparation, demonstrations | 3-5% |

---

## Summary

SMART-SCAN EW addresses a real problem in electronic warfare: efficient spectrum scanning when emitter behavior is unknown. The project is positioned as a research prototype and educational tool with clear potential for government and defense applications.

**Strengths:**
- Working prototype with demonstrated capabilities
- Modular architecture enabling extension and integration
- Reproducible evaluation framework (essential for research credibility)
- Explainable AI decisions (increasingly required in defense applications)

**Challenges:**
- Government procurement cycles are long (6-18 months typical)
- Defense sector requires security certifications and compliance
- Research prototypes require significant additional work for production deployment
- Hardware integration is necessary for real-world validation but adds complexity

**Realistic Outlook:**
This project is suitable for:
1. University research and education (immediate value)
2. Government R&D contracts (medium-term, requires relationship building)
3. Defense technology prototyping (requires partner with procurement access)
4. Training and simulation (immediate value for EW training providers)

It is **not** ready for:
1. Operational military deployment
2. Production system licensing without significant additional development
3. Direct government procurement without compliance certification

---

## Possible Business Models

### 1. R&D Contracts

**What it is:** Funded research projects where a government agency or defense organization commissions development of specific scheduling algorithms, scenario libraries, or evaluation frameworks.

**Who pays:** DRDO laboratories, BEL, ISRO, university research departments, or defense technology organizations with R&D budgets.

**Rough range:** ₹5–25 lakhs per project (6–12 months). Small algorithm development tasks at the lower end; comprehensive scenario library development at the higher end.

**When it applies:** Best fit when the project has demonstrated initial capabilities and an agency wants to explore specific extensions. Works well as a follow-on to SIH participation or conference demonstrations.

**Realistic caveats:**
- Government R&D procurement requires prior vendor registration and often empanelment
- Payment timelines are typically 30–90 days after milestone delivery
- Intellectual property terms vary by agency — some require Government IPR
- Competition from established defense vendors (L&T, Tata, BEL) is significant
- You need a track record or partnership with an established vendor for first contracts

---

### 2. Government Pilot Projects

**What it is:** Small-scale deployment evaluations where the system is tested in a controlled government facility with real or simulated RF inputs to validate performance claims.

**Who pays:** Defense organizations, spectrum monitoring agencies, or research labs with evaluation budgets.

**Rough range:** ₹10–50 lakhs per pilot (3–6 months). Includes deployment, configuration, training, and evaluation reporting.

**When it applies:** After successful R&D contract delivery, when the agency wants to validate the system under their specific conditions. Requires existing relationship and demonstrated capabilities.

**Realistic caveats:**
- Pilot projects rarely convert directly to full procurement without significant additional compliance
- Government facilities may have strict IT security requirements that add deployment complexity
- Evaluation criteria are often defined by the agency, not the vendor
- Success in a pilot does not guarantee procurement — budget availability is a separate factor
- May require physical presence at government facilities for extended periods

---

### 3. Annual Software Licensing

**What it is:** Recurring license providing continued access to software updates, new scenarios, technical support, and bug fixes.

**Who pays:** Organizations using the system for ongoing research or training — universities, defense labs, training providers.

**Rough range:** ₹2–8 lakhs per year depending on deployment scale and support level. University licenses at lower end; government labs at higher end.

**When it applies:** After initial adoption, when users want to maintain access to improvements and support. Works best for organizations with annual software budgets.

**Realistic caveats:**
- Requires regular value delivery (updates, new scenarios, support) to justify renewal
- Government organizations may prefer one-time procurement over recurring licenses
- University budgets are often annual and uncertain — pricing must be flexible
- Competition from free/open-source alternatives is a factor in academic settings
- License management and enforcement add operational overhead

---

### 4. Enterprise Deployment

**What it is:** Full deployment of the system within an organization's infrastructure, including customization, integration with existing tools, training, and ongoing support.

**Who pays:** Large defense organizations, government agencies, or defense system integrators deploying the scheduler as part of a larger EW or spectrum monitoring capability.

**Rough range:** ₹50 lakhs – 2 crores depending on scale, customization, and integration complexity.

**When it applies:** When an organization has validated the system through a pilot and wants to deploy it operationally or as part of a larger program. Requires significant trust and established relationship.

**Realistic caveats:**
- Enterprise deployment requires security certifications and compliance documentation
- Integration with existing government IT infrastructure adds significant complexity
- Large contracts require established vendor relationships and often empanelment
- Payment schedules are milestone-based and may extend over 12–18 months
- Ongoing support obligations must be factored into pricing
- The gap between research prototype and production system is substantial

---

### 5. Custom Scenario Development

**What it is:** Building specific emitter behavior models and RF environment scenarios matching a client's operational conditions — e.g., specific frequency bands, emitter types, or interference patterns.

**Who pays:** Organizations with specific operational environments they want to simulate — defense labs, training providers, spectrum monitoring agencies.

**Rough range:** ₹1–5 lakhs per scenario depending on complexity and validation requirements.

**When it applies:** When the existing scenario library doesn't cover a client's specific needs. Useful as an add-on to licensing or as a standalone service.

**Realistic caveats:**
- Requires detailed understanding of client's operational environment (often classified or restricted)
- Validation of custom scenarios requires client cooperation and ground truth data
- Scope creep is common — clients often want more complexity than initially specified
- Pricing must account for iteration cycles and client review periods

---

### 6. Training and Simulation Packages

**What it is:** Structured training programs for operations teams, researchers, or students covering EW concepts, scheduling algorithms, and system operation.

**Who pays:** Defense training institutions, university departments, EW training providers.

**Rough range:** ₹50,000 – 3 lakhs per training cohort (10–30 participants). Includes materials, hands-on exercises, and certification.

**When it applies:** When organizations need to build capability in adaptive EW scanning. Useful for university courses, government training programs, or defense professional development.

**Realistic caveats:**
- Training content must be regularly updated to reflect software changes
- Government training institutions often have established curricula — integration takes time
- Remote training is more scalable but less effective for hands-on RF concepts
- Certification value depends on issuing institution's recognition

---

### 7. Integration and Support Contracts

**What it is:** Ongoing technical support, system maintenance, algorithm updates, and assistance with integration into client systems.

**Who pays:** Organizations using the system in production or ongoing research — government labs, defense integrators, training providers.

**Rough range:** ₹1–5 lakhs per year depending on support level and integration complexity.

**When it applies:** After deployment, when clients need ongoing assistance. Best structured as annual retainer with defined support hours.

**Realistic caveats:**
- Support obligations scale with deployment size — resource planning is critical
- Government clients may have strict SLA requirements
- Integration with classified systems requires security clearances
- Bug fixes and updates must be tested against client-specific configurations

---

### 8. University / Research Licenses

**What it is:** Discounted or free access for academic research and education, often with restrictions on commercial use.

**Who pays:** Universities, research institutions, or individual researchers. May be free or at reduced cost.

**Rough range:** Free to ₹50,000 per year. May include royalty arrangements for commercial applications of research outcomes.

**When it applies:** When academic institutions want to use the system for research or teaching. Builds ecosystem and generates research publications that validate the approach.

**Realistic caveats:**
- Free access generates goodwill but no revenue — must be balanced with commercial needs
- Research outcomes may benefit competitors if not properly licensed
- Academic collaborations require ongoing relationship management
- University procurement processes are often slow and bureaucratic

---

### 9. Hardware-in-the-Loop Integration

**What it is:** Services to connect the scheduling algorithms with real SDR hardware (USRP, HackRF, etc.) for validation testing and demonstration.

**Who pays:** SDR hardware manufacturers, defense labs with SDR platforms, research institutions building testbeds.

**Rough range:** ₹5–15 lakhs per integration project depending on hardware platform and complexity.

**When it applies:** When organizations want to validate the scheduler with real RF hardware or demonstrate capabilities to stakeholders. Bridges the gap between simulation and real-world deployment.

**Realistic caveats:**
- Hardware integration introduces real-world variables not present in simulation (latency, hardware limitations, RF propagation)
- Different SDR platforms have different APIs and capabilities — integration is platform-specific
- Validation results may differ from simulation — requires honest reporting of limitations
- Hardware availability and access may be restricted in government facilities

---

### 10. Secure On-Premise Deployment

**What it is:** Deployment within a client's secure facility with air-gapped or restricted network access, meeting government security requirements.

**Who pays:** Defense organizations, intelligence agencies, or government labs with strict security requirements.

**Rough range:** ₹25 lakhs – 1 crore depending on security requirements, customization, and support obligations.

**When it applies:** When the client cannot use cloud-based solutions due to security classification or data sensitivity. Requires significant security compliance investment.

**Realistic caveats:**
- Security certification (e.g., CERT-In, defense security protocols) is time-consuming and expensive
- On-premise deployment limits remote support capabilities
- Update and maintenance procedures must account for air-gapped environments
- Staff with security clearances may be required for deployment and support
- This is the most complex and highest-risk business model — pursue only with established client relationships

---

## Business Model Selection Guidance

| Phase | Recommended Models | Rationale |
|-------|-------------------|-----------|
| **Year 1** | University licenses, R&D contracts, Training packages | Build credibility, generate publications, establish relationships |
| **Year 2** | Government pilots, Custom scenarios, Integration support | Validate capabilities, demonstrate real-world value |
| **Year 3+** | Enterprise deployment, Secure on-premise, Licensing | Scale successful pilots into full deployments |

**Key Principle:** Start with low-risk, relationship-building models (university, training) before pursuing high-value government contracts. Each successful engagement builds the track record needed for the next tier.

---

*Document created: September 2026*
*Project: SMART-SCAN EW Adaptive Receiver Scheduler*
*Status: Research Prototype*
