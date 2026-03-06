
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";
import * as XLSX from "xlsx";
import {
  Filter,
  TrendingUp,
  BarChart3,
  Users,
  UploadCloud,
  Coins,
  LogOut,
  Info,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

/* --------------- Helpers --------------- */
const stripNumber = (v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return v;
  const cleaned = v.replace(/[₹, ]+/g, "");
  if (cleaned === "") return "";
  return isNaN(Number(cleaned)) ? v : Number(cleaned);
};

const isNumeric = (v) => {
  if (typeof v === "number") return isFinite(v);
  if (v === null || v === undefined) return false;
  const cleaned = String(v).replace(/[₹, ]+/g, "");
  return cleaned !== "" && !isNaN(Number(cleaned));
};

const analyzeData = (data) => {
  if (!data || data.length === 0)
    return {
      availableColumns: [],
      metricColumns: [],
      dimensionColumns: [],
      defaultChartConfig: { type: "Bar", columnX: "", columnY: "" },
    };
  const cols = Object.keys(data[0]);
  const metricColumns = [];
  const dimensionColumns = [];
  cols.forEach((c) => {
    const sample = data.find((r) => r[c] !== undefined && r[c] !== null)?.[c];
    if (isNumeric(sample)) metricColumns.push(c);
    else dimensionColumns.push(c);
  });
  return {
    availableColumns: cols,
    metricColumns,
    dimensionColumns,
    defaultChartConfig: {
      type: "Bar",
      columnX: dimensionColumns[0] || "",
      columnY: metricColumns[0] || "",
    },
  };
};

const COLORS = [
  "#ec4899",
  "#f472b6",
  "#f9a8d4",
  "#fb7185",
  "#e879f9",
  "#a855f7",
  "#60a5fa",
];

/* --------------- Small UI atoms --------------- */
const Button = ({ onClick, children, className = "", ...rest }) => (
  <button
    onClick={onClick}
    {...rest}
    className={
      "px-4 py-2 rounded-lg font-semibold shadow-md transition " +
      "bg-pink-600 hover:bg-pink-700 text-white " +
      className
    }
  >
    {children}
  </button>
);

const KPICard = ({ title, value, icon }) => (
  <div className="bg-[#0b0b0d] p-4 rounded-xl border border-pink-700/20 shadow-sm flex items-center gap-4">
    <div className="p-3 rounded-full bg-pink-700/20 text-pink-300">{icon}</div>
    <div>
      <p className="text-sm text-gray-300"><strong>{title}</strong></p>
      <p className="text-2xl font-bold text-pink-300">{value}</p>
    </div>
  </div>
);

const Modal = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] rounded-2xl border border-pink-700/30 p-6 max-w-2xl w-full relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-pink-400 hover:text-white text-2xl"
        >
          &times;
        </button>
        <h3 className="text-2xl font-bold mb-3 text-pink-300"><strong>{title}</strong></h3>
        <div className="text-gray-300 text-sm">{children}</div>
      </div>
    </div>
  );
};
/* --------------- Section Divider (glowing pink line) --------------- */
const SectionDivider = ({ title }) => (
  <div className="relative my-12 flex items-center justify-center">
    {/* Glowing gradient line */}
    <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent blur-[1px]" />
    <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-pink-400/40 to-transparent" />
    
    {/* Floating title badge */}
    {title && (
      <span className="relative z-10 px-5 py-1 bg-[#060607] border border-pink-700/50 rounded-full text-pink-300 font-extrabold text-lg tracking-wider shadow-[0_0_10px_rgba(236,72,153,0.3)]">
        {title}
      </span>
    )}
  </div>
);

