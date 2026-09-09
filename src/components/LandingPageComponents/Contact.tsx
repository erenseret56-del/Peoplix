import { useState } from "react";
import { useForm } from "react-hook-form";
import { GoDotFill } from "react-icons/go";
import emailjs from "@emailjs/browser";
import toast from "react-hot-toast";
import Spinner from "../Spinner";
import { createCompanyRequest } from "../../api/api";

interface ContactFormData {
  fullName: string;
  companyName: string;
  positionTitle: string;
  email: string;
  phoneNumber?: string;
}

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      await createCompanyRequest(data);

      // Keep the existing email notification when EmailJS is configured.
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      const templateParams = {
        name: data.fullName,
        email: data.email,
        title: data.fullName,
        company: data.companyName,
        position: data.positionTitle,
        phone: data.phoneNumber || "N/A",
        message: `New message from ${data.fullName}`,
      };

      if (serviceId && templateId && publicKey) {
        try {
          await emailjs.send(serviceId, templateId, templateParams, publicKey);
        } catch (emailError) {
          console.warn("Company request saved, but email notification failed:", emailError);
        }
      }
      
      toast.success("Thank you! Your request has been submitted.");
      reset();
    } catch (error) {
      console.error("Company request error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative max-w-5xl mb-20 rounded-[40px] mx-auto overflow-hidden border border-gray-200">
      <div
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{
          background: "#ffffff",
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[150%] pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 0%, rgba(55,114,255,0.08) 0%, rgba(55,114,255,0.02) 40%, transparent 70%)"
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none opacity-50"
          style={{
            background: "radial-gradient(circle at 50% 100%, rgba(55,114,255,0.05) 0%, transparent 70%)"
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 py-15 sm:px-12">
        {/* Tag */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-sm py-1.5 px-4 rounded-full border border-gray-200 bg-gray-50 backdrop-blur-md">
            <GoDotFill className="text-primary" />
            <span className="text-gray-900 font-semibold">Get in Touch</span>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 leading-tight tracking-tight">
            Ready to Transform Your Workplace?
          </h2>
          <p className="mt-4 text-gray-600 text-lg max-w-2xl mx-auto">
            Fill out the form below and our team will get back to you shortly.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Full Name</label>
              <input
                {...register("fullName", { required: "Full name is required" })}
                type="text"
                placeholder=""
                className={`w-full bg-white border ${errors.fullName ? "border-red-500" : "border-gray-300"} rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.fullName.message}</p>}
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Email Address</label>
              <input
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                type="email"
                placeholder=""
                className={`w-full bg-white border ${errors.email ? "border-red-500" : "border-gray-300"} rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Company Name</label>
              <input
                {...register("companyName", { required: "Company name is required" })}
                type="text"
                placeholder=""
                className={`w-full bg-white border ${errors.companyName ? "border-red-500" : "border-gray-300"} rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
              />
              {errors.companyName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.companyName.message}</p>}
            </div>

            {/* Position Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Position Title</label>
              <input
                {...register("positionTitle", { required: "Position title is required" })}
                type="text"
                placeholder=""
                className={`w-full bg-white border ${errors.positionTitle ? "border-red-500" : "border-gray-300"} rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
              />
              {errors.positionTitle && <p className="text-red-500 text-xs mt-1 ml-1">{errors.positionTitle.message}</p>}
            </div>
          </div>

          {/* Phone Number (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 ml-1">Phone Number <span className="text-gray-500 font-normal">(Optional)</span></label>
            <input
              {...register("phoneNumber")}
              type="tel"
              placeholder=""
              className="w-full bg-white border border-gray-300 rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center justify-center gap-2 font-bold px-12 py-4 rounded-full transition-all cursor-pointer min-h-[56px] ${
                isSubmitting 
                  ? 'bg-gray-100 border-2 border-gray-200 shadow-none' 
                  : 'bg-gray-900 text-white shadow-lg shadow-gray-900/20 hover:scale-105 active:scale-95 hover:bg-gray-800'
              } ${isSubmitting ? "cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? <Spinner color="#000000" /> : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Contact;
