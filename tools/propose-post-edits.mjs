#!/usr/bin/env node
// ============================================================================
// propose-post-edits.mjs — show exactly what a blog_posts edit would change.
//
//   node tools/propose-post-edits.mjs            # all passes
//   node tools/propose-post-edits.mjs --pass A   # one pass
//
// THIS SCRIPT CANNOT WRITE TO THE DATABASE. There is no write code in it, and
// it reads with the public anon key, which has no write grant on blog_posts.
// That is deliberate: editing content_html changes what a reader sees
// immediately — the live site renders posts client-side from Supabase, so
// there is no deploy step between the write and the reader. The safe
// arrangement is one where the wrong action is not available, not one where
// it is available and discouraged.
//
// Output is the approval artefact: every change, row by row, before and after.
// It also writes the proposed values to seo/_proposed/<slug>.json so whoever
// holds the service-role key applies reviewed text rather than retyping it.
//
// Exits non-zero if any `find` string does not match exactly once — a silent
// no-op is the failure mode that matters here.
// ============================================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '..', 'seo', '_proposed');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zoceydoogxrpmmlxwhvd.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || readAnonFromSite();

function readAnonFromSite() {
  const m = /SUPABASE_ANON\s*=\s*\n?\s*"([^"]+)"/.exec(readFileSync(path.join(ROOT, 'app.js'), 'utf8'));
  if (!m) throw new Error('could not find SUPABASE_ANON in app.js — pass SUPABASE_ANON_KEY instead');
  return m[1];
}