/* --------------- Upload (right side) --------------- */
const UploadSection = ({ onUploadSuccess }) => {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    setStatus("Processing...");
    try {
      if (name.endsWith(".csv")) {
        const text = await file.text();
        // simple CSV parse (split by lines, by commas) — good enough for typical simple exports
        const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
        if (lines.length < 2) throw new Error("CSV has no rows");
        const header = lines[0].split(",").map((h) => h.trim());
        const parsed = lines.slice(1).map((ln) => {
          const vals = ln.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const obj = {};
          header.forEach((h, i) => {
            obj[h] = vals[i] ?? "";
          });
          return obj;
        });
        onUploadSuccess(parsed, file.name);
        setStatus(`Uploaded ${file.name}`);
      } else {
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const parsed = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
        onUploadSuccess(parsed, file.name);
        setStatus(`Uploaded ${file.name}`);
      }
    } catch (err) {
      console.error(err);
      setStatus("Upload failed");
    }
  };

  return (
    <div className="bg-[#0b0b0d] p-4 rounded-2xl border border-pink-700/20 shadow-sm">
      <h4 className="text-pink-300 font-semibold mb-3"><strong>☁️ Upload Data</strong></h4>
      <div
        onClick={() => inputRef.current && inputRef.current.click()}
        className="cursor-pointer border-2 border-dashed border-pink-700/30 p-4 rounded-lg text-center hover:bg-pink-900/5 transition"
      >
        <UploadCloud className="w-8 h-8 text-pink-400 mx-auto" />
        <p className="text-gray-300 text-sm mt-2">Click to upload CSV / XLSX</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {status && <p className="text-pink-300 text-sm mt-2">{status}</p>}
    </div>
  );
};

/* --------------- Chart Renderer --------------- */
const ChartRenderer = ({ dataSet, chartConfig }) => {
  const chartObj = useMemo(() => {
    if (!dataSet || !chartConfig) return null;
    const { columnX, columnY, type } = chartConfig || {};
    if (!columnX || !columnY) return null;
    const agg = dataSet.reduce((acc, r) => {
      const key = r[columnX] ?? "—";
      const raw = r[columnY];
      const val = isNumeric(raw) ? Number(String(raw).replace(/[₹, ]/g, "")) : 0;
      acc[key] = (acc[key] || 0) + val;
      return acc;
    }, {});
    const labels = Object.keys(agg);
    const values = Object.values(agg);
    const dataset = {
      labels,
      datasets: [
        {
          label: columnY,
          data: values,
          backgroundColor: COLORS.slice(0, labels.length),
          borderColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
        },
      ],
    };
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#f9a8d4" } },
        title: { display: true, text: `${columnY} by ${columnX}`, color: "#fff" },
      },
      scales: {
        x: { ticks: { color: "#ddd" }, grid: { color: "rgba(255,255,255,0.03)" } },
        y: { ticks: { color: "#ddd" }, grid: { color: "rgba(255,255,255,0.03)" } },
      },
    };
    const Comp = type === "Pie" ? Pie : type === "Line" ? Line : Bar;
    return { Comp, dataset, options };
  }, [dataSet, chartConfig]);

  if (!chartObj) return <div className="text-gray-400 p-6">No chart configured</div>;
  const { Comp, dataset, options } = chartObj;
  return (
    <div style={{ height: 380 }}>
      <Comp data={dataset} options={options} />
    </div>
  );
};

