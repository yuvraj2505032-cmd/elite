import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  Bell,
  Bot,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Eye,
  EyeOff,
  ExternalLink,
  FileCheck2,
  Filter,
  Globe2,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  Home,
  Landmark,
  Leaf,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Pause,
  Play,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { useWebsiteLocalization } from "./lib/websiteLocalization";
import {
  ageGroups,
  colorThemes,
  profileCompleteness,
} from "./lib/profileOptions";
import Assistant from "./components/assistant/Assistant";
import PageHeading from "./components/common/PageHeading";
import Profile from "./components/profile/Profile";
import "./jansahayak.css";

const navItems = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/discover", label: "Find schemes", icon: Search },
  { to: "/saved", label: "Saved schemes", icon: Bookmark },
  { to: "/assistant", label: "AI assistant", icon: MessageCircle },
  { to: "/profile", label: "My profile", icon: UserRound },
];
const languages = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "pa", label: "ਪੰਜਾਬੀ" },
];
const languageValues = languages.map(({ value }) => value);
function readWebsiteLanguage() {
  try {
    const saved = window.localStorage.getItem("jansahayak-language");
    return languageValues.includes(saved) ? saved : "en";
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Could not read the saved website language.", error);
    }
    return "en";
  }
}
function hasSavedWebsiteLanguage() {
  try {
    return languageValues.includes(
      window.localStorage.getItem("jansahayak-language"),
    );
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Could not read the saved website language.", error);
    }
    return false;
  }
}
function readColorMode() {
  try {
    const saved = window.localStorage.getItem("jansahayak-mode");
    return saved === "dark" ? "dark" : "light";
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Could not read the saved color mode.", error);
    }
    return "light";
  }
}
function readColorTheme() {
  try {
    const saved = window.localStorage.getItem("jansahayak-theme");
    return colorThemes.some((theme) => theme.value === saved) ? saved : "green";
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Could not read the saved color theme.", error);
    }
    return "green";
  }
}
const welcomeChatMessage = {
  role: "assistant",
  content:
    "Hello! I can help you use JanSahayak to find and understand government schemes. I can guide you step by step: open Find schemes, choose a search or filter, review a scheme's eligibility and official source, then save it if useful. What kind of support are you looking for?",
};
const createDefaultProfile = () => ({
  profession: "Student",
  state: "Punjab",
  district: "",
  age_group: "",
  gender: "",
  income: "",
  category: "",
  education: "Undergraduate",
  disability: "Prefer not to say",
  language: "en",
});

function readGuestBookmarks() {
  try {
    const value = JSON.parse(
      window.localStorage.getItem("jansahayak-bookmarks") || "[]",
    );
    return Array.isArray(value)
      ? value.filter(
          (id) => typeof id === "string" && !id.startsWith("demo-"),
        )
      : [];
  } catch {
    return [];
  }
}

function writeGuestBookmarks(bookmarks) {
  try {
    window.localStorage.setItem(
      "jansahayak-bookmarks",
      JSON.stringify(bookmarks),
    );
    return true;
  } catch {
    return false;
  }
}