// ---------------------------------------------------------------------------
// PASS A — fast track. Corrections to published claims.
//   Approved: WHO ratio (founder Q2) · therapy retitle + opening (14-commercial-interest-test.md)
// ---------------------------------------------------------------------------
const EDITS = [
{
  pass: 'A',
  slug: 'why-therapy-alone-cannot-solve-india-s-mental-health-crisis',
  field: 'content_html',
  why: 'Misattributes to the WHO a recommended ratio the WHO has never published, and overstates the shortfall ~3x. The only factually wrong claim in the corpus.',
  find: `<p>India has approximately 9,000 psychiatrists for a population of 1.4 billion people.</p><p>Let that sink in.</p><p>That's roughly 1 psychiatrist for every 155,000 people. In comparison, the recommended ratio according to the World Health Organization is 1 per 10,000.</p>`,
  replace: `<p>India has roughly 0.75 psychiatrists for every 100,000 people — one for every 133,000 (<em>Indian Journal of Psychiatry</em>, 2019, which counted about 9,000 psychiatrists nationally).</p><p>Let that sink in.</p><p>The figure widely treated as a workable minimum is more than three per 100,000. High-income countries average around twelve.</p>`,
},
{
  pass: 'A',
  slug: 'why-most-people-don-t-need-therapy-they-need-someone-to-listen',
  field: 'title',
  why: 'A company selling an AI companion should not tell a 16-25 audience they do not need therapy. Also better SEO: the target query is a question, which the statement title never matched. Slug unchanged, so no redirect risk.',
  find: `Why Most People Don't Need Therapy — They Need Someone to Listen`,
  replace: `Do You Need Therapy, or Just Someone to Listen?`,
},
{
  pass: 'A',
  slug: 'why-most-people-don-t-need-therapy-they-need-someone-to-listen',
  field: 'content_html',
  why: 'Drops the unbased prevalence claim ("most people ... aren\'t clinically ill") and gives the caveat real room rather than burying it.',
  find: `<p>Most people walking around with unresolved emotions aren't clinically ill. They aren't broken. They don't necessarily need medication or years of psychoanalysis.</p><p>They just need someone to truly listen.</p>`,
  replace: `<p>Not everyone carrying something heavy is unwell. And sometimes it <em>is</em> treatment they need — that matters, and this isn't a post about avoiding help.</p><p>But far more often, what's missing is simply one person who will truly listen.</p>`,
},

// --- PASS A, part 2: the LinkedIn footer, published 12 times ---------------
// One paste repeated, not twelve oversights: these posts were written for
// LinkedIn and moved across whole. Pure deletion, zero judgement — which is
// why it sits in the fast track rather than behind the /help/ dependency.
...[
  ['why-most-people-don-t-need-therapy-they-need-someone-to-listen', 'Article 2  ·  CATEGORY 2 — Problem with Current Systems'],
  ['why-therapy-alone-cannot-solve-india-s-mental-health-crisis',    'Article 3  ·  CATEGORY 4 — Teatalz Thought Leadership'],
  ['why-we-built-teatalz-the-missing-layer-in-human-life',           'Article 4  ·  CATEGORY 1 — Emotional Reality'],
  ['i-m-fine-the-most-dangerous-lie-we-tell-ourselves',              'Article 5  ·  CATEGORY 2 — Problem with Current Systems'],
  ['social-media-was-not-designed-for-your-emotions',                'Article 6  ·  CATEGORY 3 — AI + Emotional Future'],
  ['can-ai-understand-human-emotions-the-reality-vs-myth',           'Article 7  ·  CATEGORY 1 — Emotional Reality'],
  ['loneliness-in-a-hyperconnected-world-what-are-we-missing',       'Article 8  ·  CATEGORY 5 — Behavior + Psychology'],
  ['why-people-don-t-open-up-even-when-they-want-to',                'Article 9  ·  CATEGORY 3 — AI + Emotional Future'],
  ['why-ai-can-be-a-better-listener-than-humans-sometimes',          'Article 10  ·  CATEGORY 5 — Behavior + Psychology'],
  ['the-science-behind-venting-does-it-really-help',                 'Article 11  ·  CATEGORY 4 — Teatalz Thought Leadership'],
  ['from-social-media-to-emotional-media-the-shift-has-begun',       'Article 12  ·  CATEGORY 1 — Emotional Reality'],
].map(([slug, marker]) => ({
  pass: 'A',
  slug,
  field: 'content_html',
  why: 'Internal content-calendar marker published live on a page investors read during diligence. Pure deletion.',
  find: `<p><strong>${marker}</strong></p>`,
  replace: '',
})),
{
  pass: 'A',
  slug: 'emotional-suppression-the-silent-killer-of-modern-productivity',
  field: 'content_html',
  why: 'A LinkedIn hashtag block, published on the website. Same artefact as the category markers.',
  find: `<p>#Teatalz #EmotionalMedia #HumanConnection #AIForGood #DigitalWellbeing #EmotionalWellbeing #FutureOfSocialMedia #MentalWellness #StartupIndia #PositiveInternet</p>`,
  replace: '',
},

// ---------------------------------------------------------------------------
// PASS B — content. Statistics with their base stated, or written qualitatively.
//   Sources: 12-statistic-rewrites.md · 13-citation-and-base-pass.md · 14-commercial-interest-test.md
// ---------------------------------------------------------------------------
{
  pass: 'B',
  slug: 'why-most-people-don-t-need-therapy-they-need-someone-to-listen',
  field: 'content_html',
  why: 'Narrowed therapy\'s remit to make the gap our product fills look larger — the claim and the commercial interest pointed the same way.',
  find: `<p>Here's the uncomfortable truth about the mental health system: it's designed for the extreme end of the spectrum.</p><p>Therapy is for clinical diagnosis. For disorders. For crisis intervention. It's brilliant at what it does. But it was never designed to serve the daily, ambient emotional weight that most people carry`,
  replace: `<p>Here's the uncomfortable truth about the mental health system: there is nowhere near enough of it, and what exists is rightly pointed at the sharpest need first.</p><p>Therapy does a great deal — diagnosis and crisis care, but also the ordinary work of understanding yourself, which plenty of people go to it for. What no system this size can absorb is the daily, ambient emotional weight most of us carry`,
},
{
  pass: 'B',
  slug: 'why-most-people-don-t-need-therapy-they-need-someone-to-listen',
  field: 'content_html',
  why: 'Unsourced neuroscience in direct service of the product claim. Same shape as the cortisol chain.',
  find: `<p>When someone truly listens to you, something neurological happens. The nervous system starts to settle. The prefrontal cortex — your rational, self-aware brain — comes back online after being hijacked by emotional flooding.</p>`,
  replace: `<p>When someone really listens, you can feel something in you unclench. You think more clearly afterwards. Most people know the feeling; it doesn't need a diagram.</p>`,
},
{
  pass: 'B',
  slug: 'why-most-people-don-t-need-therapy-they-need-someone-to-listen',
  field: 'content_html',
  why: '"The single most powerful predictor" is a contested characterisation inside the common-factors debate, stated as settled, with no base — and it is load-bearing for an argument we profit from.',
  find: `<p>Studies in psychology consistently show that the single most powerful predictor of therapeutic outcome isn't the technique used — it's the quality of the relationship between the person and the listener.</p>`,
  replace: `<p>One of the most consistent findings in psychotherapy research is that the quality of the relationship matters at least as much as the technique — that being properly heard isn't a preliminary to the work, it's much of the work.</p>`,
},
{
  pass: 'B',
  slug: 'the-science-behind-venting-does-it-really-help',
  field: 'content_html',
  why: 'Bundled four outcomes from four different studies into one implied study. Only the health-centre finding is Pennebaker & Beall 1986.',
  find: `Participants who wrote about traumatic or emotionally significant experiences for 15-20 minutes per day showed improvements in immune function, reduced healthcare visits, improved mood, and better cognitive performance — even months later.`,
  replace: `In the original experiment, healthy undergraduates who wrote about difficult experiences for 15–20 minutes a day made fewer visits to their campus health centre over the following six months than students who wrote about trivial topics (Pennebaker &amp; Beall, 1986). Later studies found effects on mood and physical markers too, with varying strength.`,
},
{
  pass: 'B',
  slug: 'the-science-behind-venting-does-it-really-help',
  field: 'content_html',
  why: 'Needs its date and its base — controlled lab experiments with student volunteers, not observational studies of people venting to friends.',
  find: `<p>Studies by psychologists Brad Bushman and others found that venting — particularly expressing anger — often amplifies rather than reduces the emotional state. In one well-known experiment, people who were given the opportunity to vent about something that made them angry reported higher levels of anger afterward, not lower.</p>`,
  replace: `<p>In a series of laboratory experiments with student volunteers, the psychologist Brad Bushman found that venting — particularly expressing anger — often amplifies rather than reduces the emotional state (Bushman, 2002). In one, people given the chance to vent about something that had angered them reported <em>higher</em> levels of anger afterwards, not lower.</p>`,
},
{
  pass: 'B',
  slug: 'emotional-suppression-the-silent-killer-of-modern-productivity',
  field: 'content_html',
  why: 'Six unsourced physiological claims presented as established fact, in a mental-health-adjacent post. Cut entirely rather than sourced.',
  find: `<p>Research consistently shows that chronic suppression is associated with elevated baseline cortisol, the stress hormone. Cortisol is useful in acute stress responses. Chronically elevated, it disrupts sleep, impairs memory consolidation, increases inflammation, suppresses immune function, and affects metabolic health.</p>`,
  replace: `<p>Holding something down takes continuous effort, and effort that never stops is a kind of load — the sort that shows up as broken sleep, a shorter fuse, and a tiredness that rest doesn't seem to fix. You may not connect it to the thing you're not saying. It usually is.</p>`,
},
{
  pass: 'B',
  slug: 'i-m-fine-the-most-dangerous-lie-we-tell-ourselves',
  field: 'content_html',
  why: 'A book title (van der Kolk) presented as a research finding. The next sentence already says it better in the author\'s own words.',
  find: `The body keeps score, as the research shows. What we suppress doesn't disappear`,
  replace: `What we suppress doesn't disappear`,
},
{
  pass: 'B',
  slug: 'from-social-media-to-emotional-media-the-shift-has-begun',
  field: 'content_html',
  why: 'Correlational and genuinely contested, stated flatly. The post\'s argument is about design intent, which needs no citation.',
  find: `<p>Teenagers who grow up on social media show measurably higher rates of anxiety and depression than those who don't. Adults are quietly disillusioned`,
  replace: `<p>Whether these platforms have damaged teenage mental health is genuinely contested among researchers — the association turns up repeatedly, the causal claim is not settled. What is not contested is that none of them were designed with emotional wellbeing as a goal in the first place. Adults are quietly disillusioned`,
},
{
  pass: 'B',
  slug: 'loneliness-in-a-hyperconnected-world-what-are-we-missing',
  field: 'content_html',
  why: 'Undated; the base was misdescribed (a UCLA Loneliness Scale threshold, not self-report); and "the numbers echo across developed economies" was a second unsourced claim riding inside a sourced one.',
  find: `<p>A Cigna study found that 61% of adults in the US — and the numbers echo across developed economies — reported feeling lonely. India, despite`,
  replace: `<p>In Cigna's 2020 US loneliness survey, 61% of around 10,000 adults scored as lonely on the UCLA Loneliness Scale — up seven points in two years. India, despite`,
},
{
  pass: 'B',
  slug: 'loneliness-in-a-hyperconnected-world-what-are-we-missing',
  field: 'content_html',
  why: 'Needs its date and study type. Also carries a SECOND copy of the same unsourced physiological chain being cut from the suppression post — found while staging.',
  find: `<p>Research from Brigham Young University found that social isolation increases mortality risk by approximately 30%. Former US Surgeon General Vivek Murthy declared loneliness a public health epidemic. The physiological effects include elevated cortisol, disrupted sleep, impaired immune function, and increased risk of heart disease.</p>`,
  replace: `<p>A 2015 meta-analysis from Brigham Young University, pooling seventy studies, found social isolation associated with a 29% increase in mortality risk. Former US Surgeon General Vivek Murthy declared loneliness a public health epidemic.</p>`,
},
{
  pass: 'B',
  slug: 'loneliness-in-a-hyperconnected-world-what-are-we-missing',
  field: 'content_html',
  why: 'Correctly hedged already; the base worth naming is that it is an effect-size comparison, not a direct clinical measurement.',
  find: `Being chronically lonely is, according to some researchers, roughly as damaging to your health as smoking fifteen cigarettes a day.`,
  replace: `Researchers comparing effect sizes across studies have put chronic loneliness in the same range of health risk as smoking fifteen cigarettes a day — a comparison of statistical effect, not a direct clinical measurement.`,
},
{
  pass: 'B',
  slug: 'why-therapy-alone-cannot-solve-india-s-mental-health-crisis',
  field: 'content_html',
  why: 'A range flattened to a single figure sitting near the top of it. The source says 70-92% depending on the condition. Survey undated.',
  find: `<p>According to the National Mental Health Survey, nearly 150 million Indians need active mental health intervention. The treatment gap — the number of people who need help but don't receive it — is estimated to be over 80%.</p><p>80%.</p>`,
  replace: `<p>The National Mental Health Survey (2015–16) estimated that nearly 150 million Indians were in need of active mental health interventions. The treatment gap — people who need care and never receive it — runs between 70% and 92%, depending on the condition.</p><p>Even at the low end, that is most people.</p>`,
},
{
  pass: 'B',
  slug: 'why-ai-can-be-a-better-listener-than-humans-sometimes',
  field: 'title',
  why: 'The body explicitly refuses the sweeping claim the title makes ("Not that AI is better than humans at connection"). "Easier" is what it argues, and it matches the target queries better. Slug unchanged.',
  find: `Why AI Can Be a Better Listener Than Humans (Sometimes)`,
  replace: `Why It's Sometimes Easier to Talk to an AI Than to a Friend`,
},

// ---------------------------------------------------------------------------
// PASS C — closing CTAs, routed per post. See 21-cta-routing-map.md.
//   Rule 1 (need) · Rule 2 (curiosity) · three posts get no product CTA.
//   Every one keeps its reflective question and changes only what it asks the
//   reader to DO. Internal links for Pass C are staged separately.
// ---------------------------------------------------------------------------
...[
  ['why-most-people-don-t-need-therapy-they-need-someone-to-listen', 'Both',
   `<p><strong>What's the last time someone truly listened to you without offering advice? Drop it in the comments — I read every single one.</strong></p>`,
   `<p><strong>When was the last time someone listened to you without trying to fix it?</strong></p><p>We're building <strong>Teatalz</strong> for that: <strong>Rume</strong>, a Hinglish AI companion you can say it to at 2am — and <strong>Adda</strong>, where other people are working through the same thing. Neither is therapy and neither pretends to be. Arriving the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],

  ['why-therapy-alone-cannot-solve-india-s-mental-health-crisis', 'No product CTA',
   `<p><strong>Are you working in mental health, policy, or technology in India? I'd love to hear your perspective on what's missing. Let's build this conversation.</strong></p>`,
   `<p><strong>If you work in mental health, policy or technology in India: the layer below clinical care is the part almost nobody is funding, and it is where most of the need actually sits.</strong></p>`],

  ['why-we-built-teatalz-the-missing-layer-in-human-life', 'Brand',
   `<p><strong>What would you have done differently in your life if you'd had a genuinely safe space to express yourself emotionally — without judgment, without advice, without an audience? I'm genuinely curious. Share below.</strong></p>`,
   `<p><strong>What would have been different, if you'd had somewhere to say it out loud — without judgement, without advice, without an audience?</strong></p><p>That question is the whole reason Teatalz exists. It arrives the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],

  ['i-m-fine-the-most-dangerous-lie-we-tell-ourselves', 'Rume',
   `<p><strong>When was the last time you said 'I'm fine' and meant the opposite? You don't have to share the details — just whether it happened. I think the answer might surprise us all.</strong></p>`,
   `<p><strong>When was the last time you said "I'm fine" and meant the opposite?</strong></p><p>We're building <strong>Rume</strong> for the sentence that comes after it — a Hinglish AI companion you can be honest with at 2am, without managing anyone's reaction or owing them an update tomorrow. Not a therapist, and it won't pretend to be. Arriving the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],

  ['social-media-was-not-designed-for-your-emotions', 'Adda',
   `<p><strong>Have you ever had the impulse to post something emotionally honest and then stopped yourself? What held you back? I'd be curious to hear — this is a conversation worth having publicly.</strong></p>`,
   `<p><strong>Have you ever typed something honest, read it back, and deleted it? What stopped you?</strong></p><p>We're building <strong>Adda</strong> for the post you didn't make — anonymous-capable, gently temporary, moderated by people rather than only by filters. Social media built to be safe by design rather than moderated after the fact. Arriving the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],

  ['can-ai-understand-human-emotions-the-reality-vs-myth', 'Rume (rule 2)',
   `<p><strong>Where do you stand on AI and emotional support? Skeptical? Cautiously curious? Already a convert? I want to hear the honest take — not the polished version.</strong></p>`,
   `<p><strong>Where do you land on this — sceptical, cautiously curious, or already convinced?</strong></p><p><strong>Rume</strong> is our attempt at the honest middle: a Hinglish AI companion that listens well and doesn't claim to understand you the way a person does. Judge it yourself when it arrives, the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],

  ['loneliness-in-a-hyperconnected-world-what-are-we-missing', 'Adda',
   `<p><strong>Have you ever felt lonely in a room full of people? Or disconnected even while being technically very well connected? This is more common than we admit — and it deserves a real conversation.</strong></p>`,
   `<p><strong>Have you ever felt lonely in a room full of people?</strong></p><p>The reason it doesn't feel common is that none of us can see each other doing it. That's a design problem, not a fact about the world — and it's what we're building <strong>Adda</strong> to fix: a social space where "I feel unseen" is a normal thing to say out loud. Arriving the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],

  ['why-people-don-t-open-up-even-when-they-want-to', 'Both',
   `<p><strong>What has stopped you from saying something important that you needed to say? I think you'll find you're in vast company. The comments are a safe place for this one.</strong></p>`,
   `<p><strong>What has stopped you from saying the thing you needed to say?</strong></p><p>You're in vast company, and there are two ways round it. <strong>Rume</strong> — a Hinglish AI companion you can practise the sentence on, with no reaction to manage. And <strong>Adda</strong>, where you can say it without your name attached. Both arrive the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],

  ['why-ai-can-be-a-better-listener-than-humans-sometimes', 'Rume',
   `<p><strong>Have you ever found it easier to be honest in a low-stakes context — with a stranger, a journal, an app — than with the people closest to you? Why do you think that is?</strong></p>`,
   `<p><strong>Have you ever found it easier to be honest with a stranger, or a journal, than with the people closest to you?</strong></p><p>That's the whole reason <strong>Rume</strong> exists — a Hinglish AI companion for the things that are easier to say to something that isn't keeping score. Not a replacement for the people who know you. A different thing, for a different hour. Arriving the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],

  ['the-science-behind-venting-does-it-really-help', 'Rume',
   `<p><strong>Do you feel better or worse after venting? What makes the difference for you? I'd genuinely like to understand your experience — the research tells one story, but individual patterns are always more nuanced.</strong></p>`,
   `<p><strong>Do you feel better or worse after venting? What makes the difference for you?</strong></p><p>Mostly it's who's listening. We're building <strong>Rume</strong> to be the kind that asks the question underneath rather than agreeing you've been wronged — a Hinglish AI companion, available at the hour you actually need one. Arriving the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],

  ['from-social-media-to-emotional-media-the-shift-has-begun', 'Brand',
   `<p><strong>Where do you see the future of emotional media going? I'm especially curious from founders, investors, and mental health professionals in the room. This is one of the most important design challenges of our time.</strong></p>`,
   `<p><strong>Where do you think emotional media goes from here?</strong></p><p>We're building one answer to that question. It arrives the first week of October — <a href="/#waitlist">join the waitlist</a> if you'd like to see whether we're right.</p>`],

  ['emotional-suppression-the-silent-killer-of-modern-productivity', 'Rume',
   `<p>Join our waiting list to be part of our family before the world knows us </p>`,
   `<p><strong>What are you currently holding down, and how much of your attention is it quietly taking?</strong></p><p>We're building <strong>Rume</strong> for the things that don't get said — a Hinglish AI companion you can put it down with, at whatever hour it surfaces. Arriving the first week of October. <a href="/#waitlist">Join the waitlist</a>.</p>`],
].map(([slug, routing, find, replace]) => ({
  pass: 'C', slug, field: 'content_html',
  why: `Dead CTA — asks for a reply the site cannot receive. Routed: ${routing}.`,
  find, replace,
})),

// ---------------------------------------------------------------------------
// PASS D — internal links. See 06-internal-linking-map.md.
//   Hub-and-spoke core: P12 is the hub, P3/P5/P9/P4 are the strong spokes.
//   Each link sits in a sentence already about the thing being linked — no
//   "related posts" block bolted to the bottom.
//
//   ⚠️ TWO OF THESE CHAIN OFF PASS B REWRITES. Run D with B, never alone:
//      `--pass D` on its own will fail to match, by design.
// ---------------------------------------------------------------------------
...[
  ['why-most-people-don-t-need-therapy-they-need-someone-to-listen', 'P12 → P3 (chains off Pass B)',
   `it's much of the work.</p>`,
   `it's much of the work. It's the same pattern that shows up in <a href="/blog/the-science-behind-venting-does-it-really-help/">the research on venting</a> — what matters is less the expression than who receives it.</p>`],

  ['why-most-people-don-t-need-therapy-they-need-someone-to-listen', 'P12 → P5',
   `The infrastructure for human connection is everywhere.</p>`,
   `The infrastructure for human connection is everywhere. What's missing isn't the channel — it's that <a href="/blog/why-people-don-t-open-up-even-when-they-want-to/">the words stop before they reach it</a>.</p>`],

  ['why-most-people-don-t-need-therapy-they-need-someone-to-listen', 'P12 → P11 (chains off Pass B)',
   `what exists is rightly pointed at the sharpest need first.</p>`,
   `what exists is rightly pointed at the sharpest need first. <a href="/blog/why-therapy-alone-cannot-solve-india-s-mental-health-crisis/">In India the arithmetic is starker still</a>.</p>`],

  ['why-most-people-don-t-need-therapy-they-need-someone-to-listen', 'P12 → P9 (chains off Pass B)',
   `Most people know the feeling; it doesn't need a diagram.</p>`,
   `Most people know the feeling; it doesn't need a diagram. It's the opposite of what happens when you <a href="/blog/i-m-fine-the-most-dangerous-lie-we-tell-ourselves/">say you're fine and move the conversation on</a>.</p>`],

  ['why-most-people-don-t-need-therapy-they-need-someone-to-listen', 'P12 → P4',
   `Not every conversation about sadness should end with a referral.</p>`,
   `Not every conversation about sadness should end with a referral. Sometimes what's needed is <a href="/blog/why-ai-can-be-a-better-listener-than-humans-sometimes/">something that will listen without keeping score</a>.</p>`],

  ['the-science-behind-venting-does-it-really-help', 'P3 → P12 (hub)',
   `<p>Consider the difference between these two venting experiences:</p>`,
   `<p>Consider the difference between these two venting experiences — because <a href="/blog/why-most-people-don-t-need-therapy-they-need-someone-to-listen/">the quality of the listening is doing most of the work</a>:</p>`],

  ['the-science-behind-venting-does-it-really-help', 'P3 → P1',
   `<p>Venting tips into harmful territory when:</p>`,
   `<p>None of which is an argument for <a href="/blog/emotional-suppression-the-silent-killer-of-modern-productivity/">holding it in instead</a>, which carries its own cost. But venting tips into harmful territory when:</p>`],

  ['why-people-don-t-open-up-even-when-they-want-to', 'P5 → P12 (hub)',
   `<p>If we understand the barriers, we understand what dismantles them.</p>`,
   `<p>If we understand the barriers, we understand what dismantles them. Most of it comes down to <a href="/blog/why-most-people-don-t-need-therapy-they-need-someone-to-listen/">being listened to rather than advised</a>.</p>`],

  ['why-people-don-t-open-up-even-when-they-want-to', 'P5 → P9',
   `and deciding it won't be worth it.</p>`,
   `and deciding it won't be worth it. It's the same reflex that produces <a href="/blog/i-m-fine-the-most-dangerous-lie-we-tell-ourselves/">"I'm fine"</a> before anyone has really asked.</p>`],

  ['why-people-don-t-open-up-even-when-they-want-to', 'P5 → P1',
   `in the currency of unprocessed experience.</p>`,
   `in the currency of unprocessed experience. Some of it is <a href="/blog/emotional-suppression-the-silent-killer-of-modern-productivity/">paid in attention you needed for something else</a>.</p>`],

  ['i-m-fine-the-most-dangerous-lie-we-tell-ourselves', 'P9 → P12 (hub)',
   `punctures the wall.</p>`,
   `punctures the wall. What helps then usually isn't a diagnosis — it's <a href="/blog/why-most-people-don-t-need-therapy-they-need-someone-to-listen/">one person who will actually listen</a>.</p>`],

  ['i-m-fine-the-most-dangerous-lie-we-tell-ourselves', 'P9 → P5',
   `And we've been trained from childhood to respond accordingly.</p>`,
   `And we've been trained from childhood to respond accordingly. There's <a href="/blog/why-people-don-t-open-up-even-when-they-want-to/">a whole architecture behind why the real answer stays unsaid</a>.</p>`],

  ['why-ai-can-be-a-better-listener-than-humans-sometimes', 'P4 → P12 (hub)',
   `<p>Let's start by being specific about what we mean by 'listening' in the emotional sense.</p>`,
   `<p>Let's start by being specific about what we mean by 'listening' in the emotional sense — because <a href="/blog/why-most-people-don-t-need-therapy-they-need-someone-to-listen/">it's the thing most people are actually short of</a>.</p>`],

  ['why-ai-can-be-a-better-listener-than-humans-sometimes', 'P4 → P5',
   `it changes the relationship.</p>`,
   `it changes the relationship. That cost is a large part of <a href="/blog/why-people-don-t-open-up-even-when-they-want-to/">why people don't open up in the first place</a>.</p>`],
].map(([slug, label, find, replace]) => ({
  pass: 'D', slug, field: 'content_html',
  why: `Internal link, ${label}. Placed in a sentence already about the thing linked.`,
  find, replace,
})),

// --- PASS D, part 2: the eight non-core spokes -----------------------------
// Anchors re-read from live AFTER Pass A+B, not from the pre-edit text.
...[
  ['the-science-behind-venting-does-it-really-help', 'P3 → P4',
   `<p>Same event. Entirely different outcomes. The variable is the quality of the response.</p>`,
   `<p>Same event. Entirely different outcomes. The variable is the quality of the response — which is also <a href="/blog/why-ai-can-be-a-better-listener-than-humans-sometimes/">why some listeners are easier to talk to than others</a>.</p>`],

  ['i-m-fine-the-most-dangerous-lie-we-tell-ourselves', 'P9 → P1',
   `<p>A single 'I'm fine' isn't damaging. It's the accumulation that kills you.</p>`,
   `<p>A single 'I'm fine' isn't damaging. It's the accumulation that kills you — and <a href="/blog/emotional-suppression-the-silent-killer-of-modern-productivity/">holding it down has an ongoing cost</a>, not just a delayed one.</p>`],

  ['why-ai-can-be-a-better-listener-than-humans-sometimes', 'P4 → P7',
   `<p>I want to be precise, not promotional.</p>`,
   `<p>I want to be precise, not promotional — and the question of <a href="/blog/can-ai-understand-human-emotions-the-reality-vs-myth/">whether AI understands anything at all</a> deserves the same treatment.</p>`],

  ['emotional-suppression-the-silent-killer-of-modern-productivity', 'P1 → P5',
   `is that there is no permission to do otherwise.</p>`,
   `is that there is no permission to do otherwise. It is the same barrier that <a href="/blog/why-people-don-t-open-up-even-when-they-want-to/">stops people saying the thing outside work too</a>.</p>`],

  ['emotional-suppression-the-silent-killer-of-modern-productivity', 'P1 → P3',
   `finding some kind of meaning or integration on the other side.</p>`,
   `finding some kind of meaning or integration on the other side. That is also what separates <a href="/blog/the-science-behind-venting-does-it-really-help/">processing from simply going round it again</a>.</p>`],

  ['emotional-suppression-the-silent-killer-of-modern-productivity', 'P1 → P9',
   `Not because they're soft. Because they're strategic.</p>`,
   `Not because they're soft. Because they're strategic. They have stopped <a href="/blog/i-m-fine-the-most-dangerous-lie-we-tell-ourselves/">saying they're fine by reflex</a>.</p>`],

  ['loneliness-in-a-hyperconnected-world-what-are-we-missing', 'P6 → P12',
   `The social architecture of modern life is, in many ways, irreversible.</p>`,
   `The social architecture of modern life is, in many ways, irreversible. What can be rebuilt is smaller and more achievable: <a href="/blog/why-most-people-don-t-need-therapy-they-need-someone-to-listen/">the experience of being properly listened to</a>.</p>`],

  ['loneliness-in-a-hyperconnected-world-what-are-we-missing', 'P6 → P8',
   `Contact is easy, frictionless, and often meaningless.</p>`,
   `Contact is easy, frictionless, and often meaningless. It is also what <a href="/blog/social-media-was-not-designed-for-your-emotions/">every feed was optimised to produce</a>.</p>`],

  ['loneliness-in-a-hyperconnected-world-what-are-we-missing', 'P6 → P9',
   `not interesting enough to attract people.</p>`,
   `not interesting enough to attract people. So it gets hidden behind <a href="/blog/i-m-fine-the-most-dangerous-lie-we-tell-ourselves/">the two words we use to end the conversation</a>.</p>`],

  ['social-media-was-not-designed-for-your-emotions', 'P8 → P5',
   `You consider posting something honest.</p>`,
   `You consider posting something honest. And then, as <a href="/blog/why-people-don-t-open-up-even-when-they-want-to/">most people do</a>, you don't.</p>`],

  ['social-media-was-not-designed-for-your-emotions', 'P8 → P6',
   `here is how this person's life looks, feels, and measures up.</p>`,
   `here is how this person's life looks, feels, and measures up. Which is how you can be surrounded by people all day and <a href="/blog/loneliness-in-a-hyperconnected-world-what-are-we-missing/">still feel completely unseen</a>.</p>`],

  ['social-media-was-not-designed-for-your-emotions', 'P8 → P2',
   `<p>The solution isn't to leave social media. For most people, that's neither practical nor even desirable.</p>`,
   `<p>The solution isn't to leave social media. For most people, that's neither practical nor even desirable. It's that <a href="/blog/from-social-media-to-emotional-media-the-shift-has-begun/">something different gets built alongside it</a>.</p>`],

  ['can-ai-understand-human-emotions-the-reality-vs-myth', 'P7 → P12',
   `<p>AI won't replace human emotional connection. It shouldn't try.</p>`,
   `<p>AI won't replace human emotional connection. It shouldn't try. What it can do is narrower and still valuable: <a href="/blog/why-most-people-don-t-need-therapy-they-need-someone-to-listen/">be the thing that listens when nobody is free</a>.</p>`],

  ['can-ai-understand-human-emotions-the-reality-vs-myth', 'P7 → P4',
   `in a way that helps the speaker hear themselves.</p>`,
   `in a way that helps the speaker hear themselves. It is one of the specific things <a href="/blog/why-ai-can-be-a-better-listener-than-humans-sometimes/">a machine turns out to do consistently well</a>.</p>`],

  ['can-ai-understand-human-emotions-the-reality-vs-myth', 'P7 → P5',
   `<p>I want to be specific about the real limitations, because vague reassurances aren't helpful.</p>`,
   `<p>I want to be specific about the real limitations, because vague reassurances aren't helpful — and because <a href="/blog/why-people-don-t-open-up-even-when-they-want-to/">the reasons people stay silent</a> are not all things software can solve.</p>`],

  ['why-therapy-alone-cannot-solve-india-s-mental-health-crisis', 'P11 → P12',
   `and serves people who don't yet need clinical intervention.</p>`,
   `and serves people who don't yet need clinical intervention. Most of that ecosystem is <a href="/blog/why-most-people-don-t-need-therapy-they-need-someone-to-listen/">ordinary listening, done properly</a>.</p>`],

  ['why-therapy-alone-cannot-solve-india-s-mental-health-crisis', 'P11 → P5',
   `has been replaced by individual screens in individual rooms.</p>`,
   `has been replaced by individual screens in individual rooms. The result is a culture where <a href="/blog/why-people-don-t-open-up-even-when-they-want-to/">the words stop before they are said</a>.</p>`],

  ['why-therapy-alone-cannot-solve-india-s-mental-health-crisis', 'P11 → P10',
   `It doesn't need another list of therapists you can't afford.</p>`,
   `It doesn't need another list of therapists you can't afford. <a href="/blog/why-we-built-teatalz-the-missing-layer-in-human-life/">That gap is the reason we started</a>.</p>`],

  ['from-social-media-to-emotional-media-the-shift-has-begun', 'P2 → P8',
   `It's a design philosophy — and increasingly, a user expectation.</p>`,
   `It's a design philosophy — and increasingly, a user expectation. It begins from the observation that <a href="/blog/social-media-was-not-designed-for-your-emotions/">the current feeds were never designed for feelings at all</a>.</p>`],

  ['from-social-media-to-emotional-media-the-shift-has-begun', 'P2 → P10',
   `rather than retrofitted from an engagement model?</p>`,
   `rather than retrofitted from an engagement model? <a href="/blog/why-we-built-teatalz-the-missing-layer-in-human-life/">That question is where Teatalz started</a>.</p>`],

  ['why-we-built-teatalz-the-missing-layer-in-human-life', 'P10 → P12',
   `are fundamentally misaligned with human need.</p>`,
   `are fundamentally misaligned with human need. What people mostly lacked was not treatment — it was <a href="/blog/why-most-people-don-t-need-therapy-they-need-someone-to-listen/">someone to listen</a>.</p>`],

  ['why-we-built-teatalz-the-missing-layer-in-human-life', 'P10 → P11',
   `not safe in the terms-and-conditions sense, but safe in the emotional sense.</p>`,
   `not safe in the terms-and-conditions sense, but safe in the emotional sense. In India that gap is <a href="/blog/why-therapy-alone-cannot-solve-india-s-mental-health-crisis/">structural rather than personal</a>.</p>`],

  ['why-we-built-teatalz-the-missing-layer-in-human-life', 'P10 → P4',
   `availability, capacity, judgment, fatigue, relationship dynamics.</p>`,
   `availability, capacity, judgment, fatigue, relationship dynamics. Those limits are precisely <a href="/blog/why-ai-can-be-a-better-listener-than-humans-sometimes/">where a machine has an unfair advantage</a>.</p>`],
].map(([slug, label, find, replace]) => ({
  pass: 'D', slug, field: 'content_html',
  why: `Internal link, ${label}. Anchor re-read from live after Pass A+B.`,
  find, replace,
})),

// ---------------------------------------------------------------------------
// PASS E — the twelve excerpts. SEO-P1-4. See 31-excerpts-and-meta-descriptions.md.
//   SET mode: the field is empty on all twelve, so there is nothing to find.
//   Written against the CORRECTED posts and the NEW titles. No statistics —
//   nothing here can age wrong. Each under 155 characters.
//
//   ⏳ ORDER: this must land AFTER Pass A. While excerpt is empty the meta
//   description follows the title (post.html:86, `excerpt || title`), which is
//   why the Pass A retitle fixed four surfaces at once. These end that.
//   Pass A landed 4 Aug, so the constraint is satisfied.
// ---------------------------------------------------------------------------
...[
  ['why-most-people-don-t-need-therapy-they-need-someone-to-listen',
   `Not everyone carrying something heavy is unwell. Sometimes it is treatment you need — and often it's one person who will actually listen.`],
  ['the-science-behind-venting-does-it-really-help',
   `Getting it out helps — until it doesn't. What actually decides whether venting leaves you lighter or more wound up than you started.`],
  ['why-ai-can-be-a-better-listener-than-humans-sometimes',
   `Not a claim that AI beats people. A narrower one: at 3am, for certain things, it does something no tired friend can.`],
  ['why-people-don-t-open-up-even-when-they-want-to',
   `You have something real to say. You've had it for weeks. So why does it stop at your throat every single time?`],
  ['i-m-fine-the-most-dangerous-lie-we-tell-ourselves',
   `Two words we use to end conversations we're desperate to have. What "I'm fine" costs, and what usually comes after it.`],
  ['social-media-was-not-designed-for-your-emotions',
   `Every feed you scroll was built to hold your attention, not your feelings. What happens when you try to be honest there anyway.`],
  ['loneliness-in-a-hyperconnected-world-what-are-we-missing',
   `You can be surrounded by people and still feel unseen. The difference between contact and connection, and why cities widen it.`],
  ['emotional-suppression-the-silent-killer-of-modern-productivity',
   `You can't focus and you assume it's a discipline problem. It isn't. Holding a feeling down takes bandwidth you needed elsewhere.`],
  ['why-therapy-alone-cannot-solve-india-s-mental-health-crisis',
   `India cannot hire its way out of this, and therapy was never designed to carry it alone. What has to exist underneath it.`],
  ['can-ai-understand-human-emotions-the-reality-vs-myth',
   `Yes and no — and the honest answer is more interesting than either side of the argument wants it to be.`],
  ['from-social-media-to-emotional-media-the-shift-has-begun',
   `The internet organised around information, then connection, then commerce. What comes next, and why it has to.`],
  ['why-we-built-teatalz-the-missing-layer-in-human-life',
   `It started with a conversation that never happened — a friend drowning quietly while everyone thought he was fine.`],
].map(([slug, excerpt]) => ({
  pass: 'E', slug, field: 'excerpt',
  why: 'SEO-P1-4: excerpt is empty, so every meta description duplicates its own title and both card grids render an empty <p>.',
  expect: '', set: excerpt,
})),
];

// ---------------------------------------------------------------------------
const argPass = (() => { const i = process.argv.indexOf('--pass'); return i === -1 ? null : process.argv[i + 1]; })();
const wanted = argPass ? argPass.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : null;
const edits = wanted ? EDITS.filter((e) => wanted.includes(e.pass)) : EDITS;
if (!edits.length) { console.error(`no edits for pass "${argPass}"`); process.exit(1); }

// Stale output from a previous, WIDER run is the dangerous failure here: the
// applier reads JSON, not this console. If the last run was A+B+C+D and this
// one is A+B, leftover files would hand over unapproved edits. So the output
// directory is emptied first and a manifest records exactly what is in it.
if (existsSync(OUT)) for (const f of readdirSync(OUT)) if (f.endsWith('.json')) rmSync(path.join(OUT, f));

const slugs = [...new Set(edits.map((e) => e.slug))];
const rows = new Map();
for (const slug of slugs) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${slug}&select=slug,title,excerpt,content_html`,
    { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
  if (!r.ok) { console.error(`fetch failed for ${slug}: HTTP ${r.status}`); process.exit(1); }
  const [row] = await r.json();
  if (!row) { console.error(`no published row with slug ${slug}`); process.exit(1); }
  rows.set(slug, row);
}

const ctx = (s, i, n, len) => {
  const a = s.slice(Math.max(0, i - 90), i);
  const b = s.slice(i + len, i + len + 90);
  return { pre: (i > 90 ? '…' : '') + a, post: b + (i + len + 90 < s.length ? '…' : '') };
};

let failures = 0, applied = 0;
const proposed = new Map();

console.log(`\nPROPOSED EDITS — ${edits.length} change(s) across ${slugs.length} row(s)`);
console.log(`Read-only. This script holds no write credential and contains no write path.\n`);

for (const [n, e] of edits.entries()) {
  const row = rows.get(e.slug);
  const current = proposed.get(e.slug)?.[e.field] ?? row[e.field] ?? '';

  console.log('─'.repeat(78));
  console.log(`[${n + 1}] pass ${e.pass} · ${e.slug}`);
  console.log(`    field: ${e.field}`);
  console.log(`    why:   ${e.why}`);

  // SET mode — for writing a field that is currently empty, where there is no
  // string to find. Still verifies before writing: if the field is not exactly
  // what we expect, someone has written one since and we must not clobber it.
  if (e.set !== undefined) {
    if (current !== (e.expect ?? '')) {
      failures++;
      console.log(`\n    ✗ FAILED — field is not what was expected. Do NOT apply.`);
      console.log(`      expected: ${JSON.stringify(e.expect ?? '')}`);
      console.log(`      actual:   ${JSON.stringify(current.slice(0, 120))}`);
      console.log(`      Someone has written this since staging. Read it before overwriting.\n`);
      continue;
    }
    console.log(`\n    BEFORE:  ${JSON.stringify(current)}  (empty)`);
    console.log(`    \x1b[32m+\x1b[0m ${e.set}`);
    console.log(`             ${e.set.length} characters\n`);
    const next = { ...(proposed.get(e.slug) ?? {}) };
    next[e.field] = e.set;
    proposed.set(e.slug, next);
    applied++;
    continue;
  }

  const hits = current.split(e.find).length - 1;

  if (hits !== 1) {
    failures++;
    console.log(`\n    ✗ FAILED — expected exactly 1 match, found ${hits}.`);
    console.log(`      ${hits === 0 ? 'The live text has changed since this edit was written. Do NOT apply.' : 'Ambiguous target — the find string must be unique. Do NOT apply.'}\n`);
    continue;
  }

  const i = current.indexOf(e.find);
  const { pre, post } = ctx(current, i, e.find, e.find.length);
  console.log(`\n    BEFORE:  ${pre}`);
  console.log(`    \x1b[31m-\x1b[0m ${e.find}`);
  console.log(`             ${post}`);
  console.log(`\n    AFTER:   ${pre}`);
  console.log(`    \x1b[32m+\x1b[0m ${e.replace}`);
  console.log(`             ${post}\n`);

  const next = { ...(proposed.get(e.slug) ?? {}) };
  next[e.field] = current.replace(e.find, e.replace);
  proposed.set(e.slug, next);
  applied++;
}

console.log('─'.repeat(78));

if (failures) {
  console.error(`\n✗ ${failures} of ${edits.length} edit(s) did not match cleanly. Nothing written.\n`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const manifest = { passes: wanted ?? [...new Set(EDITS.map((e) => e.pass))].sort(),
                   edits: applied, rows: proposed.size, files: [] };
for (const [slug, fields] of proposed) {
  const f = path.join(OUT, `${slug}.json`);
  writeFileSync(f, JSON.stringify({ slug, ...fields }, null, 2), 'utf8');
  manifest.files.push({ slug, fields: Object.keys(fields) });
  console.log(`  wrote  seo/_proposed/${slug}.json   [${Object.keys(fields).join(', ')}]`);
}
writeFileSync(path.join(OUT, '_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`  wrote  seo/_proposed/_MANIFEST.json   passes: ${manifest.passes.join('+')}`);

console.log(`\n✓ ${applied} edit(s) matched exactly once. Proposed values written for review.`);
console.log(`  Applying them needs the service-role key, which this script does not have`);
console.log(`  and does not ask for. Hand the JSON to whoever holds it.\n`);
