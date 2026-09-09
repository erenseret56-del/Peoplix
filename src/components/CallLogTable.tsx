import { useState, lazy } from "react";
import { Play, FileText } from "lucide-react";
import type { CallLog } from "../interface/dashboard";

const SkeletonTable = lazy(() => import("./SkeletonLoader/SkeletonTable"));
const AudioPlayerModal = lazy(() => import("./AudioPlayerModal"));

import toast from "react-hot-toast";

interface CallLogTableProps {
    callLogs: CallLog[];
    logsLoading: boolean;
    currentPage: number;
    totalLogs: number;
    totalPages: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    onTranscriptClick: (log: CallLog) => void;
}

const CallLogTable = ({
    callLogs,
    logsLoading,
    currentPage,
    totalLogs,
    totalPages,
    setCurrentPage,
    onTranscriptClick,
}: CallLogTableProps) => {
    const [playingLog, setPlayingLog] = useState<CallLog | null>(null);

    // Helper functions moved from Dashboard.tsx
    const formatDuration = (ms: number | null): string => {
        if (!ms) return "—";
        const totalSec = Math.floor(ms / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${mins}m ${secs}s`;
    };

    const formatDateTime = (ts: string | null): string => {
        if (!ts) return "—";
        return new Date(ts).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case "ended":
            case "completed":
                return "bg-emerald-50 text-emerald-600";
            case "missed":
                return "bg-red-50 text-red-500";
            default:
                return "bg-gray-100 text-gray-500";
        }
    };

    const handlePlayClick = (log: CallLog) => {
        if (!log.recording_url) {
            toast.error("No recording available for this call.");
            return;
        }
        setPlayingLog(log);
    };

    return (
        <>
            {playingLog && (
                <AudioPlayerModal
                    log={playingLog}
                    onClose={() => setPlayingLog(null)}
                />
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Call Logs</h2>
                        <p className="text-sm text-gray-400">
                            {logsLoading ? "Loading..." : `${totalLogs} total calls`}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto px-5 mt-4">
                    {logsLoading ? (
                        <SkeletonTable />
                    ) : callLogs.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 text-sm">
                            No call logs found.
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-200">
                                    {[
                                        "CALL ID",
                                        "DATE & TIME",
                                        "AGENT ID",
                                        "FROM",
                                        "TO",
                                        "DIRECTION",
                                        "DURATION",
                                        "STATUS",
                                        "ACTIONS",
                                    ].map((h, index, arr) => (
                                        <th
                                            key={h}
                                            className={`px-4 py-3 text-left text-sm font-bold text-gray-900 tracking-wide whitespace-nowrap
                        ${index === 0 ? "rounded-l-full" : ""}
                        ${index === arr.length - 1 ? "rounded-r-full" : ""}
                      `}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {callLogs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td
                                            className="px-4 py-3 text-xs font-semibold text-[#8B7355] whitespace-nowrap max-w-[120px] truncate"
                                            title={log.call_id}
                                        >
                                            {log.call_id}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {formatDateTime(log.start_timestamp)}
                                        </td>
                                        <td
                                            className="px-4 py-3 text-xs text-gray-700 font-medium whitespace-nowrap max-w-[120px] truncate"
                                            title={log.agent_id}
                                        >
                                            {log.agent_id}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {log.from_number || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {log.to_number || "—"}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {log.direction ? (
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <span
                                                        className={
                                                            log.direction === "inbound"
                                                                ? "text-[#8B7355]"
                                                                : "text-orange-400"
                                                        }
                                                    >
                                                        {log.direction === "inbound" ? "↙" : "↗"}
                                                    </span>
                                                    <span className="capitalize">{log.direction}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {formatDuration(log.duration_ms)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyle(log.call_status)}`}
                                            >
                                                {log.call_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                {/* Play / Recording */}
                                                <button
                                                    onClick={() => handlePlayClick(log)}
                                                    title={
                                                        log.recording_url
                                                            ? "Play Recording"
                                                            : "No recording available"
                                                    }
                                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer
                                  ${log.recording_url
                                                            ? "text-[#8B7355] hover:bg-[#F8F4EC] hover:text-[#6B5A3E]"
                                                            : "text-gray-300 hover:bg-gray-100 hover:text-gray-400"
                                                        }`}
                                                >
                                                    <Play className="w-4 h-4" />
                                                </button>

                                                {/* Transcript */}
                                                <button
                                                    onClick={() => onTranscriptClick(log)}
                                                    title={
                                                        log.transcript
                                                            ? "View Transcript"
                                                            : "No transcript available"
                                                    }
                                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer
                                  ${log.transcript
                                                            ? "text-[#8B7355] hover:bg-[#F8F4EC] hover:text-[#6B5A3E]"
                                                            : "text-gray-300 hover:bg-gray-100 hover:text-gray-400"
                                                        }`}
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!logsLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
                        <p className="text-xs text-gray-400">
                            Page {currentPage} of {totalPages} — {totalLogs} records
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(Number(p) - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() =>
                                    setCurrentPage((p) => Math.min(Number(p) + 1, totalPages))
                                }
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-xs rounded-lg bg-[#8B7355] text-white hover:bg-[#6B5A3E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default CallLogTable;