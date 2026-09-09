import { X, Volume2 } from "lucide-react";
import type { CallLog } from "../interface/dashboard";

interface AudioPlayerModalProps {
    log: CallLog;
    onClose: () => void;
}

const AudioPlayerModal = ({ log, onClose }: AudioPlayerModalProps) => {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-500">
                            <Volume2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-800">Call Recording</h3>
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]" title={log.call_id}>
                                {log.call_id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Audio Player Container */}
                <div className="p-8 bg-gray-50 flex flex-col items-center justify-center gap-6">
                    <div className="w-full">
                        <audio
                            src={log.recording_url || ""}
                            controls
                            autoPlay
                            className="w-full h-12 accent-cyan-500"
                        >
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                    
                    <p className="text-xs text-gray-400 text-center">
                        Recording for Agent: <span className="text-gray-600 font-medium">{log.agent_id}</span>
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-white">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AudioPlayerModal;
