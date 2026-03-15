"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

const C = { cream: "#F5F0E8", rose: "#D4A5A5", teal: "#2E7D8A", tealDark: "#1f5f6b", roseDark: "#b88888", text: "#1a1a1a", textLight: "#666" };

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse-dot{0%,100%{box-shadow:0 0 0 0 rgba(212,165,165,0.5)}50%{box-shadow:0 0 0 8px rgba(212,165,165,0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes expand{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  .a1{animation:fadeUp 0.5s cubic-bezier(.16,1,.3,1) both}
  .a2{animation:fadeUp 0.5s 0.08s cubic-bezier(.16,1,.3,1) both}
  .a3{animation:fadeUp 0.5s 0.16s cubic-bezier(.16,1,.3,1) both}
  .a4{animation:fadeUp 0.5s 0.24s cubic-bezier(.16,1,.3,1) both}
  .nav-item{padding:10px 14px;border-radius:10px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;display:flex;align-items:center;gap:9px;width:100%;text-align:left;transition:all 0.15s;color:#666}
  .nav-item:hover{background:rgba(46,125,138,0.08);color:${C.teal}}
  .nav-item.active{background:${C.teal}18;color:${C.teal};font-weight:600}
  .btn-main{background:${C.teal};color:#fff;border:none;padding:13px 24px;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.25s;display:inline-flex;align-items:center;gap:8px}
  .btn-main:hover{background:${C.tealDark};transform:translateY(-2px);box-shadow:0 8px 24px rgba(46,125,138,0.3)}
  .btn-ghost{background:transparent;color:#666;border:1px solid rgba(46,125,138,0.2);padding:7px 14px;border-radius:8px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s}
  .btn-ghost:hover{border-color:#2E7D8A;color:#2E7D8A}
  .scrollbox{overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(46,125,138,0.2) transparent}
  .scrollbox::-webkit-scrollbar{width:4px}
  .scrollbox::-webkit-scrollbar-thumb{background:rgba(46,125,138,0.2);border-radius:4px}
  .check-card{background:#fff;border-radius:14px;border:1px solid rgba(46,125,138,0.1);overflow:hidden;transition:border-color 0.2s}
  .check-card:hover{border-color:rgba(46,125,138,0.28)}
  .check-card-header{display:flex;align-items:center;gap:12px;padding:16px 18px;cursor:pointer;user-select:none}
  .check-card-header:hover{background:rgba(245,240,232,0.5)}
  .check-card-body{padding:0 18px 18px;animation:expand 0.22s ease both}
  .stat-card{background:#fff;border-radius:16px;padding:22px 24px;border:1px solid rgba(46,125,138,0.08);box-shadow:0 2px 10px rgba(0,0,0,0.04)}
  .safety-card{transition:all 0.3s ease}
  .safety-card:hover{transform:translateY(-3px);box-shadow:0 15px 35px rgba(46,125,138,0.3),inset 0 0 0 1px rgba(255,255,255,0.2) !important}
  .report-body h2{font-size:14px;font-weight:700;color:#1a1a1a;margin:12px 0 4px}
  .report-body h3{font-size:13px;font-weight:600;color:#2E7D8A;margin:10px 0 3px}
  .report-body p{font-size:12px;color:#444;line-height:1.65;margin-bottom:6px}
  .report-body ul{padding-left:16px;margin-bottom:6px}
  .report-body li{font-size:12px;color:#444;line-height:1.65}
  .report-body strong{color:#1a1a1a;font-weight:600}
`;

const RISK_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: "#FEE2E2", color: "#B91C1C", border: "#FCA5A5" },
  HIGH: { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  MODERATE: { bg: "#FEF9C3", color: "#854D0E", border: "#FDE047" },
  LOW: { bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
  SAFE: { bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
};
const RISK_ICON: Record<string, string> = { CRITICAL: "🔴", HIGH: "🟠", MODERATE: "🟡", LOW: "🟢", SAFE: "🟢" };

function RiskBadge({ risk }: { risk: string }) {
  const c = RISK_COLOR[risk] || RISK_COLOR.MODERATE;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.color, border: `1px solid ${c.border}`, letterSpacing: "0.05em", flexShrink: 0 }}>{risk}</span>;
}

interface CheckEntry {
  id: number;
  date: string;
  drugs: string[];
  risk: string;
  report: string;
  cascadePaths: number;
  pairwiseCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [pastChecks, setPastChecks] = useState<CheckEntry[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);

  // Drug Library state
  const [libSearch, setLibSearch] = useState("");
  const [libDrugs, setLibDrugs] = useState<string[]>([]);
  const [libBrands, setLibBrands] = useState<{ brand: string; generic: string; class?: string }[]>([]);
  const [libSelected, setLibSelected] = useState<string | null>(null);
  const [libInfo, setLibInfo] = useState<any>(null);
  const [libInfoLoading, setLibInfoLoading] = useState(false);
  const [libLoaded, setLibLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      setLoading(false);
      const stored = JSON.parse(localStorage.getItem(`medibook_checks_${u.uid}`) || "[]");
      setPastChecks(stored);
    });
    return () => unsub();
  }, [router]);

  // Refresh history when switching to past tab
  useEffect(() => {
    if (tab === "past" && user) {
      const stored = JSON.parse(localStorage.getItem(`medibook_checks_${user.uid}`) || "[]");
      setPastChecks(stored);
    }
  }, [tab, user]);

  const FALLBACK_DRUGS = ["abiraterone", "acyclovir", "adagrasib", "adefovir", "alfentanil", "allopurinol", "alosetron", "alprazolam", "amiodarone", "apalutamide", "aprepitant", "armodafinil", "atomoxetine", "atorvastatin", "avanafil", "baricitinib", "bosentan", "brigatinib", "budesonide", "bumetanide", "bupropion", "buspirone", "caffeine", "capmatinib", "carbamazepine", "cefaclor", "ceftizoxime", "celecoxib", "cenobamate", "ceritinib", "chlorzoxazone", "cilostazol", "cimetidine", "cinacalcet", "ciprofloxacin", "clarithromycin", "clobazam", "clopidogrel", "clotrimazole", "clozapine", "cobicistat", "colchicine", "conivaptan", "crizotinib", "cyclosporine", "dabrafenib", "darifenacin", "darolutamide", "darunavir", "dasatinib", "deferasirox", "desipramine", "dextromethorphan", "diazepam", "digoxin", "diltiazem", "disulfiram", "docetaxel", "dolutegravir", "dronedarone", "duloxetine", "edoxaban", "efavirenz", "eletriptan", "eliglustat", "eltrombopag", "enzalutamide", "eplerenone", "erythromycin", "escitalopram", "etravirine", "everolimus", "famotidine", "febuxostat", "felodipine", "fexofenadine", "fluconazole", "fluoxetine", "fluvastatin", "fluvoxamine", "gemfibrozil", "glimepiride", "glyburide", "ibrutinib", "idelalisib", "imatinib", "imipramine", "indinavir", "isavuconazole", "itraconazole", "ivabradine", "ivacaftor", "ketoconazole", "labetalol", "lansoprazole", "lapatinib", "lemborexant", "lovastatin", "lurasidone", "maraviroc", "melatonin", "metformin", "methotrexate", "metoprolol", "mexiletine", "miconazole", "midazolam", "mirabegron", "mitotane", "modafinil", "montelukast", "nebivolol", "nefazodone", "nelfinavir", "nevirapine", "nisoldipine", "nortriptyline", "omeprazole", "paclitaxel", "paroxetine", "perphenazine", "phenobarbital", "phenytoin", "pimozide", "pioglitazone", "posaconazole", "pravastatin", "primidone", "probenecid", "propafenone", "propranolol", "quetiapine", "quinidine", "rabeprazole", "ramelteon", "ranitidine", "ranolazine", "repaglinide", "rifampin", "rilpivirine", "rivaroxaban", "rosiglitazone", "rosuvastatin", "saquinavir", "sertraline", "sildenafil", "simvastatin", "sirolimus", "sulfasalazine", "tacrolimus", "tadalafil", "telithromycin", "tenofovir", "terbinafine", "teriflunomide", "theophylline", "ticagrelor", "ticlopidine", "tipranavir", "tizanidine", "tolbutamide", "tolterodine", "tolvaptan", "tramadol", "triazolam", "trimethoprim", "tucatinib", "vandetanib", "vardenafil", "vemurafenib", "venetoclax", "verapamil", "voriconazole", "warfarin", "zanubrutinib", "zileuton", "paracetamol", "ibuprofen", "aspirin", "amoxicillin", "azithromycin", "pantoprazole", "ranitidine", "cetirizine", "montelukast", "salbutamol", "prednisolone", "dexamethasone", "metronidazole", "ciprofloxacin", "amoxicillin-clavulanate", "atorvastatin", "losartan", "amlodipine", "enalapril", "metformin", "glimepiride", "levothyroxine", "vitamin d3", "calcium carbonate", "iron sulfate", "folic acid", "diclofenac", "naproxen", "tramadol", "codeine", "hydrocodone", "oxycodone", "gabapentin", "pregabalin", "alprazolam", "clonazepam", "zolpidem", "sertraline", "escitalopram", "fluoxetine", "amitriptyline", "clopidogrel", "aspirin", "atorvastatin", "rosuvastatin", "digoxin", "furosemide", "spironolactone", "bisoprolol", "carvedilol", "lisinopril", "ramipril", "telmisartan", "valsartan", "hydrochlorothiazide", "insulin"];

  const CYP_DATA: Record<string, { i?: string[], ind?: string[], s?: string[] }> = {
    "abiraterone": { "i": ["CYP2D6"] }, "acyclovir": { "i": ["CYP1A2"] }, "adagrasib": { "i": ["CYP3A4"] }, "alfentanil": { "s": ["CYP3A4"] }, "allopurinol": { "i": ["CYP1A2"] }, "alosetron": { "s": ["CYP1A2"] }, "alprazolam": { "s": ["CYP3A4"] }, "amiodarone": { "i": ["CYP2C9", "CYP3A4", "CYP2D6"] }, "apalutamide": { "ind": ["CYP3A4", "CYP2C19", "CYP2C9"] }, "aprepitant": { "i": ["CYP3A4"], "ind": ["CYP2C9"], "s": ["CYP3A4"] }, "armodafinil": { "ind": ["CYP3A4"] }, "atomoxetine": { "s": ["CYP2D6"] }, "atorvastatin": { "s": ["CYP3A4"] }, "avanafil": { "s": ["CYP3A4"] }, "bosentan": { "ind": ["CYP3A4"] }, "brigatinib": { "s": ["CYP3A4"] }, "budesonide": { "s": ["CYP3A4"] }, "bupropion": { "i": ["CYP2D6"], "s": ["CYP2B6"] }, "buspirone": { "s": ["CYP3A4"] }, "caffeine": { "s": ["CYP1A2"] }, "capmatinib": { "i": ["CYP1A2"] }, "carbamazepine": { "ind": ["CYP3A4", "CYP2B6", "CYP2C9"] }, "celecoxib": { "i": ["CYP2D6"], "s": ["CYP2C9"] }, "cenobamate": { "i": ["CYP2C19"] }, "ceritinib": { "i": ["CYP3A4", "CYP2C9"] }, "chlorzoxazone": { "i": ["CYP3A4"] }, "cilostazol": { "i": ["CYP3A4"] }, "cimetidine": { "i": ["CYP3A4", "CYP2D6", "CYP1A2"] }, "cinacalcet": { "i": ["CYP2D6"] }, "ciprofloxacin": { "i": ["CYP3A4"] }, "clarithromycin": { "i": ["CYP3A4"] }, "clobazam": { "i": ["CYP2D6"] }, "clopidogrel": { "i": ["CYP2C8", "CYP2B6"] }, "clotrimazole": { "i": ["CYP3A4"] }, "clozapine": { "s": ["CYP1A2"] }, "cobicistat": { "i": ["CYP3A4", "CYP2D6"] }, "colchicine": { "s": ["CYP3A4"] }, "conivaptan": { "i": ["CYP3A4"], "s": ["CYP3A4"] }, "crizotinib": { "i": ["CYP3A4"] }, "cyclosporine": { "i": ["CYP3A4"] }, "dabrafenib": { "ind": ["CYP3A4", "CYP2C9"] }, "darifenacin": { "s": ["CYP3A4"] }, "darunavir": { "s": ["CYP3A4"] }, "dasatinib": { "s": ["CYP3A4"] }, "deferasirox": { "i": ["CYP2C8"] }, "desipramine": { "s": ["CYP2D6"] }, "desloratadine": { "s": ["CYP2C8"] }, "dextromethorphan": { "s": ["CYP2D6"] }, "diazepam": { "s": ["CYP2C19"] }, "diltiazem": { "i": ["CYP3A4"] }, "diosmin": { "i": ["CYP2C9"] }, "disulfiram": { "i": ["CYP2C9"] }, "dronedarone": { "i": ["CYP3A4"], "s": ["CYP3A4"] }, "duloxetine": { "i": ["CYP2D6"], "s": ["CYP1A2"] }, "efavirenz": { "ind": ["CYP3A4", "CYP2C19", "CYP2B6"], "s": ["CYP2B6"] }, "elagolix": { "ind": ["CYP3A4"] }, "eletriptan": { "s": ["CYP3A4"] }, "eliglustat": { "s": ["CYP3A4", "CYP2D6"] }, "elvitegravir and ritonavir": { "i": ["CYP3A4"] }, "entrectinib": { "i": ["CYP3A4"], "s": ["CYP3A4"] }, "enzalutamide": { "ind": ["CYP3A4", "CYP2C19", "CYP2C9"] }, "eplerenone": { "s": ["CYP3A4"] }, "erythromycin": { "i": ["CYP3A4"] }, "escitalopram": { "i": ["CYP2D6"] }, "etravirine": { "ind": ["CYP3A4"] }, "everolimus": { "s": ["CYP3A4"] }, "felbamate": { "i": ["CYP2C19"] }, "felodipine": { "s": ["CYP3A4"] }, "fluconazole": { "i": ["CYP2C19", "CYP3A4", "CYP2C9"] }, "fluoxetine": { "i": ["CYP2C19", "CYP2D6"] }, "fluvastatin": { "i": ["CYP2C9"] }, "fluvoxamine": { "i": ["CYP2C19", "CYP1A2", "CYP3A4", "CYP2D6", "CYP2C9"] }, "fosaprepitant": { "i": ["CYP3A4"] }, "gemfibrozil": { "i": ["CYP2C8"] }, "glimepiride": { "s": ["CYP2C9"] }, "grapefruit juice": { "i": ["CYP3A4"] }, "ibrutinib": { "s": ["CYP3A4"] }, "idelalisib": { "i": ["CYP3A4"] }, "imatinib": { "i": ["CYP3A4"] }, "imipramine": { "s": ["CYP2D6"] }, "indinavir": { "s": ["CYP3A4"] }, "indinavir and ritonavir": { "i": ["CYP3A4"] }, "isavuconazole": { "i": ["CYP3A4"], "ind": ["CYP2B6"], "s": ["CYP3A4"] }, "istradefylline": { "i": ["CYP3A4"] }, "itraconazole": { "i": ["CYP3A4"] }, "ivabradine": { "s": ["CYP3A4"] }, "ivacaftor": { "i": ["CYP3A4"] }, "ivosidenib": { "ind": ["CYP3A4"] }, "ketoconazole": { "i": ["CYP3A4"] }, "labetalol": { "i": ["CYP2D6"] }, "lansoprazole": { "s": ["CYP2C19"] }, "larotrectinib": { "i": ["CYP3A4"], "s": ["CYP3A4"] }, "lazertinib": { "i": ["CYP3A4"] }, "lemborexant": { "ind": ["CYP2B6"], "s": ["CYP3A4"] }, "lomitapide": { "i": ["CYP3A4"], "s": ["CYP3A4"] }, "loperamide": { "s": ["CYP3A4", "CYP2C8"] }, "lopinavir and ritonavir": { "i": ["CYP3A4"] }, "lorcaserin": { "i": ["CYP2D6"] }, "lorlatinib": { "ind": ["CYP3A4", "CYP2B6", "CYP2C9"] }, "lovastatin": { "s": ["CYP3A4"] }, "lumacaftor and ivacaftor": { "ind": ["CYP3A4"] }, "lurasidone": { "s": ["CYP3A4"] }, "maraviroc": { "s": ["CYP3A4"] }, "melatonin": { "s": ["CYP1A2"] }, "methoxsalen": { "i": ["CYP1A2"] }, "metoprolol": { "s": ["CYP2D6"] }, "mexiletine": { "i": ["CYP1A2"] }, "miconazole": { "i": ["CYP2C9"] }, "midazolam": { "s": ["CYP3A4"] }, "mirabegron": { "i": ["CYP2D6"] }, "mitotane": { "ind": ["CYP3A4"] }, "mobocertinib": { "ind": ["CYP3A4"], "s": ["CYP3A4"] }, "modafinil": { "ind": ["CYP3A4"] }, "montelukast": { "s": ["CYP2C8"] }, "naloxegol": { "s": ["CYP3A4"] }, "nebivolol": { "s": ["CYP2D6"] }, "nefazodone": { "i": ["CYP3A4"] }, "nelfinavir": { "i": ["CYP3A4"] }, "nevirapine": { "ind": ["CYP2B6"] }, "nisoldipine": { "s": ["CYP3A4"] }, "nortriptyline": { "s": ["CYP2D6"] }, "omeprazole": { "i": ["CYP2C19"], "s": ["CYP2C19"] }, "oral contraceptives": { "i": ["CYP1A2"] }, "paritaprevir and ritonavir and (ombitasvir and/or dasabuvir)": { "i": ["CYP3A4"] }, "paroxetine": { "i": ["CYP2D6"] }, "peginterferon alpha-2a": { "i": ["CYP1A2"] }, "perphenazine": { "s": ["CYP2D6"] }, "pexidartinib": { "ind": ["CYP3A4"] }, "phenobarbital": { "ind": ["CYP3A4"] }, "phenytoin": { "ind": ["CYP3A4", "CYP2C19", "CYP1A2"], "s": ["CYP2C9"] }, "pimozide": { "s": ["CYP3A4", "CYP2D6"] }, "pioglitazone": { "s": ["CYP2C8"] }, "piperine": { "i": ["CYP2C9", "CYP1A2"] }, "pirfenidone": { "s": ["CYP1A2"] }, "pirtobrutinib": { "i": ["CYP2C8", "CYP3A4", "CYP2C19"] }, "posaconazole": { "i": ["CYP3A4"] }, "pralsetinib": { "s": ["CYP3A4"] }, "primidone": { "ind": ["CYP3A4"] }, "propafenone": { "s": ["CYP2D6"] }, "propranolol": { "s": ["CYP2D6"] }, "quetiapine": { "s": ["CYP3A4"] }, "quinidine": { "i": ["CYP2D6"] }, "r-venlafaxine": { "s": ["CYP2D6"] }, "rabeprazole": { "s": ["CYP2C19"] }, "ramelteon": { "s": ["CYP1A2"] }, "ranitidine": { "i": ["CYP3A4"] }, "ranolazine": { "i": ["CYP3A4"] }, "repaglinide": { "s": ["CYP2C8"] }, "repotrectinib": { "ind": ["CYP3A4"], "s": ["CYP3A4"] }, "resmetirom": { "i": ["CYP2C8"], "s": ["CYP2C8"] }, "rifampin": { "ind": ["CYP3A4", "CYP2C19", "CYP2C8", "CYP2B6", "CYP2C9", "CYP1A2"] }, "rilpivirine": { "s": ["CYP3A4"] }, "ritonavir\u00a014,\u00a015,": { "i": ["CYP3A4"], "ind": ["CYP2C19", "CYP2B6", "CYP2C9"] }, "rivaroxaban": { "s": ["CYP3A4"] }, "rolapitant": { "i": ["CYP2D6"] }, "rosiglitazone": { "s": ["CYP2C8"] }, "rufinamide": { "ind": ["CYP3A4"] }, "s-mephenytoin": { "s": ["CYP2C19"] }, "s-venlafaxine": { "s": ["CYP2D6"] }, "saquinavir": { "s": ["CYP3A4"] }, "saquinavir and ritonavir": { "i": ["CYP3A4"] }, "selexipag": { "s": ["CYP2C8"] }, "selpercatinib": { "i": ["CYP2C8", "CYP3A4"], "s": ["CYP3A4"] }, "sertraline": { "i": ["CYP2D6"] }, "sevabertinib": { "i": ["CYP3A4"], "s": ["CYP3A4"] }, "sildenafil": { "s": ["CYP3A4"] }, "simvastatin": { "s": ["CYP3A4"] }, "sirolimus": { "s": ["CYP3A4"] }, "sotorasib": { "ind": ["CYP3A4"] }, "st. john\u2019s wort": { "ind": ["CYP3A4"] }, "tacrolimus": { "s": ["CYP3A4"] }, "tadalafil": { "s": ["CYP3A4"] }, "taletrectinib": { "s": ["CYP3A4"] }, "tasimelteon": { "s": ["CYP1A2"] }, "tazemetostat": { "i": ["CYP2C8"], "ind": ["CYP3A4"], "s": ["CYP3A4"] }, "telithromycin": { "i": ["CYP3A4"] }, "tenofovir": { "i": ["CYP2B6"] }, "terbinafine": { "i": ["CYP2D6"] }, "teriflunomide": { "i": ["CYP2C8"], "ind": ["CYP1A2"] }, "theophylline": { "s": ["CYP1A2"] }, "ticagrelor": { "i": ["CYP3A4"], "s": ["CYP3A4"] }, "ticlopidine": { "i": ["CYP2C19", "CYP2B6"] }, "tipranavir": { "s": ["CYP3A4"] }, "tipranavir and ritonavir": { "i": ["CYP3A4"] }, "tizanidine": { "s": ["CYP1A2"] }, "tobacco (smoking)": { "ind": ["CYP1A2"] }, "tolbutamide": { "s": ["CYP2C9"] }, "tolterodine": { "s": ["CYP2D6"] }, "tolvaptan": { "s": ["CYP3A4"] }, "tramadol": { "s": ["CYP2D6"] }, "triazolam": { "s": ["CYP3A4"] }, "trimethoprim": { "i": ["CYP2C8"] }, "trimipramine": { "s": ["CYP2D6"] }, "tucatinib": { "i": ["CYP3A4", "CYP2C8"], "s": ["CYP2C8"] }, "vardenafil": { "s": ["CYP3A4"] }, "vemurafenib": { "i": ["CYP1A2", "CYP2D6"], "ind": ["CYP3A4"] }, "venetoclax": { "s": ["CYP3A4"] }, "verapamil": { "i": ["CYP3A4"] }, "voriconazole": { "i": ["CYP3A4", "CYP2C19", "CYP2B6", "CYP2C9"], "s": ["CYP2C19"] }, "warfarin": { "s": ["CYP2C9"] }, "zanubrutinib": { "ind": ["CYP3A4"] }, "zileuton": { "i": ["CYP1A2"] },
    "paracetamol": { "s": ["CYP2E1", "CYP3A4"] },
    "ibuprofen": { "s": ["CYP2C9"] },
    "aspirin": { "i": ["CYP2C9"] },
    "diclofenac": { "s": ["CYP2C9"] },
    "naproxen": { "s": ["CYP2C9"] },
    "amoxicillin": {},
    "azithromycin": { "i": ["CYP3A4"] },
    "pantoprazole": { "s": ["CYP2C19"] },
    "cetirizine": {},
    "salbutamol": {},
    "prednisolone": { "s": ["CYP3A4"] },
    "dexamethasone": { "ind": ["CYP3A4"], "s": ["CYP3A4"] },
    "metronidazole": { "i": ["CYP2C9"] },
    "losartan": { "s": ["CYP2C9", "CYP3A4"] },
    "amlodipine": { "s": ["CYP3A4"] },
    "enalapril": {},
    "levothyroxine": {},
    "gabapentin": {},
    "pregabalin": {},
    "clonazepam": { "s": ["CYP3A4"] },
    "zolpidem": { "s": ["CYP3A4"] },
    "amitriptyline": { "s": ["CYP2D6", "CYP2C19"] },
    "spironolactone": { "s": ["CYP3A4"] },
    "bisoprolol": {},
    "carvedilol": { "s": ["CYP2D6", "CYP2C9"] },
    "lisinopril": {},
    "ramipril": {},
    "telmisartan": {},
    "valsartan": {},
    "hydrochlorothiazide": {},
    "codeine": { "s": ["CYP2D6", "CYP3A4"] },
    "hydrocodone": { "s": ["CYP2D6", "CYP3A4"] },
    "oxycodone": { "s": ["CYP3A4", "CYP2D6"] },
    "insulin": {}
  };

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  useEffect(() => {
    if (tab === "library" && !libLoaded) {
      // Show fallback immediately — list is never empty
      setLibDrugs(FALLBACK_DRUGS);
      setLibBrands([
        { brand: "Crocin", generic: "paracetamol", class: "Analgesic/Antipyretic" },
        { brand: "Dolo 650", generic: "paracetamol", class: "Analgesic/Antipyretic" },
        { brand: "Calpol", generic: "paracetamol", class: "Analgesic/Antipyretic" },
        { brand: "Combiflam", generic: "ibuprofen", class: "NSAID" },
        { brand: "Brufen", generic: "ibuprofen", class: "NSAID" },
        { brand: "Nurofen", generic: "ibuprofen", class: "NSAID" },
        { brand: "Disprin", generic: "aspirin", class: "Antiplatelet/NSAID" },
        { brand: "Ecosprin", generic: "aspirin", class: "Antiplatelet" },
        { brand: "Augmentin", generic: "amoxicillin-clavulanate", class: "Antibiotic" },
        { brand: "Zithromax", generic: "azithromycin", class: "Antibiotic" },
        { brand: "Azee", generic: "azithromycin", class: "Antibiotic" },
        { brand: "Pan 40", generic: "pantoprazole", class: "Proton Pump Inhibitor" },
        { brand: "Pantocid", generic: "pantoprazole", class: "Proton Pump Inhibitor" },
        { brand: "Zyrtec", generic: "cetirizine", class: "Antihistamine" },
        { brand: "Alerid", generic: "cetirizine", class: "Antihistamine" },
        { brand: "Asthalin", generic: "salbutamol", class: "Bronchodilator" },
        { brand: "Ventolin", generic: "salbutamol", class: "Bronchodilator" },
        { brand: "Glucophage", generic: "metformin", class: "Antidiabetic" },
        { brand: "Glycomet", generic: "metformin", class: "Antidiabetic" },
        { brand: "Lipitor", generic: "atorvastatin", class: "Statin" },
        { brand: "Tonact", generic: "atorvastatin", class: "Statin" },
        { brand: "Prozac", generic: "fluoxetine", class: "SSRI Antidepressant" },
        { brand: "Fludac", generic: "fluoxetine", class: "SSRI Antidepressant" },
        { brand: "Zoloft", generic: "sertraline", class: "SSRI Antidepressant" },
        { brand: "Serta", generic: "sertraline", class: "SSRI Antidepressant" },
        { brand: "Betaloc", generic: "metoprolol", class: "Beta-Blocker" },
        { brand: "Lopressor", generic: "metoprolol", class: "Beta-Blocker" },
        { brand: "Concor", generic: "bisoprolol", class: "Beta-Blocker" },
        { brand: "Cordarone", generic: "amiodarone", class: "Antiarrhythmic" },
        { brand: "Warfin", generic: "warfarin", class: "Anticoagulant" },
        { brand: "Plavix", generic: "clopidogrel", class: "Antiplatelet" },
        { brand: "Xarelto", generic: "rivaroxaban", class: "Anticoagulant" },
        { brand: "Valium", generic: "diazepam", class: "Benzodiazepine" },
        { brand: "Clobazam", generic: "clobazam", class: "Benzodiazepine" },
        { brand: "Neurontin", generic: "gabapentin", class: "Anticonvulsant" },
        { brand: "Lyrica", generic: "pregabalin", class: "Anticonvulsant" },
        { brand: "Ultracet", generic: "tramadol", class: "Opioid Analgesic" },
        { brand: "Nucoxia", generic: "etoricoxib", class: "NSAID" },
        { brand: "Celebrex", generic: "celecoxib", class: "NSAID" },
        { brand: "Voltaren", generic: "diclofenac", class: "NSAID" },
        { brand: "Voveran", generic: "diclofenac", class: "NSAID" },
      ]);
      setLibLoaded(true);
      // Try backend for richer data (brands etc)
      fetch(`${API}/drugs/all`)
        .then(r => r.json())
        .then(data => {
          if (data.generics?.length > 0) setLibDrugs(data.generics);
          if (data.brands?.length > 0) setLibBrands(data.brands.map((b: any) => ({ brand: b.brand, generic: b.generic, class: b.class })));
        })
        .catch(() => { });
    }
  }, [tab, libLoaded, API]);

  async function exportCheckAsPDF(check: CheckEntry) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    setExportingId(check.id);
    try {
      doc.setFontSize(18); doc.setTextColor(46, 125, 138);
      doc.text("MediBook — Medication Safety Report", 14, 22);
      doc.setFontSize(10); doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${check.date}`, 14, 32);
      doc.text(`Overall Risk: ${check.risk}`, 14, 39);
      doc.text(`Medications: ${check.drugs.join(", ")}`, 14, 46);
      doc.text(`Cascade Paths: ${check.cascadePaths}  |  Pairwise: ${check.pairwiseCount}`, 14, 53);
      doc.setDrawColor(46, 125, 138); doc.setLineWidth(0.3); doc.line(14, 58, 196, 58);
      doc.setFontSize(10); doc.setTextColor(50, 50, 50);
      const clean = check.report.replace(/[#*`]/g, "");
      doc.text(doc.splitTextToSize(clean, 180), 14, 66);
      doc.save(`medibook-report-${check.date.replace(/ /g, "-")}.pdf`);
    } finally { setExportingId(null); }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden", margin: "0 auto 12px" }}>
          <img src="/logo.png" alt="MediBook" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ fontSize: 14, color: C.textLight }}>Loading MediBook...</div>
      </div>
    </div>
  );

  const firstName = user?.displayName?.split(" ")[0] || "there";
  const totalChecks = pastChecks.length;
  const criticalChecks = pastChecks.filter(c => c.risk === "CRITICAL" || c.risk === "HIGH").length;
  const safeChecks = pastChecks.filter(c => c.risk === "LOW" || c.risk === "SAFE").length;
  const totalDrugsChecked = pastChecks.reduce((a, c) => a + c.drugs.length, 0);
  const totalCascades = pastChecks.reduce((a, c) => a + c.cascadePaths, 0);
  const lastCheck = pastChecks[0];

  const navItems = [
    { id: "dashboard", label: "My Dashboard", icon: "🏠" },
    { id: "check", label: "Check Medications", icon: "🔬" },
    { id: "past", label: "Past Checks", icon: "📋" },
    { id: "library", label: "Drug Library", icon: "📚" },
    { id: "profile", label: "My Profile", icon: "👤" },
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>

        {/* Nav */}
        <nav style={{ background: "#fff", borderBottom: `1px solid rgba(46,125,138,0.1)`, padding: "0 32px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div onClick={() => setTab("dashboard")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <img src="/logo.png" alt="MediBook" style={{ width: 36, height: 36, borderRadius: 11, objectFit: "cover" }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: C.teal, fontFamily: "'DM Serif Display', serif" }}>MediBook</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, borderRadius: 50, padding: "6px 14px 6px 8px" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.rose}, ${C.roseDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{firstName[0]?.toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{user?.displayName || user?.email}</span>
            </div>
            <button onClick={async () => { await signOut(auth); router.push("/"); }} style={{ padding: "7px 16px", fontSize: 12, background: "transparent", border: `1px solid rgba(46,125,138,0.2)`, borderRadius: 50, color: C.textLight, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Sign out</button>
          </div>
        </nav>

        <div style={{ display: "flex", flex: 1 }}>
          {/* Sidebar */}
          <aside style={{ width: 210, background: "#fff", borderRight: `1px solid rgba(46,125,138,0.08)`, padding: "20px 14px", display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
            {navItems.map(item => (
              <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`}
                onClick={() => item.id === "check" ? router.push("/checker") : setTab(item.id)}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </aside>

          <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>

            {/* ══════════ DASHBOARD ══════════ */}
            {tab === "dashboard" && (
              <div>
                <div className="a1" style={{ marginBottom: 24 }}>
                  <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: C.text, letterSpacing: "-0.02em", marginBottom: 4 }}>Welcome back, {firstName} 👋</h1>
                  <p style={{ fontSize: 14, color: C.textLight }}>Let's check if your medications are working safely together.</p>
                </div>

                {/* CTA */}
                <div className="a2" style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, borderRadius: 18, padding: "24px 32px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#fff", marginBottom: 5 }}>Check your medications now</h2>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>Get a full AI safety report in under 30 seconds.</p>
                  </div>
                  <button className="btn-main" style={{ background: "#fff", color: C.teal }} onClick={() => router.push("/checker")}>🔬 Analyze My Medications</button>
                </div>

                {/* Stats */}
                <div className="a3" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                  {[
                    { label: "Total Checks", value: totalChecks, icon: "📋", color: C.teal },
                    { label: "Alerts Found", value: criticalChecks, icon: "⚠️", color: "#B91C1C" },
                    { label: "Safe Checks", value: safeChecks, icon: "✅", color: "#166534" },
                    { label: "Drugs Analyzed", value: totalDrugsChecked, icon: "💊", color: C.roseDark },
                  ].map(s => (
                    <div key={s.label} className="stat-card">
                      <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 20 }}>
                  {/* Recent checks */}
                  <div className="a3" style={{ background: "#fff", borderRadius: 18, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: `1px solid rgba(46,125,138,0.07)` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: C.text }}>Past Medication Checks</h3>
                      <button onClick={() => setTab("past")} style={{ fontSize: 12, color: C.teal, background: "transparent", border: "none", cursor: "pointer", fontWeight: 500 }}>See all →</button>
                    </div>
                    {pastChecks.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "28px 0", color: C.textLight, fontSize: 13 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                        No checks yet —{" "}
                        <span onClick={() => router.push("/checker")} style={{ color: C.teal, cursor: "pointer", fontWeight: 600 }}>run your first one</span>
                      </div>
                    ) : (
                      <div className="scrollbox" style={{ maxHeight: 260, display: "flex", flexDirection: "column", gap: 8 }}>
                        {pastChecks.slice(0, 5).map(c => (
                          <div key={c.id} onClick={() => setTab("past")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: "rgba(245,240,232,0.4)", border: "1px solid rgba(46,125,138,0.08)", cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#fff")}
                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(245,240,232,0.4)")}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: (RISK_COLOR[c.risk] || RISK_COLOR.MODERATE).bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{RISK_ICON[c.risk] || "⚠️"}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {c.drugs.slice(0, 3).join(", ")}{c.drugs.length > 3 ? ` +${c.drugs.length - 3}` : ""}
                                </div>
                                <div style={{ fontSize: 11, color: C.textLight }}>{c.date}</div>
                              </div>
                            </div>
                            <RiskBadge risk={c.risk} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Safety status card */}
                  <div className="a4">
                    <div className="safety-card" style={{ background: `linear-gradient(135deg, rgba(46,125,138,0.95), rgba(31,95,107,0.9))`, backdropFilter: "blur(10px)", borderRadius: 24, padding: "28px", boxShadow: `0 12px 30px rgba(46,125,138,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)`, height: "100%", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.rose, display: "inline-block", animation: "pulse-dot 1.5s infinite" }} />
                          <span style={{ fontSize: 12, color: "rgba(237,171,171,0.9)", fontWeight: 700, letterSpacing: "0.1em" }}>{criticalChecks > 0 ? "SAFETY ALERT!" : "ALL CLEAR"}</span>
                        </div>
                        <span style={{ fontSize: 24 }}>🧬</span>
                      </div>
                      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#fff", marginBottom: 14, lineHeight: 1.25 }}>
                        {totalChecks === 0 ? "No checks run yet" : criticalChecks > 0 ? `${criticalChecks} check${criticalChecks > 1 ? "s" : ""} found interactions` : "Your last check was safe"}
                      </h2>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.65, marginBottom: 14 }}>
                        {totalChecks === 0 ? "Run your first medication check to see your safety status here." : `${totalCascades} cascade pathway${totalCascades !== 1 ? "s" : ""} detected across ${totalChecks} check${totalChecks !== 1 ? "s" : ""}. ${lastCheck ? `Last: ${lastCheck.date}.` : ""}`}
                      </p>
                      <div style={{ marginTop: "auto" }}>
                        <button onClick={() => router.push("/checker")} style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 700, background: "#fff", color: C.teal, border: "none", borderRadius: 14, cursor: "pointer" }}>
                          {totalChecks === 0 ? "Run First Check →" : "Check Again →"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ PAST CHECKS ══════════ */}
            {tab === "past" && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: C.text, marginBottom: 4 }}>Past Medication Checks</h1>
                  <p style={{ fontSize: 13, color: C.textLight }}>{pastChecks.length} check{pastChecks.length !== 1 ? "s" : ""} · click any card to expand the full report</p>
                </div>

                {pastChecks.length === 0 ? (
                  <div style={{ background: "#fff", borderRadius: 18, padding: "60px", textAlign: "center", border: "1.5px dashed rgba(46,125,138,0.2)" }}>
                    <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>
                    <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: C.text, marginBottom: 8 }}>No checks yet</h3>
                    <p style={{ fontSize: 14, color: C.textLight, marginBottom: 22 }}>Run your first medication safety check — it shows up here automatically.</p>
                    <button className="btn-main" onClick={() => router.push("/checker")}>🔬 Check My Medications</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pastChecks.map((check, idx) => {
                      const isOpen = expandedId === check.id;
                      const rc = RISK_COLOR[check.risk] || RISK_COLOR.MODERATE;
                      return (
                        <div key={check.id} className="check-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                          {/* Header */}
                          <div className="check-card-header" onClick={() => setExpandedId(isOpen ? null : check.id)}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                              {RISK_ICON[check.risk] || "⚠️"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {check.drugs.join(" · ")}
                              </div>
                              <div style={{ fontSize: 11, color: C.textLight }}>
                                {check.date} · {check.drugs.length} medications · {check.cascadePaths} cascade{check.cascadePaths !== 1 ? "s" : ""} · {check.pairwiseCount} pairwise
                              </div>
                            </div>
                            <RiskBadge risk={check.risk} />
                            <span style={{ fontSize: 12, color: C.textLight, marginLeft: 8, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", flexShrink: 0 }}>▼</span>
                          </div>

                          {/* Expanded body */}
                          {isOpen && (
                            <div className="check-card-body">
                              {/* Drug pills */}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                                {check.drugs.map(d => (
                                  <span key={d} style={{ fontSize: 12, background: "rgba(46,125,138,0.08)", color: C.teal, padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>💊 {d}</span>
                                ))}
                              </div>

                              {/* Stats row */}
                              <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                                {[
                                  { label: "Cascade paths", value: check.cascadePaths },
                                  { label: "Pairwise interactions", value: check.pairwiseCount },
                                ].map(s => (
                                  <div key={s.label} style={{ background: "rgba(46,125,138,0.06)", borderRadius: 10, padding: "8px 14px" }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: C.teal, fontFamily: "'DM Serif Display', serif" }}>{s.value}</span>
                                    <span style={{ fontSize: 11, color: C.textLight, marginLeft: 6 }}>{s.label}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Report */}
                              <div style={{ background: C.cream, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.08em", marginBottom: 10 }}>FULL REPORT</div>
                                {check.report ? (
                                  <div className="report-body scrollbox" style={{ maxHeight: 340, overflowY: "auto" }}>
                                    {check.report.split("\n").map((line, i) => {
                                      if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
                                      if (line.startsWith("### ")) return <h3 key={i}>{line.slice(4)}</h3>;
                                      if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i}>• {line.slice(2)}</p>;
                                      if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: "1px solid rgba(46,125,138,0.15)", margin: "8px 0" }} />;
                                      if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
                                      return <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>;
                                    })}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 13, color: C.textLight }}>No report saved for this check.</div>
                                )}
                              </div>

                              {/* Actions */}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button className="btn-ghost" onClick={() => exportCheckAsPDF(check)} disabled={exportingId === check.id}>
                                  {exportingId === check.id ? "Exporting..." : "📄 Export PDF"}
                                </button>
                                <button className="btn-ghost" onClick={() => router.push("/checker")} style={{ color: C.teal, borderColor: "rgba(46,125,138,0.3)" }}>
                                  🔬 Run Similar Check
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ DRUG LIBRARY ══════════ */}
            {tab === "library" && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: C.text, marginBottom: 4 }}>Drug Library</h1>
                  <p style={{ fontSize: 13, color: C.textLight }}>Browse every drug in our database — click any name to see its interactions and enzyme data.</p>
                </div>

                {/* Search bar */}
                <div style={{ position: "relative", marginBottom: 24 }}>
                  <input
                    value={libSearch}
                    onChange={e => { setLibSearch(e.target.value); setLibSelected(null); setLibInfo(null); }}
                    placeholder="Search by drug name or brand name..."
                    style={{ width: "100%", padding: "12px 44px 12px 16px", fontSize: 14, border: `1.5px solid rgba(46,125,138,0.25)`, borderRadius: 12, outline: "none", fontFamily: "'DM Sans', sans-serif", background: "#fff", color: C.text, boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = C.teal)}
                    onBlur={e => (e.target.style.borderColor = "rgba(46,125,138,0.25)")}
                  />
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, pointerEvents: "none" }}>🔍</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: libSelected ? "1fr 1.2fr" : "1fr", gap: 20 }}>

                  {/* Drug list */}
                  <div style={{ background: "#fff", borderRadius: 18, border: `1px solid rgba(46,125,138,0.08)`, overflow: "hidden" }}>
                    {!libLoaded ? (
                      <div style={{ padding: 40, textAlign: "center", color: C.textLight, fontSize: 13 }}>
                        <div style={{ width: 32, height: 32, border: `3px solid rgba(46,125,138,0.15)`, borderTopColor: C.teal, borderRadius: "50%", animation: "fadeUp 0.8s linear infinite", margin: "0 auto 12px" }} />
                        Loading drug database...
                      </div>
                    ) : (() => {
                      const q = libSearch.toLowerCase().trim();
                      const filteredGenerics = libDrugs.filter(d => !q || d.toLowerCase().includes(q));
                      const filteredBrands = libBrands.filter(b => !q || b.brand.toLowerCase().includes(q) || b.generic.toLowerCase().includes(q));
                      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

                      if (q && filteredGenerics.length === 0 && filteredBrands.length === 0) {
                        return (
                          <div style={{ padding: 40, textAlign: "center", color: C.textLight, fontSize: 13 }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                            No drugs found for "{libSearch}"
                          </div>
                        );
                      }

                      if (q) {
                        // Search results — flat list
                        return (
                          <div className="scrollbox" style={{ maxHeight: 520, overflowY: "auto" }}>
                            {filteredGenerics.length > 0 && (
                              <>
                                <div style={{ padding: "10px 16px 4px", fontSize: 10, fontWeight: 700, color: C.textLight, letterSpacing: "0.08em", background: C.cream }}>GENERIC NAMES ({filteredGenerics.length})</div>
                                {filteredGenerics.map(d => (
                                  <button key={d} onClick={() => {
                                    setLibSelected(d);
                                    setLibInfoLoading(false);
                                    const cyp = CYP_DATA[d.toLowerCase()];
                                    setLibInfo({
                                      drug: d,
                                      library: {
                                        enzymes: cyp ? {
                                          inhibits: cyp.i || [],
                                          induces: cyp.ind || [],
                                          substrate_of: cyp.s || [],
                                        } : null,
                                        known_interactions: [],
                                      }
                                    });
                                  }} style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, background: libSelected === d ? "rgba(46,125,138,0.08)" : "transparent", border: "none", borderBottom: "1px solid rgba(46,125,138,0.06)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: libSelected === d ? C.teal : C.text, fontWeight: libSelected === d ? 600 : 400, display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 14 }}>💊</span> {d.charAt(0).toUpperCase() + d.slice(1)}
                                  </button>
                                ))}
                              </>
                            )}
                            {filteredBrands.length > 0 && (
                              <>
                                <div style={{ padding: "10px 16px 4px", fontSize: 10, fontWeight: 700, color: C.textLight, letterSpacing: "0.08em", background: C.cream }}>BRAND NAMES ({filteredBrands.length})</div>
                                {filteredBrands.map(b => (
                                  <button key={b.brand} onClick={() => {
                                    setLibSelected(b.brand);
                                    setLibInfoLoading(false);
                                    const cyp = CYP_DATA[b.generic.toLowerCase()];
                                    setLibInfo({
                                      drug: b.generic,
                                      brandName: b.brand,
                                      genericName: b.generic,
                                      drugClass: b.class,
                                      library: {
                                        enzymes: cyp ? {
                                          inhibits: cyp.i || [],
                                          induces: cyp.ind || [],
                                          substrate_of: cyp.s || [],
                                        } : null,
                                        known_interactions: [],
                                      }
                                    });
                                  }} style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, background: libSelected === b.brand ? "rgba(46,125,138,0.08)" : "transparent", border: "none", borderBottom: "1px solid rgba(46,125,138,0.06)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: libSelected === b.brand ? C.teal : C.text, fontWeight: libSelected === b.brand ? 600 : 400, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span>🏷️</span> {b.brand}</span>
                                    <span style={{ fontSize: 11, color: C.textLight, background: "rgba(46,125,138,0.07)", borderRadius: 10, padding: "2px 8px" }}>{b.generic}</span>
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        );
                      }

                      // Alphabetical browse — grouped by letter
                      return (
                        <div className="scrollbox" style={{ maxHeight: 520, overflowY: "auto" }}>
                          {letters.map(letter => {
                            const items = filteredGenerics.filter(d => d.toUpperCase().startsWith(letter));
                            if (items.length === 0) return null;
                            return (
                              <div key={letter}>
                                <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.1em", background: "rgba(46,125,138,0.04)", borderBottom: "1px solid rgba(46,125,138,0.06)" }}>{letter}</div>
                                {items.map(d => (
                                  <button key={d} onClick={() => {
                                    setLibSelected(d);
                                    setLibInfoLoading(false);
                                    const cyp = CYP_DATA[d.toLowerCase()];
                                    setLibInfo({
                                      drug: d,
                                      library: {
                                        enzymes: cyp ? {
                                          inhibits: cyp.i || [],
                                          induces: cyp.ind || [],
                                          substrate_of: cyp.s || [],
                                        } : null,
                                        known_interactions: [],
                                      }
                                    });
                                  }} style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, background: libSelected === d ? "rgba(46,125,138,0.08)" : "transparent", border: "none", borderBottom: "1px solid rgba(46,125,138,0.04)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: libSelected === d ? C.teal : C.text, fontWeight: libSelected === d ? 600 : 400, display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 14 }}>💊</span> {d.charAt(0).toUpperCase() + d.slice(1)}
                                  </button>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Drug info panel */}
                  {libSelected && (
                    <div style={{ background: "#fff", borderRadius: 18, border: `1px solid rgba(46,125,138,0.1)`, padding: 24, animation: "fadeUp 0.3s both" }}>
                      {libInfoLoading ? (
                        <div style={{ textAlign: "center", padding: "40px 0", color: C.textLight, fontSize: 13 }}>
                          <div style={{ width: 32, height: 32, border: `3px solid rgba(46,125,138,0.15)`, borderTopColor: C.teal, borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
                          Loading drug info...
                        </div>
                      ) : libInfo?.error ? (
                        <div style={{ textAlign: "center", padding: "40px 0", color: C.textLight, fontSize: 13 }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                          Could not load info for this drug.
                        </div>
                      ) : libInfo && (
                        <div>
                          {/* Header */}
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: C.text, textTransform: "capitalize" }}>
                                {libInfo.brandName || libSelected}
                              </h2>
                              <button onClick={() => { setLibSelected(null); setLibInfo(null); }} style={{ padding: "4px 10px", fontSize: 11, background: "transparent", border: `1px solid rgba(46,125,138,0.2)`, borderRadius: 20, cursor: "pointer", color: C.textLight, flexShrink: 0 }}>✕ Close</button>
                            </div>
                            {libInfo.brandName && (
                              <div style={{ fontSize: 13, color: C.textLight, marginBottom: 4 }}>Generic: <strong style={{ color: C.teal }}>{libInfo.genericName || libInfo.drug}</strong></div>
                            )}
                            {libInfo.drugClass && (
                              <span style={{ fontSize: 11, background: "rgba(46,125,138,0.08)", color: C.teal, borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>{libInfo.drugClass}</span>
                            )}
                          </div>

                          {/* CYP Enzyme data */}
                          {libInfo.library?.enzymes && (
                            <div style={{ background: C.cream, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.08em", marginBottom: 12 }}>CYP450 ENZYME PROFILE</div>
                              {(libInfo.library.enzymes.inhibits?.length > 0) && (
                                <div style={{ marginBottom: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#B91C1C" }}>INHIBITS: </span>
                                  {libInfo.library.enzymes.inhibits.map((e: any) => (
                                    <span key={e[0] || e} style={{ fontSize: 11, background: "#FEE2E2", color: "#B91C1C", borderRadius: 6, padding: "2px 8px", marginRight: 4 }}>
                                      {Array.isArray(e) ? `${e[0]} (Grade ${e[1]})` : e}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {(libInfo.library.enzymes.induces?.length > 0) && (
                                <div style={{ marginBottom: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#92400E" }}>INDUCES: </span>
                                  {libInfo.library.enzymes.induces.map((e: any) => (
                                    <span key={e[0] || e} style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", borderRadius: 6, padding: "2px 8px", marginRight: 4 }}>
                                      {Array.isArray(e) ? `${e[0]} (Grade ${e[1]})` : e}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {(libInfo.library.enzymes.substrate_of?.length > 0) && (
                                <div>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#166534" }}>SUBSTRATE OF: </span>
                                  {libInfo.library.enzymes.substrate_of.map((e: string) => (
                                    <span key={e} style={{ fontSize: 11, background: "#DCFCE7", color: "#166534", borderRadius: 6, padding: "2px 8px", marginRight: 4 }}>{e}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Known interactions */}
                          {libInfo.library?.known_interactions?.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.08em", marginBottom: 10 }}>KNOWN INTERACTIONS</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {libInfo.library.known_interactions.map((ix: any, idx: number) => {
                                  const sc = { MAJOR: { bg: "#FEE2E2", color: "#B91C1C" }, MODERATE: { bg: "#FEF9C3", color: "#854D0E" }, MINOR: { bg: "#DCFCE7", color: "#166534" } } as any;
                                  const c = sc[ix.severity] || sc.MODERATE;
                                  return (
                                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: C.cream, borderRadius: 10, border: "1px solid rgba(46,125,138,0.08)" }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.color, flexShrink: 0, marginTop: 1 }}>{ix.severity}</span>
                                      <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>{ix.drug}</div>
                                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{ix.effect}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {!libInfo.library?.enzymes && !libInfo.library?.known_interactions?.length && (
                            <div style={{ textAlign: "center", padding: "20px 0", color: C.textLight, fontSize: 13 }}>
                              No detailed enzyme or interaction data available for this drug.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ PROFILE ══════════ */}
            {tab === "profile" && (
              <div>
                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: C.text, marginBottom: 24, letterSpacing: "-0.02em" }}>My Profile</h1>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 780 }}>

                  {/* Profile header */}
                  <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                      <div style={{ width: 66, height: 66, borderRadius: "50%", background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: C.text, marginBottom: 3 }}>{user?.displayName || "Anonymous User"}</div>
                        <div style={{ fontSize: 13, color: C.textLight, marginBottom: 8 }}>{user?.email}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 11, background: "rgba(46,125,138,0.1)", color: C.teal, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>MediBook Member</span>
                          <span style={{ fontSize: 11, background: "#DCFCE7", color: "#166534", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>✓ Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activity stats */}
                  {[
                    { icon: "📋", label: "Total Checks Run", value: totalChecks, sub: "medication analyses" },
                    { icon: "⚠️", label: "Interactions Found", value: criticalChecks, sub: "checks with alerts" },
                    { icon: "✅", label: "Safe Checks", value: safeChecks, sub: "no interactions found" },
                    { icon: "🧬", label: "Cascade Pathways", value: totalCascades, sub: "hidden interactions caught" },
                    { icon: "💊", label: "Drugs Analyzed", value: totalDrugsChecked, sub: "across all checks" },
                    { icon: "📅", label: "Last Check", value: lastCheck?.date ?? "—", sub: lastCheck ? `${lastCheck.risk} risk` : "no checks yet", isText: true },
                  ].map(s => (
                    <div key={s.label} className="stat-card">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "0.05em" }}>{s.label.toUpperCase()}</span>
                      </div>
                      <div style={{ fontFamily: s.isText ? "'DM Sans', sans-serif" : "'DM Serif Display', serif", fontSize: s.isText ? 15 : 26, fontWeight: 700, color: C.teal, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: C.textLight }}>{s.sub}</div>
                    </div>
                  ))}

                  {/* Account details */}
                  <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.08em", marginBottom: 16 }}>ACCOUNT DETAILS</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      {[
                        { label: "Email", value: user?.email },
                        { label: "Account Type", value: "Standard Patient Account" },
                        { label: "User ID", value: `${user?.uid?.slice(0, 16)}...`, mono: true },
                        { label: "Member Since", value: user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "—" },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{ fontSize: 11, color: C.textLight, marginBottom: 3 }}>{f.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, fontFamily: f.mono ? "monospace" : "inherit" }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="stat-card" style={{ gridColumn: "1 / -1", border: "1px solid rgba(220,38,38,0.15)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#B91C1C", letterSpacing: "0.08em", marginBottom: 14 }}>ACCOUNT ACTIONS</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={async () => { await signOut(auth); router.push("/"); }}
                        style={{ padding: "9px 20px", background: "transparent", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 50, fontSize: 13, color: "#B91C1C", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        Sign Out
                      </button>
                      <button onClick={() => {
                        if (confirm("Clear all check history from this device? This cannot be undone.")) {
                          localStorage.removeItem(`medibook_checks_${user.uid}`);
                          setPastChecks([]);
                        }
                      }} style={{ padding: "9px 20px", background: "transparent", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 50, fontSize: 13, color: "#B91C1C", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        Clear Check History
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </>
  );
}
