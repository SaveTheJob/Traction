import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const DEMO_JOBS = [
  {
    company: "Google",
    title: "Senior Software Engineer",
    location: "Mountain View, CA",
    link: "https://careers.google.com/jobs/results/",
    dateApplied: "Feb 15, 2026",
    priority: "High",
    status: "Interviewing",
    notes: "Completed onsite interview. Waiting for feedback.",
  },
  {
    company: "Microsoft",
    title: "Frontend Developer",
    location: "Redmond, WA",
    link: "https://careers.microsoft.com/",
    dateApplied: "Feb 10, 2026",
    priority: "Medium",
    status: "Applied",
    notes: "Referral from Sarah.",
  },
  {
    company: "Airbnb",
    title: "Full Stack Engineer",
    location: "San Francisco, CA",
    link: "https://careers.airbnb.com/",
    dateApplied: "Jan 28, 2026",
    priority: "High",
    status: "Offer",
    notes: "Offer received! $200k base + equity.",
  },
  {
    company: "Stripe",
    title: "Backend Engineer",
    location: "Remote",
    link: "https://stripe.com/jobs",
    dateApplied: "Feb 20, 2026",
    priority: "High",
    status: "Wishlist",
    notes: "Need to update resume before applying.",
  },
  {
    company: "Netflix",
    title: "UI Engineer",
    location: "Los Gatos, CA",
    link: "https://jobs.netflix.com/",
    dateApplied: "Jan 15, 2026",
    priority: "Low",
    status: "Rejected",
    notes: "Rejected after phone screen.",
  },
  {
    company: "OpenAI",
    title: "Research Engineer",
    location: "San Francisco, CA",
    link: "https://openai.com/careers",
    dateApplied: "Feb 18, 2026",
    priority: "High",
    status: "Applied",
    notes: "Applying via YC work at a startup program.",
  },
  {
    company: "Amazon",
    title: "SDE II",
    location: "Seattle, WA",
    link: "https://www.amazon.jobs",
    dateApplied: "Feb 5, 2026",
    priority: "Medium",
    status: "Interviewing",
    notes: "System design round scheduled for next Tuesday.",
  },
  {
    company: "Meta",
    title: "Product Engineer",
    location: "Menlo Park, CA",
    link: "https://www.metacareers.com/",
    dateApplied: "Feb 12, 2026",
    priority: "Medium",
    status: "Applied",
    notes: "",
  },
  {
    company: "Linear",
    title: "Software Engineer",
    location: "Remote",
    link: "https://linear.app/careers",
    dateApplied: "Feb 22, 2026",
    priority: "High",
    status: "Wishlist",
    notes: "Love their product design.",
  },
];

const DEMO_CONTACTS = [
  {
    name: "Sarah Jenkins",
    role: "Technical Recruiter",
    company: "Google",
    email: "sarah.j@google.com",
    lastContacted: "Feb 20, 2026",
    status: "Warm",
    notes: "Met at TechCrunch Disrupt. Very friendly.",
  },
  {
    name: "David Chen",
    role: "Engineering Manager",
    company: "Microsoft",
    email: "david.c@microsoft.com",
    lastContacted: "Jan 15, 2026",
    status: "Cold",
    notes: "Former colleague from university.",
  },
  {
    name: "Emily Weiss",
    role: "CTO",
    company: "TechStartup Inc.",
    email: "emily@techstartup.io",
    lastContacted: "Feb 23, 2026",
    status: "Hot",
    notes: "Scheduled coffee chat for next week.",
  },
  {
    name: "Recruiting Team",
    role: "Talent Acquisition",
    company: "Airbnb",
    email: "recruiting@airbnb.com",
    lastContacted: "Jan 30, 2026",
    status: "Warm",
    notes: "Sent follow-up regarding application.",
  },
  {
    name: "Mark Zucker",
    role: "Senior Dev",
    company: "Meta",
    email: "mark@meta.com",
    lastContacted: "Feb 10, 2026",
    status: "Cold",
    notes: "Reached out via LinkedIn.",
  },
];

export async function seedDemoData(userId: string) {
  const jobsCollection = collection(db, "jobs");
  const contactsCollection = collection(db, "contacts");

  const jobPromises = DEMO_JOBS.map((job) => {
    return addDoc(jobsCollection, {
      ...job,
      userId,
      createdAt: serverTimestamp(),
    });
  });

  const contactPromises = DEMO_CONTACTS.map((contact) => {
    return addDoc(contactsCollection, {
      ...contact,
      userId,
      createdAt: serverTimestamp(),
    });
  });

  await Promise.all([...jobPromises, ...contactPromises]);
}
