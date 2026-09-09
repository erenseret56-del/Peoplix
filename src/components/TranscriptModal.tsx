import { X } from "lucide-react";
import type { CallLog } from "../interface/dashboard";

interface TranscriptModalProps {
    log: CallLog;
    onClose: () => void;
}

const TranscriptModal = ({ log, onClose }: TranscriptModalProps) => {
    const messages: { role: string; content: string }[] = [];

    if (log.transcript) {
        const lines = log.transcript.split("\n").filter((l) => l.trim());
        for (const line of lines) {
            if (line.startsWith("Agent:")) {
                messages.push({
                    role: "agent",
                    content: line.replace("Agent:", "").trim(),
                });
            } else if (line.startsWith("User:")) {
                messages.push({
                    role: "user",
                    content: line.replace("User:", "").trim(),
                });
            }
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-base font-bold text-gray-800">Call Transcript</h3>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                            {log.call_id}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex-wrap">
                    {log.call_analysis?.call_summary && (
                        <p className="text-xs text-gray-600 italic">
                            📋 {log.call_analysis.call_summary}
                        </p>
                    )}
                    {log.call_analysis?.user_sentiment && (
                        <span className="inline-flex items-center gap-1">
                            Sentiment:{" "}
                            <span className="font-medium text-gray-700 capitalize">
                                {log.call_analysis.user_sentiment}
                            </span>
                        </span>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
                    {messages.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">
                            No structured transcript available.
                        </p>
                    ) : (
                        messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                            >
                                <div
                                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-semibold ${msg.role === "agent" ? "bg-cyan-500" : "bg-gray-400"}`}
                                >
                                    {msg.role === "agent" ? "A" : "U"}
                                </div>
                                <div
                                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "agent" ? "bg-cyan-50 text-gray-800 rounded-tl-none" : "bg-gray-100 text-gray-700 rounded-tr-none"}`}
                                >
                                    <p
                                        className={`text-[10px] font-semibold mb-1 uppercase tracking-wide ${msg.role === "agent" ? "text-cyan-500" : "text-gray-400"}`}
                                    >
                                        {msg.role === "agent" ? "Agent" : "User"}
                                    </p>
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TranscriptModal;