async function checkAdminAccess(token) {
  if (!token) return false;
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/admin/me`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error("Admin service is unavailable.");
  return (await response.json()).role || false;
}

function AppShell() {
  const [schemes, setSchemes] = useState([]);
  const [bookmarks, setBookmarks] = useState(readGuestBookmarks);
  const [matches, setMatches] = useState({});
  const [profile, setProfile] = useState(() => ({
    ...createDefaultProfile(),
    language: readWebsiteLanguage(),
  }));
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminUserId, setAdminUserId] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [language, setLanguage] = useState(readWebsiteLanguage);
  const [languageChosen, setLanguageChosen] = useState(
    hasSavedWebsiteLanguage,
  );
  const [languageDialogOpen, setLanguageDialogOpen] = useState(
    () => !hasSavedWebsiteLanguage(),
  );
  const [languageChoice, setLanguageChoice] = useState(readWebsiteLanguage);
  const [chatMessages, setChatMessages] = useState([welcomeChatMessage]);
  const [colorMode, setColorMode] = useState(readColorMode);
  const [colorTheme, setColorTheme] = useState(readColorTheme);
  const appFrameRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = Boolean(user && adminUserId === user.id && adminRole);
  useWebsiteLocalization(appFrameRef, language);
  useEffect(() => {
    document.documentElement.dataset.mode = colorMode;
    try {
      window.localStorage.setItem("jansahayak-mode", colorMode);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Could not save the selected color mode.", error);
      }
    }
  }, [colorMode]);
  useEffect(() => {
    document.documentElement.dataset.theme = colorTheme;
    try {
      window.localStorage.setItem("jansahayak-theme", colorTheme);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Could not save the selected color theme.", error);
      }
    }
  }, [colorTheme]);
  const setWebsiteLanguage = useCallback((nextLanguage) => {
    if (!languageValues.includes(nextLanguage)) return;
    setLanguage(nextLanguage);
    setProfile((current) => ({ ...current, language: nextLanguage }));
    setLanguageChosen(true);
  }, []);
  useEffect(() => {
    if (!languageChosen) return;
    try {
      window.localStorage.setItem("jansahayak-language", language);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Could not save the selected website language.", error);
      }
    }
  }, [language, languageChosen]);
  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        navigate("/discover");
        window.requestAnimationFrame(() => {
          document.querySelector(".search-box input")?.focus();
        });
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [navigate]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user || null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user || null),
    );
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => checkAdminAccess(data.session?.access_token))
      .then((role) => {
        if (active) {
          setAdminUserId(role ? user.id : null);
          setAdminRole(role || null);
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV)
          console.error("Could not verify administrator access.", error);
      });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    if (!user) {
      setProfile((current) => ({
        ...createDefaultProfile(),
        language: current.language,
      }));
      setMatches({});
      setBookmarks(readGuestBookmarks());
      return;
    }
    let active = true;
    setProfile((current) => ({
      ...createDefaultProfile(),
      language: current.language,
    }));
    (async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session
          ?.access_token;
        if (!token) {
          throw new Error("Your sign-in session has expired. Sign in again.");
        }
        const headers = { Authorization: `Bearer ${token}` };
        const base =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
        const [pr, br] = await Promise.all([
          fetch(`${base}/api/v1/profile`, { headers }),
          fetch(`${base}/api/v1/bookmarks`, { headers }),
        ]);
        if (pr.ok) {
          const d = await pr.json();
          if (active) {
            const preferredLanguage = languageValues.includes(
              d.preferred_language,
            )
              ? d.preferred_language
              : null;
            setProfile((p) => ({
              ...p,
              profession: d.profession || p.profession,
              state: d.state_code || p.state,
              district: d.district_code || "",
              age_group:
                d.age_group ||
                ageGroups.find(
                  (group) =>
                    Number(d.age) >= group.min && Number(d.age) <= group.max,
                )?.value ||
                p.age_group,
              gender: d.gender || "",
              income: d.annual_income_band || "",
              category: d.social_category || "",
              education: d.education_level || p.education,
              disability: d.disability_status || p.disability,
              language: preferredLanguage || p.language,
            }));
            if (preferredLanguage) {
              setLanguageChoice(preferredLanguage);
              setWebsiteLanguage(preferredLanguage);
            }
          }
        } else {
          const detail = await pr.json().catch(() => ({}));
          throw new Error(
            detail.detail || "Could not load your saved profile.",
          );
        }
        if (br.ok) {
          const d = await br.json();
          if (active)
            setBookmarks([
              ...new Set((d.items || []).map((item) => item.scheme_id)),
            ]);
        }
      } catch (error) {
        if (active) {
          showToast(error.message || "Could not load your saved profile.");
        }
        if (import.meta.env.DEV) console.error("Could not load account data.", error);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, setWebsiteLanguage]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session
          ?.access_token;
        const r = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/matches/evaluate`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` } },
        );
        if (r.ok) {
          const d = await r.json();
          const map = {};
          (d.items || []).forEach((x) => (map[x.scheme_id] = x));
          if (active) setMatches(map);
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("Could not evaluate scheme matches.", error);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    user,
    profile.profession,
    profile.state,
    profile.education,
    profile.age_group,
    profile.income,
  ]);
  const approved = schemes.filter((s) => s.status === "published");
  const showToast = (s) => setToast(s);
  async function signOut() {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        showToast("Could not sign out. Please try again.");
        return;
      }
    }
    setUser(null);
    setAdminUserId(null);
    setAdminRole(null);
    setBookmarks(readGuestBookmarks());
    setMatches({});
    setProfile((current) => ({
      ...createDefaultProfile(),
      language: current.language,
    }));
    showToast("You have been signed out.");
  }
  async function requestAccountDeletion() {
    if (!user) {
      setProfile(createDefaultProfile());
      setBookmarks([]);
      setQuery("");
      setWebsiteLanguage("en");
      writeGuestBookmarks([]);
      resetChat();
      showToast(
        "Session data cleared. No guest profile is stored on this device.",
      );
      return;
    }
    if (
      !window.confirm(
        "Delete your JanSahayak account and associated personal data? This cannot be undone.",
      )
    )
      return;
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      const r = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/account/deletion-request`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const d = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error(d.detail || "Account deletion could not be completed.");
      await supabase.auth.signOut();
      setUser(null);
      setBookmarks([]);
      setMatches({});
      setProfile((current) => ({
        ...createDefaultProfile(),
        language: current.language,
      }));
      showToast("Account deleted. You have been signed out.");
    } catch (e) {
      showToast(e.message || "Account deletion could not be completed.");
    }
  }
  async function saveProfile() {
    if (!user) {
      showToast(
        "Profile saved for this session. Sign in to sync it securely across visits.",
      );
      return;
    }
    setProfileSaving(true);
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      if (!token) {
        throw new Error("Your sign-in session has expired. Sign in again.");
      }
      const r = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            profession: profile.profession,
            age: null,
            age_group: profile.age_group || null,
            gender: profile.gender || null,
            state_code: profile.state || null,
            district_code: profile.district || null,
            annual_income_band: profile.income || null,
            social_category: profile.category || null,
            education_level: profile.education || null,
            disability_status: profile.disability || null,
            preferred_language: profile.language || language,
          }),
        },
      );
      if (!r.ok) {
        const detail = await r.json().catch(() => ({}));
        throw new Error(
          detail.detail ||
            "Could not save your profile. Check the backend and database setup.",
        );
      }
      showToast("Profile saved securely.");
    } catch (e) {
      showToast(
        e instanceof TypeError
          ? "Could not reach the profile service. Check VITE_API_BASE_URL and make sure the backend is running."
          : e.message || "Could not save profile.",
      );
    } finally {
      setProfileSaving(false);
    }
  }
  async function sendOtp(email) {
    if (!isSupabaseConfigured) {
      throw new Error("Add Supabase environment variables to enable email OTP.");
    }
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    if (error) throw error;
    showToast("OTP sent. Check your email.");
  }
  async function signInAdmin(email, password) {
    if (!isSupabaseConfigured) {
      throw new Error("Administrator sign-in is not configured yet.");
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!data.session?.access_token || !data.user) {
      throw new Error("Sign-in did not return an active session.");
    }
    const role = await checkAdminAccess(data.session.access_token);
    setUser(data.user);
    if (!role) {
      setAdminUserId(null);
      setAdminRole(null);
      throw new Error("This account does not have an administrator role.");
    }
    setAdminUserId(data.user.id);
    setAdminRole(role);
    setAdminLoginOpen(false);
    navigate("/admin");
    showToast("Administrator access verified.");
  }
  async function verifyOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    if (error) throw error;
    setUser(data.user);
    setAuthOpen(false);
    showToast("Signed in successfully.");
  }
  const refreshSchemes = async () => {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/schemes`,
    );
    if (!response.ok) throw new Error("Could not refresh published schemes.");
    const data = await response.json();
    if (!Array.isArray(data.items)) {
      throw new Error("Published scheme response is invalid.");
    }
    setSchemes(
      data.items.map((item) => ({
        id: item.id,
        title: item.title,
        department: item.department || "Government department",
        type: item.scheme_type || "Other",
        level: item.government_level || "Central",
        summary: item.summary || item.description || "",
        summaryHi: item.summary_hi || "",
        summaryPa: item.summary_pa || "",
        benefits: item.benefits || "See official scheme details",
        status: item.verification_status || "published",
        deadline: item.deadline || null,
        state: item.state_code || "All India",
        profession: [],
        officialUrl:
          item.official_source_url ||
          item.application_url ||
          null,
        documents: (item.scheme_documents || []).map(
          (document) => document.document_name,
        ),
        applicationStatus: item.application_status,
      })),
    );
  };
  useEffect(() => {
    let active = true;
    fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/schemes`,
    )
      .then((response) => {
        if (!response.ok) throw new Error("Scheme service is unavailable.");
        return response.json();
      })
      .then((data) => {
        if (active && Array.isArray(data.items)) {
          setSchemes(
            data.items.map((item) => ({
              id: item.id,
              title: item.title,
              department: item.department || "Government department",
              type: item.scheme_type || "Other",
              level: item.government_level || "Central",
              summary: item.summary || item.description || "",
              summaryHi: item.summary_hi || "",
              summaryPa: item.summary_pa || "",
              benefits: item.benefits || "See official scheme details",
              status: item.verification_status || "published",
              deadline: item.deadline || null,
              state: item.state_code || "All India",
              profession: [],
              officialUrl:
                item.official_source_url ||
                item.application_url ||
                null,
              documents: (item.scheme_documents || []).map(
                (document) => document.document_name,
              ),
              applicationStatus: item.application_status,
            })),
          );
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error("Could not load schemes.", error);
      });
    return () => {
      active = false;
    };
  }, []);
  async function toggleBookmark(id) {
    const wasSaved = bookmarks.includes(id);
    if (user) {
      try {
        const token = (await supabase.auth.getSession()).data.session
          ?.access_token;
        const base =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
        const r = await fetch(`${base}/api/v1/bookmarks/${id}`, {
          method: wasSaved ? "DELETE" : "PUT",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) throw new Error("Bookmark service unavailable.");
      } catch (e) {
        showToast(e.message || "Could not update saved schemes.");
        return;
      }
    }
    const nextBookmarks = wasSaved
      ? bookmarks.filter((savedId) => savedId !== id)
      : [...bookmarks, id];
    setBookmarks(nextBookmarks);
    const guestBookmarkSaved = user || writeGuestBookmarks(nextBookmarks);
    showToast(
      !guestBookmarkSaved
        ? "Saved for this session only. Browser storage is unavailable."
        : wasSaved
          ? "Removed from saved schemes."
          : "Saved to your list.",
    );
  }
  async function askAssistant(message) {
    const text = message.trim();
    if (!text) return;
    setChatMessages((m) => [...m, { role: "user", content: text }]);
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      const r = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: text,
            language,
            profile: {
              profession: profile.profession,
              state: profile.state,
              education: profile.education,
              age_group: profile.age_group || null,
              income: profile.income || null,
            },
          }),
        },
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          data?.detail || `The assistant request failed (HTTP ${r.status}).`,
        );
      }
      setChatMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
        },
      ]);
    } catch (error) {
      setChatMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Assistant error: ${error.message || "I cannot reach the scheme assistant service right now. Please try again."} You can browse available records in Find schemes; confirm scheme information on the official government website.`,
        },
      ]);
    }
  }
  function resetChat() {
    setChatMessages([welcomeChatMessage]);
  }
  async function createScheme(payload) {
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      if (!token) throw new Error("Sign in with an admin account first.");
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const r = await fetch(`${base}/api/v1/admin/schemes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.detail || "Could not create scheme draft.");
      showToast("Scheme saved as a draft. Publish it after a separate review.");
      return d.item;
    } catch (e) {
      showToast(e.message || "Could not create scheme.");
      return false;
    }
  }
  async function runDiscovery(queryText) {
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      if (!token) throw new Error("Sign in with an administrator account first.");
      const r = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/admin/discovery-runs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: queryText }),
        },
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "Web discovery failed.");
      showToast(
        `Research complete: ${data.candidates_added || 0} new candidates from ${data.queries_run || 1} search. Review each source before approval.`,
      );
      return data;
    } catch (e) {
      showToast(e.message || "Could not start discovery run.");
      return null;
    }
  }
  async function importMySchemeCatalog() {
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      if (!token) throw new Error("Sign in with an administrator account first.");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/admin/myscheme/import`,
        {
          method: "POST",
          headers: { Authorization: ["Bearer", token].join(" ") },
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Could not import the myScheme catalog.");
      }
      showToast(
        `Catalog checked: ${data.catalog_entries} listings, ${data.candidates_added} new review candidates. Nothing was published.`,
      );
      return data;
    } catch (e) {
      showToast(e.message || "Could not import the myScheme catalog.");
      return null;
    }
  }
  async function decideCandidate(id, action) {
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      const r = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/admin/candidates/${id}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            reason:
              action === "reject"
                ? "Rejected from admin review"
                : "Approved after official-source review",
          }),
        },
      );
      if (!r.ok) throw new Error();
      showToast(`Candidate ${action === "approve" ? "approved" : "rejected"}.`);
      return true;
    } catch {
      showToast(
        "Admin API unavailable. Configure the backend and admin role first.",
      );
      return false;
    }
  }
  async function publishScheme(id, verification) {
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      if (!token) throw new Error("Administrator session expired. Sign in again.");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/admin/schemes/${id}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            confirm_official_source: true,
            ...verification,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not publish draft.");
      try {
        await refreshSchemes();
        showToast("Scheme published and available in the citizen listing.");
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Scheme published but citizen listings did not refresh.", error);
        }
        showToast(
          "Scheme was published, but the citizen list could not refresh. Reload the app to check it.",
        );
      }
      return true;
    } catch (error) {
      showToast(error.message || "Could not publish draft.");
      return error.message || "Could not publish draft.";
    }
  }
  async function startSchemeReverification(id) {
    try {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      if (!token) throw new Error("Administrator session expired. Sign in again.");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/admin/schemes/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Could not start scheme re-verification.");
      }
      return true;
    } catch (error) {
      showToast(error.message || "Could not start scheme re-verification.");
      return false;
    }
  }
  return (
    <div className="app-frame" ref={appFrameRef} lang={language}>
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Landmark size={22} />
          </div>
          <div>
            <strong>JanSahayak</strong>
            <span>Benefits, made simpler</span>
          </div>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              onClick={() => setMobileNav(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <n.icon size={18} />
              <span>{n.label}</span>
            </NavLink>
          ))}
          <button
            className={`nav-link admin-nav-link ${isAdmin && location.pathname === "/admin" ? "active" : ""}`}
            onClick={() => {
              setMobileNav(false);
              if (isAdmin) navigate("/admin");
              else setAdminLoginOpen(true);
            }}
          >
            {isAdmin ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}
            <span>{isAdmin ? "Admin workspace" : "Admin sign in"}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-card">
            <div className="trust-icon">
              <ShieldCheck size={18} />
            </div>
            <strong>Trust comes first</strong>
            <p>
              Only reviewed records should be treated as verified. Always
              confirm details on the official portal.
            </p>
            <a
              href="https://www.myscheme.gov.in/"
              target="_blank"
              rel="noreferrer"
            >
              Official scheme directory <ArrowRight size={13} />
            </a>
          </div>
          <button className="profile-mini" onClick={() => navigate("/profile")}>
            <div className="avatar">{user?.phone?.slice(-2) || "JS"}</div>
            <div className="profile-mini-text">
              <strong>{user?.phone || "Your profile"}</strong>
              <span>{user ? "Signed in" : "Personalize your matches"}</span>
            </div>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button
            className="icon-btn menu-toggle"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            <span>JanSahayak</span>
            <span className="crumb-slash">/</span>
            <strong>
              {navItems.find((n) => n.to === location.pathname)?.label ||
                (location.pathname === "/admin" ? "Admin review" : "Workspace")}
            </strong>
          </div>
          <div className="top-actions">
            <button
              className="icon-btn theme-toggle"
              type="button"
              aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
              aria-pressed={colorMode === "dark"}
              title={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
              onClick={() =>
                setColorMode((mode) => (mode === "dark" ? "light" : "dark"))
              }
            >
              {colorMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <label className="language-select">
              <Globe2 size={15} />
              <select
                value={language}
                onChange={(e) => {
                  setWebsiteLanguage(e.target.value);
                }}
                aria-label="Language"
              >
                {languages.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon-btn notification-btn"
              aria-label="Notifications"
              onClick={() =>
                showToast(
                  "You are all caught up. Notification delivery will be enabled as channels are configured.",
                )
              }
            >
              <Bell size={18} />
              <i />
            </button>
            {user ? (
              <button className="top-login" onClick={signOut}>
                <LogOut size={15} /> Sign out
              </button>
            ) : (
              <button className="top-login" onClick={() => setAuthOpen(true)}>
                Sign in <ArrowRight size={15} />
              </button>
            )}
          </div>
        </header>
        <main className="page-content">
          <Routes>
            <Route
              path="/"
              element={
                <Overview
                  schemes={schemes}
                  approved={approved}
                  bookmarks={bookmarks}
                  profile={profile}
                  setProfile={setProfile}
                  onNavigate={navigate}
                  onAuth={() => setAuthOpen(true)}
                />
              }
            />
            <Route
              path="/discover"
              element={
                <Discover
                  schemes={schemes}
                  matches={matches}
                  bookmarks={bookmarks}
                  onBookmark={toggleBookmark}
                  query={query}
                  setQuery={setQuery}
                  onNavigate={navigate}
                />
              }
            />
            <Route
              path="/saved"
              element={
                <Saved
                  schemes={schemes.filter((s) => bookmarks.includes(s.id))}
                  matches={matches}
                  onBookmark={toggleBookmark}
                  onDiscover={() => navigate("/discover")}
                />
              }
            />
            <Route
              path="/assistant"
              element={
                <Assistant
                  messages={chatMessages}
                  onAsk={askAssistant}
                  language={language}
                  languages={languages}
                  onLanguage={setWebsiteLanguage}
                  onReset={resetChat}
                  onNavigate={navigate}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <Profile
                  profile={profile}
                  setProfile={setProfile}
                  colorTheme={colorTheme}
                  onColorThemeChange={setColorTheme}
                  onAuth={() => setAuthOpen(true)}
                  user={user}
                  saving={profileSaving}
                  onToast={showToast}
                  onSave={saveProfile}
                  onDelete={requestAccountDeletion}
                />
              }
            />
            <Route
              path="/admin"
              element={
                isAdmin ? (
                  <Admin
                    onRun={runDiscovery}
                    onImportMyScheme={importMySchemeCatalog}
                    onDecide={decideCandidate}
                    onCreate={createScheme}
                    onPublish={publishScheme}
                    onReverify={startSchemeReverification}
                    adminRole={adminRole}
                  />
                ) : (
                  <AdminAccessPanel
                    signedIn={Boolean(user)}
                    onLogin={() => setAdminLoginOpen(true)}
                  />
                )
              }
            />
            <Route
              path="*"
              element={
                <Overview
                  schemes={schemes}
                  approved={approved}
                  bookmarks={bookmarks}
                  profile={profile}
                  setProfile={setProfile}
                  onNavigate={navigate}
                  onAuth={() => setAuthOpen(true)}
                />
              }
            />
          </Routes>
        </main>
        {location.pathname !== "/assistant" && (
          <button
            className="floating-assistant"
            type="button"
            aria-label="Open AI assistant"
            title="Open AI assistant"
            onClick={() => navigate("/assistant")}
          >
            <Bot size={25} aria-hidden="true" />
          </button>
        )}
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} JanSahayak</span>
          <span>
            <ShieldCheck size={13} /> Your data. Your choice.
          </span>
          <a
            href="https://www.myscheme.gov.in/"
            target="_blank"
            rel="noreferrer"
          >
            Official scheme directory <ArrowRight size={12} />
          </a>
        </footer>
      </div>
      {mobileNav && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      {authOpen && (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          onSend={sendOtp}
          onVerify={verifyOtp}
        />
      )}
      {adminLoginOpen && (
        <AdminLoginDialog
          onClose={() => setAdminLoginOpen(false)}
          onSubmit={signInAdmin}
        />
      )}
      {languageDialogOpen && (
        <div className="modal-backdrop">
          <section
            className="auth-dialog language-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-dialog-title"
          >
            <div className="auth-mark">
              <Globe2 size={22} />
            </div>
            <div className="eyebrow">WELCOME TO JANSAHAYAK</div>
            <h2 id="language-dialog-title">Choose your language</h2>
            <p>Select the language you want to use across the website.</p>
            <label className="field-label">
              Language
              <select
                value={languageChoice}
                onChange={(event) => setLanguageChoice(event.target.value)}
                aria-label="Choose website language"
              >
                {languages.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn-primary full-width"
              onClick={() => {
                setWebsiteLanguage(languageChoice);
                setLanguageDialogOpen(false);
              }}
            >
              Continue
              <ArrowRight size={15} />
            </button>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Overview({
  approved,
  bookmarks,
  profile,
  setProfile,
  onNavigate,
}) {
  const [showWelcome, setShowWelcome] = useState(true);
  const ready = approved.length;
  return (
    <>
      <div className="welcome-strip">
        <div className="welcome-symbol">
          <Sparkles size={18} />
        </div>
        <div>
          <strong>Find support that fits your life.</strong>
          <p>
            Explore schemes and scholarships using your profile. Always confirm
            details with the official source.
          </p>
        </div>
        <button onClick={() => onNavigate("/discover")}>
          Explore schemes <ArrowRight size={16} />
        </button>
        {showWelcome && (
          <button
            className="strip-close"
            onClick={() => setShowWelcome(false)}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <section className="hero-block">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> YOUR PERSONAL BENEFITS COMPANION
          </div>
          <h1>
            Good support should
            <br />
            <em>find its way to you.</em>
          </h1>
          <p>
            Discover government schemes, scholarships and support opportunities
            based on who you are and what you need.
          </p>
          <div className="hero-buttons">
            <button
              className="btn-primary"
              onClick={() => onNavigate("/discover")}
            >
              Find my schemes <ArrowRight size={16} />
            </button>
            <button
              className="btn-secondary"
              onClick={() => onNavigate("/profile")}
            >
              Complete my profile <UserRound size={16} />
            </button>
          </div>
          <div className="hero-proof">
            <span>
              <CheckCircle2 size={15} /> Official-source review
            </span>
            <span>
              <ShieldCheck size={15} /> Privacy-minded
            </span>
            <span>
              <Globe2 size={15} /> English · हिन्दी · ਪੰਜਾਬੀ
            </span>
          </div>
        </div>
        <div className="hero-illustration">
          <div className="illustration-orbit orbit-one" />
          <div className="illustration-orbit orbit-two" />
          <div className="hero-center-icon">
            <Landmark size={44} />
          </div>
          <div className="float-card float-card-top">
            <div className="float-icon mint">
              <GraduationCap size={18} />
            </div>
            <div>
              <strong>Education support</strong>
              <span>Scholarships & grants</span>
            </div>
            <CheckCircle2 size={16} className="float-check" />
          </div>
          <div className="float-card float-card-bottom">
            <div className="float-icon peach">
              <Leaf size={18} />
            </div>
            <div>
              <strong>For your profession</strong>
              <span>Matches tailored to you</span>
            </div>
            <ArrowDownRight size={16} className="float-arrow" />
          </div>
          <div className="illustration-spark spark-a">✳</div>
          <div className="illustration-spark spark-b">✦</div>
        </div>
      </section>
      <section className="metric-grid">
        <Metric
          icon={Landmark}
          label="Verified schemes"
          value={String(ready).padStart(2, "0")}
          foot={ready ? "Published records" : "No verified records yet"}
          color="mint"
        />
        <Metric
          icon={Bookmark}
          label="Saved for later"
          value={String(bookmarks.length).padStart(2, "0")}
          foot="Your personal shortlist"
          color="lilac"
        />
        <Metric
          icon={UserRound}
          label="Profile complete"
          value={`${profileCompleteness(profile)}%`}
          foot="Improve your matches"
          color="peach"
        />
        <Metric
          icon={ShieldCheck}
          label="Review standard"
          value="100%"
          foot="Manual approval required"
          color="blue"
        />
      </section>
      <div className="section-title-row">
        <div>
          <div className="eyebrow">START HERE</div>
          <h2>What brings you here?</h2>
          <p>Choose a path to find the right opportunities.</p>
        </div>
        <button className="text-link" onClick={() => onNavigate("/discover")}>
          Browse all <ArrowRight size={15} />
        </button>
      </div>
      <div className="category-grid">
        <Category
          icon={GraduationCap}
          title="I'm a student"
          text="Scholarships, fee support and education grants"
          tone="mint"
          onClick={() => {
            setProfile((p) => ({ ...p, profession: "Student" }));
            onNavigate("/discover");
          }}
        />
        <Category
          icon={Leaf}
          title="I'm a farmer"
          text="Agriculture support, subsidies and resources"
          tone="green"
          onClick={() => {
            setProfile((p) => ({ ...p, profession: "Farmer" }));
            onNavigate("/discover");
          }}
        />
        <Category
          icon={HandCoins}
          title="I run a business"
          text="Entrepreneurship, MSME and business support"
          tone="peach"
          onClick={() => {
            setProfile((p) => ({ ...p, profession: "Entrepreneur" }));
            onNavigate("/discover");
          }}
        />
        <Category
          icon={Users}
          title="I'm looking for work"
          text="Training, employment and skill programmes"
          tone="lilac"
          onClick={() => {
            setProfile((p) => ({ ...p, profession: "Job seeker" }));
            onNavigate("/discover");
          }}
        />
      </div>
      <section className="bottom-cta">
        <div className="cta-icon">
          <HeartHandshake size={25} />
        </div>
        <div>
          <h3>Better matches start with your profile.</h3>
          <p>
            Share only the details needed to assess eligibility. You can update
            them whenever your situation changes.
          </p>
        </div>
        <button className="btn-primary" onClick={() => onNavigate("/profile")}>
          Set up profile <ArrowRight size={15} />
        </button>
      </section>
      <div className="notice-line">
        <ShieldCheck size={16} />
        <span>
          JanSahayak helps you discover opportunities. Eligibility estimates are
          not government approvals. Always verify scheme details and application
          status on the official portal.
        </span>
      </div>
    </>
  );
}
function Metric({ icon: Icon, label, value, foot, color }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${color}`}>
        <Icon size={18} />
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{foot}</div>
    </div>
  );
}
function Category({ icon: Icon, title, text, tone, onClick }) {
  return (
    <button className="category-card" onClick={onClick}>
      <div className={`category-icon ${tone}`}>
        <Icon size={21} />
      </div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <ArrowRight size={17} className="category-arrow" />
    </button>
  );
}
function Discover({
  schemes,
  matches,
  bookmarks,
  onBookmark,
  query,
  setQuery,
}) {
  const [type, setType] = useState("All types");
  const [scope, setScope] = useState("All India");
  const [view, setView] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [selected, setSelected] = useState(null);
  const visible = useMemo(
    () =>
      schemes.filter(
        (s) =>
          (!query ||
            `${s.title} ${s.summary} ${s.type} ${s.department}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (type === "All types" || s.type === type) &&
          (scope === "All India" ||
            s.state === scope ||
            s.state === "All India") &&
          (view !== "saved" || bookmarks.includes(s.id)),
      ),
    [schemes, query, type, scope, view, bookmarks],
  );
  const sortedSchemes = useMemo(() => {
    if (sortBy === "title") {
      return [...visible].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortBy === "deadline") {
      return [...visible].sort((a, b) => {
        const deadlineA = a.deadline ? Date.parse(a.deadline) : Infinity;
        const deadlineB = b.deadline ? Date.parse(b.deadline) : Infinity;
        return (Number.isNaN(deadlineA) ? Infinity : deadlineA) -
          (Number.isNaN(deadlineB) ? Infinity : deadlineB);
      });
    }
    return visible;
  }, [visible, sortBy]);
  return (
    <>
      <PageHeading
        eyebrow="SCHEME EXPLORER"
        title="Find what you may qualify for."
        description="Search government opportunities and review the evidence before applying."
        action={
          <div className="result-count">
            <span>{visible.length}</span> records
          </div>
        }
      />
      <div className="search-panel">
        <div className="search-box">
          <Search size={19} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try scholarship, farmer support, business grant…"
            aria-label="Search schemes"
          />
          <kbd>⌘ / Ctrl K</kbd>
        </div>
        <div className="filter-row">
          <div className="filter-label">
            <Filter size={15} /> Filter by
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Scheme type"
          >
            <option>All types</option>
            {[
              "Scholarship",
              "Subsidy",
              "Grant",
              "Pension",
              "Training",
              "Insurance",
              "Other",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            aria-label="State"
          >
            <option>All India</option>
            {[
              "Punjab",
              "Haryana",
              "Delhi",
              "Uttar Pradesh",
              "Maharashtra",
              "Rajasthan",
              "Gujarat",
              "Karnataka",
              "Tamil Nadu",
              "West Bengal",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <div className="filter-spacer" />
          <button
            className={`filter-chip ${view === "saved" ? "filter-chip-active" : ""}`}
            onClick={() => setView((v) => (v === "saved" ? "all" : "saved"))}
          >
            <Bookmark size={14} /> Saved only
          </button>
        </div>
      </div>
      <div className="results-intro">
        <div>
          <h2>
            Opportunities <span>{visible.length}</span>
          </h2>
          <p>
            Only administrator-reviewed, published listings appear here.
          </p>
        </div>
        <label className="sort-label">
          <Settings2 size={14} />
          <span className="visually-hidden">Sort schemes</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Sort schemes"
          >
            <option value="featured">Featured order</option>
            <option value="title">Title A to Z</option>
            <option value="deadline">Deadline soonest</option>
          </select>
        </label>
      </div>
      {sortedSchemes.length ? (
        <div className="scheme-grid">
          {sortedSchemes.map((s) => (
            <SchemeCard
              key={s.id}
              scheme={s}
              match={matches?.[s.id]}
              saved={bookmarks.includes(s.id)}
              onBookmark={onBookmark}
              onOpen={() => setSelected(s)}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon={Search}
          title={
            schemes.length ? "No matching records" : "No published schemes yet"
          }
          text={
            schemes.length
              ? "Try a different search or clear one of the filters."
              : "Schemes appear here only after an administrator reviews and publishes them."
          }
          action={
            schemes.length > 0 ? (
              <button
                className="btn-secondary"
                onClick={() => {
                  setQuery("");
                  setType("All types");
                  setScope("All India");
                  setView("all");
                }}
              >
                Clear filters
              </button>
            ) : null
          }
        />
      )}
      {selected && (
        <SchemeDialog
          scheme={selected}
          saved={bookmarks.includes(selected.id)}
          onBookmark={onBookmark}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
function SchemeCard({ scheme: s, match, saved, onBookmark, onOpen }) {
  return (
    <article className="scheme-card">
      <div className="scheme-card-top">
        <div
          className={`scheme-art ${s.type === "Scholarship" ? "art-lilac" : s.type === "Subsidy" ? "art-green" : "art-peach"}`}
        >
          {s.type === "Scholarship" ? (
            <GraduationCap size={24} />
          ) : s.type === "Subsidy" ? (
            <Leaf size={24} />
          ) : (
            <HandCoins size={24} />
          )}
        </div>
        <button
          className={`save-btn ${saved ? "is-saved" : ""}`}
          onClick={() => onBookmark(s.id)}
          aria-label={saved ? "Remove bookmark" : "Save scheme"}
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="scheme-meta">
        <span className="scheme-type">{s.type}</span>
        <span
          className={`status-pill ${s.status === "published" ? "status-verified" : "status-review"}`}
        >
          {s.status === "published" ? (
            <>
              <CheckCircle2 size={12} /> Verified
            </>
          ) : (
            <>
              <Clock3 size={12} /> Review pending
            </>
          )}
        </span>
        {s.status === "published" && s.officialUrl && (
          <a
            className="status-pill official-source-badge"
            href={s.officialUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open official scheme source in a new tab"
            title="Open the official scheme source"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink size={12} />
            Official site
          </a>
        )}
        {match && (
          <span
            className={`status-pill ${match.result === "eligible" ? "match-eligible" : match.result === "not_eligible" ? "match-no" : "match-maybe"}`}
          >
            {match.result === "eligible"
              ? "Eligible"
              : match.result === "not_eligible"
                ? "Not eligible"
                : "Maybe"}
          </span>
        )}
      </div>
      <h3>{s.title}</h3>
      <p className="scheme-summary">{s.summary}</p>
      <div className="scheme-benefit">
        <span>BENEFIT</span>
        <strong>{s.benefits}</strong>
      </div>
      <div className="scheme-card-footer">
        <span>
          <Landmark size={13} />
          {s.level || "Government scheme"}
        </span>
        <button onClick={onOpen}>
          View details <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
}
function SchemeDialog({ scheme: s, saved, onBookmark, onClose }) {
  const [summaryLanguage, setSummaryLanguage] = useState("en");
  const [reading, setReading] = useState(false);
  const [readingPaused, setReadingPaused] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const summaries = {
    en: s.summary,
    hi: s.summaryHi,
    pa: s.summaryPa,
  };
  const summary = summaries[summaryLanguage];
  const stopReading = () => {
    window.speechSynthesis?.cancel();
    setReading(false);
    setReadingPaused(false);
  };
  useEffect(
    () => () => window.speechSynthesis?.cancel(),
    [],
  );
  const startReading = () => {
    if (!summary || !("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
      setSpeechError("Read aloud isn't available for this summary in your browser.");
      return;
    }

    const voiceLang = { en: "en-IN", hi: "hi-IN", pa: "pa-IN" }[summaryLanguage];
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(summary);
    utterance.lang = voiceLang;
    utterance.onend = () => {
      setReading(false);
      setReadingPaused(false);
    };
    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") return;
      setReading(false);
      setReadingPaused(false);
      setSpeechError("Could not read the summary aloud. Please try again.");
    };
    setSpeechError("");
    setReading(true);
    setReadingPaused(false);
    window.speechSynthesis.speak(utterance);
  };
  const togglePauseReading = () => {
    if (!("speechSynthesis" in window)) return;
    if (readingPaused) {
      window.speechSynthesis.resume();
      setReadingPaused(false);
    } else {
      window.speechSynthesis.pause();
      setReadingPaused(true);
    }
  };
  const changeSummaryLanguage = (event) => {
    stopReading();
    setSpeechError("");
    setSummaryLanguage(event.target.value);
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="scheme-dialog">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <div className="eyebrow">SCHEME DETAILS</div>
        <h2>{s.title}</h2>
        <div className="scheme-summary-audio">
          <label className="field-label">
            Summary language
            <select value={summaryLanguage} onChange={changeSummaryLanguage}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="pa">ਪੰਜਾਬੀ</option>
            </select>
          </label>
          {!reading ? (
            <button
              className="btn-secondary"
              type="button"
              onClick={startReading}
              disabled={!summary}
              aria-label="Read summary aloud"
            >
              <Volume2 size={16} />
              Read aloud
            </button>
          ) : (
            <div className="summary-playback-controls">
              <button
                className="btn-secondary"
                type="button"
                onClick={togglePauseReading}
                aria-label={readingPaused ? "Resume reading summary" : "Pause reading summary"}
              >
                {readingPaused ? <Play size={16} /> : <Pause size={16} />}
                {readingPaused ? "Resume" : "Pause"}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={stopReading}
                aria-label="Stop reading summary"
              >
                <VolumeX size={16} />
                Stop
              </button>
            </div>
          )}
          {!summary && (
            <span className="summary-not-available">
              This summary has not been provided in the selected language.
            </span>
          )}
          {speechError && (
            <span className="summary-not-available" role="status">
              {speechError}
            </span>
          )}
        </div>
        <p lang={{ en: "en", hi: "hi", pa: "pa" }[summaryLanguage]}>
          {summary || "A reviewed summary is not available in this language yet."}
        </p>
        <div className="dialog-warning">
          <ShieldCheck size={18} />
          <div>
            <strong>
              {s.status === "published"
                ? "Admin reviewed record"
                : "Verification required"}
            </strong>
            <span>
              Check the source and current application status before applying.
            </span>
          </div>
        </div>
        <div className="detail-grid">
          <div>
            <span>Application status</span>
            <strong>
              {s.applicationStatus || "Unknown — check official site"}
            </strong>
          </div>
          <div>
            <span>Deadline</span>
            <strong>{s.deadline || "Not confirmed"}</strong>
          </div>
          <div>
            <span>Government level</span>
            <strong>{s.level || "Not specified"}</strong>
          </div>
          <div>
            <span>Department</span>
            <strong>{s.department || "Not specified"}</strong>
          </div>
        </div>
        <h3>Documents to check</h3>
        <ul className="document-list">
          {(s.documents || []).map((d) => (
            <li key={d}>
              <FileCheck2 size={16} />
              {d}
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={() => onBookmark(s.id)}>
            <Bookmark size={15} />
            {saved ? "Saved" : "Save scheme"}
          </button>
          <a
            className="btn-primary"
            href={s.officialUrl || "https://www.myscheme.gov.in/"}
            target="_blank"
            rel="noreferrer"
          >
            Check official site <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}
function Saved({ schemes, matches, onBookmark, onDiscover }) {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <PageHeading
        eyebrow="YOUR SHORTLIST"
        title="Saved schemes"
        description="Keep useful opportunities in one place and revisit them when you're ready."
      />
      {schemes.length ? (
        <div className="scheme-grid">
          {schemes.map((s) => (
            <SchemeCard
              key={s.id}
              scheme={s}
              match={matches?.[s.id]}
              saved
              onBookmark={onBookmark}
              onOpen={() => setSelected(s)}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon={Bookmark}
          title="Nothing saved yet"
          text="Bookmark a scheme to build your personal shortlist."
          action={
            <button className="btn-primary" onClick={onDiscover}>
              Explore schemes <ArrowRight size={15} />
            </button>
          }
        />
      )}
      {selected && (
        <SchemeDialog
          scheme={selected}
          saved
          onBookmark={onBookmark}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
function AdminAccessPanel({ signedIn, onLogin }) {
  return (
    <>
      <PageHeading
        eyebrow="RESTRICTED WORKSPACE"
        title="Administrator access only."
        description="Scheme review and publication tools are available only to accounts with an active server-assigned administrator role."
      />
      <section className="admin-access-panel">
        <div className="auth-mark">
          <LockKeyhole size={22} />
        </div>
        <h2>
          {signedIn
            ? "Your current account is not verified for admin access."
            : "Sign in with an administrator account."}
        </h2>
        <p>
          {signedIn
            ? "Use an account provisioned as a reviewer, publisher, or super administrator."
            : "Administrator access is checked by the JanSahayak API after sign-in."}
        </p>
        <button className="btn-primary" onClick={onLogin}>
          <LockKeyhole size={15} /> Admin sign in
        </button>
      </section>
    </>
  );
}
function Admin({
  onRun,
  onImportMyScheme,
  onDecide,
  onCreate,
  onPublish,
  onReverify,
  adminRole,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState("pending");
  const [candidatePage, setCandidatePage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState({
    pending_review: [],
    approved_for_editor: [],
    rejected: [],
  });
  const [candidateTotals, setCandidateTotals] = useState({
    pending_review: 0,
    approved_for_editor: 0,
    rejected: 0,
  });
  const [adminSchemes, setAdminSchemes] = useState({ draft: [], published: [] });
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  const fetchAdminData = useCallback(async (page = candidatePage) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) throw new Error("Administrator session expired. Sign in again.");
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const headers = { Authorization: `Bearer ${token}` };
    const candidateQuery = (status) =>
      `candidates?status=${status}&limit=50&offset=${page * 50}`;
    const paths = [
      candidateQuery("pending_review"),
      candidateQuery("approved_for_editor"),
      candidateQuery("rejected"),
    ];
    const canManageSchemes =
      adminRole === "publisher" || adminRole === "super_admin";
    if (canManageSchemes) {
      paths.push(
        "schemes?status=draft",
        "schemes?status=needs_reverification",
        "schemes?status=published",
      );
    }
    const responses = await Promise.all(
      paths.map((path) => fetch(`${base}/api/v1/admin/${path}`, { headers })),
    );
    const failed = responses.find((response) => !response.ok);
    if (failed) throw new Error("Could not load the administrator review queues.");
    const payloads = await Promise.all(responses.map((response) => response.json()));
    const mapCandidate = (candidate) => {
      const data = candidate.candidate_data || {};
      return {
        id: candidate.id,
        title: candidate.title,
        department: data.source_domain || "Discovered source",
        type: "Research candidate",
        status: candidate.review_status,
        officialUrl: candidate.source_url,
        summary: data.snippet || "No search summary was provided.",
        evidence: data.content_excerpt || "Full source excerpt unavailable.",
        discoveryQuery: candidate.discovery_query || data.discovery_query || "",
        discoveredAt: candidate.discovered_at,
        rawCandidate: true,
      };
    };
    const mapScheme = (scheme) => ({
      ...scheme,
      id: scheme.id,
      type: scheme.scheme_type || "Other",
      level: scheme.government_level || "Central",
      status: scheme.verification_status,
      officialUrl: scheme.official_source_url,
      documents: (scheme.scheme_documents || []).map((document) => document.document_name),
      rawScheme: true,
    });
    return {
      candidates: {
        pending_review: (payloads[0].items || []).map(mapCandidate),
        approved_for_editor: (payloads[1].items || []).map(mapCandidate),
        rejected: (payloads[2].items || []).map(mapCandidate),
      },
      candidateTotals: {
        pending_review: payloads[0].total || 0,
        approved_for_editor: payloads[1].total || 0,
        rejected: payloads[2].total || 0,
      },
      schemes: {
        draft: canManageSchemes
          ? [...(payloads[3].items || []), ...(payloads[4].items || [])].map(mapScheme)
          : [],
        published: canManageSchemes
          ? (payloads[5].items || []).map(mapScheme)
          : [],
      },
    };
  }, [adminRole, candidatePage]);
  useEffect(() => {
    let active = true;
    fetchAdminData()
      .then((data) => {
        if (active) {
          setCandidates(data.candidates);
          setCandidateTotals(data.candidateTotals);
          setAdminSchemes(data.schemes);
        }
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setLoadingCandidates(false);
      });
    return () => {
      active = false;
    };
  }, [fetchAdminData]);
  const reloadAdminData = async (page = candidatePage) => {
    setLoadingCandidates(true);
    setLoadError("");
    try {
      const data = await fetchAdminData(page);
      setCandidates(data.candidates);
      setCandidateTotals(data.candidateTotals);
      setAdminSchemes(data.schemes);
      return true;
    } catch (error) {
      setLoadError(error.message);
      return false;
    } finally {
      setLoadingCandidates(false);
    }
  };
  const handleDiscovery = async () => {
    const query = searchQuery.trim();
    if (query && query.length < 3) return;
    setLoadingCandidates(true);
    const result = await onRun(query || undefined);
    if (result) await reloadAdminData();
    else setLoadingCandidates(false);
  };
  const handleDefaultDiscovery = async () => {
    setLoadingCandidates(true);
    const result = await onRun();
    if (result) await reloadAdminData();
    else setLoadingCandidates(false);
  };
  const handleImportMyScheme = async () => {
    setLoadingCandidates(true);
    setImportingCatalog(true);
    try {
      const result = await onImportMyScheme();
      if (!result) {
        setLoadingCandidates(false);
        return;
      }
      setCandidatePage(0);
      await reloadAdminData(0);
    } finally {
      setImportingCatalog(false);
    }
  };
  const handleDecision = async (candidateId, action) => {
    if (await onDecide(candidateId, action)) await reloadAdminData();
  };
  const handleCreate = async (payload) => {
    const scheme = await onCreate(payload);
    if (!scheme) return false;
    await reloadAdminData();
    return scheme;
  };
  const handlePublish = async (schemeId, verification) => {
    const result = await onPublish(schemeId, verification);
    if (result !== true) return result;
    setPublishingId(null);
    await reloadAdminData();
    return true;
  };
  const handleReverify = async (schemeId) => {
    const result = await onReverify(schemeId);
    if (!result) return;
    setTab("drafts");
    setPublishingId(schemeId);
    await reloadAdminData();
  };
  const reviewRows =
    tab === "pending"
      ? candidates.pending_review
      : tab === "editor"
        ? candidates.approved_for_editor
        : tab === "rejected"
          ? candidates.rejected
          : tab === "drafts"
            ? adminSchemes.draft
            : adminSchemes.published;
  const candidateStatus =
    tab === "pending"
      ? "pending_review"
      : tab === "editor"
        ? "approved_for_editor"
        : tab === "rejected"
          ? "rejected"
          : null;
  const currentCandidateTotal = candidateStatus
    ? candidateTotals[candidateStatus]
    : 0;
  const candidatePageCount = Math.ceil(currentCandidateTotal / 50);
  const canPublish = adminRole === "publisher" || adminRole === "super_admin";
  return (
    <>
      <PageHeading
        eyebrow="ADMIN WORKSPACE"
        title="Review before it reaches people."
        description={`Signed in as ${adminRole.replaceAll("_", " ")}. Research results stay unpublished until a publisher verifies the official source.`}
        action={
          <div className="admin-heading-actions">
            <button
              className="btn-secondary"
              onClick={handleImportMyScheme}
              disabled={loadingCandidates}
            >
              <Globe2 size={15} />
              {importingCatalog
                ? "Importing catalog…"
                : "Import myScheme catalog"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setSelectedCandidate(null);
                setShowCreate((value) => !value);
              }}
              disabled={!canPublish}
            >
              <FileCheck2 size={15} /> Add scheme draft
            </button>
            <button
              className="btn-secondary"
              onClick={handleDefaultDiscovery}
              disabled={loadingCandidates}
            >
              <Search size={15} />
              {loadingCandidates && !importingCatalog
                ? "Searching…"
                : "Search configured topics"}
            </button>
          </div>
        }
      />
      <form
        className="research-search"
        onSubmit={(event) => {
          event.preventDefault();
          handleDiscovery();
        }}
      >
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search the web for a scheme, benefit, group, or region"
          aria-label="Web research query"
          minLength={3}
          maxLength={300}
          disabled={loadingCandidates}
        />
        <button
          className="btn-primary"
          disabled={loadingCandidates || searchQuery.trim().length < 3}
        >
          {loadingCandidates && !importingCatalog
            ? "Searching…"
            : "Research web"}
        </button>
      </form>
      {loadError && (
        <div className="admin-load-error" role="alert">
          <span>{loadError}</span>
          <button className="btn-secondary" onClick={reloadAdminData}>
            Retry
          </button>
        </div>
      )}
      {showCreate && (
        <NewSchemeForm
          key={selectedCandidate?.id || "new-scheme"}
          initial={
            selectedCandidate
              ? {
                  title: selectedCandidate.title,
                  summary: selectedCandidate.summary,
                  official_source_url: selectedCandidate.officialUrl,
                  department: selectedCandidate.department,
                }
              : null
          }
          onCreate={handleCreate}
          onCancel={() => {
            setShowCreate(false);
            setSelectedCandidate(null);
          }}
        />
      )}
      <div className="admin-notice">
        <ShieldCheck size={20} />
        <div>
          <strong>Manual approval is mandatory</strong>
          <p>
            Approving a candidate only moves it to Ready to edit; it will not appear on the citizen home page yet. Create a scheme draft, verify it, and publish it from Drafts to make it visible.
          </p>
        </div>
      </div>
      <div className="admin-metrics">
        <Metric
          icon={Search}
          label="Candidates"
          value={String(candidateTotals.pending_review).padStart(2, "0")}
          foot="Awaiting review"
          color="lilac"
        />
        <Metric
          icon={CheckCircle2}
          label="Published"
          value={String(
            adminSchemes.published.length,
          ).padStart(2, "0")}
          foot="Approved records"
          color="mint"
        />
        <Metric
          icon={Clock3}
          label="Re-verification"
          value={String(adminSchemes.draft.length).padStart(2, "0")}
          foot="Drafts awaiting verification"
          color="peach"
        />
      </div>
      <div className="admin-table-panel">
        <div className="table-header">
          <div>
            <h2>Scheme review queue</h2>
            <p>Inspect the official source and confirm all critical fields.</p>
          </div>
          <div className="table-tabs">
            {[
              ["pending", "Research queue"],
              ["editor", "Ready to edit"],
              ["drafts", "Drafts"],
              ["published", "Published"],
              ["rejected", "Rejected"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={tab === value ? "selected" : ""}
                onClick={() => {
                  setTab(value);
                  setCandidatePage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {loadingCandidates ? (
          <div className="review-loading" role="status">
            Loading review candidates…
          </div>
        ) : reviewRows.length ? (
          <div className="review-list">
            {reviewRows.map((s) => (
              <article className="review-item" key={s.id}>
                <div className="review-type-icon">
                  <Landmark size={19} />
                </div>
                <div className="review-item-main">
                  <div className="review-item-title">
                    <h3>{s.title}</h3>
                    <span
                      className={`status-pill ${s.status === "published" ? "status-verified" : "status-review"}`}
                    >
                      {s.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p>
                    {s.department || "Department not confirmed"} · {s.type}
                  </p>
                  <div className="review-url">
                    <Globe2 size={13} />
                    <a
                      href={s.officialUrl || "https://www.myscheme.gov.in/"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.officialUrl || "Official source not supplied"}
                    </a>
                  </div>
                  {s.discoveryQuery && (
                    <small className="research-query-label">
                      Found for: {s.discoveryQuery}
                    </small>
                  )}
                  {s.evidence && (
                    <details className="research-evidence">
                      <summary>Read search evidence</summary>
                      <p>{s.evidence}</p>
                    </details>
                  )}
                  {s.deadline && <small>Deadline: {s.deadline}</small>}
                  {s.benefits && <p>Benefit: {s.benefits}</p>}
                </div>
                <div className="review-actions">
                  {s.officialUrl && (
                    <a
                      className="review-source-action"
                      href={s.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source <ArrowRight size={14} />
                    </a>
                  )}
                  {tab === "pending" && s.rawCandidate && (
                    <>
                      <button
                        className="review-reject"
                        onClick={() => handleDecision(s.id, "reject")}
                      >
                        Reject
                      </button>
                      {canPublish && (
                        <button
                          className="review-approve"
                          onClick={() => handleDecision(s.id, "approve")}
                        >
                          <Check size={14} /> Approve for editing
                        </button>
                      )}
                    </>
                  )}
                  {tab === "editor" && canPublish && (
                    <button
                      className="review-approve"
                      onClick={() => {
                        setSelectedCandidate(s);
                        setShowCreate(true);
                      }}
                    >
                      <FileCheck2 size={14} /> Create scheme draft
                    </button>
                  )}
                  {tab === "drafts" && canPublish && (
                    <button
                      className="review-approve"
                      onClick={() => setPublishingId(s.id)}
                    >
                      <Check size={14} /> {s.status === "needs_reverification" ? "Review and republish" : "Review and publish"}
                    </button>
                  )}
                  {tab === "published" && canPublish && (
                    <button
                      className="review-approve"
                      onClick={() => handleReverify(s.id)}
                    >
                      <Volume2 size={14} /> Add audio summaries
                    </button>
                  )}
                </div>
                {publishingId === s.id &&
                  (tab === "drafts" || tab === "published") && (
                  <PublishConfirmation
                    scheme={s}
                    onCancel={() => setPublishingId(null)}
                    onSubmit={(verification) => handlePublish(s.id, verification)}
                  />
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={ShieldCheck}
            title="Review queue is clear"
            text={
              loadError
                ? "The authenticated research queues could not be loaded. Check the service and retry."
                : tab === "pending"
                  ? "Search the web above to find new scheme candidates."
                  : "No records are currently in this workflow stage."
            }
          />
        )}
        {candidateStatus && candidatePageCount > 1 && (
          <div className="review-pagination" aria-label="Review queue pages">
            <span>
              Showing {candidatePage * 50 + (reviewRows.length ? 1 : 0)}–
              {Math.min((candidatePage + 1) * 50, currentCandidateTotal)} of{" "}
              {currentCandidateTotal}
            </span>
            <div>
              <button
                className="btn-secondary"
                onClick={() => setCandidatePage((page) => Math.max(0, page - 1))}
                disabled={loadingCandidates || candidatePage === 0}
              >
                Previous
              </button>
              <span>
                Page {candidatePage + 1} of {candidatePageCount}
              </span>
              <button
                className="btn-secondary"
                onClick={() =>
                  setCandidatePage((page) =>
                    Math.min(candidatePageCount - 1, page + 1),
                  )
                }
                disabled={
                  loadingCandidates || candidatePage >= candidatePageCount - 1
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="admin-footnote">
        <CircleHelp size={16} />
        <span>
          Approval endpoints require a server-validated admin role. Hiding this
          page from navigation is not an access-control mechanism.
        </span>
      </div>
    </>
  );
}
function PublishConfirmation({ scheme, onCancel, onSubmit }) {
  const [reason, setReason] = useState("");
  const [summaries, setSummaries] = useState({
    summary: scheme.summary || "",
    summary_hi: scheme.summary_hi || "",
    summary_pa: scheme.summary_pa || "",
  });
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (
      reason.trim().length < 10 ||
      Object.values(summaries).some((summary) => summary.trim().length < 10) ||
      !confirmed ||
      busy
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await onSubmit({
        reason: reason.trim(),
        summary: summaries.summary.trim(),
        summary_hi: summaries.summary_hi.trim(),
        summary_pa: summaries.summary_pa.trim(),
      });
      if (result !== true) {
        setError(
          typeof result === "string"
            ? result
            : "Publishing failed. Check that the draft has a title, summary, and official source.",
        );
      }
    } catch (submitError) {
      setError(
        submitError.message || "Publishing failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="publish-confirmation" onSubmit={submit}>
      <p className="publish-requirements">
        Add a concise, admin-reviewed summary in each language. These exact
        summaries are shown to users and used for read-aloud.
      </p>
      {[
        ["summary", "Scheme summary (English)"],
        ["summary_hi", "Scheme summary (Hindi)"],
        ["summary_pa", "Scheme summary (Punjabi)"],
      ].map(([field, label]) => (
        <label className="field-label" key={field}>
          {label}
          <textarea
            value={summaries[field]}
            onChange={(event) => {
              setSummaries((current) => ({
                ...current,
                [field]: event.target.value,
              }));
              setError("");
            }}
            minLength={10}
            maxLength={5000}
            required
            rows={3}
            placeholder={`Enter the verified summary in ${label.slice("Scheme summary (".length, -1)}.`}
          />
        </label>
      ))}
      <label className="field-label">
        Verification notes
        <textarea
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError("");
          }}
          minLength={10}
          maxLength={1000}
          required
          rows={2}
          placeholder="Record what you verified on the official source."
        />
      </label>
      <label className="source-confirm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => {
            setConfirmed(event.target.checked);
            setError("");
          }}
        />
        <span>I verified this draft against its official source.</span>
      </label>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <p className="publish-requirements">
        Enter at least 10 characters of verification notes and confirm the
        official source. All three summaries and the official source are
        required to publish.
      </p>
      <div className="scheme-create-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-primary"
          disabled={
            busy ||
            !confirmed ||
            reason.trim().length < 10 ||
            Object.values(summaries).some((summary) => summary.trim().length < 10)
          }
        >
          {busy ? "Publishing…" : "Publish verified scheme"}
        </button>
      </div>
    </form>
  );
}
function NewSchemeForm({ initial, onCreate, onCancel }) {
  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    summary: initial?.summary || "",
    official_source_url: initial?.official_source_url || "",
    application_url: "",
    scheme_type: "Scholarship",
    government_level: "Central",
    department: initial?.department || "",
    state_code: "",
    benefits: "",
    deadline: "",
    field_key: "",
    operator: "eq",
    expected_value: "",
    document_name: "",
  }));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!confirmed) {
      setError(
        "Confirm that you reviewed the official source used for this draft.",
      );
      return;
    }
    setBusy(true);
    setError("");
    const payload = {
      title: form.title,
      summary: form.summary,
      description: form.summary,
      official_source_url: form.official_source_url,
      application_url: form.application_url || null,
      scheme_type: form.scheme_type,
      government_level: form.government_level,
      department: form.department || null,
      state_code: form.state_code || null,
      benefits: form.benefits || null,
      deadline: form.deadline || null,
      eligibility_rules:
        form.field_key && form.expected_value
          ? [
              {
                field_key: form.field_key,
                operator: form.operator,
                expected_value: form.expected_value,
                is_mandatory: true,
                missing_data_behavior: "maybe",
              },
            ]
          : [],
      documents: form.document_name
        ? [
            {
              document_name: form.document_name,
              is_mandatory: false,
              notes: "Confirm current requirements on the official source.",
            },
          ]
        : [],
    };
    const ok = await onCreate(payload);
    setBusy(false);
    if (ok) onCancel();
    else
      setError(
        "Could not create this scheme draft. Check admin permissions, API configuration and required fields.",
      );
  };
  return (
    <form className="scheme-create-panel" onSubmit={submit}>
      <div className="scheme-create-heading">
        <div>
          <h2>{initial ? "Create a draft from research" : "Add a scheme draft"}</h2>
          <p>
            Verify the official source and scheme details. Saving creates an
            unpublished draft for separate review.
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onCancel}
          aria-label="Close form"
        >
          <X size={17} />
        </button>
      </div>
      <div className="scheme-create-grid">
        <label className="field-label">
          Scheme title *
          <input
            required
            minLength={3}
            maxLength={240}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Official scheme name"
          />
        </label>
        <label className="field-label">
          Scheme type
          <select
            value={form.scheme_type}
            onChange={(e) => set("scheme_type", e.target.value)}
          >
            {[
              "Scholarship",
              "Subsidy",
              "Grant",
              "Pension",
              "Training",
              "Insurance",
              "Other",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="field-label wide-field">
          Short description *
          <textarea
            required
            minLength={10}
            maxLength={5000}
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="Describe the scheme based on its official source."
            rows={3}
          />
        </label>
        <label className="field-label">
          Official source URL *
          <input
            required
            type="url"
            pattern="https://.*"
            value={form.official_source_url}
            onChange={(e) => set("official_source_url", e.target.value)}
            placeholder="https://official.gov.in/..."
          />
        </label>
        <label className="field-label">
          Application URL
          <input
            type="url"
            value={form.application_url}
            onChange={(e) => set("application_url", e.target.value)}
            placeholder="https://portal.gov.in/..."
          />
        </label>
        <label className="field-label">
          Government level
          <select
            value={form.government_level}
            onChange={(e) => set("government_level", e.target.value)}
          >
            {["Central", "State", "District", "Other"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          State code / name
          <input
            value={form.state_code}
            onChange={(e) => set("state_code", e.target.value)}
            placeholder="Leave blank for all India"
          />
        </label>
        <label className="field-label">
          Department
          <input
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
            placeholder="Responsible department"
          />
        </label>
        <label className="field-label">
          Benefit summary
          <input
            value={form.benefits}
            onChange={(e) => set("benefits", e.target.value)}
            placeholder="Benefit as stated by official source"
          />
        </label>
        <label className="field-label">
          Deadline
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </label>
        <div className="wide-field rule-editor">
          <strong>Optional eligibility rule</strong>
          <div className="scheme-create-grid">
            <label className="field-label">
              Profile field
              <input
                value={form.field_key}
                onChange={(e) => set("field_key", e.target.value)}
                placeholder="e.g. state_code"
              />
            </label>
            <label className="field-label">
              Operator
              <select
                value={form.operator}
                onChange={(e) => set("operator", e.target.value)}
              >
                {[
                  "eq",
                  "neq",
                  "in",
                  "not_in",
                  "gte",
                  "gt",
                  "lte",
                  "lt",
                  "contains",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field-label wide-field">
              Expected value
              <input
                value={form.expected_value}
                onChange={(e) => set("expected_value", e.target.value)}
                placeholder="Use a field value matching the profile schema"
              />
            </label>
          </div>
          <small>
            Rules use profile field keys such as profession, state_code,
            education_level, annual_income_band or age when available. Test each
            rule before relying on eligibility results.
          </small>
        </div>
        <label className="field-label wide-field">
          Document checklist item (optional)
          <input
            value={form.document_name}
            onChange={(e) => set("document_name", e.target.value)}
            placeholder="Document name to confirm from the official source"
          />
        </label>
      </div>
      <label className="source-confirm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>
          I reviewed the official source for this draft. It will remain
          unpublished until a publisher completes the separate verification.
        </span>
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="scheme-create-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save and publish"} <Check size={15} />
        </button>
      </div>
    </form>
  );
}
function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function AuthDialog({ onClose, onSend, onVerify }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        await onSend(email);
        setSent(true);
      } else {
        await onVerify(email, otp);
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to continue. Check your email address and configuration.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="auth-dialog">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <div className="auth-mark">
          <Landmark size={24} />
        </div>
        <div className="eyebrow">WELCOME TO JANSAHAYAK</div>
        <h2>{sent ? "Enter your OTP" : "Sign in with your email"}</h2>
        <p>
          {sent
            ? "Enter the verification code sent to your email."
            : "Use your email address to save your profile and bookmarks across sessions."}
        </p>
        <form onSubmit={submit}>
          <label className="field-label">
            Email address
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              type="email"
              required
              maxLength={254}
              disabled={sent}
            />
          </label>
          {sent && (
            <label className="field-label">
              One-time password
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={4}
                maxLength={8}
              />
            </label>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="btn-primary full-width" disabled={busy}>
            {busy ? "Please wait…" : sent ? "Verify & sign in" : "Send OTP"}{" "}
            <ArrowRight size={15} />
          </button>
        </form>
        <div className="auth-legal">
          By continuing, you agree to use this service responsibly. Never share
          your OTP with anyone.
        </div>
      </div>
    </div>
  );
}
function AdminLoginDialog({ onClose, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(email.trim(), password);
    } catch (submitError) {
      setError(submitError.message || "Administrator sign-in failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <div className="auth-mark">
          <LockKeyhole size={22} />
        </div>
        <div className="eyebrow">ADMINISTRATOR SIGN IN</div>
        <h2 id="admin-login-title">Restricted access</h2>
        <p>
          Sign in with your provisioned administrator account. Access is
          verified by the server; a valid citizen account is not sufficient.
        </p>
        <form onSubmit={submit}>
          <label className="field-label">
            Administrator email
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="field-label">
            Password
            <span className="password-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                className="password-visibility-toggle"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn-primary full-width" disabled={busy}>
            {busy ? "Verifying access…" : "Sign in and verify role"}
          </button>
        </form>
        <div className="auth-legal">
          Admin accounts must be created in Supabase and assigned a role in the
          server-controlled admin registry. Never share credentials.
        </div>
      </section>
    </div>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
