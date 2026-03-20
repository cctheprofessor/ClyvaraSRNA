# Clyvara — CRNA Exam Preparation Platform

Clyvara is a mobile-first exam preparation and clinical support app built for student registered nurse anesthetists (SRNAs). It combines adaptive ML-powered study tools, AI-generated anesthesia care plans, a TA tutoring marketplace, and a peer community — all in one platform.

---

## Core Features

### Study & Exam Prep

**Diagnostic Assessment**
- One-time 50-question diagnostic exam required before accessing the full study suite
- Results calibrate the adaptive learning algorithm to your current knowledge level
- Supports multiple question types: multiple choice, multi-select, clinical scenarios, drag-and-drop matching/ordering, and hotspot questions

**Practice Sessions**
- 25-question and 50-question practice modes targeting your weak areas
- Focused Topic Practice for deep dives into specific NBCRNA exam topics
- Session persistence — leave mid-session and pick up exactly where you left off
- Tracks time per question, confidence level, and difficulty

**Study Plan Generator**
- AI-powered personalized study plans based on your exam date, weekly availability, current knowledge level, and focus areas
- Outputs a weekly schedule with milestones and topic recommendations

**Clyvara Analytica**
- Per-topic mastery levels and accuracy trends
- Memory retention curve showing how well you retain concepts over time
- Weak area identification with priority rankings
- Learning velocity metric to measure how quickly you are progressing

---

### Anesthesia Care Plans

**AI Care Plan Generator**
- Powered by GPT-4o with specialized CRNA clinical prompting
- Input patient demographics, procedure type, medical/surgical history, medications, physical exam findings, and lab results
- Generates a complete anesthesia care plan including:
  - Risk assessment (MH, aspiration, PONV, OSA, cardiovascular, pulmonary)
  - Induction, maintenance, and emergence strategy
  - Airway management plan with backup options
  - Ventilation parameters
  - Regional anesthesia recommendations
  - Monitoring requirements
  - Full medication plan (preop, induction, maintenance, PONV prophylaxis, postop)
  - Special considerations (positioning, temperature, infection prevention)
  - Preop, intraop, and postop checklists
  - Drug interaction analysis for GLP-1 agonists, anticoagulants, psychiatric medications, herbal supplements, and stress-dose steroids

**Care Plan Management**
- Save, view, and delete previously generated care plans
- Full sectioned display with color-coded risk tags and medication lists

---

### TA Tutoring Marketplace

**For Students**
- Browse available teaching assistants with ratings, specialties, and session counts
- Multi-step booking flow: select TA → pick date/time → choose duration (30, 60, or 90 min) → add notes → confirm
- Dynamic pricing based on duration plus a platform service fee
- View all bookings across statuses (pending, approved, confirmed, completed, cancelled)
- Direct messaging with your TA about an upcoming session
- Leave a star rating and written review after each completed session

**For TAs**
- Profile setup with display name, bio, specialties, and meeting link
- Set recurring weekly availability windows
- Dashboard to view all incoming bookings and manage approvals or rejections
- Cancellation with reason support

**Booking Workflow**
`awaiting_approval` → `approved` → `confirmed` → `completed` (or `cancelled` / `refunded` at any stage)

**Payments**
- Stripe-powered checkout for session payments
- Webhook-driven booking status updates on payment confirmation
- TA payout tracking

---

### Social Community Feed

- Admin-created prompts encourage specific types of posts (photo posts, story posts)
- Users create text and image posts in response to prompts or freely
- Like and comment on posts
- Real-time feed updates via Supabase Realtime
- Content reporting system

---

### Clinical Tools

**Clinical Preference Cards**
- Hospital and clinical site database organized by state
- Surgical case types per site with user-contributed tips
- Preceptor directory with feedback and advice from peers

**Anonymous Q&A**
- Post clinical questions anonymously
- Community-sourced answers

---

### Admin Panel

- Create, edit, activate, and deactivate social feed prompts
- Manually sync users to the ML backend for troubleshooting
- Role-based access control (Student, TA, Admin)

---

## Authentication

- Email and password sign-up and sign-in
- Password reset via email
- Persistent sessions across app launches
- Auto-created user profiles on registration

---

## User Profile

- Name, school, enrollment dates, program track, semester, GPA
- Clinical hours logged, specialty interest
- Daily study goal and preferred study time
- Email notification and weekly report preferences
- Role assignment (Student, TA, Admin)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 54) |
| Navigation | Expo Router |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| AI — Care Plans | OpenAI GPT-4o |
| AI — Study | Custom ML backend (adaptive learning) |
| Payments | Stripe |
| Serverless | Supabase Edge Functions |
| Local Storage | AsyncStorage |
| Icons | Lucide React Native |
| Animations | React Native Reanimated |

---

## Serverless Edge Functions

| Function | Purpose |
|---|---|
| `generate-comprehensive-care-plan` | GPT-4o care plan generation |
| `ml-backend-proxy` | Authenticated proxy to adaptive learning backend |
| `stripe-checkout` | Creates Stripe checkout sessions |
| `stripe-webhook` | Handles Stripe payment events |
| `ta-booking-checkout` | TA session payment processing |
| `ta-booking-management` | Booking approvals, rejections, and cancellations |

---

## Offline Support

- Questions are pre-fetched and cached locally for offline practice
- Answer rationales are cached after first load
- Practice session state is persisted locally and synced on reconnect
- Full offline study mode with background sync when connectivity is restored
