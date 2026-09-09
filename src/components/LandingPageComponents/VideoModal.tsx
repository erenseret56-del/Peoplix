import { IoClose } from "react-icons/io5";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc: string;
}

const VideoModal = ({ isOpen, onClose, videoSrc }: VideoModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-999999 flex items-center justify-center p-4 md:p-10"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-5xl aspect-video bg-dark-gray rounded-3xl overflow-hidden border border-divider shadow-2xl transition-all duration-300 transform scale-100 opacity-100"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors cursor-pointer"
        >
          <IoClose size={24} />
        </button>

        {/* Video Player */}
        <video
          className="w-full h-full object-contain"
          src={videoSrc}
          autoPlay
          controls
          playsInline
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default VideoModal;
