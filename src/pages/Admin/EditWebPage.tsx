import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft, Trash2, Video, FileText,
  Plus, ExternalLink, CheckCircle, RefreshCw
} from "lucide-react";
import {
  getSiteConfig,
  uploadSiteVideo,
  deleteSiteVideo,
  getSiteDocuments,
  uploadSiteDocument,
  deleteSiteDocument,
} from "../../api/api.tsx";
import Spinner from "../../components/Spinner";

interface Document {
  id: string;
  _id?: string;
  title: string;
  file_name?: string;
  file_size?: number;
  type: string;
  status: string;
  created_at: string;
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const EditWebPage = () => {
  const navigate = useNavigate();

  // ── Site config state ──────────────────────────────────────────────────
  const [savedVideoUrl, setSavedVideoUrl] = useState<string | null>(null);
  const [videoFilename, setVideoFilename] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // ── Upload states ──────────────────────────────────────────────────────
  const [videoUploading, setVideoUploading] = useState(false);
  const [docUploading, setDocUploading]     = useState(false);
  const [deletingDocId, setDeletingDocId]   = useState<string | null>(null);

  // ── Documents state ────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef  = useRef<HTMLInputElement>(null);

  // ── Load initial data ──────────────────────────────────────────────────
  useEffect(() => {
    void loadConfig();
    void loadDocuments();
  }, []);

  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await getSiteConfig();
      const vUrl = res.data?.video_url ?? "";
      setSavedVideoUrl(vUrl || null);
      setVideoFilename(res.data?.video_filename ?? null);
    } catch {
      toast.error("Failed to load site config");
    } finally {
      setConfigLoading(false);
    }
  };

  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await getSiteDocuments();
      setDocuments((res.data || []).map((doc: Document) => ({
        ...doc,
        id: doc.id || (doc._id ? String(doc._id) : ""),
      })));
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  };

  // ── Video handlers ─────────────────────────────────────────────────────
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/mpeg"];
    if (!allowed.includes(file.type) && !/\.(mp4|webm|mov|mkv|mpeg)$/i.test(file.name)) {
      toast.error("Please upload a video file: MP4, WebM, MOV, MKV, or MPEG");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    setVideoUploading(true);
    try {
      const res = await uploadSiteVideo(file);
      setSavedVideoUrl(res.data?.video_url ?? null);
      setVideoFilename(file.name);
      (window as any).__siteConfigCache = null;
      toast.success("Video uploaded — the demo modal uses this file");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload video");
    } finally {
      setVideoUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleDeleteVideo = async () => {
    if (!window.confirm("Remove the demo video from the website?")) return;
    setVideoUploading(true);
    try {
      await deleteSiteVideo();
      setSavedVideoUrl(null);
      setVideoFilename(null);
      (window as any).__siteConfigCache = null;
      toast.success("Video removed");
    } catch {
      toast.error("Failed to remove video");
    } finally {
      setVideoUploading(false);
    }
  };

  // ── Document handlers ──────────────────────────────────────────────────
  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocUploading(true);
    try {
      await uploadSiteDocument(file);
      toast.success(`"${file.name}" uploaded — the AI will use this data in the live demo call`);
      await loadDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setDocUploading(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? The live demo AI will no longer use this data.`)) return;
    setDeletingDocId(id);
    try {
      await deleteSiteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeletingDocId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => navigate("/admin/portal")}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Portal
          </button>

          <div className="flex-1">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Website
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Edit Website</h1>
          </div>

          <button
            onClick={() => { void loadConfig(); void loadDocuments(); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8 lg:py-10">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6 lg:p-7">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
              <Video size={16} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Demo Video</h2>
          </div>
          <p className="mb-5 text-sm text-slate-500">
            Upload the video shown when visitors click “See Peoplix in Action” on the homepage. MP4, WebM, MOV, MKV, or MPEG.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            {savedVideoUrl && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <CheckCircle size={14} className="text-emerald-600" />
                <span className="flex-1 truncate text-xs font-medium text-emerald-700">
                  {videoFilename || "Demo video uploaded"}
                </span>
                <a href={savedVideoUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 transition hover:text-emerald-800">
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFileChange} />
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={videoUploading || configLoading}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {videoUploading ? "Uploading…" : savedVideoUrl ? "Replace Video" : "Upload Video"}
              </button>

              {savedVideoUrl && (
                <button
                  onClick={handleDeleteVideo}
                  disabled={videoUploading}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6 lg:p-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                <FileText size={16} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">AI Knowledge Base</h2>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              {documents.length} item{documents.length === 1 ? "" : "s"}
            </span>
          </div>

          <p className="mb-5 text-sm text-slate-500">
            Upload product docs, FAQs, specs, and reference material. The live demo AI reads these files and answers based on them during the call.
          </p>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Public demo source</p>
              <p className="text-xs text-slate-500">Only the documents uploaded here are used for the free demo call.</p>
            </div>

            <input
              ref={docInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.pptx,.xlsx,.txt,.csv,.md,.html,.rtf,.odt,.epub"
              onChange={handleDocFileChange}
            />
            <button
              onClick={() => docInputRef.current?.click()}
              disabled={docUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} />
              {docUploading ? "Uploading…" : "Upload Document"}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {docsLoading ? (
              <div className="flex min-h-32 items-center justify-center py-10"><Spinner color="#64748B" /></div>
            ) : documents.length === 0 ? (
              <div className="py-12 text-center">
                <FileText size={30} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">No documents yet</p>
                <p className="mt-1 text-xs text-slate-400">Upload a document for the AI to use during the live demo.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Document</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Type</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Size</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Uploaded</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <AnimatePresence>
                      {documents.map((doc, i) => (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 rounded-lg bg-slate-100 p-1 text-slate-500">
                                <FileText size={12} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{doc.title}</p>
                                {doc.file_name && doc.file_name !== doc.title && (
                                  <p className="mt-0.5 text-xs text-slate-400">{doc.file_name}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium capitalize text-slate-600">
                              {doc.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-500">{formatBytes(doc.file_size)}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-400">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleDeleteDoc(doc.id || doc._id || "", doc.title)}
                              disabled={deletingDocId === doc.id}
                              className="inline-flex rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Delete document"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 shadow-[0_10px_30px_rgba(59,130,246,0.08)] sm:p-6 lg:p-7">
          <h3 className="text-base font-semibold text-blue-900">How the demo call works</h3>
          <ul className="mt-4 space-y-3 text-sm text-blue-800">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">1</span>
              Visitor clicks “Start Live Demo Call” on the homepage.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">2</span>
              The backend creates a Retell web call using the configured global agent.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">3</span>
              Your uploaded documents become the AI context for that demo.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">4</span>
              The visitor speaks in-browser and the AI responds based on that uploaded data in real time.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default EditWebPage;