/* --------------- App --------------- */
export default function App() {
  // view: landing | auth | dashboard
  const [view, setView] = useState("landing");
  const [authMode, setAuthMode] = useState("signIn"); // signIn or signUp
  const [user, setUser] = useState(null);

  // data + analysis
  const [dataSet, setDataSet] = useState(null);
  const [analysis, setAnalysis] = useState({
    availableColumns: [],
    metricColumns: [],
    dimensionColumns: [],
    defaultChartConfig: { type: "Bar", columnX: "", columnY: "" },
  });

  // selected view state
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [chartConfig, setChartConfig] = useState({ type: "Bar", columnX: "", columnY: "" });

  // modals
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isKpiOpen, setIsKpiOpen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isLearnOpen, setIsLearnOpen] = useState(false);

  // edit/delete modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRowIndex, setEditRowIndex] = useState(null);
  const [editRowData, setEditRowData] = useState({});

  // auth form
  const [authForm, setAuthForm] = useState({
    companyId: "",
    companyPassword: "",
    employeeId: "",
    name: "",
    role: "employee",
  });
  const [authError, setAuthError] = useState("");

  // message area
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // initialize user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sy_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
        setView("dashboard");
      } catch {}
    }
  }, []);

  // handle upload (normalize numbers)
  const handleUploadSuccess = (parsed, filename) => {
    // normalize numeric like "₹1,200,000" to Number
    const normalized = parsed.map((r) => {
      const copy = { ...r };
      Object.keys(copy).forEach((k) => {
        if (typeof copy[k] === "string") {
          const maybeNum = copy[k].replace(/[₹, ]+/g, "");
          if (maybeNum !== "" && !isNaN(Number(maybeNum))) {
            copy[k] = Number(maybeNum);
          }
        }
      });
      return copy;
    });
    // Add unique _rowId for edit/delete references
    const withIds = normalized.map((r, i) => ({ ...r, _rowId: Date.now() + "_" + i }));
    setDataSet(withIds);
    const a = analyzeData(withIds);
    setAnalysis(a);
    // default selected columns = all available
    setSelectedColumns(a.availableColumns.slice());
    // reset metrics selection
    setSelectedMetrics([]);
    // default chart config
    setChartConfig(a.defaultChartConfig);
    setMessage(`Loaded ${withIds.length} rows from ${filename}`);
  };

  // filtered table
  const filteredData = useMemo(() => {
    if (!dataSet || !selectedColumns || selectedColumns.length === 0) return [];
    return dataSet.map((r) => {
      const out = {};
      selectedColumns.forEach((c) => {
        out[c] = r[c];
      });
      // keep internal id & full row reference
      out._rowId = r._rowId;
      return out;
    });
  }, [dataSet, selectedColumns]);

  // KPI calculations
  const calculatedKPIs = useMemo(() => {
    if (!dataSet || selectedMetrics.length === 0) return [];
    return selectedMetrics.map((m) => {
      const total = dataSet.reduce((s, r) => {
        const v = r[m];
        return s + (isNumeric(v) ? Number(String(v).replace(/[₹, ]/g, "")) : 0);
      }, 0);
      return { key: m, name: `Sum of ${m}`, value: total };
    });
  }, [dataSet, selectedMetrics]);

  // performance badges (top contributors)
  const performanceRanks = useMemo(() => {
    if (!dataSet) return [];
    const agg = dataSet.reduce((acc, r) => {
      const who = r.Assigned_Employee || r.Assigned || r.AssignedEmployee || r.Employee || "Unknown";
      const val = isNumeric(r.Deal_Value) ? Number(String(r.Deal_Value).replace(/[₹, ]/g, "")) : 0;
      acc[who] = (acc[who] || 0) + val;
      return acc;
    }, {});
    const arr = Object.entries(agg).map(([name, total]) => ({ name, total }));
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [dataSet]);

  /* ---------- Auth handlers (frontend-only simulation) ---------- */
  const handleAuthChange = (e) => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
    setAuthError("");
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    // simple validation
    if (!authForm.companyId || !authForm.companyPassword || !authForm.employeeId || !authForm.name) {
      setAuthError("Please fill all fields.");
      return;
    }
    // Simulate storing user and token
    const simulatedUser = {
      name: authForm.name,
      role: authForm.role,
      companyId: authForm.companyId,
      employeeId: authForm.employeeId,
      // simple token for demo
      token: `demo-token-${Date.now()}`,
    };
    localStorage.setItem("sy_user", JSON.stringify(simulatedUser));
    setUser(simulatedUser);
    setView("dashboard");
    setAuthForm({ companyId: "", companyPassword: "", employeeId: "", name: "", role: "employee" });
    setAuthError("");
  };

  const clearAuthAndRedirect = () => {
    localStorage.removeItem("sy_user");
    setUser(null);
    setView("landing");
  };

  const setViewToDashboard = () => {
    setView("dashboard");
  };

  const handleLogout = () => {
    clearAuthAndRedirect();
    // clear dataset optionally
    // setDataSet(null);
    setMessage("Logged out.");
  };

  /* ---------- small helpers for modals ---------- */
  // Filter modal local state
  const FilterModal = ({ open, onClose }) => {
    const [temp, setTemp] = useState(selectedColumns.slice());
    useEffect(() => {
      if (open) setTemp(selectedColumns.slice());
    }, [open, selectedColumns]);
    const toggle = (c) => setTemp((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
    const apply = () => {
      setSelectedColumns(temp.slice());
      onClose();
    };
    return (
      <Modal title="Select Columns to Display" isOpen={open} onClose={onClose}>
        {analysis.availableColumns.length === 0 ? <div className="text-gray-400">No data loaded.</div> : (
          <>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-auto mb-3">
              {analysis.availableColumns.map((c) => (
                <button key={c} onClick={() => toggle(c)} className={`p-2 rounded text-left ${temp.includes(c) ? 'bg-pink-600 text-black' : 'bg-[#0b0b0d] text-gray-300'}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex justify-end"><Button onClick={apply}>Apply ({temp.length})</Button></div>
          </>
        )}
      </Modal>
    );
  };

  // KPI modal local state
  const KpiModal = ({ open, onClose }) => {
    const [temp, setTemp] = useState(selectedMetrics.slice());
    useEffect(() => { if (open) setTemp(selectedMetrics.slice()); }, [open, selectedMetrics]);
    const toggle = (m) => setTemp((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));
    const apply = () => { setSelectedMetrics(temp.slice()); onClose(); };
    return (
      <Modal title="Select Metrics for KPI (Sum)" isOpen={open} onClose={onClose}>
        {analysis.metricColumns.length === 0 ? <div className="text-gray-400">No numeric columns available.</div> : (
          <>
            <div className="space-y-2 max-h-60 overflow-auto mb-3">
              {analysis.metricColumns.map((m) => (
                <div key={m} onClick={() => toggle(m)} className={`p-3 rounded cursor-pointer ${temp.includes(m) ? 'bg-pink-600 text-black' : 'bg-[#0b0b0d] text-gray-300'}`}>
                  Sum of {m}
                </div>
              ))}
            </div>
            <div className="flex justify-end"><Button onClick={apply}>Apply KPIs ({temp.length})</Button></div>
          </>
        )}
      </Modal>
    );
  };

  // Chart modal local state
  const ChartModal = ({ open, onClose }) => {
    const initial = chartConfig && chartConfig.columnX ? chartConfig : analysis.defaultChartConfig || { type: "Bar", columnX: "", columnY: "" };
    const [temp, setTemp] = useState(initial);
    useEffect(() => { if (open) setTemp(chartConfig && chartConfig.columnX ? chartConfig : analysis.defaultChartConfig || { type: "Bar", columnX: "", columnY: "" }); }, [open, chartConfig, analysis]);
    const apply = () => { setChartConfig({ ...temp }); onClose(); };
    return (
      <Modal title="Configure Chart" isOpen={open} onClose={onClose}>
        <div className="space-y-3">
          <label className="block text-sm text-gray-300">Chart Type</label>
          <select value={temp.type} onChange={(e) => setTemp({ ...temp, type: e.target.value })} className="w-full p-2 rounded bg-[#0b0b0d] text-white">
            <option>Bar</option>
            <option>Line</option>
            <option>Pie</option>
          </select>

          <label className="block text-sm text-gray-300">X-Axis (Dimension)</label>
          <select value={temp.columnX} onChange={(e) => setTemp({ ...temp, columnX: e.target.value })} className="w-full p-2 rounded bg-[#0b0b0d] text-white">
            <option value="">-- select --</option>
            {analysis.dimensionColumns.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <label className="block text-sm text-gray-300">Y-Axis (Metric - Sum)</label>
          <select value={temp.columnY} onChange={(e) => setTemp({ ...temp, columnY: e.target.value })} className="w-full p-2 rounded bg-[#0b0b0d] text-white">
            <option value="">-- select --</option>
            {analysis.metricColumns.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <div className="flex justify-end"><Button onClick={apply} className="w-full">Generate Chart</Button></div>
        </div>
      </Modal>
    );
  };

  /* ---------- Edit/Delete logic (frontend-only) ---------- */
  const openEditModal = (rowId) => {
    if (!dataSet) return;
    const idx = dataSet.findIndex((r) => r._rowId === rowId);
    if (idx === -1) return;
    setEditRowIndex(idx);
    setEditRowData({ ...dataSet[idx] }); // copy
    setIsEditOpen(true);
  };

  const handleEditChange = (key, value) => {
    setEditRowData((p) => ({ ...p, [key]: value }));
  };

  const saveEdit = () => {
    if (editRowIndex === null) return;
    const copy = [...dataSet];
    // keep _rowId unchanged
    copy[editRowIndex] = { ...editRowData, _rowId: copy[editRowIndex]._rowId };
    setDataSet(copy);
    // re-run analysis & keep selections sensible
    const a = analyzeData(copy);
    setAnalysis(a);
    setSelectedColumns((prev) => prev.filter((c) => a.availableColumns.includes(c)));
    setIsEditOpen(false);
    setEditRowIndex(null);
    setEditRowData({});
    setMessage("Row updated");
  };

  const confirmDelete = (rowId) => {
    if (!confirm("Delete this row? This action cannot be undone.")) return;
    const newData = (dataSet || []).filter((r) => r._rowId !== rowId);
    setDataSet(newData.length ? newData : null);
    if (newData && newData.length) {
      const a = analyzeData(newData);
      setAnalysis(a);
      setSelectedColumns((prev) => prev.filter((c) => a.availableColumns.includes(c)));
    } else {
      setAnalysis({ availableColumns: [], metricColumns: [], dimensionColumns: [], defaultChartConfig: { type: "Bar", columnX: "", columnY: "" } });
      setSelectedColumns([]);
      setChartConfig({ type: "Bar", columnX: "", columnY: "" });
    }
    setMessage("Row deleted");
  };

  // utility to add a new blank row quickly (example of update/create)
  const addBlankRow = () => {
    const columns = analysis.availableColumns.length ? analysis.availableColumns : ["Col1", "Col2"];
    const newRow = columns.reduce((acc, c) => ({ ...acc, [c]: "" }), {});
    newRow._rowId = Date.now() + "_new";
    const next = dataSet ? [newRow, ...dataSet] : [newRow];
    setDataSet(next);
    const a = analyzeData(next);
    setAnalysis(a);
    setSelectedColumns(a.availableColumns.slice());
    setMessage("Blank row added (edit to fill values)");
  };

  /* ---------- Views ---------- */

  // LANDING (front)
  if (view === "landing") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white relative" style={{ backgroundImage: 'url("/bg-tech.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 max-w-3xl text-center p-8 rounded-xl">
          <div className="text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-fuchsia-400 mb-4">SyMathiX</div>
          <p className="text-gray-300 text-lg mb-6">Smart B2B Sales Intelligence — predict deals, measure performance, and visualize pipelines for IT service companies.</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => { setAuthMode("signIn"); setView("auth"); }}>Login</Button>
            <Button onClick={() => { setAuthMode("signUp"); setView("auth"); }}>Sign Up</Button>
            <button onClick={() => setIsLearnOpen(true)} className="px-4 py-2 rounded-lg border border-pink-500 text-pink-300 hover:bg-pink-700/10 transition">Learn more</button>
          </div>
          <div className="mt-8 text-gray-400 text-sm">© 2025 SyMathiX — Built by Shanmathi💖 </div>
        </div>

        <Modal title="About SyMathiX" isOpen={isLearnOpen} onClose={() => setIsLearnOpen(false)}>
          <p className="mb-3">
            <strong>SyMathiX</strong> is a focused sales intelligence platform for IT service businesses — tracking project proposals, forecasting revenue, and giving AI-like insights via heuristics/rules.
          </p>
          <p className="mb-3">
            Use-cases: project-oriented sales teams at software consultancies, systems integrators and managed-services companies. Similar enterprise products (but general-purpose) include Salesforce, HubSpot and Zoho; SyMathiX targets project & proposal pipelines instead of retail SKUs.
          </p>
          <p>
            Features: Excel uploads, role-based views, KPI cards, pipeline charting, auto insights and performance badges.
          </p>
        </Modal>
      </div>
    );
  }

  // AUTH (Login / Signup)
  if (view === "auth") {
    return (
      <div className="min-h-screen bg-[#07070a] text-white flex flex-col">
        <header className="p-6 border-b border-pink-700/20 flex justify-between items-center">
          <div>
            <div className="text-xl font-bold text-pink-300">SyMathiX</div>
            <div className="text-sm text-gray-400">Smart B2B Sales Intelligence</div>
          </div>
          <div>
            <button onClick={() => setView("landing")} className="text-sm text-pink-300 hover:underline">← Back</button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-[#0b0b0d] p-6 rounded-2xl border border-pink-700/20 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-pink-300">{authMode === "signIn" ? "Login" : "Sign Up"}</h2>
              <div className="text-sm text-gray-300">{authMode === "signIn" ? "Need account? Sign Up" : "Have account? Login"}</div>
            </div>

            {authError && <div className="p-2 bg-red-800 rounded mb-3 text-sm">{authError}</div>}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <input name="companyId" value={authForm.companyId} onChange={handleAuthChange} placeholder="Company ID" className="w-full p-3 rounded bg-[#131316]"/>
              <input name="companyPassword" value={authForm.companyPassword} onChange={handleAuthChange} placeholder="Company Password" type="password" className="w-full p-3 rounded bg-[#131316]"/>
              <input name="employeeId" value={authForm.employeeId} onChange={handleAuthChange} placeholder="Employee ID" className="w-full p-3 rounded bg-[#131316]"/>
              <input name="name" value={authForm.name} onChange={handleAuthChange} placeholder="Full Name" className="w-full p-3 rounded bg-[#131316]"/>
              <select name="role" value={authForm.role} onChange={handleAuthChange} className="w-full p-3 rounded bg-[#131316]">
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>

              <div className="flex gap-3 mt-4">
                <Button type="submit" className="flex-1">{authMode === "signIn" ? "Login" : "Sign Up"}</Button>
                <button type="button" onClick={() => setAuthMode(authMode === "signIn" ? "signUp" : "signIn")} className="flex-1 px-4 py-2 rounded-lg border border-pink-700 text-pink-300">Switch</button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-[#060607] text-white">
      <header className="p-4 bg-[#08080a] border-b border-pink-700/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center text-black font-bold">S</div>
          <div>
            <div className="font-bold text-pink-300"><strong>SyMathiX</strong></div>
            <div className="text-xs text-gray-400">Smart B2B Sales Intelligence</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-300">User: {user?.name ?? "—"} ({user?.role ?? "—"})</div>
          <button onClick={handleLogout} className="px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-black font-semibold shadow">
            <LogOut className="inline w-4 h-4 mr-1" /> Logout
          </button>
        </div>
      </header>


{/* KPI strip */}
<section className="p-6 bg-gradient-to-r from-[#070708] to-[#06060a] border-b-4 border-pink-700 shadow-inner">
  <h2 className="text-2xl font-extrabold text-pink-300 mb-4 border-b-2 border-pink-600 pb-2">
    🔹 Key Performance Indicators (KPIs)
  </h2>

  {/* Static KPIs */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    <KPICard title="Total Deals" value={dataSet ? dataSet.length : 0} icon={<TrendingUp />} />
    <KPICard title="Active Employees" value={(() => dataSet ? Array.from(new Set(dataSet.map(r => r.Assigned_Employee || r.Assigned || r.Employee || "Unknown"))).length : "—")()} icon={<Users />} />
    <KPICard title="Overall Value" value={(() => {
      if (!dataSet) return "—";
      const total = dataSet.reduce((s, r) => s + (isNumeric(r.Deal_Value) ? Number(String(r.Deal_Value).replace(/[₹, ]/g, "")) : 0), 0);
      return `₹${total.toLocaleString()}`;
    })()} icon={<Coins />} />
  </div>
  <SectionDivider title="📊 Data Visualization" />


  {/* Dynamic KPIs from Required KPIs selection */}
  {calculatedKPIs.length > 0 && (
    <>
      <div className="border-t-2 border-pink-800 my-4"></div>
      <h3 className="text-xl font-bold text-pink-300 mb-3">📈 Selected KPIs</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {calculatedKPIs.map((kpi) => (
          <KPICard key={kpi.key} title={kpi.name} value={`₹${kpi.value.toLocaleString()}`} icon={<TrendingUp />} />
        ))}
      </div>
    </>
  )}
</section>


      <div className="flex">
        {/* LEFT SIDEBAR: controls (no upload here) */}
        <aside className="w-72 p-6 border-r border-pink-700/10 bg-[#08080a] space-y-6">
          <h4 className="text-pink-300 font-semibold mb-2 border-b border-pink-700/10 pb-2"><strong>Data Visualization</strong></h4>
          <button onClick={() => setIsFilterOpen(true)} className="w-full p-3 rounded bg-[#0b0b0d] border border-pink-700/10 text-pink-200 text-left flex items-center gap-2"><Filter className="w-4 h-4" /> Filter Table Columns</button>
          <button onClick={() => setIsKpiOpen(true)} className="w-full p-3 rounded bg-[#0b0b0d] border border-pink-700/10 text-pink-200 text-left flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Required KPIs</button>
          <button onClick={() => setIsChartOpen(true)} className="w-full p-3 rounded bg-[#0b0b0d] border border-pink-700/10 text-pink-200 text-left flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Configure Chart</button>

          <div className="mt-4">
            <Button onClick={addBlankRow} className="w-full">+ Add Blank Row</Button>
            <div className="text-xs text-gray-400 mt-2">Use Add Blank Row then Edit to tweak values (client-side only).</div>
          </div>
        </aside>

        {/* MAIN AND RIGHT: main content and right upload/insights */}
        <main className="flex-1 p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Chart + Table */}
            <div className="space-y-6">
              <div className="bg-[#0b0b0d] p-6 rounded-2xl border border-pink-700/10 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-pink-300"><strong>📊 Chart</strong></h3>
                  <div className="text-sm text-gray-400">Use Configure Chart to change view</div>
                </div>
                <ChartRenderer dataSet={dataSet} chartConfig={chartConfig} />
              </div>

              <div className="bg-[#0b0b0d] p-4 rounded-2xl border border-pink-700/10 shadow-sm">
              <SectionDivider title="📋 Filtered Data Table" />

                <h3 className="text-lg font-bold text-pink-300 mb-3"><strong>Filtered Table</strong></h3>
                {message && <div className="p-2 mb-3 rounded bg-[#0b0b0d] text-sm text-pink-300">{message}</div>}
                {(!selectedColumns || selectedColumns.length === 0) ? (
                  <div className="text-gray-400 p-4 rounded bg-[#0b0b0d]">No columns selected. Use Filter Table Columns.</div>
                ) : !dataSet ? (
                  <div className="text-gray-400 p-4 rounded bg-[#0b0b0d]">No data loaded. Upload a file on the right.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          {selectedColumns.map((c) => <th key={c} className="px-3 py-2 text-left text-sm font-medium text-gray-300">{c}</th>)}
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, idx) => (
                          <tr key={row._rowId || idx} className={idx % 2 === 0 ? "bg-black/10" : ""}>
                            {selectedColumns.map((c) => <td key={c} className="px-3 py-2 text-sm">{String(row[c] ?? "")}</td>)}
                            <td className="px-3 py-2 text-sm">
                              <div className="flex gap-2">
                                <button onClick={() => openEditModal(row._rowId)} className="px-2 py-1 rounded bg-yellow-400 text-black text-sm">Edit</button>
                                <button onClick={() => confirmDelete(row._rowId)} className="px-2 py-1 rounded bg-red-600 text-white text-sm">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Upload + Insights + Badges */}
            <div className="space-y-6">
              <UploadSection onUploadSuccess={handleUploadSuccess} />

              {/* Smart Insights - Admin & Employee */}
<div
  id="insights-panel"
  className="bg-[#0b0b0d] p-4 rounded-2xl border border-pink-700/10 shadow-sm border-t-4 border-pink-700 mt-6 pt-6"
>
  <h4 className="text-pink-300 font-semibold mb-3">
    {user?.role === "admin" ? "🧠 Admin Insights Panel" : "💡 Smart Insights"}
  </h4>

  {!dataSet ? (
    <p className="text-gray-300 text-sm">Upload data to view insights.</p>
  ) : user?.role === "admin" ? (
    <>
      {/* Admin Summary */}
      <ul className="space-y-2 text-sm text-gray-200">
        <li>
          <strong>Total Deals:</strong> {dataSet.length}
        </li>
        <li>
          <strong>Highest Deal Value:</strong> ₹
          {Math.max(...dataSet.map((r) => Number(r.Deal_Value || 0))).toLocaleString()}
        </li>
        <li>
          <strong>Average Deal Value:</strong> ₹
          {(
            dataSet.reduce((a, b) => a + Number(b.Deal_Value || 0), 0) /
            dataSet.length
          ).toFixed(2)}
        </li>
        <li>
          <strong>Top Performer:</strong>{" "}
          {(() => {
            const agg = dataSet.reduce((acc, r) => {
              const who = r.Employee || r.Assigned_Employee || "Unknown";
              acc[who] = (acc[who] || 0) + Number(r.Deal_Value || 0);
              return acc;
            }, {});
            return Object.entries(agg).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
          })()}
        </li>
        <li>
          <strong>Most Common Client:</strong>{" "}
          {(() => {
            const counts = {};
            dataSet.forEach((r) => {
              const c = r.Client || r.Customer || "Unknown";
              counts[c] = (counts[c] || 0) + 1;
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
          })()}
        </li>
      </ul>

      {/* Download PDF Button */}
      <button
        onClick={async () => {
          const { jsPDF } = await import("jspdf");
          const html2canvas = (await import("html2canvas")).default;
          const panel = document.getElementById("insights-panel");

          // Convert panel to image
          const canvas = await html2canvas(panel, {
            scale: 2,
            backgroundColor: "#111",
          });
          const imgData = canvas.toDataURL("image/png");

          // Create PDF
          const pdf = new jsPDF("p", "mm", "a4");
          const imgWidth = 190;
          const pageHeight = 295;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          let position = 10;
          pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
          pdf.save("Admin_Insights_Report.pdf");
        }}
        className="mt-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-2 rounded-lg transition"
      >
        📄 Download Insights as PDF
      </button>

      <p className="mt-3 text-gray-400 text-xs">
        (Visible only to Admins — Employees see limited info.)
      </p>
    </>
  ) : (
    // Employee simple version
    <p className="text-gray-300 text-sm">
      {dataSet.length} deals loaded. <br />
      Top contributor:{" "}
      <strong className="text-pink-300">
        {performanceRanks[0]?.name ?? "—"}
      </strong>{" "}
      — ₹{(performanceRanks[0]?.total ?? 0).toLocaleString()}
    </p>
  )}
</div>


              <div className="bg-[#0b0b0d] p-4 rounded-2xl border border-pink-700/10 shadow-[0_0_25px_rgba(236,72,153,0.2)] hover:shadow-[0_0_35px_rgba(236,72,153,0.3)] transition-shadow">
              <SectionDivider title="🏆 Performance Highlights" />

                <h4 className="text-pink-300 font-semibold mb-3"><strong>🏆 Performance Badges</strong></h4>
                <div className="space-y-3">
                  {performanceRanks.length === 0 ? <div className="text-gray-400">No performance data</div> : performanceRanks.slice(0, 3).map((p, i) => (
                    <div key={p.name} className="p-3 bg-[#0f0f10] rounded-lg border border-pink-700/10 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-pink-300">Top #{i + 1}</div>
                        <div className="font-bold">{p.name}</div>
                        <div className="text-sm text-gray-300">₹{(p.total || 0).toLocaleString()}</div>
                      </div>
                      <div className="text-pink-300 font-bold text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals (functional) */}
      <FilterModal open={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
      <KpiModal open={isKpiOpen} onClose={() => setIsKpiOpen(false)} />
      <ChartModal open={isChartOpen} onClose={() => setIsChartOpen(false)} />

      {/* Edit row modal */}
      <Modal title="Edit Row" isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setEditRowIndex(null); }}>
        {editRowData && Object.keys(editRowData).length > 0 ? (
          <>
            <div className="space-y-3 max-h-72 overflow-auto mb-3">
              {Object.keys(editRowData).filter(k => k !== "_rowId").map((k) => (
                <div key={k}>
                  <label className="text-sm text-gray-300 block mb-1">{k}</label>
                  <input
                    value={editRowData[k] ?? ""}
                    onChange={(e) => handleEditChange(k, e.target.value)}
                    className="w-full p-2 rounded bg-[#0b0b0d] text-white"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEdit}>Save</Button>
              <button onClick={() => { setIsEditOpen(false); setEditRowIndex(null); }} className="px-4 py-2 rounded-lg border border-pink-700 text-pink-300">Cancel</button>
            </div>
          </>
        ) : <div className="text-gray-400">No row selected</div>}
      </Modal>
    </div>
  );
}

